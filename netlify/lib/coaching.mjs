// Cuentas con mail (jugadores y coaches), pedidos para ser coach de un equipo y notas de seguimiento de los coaches.
// Todo lo escribe el servidor: la página no puede tocar estas colecciones directo (ver firestore.rules).
import { createHash, randomBytes } from "node:crypto";

export const err = (msg, status = 400) => Object.assign(new Error(msg), { status });
const STAFF_DOMAIN = (process.env.STAFF_DOMAIN || "staff.ligat1.app").toLowerCase();
export const normName = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const cleanText = (s, max) => String(s || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);

// ---------- crear cuenta con mail ----------
export function checkSignup(b) {
  const name = cleanText(b.name, 32), email = String(b.email || "").trim().toLowerCase(), pass = String(b.password || ""), role = b.role === "coach" ? "coach" : "player";
  if (name.length < 2) throw err("Poné tu nick (2 letras o más).");
  if (!/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/.test(email) || email.length > 200) throw err("Ese mail no es válido.");
  if (email.endsWith("@" + STAFF_DOMAIN) || email.endsWith("." + STAFF_DOMAIN)) throw err("Ese mail no se puede usar.");
  if (pass.length < 10) throw err("La contraseña tiene que tener 10 caracteres o más.");
  if (pass.length > 100) throw err("La contraseña es demasiado larga.");
  return { name, email, pass, role, team: role === "coach" ? String(b.team || "") : null, note: cleanText(b.note, 200) };
}
// Límite de cuentas nuevas por conexión y por día (para que nadie llene la base de cuentas falsas)
export async function signupLimit(db, ip, now, max = 5) {
  const day = new Date(now - 3 * 3600e3).toISOString().slice(0, 10), key = createHash("sha256").update(String(ip || "?") + "|onyx").digest("hex").slice(0, 24);
  const ref = db.doc(`signups/${key}_${day}`);
  return db.runTransaction(async (tx) => { const s = await tx.get(ref), n = (s.exists ? +s.data().n : 0) || 0; if (n >= max) return false; tx.set(ref, { n: n + 1, at: now }); return true; });
}
export async function createMemberAccount(db, auth, input, { now, teams }) {
  const v = checkSignup(input);
  if (v.role === "coach" && !(teams && teams[v.team])) throw err("Elegí el equipo al que querés sumarte como coach.");
  const uid = "e_" + randomBytes(12).toString("hex");
  try { await auth.createUser({ uid, email: v.email, password: v.pass, displayName: v.name }); }
  catch (e) {
    const c = String((e && (e.code || (e.errorInfo && e.errorInfo.code))) || "");
    if (c.includes("email-already-exists")) throw err("Ya hay una cuenta con ese mail. Entrá con tu contraseña o pedí una nueva.", 409);
    if (c.includes("invalid-password")) throw err("La contraseña tiene que tener 10 caracteres o más.");
    if (c.includes("invalid-email")) throw err("Ese mail no es válido.");
    throw e;
  }
  await db.doc(`members/${uid}`).set({ uid, kind: "email", name: v.name, username: "", avatar: "", pid: null, role: v.role, coachId: null, first: now, last: now });
  if (v.role === "coach") await requestCoach(db, { uid, name: v.name, avatar: "" }, v.team, v.note, { now, teams });
  return { uid, role: v.role };
}

// ---------- coaches: pedir equipo y aprobarlo ----------
export async function requestCoach(db, who, team, note, { now, teams }) {
  if (!(teams && teams[team]) || teams[team].hidden) throw err("Ese equipo no existe.");
  const ref = db.doc(`requests/coachreg_${who.uid}`), cur = await ref.get();
  if (cur.exists && cur.data().status === "pend") throw err("Ya tenés un pedido esperando. Lo revisa el capitán del equipo o el staff.", 409);
  await ref.set({ type: "coachreg", uid: who.uid, name: cleanText(who.name, 32) || "Coach", avatar: who.avatar || "", team, note: cleanText(note, 200), at: now, status: "pend", by: who.uid, u: cleanText(who.name, 32) });
  await db.doc(`members/${who.uid}`).set({ role: "coach" }, { merge: true });
  return { status: "pend" };
}
// Aprueba o rechaza: capitán del equipo pedido o staff. Al aprobar, une la cuenta con un coach de la liga (el elegido, uno con el mismo nombre o uno nuevo)
export async function reviewCoach(db, who, id, ok, { now, coachId = null } = {}) {
  if (!(who.staff || who.captain)) throw err("Solo el capitán del equipo o el staff.", 403);
  const ref = db.doc(`requests/${id}`), rq = await ref.get();
  if (!rq.exists || rq.data().type !== "coachreg") throw err("Ese pedido no existe.", 404);
  const r = rq.data();
  if (r.status !== "pend") throw err("Ese pedido ya se revisó.", 409);
  if (who.captain && r.team !== who.team) throw err("Ese pedido es para otro equipo.", 403);
  const paths = [];
  let cid = null;
  if (ok) {
    const mem = await db.doc(`members/${r.uid}`).get(), m = mem.exists ? mem.data() : {};
    const all = (await db.collection("coaches").get()).docs.map((d) => ({ id: d.id, ...d.data() }));
    const taken = new Set((await db.collection("members").where("role", "==", "coach").get()).docs.map((d) => d.data().coachId).filter((x) => x && x !== m.coachId));
    let c = (m.coachId && all.find((x) => x.id === m.coachId)) || (coachId && who.staff && all.find((x) => x.id === coachId && !taken.has(x.id))) || all.find((x) => !taken.has(x.id) && normName(x.name) === normName(r.name));
    if (!c) { c = { id: "co" + randomBytes(5).toString("hex"), name: r.name, note: "", teams: {}, at: now, by: who.u || "staff" }; }
    c.teams = c.teams || {};
    if (!c.teams[r.team]) c.teams[r.team] = { since: now, by: who.u || "capitán" };
    const { id: cId, ...cdoc } = c; cid = cId;
    await db.doc(`coaches/${cid}`).set({ ...cdoc, acct: true });
    await db.doc(`members/${r.uid}`).set({ role: "coach", coachId: cid }, { merge: true });
    paths.push(`coaches/${cid}`);
  }
  await ref.update({ status: ok ? "ok" : "no", reviewedBy: who.u || "", reviewedAt: now, coachId: cid });
  await db.collection("audit").add({ at: now, uid: who.uid, u: who.u || "", role: who.staff ? who.role : "captain", txt: `${ok ? "Aprobó" : "Rechazó"} a ${r.name} como coach de ${r.team}` });
  return { ok: true, coachId: cid, paths };
}
// Equipos que entrena una cuenta de coach
export async function coachTeamsOf(db, who) {
  if (!who || who.kind !== "member" || !who.member || !who.member.coachId) return [];
  const c = await db.doc(`coaches/${who.member.coachId}`).get();
  return c.exists ? Object.keys(c.data().teams || {}) : [];
}

// ---------- notas de seguimiento ----------
// vis: "private" (solo el coach) · "team" (todo el plantel; para notas generales) · "player" (solo ese jugador)
// kind: "mejorar" · "bien" · "nota"
const VIS = ["private", "team", "player"], KINDS = ["mejorar", "bien", "nota"];
export async function saveNote(db, who, b, { now }) {
  const teams = await coachTeamsOf(db, who);
  if (!teams.length) throw err("Esto es para coaches aprobados de un equipo.", 403);
  const team = String(b.team || ""), pid = b.pid ? String(b.pid) : null, text = cleanText(b.text, 1500), kind = KINDS.includes(b.kind) ? b.kind : "nota";
  let vis = VIS.includes(b.vis) ? b.vis : "private";
  if (!teams.includes(team)) throw err("No sos coach de ese equipo.", 403);
  if (!text) throw err("Escribí la nota.");
  if (pid) {
    if (!/^[A-Za-z0-9_\-]{1,40}$/.test(pid)) throw err("Jugador inválido.");
    const p = await db.doc(`players/${pid}`).get();
    if (!p.exists || p.data().team !== team) throw err("Ese jugador no es de tu equipo.", 403);
    if (vis === "team") vis = "player";
  } else if (vis === "player") vis = "team";
  const coachId = who.member.coachId;
  if (b.id) {
    const ref = db.doc(`coachnotes/${String(b.id)}`), cur = await ref.get();
    if (!cur.exists || cur.data().coachId !== coachId) throw err("Esa nota no existe.", 404);
    await ref.update({ text, vis, kind, upd: now });
    return { id: ref.id };
  }
  const n = await db.collection("coachnotes").where("coachId", "==", coachId).count().get();
  if (n.data().count >= 600) throw err("Llegaste al máximo de notas. Borrá las viejas.", 409);
  const ref = db.collection("coachnotes").doc("cn" + now.toString(36) + randomBytes(3).toString("hex"));
  await ref.set({ coachId, coachName: cleanText(who.name, 32), uid: who.uid, team, pid, text, vis, kind, at: now, upd: now });
  return { id: ref.id };
}
export async function deleteNote(db, who, id) {
  const ref = db.doc(`coachnotes/${String(id || "")}`), cur = await ref.get();
  if (!cur.exists || !who.member || cur.data().coachId !== who.member.coachId) throw err("Esa nota no existe.", 404);
  await ref.delete(); return { ok: true };
}
const pub = (id, d) => ({ id, team: d.team, pid: d.pid || null, text: d.text, vis: d.vis, kind: d.kind, at: d.at, upd: d.upd || d.at, coachName: d.coachName || "" });
// Notas que escribió el coach (de sus equipos)
export async function coachNotes(db, who) {
  const teams = await coachTeamsOf(db, who);
  if (!teams.length) throw err("Esto es para coaches aprobados de un equipo.", 403);
  const q = await db.collection("coachnotes").where("coachId", "==", who.member.coachId).get();
  return { teams, notes: q.docs.map((d) => pub(d.id, d.data())).filter((n) => teams.includes(n.team)).sort((a, b) => b.at - a.at) };
}
// Notas que ve un jugador: las generales de su equipo y las suyas (nunca las privadas del coach)
export async function playerNotes(db, who) {
  if (!who || who.kind !== "member" || !who.pid) return { notes: [] };
  const p = await db.doc(`players/${who.pid}`).get(), team = p.exists ? p.data().team : null;
  if (!team) return { notes: [] };
  const [a, b] = await Promise.all([
    db.collection("coachnotes").where("team", "==", team).where("vis", "==", "team").get(),
    db.collection("coachnotes").where("pid", "==", who.pid).where("vis", "==", "player").get(),
  ]);
  const notes = [...a.docs, ...b.docs].map((d) => pub(d.id, d.data())).filter((n) => n.team === team).sort((x, y) => y.at - x.at).slice(0, 60);
  return { notes };
}
