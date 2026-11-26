const validId = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(value);
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
function fail(status, message) { throw Object.assign(new Error(message), {status}); }

export function statement(perf, docs) {
  const entries = (perf?.pts || []).map(x => ({
    at: Number(x.at) || 0, amount: Number(x.v) || 0, label: String(x.why || "Puntos individuales"), state: "Acreditado"
  }));
  let spent = 0, reserved = 0;
  for (const doc of docs) {
    const r = doc.data();
    if (r.arch || r.coach || r.method !== "pts") continue;
    const cost = Number(r.pts) || 0;
    if (r.status === "pend") reserved += cost;
    if (r.status === "ok") spent += cost;
    entries.push({at: Number(r.at) || 0, amount: r.status === "no" ? 0 : -cost,
      label: String(r.prize || "Canje"), state: ({pend:"Reservado",ok:"Canjeado",no:"Rechazado"})[r.status] || "En revisión"});
  }
  const earned = (perf?.pts || []).reduce((sum, x) => sum + (Number(x.v) || 0), 0);
  return {available: Math.max(0, earned - spent - reserved), earned, spent, reserved,
    movements: entries.sort((a,b) => b.at-a.at).slice(0,60)};
}

export async function playerWallet(db, who, b, fv, now = Date.now()) {
  const isStaff = !!who.staff;
  if (b.action === "wallet") {
    const pid = isStaff ? b.pid : who.pid;
    if (!validId(pid) || (!isStaff && b.pid && b.pid !== pid)) fail(403,"Elegí tu jugador vinculado.");
    const [p, rs] = await Promise.all([db.doc("perf/"+pid).get(), db.collection("redeems").where("pid","==",pid).get()]);
    return statement(p.data(),rs.docs);
  }
  if (!isStaff) fail(403,"Esta operación requiere una cuenta de staff.");
  const adjustment = b.action === "walletAdjust";
  if (adjustment && (!validId(b.pid) || !validId(b.requestId) || !integer(b.amount,-100000,100000) || !b.amount || typeof b.reason !== "string" || b.reason.trim().length < 3)) fail(400,"Indicá jugador, importe y motivo.");
  if (!adjustment && (!validId(b.mid) || !integer(b.amount,1,100000))) fail(400,"Elegí un partido y el premio por jugador.");
  return db.runTransaction(async tx => {
    const cfg = (await tx.get(db.doc("league/config"))).data() || {};
    const operation = adjustment ? "adj_"+b.requestId : "match_"+(cfg.seasonStart||0)+"_"+b.mid;
    const ref = db.doc("walletops/"+operation);
    const prev = (await tx.get(ref)).data();
    if (prev) {
      if(adjustment && (prev.pid!==b.pid || prev.amount!==b.amount || prev.by!==who.uid)) fail(409,"La operación ya se utilizó.");
      return {ok:true, repeated:true, count:prev.count};
    }
    let ids = [b.pid], reason = adjustment ? b.reason.trim().slice(0,140) : "";
    if (!adjustment) {
      const m = (await tx.get(db.doc("matches/"+b.mid))).data();
      if (!m || m.status !== "played") fail(409,"El partido debe tener un resultado oficial.");
      ids = Object.entries(m.stats || {}).filter(([id,s]) => validId(id) && s && [m.a,m.b].includes(s.t)).map(([id]) => id);
      if (!ids.length || ids.length > 14) fail(409,"Revisá las estadísticas de los participantes.");
      reason = "Participación · Fecha "+m.fecha+" · "+m.a+" vs. "+m.b;
    }
    const players = await tx.getAll(...ids.map(id=>db.doc("players/"+id)));
    if (players.some(p=>!p.exists)) fail(409,"Un jugador del registro ya no existe.");
    if (adjustment && b.amount < 0) {
      const p=await tx.get(db.doc("perf/"+b.pid)), rs=await tx.get(db.collection("redeems").where("pid","==",b.pid));
      if(statement(p.data(),rs.docs).available < -b.amount) fail(409,"La corrección supera el saldo disponible.");
    }
    const paths = ids.map(id=>"perf/"+id);
    const entry = {id:operation,v:b.amount,why:reason,at:now,by:who.u||"Staff"};
    for(const path of paths) tx.set(db.doc(path),{pts:fv.arrayUnion(entry)},{merge:true});
    tx.set(ref,{by:who.uid,at:now,amount:b.amount,count:ids.length,pid:adjustment?b.pid:null,mid:adjustment?null:b.mid});
    tx.set(db.collection("audit").doc(),{at:now,uid:who.uid,u:who.u,role:who.role,txt:reason+" · "+b.amount+" OC × "+ids.length+" · "+ids.join(", ")});
    tx.set(db.doc("pubqueue/main"),{paths:fv.arrayUnion(...paths),at:now},{merge:true});
    return {ok:true,count:ids.length,paths};
  });
}
