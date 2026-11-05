// Copias de seguridad de toda la base, guardadas en Netlify Blobs (fuera de Firebase).
// Se hace una sola por día (backup-cron) y una antes de cada borrado grande, de cerrar la temporada o de restaurar.
// Se guardan las últimas 30 diarias y las últimas 40 manuales.

// No se copian: capturas de resultados (pesadas y temporales), el resumen público (se rearma solo) y su cola
const SKIP_COLL = new Set(["resultimg", "pubqueue"]);
const SKIP_DOC = new Set(["public/snapshot"]);
// No se pisan al restaurar: cuentas (van atadas al login), auditoría, ONYX Bot y lo que se rearma solo
export const NO_RESTORE = new Set(["staff", "captains", "audit", "bot", "resultimg", "public", "pubqueue", "sys"]);
export const KEEP = { daily: 30, manual: 40 };

// Fechas de Firestore (Timestamp) → { __ts: ms } para poder volver a guardarlas igual
function enc(v) {
  if (v == null || typeof v !== "object") return v;
  if (typeof v.toMillis === "function") return { __ts: v.toMillis() };
  if (Array.isArray(v)) return v.map(enc);
  const o = {}; for (const [k, x] of Object.entries(v)) o[k] = enc(x); return o;
}
export function dec(v, Timestamp) {
  if (v == null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => dec(x, Timestamp));
  if (Object.keys(v).length === 1 && typeof v.__ts === "number") return Timestamp ? Timestamp.fromMillis(v.__ts) : v.__ts;
  const o = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x, Timestamp); return o;
}

export async function dumpAll(db, now = Date.now()) {
  const out = { v: 1, app: "onyx", at: now, colls: {} };
  const colls = await db.listCollections();
  await Promise.all(colls.map(async (ref) => {
    if (SKIP_COLL.has(ref.id)) return;
    const s = await ref.get(), docs = {};
    s.docs.forEach((d) => { if (!SKIP_DOC.has(`${ref.id}/${d.id}`)) docs[d.id] = enc(d.data()); });
    out.colls[ref.id] = docs;
  }));
  return out;
}
export const countDocs = (data) => Object.values(data.colls || {}).reduce((n, c) => n + Object.keys(c).length, 0);

// El paquete de Netlify Blobs se carga recién cuando hace falta (así las pruebas no lo necesitan)
export async function backupStore() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "onyx-backups", consistency: "strong" });
}
const stamp = (at) => new Date(at).toISOString().replace(/\.\d+Z$/, "Z").replace(/:/g, "-");

export async function saveBackup(data, { kind = "manual", reason = "", by = "", store = null } = {}) {
  store = store || await backupStore();
  const key = `${kind}/${stamp(data.at)}`, body = JSON.stringify(data), docs = countDocs(data);
  await store.set(key, body, { metadata: { at: data.at, kind, reason: String(reason).slice(0, 120), by: String(by).slice(0, 40), size: body.length, docs } });
  await prune(store, kind).catch(() => {});
  return { key, at: data.at, kind, reason, by, size: body.length, docs };
}

export async function listBackups(store = null) {
  store = store || await backupStore();
  const { blobs = [] } = await store.list();
  const keys = blobs.map((b) => b.key).filter((k) => /^(daily|manual|auto)\//.test(k)).sort().reverse().slice(0, 80);
  const out = await Promise.all(keys.map(async (key) => {
    let md = {};
    try { const r = await store.getMetadata(key); md = (r && r.metadata) || {}; } catch (_) { /* sin datos extra */ }
    return { key, at: +md.at || Date.parse(key.split("/")[1].replace(/T(\d\d)-(\d\d)-(\d\d)Z$/, "T$1:$2:$3Z")) || 0, kind: md.kind || key.split("/")[0], reason: md.reason || "", by: md.by || "", size: +md.size || 0, docs: +md.docs || 0 };
  }));
  return out.sort((a, b) => b.at - a.at);
}

async function prune(store, kind) {
  const keep = KEEP[kind] || 40;
  const { blobs = [] } = await store.list({ prefix: `${kind}/` });
  const old = blobs.map((b) => b.key).sort().reverse().slice(keep);
  for (const k of old) await store.delete(k);
}

export async function readBackup(key, store = null) {
  if (!/^(daily|manual|auto)\/[0-9TZ\-]+$/.test(String(key))) throw new Error("Esa copia no existe.");
  store = store || await backupStore();
  const txt = await store.get(key, { type: "text" });
  if (!txt) throw new Error("Esa copia no existe.");
  return txt;
}

// Vuelve la base al estado de la copia. Solo toca las colecciones de la liga (no cuentas, auditoría ni ONYX Bot).
// only: lista de colecciones a restaurar (por defecto, todas las de la copia).
export async function restoreAll(db, data, { only = null, Timestamp = null } = {}) {
  if (!data || data.app !== "onyx" || !data.colls) throw new Error("El archivo no es una copia de ONYX.");
  const done = {};
  let batch = db.batch(), ops = 0;
  const flush = async () => { if (ops) { await batch.commit(); batch = db.batch(); ops = 0; } };
  const add = async (fn) => { fn(batch); ops++; if (ops >= 400) await flush(); };
  for (const [c, docs] of Object.entries(data.colls)) {
    if (NO_RESTORE.has(c) || (only && !only.includes(c))) continue;
    const cur = await db.collection(c).get();
    let del = 0, put = 0;
    for (const d of cur.docs) if (!(d.id in docs)) { await add((b) => b.delete(d.ref)); del++; }
    for (const [id, v] of Object.entries(docs)) { await add((b) => b.set(db.doc(`${c}/${id}`), dec(v, Timestamp))); put++; }
    done[c] = { put, del };
  }
  await flush();
  return done;
}
