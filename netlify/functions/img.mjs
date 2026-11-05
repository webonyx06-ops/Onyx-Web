// Imágenes que se suben desde el panel (logos de equipos y fotos de premios), servidas con caché de Netlify.
// Ruta: /api/img/<logos|prizes>/<id>?h=<huella>   (la huella cambia cuando cambia la imagen, así la caché nunca queda vieja)
import { getDocRest } from "../lib/fsrest.mjs";
import { TEAM_KEYS } from "../lib/league.mjs";

const FIELD = { logos: "data", prizes: "img" };

export default async (req, context) => {
  const p = (context && context.params) || {};
  const coll = String(p.coll || ""), id = String(p.id || "").replace(/\.(webp|png|jpe?g)$/, "");
  if (!FIELD[coll] || !/^[A-Za-z0-9_\-]{1,60}$/.test(id)) return new Response("No encontrado", { status: 404 });
  const versioned = new URL(req.url).searchParams.has("h");
  try {
    const d = await getDocRest(`${coll}/${id}`);
    const m = d && typeof d[FIELD[coll]] === "string" && d[FIELD[coll]].match(/^data:(image\/(?:webp|png|jpeg|gif));base64,(.+)$/);
    if (m) {
      const cache = versioned ? "public, max-age=31536000, immutable" : "public, max-age=300";
      return new Response(Buffer.from(m[2], "base64"), { headers: { "content-type": m[1], "cache-control": cache, "netlify-cdn-cache-control": versioned ? "public, durable, max-age=31536000, immutable" : "public, max-age=300" } });
    }
  } catch (_) { /* sigue */ }
  if (coll === "logos" && TEAM_KEYS.includes(id)) return Response.redirect(new URL(`/assets/emblemas/${id}.webp`, req.url).toString(), 302);
  return new Response("No encontrado", { status: 404, headers: { "cache-control": "public, max-age=60" } });
};

export const config = { path: "/api/img/:coll/:id" };
