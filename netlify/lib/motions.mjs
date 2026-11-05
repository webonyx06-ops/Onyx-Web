// Votación real para cambiar de capitán (la hacen los jugadores que entraron con Discord y están vinculados a su jugador).
//   motions/<id>  { team, cand, candName, by, byName, at, status, sigs, roster, need, ends, voted, si, no, closedAt, fechaAt }
//   votes/<id>    { <pid>: "si" | "no" }   el voto es secreto: solo lo lee el servidor (y ultra staff si hay un reclamo)
// Reglas (las mismas que se publican en la página):
//   - La moción la inicia cualquier jugador del plantel y necesita 2 firmas de otros jugadores (sin contar al capitán).
//   - Con las firmas se abre la votación: 48 horas, un voto por jugador del plantel.
//   - Se aprueba con 2/3 del plantel. Si se aprueba, el candidato pasa a ser el capitán del equipo.
//   - Después de una votación, el equipo no puede pedir otra hasta que pasen 2 fechas.
export const MOTION = { sigs: 2, hours: 48, pause: 2, signDays: 7 };
const H = 3600000;
const err = (msg, status = 400) => Object.assign(new Error(msg), { status });

export const lastPlayed = (matches) => Object.values(matches || {}).filter((m) => m && m.status === "played").reduce((x, m) => Math.max(x, +m.fecha || 0), 0);
export const rosterOf = (players, k) => Object.entries(players || {}).filter(([, p]) => p && p.team === k).map(([id]) => id);
export const needOf = (n) => Math.ceil(n * 2 / 3);

export async function activeOf(db, team) {
  const q = await db.collection("motions").where("team", "==", team).get();
  const all = q.docs.map((d) => ({ id: d.id, ...d.data() }));
  return { active: all.find((m) => m.status === "firmas" || m.status === "votacion") || null, last: all.filter((m) => m.closedAt).sort((a, b) => b.closedAt - a.closedAt)[0] || null };
}

export async function createMotion(db, who, cand, L, now = Date.now()) {
  const me = L.players[who.pid]; if (!me || !me.team) throw err("Tu jugador no está en ningún equipo.");
  const team = me.team, t = L.teams[team] || {}, c = L.players[cand];
  if (!c || c.team !== team) throw err("El candidato tiene que ser de tu equipo.");
  if (t.captain === cand) throw err("Ese jugador ya es el capitán.");
  const { active, last } = await activeOf(db, team);
  if (active) throw err("Tu equipo ya tiene una votación en curso.", 409);
  const lf = lastPlayed(L.matches);
  if (last && last.fechaAt != null && lf < last.fechaAt + MOTION.pause) throw err(`Después de una votación hay que esperar ${MOTION.pause} fechas. Se habilita después de la fecha ${last.fechaAt + MOTION.pause}.`, 409);
  const roster = rosterOf(L.players, team);
  if (roster.length < 3) throw err("El equipo necesita al menos 3 jugadores para votar.");
  const ref = db.collection("motions").doc();
  const doc = { team, cand, candName: c.name || "", by: who.pid, byName: me.name || "", at: now, status: "firmas", sigs: [], roster, need: needOf(roster.length), ends: 0, voted: [], si: 0, no: 0, captain: t.captain || null };
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

export async function signMotion(db, who, id, L, now = Date.now()) {
  const ref = db.doc(`motions/${id}`);
  return db.runTransaction(async (tx) => {
    const s = await tx.get(ref); if (!s.exists) throw err("Esa votación no existe.", 404);
    const m = s.data();
    if (m.status !== "firmas") throw err("Esta moción ya no junta firmas.", 409);
    if (!m.roster.includes(who.pid)) throw err("Solo firman los jugadores del plantel.", 403);
    if (who.pid === m.by) throw err("Quien inicia la moción no cuenta como firma.", 409);
    if (who.pid === m.captain) throw err("El capitán no puede firmar la moción.", 409);
    if (m.sigs.includes(who.pid)) throw err("Ya firmaste.", 409);
    const sigs = [...m.sigs, who.pid], open = sigs.length >= MOTION.sigs;
    tx.update(ref, open ? { sigs, status: "votacion", votingAt: now, ends: now + MOTION.hours * H } : { sigs });
    return { sigs: sigs.length, open };
  });
}

export async function voteMotion(db, who, id, v, now = Date.now()) {
  if (v !== "si" && v !== "no") throw err("Voto inválido.");
  const ref = db.doc(`motions/${id}`), vref = db.doc(`votes/${id}`);
  const r = await db.runTransaction(async (tx) => {
    const [s, vs] = await tx.getAll(ref, vref); if (!s.exists) throw err("Esa votación no existe.", 404);
    const m = s.data();
    if (m.status !== "votacion" || now > m.ends) throw err("La votación está cerrada.", 409);
    if (!m.roster.includes(who.pid)) throw err("Solo votan los jugadores del plantel.", 403);
    if ((m.voted || []).includes(who.pid)) throw err("Ya votaste. El voto no se puede cambiar.", 409);
    const voted = [...(m.voted || []), who.pid];
    tx.set(vref, { [who.pid]: v }, { merge: true });
    tx.update(ref, { voted });
    return { voted: voted.length, all: voted.length >= m.roster.length };
  });
  return r;
}

// Cierra la votación: cuenta los votos y, si se aprueba, cambia el capitán del equipo
export async function closeMotion(db, id, L, { now = Date.now(), why = "" } = {}) {
  const ref = db.doc(`motions/${id}`), vref = db.doc(`votes/${id}`);
  const out = await db.runTransaction(async (tx) => {
    const [s, vs] = await tx.getAll(ref, vref); if (!s.exists) return null;
    const m = s.data(); if (m.status !== "votacion") return null;
    const votes = vs.exists ? vs.data() : {};
    const si = Object.values(votes).filter((x) => x === "si").length, no = Object.values(votes).filter((x) => x === "no").length;
    const ok = si >= m.need, fechaAt = lastPlayed(L.matches);
    tx.update(ref, { status: ok ? "aprobada" : "rechazada", si, no, closedAt: now, fechaAt, why });
    if (ok) tx.set(db.doc(`teams/${m.team}`), { captain: m.cand }, { merge: true });
    tx.set(db.collection("audit").doc(), { at: now, uid: "servidor", u: "servidor", role: "auto", txt: `Votación de capitán de ${String(m.team).toUpperCase()}: ${ok ? "aprobada" : "rechazada"} (${si} a favor, ${no} en contra, se necesitaban ${m.need}). ${ok ? `Nuevo capitán: ${m.candName}. Reasigná la cuenta de capitán si corresponde.` : ""}` });
    return { team: m.team, ok, si, no };
  });
  return out;
}

export async function cancelMotion(db, who, id, now = Date.now()) {
  const ref = db.doc(`motions/${id}`), s = await ref.get();
  if (!s.exists) throw err("Esa votación no existe.", 404);
  const m = s.data();
  if (!(who.staff || (who.pid && who.pid === m.by && m.status === "firmas"))) throw err("Solo quien la inició (mientras junta firmas) o el staff la pueden cancelar.", 403);
  if (!["firmas", "votacion"].includes(m.status)) throw err("Ya estaba cerrada.", 409);
  await ref.update({ status: "cancelada", closedAt: now, by2: who.staff ? who.u : m.byName });
  return { ok: true };
}

// Revisión periódica: cierra las votaciones vencidas y las mociones que no juntaron firmas en 7 días
export async function closeExpired(db, L, now = Date.now()) {
  const q = await db.collection("motions").where("status", "in", ["firmas", "votacion"]).get();
  const paths = [];
  for (const d of q.docs) {
    const m = d.data();
    if (m.status === "votacion" && now > m.ends) { await closeMotion(db, d.id, L, { now, why: "Terminó el plazo" }); paths.push(`motions/${d.id}`, `teams/${m.team}`); }
    else if (m.status === "firmas" && now - m.at > MOTION.signDays * 24 * H) { await d.ref.update({ status: "vencida", closedAt: now }); paths.push(`motions/${d.id}`); }
  }
  return paths;
}
