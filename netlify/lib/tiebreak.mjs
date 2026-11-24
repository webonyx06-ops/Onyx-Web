import { createHash } from "node:crypto";
export async function createTiebreak(db, source, who) {
  return db.runTransaction(async tx => {
    const first = (await tx.get(source)).data();
    if (!first || !who.captain || !who.team || ![first.a,first.b].includes(who.team))
      throw Object.assign(new Error("Solo un capitán de este cruce puede cargar el desempate."),{status:403});
    const key = [first.a,first.b].sort();
    const round = await tx.get(db.collection("matches").where("fecha","==",first.fecha));
    const games = round.docs.filter(d=>key.includes(d.data().a) && key.includes(d.data().b) && d.data().a!==d.data().b);
    const existing = games.find(d=>d.data().leg==="desempate");
    if (existing) return existing.id;
    const winners = games.map(d=>d.data()).filter(m=>m.status==="played" && m.ra!=null && m.rb!=null && +m.ra!==+m.rb).map(m=>+m.ra>+m.rb?m.a:m.b);
    if (games.length!==2 || new Set(winners).size!==2) throw Object.assign(new Error("Primero cargá la ida y la vuelta. El desempate se habilita cuando cada equipo ganó una partida."),{status:409});
    const id = "tb_"+createHash("sha256").update(JSON.stringify(games.map(d=>d.id).sort())).digest("hex").slice(0,24);
    const ref = db.doc("matches/"+id);
    if ((await tx.get(ref)).exists) throw Object.assign(new Error("El identificador del desempate ya está en uso."),{status:409});
    tx.set(ref,{fecha:first.fecha,a:key[0],b:key[1],leg:"desempate",status:"pending",ra:null,rb:null,date:"",map:null,stats:{},createdBy:who.uid});
    return id;
  });
}

