// Cada 20 minutos actualiza las estadísticas de rankeds de los jugadores que tienen Riot ID (los más viejos primero).
// Cada jugador se actualiza más o menos una vez por hora. Sin HENRIKDEV_API_KEY no hace nada.
import { initAdmin } from "../lib/admin.mjs";
import { vsConfigured, pickDue, refreshMany } from "../lib/valstats.mjs";
import { patchSnapshot } from "../lib/publish.mjs";
import { loadSnapshot, clearSnapshotCache } from "../lib/fsrest.mjs";

export default async () => {
  if (!vsConfigured()) return new Response("sin clave", { status: 200 });
  let admin;
  try { admin = initAdmin(); } catch (e) { return new Response(String(e.message || e), { status: 200 }); }
  const db = admin.firestore(), now = Date.now();
  try {
    clearSnapshotCache();
    let snap = await loadSnapshot().catch(() => null);
    const get = async (c) => Object.fromEntries((await db.collection(c).get()).docs.map((d) => [d.id, d.data()]));
    const players = snap && snap.players ? snap.players : await get("players");
    const stats = snap && snap.valstats ? snap.valstats : await get("valstats");
    const due = pickDue(players, stats, { now, max: 12 });
    if (!due.length) return new Response(JSON.stringify({ due: 0 }), { status: 200 });
    const r = await refreshMany(db, due, { now });
    if (r.paths.length) await patchSnapshot(db, r.paths, { now });
    return new Response(JSON.stringify({ due: due.length, ok: r.ok, err: r.err, stopped: r.stopped }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) { console.error("valstats-cron:", e); return new Response(String(e.message || e), { status: 200 }); }
};

export const config = { schedule: "*/20 * * * *" };
