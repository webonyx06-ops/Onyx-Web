// Firestore de mentira (en memoria) con lo que usan las funciones del servidor:
// doc/collection, where/orderBy/limit/count, transacciones, tandas (batch), listCollections e incrementos.
const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

export class Inc { constructor(n) { this.n = n; } }
export class Union { constructor(a) { this.a = a; } }
export const FieldValue = { increment: (n) => new Inc(n), arrayUnion: (...a) => new Union(a) };

function resolve(cur, v) {
  if (v instanceof Inc) return (+cur || 0) + v.n;
  if (v instanceof Union) return [...new Set([...(Array.isArray(cur) ? cur : []), ...v.a])];
  if (v && typeof v === "object" && !Array.isArray(v)) { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = resolve(undefined, x); return o; }
  return clone(v);
}
function mergeDeep(cur, v) {
  if (!(v && typeof v === "object" && !Array.isArray(v)) || v instanceof Inc || v instanceof Union) return resolve(cur, v);
  const o = cur && typeof cur === "object" && !Array.isArray(cur) ? { ...cur } : {};
  for (const [k, x] of Object.entries(v)) o[k] = mergeDeep(o[k], x);
  return o;
}

export function fakeDb(seed = {}) {
  const data = new Map();
  for (const [p, d] of Object.entries(seed)) data.set(p, clone(d));
  let auto = 0, reads = 0, writes = 0;
  const snap = (path) => { reads++; const d = data.get(path); return { id: path.split("/").pop(), ref: docRef(path), exists: d !== undefined, data: () => (d === undefined ? undefined : clone(d)) }; };
  const write = (path, d, mode) => {
    writes++;
    if (mode === "delete") { data.delete(path); return; }
    if (mode === "update") {
      if (!data.has(path)) throw Object.assign(new Error(`NOT_FOUND: ${path}`), { code: 5 });
      const cur = clone(data.get(path));
      for (const [k, v] of Object.entries(d)) {
        const ks = k.split("."); let o = cur; ks.slice(0, -1).forEach((x) => { if (!o[x] || typeof o[x] !== "object") o[x] = {}; o = o[x]; });
        const last = ks[ks.length - 1]; o[last] = resolve(o[last], v);
      }
      data.set(path, cur); return;
    }
    if (mode === "merge") { data.set(path, mergeDeep(data.get(path), d)); return; }
    data.set(path, resolve(undefined, d));
  };
  function docRef(path) {
    return {
      id: path.split("/").pop(), path,
      get: async () => snap(path),
      set: async (d, o) => write(path, d, o && o.merge ? "merge" : "set"),
      update: async (d) => write(path, d, "update"),
      delete: async () => write(path, null, "delete"),
    };
  }
  function query(coll, filters = [], order = null, lim = null) {
    const run = () => {
      let docs = [...data.keys()].filter((k) => k.split("/").length === 2 && k.startsWith(coll + "/")).map((k) => ({ id: k.split("/")[1], path: k, d: data.get(k) }));
      for (const [f, op, v] of filters) docs = docs.filter(({ d }) => { const x = f.split(".").reduce((o, k) => (o == null ? o : o[k]), d);
        return op === "==" ? x === v : op === "in" ? v.includes(x) : op === ">" ? x > v : op === "<" ? x < v : op === ">=" ? x >= v : op === "<=" ? x <= v : op === "!=" ? x !== v : false; });
      if (order) docs.sort((a, b) => { const x = a.d[order[0]], y = b.d[order[0]]; return (x > y ? 1 : x < y ? -1 : 0) * (order[1] === "desc" ? -1 : 1); });
      if (lim != null) docs = docs.slice(0, lim);
      return docs;
    };
    return {
      where: (f, op, v) => query(coll, [...filters, [f, op, v]], order, lim),
      orderBy: (f, dir = "asc") => query(coll, filters, [f, dir], lim),
      limit: (n) => query(coll, filters, order, n),
      get: async () => { const docs = run().map((x) => snap(x.path)); if (!docs.length) reads++; return { docs, size: docs.length, empty: !docs.length }; },
      count: () => ({ get: async () => { reads++; const n = run().length; return { data: () => ({ count: n }) }; } }),
      doc: (id) => docRef(`${coll}/${id || "auto" + (++auto)}`),
      add: async (d) => { const r = docRef(`${coll}/auto${++auto}`); await r.set(d); return r; },
      id: coll,
    };
  }
  const db = {
    doc: docRef,
    collection: (c) => query(c),
    listCollections: async () => [...new Set([...data.keys()].map((k) => k.split("/")[0]))].map((c) => ({ id: c, get: () => query(c).get() })),
    runTransaction: async (fn) => {
      const ops = [];
      const tx = {
        get: async (r) => (r.get ? r.get() : r),
        getAll: async (...refs) => Promise.all(refs.map((r) => r.get())),
        set: (r, d, o) => { ops.push([r.path, d, o && o.merge ? "merge" : "set"]); return tx; },
        update: (r, d) => { ops.push([r.path, d, "update"]); return tx; },
        delete: (r) => { ops.push([r.path, null, "delete"]); return tx; },
      };
      const out = await fn(tx);
      for (const [p, d, m] of ops) write(p, d, m);
      return out;
    },
    batch: () => {
      const ops = [];
      const b = {
        set: (r, d, o) => { ops.push([r.path, d, o && o.merge ? "merge" : "set"]); return b; },
        update: (r, d) => { ops.push([r.path, d, "update"]); return b; },
        delete: (r) => { ops.push([r.path, null, "delete"]); return b; },
        commit: async () => { for (const [p, d, m] of ops) write(p, d, m); },
      };
      return b;
    },
    // ayudas para las pruebas
    _data: data,
    _get: (p) => clone(data.get(p)),
    _coll: (c) => Object.fromEntries([...data.keys()].filter((k) => k.startsWith(c + "/") && k.split("/").length === 2).map((k) => [k.split("/")[1], clone(data.get(k))])),
    _stats: () => ({ reads, writes }),
    _reset: () => { reads = 0; writes = 0; },
  };
  return db;
}
