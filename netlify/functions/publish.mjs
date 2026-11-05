// Actualiza el resumen público después de un cambio. Ruta: /api/publish (POST)
// La llama la página del staff o del capitán con los documentos que acaba de guardar: { paths: ["matches/f1m0", ...] }
// Staff: { full: true } rearma todo el resumen.
import { initAdmin } from "../lib/admin.mjs";
import { json, whoIs, readBody } from "../lib/auth.mjs";
import { patchSnapshot, buildSnapshot } from "../lib/publish.mjs";
import { afterPatch } from "../lib/pickem.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Usá POST." });
  let admin;
  try { admin = initAdmin(); } catch (e) { return json(500, { error: e.message }); }
  const who = await whoIs(req, admin);
  if (!who || !(who.staff || who.captain)) return json(401, { error: "Tu sesión no es válida. Volvé a entrar." });
  try {
    const b = await readBody(req, 200000), db = admin.firestore();
    const r = b.full && who.staff ? await buildSnapshot(db) : await patchSnapshot(db, Array.isArray(b.paths) ? b.paths : []);
    await afterPatch(db, r).catch((e) => console.error("pronósticos:", e));
    return json(200, { rev: r.rev, n: r.n || 0, full: !!r.full, size: r.size || 0 });
  } catch (e) {
    console.error("publish:", e);
    return json(e.status || 500, { error: String(e.message || e) });
  }
};

export const config = { path: "/api/publish" };
