// Pronósticos (pick'em) de la comunidad: los jugadores que entran con Discord eligen quién gana cada partido.
//   pickem/<uid>      { uid, name, avatar, picks: { <partido>: "a" | "b" }, at }   (lo escribe solo el servidor)
//   public/pickagg    { <partido>: { a, b } }   cuántos eligieron a cada equipo (se actualiza al guardar)
//   public/pickboard  { sig, at, rows: [...], n }   ranking (se recalcula cuando cambian los resultados)
// 1 punto por cada ganador acertado.
import { patchSnapshot } from "./publish.mjs";

export const winnerOf = (m) => {
  if (!m || m.status !== "played") return null;
  if (m.noShow === "a") return "b";
  if (m.noShow === "b") return "a";
  const ra = +m.ra || 0, rb = +m.rb || 0;
  return ra > rb ? "a" : rb > ra ? "b" : null;
};
export const resultSig = (matches) => Object.entries(matches || {}).map(([id, m]) => [id, winnerOf(m)]).filter(([, w]) => w).sort((x, y) => x[0].localeCompare(y[0])).map((x) => x.join(":")).join(",");

export function scorePicks(picks, matches) {
  let pts = 0, hits = 0, n = 0;
  for (const [mid, side] of Object.entries(picks || {})) {
    const w = winnerOf((matches || {})[mid]); if (!w) continue;
    n++; if (w === side) { hits++; pts++; }
  }
  return { pts, hits, n };
}

export function boardFrom(pickDocs, matches) {
  const rows = Object.entries(pickDocs || {}).map(([uid, d]) => ({ uid, name: String((d && d.name) || "Jugador").slice(0, 32), avatar: (d && d.avatar) || "", ...scorePicks((d || {}).picks, matches), total: Object.keys((d || {}).picks || {}).length }))
    .filter((r) => r.total > 0);
  rows.sort((a, b) => b.pts - a.pts || (b.n ? b.hits / b.n : 0) - (a.n ? a.hits / a.n : 0) || a.name.localeCompare(b.name));
  let pos = 0, last = null;
  rows.forEach((r, i) => { if (r.pts !== last) { pos = i + 1; last = r.pts; } r.pos = pos; });
  return rows;
}

// Recalcula el ranking. Si ya tenés los pronósticos leídos (copia diaria), pasalos y no se leen de nuevo.
export async function refreshBoard(db, matches, pickDocs = null, { now = Date.now(), sig = null } = {}) {
  if (!pickDocs) { const s = await db.collection("pickem").get(); pickDocs = Object.fromEntries(s.docs.map((d) => [d.id, d.data()])); }
  const rows = boardFrom(pickDocs, matches);
  const doc = { sig: sig || resultSig(matches), at: now, n: rows.length, rows: rows.slice(0, 100) };
  await db.doc("public/pickboard").set(doc);
  await patchSnapshot(db, ["public/pickboard"], { now });
  return { n: rows.length };
}

// Después de actualizar el resumen: si cambiaron los resultados, se recalcula el ranking de pronósticos
export async function afterPatch(db, r) {
  if (!r || !r.matches || !r.snap) return null;
  const sig = resultSig(r.snap.matches), cur = r.snap.pickboard;
  if (cur && cur.sig === sig) return null;
  if (!cur && !sig) return null;
  return refreshBoard(db, r.snap.matches, null, { sig });
}

// Guarda los pronósticos de un jugador. Solo partidos pendientes que todavía no empezaron.
// parseLocal: fecha "2026-10-31T21:00" (hora de Argentina) → Date
export async function savePicks(db, who, picks, { matches, parseLocal, now = Date.now(), inc }) {
  const clean = {};
  for (const [mid, side] of Object.entries(picks || {}).slice(0, 80)) {
    if (!/^[A-Za-z0-9_\-]{1,40}$/.test(mid)) continue;
    if (side !== "a" && side !== "b" && side !== null) continue;
    const m = (matches || {})[mid];
    if (!m || m.status === "played") continue;
    const d = parseLocal(m.date);
    if (d && d.getTime() <= now) continue; // ya empezó
    clean[mid] = side;
  }
  const ref = db.doc(`pickem/${who.uid}`), aggRef = db.doc("public/pickagg");
  const res = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref), prev = (s.exists && s.data().picks) || {}, next = { ...prev }, delta = {};
    for (const [mid, side] of Object.entries(clean)) {
      const old = prev[mid] || null; if (old === side) continue;
      if (old) (delta[mid] = delta[mid] || {})[old] = ((delta[mid] || {})[old] || 0) - 1;
      if (side) (delta[mid] = delta[mid] || {})[side] = ((delta[mid] || {})[side] || 0) + 1;
      if (side) next[mid] = side; else delete next[mid];
    }
    tx.set(ref, { uid: who.uid, name: who.name || "Jugador", avatar: who.avatar || "", picks: next, at: now });
    const upd = {};
    for (const [mid, d] of Object.entries(delta)) for (const [side, n] of Object.entries(d)) if (n) (upd[mid] = upd[mid] || {})[side] = inc(n);
    if (Object.keys(upd).length) tx.set(aggRef, upd, { merge: true });
    return { picks: next, changed: Object.keys(delta).length };
  });
  if (res.changed) await patchSnapshot(db, ["public/pickagg"], { now });
  return res;
}
