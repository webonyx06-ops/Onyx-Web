// Copia de seguridad diaria (03:17 hora de Argentina) y rearmado completo del resumen público.
// Con los datos que ya leyó para la copia arma el resumen, así no gasta lecturas de más.
import { initAdmin } from "../lib/admin.mjs";
import { dumpAll, saveBackup, dec } from "../lib/backup.mjs";
import { buildSnapshot } from "../lib/publish.mjs";
import { refreshBoard } from "../lib/pickem.mjs";

export default async () => {
  let admin;
  try { admin = initAdmin(); } catch (e) { return new Response(String(e.message || e), { status: 200 }); }
  const db = admin.firestore(), out = {};
  let dump = null;
  try { dump = await dumpAll(db); } catch (e) { console.error("copia:", e); out.dumpError = String(e.message || e); }
  if (dump) {
    try { out.backup = await saveBackup(dump, { kind: "daily", reason: "Copia diaria", by: "servidor" }); } catch (e) { console.error("copia:", e); out.backupError = String(e.message || e); }
    try {
      const colls = dec(dump.colls), docs = {};
      if (colls.league && colls.league.config) docs["league/config"] = colls.league.config;
      if (colls.public) for (const k of ["pickagg", "pickboard"]) if (colls.public[k]) docs[`public/${k}`] = colls.public[k];
      out.snapshot = await buildSnapshot(db, { from: { colls, docs } });
    } catch (e) { console.error("resumen:", e); out.snapError = String(e.message || e); }
    try { const c = dec(dump.colls); out.pickem = await refreshBoard(db, c.matches || {}, c.pickem || {}); } catch (e) { console.error("pronósticos:", e); }
  }
  return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
};

export const config = { schedule: "17 6 * * *" };
