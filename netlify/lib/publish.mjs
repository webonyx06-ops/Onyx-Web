// Resumen público de la liga: UN documento (public/snapshot) con todo lo que ve un visitante.
// Así cada visita lee 1 documento de Firebase en vez de cientos (el plan gratis permite unas 50.000 lecturas por día).
// Las imágenes (logos y fotos de premios) no van adentro: se sirven aparte por /api/img con caché de Netlify.
//
//   public/snapshot  { v, rev, at, json }   json = todo lo público en texto (un solo campo: no hay límite de campos)
//   public/meta      { rev, at, size }      lo escuchan los visitantes: cuando cambia rev, bajan el resumen nuevo
//   pubqueue/main    { paths, at }          cambios anotados por la página si /api/publish no respondió
//
// El staff y los capitanes, al guardar algo público, llaman a /api/publish con los documentos que cambiaron
// y acá se actualiza solo eso (unas pocas lecturas). Una vez por día se rearma todo desde cero (backup-cron).
import { createHash } from "node:crypto";

export const SNAP_V = 1;
// Colecciones públicas que van al resumen
export const SNAP_COLLS = ["teams", "logos", "players", "matches", "transfers", "draws", "perf", "prizes", "redeems",
  "coaches", "salaries", "seasons", "playoffs", "att", "motions"];
// Documentos sueltos que van al resumen, con su clave
export const SNAP_DOCS = { "league/config": "config", "public/pickagg": "pickagg", "public/pickboard": "pickboard" };
const MAX_JSON = 1000000; // un documento de Firestore puede tener hasta 1 MiB

export const okPath = (p) => typeof p === "string" && p.length <= 160 && (p in SNAP_DOCS
  || (/^[a-z]+\/[A-Za-z0-9_\-:.]{1,140}$/.test(p) && SNAP_COLLS.includes(p.split("/")[0])));

const hash = (s) => createHash("sha1").update(String(s)).digest("hex").slice(0, 12);
export const imgUrl = (coll, id, data) => `/api/img/${coll}/${encodeURIComponent(id)}?h=${hash(data)}`;

// Firestore admin devuelve Timestamp para fechas guardadas como tales: en el resumen van como milisegundos.
function plain(v) {
  if (v == null || typeof v !== "object") return v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (Array.isArray(v)) return v.map(plain);
  const o = {}; for (const [k, x] of Object.entries(v)) o[k] = plain(x); return o;
}

// Cómo queda cada documento en el resumen
export function pubDoc(coll, id, data) {
  if (data == null) return null;
  const d = plain(data);
  if (coll === "logos") return typeof d.data === "string" && d.data.startsWith("data:") ? { data: imgUrl("logos", id, d.data), at: d.at || 0 } : { data: d.data || "", at: d.at || 0 };
  if (coll === "prizes" && typeof d.img === "string" && d.img.startsWith("data:")) return { ...d, img: imgUrl("prizes", id, d.img) };
  return d;
}

export function emptySnap() {
  const s = { v: SNAP_V, rev: 0, at: 0, config: {}, pickagg: {}, pickboard: null };
  SNAP_COLLS.forEach((c) => { s[c] = {}; });
  return s;
}

// Aplica un documento (o su borrado) al resumen en memoria
export function applyDoc(snap, path, data) {
  if (path in SNAP_DOCS) { const k = SNAP_DOCS[path]; snap[k] = data == null ? (k === "pickboard" ? null : {}) : plain(data); return; }
  const i = path.indexOf("/"), c = path.slice(0, i), id = path.slice(i + 1);
  if (!SNAP_COLLS.includes(c)) return;
  snap[c] = snap[c] || {};
  const v = pubDoc(c, id, data);
  if (v == null) delete snap[c][id]; else snap[c][id] = v;
}

// Arma el resumen completo a partir de las colecciones ya leídas: { coll: { id: data } } y { "league/config": data }
export function snapFrom(colls, docs = {}) {
  const s = emptySnap();
  for (const c of SNAP_COLLS) for (const [id, d] of Object.entries(colls[c] || {})) applyDoc(s, `${c}/${id}`, d);
  for (const p of Object.keys(SNAP_DOCS)) if (docs[p] != null) applyDoc(s, p, docs[p]);
  return s;
}

// Si el resumen se pasa del máximo, se recorta lo más viejo que no hace falta para la temporada en curso
export function fit(snap) {
  let json = JSON.stringify(snap);
  if (json.length <= MAX_JSON) return json;
  const trim = (coll, keep) => {
    const arr = Object.entries(snap[coll] || {}).sort((a, b) => (+(b[1] || {}).at || 0) - (+(a[1] || {}).at || 0));
    snap[coll] = Object.fromEntries(arr.slice(0, keep));
  };
  for (const [coll, keep] of [["salaries", 200], ["redeems", 150], ["transfers", 150], ["draws", 80], ["salaries", 60], ["redeems", 60], ["att", 300]]) {
    trim(coll, keep); json = JSON.stringify(snap); if (json.length <= MAX_JSON) break;
  }
  snap.trimmed = true;
  return JSON.stringify(snap);
}

const refs = (db) => ({ snap: db.doc("public/snapshot"), meta: db.doc("public/meta"), queue: db.doc("pubqueue/main") });

async function readAll(db) {
  const colls = {}, docs = {};
  await Promise.all(SNAP_COLLS.map(async (c) => { const s = await db.collection(c).get(); colls[c] = Object.fromEntries(s.docs.map((d) => [d.id, d.data()])); }));
  await Promise.all(Object.keys(SNAP_DOCS).map(async (p) => { const s = await db.doc(p).get(); if (s.exists) docs[p] = s.data(); }));
  return { colls, docs };
}

// Rearma todo. Si ya tenés las colecciones leídas (backup diario), pasalas en `from` y no se vuelve a leer nada.
export async function buildSnapshot(db, { from = null, now = Date.now() } = {}) {
  const { colls, docs } = from || await readAll(db);
  const s = snapFrom(colls, docs), R = refs(db);
  return db.runTransaction(async (tx) => {
    const prev = await tx.get(R.meta);
    s.rev = ((prev.exists && +prev.data().rev) || 0) + 1; s.at = now; s.full = now;
    const json = fit(s);
    tx.set(R.snap, { v: SNAP_V, rev: s.rev, at: now, json });
    tx.set(R.meta, { rev: s.rev, at: now, size: json.length, full: now });
    tx.set(R.queue, { paths: [], at: now });
    return { rev: s.rev, size: json.length, full: true };
  });
}

// Actualiza solo los documentos que cambiaron (más los que quedaron anotados en la cola).
export async function patchSnapshot(db, paths = [], { now = Date.now() } = {}) {
  const want = [...new Set((paths || []).filter(okPath))].slice(0, 400), R = refs(db);
  if (!want.length) { // solo la cola: si está vacía no hay nada que hacer (1 lectura)
    const q = await R.queue.get();
    if (!q.exists || !((q.data() || {}).paths || []).length) return { rev: null, n: 0 };
  }
  const out = await db.runTransaction(async (tx) => {
    const [snapS, queueS] = await tx.getAll(R.snap, R.queue);
    if (!snapS.exists || !(snapS.data() || {}).json) return { needFull: true };
    const queued = ((queueS.exists && queueS.data()) || {}).paths || [];
    const all = [...new Set([...want, ...queued.filter(okPath)])].slice(0, 450);
    if (!all.length) return { rev: snapS.data().rev, n: 0 };
    const docs = await tx.getAll(...all.map((p) => db.doc(p)));
    let cur; try { cur = JSON.parse(snapS.data().json); } catch (_) { return { needFull: true }; }
    if (!cur || cur.v !== SNAP_V) return { needFull: true };
    docs.forEach((d, i) => applyDoc(cur, all[i], d.exists ? d.data() : null));
    cur.rev = (+cur.rev || 0) + 1; cur.at = now;
    const json = fit(cur);
    tx.set(R.snap, { v: SNAP_V, rev: cur.rev, at: now, json });
    tx.set(R.meta, { rev: cur.rev, at: now, size: json.length, full: cur.full || 0 });
    if (queued.length) tx.set(R.queue, { paths: [], at: now });
    return { rev: cur.rev, n: all.length, matches: all.some((p) => p.startsWith("matches/")), snap: cur };
  });
  if (out.needFull) return buildSnapshot(db, { now });
  return out;
}

// Para la revisión de cada 10 minutos: procesa lo que quedó en la cola
export const flushQueue = (db, o) => patchSnapshot(db, [], o);

// Texto canónico (claves ordenadas) para comparar documentos sin importar el orden de los campos
export function canon(v) {
  if (v == null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
}

// Control de cada hora: compara el resumen con las colecciones que más importan (partidos y equipos) y corrige
// lo que no se haya avisado (por ejemplo, si alguien cerró la página justo después de guardar).
export async function healSnapshot(db, colls = ["matches", "teams"], { now = Date.now() } = {}) {
  const snapS = await db.doc("public/snapshot").get();
  if (!snapS.exists || !(snapS.data() || {}).json) return buildSnapshot(db, { now });
  let cur; try { cur = JSON.parse(snapS.data().json); } catch (_) { return buildSnapshot(db, { now }); }
  const diff = [];
  for (const c of colls) {
    const s = await db.collection(c).get(), have = cur[c] || {}, seen = new Set();
    s.docs.forEach((d) => { seen.add(d.id); if (canon(have[d.id]) !== canon(pubDoc(c, d.id, d.data()))) diff.push(`${c}/${d.id}`); });
    Object.keys(have).forEach((id) => { if (!seen.has(id)) diff.push(`${c}/${id}`); });
  }
  if (!diff.length) return { n: 0, healed: 0 };
  const r = await patchSnapshot(db, diff, { now });
  return { ...r, healed: diff.length };
}
