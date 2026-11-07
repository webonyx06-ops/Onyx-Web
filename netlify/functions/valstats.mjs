// Actualizar ya las estadísticas de rankeds de un jugador. Ruta: /api/valstats (POST { pid })
// La puede usar cualquiera (botón "Actualizar" de la ficha), pero cada jugador se actualiza como mucho cada 10 minutos.
import { initAdmin } from "../lib/admin.mjs";
import { json, readBody } from "../lib/auth.mjs";
import { vsConfigured, splitRiot, refreshMany } from "../lib/valstats.mjs";
import { patchSnapshot } from "../lib/publish.mjs";

const COOLDOWN = 10 * 60e3;
export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Usá POST." });
  if (!vsConfigured()) return json(501, { error: "Las estadísticas automáticas todavía no están activadas.", noKey: true });
  let admin;
  try { admin = initAdmin(); } catch (e) { return json(500, { error: e.message }); }
  const db = admin.firestore(), now = Date.now();
  try {
    const b = await readBody(req, 2000), pid = String(b.pid || "");
    if (!/^[A-Za-z0-9_\-]{1,40}$/.test(pid)) return json(400, { error: "Jugador inválido." });
    const p = await db.doc(`players/${pid}`).get();
    if (!p.exists || !splitRiot(p.data().ign)) return json(404, { error: "Ese jugador no tiene Riot ID cargado." });
    const id = splitRiot(p.data().ign), ign = `${id.name}#${id.tag}`;
    const s = await db.doc(`valstats/${pid}`).get(), prev = s.exists ? s.data() : null;
    if (prev && prev.ign === ign && now - (prev.at || 0) < COOLDOWN) return json(200, { fresh: true, wait: Math.ceil((COOLDOWN - (now - prev.at)) / 60000) });
    const r = await refreshMany(db, [{ pid, ign, prev: prev && prev.ign === ign ? prev : null }], { now });
    if (r.stopped) return json(429, { error: r.stopped === "rate" ? "Hay muchos pedidos ahora. Probá en un minuto." : "Las estadísticas no están disponibles ahora." });
    if (r.paths.length) await patchSnapshot(db, r.paths, { now });
    const after = (await db.doc(`valstats/${pid}`).get()).data();
    return json(200, { ok: !!(after && after.ok && !after.code), error: after && after.code ? after.error : null });
  } catch (e) {
    if (!e.status) console.error("valstats:", e);
    return json(e.status || 500, { error: String(e.message || e) });
  }
};

export const config = { path: "/api/valstats" };
