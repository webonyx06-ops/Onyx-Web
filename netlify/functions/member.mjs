// Cuenta de jugador (entró con Discord). Ruta: /api/member (POST)
//   { action: "link", pid }            pide vincular su cuenta con su jugador (lo aprueba su capitán o el staff)
//   { action: "unlink" }               se desvincula
//   { action: "approve", id, ok }      capitán del equipo o staff: aprueba o rechaza un vínculo
//   { action: "att", fecha, s }        confirma si juega la próxima fecha: "si" | "no" | "duda" | null
//   { action: "pickem", picks }        guarda sus pronósticos { partido: "a" | "b" | null }
//   { action: "motion", op, ... }      votación de capitán: op = "create" (cand) | "sign" (id) | "vote" (id, v) | "cancel" (id)
//   { action: "coachreq", team, note } pide ser coach de un equipo (lo aprueba el capitán de ese equipo o el staff)
//   { action: "coachok", id, ok, coachId? }  capitán del equipo o staff: aprueba o rechaza un coach
import { initAdmin } from "../lib/admin.mjs";
import { json, whoIs, readBody } from "../lib/auth.mjs";
import { patchSnapshot } from "../lib/publish.mjs";
import { savePicks } from "../lib/pickem.mjs";
import { createMotion, signMotion, voteMotion, closeMotion, cancelMotion } from "../lib/motions.mjs";
import { loadSnapshot, clearSnapshotCache } from "../lib/fsrest.mjs";
import { parseLocal } from "../lib/league.mjs";
import { requestCoach, reviewCoach } from "../lib/coaching.mjs";

const err = (msg, status = 400) => Object.assign(new Error(msg), { status });
async function league(db) {
  clearSnapshotCache();
  const s = await loadSnapshot().catch(() => null);
  if (s) return s;
  const get = async (c) => Object.fromEntries((await db.collection(c).get()).docs.map((d) => [d.id, d.data()]));
  const [players, matches, teams] = await Promise.all([get("players"), get("matches"), get("teams")]);
  return { players, matches, teams };
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Usá POST." });
  let admin;
  try { admin = initAdmin(); } catch (e) { return json(500, { error: e.message }); }
  const who = await whoIs(req, admin);
  if (!who) return json(401, { error: "Tu sesión no es válida. Volvé a entrar." });
  const db = admin.firestore(), now = Date.now(), inc = (n) => admin.firestore.FieldValue.increment(n);
  try {
    const b = await readBody(req, 100000), A = b.action;
    const member = () => { if (who.kind !== "member") throw err("Esto es para jugadores y coaches con cuenta.", 403); return who; };
    const linked = () => { member(); if (!who.pid) throw err("Primero vinculá tu cuenta con tu jugador.", 403); return who.pid; };

    if (A === "link") {
      member();
      if (who.pid) throw err("Tu cuenta ya está vinculada.", 409);
      const pid = String(b.pid || ""), p = (await db.doc(`players/${pid}`).get());
      if (!/^[A-Za-z0-9_\-]{1,40}$/.test(pid) || !p.exists) throw err("Ese jugador no existe.", 404);
      const taken = await db.collection("members").where("pid", "==", pid).limit(1).get();
      if (!taken.empty) throw err("Ese jugador ya está vinculado a otra cuenta. Si es un error, avisale al staff.", 409);
      const pd = p.data();
      await db.doc(`requests/link_${who.uid}`).set({ type: "link", uid: who.uid, name: who.name, avatar: who.avatar, pid, pname: pd.name || "", team: pd.team || null, at: now, status: "pend", by: who.uid, u: who.name });
      return json(200, { status: "pend" });
    }
    if (A === "coachreq") {
      member();
      const teams = Object.fromEntries((await db.collection("teams").get()).docs.map((d) => [d.id, d.data()]));
      return json(200, await requestCoach(db, who, String(b.team || ""), b.note, { now, teams }));
    }
    if (A === "coachok") {
      const r = await reviewCoach(db, who, String(b.id || ""), !!b.ok, { now, coachId: b.coachId ? String(b.coachId) : null });
      if (r.paths.length) await patchSnapshot(db, r.paths);
      return json(200, { ok: true, coachId: r.coachId });
    }
    if (A === "unlink") {
      member();
      await db.doc(`members/${who.uid}`).set({ pid: null, linkedAt: null }, { merge: true });
      return json(200, { ok: true });
    }
    if (A === "approve") {
      if (!(who.staff || who.captain)) throw err("Solo el capitán del equipo o el staff.", 403);
      const ref = db.doc(`requests/${String(b.id || "")}`), rq = await ref.get();
      if (!rq.exists || rq.data().type !== "link") throw err("Ese pedido no existe.", 404);
      const r = rq.data();
      if (r.status !== "pend") throw err("Ese pedido ya se revisó.", 409);
      if (who.captain && r.team !== who.team) throw err("Ese jugador no es de tu equipo.", 403);
      if (b.ok) {
        const taken = await db.collection("members").where("pid", "==", r.pid).limit(1).get();
        if (!taken.empty && taken.docs[0].id !== r.uid) throw err("Ese jugador ya está vinculado a otra cuenta.", 409);
        await db.doc(`members/${r.uid}`).set({ pid: r.pid, linkedAt: now, linkedBy: who.u }, { merge: true });
      }
      await ref.update({ status: b.ok ? "ok" : "no", reviewedBy: who.u, reviewedAt: now });
      await db.collection("audit").add({ at: now, uid: who.uid, u: who.u, role: who.staff ? who.role : "captain", txt: `${b.ok ? "Aprobó" : "Rechazó"} el vínculo de la cuenta de Discord ${r.name} con ${r.pname}` });
      return json(200, { ok: true });
    }
    if (A === "att") {
      const pid = linked(), f = +b.fecha, s = b.s;
      if (![ "si", "no", "duda", null ].includes(s)) throw err("Respuesta inválida.");
      const L = await league(db), p = L.players[pid];
      if (!p || !p.team) throw err("Tu jugador no está en ningún equipo.");
      const pend = Object.values(L.matches || {}).filter((m) => m && +m.fecha === f && m.status !== "played" && (m.a === p.team || m.b === p.team));
      if (!pend.length) throw err("Tu equipo no tiene partidos pendientes en esa fecha.", 409);
      const ref = db.doc(`att/${f}_${pid}`);
      if (s == null) await ref.delete(); else await ref.set({ pid, team: p.team, fecha: f, s, at: now, name: p.name || "" });
      await patchSnapshot(db, [`att/${f}_${pid}`]);
      return json(200, { ok: true });
    }
    if (A === "pickem") {
      member();
      const L = await league(db);
      const r = await savePicks(db, who, b.picks || {}, { matches: L.matches || {}, parseLocal, now, inc });
      return json(200, r);
    }
    if (A === "motion") {
      const L = await league(db), op = b.op, id = String(b.id || "");
      if (op === "cancel") { const r = await cancelMotion(db, who, id, now); await patchSnapshot(db, [`motions/${id}`]); return json(200, r); }
      const pid = linked(), me = { ...who, pid };
      if (op === "create") { const m = await createMotion(db, me, String(b.cand || ""), L, now); await patchSnapshot(db, [`motions/${m.id}`]); return json(200, { id: m.id }); }
      if (op === "sign") { const r = await signMotion(db, me, id, L, now); await patchSnapshot(db, [`motions/${id}`]); return json(200, r); }
      if (op === "vote") {
        const r = await voteMotion(db, me, id, b.v, now);
        const paths = [`motions/${id}`];
        if (r.all) { const c = await closeMotion(db, id, L, { now, why: "Votó todo el plantel" }); if (c) paths.push(`teams/${c.team}`); r.closed = c; }
        await patchSnapshot(db, paths);
        return json(200, r);
      }
      throw err("Operación desconocida.");
    }
    return json(400, { error: "Acción desconocida." });
  } catch (e) {
    if (!e.status) console.error("member:", e);
    return json(e.status || 500, { error: String(e.message || e) });
  }
};

export const config = { path: "/api/member" };
