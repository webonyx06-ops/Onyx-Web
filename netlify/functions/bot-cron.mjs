// ONYX Bot · revisión automática cada 10 minutos (Netlify la corre sola en el sitio publicado).
// Manda recordatorios antes de cada partido, resultados, mapas sorteados y fichajes, y paga los sueldos de los coaches los lunes.
import { initAdmin } from "../lib/admin.mjs";
import { runPayroll } from "../lib/payroll.mjs";
import { configured } from "../lib/discord.mjs";
import { runTick, syncPickedMaps } from "../lib/notify.mjs";
import { flushQueue, healSnapshot, patchSnapshot } from "../lib/publish.mjs";
import { clearSnapshotCache, loadSnapshot } from "../lib/fsrest.mjs";
import { closeExpired } from "../lib/motions.mjs";
import { afterPatch } from "../lib/pickem.mjs";

export default async () => {
  let db, admin;
  try { admin = initAdmin(); db = admin.firestore(); } catch (e) { return new Response(String(e.message || e), { status: 200 }); }
  // Resumen público al día antes de revisar: lo que quedó en la cola y, una vez por hora, un control de partidos y equipos
  const pub = {};
  try { const q = await flushQueue(db); pub.cola = q.n || 0; await afterPatch(db, q); } catch (e) { console.error("resumen:", e); pub.error = String(e.message || e); }
  if (new Date().getUTCMinutes() < 10) { try { const h = await healSnapshot(db); pub.control = h.healed || 0; await afterPatch(db, h); } catch (e) { console.error("control del resumen:", e); } }
  clearSnapshotCache();
  // Votaciones de capitán vencidas
  try { const L = await loadSnapshot(); if (L) { const paths = await closeExpired(db, L); if (paths.length) { await patchSnapshot(db, paths); clearSnapshotCache(); pub.votaciones = paths.length; } } } catch (e) { console.error("votaciones:", e); }
  let r = { skipped: "ONYX Bot sin configurar" }, status = 200;
  if (configured()) {
    try { r = await runTick(db); } catch (e) { console.error("ONYX Bot:", e); r = { error: String(e.message || e) }; status = 500; }
  }
  // Mapas elegidos por los capitanes que ya se avisaron o ya se jugaron: quedan descartados para su equipo.
  try { r.mapas = await syncPickedMaps(db); } catch (e) { console.error("ONYX Bot mapas:", e); }
  // Sueldos de los coaches (una vez por semana; las demás revisiones no hacen nada)
  try {
    r.sueldos = await runPayroll(db, { inc: (n) => admin.firestore.FieldValue.increment(n) });
    const paths = r.sueldos.paths || []; delete r.sueldos.paths;
    if (paths.length) await patchSnapshot(db, paths);
  } catch (e) { console.error("Sueldos de coaches:", e); r.sueldos = { error: String(e.message || e) }; }
  r.resumen = pub;
  return new Response(JSON.stringify(r), { status, headers: { "content-type": "application/json" } });
};

export const config = { schedule: "*/10 * * * *" };
