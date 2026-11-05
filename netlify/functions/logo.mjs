// Sirve los logos que se suben desde el panel (los usa ONYX Bot en Discord).
// Ruta: /api/logo/<equipo>
import { getDocRest } from "../lib/fsrest.mjs";
import { TEAM_KEYS } from "../lib/league.mjs";

export default async (req, context) => {
  const k = String((context && context.params && context.params.team) || "").toLowerCase().replace(/\.(webp|png|jpe?g)$/, "");
  if (!/^[a-z0-9]{2,20}$/.test(k)) return new Response("No encontrado", { status: 404 });
  try {
    const d = await getDocRest(`logos/${k}`);
    const m = d && typeof d.data === "string" && d.data.match(/^data:(image\/(?:webp|png|jpeg));base64,(.+)$/);
    if (m) return new Response(Buffer.from(m[2], "base64"), { headers: { "content-type": m[1], "cache-control": "public, max-age=86400" } });
  } catch (_) { /* sigue con el logo de base */ }
  if (TEAM_KEYS.includes(k)) return Response.redirect(new URL(`/assets/emblemas/${k}.webp`, req.url).toString(), 302);
  return new Response("No encontrado", { status: 404 });
};

export const config = { path: "/api/logo/:team" };
