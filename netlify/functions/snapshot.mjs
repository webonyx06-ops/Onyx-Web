// Resumen público de la liga servido con la caché de Netlify (casi no gasta lecturas de Firebase).
// Ruta: /api/snapshot?rev=<n>. Cada versión (rev) se lee de Firebase una sola vez y después sale de la caché.
import { getDocRest } from "../lib/fsrest.mjs";

export default async (req) => {
  const want = +new URL(req.url).searchParams.get("rev") || 0;
  try {
    const d = await getDocRest("public/snapshot");
    if (!d || typeof d.json !== "string") return new Response(JSON.stringify({ error: "Todavía no hay resumen" }), { status: 404, headers: { "content-type": "application/json", "cache-control": "no-store" } });
    const exact = want && +d.rev === want;
    return new Response(d.json, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": exact ? "public, max-age=3600" : "public, max-age=0, must-revalidate",
        "netlify-cdn-cache-control": exact ? "public, durable, max-age=31536000, immutable" : "public, max-age=5",
        "x-onyx-rev": String(d.rev || 0),
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e.message || e) }), { status: 502, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  }
};

export const config = { path: "/api/snapshot" };
