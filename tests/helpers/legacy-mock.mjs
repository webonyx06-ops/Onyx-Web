// Mocks: Firestore REST (lectura pública), Discord API y Firestore admin.
export const NOW = Date.parse("2026-10-24T19:55:00-03:00"); // 1h05 antes de un partido a las 21:00
const enc = (v) => v === null || v === undefined ? { nullValue: null } : typeof v === "string" ? { stringValue: v } : typeof v === "boolean" ? { booleanValue: v }
  : typeof v === "number" ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }) : Array.isArray(v) ? { arrayValue: { values: v.map(enc) } }
  : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, enc(x)])) } };
const names = ["Jagger","Tomi","Lucho","Nacho","Fede","Santi","Mati","Pipe","Juanchi","Bruno","Leo","Gonza","Facu","Rami"];
const TK = ["onyx","orion","nexus","zenith","vortex","zyriax","kyrox"];
export const DB = {
  league: { config: { season: "Temporada 1", playoff: 4, windowOpen: true, windowClose: "2026-10-30T23:59", maps: ["Ascent","Bind","Haven","Split","Lotus","Sunset","Icebox"].map(n => ({ n, on: true })) } },
  teams: { nexus: { used: ["Bind"], captain: "p2" } },
  players: Object.fromEntries(names.map((n, i) => [`p${i}`, { name: n, team: TK[i % 7], role: ["Duelista","Iniciador","Controlador","Centinela"][i % 4], value: 500 + i * 50, clause: i % 3 ? 2000 : 0 }])),
  matches: {
    m1: { fecha: 1, a: "nexus", b: "zenith", status: "played", ra: 13, rb: 9, map: "Bind", date: "2026-10-17T21:00", stats: { p2: { t: "nexus", k: 22, d: 12, a: 5, acs: 260 }, p9: { t: "nexus", k: 15, d: 14, a: 7, acs: 201 }, p3: { t: "zenith", k: 18, d: 16, a: 3, acs: 230 } } },
    m2: { fecha: 2, a: "nexus", b: "orion", status: "pending", date: "2026-10-24T21:00" },
    m3: { fecha: 2, a: "onyx", b: "kyrox", status: "pending", date: "2026-10-25T19:30" },
    m4: { fecha: 2, a: "vortex", b: "zyriax", status: "pending", date: "2026-10-24T19:40", map: "Lotus" },
  },
  perf: { p2: { att: { "1": "P" }, skills: { aim: 8, sense: 7 }, pts: [{ v: 5, why: "MVP" }] } },
  transfers: {}, draws: {},
};
export const sent = [];
export const ADM = { "bot/config": null, "bot/state": null, draws: {}, transfers: {} };

globalThis.fetch = async (url, opt = {}) => {
  url = String(url);
  const res = (status, body) => ({ status, ok: status < 300, json: async () => body, text: async () => JSON.stringify(body) });
  if (url.includes("firestore.googleapis.com")) {
    const path = decodeURIComponent(url.split("/documents/")[1].split("?")[0]);
    const [coll, id] = path.split("/");
    if (id) { const d = (DB[coll] || {})[id]; return d ? res(200, { fields: enc(d).mapValue.fields }) : res(404, {}); }
    return res(200, { documents: Object.entries(DB[coll] || {}).map(([k, v]) => ({ name: `x/${coll}/${k}`, fields: enc(v).mapValue.fields })) });
  }
  if (url.includes("discord.com")) {
    const p = url.split("/api/v10")[1], body = opt.body ? JSON.parse(opt.body) : undefined;
    sent.push({ method: opt.method, path: p, body });
    if (p.includes("/channels/666666/")) return res(403, { code: 50001, message: "Missing Access" });
    if (opt.method === "PUT" && p.endsWith("/commands")) return res(200, body.map((c, i) => ({ id: String(i), ...c })));
    if (p.match(/\/roles$/) && opt.method === "GET") return res(200, [{ id: "r1", name: "Mod", position: 5 }, { id: "r2", name: "🌸 ZENITH", position: 3 }, { id: "r3", name: "Admin", position: 9 }]);
    if (opt.method === "PUT" || opt.method === "DELETE") return { status: 204, ok: true, json: async () => null };
    return res(200, { id: "msg" });
  }
  throw new Error("fetch no esperado " + url);
};

// Firestore admin simulado
const snap = (id, d) => ({ id, exists: d != null, data: () => d == null ? undefined : JSON.parse(JSON.stringify(d)) });
export const db = {
  doc: (p) => {
    const [c, id] = p.split("/"), nested = ADM[c] && typeof ADM[c] === "object" && !(p in ADM) && ["teams", "mappicks", "draws", "transfers", "coaches", "salaries", "payroll"].includes(c);
    const read = () => nested ? ADM[c][id] : ADM[p], write = (v) => { if (nested) ADM[c][id] = v; else ADM[p] = v; };
    return { get: async () => snap(p, read()), update: async (d) => { if (read() == null) throw new Error("NOT_FOUND"); write({ ...read(), ...d }); },
      set: async (d, o) => { write(o && o.merge ? { ...(read() || {}), ...d } : d); } };
  },
  collection: (c) => {
    const q = (filters = [], ord = null, lim = null) => {
      const run = () => { let e = Object.entries(ADM[c] || {}).filter(([, d]) => filters.every(([f, op, v]) => op === "==" ? d[f] === v : op === "in" ? v.includes(d[f]) : d[f] > v));
        if (ord) e.sort((a, b) => ((a[1][ord[0]] || 0) - (b[1][ord[0]] || 0)) * (ord[1] === "desc" ? -1 : 1)); if (lim != null) e = e.slice(0, lim); return e; };
      return { get: async () => ({ docs: run().map(([id, d]) => snap(id, d)) }), where: (f, op, v) => q([...filters, [f, op, v]], ord, lim), orderBy: (f, dir = "asc") => q(filters, [f, dir], lim), limit: (n) => q(filters, ord, n),
        count: () => ({ get: async () => ({ data: () => ({ count: run().length }) }) }), add: async (d) => { (ADM.audit = ADM.audit || []).push(d); } };
    };
    return q();
  },
  runTransaction: async (fn) => fn({ get: (r) => r.get(), set: (r, d, o) => r.set(d, o) }),
};
