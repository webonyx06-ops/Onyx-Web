// Lectura rápida de los datos públicos de la liga por la API REST de Firestore
// (sin cargar el SDK de admin: los comandos de Discord tienen que responder en menos de 3 segundos).
import { projectId } from "./sa.mjs";

// La clave web de Firebase es pública (es la misma que usa la página).
const KEY = () => process.env.FIREBASE_WEB_API_KEY || "AIzaSyDjfut6DuCjrlUdHq3S0CgvvkcX7kudMw0";

// Si la clave tuviera restricciones de dominio, se reintenta sin clave (las colecciones son públicas).
async function get(url) {
  const r = await fetch(url);
  if (r.status !== 403 || !url.includes("key=")) return r;
  return fetch(url.replace(/([?&])key=[^&]*&?/, "$1").replace(/[?&]$/, ""));
}

const base = () => `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;

function val(v) {
  if (!v || typeof v !== "object") return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return obj(v.mapValue.fields || {});
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(val);
  return null;
}
const obj = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, val(v)]));

export async function listColl(coll) {
  const out = {};
  let token = "";
  for (let i = 0; i < 20; i++) {
    const r = await get(`${base()}/${coll}?key=${KEY()}&pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`);
    if (!r.ok) throw new Error(`No se pudo leer ${coll} (${r.status})`);
    const j = await r.json();
    (j.documents || []).forEach((d) => { out[d.name.split("/").pop()] = obj(d.fields || {}); });
    token = j.nextPageToken || "";
    if (!token) break;
  }
  return out;
}

export async function getDocRest(path) {
  const r = await get(`${base()}/${path}?key=${KEY()}`);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`No se pudo leer ${path} (${r.status})`);
  const j = await r.json();
  return obj(j.fields || {});
}

// Resumen público (public/snapshot): un solo documento con toda la liga. Se guarda unos segundos en memoria
// para que una misma revisión no lo lea varias veces.
let snapCache = null;
export async function loadSnapshot({ maxAge = 20000 } = {}) {
  if (snapCache && Date.now() - snapCache.t < maxAge) return snapCache.d;
  const d = await getDocRest("public/snapshot");
  let out = null;
  if (d && typeof d.json === "string") { try { out = JSON.parse(d.json); } catch (_) { out = null; } }
  if (out && out.v !== 1) out = null;
  snapCache = { t: Date.now(), d: out };
  return out;
}
export const clearSnapshotCache = () => { snapCache = null; };

// Partidos: del resumen si está, si no de la colección
export async function loadMatches() {
  try { const s = await loadSnapshot(); if (s && s.matches) return s.matches; } catch (_) { /* sigue */ }
  return listColl("matches");
}

// Carga todo lo público de la liga: del resumen (1 lectura) o, si todavía no existe, colección por colección.
// fresh: true → siempre de las colecciones (lo usa el panel de ONYX Bot, que manda lo que el staff acaba de cargar).
export async function loadLeague(parts = ["teams", "players", "matches", "perf", "transfers", "draws"], { fresh = false } = {}) {
  if (!fresh) try {
    const s = await loadSnapshot();
    if (s) {
      const out = { config: s.config || {} };
      for (const p of ["teams", "players", "matches", "perf", "transfers", "draws", ...parts]) out[p] = s[p] || {};
      return out;
    }
  } catch (_) { /* sigue con las colecciones */ }
  const [config, ...rest] = await Promise.all([getDocRest("league/config"), ...parts.map((p) => listColl(p))]);
  const out = { config: config || {} };
  parts.forEach((p, i) => { out[p] = rest[i]; });
  for (const p of ["teams", "players", "matches", "perf", "transfers", "draws"]) if (!out[p]) out[p] = {};
  return out;
}
export const loadLeagueFresh = (parts) => loadLeague(parts, { fresh: true });
