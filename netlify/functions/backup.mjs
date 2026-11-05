// Copias de seguridad. Ruta: /api/backup — solo ultra staff.
//   GET                → lista de copias
//   GET ?key=<copia>   → descarga el archivo JSON
//   POST { action: "create", reason }               → copia ahora
//   POST { action: "restore", key, only?: [...] }   → vuelve la base a esa copia (antes guarda una copia del estado actual)
//   POST { action: "upload", data }                 → restaura desde un archivo que tenías descargado
import { initAdmin } from "../lib/admin.mjs";
import { json, whoIs, readBody } from "../lib/auth.mjs";
import { dumpAll, saveBackup, listBackups, readBackup, restoreAll } from "../lib/backup.mjs";
import { buildSnapshot } from "../lib/publish.mjs";

const audit = (db, by, txt) => db.collection("audit").add({ at: Date.now(), uid: by.uid, u: by.u, role: by.role, txt: String(txt).slice(0, 400) });
const blobsErr = (e) => /blobs|NETLIFY_BLOBS|MissingBlobsEnvironment|siteID/i.test(String(e && (e.name + " " + e.message)))
  ? "Netlify Blobs no está disponible. Las copias funcionan en la página publicada en Netlify (no en una copia local)." : String((e && e.message) || e);

export default async (req) => {
  let admin;
  try { admin = initAdmin(); } catch (e) { return json(500, { error: e.message }); }
  const who = await whoIs(req, admin);
  if (!who || !who.ultra) return json(403, { error: "Las copias de seguridad son solo para ultra staff." });
  const db = admin.firestore(), url = new URL(req.url);
  try {
    if (req.method === "GET") {
      const key = url.searchParams.get("key");
      if (!key) return json(200, { list: await listBackups() });
      const txt = await readBackup(key);
      return new Response(txt, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="onyx-${key.replace(/\//g, "-")}.json"`, "cache-control": "no-store" } });
    }
    if (req.method !== "POST") return json(405, { error: "Método no permitido." });
    const b = await readBody(req, 40e6);
    if (b.action === "create") {
      const r = await saveBackup(await dumpAll(db), { kind: "manual", reason: b.reason || "Copia manual", by: who.u });
      await audit(db, who, `Hizo una copia de seguridad (${r.docs} documentos)${b.reason ? ` · ${b.reason}` : ""}`);
      return json(200, r);
    }
    if (b.action === "restore" || b.action === "upload") {
      let data;
      if (b.action === "restore") data = JSON.parse(await readBackup(b.key));
      else data = typeof b.data === "string" ? JSON.parse(b.data) : b.data;
      const only = Array.isArray(b.only) && b.only.length ? b.only.map(String) : null;
      const pre = await saveBackup(await dumpAll(db), { kind: "auto", reason: "Antes de restaurar", by: who.u });
      const done = await restoreAll(db, data, { only, Timestamp: admin.firestore.Timestamp });
      await buildSnapshot(db).catch((e) => console.error("resumen:", e));
      const n = Object.values(done).reduce((s, x) => s + x.put, 0);
      await audit(db, who, `Restauró la copia del ${new Date(data.at).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} (${n} documentos${only ? `, solo ${only.join(", ")}` : ""}). Antes guardó ${pre.key}`);
      return json(200, { done, pre: pre.key });
    }
    return json(400, { error: "Acción desconocida." });
  } catch (e) {
    console.error("backup:", e);
    return json(e.status || 500, { error: blobsErr(e) });
  }
};

export const config = { path: "/api/backup" };
