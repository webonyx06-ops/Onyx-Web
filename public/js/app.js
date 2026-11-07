(() => {
"use strict";
const BASE_EMB = Object.fromEntries(["onyx","orion","nexus","zenith","vortex","zyriax","kyrox"].map(k => [k, `assets/emblemas/${k}.webp`]));
const EMB = {...BASE_EMB};
const FB_CONFIG = window.FIREBASE_CONFIG || {};
const FB_READY = !!(FB_CONFIG.apiKey && FB_CONFIG.projectId && window.firebase);
const STAFF_DOMAIN = window.LIGA_STAFF_DOMAIN || "staff.ligat1.app";

/* ================= constantes ================= */
const DEF_TEAMS = [
  {k:"onyx",   n:"ONYX",   c:"#7a8ce8", l:"#d6ccff"},
  {k:"orion",  n:"ORION",  c:"#2f7dff", l:"#9cc9ff"},
  {k:"nexus",  n:"NEXUS",  c:"#ff6a1a", l:"#ffd27a"},
  {k:"zenith", n:"ZENITH", c:"#ff3fa4", l:"#ffb3da"},
  {k:"vortex", n:"VORTEX", c:"#22a8ff", l:"#b9efff"},
  {k:"zyriax", n:"ZYRIAX", c:"#1ccf52", l:"#b5ffc8"},
  {k:"kyrox",  n:"KYROX",  c:"#3a5bff", l:"#b3c2ff"},
];
const DEF_KEYS = DEF_TEAMS.map(t => t.k);
// Lista de equipos en uso: los 7 de base (salvo los quitados) más los que agrega el ultra staff. Se actualiza sola.
const TEAM_KEYS = [...DEF_KEYS];
const MAPS_DEF = ["Ascent","Bind","Haven","Split","Icebox","Breeze","Fracture","Pearl","Lotus","Sunset","Abyss","Corrode"];
const MAP_COLORS = {Ascent:"#c9a46b",Bind:"#d9823b",Haven:"#7fa35a",Split:"#d9508f",Icebox:"#5fc4ef",Breeze:"#1fb5a8",Fracture:"#e8682e",Pearl:"#2a6fdb",Lotus:"#a77cf2",Sunset:"#f26b5b",Abyss:"#5b3fd1",Corrode:"#b8572e"};
function mapColor(n) { if (MAP_COLORS[n]) return MAP_COLORS[n]; let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 60% 45%)`; }
const ROLES = ["Duelista","Iniciador","Controlador","Centinela","Flex","Suplente"];
const DEF_RULES = [
  ["Respeto", "Sin insultos, discriminación ni acoso, en la partida, en el chat de voz y en el Discord. Primera vez: advertencia."],
  ["Puntualidad", "Tolerancia de 15 minutos. Pasado ese tiempo, el equipo que no está completo pierde 0-13 por W.O. y resta 1 punto."],
  ["Cuentas", "Cada jugador usa su cuenta registrada. Prohibido el smurf y compartir cuenta: es muy grave."],
  ["Bugs y exploits", "Prohibido usar bugs conocidos. Si pasa sin querer, se avisa y los capitanes acuerdan repetir la ronda."],
  ["Desconexiones", "Cada equipo tiene una pausa técnica de 10 minutos por partido. Si no vuelve, se juega 4 vs 5 o entra el suplente."],
  ["Resultados", "El capitán ganador sube la captura del marcador en 2 h. Si no coincide, se revisa con las capturas de los dos equipos."],
];
const DEF_CONFIG = {
  season: "Temporada 1", game: "Valorant", points: {w: 3, otw: 2, otl: 1, l: 0}, noShow: -1, playoff: 4,
  maps: MAPS_DEF.map(n => ({n, on: true})), nextDate: "", windowOpen: true, windowClose: "", windowId: 1,
  maxSign: 2, rosterMin: 5, rosterMax: 7, news: [], awards: {}, credited: [], rules: DEF_RULES.map(([t, d]) => ({t, d})),
  coin: {w: 300, otw: 200, otl: 100, mvp: 150, clean: 100},
};
const CAP_VAL_MIN = 100, CAP_VAL_MAX = 1500, CAP_CLAUSE_MAX = 3000;
const SKILLS = [["aim", "Puntería"], ["sense", "Lectura de juego"], ["comms", "Comunicación"], ["util", "Uso de utilidades"], ["attitude", "Actitud"]];
const ATT = {P: "Presente", T: "Tarde", A: "Ausente", J: "Justificado"};
const ATT_CYCLE = ["", "P", "T", "A", "J"];
const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const STATUS_REP = {recibida: "Recibida", revision: "En revisión", resuelta: "Resuelta", apelada: "Apelada", cerrada: "Cerrada"};

/* ================= utilidades ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = n => Math.round(+n || 0).toLocaleString("es-AR");
const dec = (n, d = 2) => (+n || 0).toFixed(d).replace(".", ",");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r50 = v => Math.round(v / 50) * 50;
const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem("liga-t1:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("liga-t1:" + k, JSON.stringify(v)); } catch (e) {} }
};
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function setPath(o, path, v) { const ks = path.split("."); let c = o; ks.slice(0, -1).forEach(k => { if (c[k] == null || typeof c[k] !== "object") c[k] = {}; c = c[k]; }); c[ks[ks.length - 1]] = v; }
function parseLocal(s) { if (!s) return null; const d = new Date(String(s).slice(0, 16) + ":00-03:00"); return isNaN(d) ? null : d; }
const DAYS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
function fmtDate(s, withTime = true) {
  const d = parseLocal(s); if (!d) return "a confirmar";
  const l = new Date(d.getTime() - 3 * 36e5);
  const dd = `${DAYS[l.getUTCDay()]} ${String(l.getUTCDate()).padStart(2, "0")}/${String(l.getUTCMonth() + 1).padStart(2, "0")}`;
  return withTime ? `${dd} ${String(l.getUTCHours()).padStart(2, "0")}:${String(l.getUTCMinutes()).padStart(2, "0")}` : dd;
}
function roundRobin(keys) {
  const a = [...keys, null], n = a.length, out = [];
  for (let r = 0; r < n - 1; r++) {
    const ms = []; let bye = null;
    for (let i = 0; i < n / 2; i++) { const x = a[i], y = a[n - 1 - i]; if (x === null) bye = y; else if (y === null) bye = x; else ms.push(r % 2 ? [y, x] : [x, y]); }
    out.push({ms, bye}); a.splice(1, 0, a.pop());
  }
  return out;
}

/* ================= estado ================= */
const S = {
  db: null, user: null, admin: false, write: null, uid: null, dbReady: false,
  remote: {config: null, teams: {}, players: {}, matches: {}, transfers: {}, offers: {}, reports: {}, draws: {}, live: null, perf: {}, logos: {}, prizes: {}, redeems: {}, mappicks: {}, mapclaims: {}, coaches: {}, salaries: {}, topups: {}, payroll: {}, seasons: {}, playoffs: {}, att: {}, motions: {}, pickagg: {}, pickboard: null, results: {}, ledger: {}},
  liveInit: false, exampleOn: false, my: store.get("my", "onyx"), picks: {},
  tblMode: "real", sort: null, open: null, teamSel: null,
  rk: {stat: "k", scope: "season", team: "all"}, mk: {cat: "all", role: "all", team: "all", sort: "v", q: ""},
  adm: {open: false, tab: "inicio", openMatch: null, pTeam: "all", dirty: false, newPw: null, auU: "all", auQ: "", rTeam: "all", rView: "att", rqAll: false, impRes: null, np: {name: "", desc: "", pts: "", usd: "", stock: "", img: ""}, nt: {name: "", c: "#8a3dff", l: "#d6ccff", logo: "", lTouched: false}},
  staff: null, staffList: {}, audit: [], fbUser: null,
  captain: null, captainList: {}, requests: {}, cap: {open: false, edit: null, dirty: false},
};
if (!TEAM_KEYS.includes(S.my)) S.my = "onyx";
let M = null, D = null;

/* ================= datos de ejemplo ================= */
let EXC = null;
function example() {
  const EK = DEF_KEYS.filter(k => TEAM_KEYS.includes(k));
  if (EXC) return EXC;
  const R = rng(1510);
  const ROSTER = {
    onyx: ["Vex","Nocturne","Shade","Rift","Karma","Hex"], orion: ["Polaris","Bellatrix","Nova","Rigel","Comet","Sirius"],
    nexus: ["Glitch","Byte","Cipher","Node","Pulse","Proxy"], zenith: ["Sakura","Lotus","Prism","Aura","Halo","Petal"],
    vortex: ["Cyclone","Drift","Tsunami","Gale","Frost","Monsoon"], zyriax: ["Wyrm","Fang","Scale","Talon","Jade","Ember"],
    kyrox: ["Abyss","Medusa","Tide","Sting","Coral","Reef"],
  };
  const CAPI = {onyx:1, orion:0, nexus:2, zenith:1, vortex:0, zyriax:0, kyrox:1}, SUBI = {onyx:0, orion:2, nexus:0, zenith:0, vortex:2, zyriax:1, kyrox:0};
  const FREE = [["Blitz","Duelista","Inmortal 2",1300],["Kairo","Iniciador","Inmortal 1",1200],["Zephyr","Controlador","Ascendente 3",1100],["Lynx","Centinela","Ascendente 2",1000],["Raven","Duelista","Ascendente 1",900],["Nimbus","Flex","Diamante 3",850]];
  const players = {}, skill = {}; let n = 0;
  const idOf = {};
  EK.forEach(k => ROSTER[k].forEach((nm, i) => { const id = "ex" + (n++); players[id] = {name: nm, team: k, role: ROLES[i], rank: "", value: null}; skill[id] = .84 + R() * .38 + (i === 0 ? .05 : 0); idOf[nm] = id; }));
  FREE.forEach(([nm, role, rank, v]) => { const id = "ex" + (n++); players[id] = {name: nm, team: null, role, rank, value: v}; skill[id] = .9; idOf[nm] = id; });
  const STR = {onyx:.62, orion:.6, zyriax:.57, kyrox:.53, vortex:.5, zenith:.46, nexus:.42};
  const DATES = ["2026-09-19T21:00","2026-09-26T21:00","2026-10-03T21:00","2026-10-10T21:00","2026-10-17T21:00","2026-10-24T21:00","2026-10-31T21:00"];
  const used = Object.fromEntries(EK.map(k => [k, []]));
  const matches = {}, teams = {};
  EK.forEach(k => teams[k] = {captain: idOf[ROSTER[k][CAPI[k]]], sub: idOf[ROSTER[k][SUBI[k]]]});
  const pts = Object.fromEntries(EK.map(k => [k, 0]));
  roundRobin(EK).forEach((fd, f) => fd.ms.forEach(([a, b], i) => {
    const m = {fecha: f + 1, a, b, date: DATES[f], status: "pending", ra: null, rb: null, ot: false, noShow: null, map: null, proj: null, mvp: null, stats: {}};
    if (f < 4) {
      const aw = R() < STR[a] / (STR[a] + STR[b]), ot = R() < .22;
      let w = 13, l = Math.floor(3 + R() * 9); if (ot) { w = R() < .4 ? 15 : 14; l = w - 2; }
      Object.assign(m, {status: "played", ra: aw ? w : l, rb: aw ? l : w, ot});
      pts[a] += aw ? (ot ? 2 : 3) : (ot ? 1 : 0); pts[b] += aw ? (ot ? 1 : 0) : (ot ? 2 : 3);
      const Rr = m.ra + m.rb;
      [a, b].forEach(tk => {
        const won = (tk === a) === aw;
        const ro = Object.keys(players).filter(id => players[id].team === tk);
        let lineup = ro.filter(id => players[id].role !== "Suplente");
        const sub = ro.find(id => players[id].role === "Suplente");
        if (sub && R() < .28) { const cand = lineup.filter(id => id !== teams[tk].captain); const out = cand[Math.floor(R() * cand.length)]; lineup = lineup.filter(x => x !== out).concat(sub); }
        lineup.forEach(id => {
          const role = players[id].role, sk = skill[id];
          const rm = {Duelista:1.2, Iniciador:.98, Controlador:.9, Centinela:.95, Flex:1.02, Suplente:.96}[role];
          const am = {Duelista:.8, Iniciador:1.5, Controlador:1.3, Centinela:1, Flex:1.05, Suplente:1}[role];
          const k = Math.max(2, Math.round(Rr * .66 * sk * rm * (won ? 1.1 : .9) * (.78 + R() * .44)));
          const d = Math.max(3, Math.round(Rr * .64 * (won ? .86 : 1.12) * (.8 + R() * .4) / Math.sqrt(sk)));
          const as = Math.round(Rr * .2 * am * (.6 + R() * .8));
          m.stats[id] = {t: tk, k, d, a: as, acs: Math.round((k * 150 + as * 42) / Rr + 38 + R() * 28)};
        });
      });
      const pool = MAPS_DEF.filter(x => !used[a].includes(x) && !used[b].includes(x));
      m.map = pool[Math.floor(R() * pool.length)]; used[a].push(m.map); used[b].push(m.map);
    }
    matches[`f${f + 1}m${i}`] = m;
  }));
  const order = [...EK].sort((x, y) => pts[y] - pts[x]);
  EK.forEach(k => { teams[k].coins = 5000 + order.indexOf(k) * 500 + pts[k] * 100 + 200; teams[k].used = used[k]; teams[k].fp = {onyx:100, orion:95, nexus:85, zenith:100, vortex:90, zyriax:100, kyrox:95}[k]; });
  const transfers = [
    {id: "ext1", pid: idOf.Ember, name: "Ember", from: null, to: "zyriax", amt: 700, at: Date.parse("2026-09-12T20:00:00-03:00"), win: 0},
    {id: "ext2", pid: idOf.Monsoon, name: "Monsoon", from: null, to: "vortex", amt: 850, at: Date.parse("2026-09-13T20:00:00-03:00"), win: 0},
    {id: "ext3", pid: idOf.Hex, name: "Hex", from: "kyrox", to: "onyx", amt: 1300, at: Date.parse("2026-09-14T20:00:00-03:00"), win: 0},
  ];
  EXC = {players, matches, teams, transfers, nextDate: DATES[4], windowClose: "2026-10-16T21:00"};
  return EXC;
}

/* ================= modelo ================= */
function mergeCfg(c) {
  const cfg = Object.assign({}, clone(DEF_CONFIG), clone(c) || {});
  cfg.points = Object.assign({}, DEF_CONFIG.points, (c && c.points) || {});
  cfg.coin = Object.assign({}, DEF_CONFIG.coin, (c && c.coin) || {});
  cfg.coach = Object.assign({salary: 150, usd: 5, refill: 6000}, (c && c.coach) || {});
  if (!Array.isArray(cfg.maps) || !cfg.maps.length) cfg.maps = clone(DEF_CONFIG.maps);
  if (!Array.isArray(cfg.rules)) cfg.rules = clone(DEF_CONFIG.rules);
  if (!Array.isArray(cfg.news)) cfg.news = [];
  if (!Array.isArray(cfg.credited)) cfg.credited = [];
  cfg.awards = cfg.awards || {};
  return cfg;
}
const ADJ0 = {pts: 0, rf: 0, rc: 0, g: 0, gp: 0, pp: 0, p: 0, kills: 0, ast: 0, form: []};
const teamDef = k => DEF_TEAMS.find(t => t.k === k) || {k, n: String(k).toUpperCase(), c: "#8a3dff", l: "#d6ccff"};
const teamName = k => (S.remote.teams[k] && S.remote.teams[k].name) || teamDef(k).n;
// Logo con iniciales para equipos nuevos que todavía no tienen imagen
function initialsLogo(name, c) {
  const words = String(name || "?").normalize("NFKD").replace(/[^A-Za-z0-9 ]/g, "").trim().split(/\s+/).filter(Boolean);
  const ini = ((words.length > 1 ? words.map(w => w[0]).join("") : (words[0] || "?").slice(0, 2)).toUpperCase()).slice(0, 3);
  const col = /^#[0-9a-f]{6}$/i.test(c || "") ? c : "#8a3dff";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="#0b0912"/></linearGradient></defs><path d="M50 4 92 27v46L50 96 8 73V27z" fill="url(#g)" stroke="${col}" stroke-width="3"/><text x="50" y="${ini.length > 2 ? 60 : 63}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${ini.length > 2 ? 26 : 34}" fill="#fff">${ini}</text></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function syncTeams() {
  const T = S.remote.teams || {}, Lg = S.remote.logos || {};
  const custom = Object.keys(T).filter(k => !DEF_KEYS.includes(k) && /^[a-z0-9]{2,20}$/.test(k) && T[k] && T[k].custom && !T[k].hidden)
    .sort((a, b) => (+T[a].order || 0) - (+T[b].order || 0) || a.localeCompare(b));
  const keys = [...DEF_KEYS.filter(k => !(T[k] && T[k].hidden)), ...custom];
  keys.forEach(k => { const d = T[k] || {}; EMB[k] = (Lg[k] && Lg[k].data) || BASE_EMB[k] || initialsLogo(d.name || k, d.c); });
  if (keys.join() !== TEAM_KEYS.join()) { TEAM_KEYS.length = 0; TEAM_KEYS.push(...keys); onTeamsChanged(); }
  else if (typeof renderOrbit === "function") renderOrbit(); // el logo llega después del equipo, o cambió el nombre o el color
}
function fillMkTeams() {
  const mk = $("#mkTeam"); if (!mk) return; const v = mk.value || "all";
  mk.innerHTML = '<option value="all">Todos</option><option value="free">Agentes libres</option>' + TEAM_KEYS.map(k => `<option value="${k}">${esc(teamName(k))}</option>`).join("");
  mk.value = [...mk.options].some(o => o.value === v) ? v : "all"; S.mk.team = mk.value;
}
function onTeamsChanged() {
  fillMkTeams(); if (typeof renderOrbit === "function") renderOrbit();
  const saved = store.get("my", null); if (!capTeam() && saved && TEAM_KEYS.includes(saved)) S.my = saved;
  if (!TEAM_KEYS.includes(S.my)) S.my = TEAM_KEYS[0];
  if (S.teamSel && !TEAM_KEYS.includes(S.teamSel)) S.teamSel = null;
}
function model(forceReal) {
  const r = S.remote;
  let cfg = mergeCfg(r.config);
  const realEmpty = !Object.keys(r.players).length && !Object.values(r.matches).some(m => m.status === "played") && !Object.keys(r.draws).length && !Object.keys(r.transfers).length;
  const ex = !forceReal && realEmpty && S.exampleOn;
  const teams = {};
  TEAM_KEYS.forEach((k, i) => { const t = teamDef(k), d = r.teams[k] || {};
    teams[k] = {k, name: d.name || t.n, c: d.c || t.c, l: d.l || t.l, order: d.order ?? i, captain: d.captain ?? null, sub: d.sub ?? null, custom: !!d.custom, logo: !!(r.logos[k] && r.logos[k].data), logoAt: d.logoAt || 0,
      coins: d.coins ?? 6000, fp: d.fp ?? 100, usedOwn: [...(d.used || [])], picked: Object.assign({}, d.picked || {}),
      used: [...new Set([...(d.used || []), ...Object.values(d.picked || {}).filter(x => typeof x === "string")])], adj: Object.assign({}, ADJ0, d.adj || {}, {form: Array.isArray((d.adj || {}).form) ? d.adj.form.slice(0, 5) : []})}; });
  let players = r.players, matches = r.matches, transfers = Object.entries(r.transfers).map(([id, t]) => ({id, ...t}));
  if (ex) { const E = example(); players = E.players; matches = E.matches; transfers = E.transfers; TEAM_KEYS.forEach(k => Object.assign(teams[k], clone(E.teams[k]))); cfg = Object.assign(cfg, {nextDate: E.nextDate, windowClose: E.windowClose}); }
  return {cfg, teams, players, matches, transfers, ex, realEmpty};
}
const TM = k => (M && M.teams[k]) || {k, name: k ? k.toUpperCase() : "LIBRE", c: "#8f8aa6", l: "#d0cce0"};
const img = (k, cls = "") => EMB[k] ? `<img src="${EMB[k]}" alt="${esc(TM(k).name)}" class="${cls}" loading="lazy" decoding="async">` : `<span class="ava" style="--tc:#5b5675;width:28px;height:32px;font-size:10px">AL</span>`;

function ptsOf(m) {
  const P = M.cfg.points;
  if (m.noShow === "a") return [P.l + M.cfg.noShow, P.w];
  if (m.noShow === "b") return [P.w, P.l + M.cfg.noShow];
  const aw = +m.ra > +m.rb;
  if (m.ot) return aw ? [P.otw, P.otl] : [P.otl, P.otw];
  return aw ? [P.w, P.l] : [P.l, P.w];
}
function agg(log, f) {
  const L = f ? log.filter(e => e.f === f) : log;
  const s = {m: L.length, k: 0, d: 0, a: 0, acs: 0, w: 0, r: 0};
  L.forEach(e => { s.k += e.k; s.d += e.d; s.a += e.a; s.acs += e.acs; s.w += e.won ? 1 : 0; s.r += e.rounds; });
  s.acs = s.m ? Math.round(s.acs / s.m) : 0; s.kd = s.d ? s.k / s.d : s.k;
  return s;
}
// Valor inicial según el rango de Valorant (escala de la liga: 100 a 1.500).
const RANK_VALUES = [["radiant", 1500], ["radiante", 1500], ["inmortal 3", 1400], ["inmortal 2", 1300], ["inmortal 1", 1200], ["inmortal", 1250],
  ["ascendente 3", 1100], ["ascendente 2", 1000], ["ascendente 1", 900], ["ascendente", 1000], ["diamante 3", 850], ["diamante 2", 800], ["diamante 1", 750], ["diamante", 800],
  ["platino 3", 700], ["platino 2", 650], ["platino 1", 600], ["platino", 650], ["oro", 450], ["plata", 300], ["bronce", 200], ["hierro", 100]];
function rankValue(rank) {
  const r = String(rank || "").toLowerCase();
  for (const [t, v] of RANK_VALUES) if (r.includes(t)) return v;
  return 500;
}
// Ida y vuelta: en una fecha, los dos partidos entre los mismos equipos. Usa el campo leg si está cargado; si no, el orden (día y hora).
const LEG_L = {ida: "Ida", vuelta: "Vuelta"};
const legRank = m => m.leg === "ida" ? 0 : m.leg === "vuelta" ? 2 : 1;
function tagLegs(ms) {
  const g = {};
  ms.forEach(m => { const key = `${m.fecha}|${[m.a, m.b].sort().join("~")}`; (g[key] = g[key] || []).push(m); });
  Object.values(g).forEach(arr => {
    arr.sort((x, y) => legRank(x) - legRank(y) || String(x.date || "").localeCompare(String(y.date || "")) || x.id.localeCompare(y.id));
    arr.forEach((m, i) => { m.legN = i + 1; m.legs = arr.length; m.leg = arr.length === 2 ? (i ? "vuelta" : "ida") : ""; });
  });
}
const legName = m => m.leg ? LEG_L[m.leg] : m.legs > 1 ? `Partida ${m.legN}` : "Partido";
const legTag = m => m.leg ? ` · ${LEG_L[m.leg]}` : "";
// Ordena una fecha por cruce: la ida y la vuelta de cada cruce quedan juntas
function byCruce(list) {
  const ck = m => [m.a, m.b].sort().join("~"), first = {};
  list.forEach((m, i) => { if (!(ck(m) in first)) first[ck(m)] = i; });
  return [...list].sort((x, y) => first[ck(x)] - first[ck(y)] || (x.legN || 0) - (y.legN || 0));
}
function derive() {
  const ms = Object.entries(M.matches).map(([id, m]) => ({...m, id, fecha: +m.fecha || 1}));
  ms.sort((x, y) => x.fecha - y.fecha || String(x.date || "").localeCompare(String(y.date || "")) || x.id.localeCompare(y.id));
  tagLegs(ms);
  const okT = k => !!(k && M.teams[k]);
  const played = ms.filter(m => m.status === "played" && okT(m.a) && okT(m.b) && m.a !== m.b);
  const pending = ms.filter(m => m.status !== "played" && okT(m.a) && okT(m.b) && m.a !== m.b);
  const logs = {}; const TK = Object.fromEntries(TEAM_KEYS.map(k => [k, {k: 0, d: 0, a: 0}]));
  played.forEach(m => {
    const Rr = (+m.ra || 0) + (+m.rb || 0); let best = null;
    Object.entries(m.stats || {}).forEach(([pid, s]) => {
      const t = s.t || (M.players[pid] && M.players[pid].team); if (t !== m.a && t !== m.b) return;
      const won = t === m.a ? +m.ra > +m.rb : +m.rb > +m.ra;
      const e = {mid: m.id, f: m.fecha, lg: m.leg ? LEG_L[m.leg] : "", n: m.legN || 0, team: t, vs: t === m.a ? m.b : m.a, won, k: +s.k || 0, d: +s.d || 0, a: +s.a || 0, acs: +s.acs || 0, rounds: Rr, score: t === m.a ? `${m.ra}-${m.rb}` : `${m.rb}-${m.ra}`};
      (logs[pid] = logs[pid] || []).push(e); TK[t].k += e.k; TK[t].d += e.d; TK[t].a += e.a;
      if (M.players[pid] && (!best || e.acs > best.acs)) best = {id: pid, acs: e.acs};
    });
    m.mvpId = (m.mvp && m.stats && m.stats[m.mvp]) ? m.mvp : best ? best.id : null;
  });
  const lastF = played.length ? Math.max(...played.map(m => m.fecha)) : 0;
  const fechas = ms.length ? Math.max(...ms.map(m => m.fecha)) : 0;
  const nextF = pending.length ? Math.min(...pending.map(m => m.fecha)) : null;
  const P = Object.entries(M.players).map(([id, p]) => {
    const log = (logs[id] || []).sort((a, b) => a.f - b.f || a.n - b.n);
    return {id, name: p.name || "Sin nombre", team: p.team || null, role: ROLES.includes(p.role) ? p.role : "Flex", rank: p.rank || "", clause: clamp(+p.clause || 0, 0, CAP_CLAUSE_MAX), vOverride: (p.value === 0 || p.value) ? +p.value : null, log, s: agg(log), lastTeam: p.team || (log.length ? log[log.length - 1].team : null)};
  });
  const withLog = P.filter(p => p.s.m);
  withLog.forEach(p => p.perf = p.s.acs * .6 + p.s.kd * 90 + (p.s.k / p.s.m) * 4 + p.s.m * 6);
  const sorted = [...withLog].sort((a, b) => a.perf - b.perf);
  sorted.forEach((p, i) => { const q = sorted.length > 1 ? i / (sorted.length - 1) : .5; p.auto = r50(300 + Math.pow(q, 1.6) * 1200); });
  P.forEach(p => { if (p.auto == null) p.auto = rankValue(p.rank); p.value = clamp(p.vOverride != null ? p.vOverride : p.auto, CAP_VAL_MIN, CAP_VAL_MAX); });
  const PM = Object.fromEntries(P.map(p => [p.id, p]));
  D = {ms, played, pending, logs, TK, lastF, fechas, nextF, P, PM};
  D.real = standings(played);
  return D;
}
// Desempate con los mismos puntos: lo principal son las rondas ganadas. [campo, 1 = más es mejor / -1 = menos es mejor, etiqueta]
const TIEBREAK = [["rf", 1, "Rondas ganadas"], ["rc", -1, "Rondas perdidas"], ["kills", 1, "Kills"], ["ast", 1, "Asistencias"], ["h2h", 1, "Directo"], ["kd", 1, "K/D"]];
// noAdj = true: solo lo que sale de los partidos (lo usa el editor de la tabla).
function standings(results, noAdj) {
  const rows = {}, PT = M.cfg.points;
  TEAM_KEYS.forEach(k => { const a = noAdj ? ADJ0 : M.teams[k].adj, n = f => Math.round(+a[f] || 0), tk = D.TK[k] || {k: 0, d: 0, a: 0};
    rows[k] = {k, pj: n("g") + n("gp") + n("pp") + n("p"), g: n("g"), gp: n("gp"), pp: n("pp"), p: n("p"), rf: n("rf"), rc: n("rc"), kills: (tk.k || 0) + n("kills"), ast: (tk.a || 0) + n("ast"),
      pts: n("pts") + n("g") * PT.w + n("gp") * PT.otw + n("pp") * PT.otl + n("p") * PT.l,
      form: (a.form || []).filter(c => ["W", "w", "l", "L"].includes(c)).map(c => ({c, manual: true})), kd: tk.d ? tk.k / tk.d : 1, h2h: 0, tie: null}; });
  results.forEach(m => {
    const [pa, pb] = ptsOf(m), P = M.cfg.points;
    [[m.a, +m.ra || 0, +m.rb || 0, pa, m.noShow === "a"], [m.b, +m.rb || 0, +m.ra || 0, pb, m.noShow === "b"]].forEach(([k, f, c, pt, ns]) => {
      const r = rows[k]; if (!r) return; r.pj++; r.rf += f; r.rc += c; r.pts += pt;
      const won = f > c, code = won ? (m.ot ? "w" : "W") : (m.ot ? "l" : "L");
      r.form.push({c: code, proj: !!m.proj});
      if (code === "W") r.g++; else if (code === "w") r.gp++; else if (code === "l") r.pp++; else r.p++;
    });
  });
  const arr = Object.values(rows); arr.forEach(r => r.dif = r.rf - r.rc);
  arr.sort((x, y) => y.pts - x.pts);
  const out = [];
  for (let i = 0; i < arr.length;) {
    let j = i; while (j < arr.length && arr[j].pts === arr[i].pts) j++;
    const g = arr.slice(i, j);
    if (g.length > 1) {
      const ks = new Set(g.map(r => r.k));
      results.forEach(m => { if (ks.has(m.a) && ks.has(m.b)) { const [pa, pb] = ptsOf(m); rows[m.a].h2h += pa; rows[m.b].h2h += pb; } });
      g.sort((x, y) => { for (const [f, dir] of TIEBREAK) { const d = (y[f] - x[f]) * dir; if (d) return d; } return M.teams[x.k].order - M.teams[y.k].order; });
      g.forEach((r, q) => { const o = g[q + 1] || g[q - 1], c = TIEBREAK.find(([f]) => r[f] !== o[f]); r.tie = c ? c[2] : null; });
    }
    out.push(...g); i = j;
  }
  out.forEach((r, i) => r.pos = i + 1);
  return out;
}
function projResults() {
  const extra = [];
  D.pending.forEach(m => {
    const pk = S.picks[m.id] || m.proj; if (!pk) return;
    const map = {A: [13, 8, false], a: [14, 12, true], b: [12, 14, true], B: [8, 13, false]}[pk]; if (!map) return;
    extra.push({...m, ra: map[0], rb: map[1], ot: map[2], noShow: null, proj: true});
  });
  return D.played.concat(extra);
}
const roster = k => D.P.filter(p => p.team === k);
// Categorías en la escala 100–1.500
const catOf = v => v >= 1200 ? "S" : v >= 900 ? "A" : v >= 600 ? "B" : "C";

/* ================= guardado ================= */
const queues = {}; let pendingWrites = 0, lastErr = null;
function setSaveState() {
  const el = $("#saveState"); if (!el) return;
  el.className = "save-state " + (lastErr ? "err" : pendingWrites ? "" : "ok");
  el.textContent = lastErr ? lastErr : pendingWrites ? "Guardando…" : "Todo guardado";
}
function errText(e) {
  const c = e && e.code;
  if (c === "invalid_argument" || c === "invalid-argument") return "No se pudo guardar: el dato no es válido.";
  if (c === "permission-denied") return "No tenés permiso para este cambio (tu rol no lo permite o se cerró la sesión).";
  if (c === "quota_exceeded") return "La base de datos llegó a su límite. Borrá datos viejos.";
  if (c === "resource_exhausted") return "Demasiados cambios seguidos. Esperá unos segundos.";
  if (c === "no_db") return "Sin conexión con la base de datos de la liga. Revisá js/firebase-config.js.";
  return "No se pudo guardar. Probá de nuevo.";
}
function save(path, data, op = "set") {
  if (!S.db) { lastErr = errText({code: "no_db"}); setSaveState(); return Promise.reject({code: "no_db"}); }
  const run = async () => {
    pendingWrites++; lastErr = null; setSaveState();
    const call = () => { const ref = S.db.doc(path); return op === "del" ? ref.delete() : op === "update" ? ref.update(data) : ref.set(data); };
    try { await call(); }
    catch (e) {
      if (e && e.code === "unavailable") { await sleep(300 + Math.random() * 600); try { await call(); } catch (e2) { lastErr = errText(e2); throw e2; } }
      else { lastErr = errText(e); throw e; }
    } finally { pendingWrites--; setSaveState(); }
    queuePub(path);
  };
  const p = (queues[path] || Promise.resolve()).catch(() => {}).then(run);
  queues[path] = p;
  p.catch(e => toast(errText(e)));
  return p;
}
const RM = () => model(true);
function cfgDoc() { return clone(mergeCfg(S.remote.config)); }
function teamDoc(k) { const t = clone(RM().teams[k]); delete t.k; delete t.logo; t.used = t.usedOwn || []; delete t.usedOwn; return t; }
function matchDoc(id) { return clone(S.remote.matches[id]) || null; }
function playerDoc(id) { return clone(S.remote.players[id]) || null; }

/* ================= Firebase ================= */
let AUTH = null, FDB = null;
const subs = {staff: [], mine: []};
function unsub(group) { subs[group].forEach(f => { try { f(); } catch (e) {} }); subs[group] = []; }
function initFirebase() {
  if (!FB_READY) { S.dbReady = true; schedule(); return; }
  try { if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG); FDB = firebase.firestore(); AUTH = firebase.auth(); }
  catch (e) { console.error(e); S.dbReady = true; schedule(); return; }
  S.db = FDB;
  const err = e => { if (e && e.code !== "unavailable") console.warn("firestore", e.code || e); };
  FDB.doc("live/draw").onSnapshot(s => {
    const d = s.exists ? s.data() : null, prev = S.remote.live; S.remote.live = d;
    if (S.liveInit && d && (!prev || d.seq !== prev.seq)) onLiveDraw(d);
    S.liveInit = true; schedule();
  }, err);
  AUTH.onAuthStateChanged(user => {
    S.fbUser = user; S.uid = user ? user.uid : null;
    // Staff y capitanes escuchan cada colección (ven todo al instante); los visitantes y jugadores leen el resumen público.
    if (user && !user.isAnonymous && !isMemberUid(user.uid)) startFull(); else startSnap();
    if (pubQ.size || pubPending().length) flushPub();
    onMemberAuth(user);
    unsub("staff"); unsub("mine"); S.staff = null; S.admin = false; S.staffList = {}; S.audit = []; S.captain = null; S.captainList = {}; S.requests = {}; S.remote.offers = {}; S.remote.mappicks = {}; S.remote.mapclaims = {}; S.remote.results = {}; S.remote.ledger = {}; S.membersList = {};
    if (user && !user.isAnonymous && !isMemberUid(user.uid)) {
      let sDoc, cDoc;
      const decide = () => {
        if (sDoc === undefined || cDoc === undefined) return;
        if (sDoc && sDoc.active !== false) {
          if (S.captain) { S.captain = null; unsubCap(); S.cap.open = false; renderCap(); }
          const first = !S.staff, wasUltra = isUltra();
          S.staff = {uid: user.uid, u: sDoc.u, role: sDoc.role === "ultra" ? "ultra" : "staff"}; S.admin = true;
          if (first || wasUltra !== isUltra()) { unsubExtra(); startStaffSubs(); }
        } else if (cDoc && cDoc.active !== false) {
          if (S.staff) { S.staff = null; S.admin = false; unsubExtra(); S.adm.open = false; renderAdmin(); }
          const prevTeam = S.captain ? S.captain.team : undefined;
          S.captain = {uid: user.uid, u: cDoc.u, team: cDoc.team || null};
          if (prevTeam !== S.captain.team) startCapSubs();
        } else {
          if (S.staff || S.captain) toast("Tu cuenta no está activa. Hablá con un ultra staff.");
          S.staff = null; S.captain = null; S.admin = false; AUTH.signOut(); return;
        }
        if (S.adm.open) renderAdmin(); if (S.cap.open) renderCap(); schedule();
      };
      subs.staff.push(FDB.doc(`staff/${user.uid}`).onSnapshot(sn => { sDoc = sn.exists ? sn.data() : null; decide(); }, () => { sDoc = null; decide(); }));
      subs.staff.push(FDB.doc(`captains/${user.uid}`).onSnapshot(sn => { cDoc = sn.exists ? sn.data() : null; decide(); }, () => { cDoc = null; decide(); }));
      subs.staff.push(unsubCap);
    } else if (user && !isMemberUid(user.uid)) {
      subs.mine.push(FDB.doc(`reports/${user.uid}`).onSnapshot(sn => { S.remote.reports = sn.exists ? {[user.uid]: sn.data()} : {}; schedule(); }, () => {}));
    } else { S.remote.reports = {}; }
    if (!S.staff) { S.adm.open = false; renderAdmin(); if (ST.open && ST.admin) closeStream(); }
    if (!S.captain) { S.cap.open = false; renderCap(); }
    schedule();
  });
  S.dbReady = true; schedule();
}
/* ---------- lectura de la liga: colecciones (staff y capitanes) o resumen público (visitantes) ---------- */
// Cada visita lee 1 documento (public/meta) y baja el resumen por /api/snapshot con la caché de Netlify.
// Si el resumen todavía no existe (primera vez) o no se puede leer, se usan las colecciones como siempre.
const PUB_COLLS = ["teams", "logos", "players", "matches", "transfers", "draws", "perf", "prizes", "redeems", "coaches", "salaries", "seasons", "playoffs", "att", "motions"];
const PUB_DOCS = {"league/config": "config", "public/pickagg": "pickagg", "public/pickboard": "pickboard"};
const isMemberUid = uid => /^(d_\d+|e_[a-f0-9]{24})$/.test(String(uid || ""));
let pubMode = null, pubSubs = [], snapRev = 0, snapTok = 0;
function stopPub() { pubSubs.splice(0).forEach(f => { try { f(); } catch (e) {} }); }
function startFull() {
  if (pubMode === "full") return; stopPub(); pubMode = "full";
  const err = e => { if (e && e.code !== "unavailable") console.warn("firestore", e.code || e); };
  pubSubs.push(FDB.doc("league/config").onSnapshot(s => { S.remote.config = s.exists ? s.data() : null; schedule(); }, err));
  PUB_COLLS.forEach(c => pubSubs.push(FDB.collection(c).onSnapshot(s => { S.remote[c] = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); if (c === "teams" || c === "logos") syncTeams(); schedule(); }, err)));
  pubSubs.push(FDB.doc("public/pickagg").onSnapshot(s => { S.remote.pickagg = s.exists ? s.data() : {}; schedule(); }, () => {}));
  pubSubs.push(FDB.doc("public/pickboard").onSnapshot(s => { S.remote.pickboard = s.exists ? s.data() : null; schedule(); }, () => {}));
}
function startSnap() {
  if (pubMode === "snap") return; stopPub(); pubMode = "snap";
  pubSubs.push(FDB.doc("public/meta").onSnapshot(s => {
    if (!s.exists || !s.data().rev) { startFull(); return; } // todavía no hay resumen
    snapWant = s.data().rev; snapWhenVisible();
  }, () => startFull()));
}
// Si llegan varios cambios seguidos (el staff cargando una fecha), se baja una sola vez al final; con la pestaña oculta, espera
let snapWant = 0, snapT = 0;
function snapWhenVisible() {
  if (!snapWant || snapWant === snapRev || pubMode !== "snap") return;
  clearTimeout(snapT);
  if (document.visibilityState === "hidden" && snapRev) return;
  snapT = setTimeout(() => { if (snapWant !== snapRev) loadSnap(snapWant); }, snapRev ? 2500 : 0);
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") snapWhenVisible(); });
async function loadSnap(rev) {
  const tok = ++snapTok; let txt = null;
  try { const r = await fetch(`/api/snapshot?rev=${rev}`); if (r.ok && /json/.test(r.headers.get("content-type") || "")) txt = await r.text(); } catch (e) {}
  if (!txt) { try { const d = await FDB.doc("public/snapshot").get(); if (d.exists) txt = d.data().json; } catch (e) {} }
  if (tok !== snapTok || pubMode !== "snap") return;
  if (!txt) { startFull(); return; }
  let d = null; try { d = JSON.parse(txt); } catch (e) {}
  if (!applySnap(d)) { startFull(); return; }
  try { if (txt.length < 3e6) localStorage.setItem("liga-t1:snap", txt); } catch (e) {}
}
function applySnap(d) {
  if (!d || d.v !== 1) return false;
  snapRev = d.rev || 0;
  S.remote.config = d.config && Object.keys(d.config).length ? d.config : null;
  PUB_COLLS.forEach(c => { S.remote[c] = d[c] || {}; });
  S.remote.pickagg = d.pickagg || {}; S.remote.pickboard = d.pickboard || null;
  syncTeams(); schedule();
  return true;
}
// Primera pintada al instante con lo último que se vio (después se actualiza solo)
function paintCached() {
  if (!FB_READY) return;
  let txt = null; try { txt = localStorage.getItem("liga-t1:snap"); } catch (e) {}
  if (!txt) return;
  try { const d = JSON.parse(txt); if (applySnap(d)) snapRev = 0; } catch (e) {}
}
// Aviso de cambios: después de guardar algo público, se le pide al servidor que actualice el resumen.
// Si el servidor no responde, queda anotado en pubqueue/main y lo procesa la revisión de cada 10 minutos.
const pubQ = new Set(); let pubT = 0;
const pubPending = () => store.get("pubq", []);
function queuePub(path) {
  const c = path.split("/")[0];
  if (!(PUB_COLLS.includes(c) || PUB_DOCS[path])) return;
  pubQ.add(path); store.set("pubq", [...new Set([...pubPending(), path])].slice(-300));
  clearTimeout(pubT); pubT = setTimeout(flushPub, 1200);
}
async function flushPub(keep) {
  clearTimeout(pubT);
  const paths = [...new Set([...pubQ, ...pubPending()])];
  const u = AUTH && AUTH.currentUser;
  if (!paths.length || !u || u.isAnonymous || isMemberUid(u.uid)) return;
  pubQ.clear();
  try {
    const tok = await u.getIdToken();
    const r = await fetch("/api/publish", {method: "POST", keepalive: !!keep, headers: {"content-type": "application/json", authorization: "Bearer " + tok}, body: JSON.stringify({paths})});
    if (!r.ok) throw new Error("publish " + r.status);
    store.set("pubq", pubPending().filter(p => !paths.includes(p)));
  } catch (e) {
    try { await FDB.doc("pubqueue/main").set({paths: firebase.firestore.FieldValue.arrayUnion(...paths), at: Date.now()}, {merge: true}); store.set("pubq", pubPending().filter(p => !paths.includes(p))); } catch (e2) {}
  }
}
addEventListener("pagehide", () => { if (pubQ.size) flushPub(true); });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && pubQ.size) flushPub(true); });
async function pubFull() {
  const u = AUTH && AUTH.currentUser; if (!u) return null;
  const r = await fetch("/api/publish", {method: "POST", headers: {"content-type": "application/json", authorization: "Bearer " + await u.getIdToken()}, body: JSON.stringify({full: true})});
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "El servidor no respondió."); return j;
}
// Llamada genérica a una función del servidor con la sesión actual
async function api(path, body, method = "POST") {
  const u = AUTH && AUTH.currentUser; if (!u) throw new Error("Tu sesión se cerró. Volvé a entrar.");
  let r;
  try { r = await fetch(path, {method, headers: {"content-type": "application/json", authorization: "Bearer " + await u.getIdToken()}, body: method === "GET" ? undefined : JSON.stringify(body || {})}); }
  catch (e) { throw new Error("Sin conexión con el servidor. Probá de nuevo."); }
  const j = await r.json().catch(() => null);
  if (!r.ok) { const e = new Error((j && j.error) || (r.status === 404 ? "Esta función todavía no está publicada en Netlify." : "El servidor no respondió bien.")); e.status = r.status; e.body = j; throw e; }
  return j || {};
}

// Las ofertas del mercado solo las ven capitanes y staff.
function offersSub() { return FDB.collection("offers").onSnapshot(s => { S.remote.offers = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, e => console.warn("offers", e.code || e)); }
let extraSubs = [];
function unsubExtra() { extraSubs.forEach(f => { try { f(); } catch (e) {} }); extraSubs = []; }
function startStaffSubs() {
  const err = e => console.warn("firestore", e.code || e);
  extraSubs.push(offersSub());
  extraSubs.push(FDB.collection("mappicks").onSnapshot(s => { S.remote.mappicks = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, err));
  extraSubs.push(FDB.collection("mapclaims").onSnapshot(s => { S.remote.mapclaims = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, err));
  extraSubs.push(FDB.collection("reports").onSnapshot(s => { S.remote.reports = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, err));
  extraSubs.push(FDB.collection("requests").onSnapshot(s => { S.requests = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, err));
  extraSubs.push(FDB.collection("captains").onSnapshot(s => { S.captainList = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, err));
  extraSubs.push(FDB.collection("topups").onSnapshot(s => { S.remote.topups = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, err));
  extraSubs.push(FDB.collection("payroll").onSnapshot(s => { S.remote.payroll = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, err));
  extraSubs.push(FDB.collection("results").onSnapshot(s => { S.remote.results = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, err));
  extraSubs.push(FDB.collection("ledger").onSnapshot(s => { S.remote.ledger = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, err));
  extraSubs.push(FDB.collection("members").onSnapshot(s => { S.membersList = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); if (S.adm.open && S.adm.tab === "jugadores") renderAdminSoon(); }, err));
  if (isUltra()) {
    extraSubs.push(FDB.collection("staff").onSnapshot(s => { S.staffList = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); if (S.adm.open && S.adm.tab === "staff") renderAdminSoon(); }, err));
    extraSubs.push(FDB.collection("audit").orderBy("at", "desc").limit(400).onSnapshot(s => { S.audit = s.docs.map(d => ({id: d.id, ...d.data()})); if (S.adm.open && S.adm.tab === "staff") renderAuditList(); }, err));
  }
  subs.staff.push(unsubExtra);
}
let capSubs = [];
function unsubCap() { capSubs.forEach(f => { try { f(); } catch (e) {} }); capSubs = []; if (!S.staff) { S.remote.offers = {}; S.remote.mappicks = {}; S.remote.mapclaims = {}; S.remote.results = {}; } }
function startCapSubs() {
  unsubCap(); S.requests = {};
  if (S.captain) capSubs.push(offersSub());
  if (!S.captain || !S.captain.team) { schedule(); return; }
  capSubs.push(FDB.collection("mapclaims").onSnapshot(s => { S.remote.mapclaims = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, e => console.warn("mapclaims", e.code || e)));
  capSubs.push(FDB.collection("mappicks").where("team", "==", S.captain.team).onSnapshot(s => { S.remote.mappicks = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); schedule(); }, e => console.warn("mappicks", e.code || e)));
  capSubs.push(FDB.collection("results").where("team", "==", S.captain.team).onSnapshot(s => { S.remote.results = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); if (S.cap.open) renderCap(); schedule(); }, e => console.warn("results", e.code || e)));
  capSubs.push(FDB.collection("requests").where("team", "==", S.captain.team).onSnapshot(s => {
    S.requests = Object.fromEntries(s.docs.map(d => [d.id, d.data()])); if (S.cap.open) renderCap(); schedule();
  }, e => console.warn("requests", e.code || e)));
}
async function ensureUid() {
  if (!AUTH) return null;
  if (AUTH.currentUser) return AUTH.currentUser.uid;
  try { const c = await AUTH.signInAnonymously(); return c.user.uid; } catch (e) { console.warn(e); return null; }
}

/* ================= render general ================= */
let raf = 0;
function schedule() { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; renderAll(); }); }
function renderAll() {
  M = model(); derive();
  renderBanner(); renderHero(); renderTicker(); renderManager();
  renderPts(); renderTable(); renderFixture();
  renderMaps();
  renderRankChips(); renderRank(); renderPower(); renderAwards();
  renderScouting(); renderMapPick(); renderCanjes(); renderMarket(); renderMkCoaches(); renderTeams(); renderCoaches(); renderVote(); renderFairPlay(); renderBadges();
  renderDiscord(); renderPlayoffs(); renderHistory(); renderProfile(); renderPickem(); renderVoteReal(); renderRules(); renderMe(); renderPartidos(); renderSeg();
  $("#adminBtn").hidden = !S.staff; $("#openStreamAdmin").hidden = !S.staff;
  $("#adminBtnTxt").textContent = S.staff ? (isUltra() ? "Panel ultra" : "Panel de staff") : "Staff";
  $("#capBtn").hidden = !S.captain;
  shellState();
  if (S.adm.open) renderAdmin();
  if (S.cap.open) renderCap();
  if (ST.open && !ST.spinning) renderStage();
  tryDeep();
}

function renderBanner() {
  const b = $("#exBanner");
  if (!FB_READY) { b.hidden = false; b.innerHTML = `<span><b>Falta configurar Firebase.</b> Completá <span class="mono">public/js/firebase-config.js</span> con los datos de tu proyecto (ver README). Mientras tanto la página no guarda nada.</span>`; }
  else if (M.ex) { b.hidden = false; b.innerHTML = `<span><b>Datos de ejemplo.</b> La liga todavía no tiene resultados cargados, así que ves un ejemplo de cómo va a quedar.</span><button class="linkbtn" data-ex="off">Ver la liga real (vacía)</button>`; }
  else if (M.realEmpty && S.staff) { b.hidden = false; b.innerHTML = `<span>La liga está en cero: todavía no hay jugadores ni resultados. Cargalos desde el panel Admin.</span>`; }
  else b.hidden = true;
  $("#heroChip span").textContent = `${M.cfg.season} · datos oficiales de la liga`;
  $("#footTxt").textContent = `ONYX · ${M.cfg.season}${M.ex ? " · datos de ejemplo" : ""}`;
}
$("#exBanner").addEventListener("click", e => { const b = e.target.closest("[data-ex]"); if (!b) return; S.exampleOn = b.dataset.ex === "on"; store.set("ex", S.exampleOn); schedule(); });

function nextDate() {
  if (M.cfg.nextDate) return M.cfg.nextDate;
  const m = D.pending.find(x => x.fecha === D.nextF && x.date); return m ? m.date : (typeof poNextDate === "function" ? poNextDate() : "");
}
function renderHero() {
  $("#heroEyebrow").innerHTML = `<b>${esc(M.cfg.season)}</b><span>${TEAM_KEYS.length} equipos de ${esc(M.cfg.game)}</span>`;
  $("#brandSeason").textContent = M.cfg.season;
  $("#coreFecha").textContent = D.fechas ? `Fecha ${D.nextF || D.lastF} de ${D.fechas}` : "Sin fixture";
  $("#stTeams").textContent = fmt(TEAM_KEYS.length);
  $("#stPlayers").textContent = fmt(D.P.length);
  $("#stCoins").textContent = fmt(TEAM_KEYS.reduce((s, k) => s + (+M.teams[k].coins || 0), 0));
  $("#stFechas").textContent = fmt(D.lastF); $("#stFechasL").textContent = D.fechas ? `Fechas jugadas de ${D.fechas}` : "Fechas jugadas";
  renderHome();
  tickClock();
}
// Cuenta regresiva para la próxima fecha: grande en el inicio y chica en la barra lateral (se ve desde cualquier sección)
const p2 = n => String(n).padStart(2, "0");
function setUnit(id, v) { const el = $(id); if (!el || el.textContent === v) return; el.textContent = v; if (!reduced && el.isConnected) { el.classList.remove("tick"); void el.offsetWidth; el.classList.add("tick"); } }
function tickClock() {
  if (!M) return;
  const nd = parseLocal(nextDate()), big = $("#cdBig"), sc = $("#sideCd");
  const pst = !D.nextF && typeof poState === "function" ? poState(playoffDoc()) : null, pnd = pst && !pst.champion ? poNextDate() : "";
  const fl = D.nextF ? `Fecha ${D.nextF}` : pst && !pst.champion ? "Playoffs" : "Próxima fecha";
  if (!D.nextF && !M.cfg.nextDate && pst && !pnd) {
    big.className = "cdown none"; ["#cdD", "#cdH", "#cdM", "#cdS"].forEach(x => setUnit(x, "--"));
    const ch = pst.champion ? TM(pst.champion).name : "";
    $("#countdown").textContent = ch ? `${ch} campeón` : "Playoffs"; $("#cdLabel").textContent = ch ? `${ch} es el campeón de ${M.cfg.season}` : "Playoffs · día y hora a confirmar";
    $("#sideCdL").textContent = ch ? "Campeón" : "Playoffs"; $("#sideCdV").textContent = ch || "A confirmar"; sc.className = "side-cd none";
    $("#cdProg").hidden = true; $("#sideCdBarW").hidden = true;
  } else if (!D.nextF && !M.cfg.nextDate && !pnd) {
    big.className = "cdown none"; ["#cdD", "#cdH", "#cdM", "#cdS"].forEach(x => setUnit(x, "--"));
    $("#countdown").textContent = "Sin fechas pendientes"; $("#cdLabel").textContent = D.ms.length ? "No quedan fechas por jugar" : "Todavía no hay fixture";
    $("#sideCdL").textContent = "Temporada"; $("#sideCdV").textContent = D.ms.length ? "Terminada" : "Sin fixture"; sc.className = "side-cd none";
    $("#cdProg").hidden = true; $("#sideCdBarW").hidden = true;
  } else if (!nd) {
    big.className = "cdown none"; ["#cdD", "#cdH", "#cdM", "#cdS"].forEach(x => setUnit(x, "--"));
    $("#countdown").textContent = "A confirmar"; $("#cdLabel").textContent = `${fl} · día y hora a confirmar`;
    $("#sideCdL").textContent = fl; $("#sideCdV").textContent = "A confirmar"; sc.className = "side-cd none";
    $("#cdProg").hidden = true; $("#sideCdBarW").hidden = true;
  } else {
    const ms = nd - Date.now();
    if (ms > 0) {
      const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
      big.className = `cdown${ms < 36e5 ? " soon" : ""}`; setUnit("#cdD", p2(d)); setUnit("#cdH", p2(h)); setUnit("#cdM", p2(m)); setUnit("#cdS", p2(s));
      const txt = d ? `${d}d ${p2(h)}:${p2(m)}:${p2(s)}` : `${p2(h)}:${p2(m)}:${p2(s)}`;
      $("#countdown").textContent = `Faltan ${d} días, ${h} horas y ${m} minutos`; $("#sideCdV").textContent = txt; $("#sideCdL").textContent = `${fl} en`;
      sc.className = `side-cd${ms < 36e5 ? " soon" : ""}`;
    } else {
      big.className = "cdown live"; $("#cdLiveT").textContent = `Se está jugando la ${fl.toLowerCase()}`;
      $("#countdown").textContent = "En juego"; $("#sideCdL").textContent = fl; $("#sideCdV").textContent = "En juego"; sc.className = "side-cd live";
    }
    $("#cdLabel").textContent = `${fl} · ${fmtDate(nextDate())}`;
    // barra: cuánto pasó desde la última fecha jugada hasta la próxima
    const lastD = D.played.map(x => parseLocal(x.date)).filter(Boolean).sort((a, b) => b - a)[0];
    const pct = lastD && nd > lastD ? Math.max(0, Math.min(1, (Date.now() - lastD) / (nd - lastD))) : null;
    $("#cdProg").hidden = pct == null || ms <= 0; $("#sideCdBarW").hidden = pct == null || ms <= 0;
    if (pct != null) { $("#cdProgBar").style.width = (pct * 100).toFixed(2) + "%"; $("#sideCdBar").style.width = (pct * 100).toFixed(2) + "%"; }
  }
  const wl = $("#winLeft"); if (wl) wl.textContent = windowLeft();
}
function windowLeft() {
  if (!M.cfg.windowOpen) return "cerrada";
  const d = parseLocal(M.cfg.windowClose); if (!d) return "abierta";
  const ms = d - Date.now(); if (ms <= 0) return "cerrada";
  const h = Math.floor(ms / 36e5), m = Math.floor(ms % 36e5 / 6e4), s = Math.floor(ms % 6e4 / 1e3);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function renderTicker() {
  const items = [];
  (M.cfg.news || []).filter(Boolean).forEach(n => items.push(`<span class="item"><span class="k">Novedad</span>${esc(n)}</span>`));
  D.played.filter(m => m.fecha === D.lastF).forEach(m => items.push(`<span class="item"><span class="k">F${m.fecha}${m.leg ? " " + LEG_L[m.leg] : ""}</span>${img(m.a)}<b>${esc(TM(m.a).name)}</b> ${m.ra}-${m.rb} <b>${esc(TM(m.b).name)}</b>${img(m.b)}${m.ot ? " · prórroga" : ""}${m.map ? " · " + esc(m.map) : ""}</span>`));
  const mv = fechaMvp(D.lastF);
  if (mv) items.push(`<span class="item"><span class="k">MVP</span>${img(mv.lastTeam)}<b>${esc(mv.name)}</b> fue el MVP de la fecha ${D.lastF} con ${agg(mv.log, D.lastF).acs} de ACS</span>`);
  [...M.transfers].sort((a, b) => b.at - a.at).slice(0, 4).forEach(f => items.push(`<span class="item"><span class="k">Fichaje</span><b>${esc(f.name)}</b> → ${img(f.to)}<b>${esc(TM(f.to).name)}</b>${f.amt ? " por " + fmt(f.amt) + " coins" : ""}</span>`));
  const ld = lastDraw(); if (ld) items.push(`<span class="item"><span class="k">Mapa</span>${img(ld.a)}<b>${esc(TM(ld.a).name)}</b> vs <b>${esc(TM(ld.b).name)}</b>${img(ld.b)} se juega en <b>${esc(ld.map)}</b></span>`);
  if (M.cfg.windowOpen) items.push(`<span class="item"><span class="k">Mercado</span>Ventana de fichajes abierta${M.cfg.windowClose ? " hasta el " + fmtDate(M.cfg.windowClose) : ""}</span>`);
  if (!items.length) items.push(`<span class="item"><span class="k">Liga</span>${esc(M.cfg.season)} · ${TEAM_KEYS.length} equipos</span>`);
  const html = items.join(""); $("#ticker").innerHTML = html + html;
}
const capTeam = () => (S.captain && S.captain.team) || null;
function renderManager() {
  if (capTeam()) S.my = capTeam();
  const sel = $("#mgrSel");
  sel.innerHTML = TEAM_KEYS.map(k => `<option value="${k}">${esc(TM(k).name)}</option>`).join(""); sel.value = S.my;
  sel.disabled = !!capTeam(); $("#mgrLbl").textContent = capTeam() ? "Capitán de" : "Seguís a";
  $("#mgrImg").src = EMB[S.my]; updateNavCoins();
}
let shownCoins = null;
function updateNavCoins() {
  const to = +M.teams[S.my].coins || 0, el = $("#mgrCoins");
  if (shownCoins == null || reduced) { el.textContent = fmt(to); shownCoins = to; return; }
  if (shownCoins === to) { el.textContent = fmt(to); return; }
  const from = shownCoins; shownCoins = to; const t0 = performance.now();
  const step = now => { const f = Math.min(1, (now - t0) / 700), e = 1 - Math.pow(1 - f, 3); el.textContent = fmt(from + (to - from) * e); if (f < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
$("#mgrSel").addEventListener("change", e => { if (capTeam()) return; S.my = e.target.value; store.set("my", S.my); S.teamSel = S.my; resetVote(); schedule(); toast(`Seguís a ${TM(S.my).name}`, S.my); });

/* ================= tabla ================= */
function renderPts() {
  const P = M.cfg.points;
  $("#ptsys").innerHTML = `<div><b style="color:var(--win)">${P.w}</b><span>Victoria</span></div><div><b style="color:#9df2c9">${P.otw}</b><span>Victoria en prórroga</span></div><div><b style="color:#ffb3c0">${P.otl}</b><span>Derrota en prórroga</span></div><div><b style="color:var(--loss)">${P.l}</b><span>Derrota</span></div>`;
  $("#noShowNote").textContent = `No presentarse: derrota 0-13 y ${M.cfg.noShow} punto${Math.abs(M.cfg.noShow) === 1 ? "" : "s"}. Tolerancia de 15 minutos.`;
  $("#lgPlayoff").textContent = `Playoffs (1° a ${M.cfg.playoff}°)`;
}
const COLS = [["pos","#"],["team","Equipo"],["pts","Pts"],["pj","PJ"],["g","V"],["gp","VP"],["pp","DP"],["p","D"],["rf","RF"],["rc","RC"],["dif","Dif"],["kills","K"],["ast","A"],["form","Forma"]];
function renderTable(animate = true) {
  const tbl = $("#standings");
  const results = S.tblMode === "proj" ? projResults() : D.played;
  let rows = standings(results);
  const realPos = Object.fromEntries(D.real.map(r => [r.k, r.pos]));
  if (S.sort && !["pos", "team", "form"].includes(S.sort)) rows = [...rows].sort((a, b) => b[S.sort] - a[S.sort]);
  if (S.sort === "team") rows = [...rows].sort((a, b) => TM(a.k).name.localeCompare(TM(b.k).name));
  const before = {};
  if (animate) $$("tr.row", tbl).forEach(tr => before[tr.dataset.k] = tr.getBoundingClientRect().top);
  const head = `<thead><tr>${COLS.map(([k, l]) => `<th data-s="${k}" class="${(S.sort || "pos") === k ? "sorted" : ""}" title="Ordenar por ${l}">${l}</th>`).join("")}</tr></thead>`;
  const label = {W: "V", w: "VP", l: "DP", L: "D"};
  const body = rows.map(r => {
    const t = TM(r.k), mv = S.tblMode === "proj" ? realPos[r.k] - r.pos : 0;
    const form = r.form.slice(-5); while (form.length < 5) form.unshift(null);
    let html = `<tr class="row ${r.k === S.my ? "me" : ""}" data-k="${r.k}" style="--tc:${t.c};--zone:${r.pos <= M.cfg.playoff ? "var(--win)" : "transparent"}" tabindex="0" aria-expanded="${S.open === r.k}">
      <td class="pos">${r.pos}${mv ? `<i class="mv ${mv > 0 ? "up" : "dn"}">${mv > 0 ? "▲" : "▼"}${Math.abs(mv)}</i>` : ""}</td>
      <td class="team"><div class="tcell">${img(r.k)}<b>${esc(t.name)}</b>${r.tie ? `<span class="tie" title="Empatado en puntos: lo define ${r.tie}">${r.tie}</span>` : ""}</div></td>
      <td class="pts">${r.pts}</td>
      <td>${r.pj}</td><td>${r.g}</td><td>${r.gp}</td><td>${r.pp}</td><td>${r.p}</td><td>${r.rf}</td><td>${r.rc}</td>
      <td style="color:${r.dif > 0 ? "var(--win)" : r.dif < 0 ? "var(--loss)" : "inherit"}">${r.dif > 0 ? "+" : ""}${r.dif}</td>
      <td>${r.kills}</td><td>${r.ast}</td>
      <td><div class="form">${form.map(f => f ? `<i class="${f.c}" style="${f.proj ? "opacity:.55;outline:1px dashed #fff3;outline-offset:-1px" : ""}" title="${f.proj ? "Proyectado" : "Jugado"}">${label[f.c]}</i>` : `<i class="x">·</i>`).join("")}</div></td></tr>`;
    if (S.open === r.k) {
      const ms = results.filter(m => m.a === r.k || m.b === r.k).sort((x, y) => x.fecha - y.fecha || (x.legN || 0) - (y.legN || 0));
      html += `<tr class="detail"><td colspan="14"><div class="detail-in">${ms.map(m => {
        const home = m.a === r.k, vs = home ? m.b : m.a, my = home ? m.ra : m.rb, op = home ? m.rb : m.ra, won = +my > +op;
        return `<div class="mcard" data-mid="${m.id}" tabindex="0" role="button" title="Ver el partido"><span class="mono muted" style="font-size:11px">F${m.fecha}${legTag(m)}${m.proj ? " · proy." : ""}</span>${img(vs)}<span>${esc(TM(vs).name)}</span><span class="r" style="color:${won ? "var(--win)" : "var(--loss)"}">${my}-${op}${m.ot ? " PR" : ""}</span></div>`;
      }).join("") || '<span class="muted">Sin partidos jugados.</span>'}</div></td></tr>`;
    }
    return html;
  }).join("");
  tbl.innerHTML = head + `<tbody>${body}</tbody>`;
  if (animate && !reduced) $$("tr.row", tbl).forEach(tr => { const b = before[tr.dataset.k]; if (b == null) return; const dy = b - tr.getBoundingClientRect().top; if (dy) tr.animate([{transform: `translateY(${dy}px)`}, {transform: "none"}], {duration: 550, easing: "cubic-bezier(.2,.8,.2,1)"}); });
}
$("#standings").addEventListener("click", e => {
  const th = e.target.closest("th"); if (th) { const s = th.dataset.s; S.sort = (s === "pos" || S.sort === s) ? null : s; renderTable(); return; }
  const tr = e.target.closest("tr.row"); if (tr) { S.open = S.open === tr.dataset.k ? null : tr.dataset.k; renderTable(false); }
});
$("#standings").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("tr.row")) e.target.click(); });
$("#tblMode").addEventListener("click", e => { const b = e.target.closest("button"); if (b) setMode(b.dataset.m); });
function setMode(m) { S.tblMode = m; $$("#tblMode button").forEach(x => x.classList.toggle("on", x.dataset.m === m)); renderTable(); }
function renderFixture() {
  const byF = {}; D.pending.forEach(m => (byF[m.fecha] = byF[m.fecha] || []).push(m));
  const fs = Object.keys(byF).map(Number).sort((a, b) => a - b);
  $("#fixture").innerHTML = fs.map(f => {
    const ms = byCruce(byF[f]), inF = new Set(ms.flatMap(m => [m.a, m.b]));
    const allF = D.ms.filter(m => m.fecha === f).flatMap(m => [m.a, m.b]);
    const bye = TEAM_KEYS.filter(k => !allF.includes(k));
    const d = ms.find(m => m.date);
    return `<div class="fx-day"><h4><span>Fecha ${f}${d ? " · " + fmtDate(d.date, false) : ""}</span><em>${bye.length ? "Libre: " + bye.map(k => esc(TM(k).name)).join(", ") : ""}</em></h4>${ms.map(m => {
      const pk = S.picks[m.id] || m.proj, official = !S.picks[m.id] && m.proj;
      const btn = (v, lab, team, title) => `<button data-id="${m.id}" data-v="${v}" class="${pk === v ? "on" : ""}" style="--pc:${TM(team).c}${official && pk === v ? ";outline:1px dashed #fff;outline-offset:-3px" : ""}" title="${title}${official && pk === v ? " (proyección oficial)" : ""}" aria-pressed="${pk === v}">${lab}</button>`;
      const picks = `<div class="picks">${btn("A", "13-8", m.a, "Gana " + TM(m.a).name)}${btn("a", "14-12", m.a, "Gana " + TM(m.a).name + " en prórroga")}${btn("b", "12-14", m.b, "Gana " + TM(m.b).name + " en prórroga")}${btn("B", "8-13", m.b, "Gana " + TM(m.b).name)}</div>`;
      return `<div class="match ${m.leg ? "has-leg" : ""}"><div class="side">${img(m.a)}<span>${esc(TM(m.a).name)}</span></div>
        ${m.leg ? `<div class="legw"><span class="leg ${m.leg}">${LEG_L[m.leg]}</span>${picks}</div>` : picks}
        <div class="side b"><span>${esc(TM(m.b).name)}</span>${img(m.b)}</div></div>`;
    }).join("")}</div>`;
  }).join("") || `<p class="muted" style="margin-top:12px">No quedan partidos por jugar.</p>`;
}
$("#fixture").addEventListener("click", e => {
  const b = e.target.closest("button[data-id]"); if (!b) return;
  const {id, v} = b.dataset; if (S.picks[id] === v) S.picks[id] = "-"; else S.picks[id] = v;
  if (S.picks[id] === "-") delete S.picks[id];
  renderFixture(); if (S.tblMode !== "proj") setMode("proj"); else renderTable();
});
$("#simRandom").addEventListener("click", () => {
  D.pending.forEach(m => { const aw = Math.random() < .5, ot = Math.random() < .22; S.picks[m.id] = aw ? (ot ? "a" : "A") : (ot ? "b" : "B"); });
  renderFixture(); setMode("proj");
  const top = standings(projResults())[0]; if (top) toast(`${TM(top.k).name} terminaría primero con ${top.pts} puntos`, top.k);
});
$("#simReset").addEventListener("click", () => { S.picks = {}; renderFixture(); setMode("real"); });

/* ================= mapas ================= */
function mapsOn() { return M.cfg.maps.filter(m => m.on !== false).map(m => m.n); }
function usedFecha(k, map) {
  const m = D.ms.find(x => x.map === map && (x.a === k || x.b === k)); if (m) return "F" + m.fecha;
  const d = Object.values(S.remote.draws).find(x => x.map === map && (x.a === k || x.b === k)); return d && d.fecha ? "F" + d.fecha : "✕";
}
function drawsList() {
  if (M.ex) return D.ms.filter(m => m.map).map(m => ({a: m.a, b: m.b, map: m.map, fecha: m.fecha, at: parseLocal(m.date) ? parseLocal(m.date).getTime() : 0, matchId: m.id})).sort((x, y) => y.at - x.at);
  return Object.entries(S.remote.draws).map(([id, d]) => ({id, ...d})).sort((x, y) => (y.at || 0) - (x.at || 0));
}
function lastDraw() { return drawsList()[0] || null; }
function renderMaps() {
  const maps = M.cfg.maps;
  const head = `<tr><th></th>${maps.map(m => `<th class="mh"><span class="maptile" style="--mc:${mapColor(m.n)};${m.on === false ? "opacity:.35" : ""}"><span>${esc(m.n)}</span></span></th>`).join("")}<th>Quedan</th></tr>`;
  const rows = [...TEAM_KEYS].sort((a, b) => M.teams[a].order - M.teams[b].order).map(k => {
    const used = new Set(M.teams[k].used), left = mapsOn().filter(n => !used.has(n)).length;
    return `<tr><td class="tm"><div class="tcell">${img(k)}<b>${esc(TM(k).name)}</b></div></td>${maps.map(m => m.on === false ? `<td class="off">–</td>` : used.has(m.n) ? `<td class="us" title="${esc(TM(k).name)} ya jugó ${esc(m.n)}">${usedFecha(k, m.n)}</td>` : `<td class="av" title="Disponible"><i></i></td>`).join("")}<td class="mono" style="font-size:14px">${left}</td></tr>`;
  }).join("");
  $("#mapsGrid").innerHTML = `<table class="mg">${head}${rows}</table><p class="muted" style="font-size:12px;margin-top:8px">Punto verde: disponible. Rojo: ya lo jugó (con la fecha).</p>`;
  const L = drawsList(), ld = L[0];
  $("#drawLast").innerHTML = ld ? `<div class="draw-last cut-s">${img(ld.a)}<div><div class="mono muted" style="font-size:11px;letter-spacing:.12em">${ld.fecha ? "FECHA " + ld.fecha + " · " : ""}${esc(TM(ld.a).name)} VS ${esc(TM(ld.b).name)}</div><div class="mn" style="color:${mapColor(ld.map)}">${esc(ld.map)}</div></div>${img(ld.b)}</div>` : `<p class="muted">Todavía no se sorteó ningún mapa.</p>`;
  $("#drawHist").innerHTML = L.slice(0, 40).map(d => `<div><span class="mono muted">${d.fecha ? "F" + d.fecha : "—"}</span>${img(d.a)}<span class="muted">vs</span>${img(d.b)}<span class="mchip" style="--mc:${mapColor(d.map)}">${esc(d.map)}</span></div>`).join("");
}
$("#openStreamView").addEventListener("click", () => openStream(false));
$("#openStreamAdmin").addEventListener("click", () => requireStaff(() => openStream(true)));

/* ================= rendimiento individual ================= */
function perfOf(pid) { return (S.remote.perf && S.remote.perf[pid]) || {}; }
function attStats(pid) {
  const a = perfOf(pid).att || {}, c = {P: 0, T: 0, A: 0, J: 0};
  Object.values(a).forEach(v => { if (c[v] != null) c[v]++; });
  const n = c.P + c.T + c.A;
  return {...c, n, total: n + c.J, pct: n ? Math.round((c.P + c.T * .5) / n * 100) : null};
}
function ptsSum(pid) { return (perfOf(pid).pts || []).reduce((s, x) => s + (+x.v || 0), 0); }
function skillAvg(pid) { const sk = perfOf(pid).skills || {}, v = SKILLS.map(([k]) => +sk[k]).filter(x => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }

/* ================= rankings ================= */
function rankList() {
  const {stat, scope, team} = S.rk, f = scope === "week" ? D.lastF : null;
  if (stat === "pts" || stat === "att") {
    return D.P.filter(p => team === "all" || p.lastTeam === team).map(p => {
      const at = attStats(p.id); return {p, s: p.s, at, v: stat === "pts" ? ptsSum(p.id) : at.pct};
    }).filter(x => stat === "pts" ? x.v !== 0 : x.v != null).sort((a, b) => b.v - a.v || (b.at.n - a.at.n)).slice(0, 10);
  }
  const min = (stat === "kd" || stat === "acs") ? (f ? 1 : 2) : 1;
  return D.P.map(p => ({p, s: f ? agg(p.log, f) : p.s})).filter(x => x.s.m >= min && (team === "all" || x.p.lastTeam === team))
    .map(x => ({...x, v: x.s[stat]})).sort((a, b) => b.v - a.v).slice(0, 10);
}
const fv = (stat, v) => stat === "kd" ? dec(v) : stat === "att" ? v + "%" : stat === "pts" ? (v > 0 ? "+" : "") + fmt(v) : fmt(v);
const rkSub = (st, x) => st === "att" ? `${x.at.n} fechas` : st === "pts" ? `${(perfOf(x.p.id).pts || []).length} registros` : `${x.s.m} PJ`;
function renderRankChips() {
  $("#rkWeekBtn").textContent = D.lastF ? `Fecha ${D.lastF}` : "Última fecha";
  $("#rkTeams").innerHTML = `<button class="chip ${S.rk.team === "all" ? "on" : ""}" data-t="all" style="padding-left:10px">Todos</button>` + TEAM_KEYS.map(k => `<button class="chip ${S.rk.team === k ? "on" : ""}" data-t="${k}" style="--tc:${TM(k).c}">${img(k)}${esc(TM(k).name)}</button>`).join("");
}
function renderRank() {
  const L = rankList(), st = S.rk.stat;
  if (!L.length) { $("#podium").innerHTML = ""; $("#rlist").innerHTML = `<p class="muted">${st === "pts" ? "Todavía no hay puntos individuales cargados" : st === "att" ? "Todavía no hay asistencia cargada" : "Todavía no hay estadísticas cargadas"}${S.rk.team !== "all" ? " para este equipo" : ""}.</p>`; return; }
  $("#podium").innerHTML = [L[1], L[0], L[2]].map((x, i) => {
    if (!x) return "<div></div>";
    const t = TM(x.p.lastTeam);
    return `<div class="pod" data-p="${x.p.id}" style="--tc:${t.c}" tabindex="0">${img(x.p.lastTeam, "av")}<div class="blk cut-s"><div class="place">${[2, 1, 3][i]}</div><div class="nm">${esc(x.p.name)}</div><div class="val">${fv(st, x.v)}</div><div class="sub">${esc(t.name)} · ${rkSub(st, x)}</div></div></div>`;
  }).join("");
  const max = Math.max(1, L[0].v || 1);
  $("#rlist").innerHTML = L.slice(3).map((x, i) => { const t = TM(x.p.lastTeam);
    return `<div class="rrow" data-p="${x.p.id}" style="--tc:${t.c}" tabindex="0"><span class="p">${i + 4}</span>${img(x.p.lastTeam)}<span class="nm">${esc(x.p.name)}<small>${x.p.role} · ${esc(t.name)}</small></span><span class="bar"><i data-w="${(x.v / max * 100).toFixed(1)}"></i></span><span class="v">${fv(st, x.v)}</span></div>`; }).join("");
  requestAnimationFrame(() => requestAnimationFrame(() => $$("#rlist .bar i").forEach(b => b.style.setProperty("--w", b.dataset.w + "%"))));
}
$("#rkTeams").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.rk.team = b.dataset.t; renderRankChips(); renderRank(); });
$("#rkStat").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.rk.stat = b.dataset.k; $$("#rkStat button").forEach(x => x.classList.toggle("on", x === b)); renderRank(); });
$("#rkScope").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.rk.scope = b.dataset.s; $$("#rkScope button").forEach(x => x.classList.toggle("on", x === b)); renderRank(); });
["#podium", "#rlist", "#teamDetail"].forEach(s => {
  $(s).addEventListener("click", e => { const el = e.target.closest("[data-p]"); if (el) openPlayer(el.dataset.p); });
  $(s).addEventListener("keydown", e => { const el = e.target.closest("[data-p]"); if (el && e.key === "Enter") openPlayer(el.dataset.p); });
});
function powerAt(f) {
  const res = D.played.filter(m => m.fecha <= f), st = standings(res);
  return st.map(r => { const last = res.filter(m => m.a === r.k || m.b === r.k).sort((a, b) => b.fecha - a.fecha)[0];
    const lw = last ? ((last.a === r.k) === (+last.ra > +last.rb)) : false; return {k: r.k, score: r.pts + r.dif * .06 + (lw ? 1.2 : 0) + r.kd * 2, r}; }).sort((a, b) => b.score - a.score);
}
function renderPower() {
  if (!D.lastF) { $("#power").innerHTML = `<p class="muted">Aparece cuando se juegue la primera fecha.</p>`; return; }
  const now = powerAt(D.lastF), prev = powerAt(D.lastF - 1), prevPos = Object.fromEntries(prev.map((x, i) => [x.k, i + 1]));
  const cum = k => { let s = 0; const out = [0]; for (let f = 1; f <= D.lastF; f++) { D.played.filter(m => m.fecha === f && (m.a === k || m.b === k)).forEach(m => { const [pa, pb] = ptsOf(m); s += m.a === k ? pa : pb; }); out.push(s); } return out; };
  const maxPts = Math.max(...TEAM_KEYS.map(k => cum(k).slice(-1)[0]), 1);
  $("#power").innerHTML = now.map((x, i) => {
    const t = TM(x.k), d = D.lastF > 1 ? prevPos[x.k] - (i + 1) : 0, pts = cum(x.k);
    const pth = pts.map((v, j) => `${(j / Math.max(1, pts.length - 1) * 66 + 2).toFixed(1)},${(24 - Math.max(0, v) / maxPts * 20).toFixed(1)}`).join(" ");
    const lp = pth.split(" ").pop().split(",");
    return `<div class="prow" style="--tc:${t.c}"><span class="p">${i + 1}</span>${img(x.k)}<div><b>${esc(t.name)}</b><small>${x.r.g + x.r.gp}V ${x.r.pp + x.r.p}D · ${x.r.pts} pts</small></div>
      <svg class="spark" viewBox="0 0 70 26" aria-hidden="true"><polyline points="${pth}" fill="none" stroke="${t.c}" stroke-width="1.6"/><circle cx="${lp[0]}" cy="${lp[1]}" r="2.6" fill="${t.l}"/></svg>
      <span class="trend ${d > 0 ? "up" : d < 0 ? "dn" : "eq"}">${d > 0 ? "▲ " + d : d < 0 ? "▼ " + (-d) : "="}</span></div>`;
  }).join("");
}

/* ================= premios ================= */
function mvpScore(p) { const s = p.s; return s.acs * .5 + s.kd * 55 + (s.w / Math.max(1, s.m)) * 50 + (s.a / Math.max(1, s.m)) * 2; }
function fechaMvp(f) {
  if (!f) return null;
  const c = D.played.filter(m => m.fecha === f && m.mvpId && D.PM[m.mvpId]).map(m => D.PM[m.mvpId]);
  return c.sort((a, b) => agg(b.log, f).acs - agg(a.log, f).acs)[0] || null;
}
const AWARD_KINDS = [["mvp","MVP de la temporada"],["fmvp","MVP de la fecha"],["Duelista","Mejor duelista"],["Iniciador","Mejor iniciador"],["Controlador","Mejor controlador"],["Centinela","Mejor centinela"],["Flex","Mejor flex"],["rev","Revelación"],["pts","Más puntos individuales"],["att","Mejor asistencia"]];
function computeAwards() {
  const ov = M.cfg.awards || {}, pick = (key, auto) => (ov[key] && D.PM[ov[key]]) ? D.PM[ov[key]] : auto;
  const minM = Math.min(3, Math.max(1, D.lastF - 1));
  const mvp = pick("mvp", [...D.P].filter(p => p.s.m >= minM).sort((a, b) => mvpScore(b) - mvpScore(a))[0]);
  const fm = D.played.filter(m => m.fecha === D.lastF && m.mvpId && D.PM[m.mvpId]).map(m => D.PM[m.mvpId]).sort((a, b) => agg(b.log, D.lastF).acs - agg(a.log, D.lastF).acs);
  const fmvp = pick("fmvp", fm.find(p => p !== mvp) || fm[0]);
  const byRole = role => pick(role, D.P.filter(p => p.role === role && p.s.m >= Math.min(2, minM) && p !== mvp).sort((a, b) => mvpScore(b) - mvpScore(a))[0]);
  const rev = pick("rev", D.P.filter(p => p.s.m >= 1 && (p.role === "Suplente" || catOf(p.value) === "C")).sort((a, b) => b.s.acs - a.s.acs)[0]);
  const ptsTop = pick("pts", D.P.map(p => ({p, v: ptsSum(p.id)})).filter(x => x.v > 0).sort((a, b) => b.v - a.v).map(x => x.p)[0]);
  const maxN = Math.max(0, ...D.P.map(p => attStats(p.id).n));
  const attTop = pick("att", D.P.map(p => ({p, a: attStats(p.id)})).filter(x => x.a.n && x.a.n >= Math.max(1, Math.ceil(maxN / 2))).sort((a, b) => b.a.pct - a.a.pct || b.a.n - a.a.n || ptsSum(b.p.id) - ptsSum(a.p.id)).map(x => x.p)[0]);
  return {pts: ptsTop, att: attTop, mvp, fmvp, rev, Duelista: byRole("Duelista"), Iniciador: byRole("Iniciador"), Controlador: byRole("Controlador"), Centinela: byRole("Centinela"), Flex: byRole("Flex")};
}
function perfDl(pid) {
  const a = attStats(pid), sk = skillAvg(pid);
  return `<dl><dt>Puntos individuales</dt><dd>${fv("pts", ptsSum(pid))}</dd><dt>Asistencia</dt><dd>${a.pct == null ? "–" : a.pct + "%"}</dd><dt>Presente / tarde / ausente</dt><dd>${a.P} / ${a.T} / ${a.A}</dd><dt>Skills (promedio)</dt><dd>${sk == null ? "–" : dec(sk, 1)}</dd></dl>`;
}
const TROPHY = `<svg class="trophy" viewBox="0 0 48 48" fill="none" stroke="var(--gold)" stroke-width="2.2" aria-hidden="true"><path d="M15 8h18v9a9 9 0 0 1-18 0z" fill="rgba(255,203,82,.18)"/><path d="M15 11H9a5 5 0 0 0 6 7M33 11h6a5 5 0 0 1-6 7M24 26v7M17 40h14M19 33h10v7H19z"/></svg>`;
function renderAwards() {
  const A = computeAwards(), ov = M.cfg.awards || {};
  const crit = {mvp: "<code>ACS×0,5 + K/D×55 + %victorias×50 + asist/partido×2</code>.", fmvp: "Mayor ACS de la fecha entre los MVP de cada partido. El MVP de la temporada no repite.", rev: "Mayor ACS entre suplentes y jugadores categoría C.",
    pts: "Suma de los puntos individuales que carga el staff: bonus por actitud, compromiso o rendimiento, y descuentos.", att: "Mayor porcentaje de asistencia: presente cuenta 1, tarde ½ y los justificados no cuentan."};
  const html = AWARD_KINDS.map(([key, kind], i) => {
    const p = A[key]; if (!p) return "";
    const t = TM(p.lastTeam), s = key === "fmvp" ? agg(p.log, D.lastF) : p.s;
    const big = i < 2;
    const c = ov[key] ? "Elegido por la organización." : (crit[key] || `Misma fórmula del MVP, solo ${key.toLowerCase()}s. El MVP de la temporada no repite premio.`);
    return `<div class="award ${big ? "big" : ""}" tabindex="0" style="--tc:${t.c}"><div class="flip">
      <div class="face front cut">${img(p.lastTeam, "emb")}<div class="shine"></div>${TROPHY}<div class="kind" style="margin-top:10px">${key === "fmvp" ? "MVP de la fecha " + D.lastF : kind}</div><h3>${esc(p.name)}</h3><div class="who">${img(p.lastTeam)}${esc(t.name)} · ${p.role}</div></div>
      <div class="face back cut"><div class="kind">${kind}</div>${key === "pts" || key === "att" ? perfDl(p.id) : `<dl><dt>Partidos</dt><dd>${s.m}</dd><dt>K / D / A</dt><dd>${s.k} / ${s.d} / ${s.a}</dd><dt>K/D</dt><dd>${dec(s.kd)}</dd><dt>ACS</dt><dd>${s.acs}</dd><dt>Victorias</dt><dd>${s.w} de ${s.m}</dd></dl>`}<div class="crit">${c}</div></div></div></div>`;
  }).join("");
  $("#awards").innerHTML = html || `<p class="muted">Los premios aparecen cuando haya estadísticas cargadas.</p>`;
}
$("#awards").addEventListener("click", e => { const a = e.target.closest(".award"); if (a) a.classList.toggle("flipped"); });

/* ================= elegir mapa (capitanes) ================= */
// En cada fecha dos equipos juegan ida y vuelta. Cada capitán elige UNO solo de los dos partidos: su mapa y con qué lado
// arranca su equipo. El otro lo elige el capitán rival.
//   mappicks/f<fecha>_<equipo>  lo que eligió (lo ven su capitán y el staff)
//   mapclaims/<partida>         qué equipo tomó cada partida (lo ven los capitanes, sin el mapa)
// El bot de Discord manda a los capitanes acá con ?mapa=<partida>#elegir-mapa
const mpQ = new URLSearchParams(location.search).get("mapa") || "";
S.mp = {match: mpQ, fecha: null, link: !!mpQ || location.hash === "#elegir-mapa", scrolled: false, draft: {}};
const SIDE_L = {atk: "Ataque", def: "Defensa"}, SIDE_OPP = {atk: "def", def: "atk"};
const pickOf = (f, k) => S.remote.mappicks[`f${f}_${k}`] || null;
const claimOf = mid => S.remote.mapclaims[mid] || null;
// Partidas de la fecha entre los dos equipos, en orden: Partida 1, Partida 2
function seriesGames(ms, f, k, rival) {
  return ms.filter(m => m.fecha === f && ((m.a === k && m.b === rival) || (m.a === rival && m.b === k)))
    .sort((x, y) => (x.legN || 0) - (y.legN || 0) || String(x.date || "").localeCompare(String(y.date || "")) || x.id.localeCompare(y.id));
}
// Por qué un mapa no se puede elegir en una fecha: ya lo jugó el equipo o lo eligió en otra fecha.
function mapBlockedFor(k, f) {
  const t = M.teams[k] || {usedOwn: [], picked: {}}, own = new Set(t.usedOwn || []), other = {};
  Object.entries(t.picked || {}).forEach(([mid, n]) => { const mf = +((M.matches[mid] || {}).fecha) || 0; if (mf !== f) other[n] = mf; });
  Object.values(S.remote.mappicks).forEach(pk => { if (pk && pk.team === k && +pk.fecha !== f && pk.map) other[pk.map] = +pk.fecha; });
  return n => own.has(n) ? "Ya jugado" : other[n] != null ? `Elegido en F${other[n] || "?"}` : "";
}
const agoShort = t => { if (!t) return ""; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "recién" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : new Date(t).toLocaleDateString("es-AR"); };
function gameState(m, ct) { const cl = claimOf(m.id); return m.status === "played" ? "played" : cl && cl.team !== ct ? "taken" : cl && cl.team === ct ? "mine" : "free"; }
function renderMapPick() {
  const sec = $("#elegir-mapa"), ct = capTeam(), show = !!S.captain || S.mp.link, root = $("#mpRoot");
  sec.hidden = !show; $("#navMp").hidden = !S.captain;
  if (!show) return;
  if (!S.captain) root.innerHTML = `<div class="mk-lock cut"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><div><b>Esta parte es para capitanes</b><span>Entrá con tu cuenta de capitán para elegir el partido (ida o vuelta), el mapa y el lado.</span></div><button class="btn gold sm" id="mpLogin" type="button">Entrar como capitán</button></div>`;
  else if (!ct) root.innerHTML = '<p class="muted">Todavía no tenés equipo asignado: pedile a un ultra staff que te asigne uno.</p>';
  else {
    const pend = D.pending.filter(m => m.a === ct || m.b === ct);
    if (!pend.length) root.innerHTML = '<p class="muted">Tu equipo no tiene partidos pendientes.</p>';
    else {
      const fechas = [...new Set(pend.map(m => m.fecha))].sort((a, b) => a - b);
      if (S.mp.match) { const mm = D.ms.find(x => x.id === S.mp.match); if (mm && fechas.includes(mm.fecha)) S.mp.fecha = mm.fecha; S.mp.match = ""; }
      if (!fechas.includes(S.mp.fecha)) S.mp.fecha = fechas[0];
      const f = S.mp.fecha, first = pend.find(m => m.fecha === f), rival = first.a === ct ? first.b : first.a, rn = esc(TM(rival).name);
      const games = seriesGames(D.ms, f, ct, rival), mine = pickOf(f, ct), many = games.length > 1;
      const dr = S.mp.draft[f] || (S.mp.draft[f] = {mid: mine ? mine.matchId : "", map: mine ? mine.map : "", side: mine ? mine.side : ""});
      const done = mine && (D.ms.find(x => x.id === mine.matchId) || {}).status === "played";
      const open = done ? [] : games.filter(m => ["free", "mine"].includes(gameState(m, ct)));
      if (dr.mid && !open.some(m => m.id === dr.mid)) dr.mid = "";
      if (!dr.mid && open.length === 1) dr.mid = open[0].id;
      const why = mapBlockedFor(ct, f), maps = M.cfg.maps.filter(x => x.on !== false), gOf = id => games.find(g => g.id === id) || {}, lg = id => legName(gOf(id)), lgl = id => lg(id).toLowerCase();
      const changed = !mine || mine.matchId !== dr.mid || mine.map !== dr.map || mine.side !== dr.side;
      const gBtn = m => { const st = gameState(m, ct), on = dr.mid === m.id, d = m.date ? fmtDate(m.date) : "día y hora a confirmar", off = st === "taken" || st === "played" || (done && st !== "mine");
        const badge = st === "taken" ? `Lo eligió ${rn}` : st === "played" ? "Ya se jugó" : st === "mine" ? "Tu elección" : done ? "No disponible" : "Libre";
        return `<button type="button" class="mp-game ${on ? "on" : ""} ${st}${off && st === "free" ? " taken" : ""}" data-mp-game="${m.id}" ${off ? "disabled" : ""} aria-pressed="${on}"><b>${legName(m)}</b><span>${esc(TM(m.a).name)} vs ${esc(TM(m.b).name)} · ${d}</span><em>${badge}</em></button>`; };
      root.innerHTML = `<div class="mp-head panel pad cut" style="--tc:${TM(ct).c}">
          <div class="mp-vs">${img(ct)}<b>${esc(TM(ct).name)}</b><span>vs</span><b>${rn}</b>${img(rival)}</div>
          <div class="mp-meta">${fechas.length > 1 ? `<select id="mpFecha" aria-label="Fecha">${fechas.map(x => `<option value="${x}" ${x === f ? "selected" : ""}>Fecha ${x}</option>`).join("")}</select>` : `<span class="mono">Fecha ${f}</span>`}<span class="muted">${many ? `Ida y vuelta: elegís uno de los dos partidos, el otro lo elige el capitán de ${rn}` : "Partido único"}</span></div>
          ${mine ? `<div class="mp-saved">✓ Elegiste ${many ? `la <b>${lgl(mine.matchId)}</b>: ` : ""}<b>${esc(mine.map)}</b> · arrancan en <b>${SIDE_L[mine.side] || "?"}</b> <span class="muted">· ${esc(mine.u || "")} · ${agoShort(mine.at)}</span></div>` : '<div class="mp-saved warn">Todavía no elegiste</div>'}</div>
        ${many || !open.length ? `<div class="h3" style="margin:18px 0 10px">${many ? "1 · ¿Ida o vuelta?" : "Partido"}</div><div class="mp-games">${games.map(gBtn).join("")}</div>
          ${!open.length ? `<p class="mp-note">${done ? "Tu partido ya se jugó: tu elección de esta fecha quedó fija." : `El capitán de ${rn} ya eligió y no te queda partido libre en esta fecha. Si es un error, pedile al staff que lo libere.`}</p>` : ""}` : ""}
        ${open.length ? `<div class="h3" style="margin:18px 0 10px">${many ? "2" : "1"} · Mapa</div>
        <div class="mp-maps">${maps.map(x => { const u = why(x.n); return `<button type="button" class="mp-tile ${dr.map === x.n && !u ? "on" : ""} ${u ? "used" : ""}" data-mp-map="${esc(x.n)}" ${u ? "disabled" : ""} style="--mc:${mapColor(x.n)}" aria-pressed="${dr.map === x.n}"><span>${esc(x.n)}</span>${u ? `<em>${u}</em>` : dr.map === x.n ? "<em>Elegido</em>" : ""}</button>`; }).join("")}</div>
        <div class="h3" style="margin:18px 0 10px">${many ? "3" : "2"} · Tu equipo arranca en</div>
        <div class="seg mp-side">${["atk", "def"].map(sd => `<button type="button" data-mp-side="${sd}" class="${dr.side === sd ? "on" : ""}">${SIDE_L[sd]}</button>`).join("")}</div>
        ${dr.side ? `<p class="mp-note">${dr.mid && many ? `En la <b>${lgl(dr.mid)}</b>: ` : ""}${esc(TM(ct).name)} arranca en <b>${SIDE_L[dr.side]}</b> y ${rn} en ${SIDE_L[SIDE_OPP[dr.side]]}.</p>` : ""}
        <div class="rowbtns" style="margin-top:18px"><button class="btn gold" id="mpSave" type="button" ${dr.mid && dr.map && dr.side && changed ? "" : "disabled"}>${mine ? "Guardar cambios" : "Guardar elección"}</button><span class="adm-note">${many ? "Elegís la ida o la vuelta, no las dos. " : ""}Lo podés cambiar hasta que se juegue. Los mapas tachados ya los jugó tu equipo o los elegiste en otra fecha.</span></div>` : ""}`;
    }
  }
  if (S.mp.link && !S.mp.scrolled && S.dbReady) { S.mp.scrolled = true; requestAnimationFrame(() => goView("elegir-mapa", {replace: true})); }
}
// Guarda la elección: toma la partida (y suelta la anterior si cambió) y guarda mapa y lado, todo junto.
async function saveMapPick(prev, pick) {
  if (!FDB) throw new Error("Sin conexión");
  const b = FDB.batch();
  if (prev && prev.matchId && prev.matchId !== pick.matchId) b.delete(FDB.doc(`mapclaims/${prev.matchId}`));
  b.set(FDB.doc(`mapclaims/${pick.matchId}`), {team: pick.team, fecha: pick.fecha, at: pick.at});
  b.set(FDB.doc(`mappicks/f${pick.fecha}_${pick.team}`), pick);
  await b.commit();
}
$("#mpRoot").addEventListener("click", async e => {
  if (e.target.closest("#mpLogin")) { openLogin(); return; }
  const ct = capTeam(), f = S.mp.fecha; if (!ct || f == null) return;
  const dr = S.mp.draft[f] || (S.mp.draft[f] = {mid: "", map: "", side: ""});
  const g = e.target.closest("[data-mp-game]"); if (g && !g.disabled) { dr.mid = g.dataset.mpGame; renderMapPick(); return; }
  const t = e.target.closest("[data-mp-map]"); if (t && !t.disabled) { dr.map = t.dataset.mpMap; renderMapPick(); return; }
  const sd = e.target.closest("[data-mp-side]"); if (sd) { dr.side = sd.dataset.mpSide; renderMapPick(); return; }
  const sv = e.target.closest("#mpSave"); if (!sv) return;
  const m = D.pending.find(x => x.id === dr.mid);
  if (!m || !dr.map || !dr.side) { toast("Elegí el partido (ida o vuelta), el mapa y el lado."); return; }
  if (gameState(m, ct) === "taken") { toast("Ese partido ya lo eligió el otro capitán."); renderMapPick(); return; }
  const blocked = mapBlockedFor(ct, f)(dr.map); if (blocked) { toast(`No podés elegir ${dr.map}: ${blocked.toLowerCase()}.`); return; }
  const c = S.captain, pick = {matchId: m.id, fecha: f, team: ct, map: dr.map, side: dr.side, by: c.uid, u: c.u, at: Date.now()};
  sv.disabled = true;
  try { await saveMapPick(pickOf(f, ct), pick); toast(`Guardado: ${dr.map} · arrancan en ${SIDE_L[dr.side]}.`, ct); }
  catch (er) { toast(er && er.code === "permission-denied" ? "No se pudo: ese partido ya lo eligió el otro capitán o ya se jugó." : "No se pudo guardar. Probá de nuevo."); sv.disabled = false; }
});
$("#mpRoot").addEventListener("change", e => { if (e.target.id === "mpFecha") { S.mp.fecha = +e.target.value; renderMapPick(); } });
// Estado de lo elegido en una fecha, por equipo (panel de staff y de ONYX Bot)
function mpRows(Dr, f) {
  const out = [], seen = new Set();
  Dr.pending.filter(m => m.fecha === f).forEach(m => [m.a, m.b].forEach(k => {
    if (seen.has(k)) return; seen.add(k);
    const rival = k === m.a ? m.b : m.a, games = seriesGames(Dr.ms, f, k, rival), pick = pickOf(f, k);
    out.push({k, rival, f, m: games[0] || m, games, pick, gm: pick ? games.find(g => g.id === pick.matchId) || null : null});
  }));
  return out;
}
const mpPickTxt = r => r.pick ? `<span>${r.games.length > 1 ? `${r.gm ? legName(r.gm) : "?"} · ` : ""}<b>${esc(r.pick.map)}</b> · ${SIDE_L[r.pick.side] || "?"}</span><small>${esc(r.pick.u || "")} · ${agoShort(r.pick.at)}</small>` : '<span class="mp-miss">Falta elegir</span>';
function capMapCard(k) {
  const m = D.pending.find(x => x.a === k || x.b === k); if (!m) return "";
  const f = m.fecha, rival = m.a === k ? m.b : m.a, games = seriesGames(D.ms, f, k, rival), pk = pickOf(f, k), g = pk ? games.find(x => x.id === pk.matchId) : null;
  return `<div class="adm-card"><h3>Mapa de la próxima fecha <small>Fecha ${f} · vs ${esc(TM(rival).name)}${games.length > 1 ? " · ida y vuelta" : ""}</small></h3>
    <p class="adm-note">${pk ? `Elegiste ${games.length > 1 && g ? `la <b style="color:#fff">${legName(g).toLowerCase()}</b>: ` : ""}<b style="color:#fff">${esc(pk.map)}</b> y arrancan en <b style="color:#fff">${SIDE_L[pk.side] || "?"}</b>.` : `Todavía no elegiste${games.length > 1 ? " si jugás la ida o la vuelta," : ""} el mapa ni el lado.`}</p>
    <div class="rowbtns"><button class="btn sm ${pk ? "ghost" : "gold"}" data-cap-act="mapa">${pk ? "Cambiar" : "Elegir"}</button></div></div>`;
}

/* ================= coaches y sueldos ================= */
// Los coaches son personas aparte (no juegan). Cada equipo que tiene fichado a un coach le paga un sueldo por semana:
// el servidor lo cobra solo cada lunes a las 00:00 (hora de Argentina). Si al equipo no le alcanzan las coins, el sueldo
// queda pendiente hasta la recarga: el equipo paga en dólares y el staff le renueva las coins. Las coins del coach
// son su saldo para canjear premios (1 coin = 1 punto).
const COACH_DEF = {salary: 150, usd: 5, refill: 6000};
const coachCfg = () => ({...COACH_DEF, ...((M && M.cfg && M.cfg.coach) || {})});
const coachList = () => Object.entries(S.remote.coaches || {}).map(([id, c]) => ({...c, id, teams: c.teams || {}})).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"));
const coachTeams = c => Object.keys(c.teams || {}).filter(k => TEAM_KEYS.includes(k));
const coachesOf = k => coachList().filter(c => c.teams[k]);
const salaryList = () => Object.entries(S.remote.salaries || {}).map(([id, s]) => ({...s, id})).sort((a, b) => String(b.week).localeCompare(String(a.week)) || (b.at || 0) - (a.at || 0));
const coachEarned = (cid, k) => salaryList().filter(s => s.coach === cid && s.status === "paid" && (!k || s.team === k)).reduce((a, s) => a + (+s.amt || 0), 0);
const teamPendSal = k => salaryList().filter(s => s.team === k && s.status === "pend");
const isCoachId = id => typeof id === "string" && id.startsWith("c:");
const coachIni = n => esc(String(n || "?").trim().slice(0, 2).toUpperCase());
// A quién se le canjea: jugador (id) o coach ("c:" + id)
const benef = id => { if (!id) return null; if (!isCoachId(id)) return D.PM[id] || null; const c = (S.remote.coaches || {})[id.slice(2)]; return c ? {id, name: c.name || "Coach", coach: true} : null; };
const saldoUnit = id => isCoachId(id) ? "coins" : "pts";
// Próximo lunes 00:00 de Argentina
function nextPayday() { const ART = -3 * 36e5, d = new Date(Date.now() + ART), dow = (d.getUTCDay() + 6) % 7; d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - dow + 7); return d.getTime() - ART; }
const payTxt = () => { const d = new Date(nextPayday() - 3 * 36e5); return `lunes ${d.getUTCDate()}/${d.getUTCMonth() + 1}`; };
const sinceTxt = t => t ? new Date(t).toLocaleDateString("es-AR", {day: "2-digit", month: "2-digit", timeZone: "America/Argentina/Buenos_Aires"}) : "?";

// Público: lista de coaches en la sección Equipos
function renderCoaches() {
  const box = $("#coachesBox"); if (!box) return;
  const L = coachList(), C = coachCfg();
  box.innerHTML = `<div class="h3"><svg class="ic"><use href="#i-whistle"/></svg>Coaches <small>cada equipo le paga ${fmt(C.salary)} ONYX Coins por semana a cada coach que tiene</small></div>
    ${L.length ? `<div class="coach-list">${L.map(c => { const ks = coachTeams(c);
      return `<div class="coach-row"><span class="ava">${coachIni(c.name)}</span><div class="cr-n"><b>${esc(c.name)}</b><small>${ks.length ? "Coach de " + ks.map(k => esc(TM(k).name)).join(" y ") : "Sin equipo"}</small></div>
        <div class="cr-t">${ks.map(k => img(k)).join("")}</div>
        <div class="cr-v"><span><b>${fmt(ks.length * C.salary)}</b> por semana</span><span class="coins"><i class="coin"></i>${fmt(saldoOf("c:" + c.id))}</span></div></div>`; }).join("")}</div>`
      : '<p class="muted" style="margin-top:10px">Todavía no hay coaches. Los carga el staff y los capitanes los piden desde su panel.</p>'}
    <p class="adm-note" style="margin-top:12px">El sueldo se paga solo cada lunes a las 00:00 (el próximo es el ${payTxt()}). Las coins del coach son su saldo para canjear premios.</p>`;
}

// Mercado: los capitanes también fichan coaches desde acá
function renderMkCoaches() {
  const box = $("#mkCoaches"); if (!box) return;
  const ct = capTeam(), L = coachList(), C = coachCfg(), reqs = ct ? capReqs() : [];
  box.innerHTML = L.length ? L.map(c => { const ks = coachTeams(c), mine = ct && c.teams[ct], rq = reqs.find(r => r.status === "pend" && r.coach === c.id && (r.type === "coach" || r.type === "coachOut"));
    return `<div class="offer"><span class="ava" style="width:30px;height:30px;font-size:11px">${coachIni(c.name)}</span><div><b>${esc(c.name)}</b><div class="muted" style="font-size:12px">${ks.length ? "Coach de " + ks.map(k => esc(TM(k).name)).join(", ") : "Sin equipo"}</div></div>
      ${!ct ? "" : mine ? '<span class="st ok">Es tu coach</span>' : rq ? '<span class="st pend">Pedido enviado</span>' : `<button class="btn sm" data-mkc="${c.id}">Pedir</button>`}</div>`; }).join("")
    + `<p class="adm-note" style="margin-top:4px">Cada coach cobra ${fmt(C.salary)} coins por semana de cada equipo que lo tiene. Se paga solo los lunes.</p>`
    : '<p class="muted" style="font-size:14px">Todavía no hay coaches cargados.</p>';
}
$("#mkCoaches").addEventListener("click", async e => { const b = e.target.closest("[data-mkc]"); if (!b) return; b.disabled = true; try { await requestCoach(b.dataset.mkc, "coach"); } finally { schedule(); } });

// Capitán: pedir el fichaje o la baja de un coach (lo aprueba el staff)
async function requestCoach(cid, type) {
  const c = (S.remote.coaches || {})[cid], k = capTeam(); if (!c || !k) return;
  if (capReqs().some(r => r.status === "pend" && r.coach === cid && (r.type === "coach" || r.type === "coachOut"))) { toast("Ya hay un pedido esperando al staff para ese coach."); return; }
  await save(`requests/${newId("q")}`, {...capReqBase(), type, coach: cid, name: String(c.name || "").slice(0, 40)});
  toast(type === "coach" ? `Pediste fichar a ${c.name}. El staff lo revisa.` : `Pediste dar de baja a ${c.name}. El staff lo revisa.`, k);
}
function capCoachCard(k) {
  const C = coachCfg(), mine = coachesOf(k), others = coachList().filter(c => !c.teams[k]), reqs = capReqs();
  const pendReq = id => reqs.find(r => r.status === "pend" && r.coach === id && (r.type === "coach" || r.type === "coachOut"));
  const pend = teamPendSal(k), owed = pend.reduce((a, s) => a + (+s.amt || 0), 0);
  return `<div class="adm-card" id="capCoach"><h3><svg class="ic"><use href="#i-whistle"/></svg>Coach <small>sueldo: ${fmt(C.salary)} coins por semana por coach · próximo pago: ${payTxt()}</small></h3>
    ${pend.length ? `<div class="ex-banner" style="margin:0"><span><b>Faltan coins para el sueldo.</b> Tu equipo debe ${pend.length} sueldo${pend.length > 1 ? "s" : ""} (${fmt(owed)} coins). Pagale ${usdTxt(C.usd)} al staff y te renuevan las coins a ${fmt(C.refill)}.</span></div>` : ""}
    <div style="display:grid;gap:6px">${mine.map(c => { const rq = pendReq(c.id);
      return `<div class="cap-row"><div class="top"><span class="ava" style="--tc:${TM(k).c}">${coachIni(c.name)}</span><div style="min-width:0"><b>${esc(c.name)}</b><small>Desde el ${sinceTxt(c.teams[k].since)} · le pagaron ${fmt(coachEarned(c.id, k))} coins</small></div>
        <div class="vals"><span>Sueldo <b>${fmt(C.salary)}</b> por semana</span></div>
        ${rq ? '<span class="st pend">Baja en revisión</span>' : `<button class="btn sm ghost" data-cap-act="coach-out:${c.id}">Pedir la baja</button>`}</div></div>`; }).join("") || '<p class="adm-note">Tu equipo todavía no tiene coach.</p>'}</div>
    ${others.length ? `<div class="fgrid">${fld("Fichar un coach", `<select id="ccSel">${others.map(c => { const ks = coachTeams(c), rq = pendReq(c.id); return opt(c.id, `${c.name}${ks.length ? " · coach de " + ks.map(x => TM(x).name).join(", ") : ""}${rq ? " · pedido enviado" : ""}`); }).join("")}</select>`)}</div>
      <div class="rowbtns"><button class="btn sm gold" data-cap-act="coach-req">Pedir el fichaje al staff</button><span class="adm-note">Un coach puede estar en varios equipos: cada uno le paga su sueldo. Desde que el staff lo aprueba, tu equipo le paga ${fmt(C.salary)} coins cada lunes.</span></div>`
      : '<p class="adm-note">No hay más coaches para fichar. Los carga el staff.</p>'}</div>`;
}

// Staff: pestaña Coaches
async function coachAction(act, a, b) {
  const R = RM(), C = coachCfg();
  if (act === "coach-add") {
    const name = ($("#coName").value || "").trim().replace(/\s+/g, " ").slice(0, 40), note = ($("#coNote").value || "").trim().slice(0, 120);
    if (name.length < 2) { toast("Escribí el nombre del coach."); return; }
    if (coachList().some(c => String(c.name || "").toLowerCase() === name.toLowerCase())) { toast("Ya hay un coach con ese nombre."); return; }
    await save(`coaches/${newId("co")}`, {name, note, teams: {}, at: Date.now(), by: S.staff.u});
    audit(`Agregó el coach ${name}`); toast(`Listo: ${name} ya está en la lista de coaches.`); renderAdminSoon(); return;
  }
  const cid = a[0], c = clone((S.remote.coaches || {})[cid]); if (!c) return; c.teams = c.teams || {};
  if (act === "coach-sign") {
    const k = ($(`#coT-${cid}`) || {}).value; if (!k || !R.teams[k]) { toast("Elegí un equipo."); return; }
    if (c.teams[k]) { toast(`${c.name} ya es coach de ${R.teams[k].name}.`); return; }
    c.teams[k] = {since: Date.now(), by: S.staff.u}; await save(`coaches/${cid}`, c);
    audit(`Fichó al coach ${c.name} en ${R.teams[k].name} (sueldo ${fmt(C.salary)} por semana)`); toast(`${c.name} ahora es coach de ${R.teams[k].name}.`, k);
  } else if (act === "coach-out") {
    if (!arm(b)) return; const k = a[1]; delete c.teams[k]; await save(`coaches/${cid}`, c);
    audit(`Dio de baja al coach ${c.name} de ${R.teams[k] ? R.teams[k].name : k}`); toast(`${c.name} ya no es coach de ${R.teams[k] ? R.teams[k].name : k}.`);
  } else if (act === "coach-del") {
    if (coachTeams(c).length) { toast("Primero dalo de baja de todos sus equipos."); return; }
    if (!arm(b)) return; await save(`coaches/${cid}`, null, "del"); audit(`Borró al coach ${c.name}`); toast(`${c.name} borrado.`);
  }
  renderAdminSoon();
}
// Recarga: el equipo pagó en dólares → se le renuevan las coins y se pagan los sueldos que debía
async function topupTeam(k, b) {
  const C0 = coachCfg(), lim = +C0.maxRefills || 0;
  if (lim && refillsOf(k) >= lim) { toast(`${RM().teams[k].name} ya usó las ${lim} recargas de la temporada.`); return; }
  if (!arm(b)) return;
  const C = coachCfg(), R = RM(), pend = teamPendSal(k), owed = pend.reduce((a, s) => a + (+s.amt || 0), 0), t = teamDoc(k), before = +t.coins || 0, now = Date.now();
  t.coins = C.refill - owed; await save(`teams/${k}`, t);
  for (const s of pend) await save(`salaries/${s.id}`, {status: "paid", paidAt: now, via: "recarga", paidBy: S.staff.u}, "update");
  await save(`topups/${newId("u")}`, {team: k, usd: +C.usd, coins: +C.refill, before, settled: owed, n: pend.length, at: now, by: S.staff.u});
  await addLedger({type: "recarga", dir: "in", usd: +C.usd, team: k, who: `Recarga de coins (${fmt(C.refill)})`, ref: "topup"}).catch(() => {});
  audit(`Recarga de ${R.teams[k].name}: pagó ${usdTxt(C.usd)}, coins renovadas a ${fmt(C.refill)}${pend.length ? ` y se pagaron ${pend.length} sueldo${pend.length > 1 ? "s" : ""} pendiente${pend.length > 1 ? "s" : ""} (${fmt(owed)})` : ""}`);
  toast(`Listo: ${R.teams[k].name} quedó con ${fmt(t.coins)} coins.`, k); renderAdminSoon();
}
function admCoaches(R) {
  const C = coachCfg(), L = coachList(), sal = salaryList(), now = Date.now();
  const debt = TEAM_KEYS.map(k => ({k, pend: teamPendSal(k)})).filter(x => x.pend.length);
  const weeks = Object.entries(S.remote.payroll || {}).map(([id, w]) => ({id, ...w})).sort((a, b) => b.id.localeCompare(a.id)).slice(0, 4);
  const tops = Object.entries(S.remote.topups || {}).map(([id, x]) => ({id, ...x})).sort((a, b) => b.at - a.at).slice(0, 8);
  const weekly = L.reduce((a, c) => a + coachTeams(c).length * C.salary, 0);
  const add = `<div class="adm-card"><h3>Agregar un coach <small>los coaches no juegan: no aparecen en la tabla ni en las estadísticas</small></h3>
    <div class="fgrid">${fld("Nombre", `<input id="coName" maxlength="40" placeholder="Nick o nombre" autocomplete="off">`)}${fld("Nota (opcional)", `<input id="coNote" maxlength="120" placeholder="Discord, contacto, etc." autocomplete="off">`)}</div>
    <div class="rowbtns"><button class="btn sm gold" data-act="coach-add">Agregar coach</button><span class="adm-note">Después lo fichás en un equipo acá abajo, o el capitán lo pide desde su panel y lo aprobás en Solicitudes.</span></div></div>`;
  const list = `<div class="adm-card"><h3>Coaches <small>${L.length} · los equipos pagan ${fmt(weekly)} coins por semana en total</small></h3>
    <div style="display:grid;gap:8px">${L.map(c => { const ks = coachTeams(c), free = TEAM_KEYS.filter(k => !c.teams[k]);
      return `<div class="coach-adm"><div class="ca-h"><span class="ava">${coachIni(c.name)}</span><div><b>${esc(c.name)}</b><small>${c.note ? esc(c.note) + " · " : ""}cobró ${fmt(coachEarned(c.id))} · saldo ${fmt(saldoOf("c:" + c.id))} coins</small></div>
          <button class="btn sm ghost ultra-only" data-act="coach-del:${c.id}" ${ks.length ? 'disabled title="Primero dalo de baja de sus equipos"' : ""}>Borrar</button></div>
        <div class="ca-t">${ks.map(k => `<span class="chip on" style="--tc:${R.teams[k].c}">${img(k)}${esc(R.teams[k].name)} · desde ${sinceTxt(c.teams[k].since)}<button class="chip-x" data-act="coach-out:${c.id}:${k}" aria-label="Dar de baja de ${esc(R.teams[k].name)}" title="Dar de baja">✕</button></span>`).join("") || '<span class="adm-note">Sin equipo</span>'}</div>
        ${free.length ? `<div class="rowbtns"><select class="cell-in" id="coT-${c.id}" style="width:auto" aria-label="Equipo para ${esc(c.name)}">${free.map(k => opt(k, R.teams[k].name)).join("")}</select><button class="btn sm" data-act="coach-sign:${c.id}">Fichar en este equipo</button></div>` : ""}</div>`; }).join("") || '<p class="adm-note">Todavía no hay coaches.</p>'}</div></div>`;
  const cfg = `<div class="adm-card"><h3>Sueldos <small>se cobran solos cada lunes a las 00:00 (hora de Argentina) · próximo: ${payTxt()}</small></h3>
    <div class="fgrid">${fld("Sueldo por semana (coins)", `<input type="number" min="0" step="10" value="${C.salary}" data-bind="cfg:coach.salary" data-t="n" ${isUltra() ? "" : "disabled"}>`)}
      ${fld("Recarga: el equipo paga (US$)", `<input type="number" min="0" step="1" value="${C.usd}" data-bind="cfg:coach.usd" data-t="n" ${isUltra() ? "" : "disabled"}>`)}
      ${fld("Recarga: coins que recibe", `<input type="number" min="0" step="100" value="${C.refill}" data-bind="cfg:coach.refill" data-t="n" ${isUltra() ? "" : "disabled"}>`)}</div>
    <p class="adm-note">Un coach fichado antes del lunes cobra ese lunes; si lo fichan el lunes, cobra desde el lunes siguiente. Si un equipo tiene varios coaches, paga un sueldo por cada uno. Si no le alcanzan las coins, el sueldo queda pendiente y se paga solo apenas le alcance (o con la recarga).${isUltra() ? "" : " Los montos los cambia ultra staff."}</p>
    ${weeks.length ? `<div class="sal-weeks">${weeks.map(w => `<div><b>${sinceTxt(Date.parse(w.id + "T12:00:00-03:00"))}</b><span>${w.status === "done" ? `${w.paid || 0} pagados${w.pend ? ` · ${w.pend} pendientes` : ""}${w.settled ? ` · ${w.settled} deudas saldadas` : ""} · ${fmt(w.total || 0)} coins` : w.status === "error" ? "Error: " + esc(w.error || "") : "Pagando…"}</span></div>`).join("")}</div>` : '<p class="adm-note">Todavía no se pagó ninguna semana.</p>'}</div>`;
  const dbt = `<div class="adm-card"><h3>Equipos sin coins para el sueldo <small>${debt.length ? debt.length + " con sueldos pendientes" : "ninguno"}</small></h3>
    ${debt.length ? `<div style="display:grid;gap:6px">${debt.map(x => { const owed = x.pend.reduce((a, s) => a + (+s.amt || 0), 0);
      return `<div class="req" style="--st:var(--loss)">${img(x.k)}<div><div class="rq-t"><b>${esc(R.teams[x.k].name)}</b> debe ${x.pend.length} sueldo${x.pend.length > 1 ? "s" : ""} (${fmt(owed)} coins) · tiene ${fmt(R.teams[x.k].coins)}</div>
        <div class="rq-m">${x.pend.map(s => `${esc(s.coachName || "coach")} · semana del ${sinceTxt(Date.parse(s.week + "T12:00:00-03:00"))}`).join(" · ")}</div></div>
        <div class="rq-acts"><button class="btn sm gold" data-act="topup:${x.k}">Pagó ${usdTxt(C.usd)}: renovar a ${fmt(C.refill)}</button></div></div>`; }).join("")}</div>
      <p class="adm-note">Al registrar la recarga, el equipo queda con ${fmt(C.refill)} coins menos lo que debía, y esos sueldos se le pagan al coach.</p>` : '<p class="adm-note">Todos los equipos pudieron pagar sus sueldos.</p>'}</div>`;
  const hist = `<div class="adm-card"><h3>Últimos sueldos</h3><div style="display:grid;gap:4px">${sal.slice(0, 16).map(s => `<div class="offer-adm">${img(s.team)}<div><b>${esc(s.coachName || "Coach")}</b> · ${esc(R.teams[s.team] ? R.teams[s.team].name : s.team)} · <span class="mono">${fmt(s.amt)}</span><div class="adm-note">Semana del ${sinceTxt(Date.parse(s.week + "T12:00:00-03:00"))}${s.via === "recarga" ? " · pagado con la recarga" : ""}</div></div><span class="st ${s.status === "paid" ? "ok" : "pend"}">${s.status === "paid" ? "Pagado" : "Pendiente"}</span></div>`).join("") || '<p class="adm-note">Todavía no hay sueldos.</p>'}</div>
    ${tops.length ? `<h3 style="margin-top:6px">Recargas</h3><div style="display:grid;gap:4px">${tops.map(x => `<div class="offer-adm">${img(x.team)}<div><b>${esc(R.teams[x.team] ? R.teams[x.team].name : x.team)}</b> pagó ${usdTxt(x.usd)} · coins a ${fmt(x.coins)}${x.settled ? ` · saldó ${fmt(x.settled)}` : ""}<div class="adm-note">${new Date(x.at).toLocaleString("es-AR", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"})} · ${esc(x.by || "")}</div></div><span></span></div>`).join("")}</div>` : ""}</div>`;
  return dbt + add + list + cfg + hist;
}

/* ================= canjes de premios ================= */
// Saldo para canjes = puntos individuales ganados − canjes con puntos pedidos o aprobados.
const prizeList = () => Object.entries(S.remote.prizes).map(([id, p]) => ({id, ...p})).sort((a, b) => (+a.order || 0) - (+b.order || 0) || (b.at || 0) - (a.at || 0));
const redeemList = () => Object.entries(S.remote.redeems).map(([id, r]) => ({id, ...r})).sort((a, b) => (b.at || 0) - (a.at || 0));
// pid: id de jugador, o "c:" + id para un coach (su saldo son las coins que cobró de sueldo)
function spentOf(pid, exceptId) { const c = isCoachId(pid) ? pid.slice(2) : null; return redeemList().filter(r => !r.arch && (c ? r.coach === c : r.pid === pid && !r.coach) && r.method === "pts" && (r.status === "pend" || r.status === "ok") && r.id !== exceptId).reduce((s, r) => s + (+r.pts || 0), 0); }
function saldoOf(pid, exceptId) { return Math.max(0, (isCoachId(pid) ? coachEarned(pid.slice(2)) : ptsSum(pid)) - spentOf(pid, exceptId)); }
const usdTxt = v => "US$ " + (+v).toLocaleString("es-AR", {maximumFractionDigits: 2});
const prizeStock = p => p.stock == null || p.stock === "" ? null : Math.max(0, +p.stock);
const RD_ST = {pend: ["Esperando al staff", "pend"], ok: ["Aprobado", "ok"], no: ["Rechazado", "no"]};
function renderCanjes() {
  const ct = capTeam(), list = prizeList().filter(p => p.active !== false), sel = $("#cjPlayer");
  if (!benef(S.cjPid)) S.cjPid = ct ? (roster(ct)[0] || {}).id || "" : "";
  const cOpt = c => `<option value="c:${c.id}">${esc(c.name)} (coach)</option>`, others = coachList().filter(c => !ct || !c.teams[ct]);
  sel.innerHTML = '<option value="">Elegí un jugador o coach</option>' + (ct ? `<optgroup label="Tu equipo">${roster(ct).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}${coachesOf(ct).map(cOpt).join("")}</optgroup>` : "")
    + TEAM_KEYS.filter(k => k !== ct).map(k => `<optgroup label="${esc(TM(k).name)}">${roster(k).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</optgroup>`).join("")
    + (others.length ? `<optgroup label="Coaches">${others.map(cOpt).join("")}</optgroup>` : "");
  sel.value = S.cjPid || "";
  const pick = benef(S.cjPid), saldo = pick ? saldoOf(pick.id) : null;
  $("#cjSaldoVal").textContent = pick ? `${fmt(saldo)} ${saldoUnit(pick.id)}` : "–";
  $("#cjNote").innerHTML = ct ? `<span>Sos capitán de <b>${esc(TM(ct).name)}</b>: tocá <b>Canjear</b> en un premio y elegí para qué jugador es.</span>`
    : S.captain ? "<span>Todavía no tenés equipo asignado: pedile a un ultra staff que te asigne uno.</span>"
    : '<span>Solo los capitanes pueden canjear. Si sos capitán, <button class="linkish" id="cjLogin" type="button">entrá con tu cuenta</button>.</span>';
  $("#cjGrid").innerHTML = list.map(p => {
    const st = prizeStock(p), out = st === 0, cost = +p.pts || 0;
    const prog = pick && cost ? `<div class="cj-prog"><i style="--w:${Math.min(100, saldo / cost * 100).toFixed(0)}%"></i><span>${saldo >= cost ? `A ${esc(pick.name)} le alcanza` : `A ${esc(pick.name)} le faltan ${fmt(cost - saldo)} ${saldoUnit(pick.id)}`}</span></div>` : "";
    return `<article class="cj-card cut tilt ${out ? "out" : ""}"><div class="glare"></div>
      <div class="cj-img">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : `<span>${esc(String(p.name || "?").slice(0, 2).toUpperCase())}</span>`}${out ? '<em class="cj-tag">AGOTADO</em>' : st != null ? `<em class="cj-tag">QUEDAN ${st}</em>` : ""}</div>
      <div class="cj-b"><h3>${esc(p.name)}</h3>${p.desc ? `<p>${esc(p.desc)}</p>` : ""}
        <div class="cj-cost">${cost ? `<span class="pts"><b>${fmt(cost)}</b> pts</span>` : ""}${cost && p.usd != null && p.usd !== "" ? '<span class="o">o</span>' : ""}${p.usd != null && p.usd !== "" ? `<span class="usd"><b>${usdTxt(p.usd)}</b></span>` : ""}${!cost && (p.usd == null || p.usd === "") ? '<span class="muted">Precio a confirmar</span>' : ""}</div>
        ${prog}
        <div class="cj-foot">${!ct ? '<span class="adm-note">Solo capitanes</span>' : out ? '<button class="btn sm ghost" disabled>Agotado</button>' : `<button class="btn sm gold" data-cj="${p.id}">Canjear</button>`}</div></div></article>`;
  }).join("") || '<p class="muted">Todavía no hay premios cargados.</p>';
  const row = r => { const st = RD_ST[r.status] || ["?", "pend"]; return `<div class="offer">${img(r.team)}<div><b>${esc(r.player || "Jugador")}</b><div class="muted" style="font-size:12px">${esc(r.prize || "Premio")} · ${r.method === "usd" ? usdTxt(r.usd || 0) : fmt(r.pts) + " pts"}${r.delivered ? " · entregado" : ""}${r.staffNote ? " · " + esc(r.staffNote) : ""}</div></div><span class="st ${st[1]}">${st[0]}</span></div>`; };
  const mine = ct ? redeemList().filter(r => r.team === ct) : [];
  $("#cjMineBox").hidden = !ct; $("#cjMine").innerHTML = mine.length ? mine.slice(0, 12).map(row).join("") : '<p class="muted" style="font-size:14px">Todavía no pediste canjes.</p>';
  const last = redeemList().filter(r => r.status === "ok").slice(0, 8);
  $("#cjLast").innerHTML = last.length ? last.map(r => `<div class="offer">${img(r.team)}<div><b>${esc(r.player || "Jugador")}</b><div class="muted" style="font-size:12px">canjeó ${esc(r.prize || "un premio")}</div></div><span class="mono muted" style="font-size:11px">${new Date(r.reviewedAt || r.at).toLocaleDateString("es-AR")}</span></div>`).join("") : '<p class="muted" style="font-size:14px">Todavía no hay canjes.</p>';
}
function openCanje(prizeId) {
  const ct = capTeam(), p = S.remote.prizes[prizeId]; if (!p) return;
  if (!ct) { toast("Solo los capitanes pueden canjear. Entrá con tu cuenta de capitán."); return; }
  const rs = [...roster(ct), ...coachesOf(ct).map(c => ({id: "c:" + c.id, name: c.name, coach: true}))].sort((a, b) => saldoOf(b.id) - saldoOf(a.id)), cost = +p.pts || 0, hasUsd = p.usd != null && p.usd !== "";
  if (!rs.length) { toast("Tu equipo todavía no tiene jugadores ni coach cargados."); return; }
  const t = TM(ct);
  modal(`<div class="box cut" style="--tc:${t.c}"><div class="bh">${p.img ? `<img src="${esc(p.img)}" alt="" style="width:72px;height:72px;object-fit:cover">` : img(ct)}<div><div class="eyebrow">Canje de premio</div><h3>${esc(p.name)}</h3><div class="muted" style="font-size:14px">${cost ? fmt(cost) + " pts" : ""}${cost && hasUsd ? " o " : ""}${hasUsd ? usdTxt(p.usd) : ""}</div></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="bb"><div class="ff"><label for="cjWho">Para quién</label><select id="cjWho">${rs.map(x => `<option value="${x.id}" ${x.id === S.cjPid ? "selected" : ""}>${esc(x.name)}${x.coach ? " (coach)" : ""} · saldo ${fmt(saldoOf(x.id))} ${saldoUnit(x.id)}</option>`).join("")}</select></div>
      <div class="ff"><label>Cómo se paga</label><div class="seg" id="cjHow">${cost ? `<button type="button" data-m="pts" class="on">Con puntos</button>` : ""}${hasUsd ? `<button type="button" data-m="usd" class="${cost ? "" : "on"}">En dólares</button>` : ""}</div></div>
      <div class="ff"><label for="cjMsg">Mensaje para el staff (opcional)</label><input id="cjMsg" maxlength="200" autocomplete="off" placeholder="Ej: cuenta de Riot, talle, etc."></div>
      <div class="checks" id="cjChecks"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn gold" id="cjSend">Pedir canje</button><button class="btn ghost" data-close>Cancelar</button></div></div></div>`);
  let how = cost ? "pts" : "usd";
  const upd = () => {
    const pid = $("#cjWho").value, sal = saldoOf(pid), st = prizeStock(p);
    const ch = [[st == null || st > 0, st == null ? "Hay stock" : `Quedan ${st}`], [how === "usd" || sal >= cost, how === "usd" ? `Se paga ${usdTxt(p.usd)}: el staff te dice cómo` : `Saldo de ${benef(pid) ? benef(pid).name : "?"}: ${fmt(sal)} de ${fmt(cost)} ${saldoUnit(pid)}`]];
    $("#cjChecks").innerHTML = ch.map(([ok, l]) => `<div class="${ok ? "okc" : "bad"}">${ok ? "✓" : "✕"} <span style="color:var(--fg)">${esc(l)}</span></div>`).join("");
    $("#cjSend").disabled = !ch.every(c => c[0]);
  };
  $("#cjWho").addEventListener("change", upd);
  $("#cjHow").addEventListener("click", e => { const b = e.target.closest("[data-m]"); if (!b) return; how = b.dataset.m; $$("#cjHow button").forEach(x => x.classList.toggle("on", x === b)); upd(); });
  upd();
  $("#cjSend").addEventListener("click", async () => {
    const pid = $("#cjWho").value, pl = benef(pid), c = S.captain;
    if (!S.db || !c || !pl) { closeModal(); toast("Tu sesión de capitán no está activa. Volvé a entrar."); return; }
    const who = isCoachId(pid) ? {coach: pid.slice(2)} : {pid};
    const doc = {prizeId, prize: String(p.name || "").slice(0, 60), ...who, player: pl.name, team: ct, method: how, pts: how === "pts" ? cost : 0, usd: hasUsd ? +p.usd : null,
      note: $("#cjMsg").value.trim().slice(0, 200), by: c.uid, u: c.u, at: Date.now(), status: "pend"};
    closeModal();
    try { await save(`redeems/${newId("c")}`, doc); toast(`Pedido enviado: ${p.name} para ${pl.name}. El staff lo revisa.`, ct); } catch (e) { /* toast ya mostrado */ }
  });
}
$("#cjGrid").addEventListener("click", e => { const b = e.target.closest("[data-cj]"); if (b) openCanje(b.dataset.cj); });
$("#cjPlayer").addEventListener("change", e => { S.cjPid = e.target.value; renderCanjes(); });
$("#cjNote").addEventListener("click", e => { if (e.target.id === "cjLogin") openLogin(); });

/* ================= mercado ================= */
function myOffers() { const d = S.uid && S.remote.offers[S.uid]; return (d && Array.isArray(d.items)) ? d.items : []; }
function allOffers() { const out = []; Object.entries(S.remote.offers).forEach(([uid, d]) => (d.items || []).forEach(o => out.push({...o, team: d.team || o.team, uid}))); return out.sort((a, b) => b.at - a.at); }
function signings(k) { return M.transfers.filter(t => t.to === k && (t.win ?? 0) === M.cfg.windowId).length; }
const marketAccess = () => !!(S.captain || S.staff);
function renderMarket() {
  const acc = marketAccess();
  $("#mkLock").hidden = acc; $("#mkBody").hidden = !acc; $("#navMk").hidden = !acc; $("#heroMk").hidden = !acc; $("#mgrCoinsBox").hidden = !acc;
  if (!acc) { ["#cards", "#myOffers", "#allOffers", "#wallet"].forEach(id => { $(id).innerHTML = ""; }); return; }
  const t = TM(S.my), r = D.real.find(x => x.k === S.my), w = $("#wallet");
  w.style.setProperty("--tc", t.c);
  w.innerHTML = `${img(S.my)}<div><div class="mono muted" style="font-size:12px;letter-spacing:.14em">PRESUPUESTO DE ${esc(t.name)}</div>
    <div class="bal"><i class="coin"></i><span>${fmt(t.coins)}</span><small class="mono muted" style="font-size:14px">ONYX Coins</small></div>
    <div class="meta"><span>Plantel <b>${roster(S.my).length}/${M.cfg.rosterMax}</b></span><span>Fichajes en esta ventana <b>${signings(S.my)}/${M.cfg.maxSign}</b></span><span>Posición <b>${r ? r.pos : "–"}°</b></span><span>Valor del plantel <b>${fmt(roster(S.my).reduce((s, p) => s + p.value, 0))}</b></span></div></div>
    <div class="window"><div class="open" style="${M.cfg.windowOpen ? "" : "color:var(--loss)"}">${M.cfg.windowOpen ? "VENTANA ABIERTA" : "VENTANA CERRADA"}</div><div class="t mono" id="winLeft">${windowLeft()}</div><div class="muted" style="font-size:12px">${M.cfg.windowClose ? "cierra " + fmtDate(M.cfg.windowClose) : ""}</div></div>`;
  const {cat, role, team, sort, q} = S.mk;
  let L = D.P.filter(p => (cat === "all" || catOf(p.value) === cat) && (role === "all" || p.role === role) && (team === "all" || (team === "free" ? !p.team : p.team === team)) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  L.sort((a, b) => sort === "v" ? b.value - a.value : sort === "acs" ? b.s.acs - a.s.acs : b.s.kd - a.s.kd);
  const ct = capTeam(), pendingIds = new Set(ct ? allOffers().filter(o => o.status === "pend" && o.team === ct).map(o => o.pid) : []);
  $("#cards").innerHTML = L.map(p => {
    const tt = p.team ? TM(p.team) : null, own = !!ct && p.team === ct, pend = pendingIds.has(p.id);
    return `<article class="pcard cut tilt" style="--tc:${tt ? tt.c : "#8f8aa6"}">${!p.team ? '<span class="free-tag">LIBRE</span>' : ""}<div class="glare"></div>
      <div class="top">${p.team ? img(p.team) : `<span class="ava" style="--tc:#5b5675;width:44px;height:48px">${esc(p.name.slice(0, 2).toUpperCase())}</span>`}
        <div style="min-width:0"><div class="nm">${esc(p.name)}</div><div class="rl">${p.role} · ${tt ? esc(tt.name) : esc(p.rank || "Agente libre")}</div></div><span class="cat ${catOf(p.value)}" title="Categoría ${catOf(p.value)}">${catOf(p.value)}</span></div>
      <div class="pstats"><div><b>${p.s.m ? dec(p.s.kd) : "–"}</b><span>K/D</span></div><div><b>${p.s.m ? p.s.acs : "–"}</b><span>ACS</span></div><div><b>${p.s.m}</b><span>PJ</span></div></div>
      ${p.clause ? `<div class="clause">${LOCK_SVG}Cláusula de rescisión <b>${fmt(p.clause)}</b></div>` : ""}
      <button class="an-link" data-an-card="${p.id}">Ver análisis${(scLeague().all[p.id] || {}).rating != null ? ` · rating ${scLeague().all[p.id].rating}` : ""}</button>
      <div class="price"><span class="v"><i class="coin"></i>${fmt(p.value)}</span>${!ct ? `<span class="adm-note">${S.captain ? "Sin equipo asignado" : "Solo capitanes"}</span>` : own ? '<button class="btn sm ghost" disabled>Tu plantel</button>' : pend ? '<button class="btn sm ghost" disabled>Oferta enviada</button>' : `<button class="btn sm gold" data-offer="${p.id}">Ofertar</button>`}</div></article>`;
  }).join("") || '<p class="muted">Ningún jugador coincide con los filtros.</p>';
  const lab = {pend: "Esperando", ok: "Aceptada", no: "Rechazada"};
  const offerRow = o => { const p = D.PM[o.pid]; return `<div class="offer">${img(o.team)}<div><b>${p ? esc(p.name) : "Jugador borrado"}</b><div class="muted" style="font-size:12px">${esc(TM(o.team).name)} ofrece <span class="mono" style="color:var(--gold)">${fmt(o.amt)}</span>${o.note ? " · " + esc(o.note) : ""}</div></div><span class="st ${o.status === "ok" ? "ok" : o.status === "no" ? "no" : "pend"}">${lab[o.status] || o.status}</span></div>`; };
  const mine = myOffers().slice().sort((a, b) => b.at - a.at);
  $("#myOffers").innerHTML = !ct ? '<p class="muted" style="font-size:14px">Solo los capitanes pueden fichar. Si sos capitán, entrá con tu cuenta desde “Acceso staff y capitanes”, al pie de la página.</p>' : M.ex ? '<p class="muted" style="font-size:14px">En el modo de ejemplo las ofertas no se envían.</p>' : !S.db ? '<p class="muted" style="font-size:14px">Las ofertas se envían cuando la página está conectada a Firebase.</p>' : mine.length ? mine.map(offerRow).join("") : '<p class="muted" style="font-size:14px">Todavía no ofertaste. Elegí un jugador y tocá “Ofertar”.</p>';
  const pend = allOffers().filter(o => o.status === "pend");
  $("#allOffers").innerHTML = pend.length ? pend.slice(0, 12).map(offerRow).join("") : '<p class="muted" style="font-size:14px">No hay ofertas esperando respuesta.</p>';
  $("#feed").innerHTML = [...M.transfers].sort((a, b) => b.at - a.at).map(f => `<div>${f.from ? img(f.from) : `<span class="ava" style="--tc:#5b5675;width:22px;height:24px;font-size:9px">AL</span>`}<b>${esc(f.name)}</b><span class="arrow">→</span>${f.to ? img(f.to) : `<span class="muted" style="font-size:12px">libre</span>`}<span class="amt">${f.amt ? fmt(f.amt) : "–"}</span></div>`).join("") || '<p class="muted" style="font-size:14px">Sin fichajes todavía.</p>';
  const C = M.cfg.coin;
  $("#earnList").innerHTML = `<div>Victoria<b>+${fmt(C.w)}</b></div><div>Victoria en prórroga<b>+${fmt(C.otw)}</b></div><div>Derrota en prórroga<b>+${fmt(C.otl)}</b></div><div>MVP de un partido (al equipo)<b>+${fmt(C.mvp)}</b></div><div>Fecha sin sanciones<b>+${fmt(C.clean)}</b></div>`;
  $("#mkRules").innerHTML = `<li><b>Plantel</b>Mínimo ${M.cfg.rosterMin}, máximo ${M.cfg.rosterMax} jugadores</li><li><b>Cupo</b>Hasta ${M.cfg.maxSign} incorporaciones por ventana</li><li><b>Ventana</b>${M.cfg.windowOpen ? "Abierta" + (M.cfg.windowClose ? " hasta el " + fmtDate(M.cfg.windowClose) : "") : "Cerrada por ahora"}</li><li><b>Aprobar</b>El capitán ofrece; el admin confirma el pase</li>`;
}
function checksFor(p, amt, team) {
  return [
    [M.cfg.windowOpen, M.cfg.windowOpen ? "La ventana de fichajes está abierta" : "La ventana de fichajes está cerrada"],
    [(+M.teams[team].coins || 0) >= amt, `${TM(team).name} tiene los coins (${fmt(M.teams[team].coins)})`],
    [roster(team).length < M.cfg.rosterMax, `Hay lugar en el plantel (${roster(team).length}/${M.cfg.rosterMax})`],
    [!p.team || roster(p.team).length > M.cfg.rosterMin, p.team ? `${TM(p.team).name} no queda con menos de ${M.cfg.rosterMin}` : "Es agente libre"],
    [signings(team) < M.cfg.maxSign, `Cupo de la ventana (${signings(team)}/${M.cfg.maxSign})`],
  ];
}
function chanceFor(p, amt) { const x = amt / p.value; return p.team ? clamp((x - .8) / .45, .03, .97) : clamp((x - .7) / .35, .05, .98); }
function openOffer(pid) {
  const p = D.PM[pid]; if (!p) return;
  if (!capTeam()) { toast("Solo los capitanes pueden fichar. Entrá con tu cuenta de capitán."); return; }
  if (p.team === capTeam()) { toast("Ese jugador ya es de tu equipo."); return; }
  const t = p.team ? TM(p.team) : {c: "#8f8aa6", name: "Agente libre"};
  const min = Math.max(CAP_VAL_MIN, r50(p.value * .5)), max = Math.min(CAP_CLAUSE_MAX, Math.max(CAP_VAL_MAX, p.clause || 0));
  const teamOpts = `<option value="${capTeam()}" selected>${esc(TM(capTeam()).name)}</option>`;
  modal(`<div class="box cut" style="--tc:${t.c}"><div class="bh">${p.team ? img(p.team) : `<span class="ava" style="--tc:#5b5675;width:64px;height:70px;font-size:22px">${esc(p.name.slice(0, 2).toUpperCase())}</span>`}
    <div><div class="eyebrow">Oferta de fichaje</div><h3>${esc(p.name)}</h3><div class="muted" style="font-size:14px">${p.role} · ${esc(t.name)} · Categoría ${catOf(p.value)} · Valor ${fmt(p.value)}</div></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="bb"><div class="ff"><label for="ofTeam">Ofertás como capitán de</label><select id="ofTeam" disabled>${teamOpts}</select></div>
      <div class="ff"><label for="ofAmt">Monto</label><div class="offer-amt"><span id="ofVal">${fmt(p.value)}</span><small id="ofPct">100% del valor</small></div><input type="range" id="ofAmt" min="${min}" max="${max}" step="50" value="${p.value}"></div>
      ${p.clause ? `<div class="clause-note">Tiene cláusula de rescisión de <b>${fmt(p.clause)}</b>. Si ofertás eso o más, ${esc(t.name)} no puede negarse: el pase solo necesita la confirmación del staff.</div>` : ""}
      <div class="ff"><label>Chance estimada de que acepten</label><div class="chance"><i id="ofChance"></i></div></div>
      <div class="ff"><label for="ofLen">Contrato</label><select id="ofLen"><option>Hasta fin de temporada</option><option>Esta temporada y la próxima</option><option>Préstamo por 2 fechas</option></select></div>
      <div class="ff"><label for="ofMsg">Mensaje para el admin (opcional)</label><input id="ofMsg" maxlength="140" autocomplete="off"></div>
      <div class="checks" id="ofChecks"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn gold" id="ofSend">Enviar oferta</button><button class="btn ghost" data-close>Cancelar</button></div></div></div>`);
  const upd = () => {
    const a = +$("#ofAmt").value, tm = $("#ofTeam").value; $("#ofVal").textContent = fmt(a); $("#ofPct").textContent = Math.round(a / p.value * 100) + "% del valor";
    $("#ofChance").style.width = (p.clause && a >= p.clause ? 100 : chanceFor(p, a) * 100).toFixed(0) + "%";
    const ch = checksFor(p, a, tm); $("#ofChecks").innerHTML = ch.map(([ok, l]) => `<div class="${ok ? "okc" : "bad"}">${ok ? "✓" : "✕"} <span style="color:var(--fg)">${esc(l)}</span></div>`).join("");
    $("#ofSend").disabled = !ch.every(c => c[0]);
  };
  $("#ofAmt").addEventListener("input", upd); $("#ofTeam").addEventListener("change", upd); upd();
  $("#ofSend").addEventListener("click", async () => {
    const amt = +$("#ofAmt").value, team = capTeam(), len = $("#ofLen").value, msg = $("#ofMsg").value.trim();
    if (M.ex) { closeModal(); toast("Modo de ejemplo: la oferta no se envía.", team); return; }
    if (!S.db || !team || !S.uid) { closeModal(); toast("Tu sesión de capitán no está activa. Volvé a entrar.", team); return; }
    const uid = S.uid;
    const items = clone(myOffers()).slice(-40); items.push({id: newId("o"), pid, team, amt, len, msg, at: Date.now(), status: "pend"});
    closeModal();
    try { await save(`offers/${uid}`, {items, team}); toast(`Oferta enviada por ${p.name}: ${fmt(amt)} coins. El admin la revisa.`, team); }
    catch (e) { /* toast ya mostrado */ }
  });
}
$("#cards").addEventListener("click", e => { const a = e.target.closest("[data-an-card]"); if (a) { openAnalysis(a.dataset.anCard); return; } const b = e.target.closest("[data-offer]"); if (b) openOffer(b.dataset.offer); });
$("#mkLogin").addEventListener("click", () => openLogin());
$("#mkCat").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.mk.cat = b.dataset.c; $$("#mkCat button").forEach(x => x.classList.toggle("on", x === b)); renderMarket(); });
ROLES.forEach(r => $("#mkRole").insertAdjacentHTML("beforeend", `<option>${r}</option>`));
fillMkTeams();
$("#mkRole").addEventListener("change", e => { S.mk.role = e.target.value; renderMarket(); });
$("#mkTeam").addEventListener("change", e => { S.mk.team = e.target.value; renderMarket(); });
$("#mkSort").addEventListener("change", e => { S.mk.sort = e.target.value; renderMarket(); });
$("#mkQ").addEventListener("input", e => { S.mk.q = e.target.value; renderMarket(); });

/* ================= ficha de jugador ================= */
function playerPerfHtml(p) {
  const a = attStats(p.id), pts = ptsSum(p.id), sk = perfOf(p.id).skills || {}, hasSk = SKILLS.some(([k]) => +sk[k] > 0);
  return `<div class="perf-mini"><div><b>${a.pct == null ? "–" : a.pct + "%"}</b><span>Asistencia</span></div><div><b>${fv("pts", pts)}</b><span>Puntos ind.</span></div><div><b>${fmt(saldoOf(p.id))}</b><span>Saldo canjes</span></div><div><b>${p.clause ? fmt(p.clause) : "–"}</b><span>Cláusula</span></div></div>
    ${hasSk ? `<div class="skill-bars">${SKILLS.map(([k, l]) => `<div><span class="muted">${l}</span><span class="bar"><i style="--w:${(+sk[k] || 0) * 10}%;--tc:${TM(p.lastTeam).c}"></i></span><span class="mono">${+sk[k] || "–"}</span></div>`).join("")}</div>` : ""}`;
}
function openPlayer(id) {
  const p = D.PM[id]; if (!p) return;
  const tk = p.lastTeam, t = TM(tk), s = p.s, pool = D.P.filter(x => x.s.m);
  const mx = f => Math.max(...pool.map(f), .001);
  const axes = [["Kills/PJ", x => x.s.k / x.s.m], ["Asist/PJ", x => x.s.a / x.s.m], ["K/D", x => x.s.kd], ["ACS", x => x.s.acs], ["% Victorias", x => x.s.w / x.s.m]];
  const vals = axes.map(([, f]) => s.m && pool.length ? f(p) / mx(f) : 0);
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; return [150 + Math.cos(a) * 110 * v, 150 + Math.sin(a) * 110 * v]; };
  const grid = [.25, .5, .75, 1].map(g => `<polygon points="${axes.map((_, i) => pt(i, g).join(",")).join(" ")}" fill="none" stroke="var(--line-2)"/>`).join("");
  const spokes = axes.map((_, i) => `<line x1="150" y1="150" x2="${pt(i, 1)[0]}" y2="${pt(i, 1)[1]}" stroke="var(--line)"/>`).join("");
  const labels = axes.map(([l], i) => { const [x, y] = pt(i, 1.2); return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="var(--muted)" font-size="11" font-family="JetBrains Mono, monospace">${l}</text>`; }).join("");
  const isCap = p.team && M.teams[p.team].captain === p.id;
  modal(`<div class="box cut" style="--tc:${t.c}"><div class="bh">${img(tk)}<div><div class="eyebrow">${p.role}${isCap ? " · Capitán" : ""}</div><h3>${esc(p.name)}</h3><div class="muted" style="font-size:14px">${p.team ? esc(TM(p.team).name) : "Agente libre"} · Valor ${fmt(p.value)} · Cat. ${catOf(p.value)}${p.clause ? " · Cláusula " + fmt(p.clause) : ""}${ignOf(p.id) ? ` · <a class="an-trk" href="${trackerUrl(ignOf(p.id))}" target="_blank" rel="noopener noreferrer">${esc(ignOf(p.id))} ↗</a>` : ""}</div></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="bb"><svg class="radar" viewBox="0 0 300 300" role="img" aria-label="Perfil de ${esc(p.name)} comparado con el mejor de la liga">${grid}${spokes}
      <polygon class="val" points="${vals.map((v, i) => pt(i, v).join(",")).join(" ")}" fill="${t.c}" fill-opacity=".28" stroke="${t.l}" stroke-width="2"/>${vals.map((v, i) => `<circle cx="${pt(i, v)[0]}" cy="${pt(i, v)[1]}" r="3.5" fill="${t.l}"/>`).join("")}${labels}</svg>
      <p class="muted" style="font-size:12px;text-align:center;margin-top:-6px">Cada eje compara con el mejor de la liga en esa estadística.</p>
      <div class="pstats" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div><b>${s.k}</b><span>Kills</span></div><div><b>${s.a}</b><span>Asist.</span></div><div><b>${dec(s.kd)}</b><span>K/D</span></div><div><b>${s.acs}</b><span>ACS</span></div></div>
      ${playerPerfHtml(p)}${careerHtml(p.id)}
      <div class="loglist">${p.log.map(e => `<div><span class="mono muted">F${e.f}${e.lg ? " " + e.lg : ""}</span><span style="display:flex;gap:6px;align-items:center">${img(e.vs)}${esc(TM(e.vs).name)}</span><span class="mono">${e.k}/${e.d}/${e.a}</span><span class="mono" style="color:${e.won ? "var(--win)" : "var(--loss)"}">${e.score}</span></div>`).join("") || '<span class="muted">Sin partidos jugados.</span>'}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-an-modal="${p.id}">Ver análisis completo</button><button class="btn ghost" type="button" data-share="jugador:${p.id}" data-title="${esc(p.name)}">${ico("i-share")}<span>Compartir</span></button>${trackerBtn(p.id, "btn ghost")}${capTeam() && p.team !== capTeam() ? `<button class="btn gold" data-offer-modal="${p.id}">Hacer una oferta</button>` : ""}</div></div></div>`);
  const ob = $("[data-offer-modal]"); if (ob) ob.addEventListener("click", () => { closeModal(); openOffer(p.id); });
  const ab = $("[data-an-modal]"); if (ab) ab.addEventListener("click", () => { closeModal(); openAnalysis(p.id); });
}


/* ================= análisis de jugadores (scouting) ================= */
// Colores de los gráficos: validados contra el fondo oscuro de la página (también para daltonismo).
const VZ = {acc: "#9085e9", k: "#3987e5", d: "#d95926", a: "#199e70", cmp: ["#3987e5", "#d95926", "#199e70"]};
S.sc = {q: "", role: "all", team: "all", min: 1, sort: "rating", dir: -1, cmp: [], an: null, metric: "acs", cmpOpen: false};
const dec1 = n => dec(n, 1), dec2 = n => dec(n, 2), pctTxt = v => Math.round((+v || 0) * 100) + "%";
// [clave, nombre, 1 = más es mejor / -1 = menos es mejor, formato, explicación]
const SC_MET = [
  ["acs", "Impacto (ACS)", 1, v => String(Math.round(v)), "Puntaje de combate promedio: resume daño, kills y aporte por ronda."],
  ["kd", "K/D", 1, v => dec2(v), "Kills por cada muerte."],
  ["kpr", "Kills por ronda", 1, v => dec2(v), "Cuántas kills hace por ronda jugada."],
  ["apr", "Asistencias por ronda", 1, v => dec2(v), "Cuánto ayuda a que sus compañeros consigan kills."],
  ["dpr", "Supervivencia", -1, v => dec2(v) + " muertes/ronda", "Muertes por ronda: cuanto menos muere, mejor."],
  ["win", "Victorias", 1, v => pctTxt(v), "Porcentaje de partidos ganados."],
  ["att", "Asistencia a fechas", 1, v => v == null ? "–" : v + "%", "Presencia en las fechas (la carga el staff)."],
];
const RATING_W = {acs: .3, kd: .2, kpr: .15, apr: .1, dpr: .1, win: .1, att: .05};
const ROLE_ART = {Duelista: "un duelista", Iniciador: "un iniciador", Controlador: "un controlador", Centinela: "un centinela", Flex: "un jugador flex", Suplente: "un suplente"};
const ROLE_PL = {Duelista: "duelistas", Iniciador: "iniciadores", Controlador: "controladores", Centinela: "centinelas", Flex: "flex", Suplente: "suplentes"};

function metricsOf(p) {
  const s = p.s, m = s.m, R = p.log.reduce((t, e) => t + (+e.rounds || 0), 0), per = x => R ? x / R : (m ? x / m / 22 : 0);
  const acsL = p.log.map(e => e.acs), avg = m ? acsL.reduce((a, b) => a + b, 0) / m : 0;
  const sd = m > 1 ? Math.sqrt(acsL.reduce((t, v) => t + (v - avg) ** 2, 0) / m) : 0;
  const last = p.log.slice(-3), lastAcs = last.length ? last.reduce((t, e) => t + e.acs, 0) / last.length : 0;
  const W = p.log.filter(e => e.won), Lo = p.log.filter(e => !e.won), at = attStats(p.id);
  return {m, k: s.k, d: s.d, a: s.a, acs: s.acs, kd: s.kd, rounds: R, w: s.w,
    kpm: m ? s.k / m : 0, dpm: m ? s.d / m : 0, apm: m ? s.a / m : 0, kpr: per(s.k), dpr: per(s.d), apr: per(s.a),
    kda: s.d ? (s.k + s.a) / s.d : s.k + s.a, win: m ? s.w / m : 0, mvps: D.played.filter(x => x.mvpId === p.id).length,
    att: at.pct, attN: at.n, attA: at.A, pts: ptsSum(p.id), cv: avg ? sd / avg : 0, acsMin: m ? Math.min(...acsL) : 0, acsMax: m ? Math.max(...acsL) : 0,
    trend: m >= 4 && avg ? (lastAcs - avg) / avg : 0, lastAcs,
    acsW: W.length ? W.reduce((t, e) => t + e.acs, 0) / W.length : null, acsL: Lo.length ? Lo.reduce((t, e) => t + e.acs, 0) / Lo.length : null};
}
// Contexto de la liga (se recalcula cuando cambian los datos)
let scCache = null;
function scLeague() {
  if (scCache && scCache.D === D) return scCache;
  const pool = D.P.filter(p => p.s.m).map(p => ({p, x: metricsOf(p)}));
  const out = {D, pool, all: {}};
  out.pct = (f, v, dir) => {
    const vals = pool.map(r => r.x[f]).filter(x => x != null); if (vals.length < 2 || v == null) return null;
    let worse = 0, eq = 0; vals.forEach(x => { if (dir > 0 ? x < v : x > v) worse++; else if (x === v) eq++; });
    return Math.max(0, Math.min(100, Math.round((worse + (eq - 1) / 2) / (vals.length - 1) * 100)));
  };
  out.avg = f => { const v = pool.map(r => r.x[f]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  out.roleAvg = (role, f) => { const v = pool.filter(r => r.p.role === role).map(r => r.x[f]).filter(x => x != null); return v.length >= 2 ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const E = D.P.flatMap(p => p.log), tk = E.reduce((t, e) => t + e.k, 0), td = E.reduce((t, e) => t + e.d, 0);
  out.perMatch = E.length ? {acs: E.reduce((t, e) => t + e.acs, 0) / E.length, k: tk / E.length, a: E.reduce((t, e) => t + e.a, 0) / E.length, kd: td ? tk / td : tk} : {acs: 0, k: 0, a: 0, kd: 0};
  pool.forEach(r => { r.rating = ratingOf(r.x, out); out.all[r.p.id] = r; });
  scCache = out; return out;
}
function ratingOf(x, Lg) {
  let s = 0, w = 0;
  for (const [f, , dir] of SC_MET) { const pc = Lg.pct(f, x[f], dir); if (pc == null) continue; s += pc * RATING_W[f]; w += RATING_W[f]; }
  return w ? Math.round(s / w) : null;
}
const pcsOf = (x, Lg) => Object.fromEntries(SC_MET.map(([f, , dir]) => [f, Lg.pct(f, x[f], dir)]));

// "Cómo es el jugador": perfil escrito a partir de los números
function scoutProfile(p, x, Lg) {
  const tags = [], lines = [], pc = pcsOf(x, Lg), nm = esc(p.name);
  if (!x.m) {
    lines.push(`${nm} todavía no jugó partidos cargados en la web, así que no hay estadísticas para analizar. Su valor (${fmt(p.value)}) sale ${p.rank ? `de su rango (${esc(p.rank)})` : "del valor base"}.`);
    const at = attStats(p.id); if (at.n) lines.push(`Asistencia a fechas: ${at.pct}% (${at.n} fecha${at.n > 1 ? "s" : ""} cargada${at.n > 1 ? "s" : ""}).`);
    return {tags: ["Sin partidos"], lines, good: [], bad: [], pc};
  }
  const team = p.team ? `de <b>${esc(TM(p.team).name)}</b>` : "<b>agente libre</b>";
  lines.push(`${nm} es ${ROLE_ART[p.role] || "un jugador"} ${team}${p.rank ? `, rango ${esc(p.rank)}` : ""}. En ${x.m} partido${x.m > 1 ? "s" : ""} promedia <b>${dec1(x.kpm)} kills</b>, ${dec1(x.dpm)} muertes y ${dec1(x.apm)} asistencias por partido (K/D ${dec2(x.kd)}, ACS ${x.acs}).`);
  // estilo de juego
  if (pc.kpr >= 70 && pc.dpr != null && pc.dpr <= 35) { tags.push("Agresivo"); lines.push(`Juega al frente: hace más kills por ronda que el ${pc.kpr}% de la liga, pero también muere seguido (${dec2(x.dpr)} muertes por ronda). Gana duelos, aunque a veces regala la ronda.`); }
  else if (pc.kpr >= 70) { tags.push("Fragger"); lines.push(`Es de los que más matan: hace más kills por ronda que el ${pc.kpr}% de los jugadores.`); }
  if (pc.dpr >= 70) { tags.push("Seguro"); lines.push(`Muere poco: sobrevive más que el ${pc.dpr}% de la liga. Sirve para sostener posiciones y cerrar rondas.`); }
  if (pc.apr >= 70) { tags.push("Juega para el equipo"); lines.push(`Aporta mucho al equipo: da más asistencias por ronda que el ${pc.apr}% de la liga.`); }
  if (pc.acs >= 80) tags.push("Figura");
  if (!["Agresivo", "Fragger", "Seguro", "Juega para el equipo"].some(t => tags.includes(t)) && pc.acs != null)
    lines.push(pc.acs >= 50 ? `Tiene un rendimiento por encima de la media: su ACS es mejor que el de ${pc.acs}% de la liga.` : `Por ahora rinde debajo de la media de la liga: su ACS es mejor que el de solo ${pc.acs}% de los jugadores.`);
  // comparado con su rol
  const rp = ROLE_PL[p.role], cmp = [];
  [["kpr", "kills por ronda", 1], ["apr", "asistencias por ronda", 1], ["acs", "ACS", 1], ["dpr", "muertes por ronda", -1]].forEach(([f, l, dir]) => {
    const ra = Lg.roleAvg(p.role, f); if (!ra) return; const diff = (x[f] - ra) / ra; if (Math.abs(diff) < .1) return;
    cmp.push({f, txt: `${diff > 0 ? "tiene" : "tiene"} ${Math.round(Math.abs(diff) * 100)}% ${diff > 0 ? "más" : "menos"} ${l}`, good: diff * dir > 0, size: Math.abs(diff)});
  });
  if (rp && cmp.length) { const top = cmp.sort((a, b) => b.size - a.size).slice(0, 2); lines.push(`Comparado con otros ${rp}: ${top.map(c => c.txt).join(" y ")} que el promedio.`); }
  // regularidad y momento
  if (x.m >= 3 && x.cv <= .15) { tags.push("Regular"); lines.push(`Es muy regular: su ACS casi no cambia de un partido a otro (entre ${x.acsMin} y ${x.acsMax}).`); }
  else if (x.m >= 3 && x.cv >= .35) { tags.push("Irregular"); lines.push(`Es irregular: tiene partidos muy buenos y otros flojos (ACS entre ${x.acsMin} y ${x.acsMax}).`); }
  if (x.trend >= .15) { tags.push("En alza"); lines.push(`Viene en alza: en sus últimos 3 partidos promedia ACS ${Math.round(x.lastAcs)}, contra ${x.acs} de toda la temporada.`); }
  else if (x.trend <= -.15) { tags.push("En baja"); lines.push(`Viene en baja: en sus últimos 3 partidos promedia ACS ${Math.round(x.lastAcs)}, contra ${x.acs} de toda la temporada.`); }
  if (x.acsW != null && x.acsL != null && x.acsW && Math.abs(x.acsW - x.acsL) / x.acsW >= .15)
    lines.push(`Cuando su equipo gana, su ACS promedio es ${Math.round(x.acsW)}; cuando pierde, ${Math.round(x.acsL)}.${x.acsL > x.acsW ? " Rinde aunque el equipo no acompañe." : ""}`);
  if (x.m >= 3 && x.win >= .65) tags.push("Ganador");
  if (x.mvps >= 2) tags.push(`MVP ×${x.mvps}`); else if (x.mvps === 1) lines.push("Fue MVP de un partido.");
  if (x.mvps >= 2) lines.push(`Fue MVP en ${x.mvps} partidos.`);
  // compromiso
  if (x.att != null && x.attN >= 2) { if (x.att >= 90) { tags.push("Siempre presente"); lines.push("No falta: estuvo en todas o casi todas las fechas."); } else if (x.att < 60) { tags.push("Falta seguido"); lines.push(`Ojo con la asistencia: estuvo en el ${x.att}% de las fechas${x.attA ? ` y faltó ${x.attA} vez${x.attA > 1 ? "es" : ""}` : ""}.`); } }
  const sk = (perfOf(p.id).skills || {}), skl = SKILLS.filter(([k]) => +sk[k] > 0).sort((a, b) => sk[b[0]] - sk[a[0]]);
  if (skl.length >= 2) lines.push(`El staff lo evalúa mejor en <b>${skl[0][1].toLowerCase()}</b> (${sk[skl[0][0]]}/10) y más flojo en ${skl[skl.length - 1][1].toLowerCase()} (${sk[skl[skl.length - 1][0]]}/10).`);
  if (x.m < 3) { tags.push("Pocos partidos"); lines.push(`Jugó solo ${x.m} partido${x.m > 1 ? "s" : ""}: los números todavía pueden cambiar mucho.`); }
  const named = SC_MET.filter(([f]) => pc[f] != null).map(([f, l]) => ({f, l, v: pc[f]}));
  return {tags, lines, pc, good: named.filter(r => r.v >= 65).sort((a, b) => b.v - a.v).slice(0, 3), bad: named.filter(r => r.v <= 35).sort((a, b) => a.v - b.v).slice(0, 3)};
}
// ¿Conviene ficharlo? Compara lo que rinde con lo que cuesta (escala 100–1.500).
function marketVerdict(p, x, rating) {
  if (!x.m || rating == null || x.m < 2) return {k: "wait", t: "Sin datos suficientes", d: x.m ? "Jugó un solo partido: todavía no se puede estimar si vale lo que cuesta." : "Todavía no jugó: su valor sale del rango."};
  const exp = clamp(r50(300 + rating / 100 * 1200), CAP_VAL_MIN, CAP_VAL_MAX), ratio = exp / Math.max(1, p.value);
  const base = `Por lo que rinde valdría unos <b>${fmt(exp)}</b> (categoría ${catOf(exp)}) y cuesta <b>${fmt(p.value)}</b> (categoría ${catOf(p.value)}).`;
  return ratio >= 1.2 ? {k: "good", t: "Buena compra", d: base} : ratio >= .85 ? {k: "fair", t: "Precio justo", d: base} : {k: "high", t: "Caro para lo que rinde", d: base};
}

// ---------- gráficos (SVG a mano, con tooltip) ----------
const VZD = {};
function niceMax(v) { if (v <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e; return ([1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10].find(x => f <= x) || 10) * e; }
const axisTxt = (v, isDec) => isDec ? dec(v, v < 10 && v % 1 ? 1 : 0) : fmt(v);
function chartLine(p, metric, Lg) {
  const L = p.log; if (!L.length) return '<p class="muted">Todavía no hay partidos.</p>';
  const get = {acs: e => e.acs, kd: e => e.d ? e.k / e.d : e.k, k: e => e.k, a: e => e.a}[metric];
  const lab = {acs: "ACS", kd: "K/D", k: "Kills", a: "Asistencias"}[metric], isDec = metric === "kd";
  const vals = L.map(get), avgV = Lg.perMatch[metric] || 0, fv = v => isDec ? dec2(v) : String(Math.round(v));
  const W = 640, H = 240, pl = 44, pr = 20, pt = 16, pb = 30, mx = niceMax(Math.max(...vals, avgV) * 1.08);
  const X = i => L.length === 1 ? pl + (W - pl - pr) / 2 : pl + i * (W - pl - pr) / (L.length - 1), Y = v => pt + (H - pt - pb) * (1 - v / mx);
  const ticks = [0, .25, .5, .75, 1].map(f => f * mx);
  const id = "vz" + Math.random().toString(36).slice(2, 8);
  VZD[id] = {type: "line", xs: L.map((_, i) => X(i)), rows: L.map((e, i) => ({head: `F${e.f}${e.lg ? " · " + e.lg : ""} · vs ${TM(e.vs).name} · ${e.won ? "ganó" : "perdió"}`, items: [[VZ.acc, fv(vals[i]), p.name], ["var(--muted)", fv(avgV), "Promedio de la liga"]]})), W, pt, H, pb};
  const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
  const every = L.length > 12 ? 2 : 1;
  return `<div class="vz-legend"><span><i class="ln" style="--c:${VZ.acc}"></i>${esc(p.name)}</span><span><i class="ln" style="--c:var(--muted);height:1px"></i>Promedio de la liga (${fv(avgV)})</span></div>
  <svg class="vz" id="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${lab} de ${esc(p.name)} partido a partido">
    ${ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}" class="vz-grid"/><text x="${pl - 8}" y="${Y(t) + 4}" text-anchor="end" class="vz-ax">${axisTxt(t, isDec)}</text>`).join("")}
    ${L.map((e, i) => i % every ? "" : `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" class="vz-ax">F${e.f}${e.lg ? " " + e.lg[0] : ""}</text>`).join("")}
    <line x1="${pl}" x2="${W - pr}" y1="${Y(avgV)}" y2="${Y(avgV)}" stroke="var(--muted)" stroke-width="1"/>
    ${L.length > 1 ? `<polygon points="${pts.join(" ")} ${X(L.length - 1)},${Y(0)} ${X(0)},${Y(0)}" fill="${VZ.acc}" fill-opacity=".1"/><polyline points="${pts.join(" ")}" fill="none" stroke="${VZ.acc}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : ""}
    ${vals.map((v, i) => `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="${VZ.acc}" stroke="var(--surface)" stroke-width="2"/>`).join("")}
    <text x="${Math.min(X(L.length - 1) + 8, W - 4)}" y="${Y(vals[vals.length - 1]) - 9}" text-anchor="${L.length > 1 ? "end" : "start"}" class="vz-val">${fv(vals[vals.length - 1])}</text>
    <line class="vz-xh" x1="0" x2="0" y1="${pt}" y2="${H - pb}" visibility="hidden"/><circle class="vz-hd" r="6" fill="${VZ.acc}" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>
    <rect class="vz-hit" x="${pl - 10}" y="${pt}" width="${W - pl - pr + 20}" height="${H - pt - pb}" fill="transparent" data-vz="${id}"/>
  </svg>`;
}
function chartKDA(p) {
  const L = p.log; if (!L.length) return '<p class="muted">Todavía no hay partidos.</p>';
  const W = 640, H = 240, pl = 36, pr = 10, pt = 22, pb = 30, n = L.length, mx = niceMax(Math.max(1, ...L.flatMap(e => [e.k, e.d, e.a])) * 1.05);
  const gw = (W - pl - pr) / n, bw = Math.max(4, Math.min(18, (gw * .75 - 4) / 3)), Y = v => pt + (H - pt - pb) * (1 - v / mx), base = Y(0);
  const col = (x, v, c) => { const y = Y(v), h = base - y; if (h <= 0) return ""; const r = Math.min(4, h, bw / 2); return `<path d="M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${base} Z" fill="${c}"/>`; };
  const id = "vz" + Math.random().toString(36).slice(2, 8);
  VZD[id] = {type: "bars", rows: L.map(e => ({head: `F${e.f}${e.lg ? " · " + e.lg : ""} · vs ${TM(e.vs).name} · ${e.won ? "ganó" : "perdió"} · ACS ${e.acs}`, items: [[VZ.k, e.k, "Kills"], [VZ.d, e.d, "Muertes"], [VZ.a, e.a, "Asistencias"]]}))};
  const ticks = [0, .25, .5, .75, 1].map(f => f * mx), every = n > 12 ? 2 : 1;
  return `<div class="vz-legend"><span><i class="sq" style="--c:${VZ.k}"></i>Kills</span><span><i class="sq" style="--c:${VZ.d}"></i>Muertes</span><span><i class="sq" style="--c:${VZ.a}"></i>Asistencias</span></div>
  <svg class="vz" id="${id}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kills, muertes y asistencias de ${esc(p.name)} por partido">
    ${ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}" class="vz-grid"/><text x="${pl - 8}" y="${Y(t) + 4}" text-anchor="end" class="vz-ax">${Math.round(t)}</text>`).join("")}
    ${L.map((e, i) => { const x0 = pl + i * gw + (gw - (3 * bw + 4)) / 2; return `<g class="vz-g">${col(x0, e.k, VZ.k)}${col(x0 + bw + 2, e.d, VZ.d)}${col(x0 + 2 * (bw + 2), e.a, VZ.a)}${i % every ? "" : `<text x="${pl + i * gw + gw / 2}" y="${H - 8}" text-anchor="middle" class="vz-ax">F${e.f}</text>`}<rect x="${pl + i * gw}" y="${pt}" width="${gw}" height="${H - pt - pb}" fill="transparent" class="vz-bhit" data-vz="${id}" data-i="${i}" tabindex="0"/></g>`; }).join("")}
  </svg>`;
}
// Barras de percentil (0–100): cada fila trae su valor escrito; el tooltip suma el promedio de la liga y del rol.
function pctBars(p, x, Lg, pc) {
  return `<div class="pc-bars">${SC_MET.map(([f, l, dir, fm, help]) => {
    const v = pc[f]; if (v == null) return "";
    const lgA = Lg.avg(f), roleA = Lg.roleAvg(p.role, f);
    const tip = `${esc(l)}: <b>${fm(x[f])}</b><br>Mejor que el ${v}% de la liga<br>Promedio de la liga: ${lgA == null ? "–" : fm(lgA)}${roleA != null ? `<br>Promedio de ${ROLE_PL[p.role]}: ${fm(roleA)}` : ""}<br><span class="muted">${esc(help)}</span>`;
    return `<div class="pc-row" tabindex="0" data-tiph="${esc(tip)}"><span class="pc-l">${esc(l)}<small>${fm(x[f])}</small></span><span class="pc-track"><i style="width:${Math.max(2, v)}%"></i><b></b></span><span class="pc-v">${v}</span></div>`;
  }).join("")}</div>`;
}
function skillBars(p) {
  const sk = perfOf(p.id).skills || {}, has = SKILLS.filter(([k]) => +sk[k] > 0); if (!has.length) return "";
  return `<div class="an-card"><h4>Evaluación del staff <small>de 1 a 10</small></h4><div class="pc-bars">${SKILLS.map(([k, l]) => +sk[k] > 0 ? `<div class="pc-row"><span class="pc-l">${l}</span><span class="pc-track"><i style="width:${sk[k] * 10}%"></i></span><span class="pc-v">${sk[k]}</span></div>` : "").join("")}</div></div>`;
}

// ---------- vista de análisis de un jugador ----------
function openAnalysis(pid) { if (!D.PM[pid]) return; S.sc.an = pid; S.sc.cmpOpen = false; renderAnalysis(); const r = $("#anRoot .an-panel"); if (r) r.focus(); }
function closeAnalysis() { S.sc.an = null; S.sc.cmpOpen = false; renderAnalysis(); hideTip(); }
function renderAnalysis() {
  const root = $("#anRoot");
  if (S.sc.cmpOpen) { root.innerHTML = compareHtml(); return; }
  const p = S.sc.an && D.PM[S.sc.an]; if (!p) { root.innerHTML = ""; return; }
  const Lg = scLeague(), x = metricsOf(p), r = Lg.all[p.id], rating = r ? r.rating : null, prof = scoutProfile(p, x, Lg), t = TM(p.lastTeam), mk = marketAccess();
  const isCap = p.team && M.teams[p.team] && M.teams[p.team].captain === p.id, ct = capTeam(), canOffer = ct && p.team !== ct;
  const tiles = [["Partidos", x.m], ["K/D", x.m ? dec2(x.kd) : "–"], ["ACS", x.m ? x.acs : "–"], ["Kills por partido", x.m ? dec1(x.kpm) : "–"], ["Muertes por partido", x.m ? dec1(x.dpm) : "–"], ["Asist. por partido", x.m ? dec1(x.apm) : "–"],
    ["KDA", x.m ? dec2(x.kda) : "–"], ["Victorias", x.m ? `${x.w} de ${x.m}` : "–"], ["MVP", x.mvps], ["Asistencia a fechas", x.att == null ? "–" : x.att + "%"], ["Puntos individuales", x.pts], ["Rondas jugadas", x.rounds]];
  const v = mk ? marketVerdict(p, x, rating) : null;
  const metricBtns = [["acs", "ACS"], ["kd", "K/D"], ["k", "Kills"], ["a", "Asistencias"]].map(([k, l]) => `<button type="button" class="${S.sc.metric === k ? "on" : ""}" data-an-metric="${k}">${l}</button>`).join("");
  const others = D.P.filter(q => q.id !== p.id && q.s.m).sort((a, b) => a.name.localeCompare(b.name, "es"));
  root.innerHTML = `<div class="an" role="dialog" aria-modal="true" aria-label="Análisis de ${esc(p.name)}"><div class="an-panel" tabindex="-1" style="--tc:${t.c}">
    <div class="an-head">${img(p.lastTeam)}<div class="an-who"><div class="eyebrow">${p.role}${isCap ? " · Capitán" : ""} · ${p.team ? esc(TM(p.team).name) : "Agente libre"}${p.rank ? " · " + esc(p.rank) : ""}</div><h2>${esc(p.name)}</h2>
      <div class="an-tags">${prof.tags.map(g => `<span>${esc(g)}</span>`).join("")}${ignOf(p.id) ? `<a class="an-trk" href="${trackerUrl(ignOf(p.id))}" target="_blank" rel="noopener noreferrer">${esc(ignOf(p.id))} · Tracker ↗</a>` : ""}</div></div>
      <div class="an-rating" title="Rating ONYX: combina ACS, K/D, kills, asistencias, supervivencia, victorias y asistencia a fechas, comparado con toda la liga (0 a 100)"><b>${rating ?? "–"}</b><span>Rating ONYX</span></div>
      <button class="x" data-an-close aria-label="Cerrar">×</button></div>
    <div class="an-body">
      <div class="an-tiles">${tiles.map(([l, val]) => `<div><b>${val}</b><span>${l}</span></div>`).join("")}</div>
      <div class="an-grid">
        <div class="an-card"><h4>Cómo es el jugador</h4>${prof.lines.map(l => `<p>${l}</p>`).join("")}
          ${prof.good.length || prof.bad.length ? `<div class="an-sw">${prof.good.length ? `<div><h5>Puntos fuertes</h5><ul>${prof.good.map(g => `<li>${esc(g.l)} <small>mejor que el ${g.v}%</small></li>`).join("")}</ul></div>` : ""}${prof.bad.length ? `<div><h5>A mejorar</h5><ul>${prof.bad.map(g => `<li>${esc(g.l)} <small>mejor que el ${g.v}%</small></li>`).join("")}</ul></div>` : ""}</div>` : ""}</div>
        <div class="an-card"><h4>Comparado con la liga <small>percentil: 78 = mejor que el 78% de los jugadores · la línea marca la mitad</small></h4>${x.m ? pctBars(p, x, Lg, prof.pc) : '<p class="muted">Aparece cuando juegue su primer partido.</p>'}</div>
      </div>
      ${mk ? `<div class="an-card an-mk ${v.k}"><h4>Para fichar</h4><div class="an-verdict"><b>${v.t}</b><p>${v.d}</p></div>
        <div class="an-mkrow"><span>Valor <b>${fmt(p.value)}</b> · Categoría <b>${catOf(p.value)}</b></span><span>${p.clause ? `Cláusula de rescisión <b>${fmt(p.clause)}</b>: si alguien la paga, su equipo no puede negarse.` : p.team ? "Sin cláusula de rescisión." : "Agente libre: no hay que negociar con otro equipo."}</span>
        ${canOffer ? `<button class="btn sm gold" data-an-offer="${p.id}">Hacer una oferta</button>` : ""}</div>
        ${canOffer ? (() => { const f = fitFor(teamDiagnosis(ct), p); return `<div class="an-fit"><span class="fit-score"><b>${f.score}</b><small>compat.</small></span><div><b>Con ${esc(TM(ct).name)}</b><ul>${f.why.slice(0, 3).map(w => `<li>${w}</li>`).join("")}</ul></div></div>`; })() : ""}</div>` : ""}
      <div class="an-card"><h4>Partido a partido</h4><div class="seg an-seg">${metricBtns}</div>${chartLine(p, S.sc.metric, Lg)}</div>
      <div class="an-card"><h4>Kills, muertes y asistencias por partido</h4>${chartKDA(p)}</div>
      ${skillBars(p)}
      <div class="an-card"><h4>Todos sus partidos</h4>${p.log.length ? `<div class="tbl-wrap"><table class="an-tbl"><thead><tr><th>Fecha</th><th>Rival</th><th>Resultado</th><th>K</th><th>D</th><th>A</th><th>K/D</th><th>ACS</th><th>MVP</th></tr></thead><tbody>
        ${p.log.slice().reverse().map(e => { const mm = D.played.find(q => q.id === e.mid); return `<tr><td>F${e.f}${e.lg ? " " + e.lg : ""}</td><td class="tn">${img(e.vs)}${esc(TM(e.vs).name)}</td><td>${e.won ? "Ganó" : "Perdió"}${mm ? ` ${e.team === mm.a ? mm.ra : mm.rb}-${e.team === mm.a ? mm.rb : mm.ra}` : ""}</td><td>${e.k}</td><td>${e.d}</td><td>${e.a}</td><td>${dec2(e.d ? e.k / e.d : e.k)}</td><td>${e.acs}</td><td>${mm && mm.mvpId === p.id ? "★" : ""}</td></tr>`; }).join("")}</tbody></table></div>` : '<p class="muted">Sin partidos todavía.</p>'}</div>
      <div class="an-card an-cmp"><h4>Comparar con otro jugador</h4><div class="rowbtns"><select id="anCmpSel" aria-label="Jugador para comparar"><option value="">Elegí un jugador</option>${others.map(q => `<option value="${q.id}">${esc(q.name)} · ${q.team ? esc(TM(q.team).name) : "libre"} · ${q.role}</option>`).join("")}</select><button class="btn sm" data-an-cmp>Comparar</button></div></div>
    </div></div></div>`;
}

// ---------- comparar 2 o 3 jugadores ----------
function compareHtml() {
  const ids = S.sc.cmp.filter(id => D.PM[id]).slice(0, 3); if (ids.length < 2) { S.sc.cmpOpen = false; return ""; }
  const Lg = scLeague(), mk = marketAccess();
  const P = ids.map((id, i) => { const p = D.PM[id], x = metricsOf(p), r = Lg.all[id]; return {p, x, pc: pcsOf(x, Lg), rating: r ? r.rating : null, c: VZ.cmp[i]}; });
  const rows = [["Rating ONYX", q => q.rating, 1, v => v ?? "–"], ["Partidos", q => q.x.m, 0, v => v], ["K/D", q => q.x.m ? q.x.kd : null, 1, v => v == null ? "–" : dec2(v)], ["ACS", q => q.x.m ? q.x.acs : null, 1, v => v ?? "–"],
    ["Kills por partido", q => q.x.m ? q.x.kpm : null, 1, v => v == null ? "–" : dec1(v)], ["Muertes por partido", q => q.x.m ? q.x.dpm : null, -1, v => v == null ? "–" : dec1(v)], ["Asist. por partido", q => q.x.m ? q.x.apm : null, 1, v => v == null ? "–" : dec1(v)],
    ["Kills por ronda", q => q.x.m ? q.x.kpr : null, 1, v => v == null ? "–" : dec2(v)], ["Victorias", q => q.x.m ? q.x.win : null, 1, v => v == null ? "–" : pctTxt(v)], ["MVP", q => q.x.mvps, 1, v => v], ["Asistencia a fechas", q => q.x.att, 1, v => v == null ? "–" : v + "%"]];
  if (mk) rows.push(["Valor", q => q.p.value, 0, v => fmt(v)], ["Cláusula", q => q.p.clause || null, 0, v => v ? fmt(v) : "–"]);
  const body = rows.map(([l, f, dir, fm]) => { const vals = P.map(f), ok = vals.filter(v => v != null), best = dir && ok.length > 1 ? (dir > 0 ? Math.max(...ok) : Math.min(...ok)) : null;
    return `<tr><th>${l}</th>${vals.map(v => `<td class="${best != null && v === best ? "best" : ""}">${fm(v)}${best != null && v === best ? " ★" : ""}</td>`).join("")}</tr>`; }).join("");
  const bars = SC_MET.filter(([f]) => P.some(q => q.pc[f] != null)).map(([f, l]) => `<div class="cmp-m"><span class="pc-l">${esc(l)}</span><div class="cmp-bars">${P.map(q => q.pc[f] == null ? `<div class="cmp-b"><span class="muted" style="font-size:11px">sin datos</span></div>` : `<div class="cmp-b" data-tiph="${esc(`<b>${q.pc[f]}</b> ${esc(q.p.name)} · mejor que el ${q.pc[f]}% de la liga`)}" tabindex="0"><i style="width:${Math.max(2, q.pc[f])}%;--c:${q.c}"></i><em>${q.pc[f]}</em></div>`).join("")}</div></div>`).join("");
  return `<div class="an" role="dialog" aria-modal="true" aria-label="Comparación de jugadores"><div class="an-panel" tabindex="-1">
    <div class="an-head"><div class="an-who"><div class="eyebrow">Scouting</div><h2>Comparar jugadores</h2></div><button class="x" data-an-close aria-label="Cerrar">×</button></div>
    <div class="an-body">
      <div class="vz-legend big">${P.map(q => `<span><i class="ln" style="--c:${q.c}"></i>${img(q.p.lastTeam)}<b>${esc(q.p.name)}</b><small>${q.p.role} · ${q.p.team ? esc(TM(q.p.team).name) : "libre"}</small><button class="linkish" data-an-open="${q.p.id}">ver análisis</button></span>`).join("")}</div>
      <div class="an-grid"><div class="an-card"><h4>Números</h4><div class="tbl-wrap"><table class="cmp-tbl"><thead><tr><th></th>${P.map(q => `<th><i class="ln" style="--c:${q.c}"></i>${esc(q.p.name)}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div><p class="adm-note">★ = el mejor en esa fila.</p></div>
        <div class="an-card"><h4>Comparados con la liga <small>percentil de 0 a 100</small></h4>${bars}</div></div>
    </div></div></div>`;
}

// ---------- tooltip compartido ----------
function tipEl() { let el = $("#vizTip"); if (!el) { el = document.createElement("div"); el.id = "vizTip"; el.className = "vz-tip"; el.setAttribute("role", "tooltip"); document.body.appendChild(el); } return el; }
function showTip(html, x, y) { const el = tipEl(); el.innerHTML = html; el.style.display = "block"; const r = el.getBoundingClientRect(); el.style.left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x + 14)) + "px"; el.style.top = Math.max(8, y - r.height - 12) + "px"; }
function hideTip() { const el = $("#vizTip"); if (el) el.style.display = "none"; }
const tipRows = r => `<div class="tt-h">${esc(r.head)}</div>${r.items.map(([c, v, l]) => `<div class="tt-r"><i style="--c:${c}"></i><b>${esc(String(v))}</b><span>${esc(l)}</span></div>`).join("")}`;
function vizMove(e) {
  const t = e.target.closest && e.target.closest("[data-vz],[data-tiph]"); if (!t) { hideTip(); $$("#anRoot .vz-xh,#anRoot .vz-hd").forEach(x => x.setAttribute("visibility", "hidden")); return; }
  const pos = e.clientX != null && e.type !== "focusin" ? [e.clientX, e.clientY] : (() => { const b = t.getBoundingClientRect(); return [b.left + b.width / 2, b.top]; })();
  if (t.dataset.tiph) { showTip(t.dataset.tiph, pos[0], pos[1]); return; }
  const d = VZD[t.dataset.vz]; if (!d) return;
  if (d.type === "bars") { showTip(tipRows(d.rows[+t.dataset.i]), pos[0], pos[1]); return; }
  const svg = t.ownerSVGElement, b = svg.getBoundingClientRect(), vx = (pos[0] - b.left) / b.width * d.W;
  let i = 0; d.xs.forEach((xx, j) => { if (Math.abs(xx - vx) < Math.abs(d.xs[i] - vx)) i = j; });
  const xh = svg.querySelector(".vz-xh"), hd = svg.querySelector(".vz-hd"), dot = svg.querySelectorAll("circle:not(.vz-hd)")[i];
  xh.setAttribute("x1", d.xs[i]); xh.setAttribute("x2", d.xs[i]); xh.setAttribute("visibility", "visible");
  if (dot) { hd.setAttribute("cx", dot.getAttribute("cx")); hd.setAttribute("cy", dot.getAttribute("cy")); hd.setAttribute("visibility", "visible"); }
  showTip(tipRows(d.rows[i]), pos[0], pos[1]);
}
$("#anRoot").addEventListener("pointermove", vizMove);
$("#anRoot").addEventListener("focusin", vizMove);
$("#anRoot").addEventListener("pointerleave", () => hideTip());
$("#anRoot").addEventListener("click", e => {
  if (e.target.classList.contains("an") || e.target.closest("[data-an-close]")) { closeAnalysis(); return; }
  const mb = e.target.closest("[data-an-metric]"); if (mb) { S.sc.metric = mb.dataset.anMetric; renderAnalysis(); return; }
  const of = e.target.closest("[data-an-offer]"); if (of) { const id = of.dataset.anOffer; closeAnalysis(); openOffer(id); return; }
  const op = e.target.closest("[data-an-open]"); if (op) { openAnalysis(op.dataset.anOpen); return; }
  if (e.target.closest("[data-an-cmp]")) { const v = ($("#anCmpSel") || {}).value; if (!v) { toast("Elegí con quién compararlo."); return; } S.sc.cmp = [S.sc.an, v]; S.sc.cmpOpen = true; renderAnalysis(); renderScouting(); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && (S.sc.an || S.sc.cmpOpen)) closeAnalysis(); });


// ---------- jugadores que le convienen a un equipo (para capitanes) ----------
const MAIN_ROLES = ["Duelista", "Iniciador", "Controlador", "Centinela"];
// [clave, nombre, 1 = más es mejor / -1 = menos es mejor, qué le falta al equipo si está flojo]
const TEAM_MET = [["kpr", "Kills por ronda", 1, "meter kills", "kills por ronda"], ["apr", "Asistencias por ronda", 1, "jugar en equipo", "asistencias por ronda"], ["dpr", "Supervivencia", -1, "sobrevivir: mueren mucho", "supervivencia"], ["acs", "Impacto (ACS)", 1, "impacto en las rondas", "impacto (ACS)"], ["kd", "K/D", 1, "ganar duelos", "K/D"]];
function teamStats(k) {
  const rs = D.P.filter(p => p.team === k), wm = rs.filter(p => p.s.m), sum = f => wm.reduce((t, p) => t + p.s[f], 0);
  const R = wm.reduce((t, p) => t + p.log.reduce((a, e) => a + (+e.rounds || 0), 0), 0), m = wm.reduce((t, p) => t + p.s.m, 0);
  return {k, roster: rs, n: wm.length, kpr: R ? sum("k") / R : null, apr: R ? sum("a") / R : null, dpr: R ? sum("d") / R : null,
    acs: m ? wm.reduce((t, p) => t + p.s.acs * p.s.m, 0) / m : null, kd: sum("d") ? sum("k") / sum("d") : null};
}
function teamDiagnosis(k) {
  const Lg = scLeague(), all = TEAM_KEYS.map(teamStats), me = all.find(t => t.k === k) || teamStats(k);
  const rank = (f, dir) => { const v = me[f]; if (v == null) return null; const vals = all.map(t => t[f]).filter(x => x != null); if (vals.length < 2) return null;
    return {pos: 1 + vals.filter(x => dir > 0 ? x > v : x < v).length, of: vals.length, pct: Math.round(vals.filter(x => dir > 0 ? x < v : x > v).length / (vals.length - 1) * 100)}; };
  const mets = TEAM_MET.map(([f, l, dir, need, low]) => ({f, l, low, dir, need, v: me[f], r: rank(f, dir)}));
  const w = {}; mets.forEach(x => { w[x.f] = x.r ? Math.max(0, (55 - x.r.pct) / 55) : 0; });
  const counts = Object.fromEntries(MAIN_ROLES.map(r => [r, me.roster.filter(p => p.role === r).length]));
  const missing = MAIN_ROLES.filter(r => !counts[r]);
  const rt = p => (Lg.all[p.id] || {}).rating;
  const weakRoles = MAIN_ROLES.filter(r => counts[r] && Math.max(...me.roster.filter(p => p.role === r).map(p => rt(p) ?? 50)) < 40);
  return {k, me, mets, w, counts, missing, weakRoles, rt};
}
function fitFor(dg, p) {
  const Lg = scLeague(), x = metricsOf(p), pc = pcsOf(x, Lg), r = Lg.all[p.id], rating = r ? r.rating : null, t = M.teams[dg.k];
  const base = rating ?? (x.m ? 40 : clamp(Math.round((rankValue(p.rank) - 100) / 14), 10, 70));
  const sw = TEAM_MET.reduce((s, [f]) => s + dg.w[f], 0);
  const need = x.m && sw ? TEAM_MET.reduce((s, [f]) => s + dg.w[f] * (pc[f] ?? 50), 0) / sw : base;
  const roleFit = dg.missing.includes(p.role) ? 100 : dg.weakRoles.includes(p.role) ? 60 : p.role === "Flex" ? 45 : p.role === "Suplente" ? 10 : 25;
  const afford = p.value <= (+t.coins || 0);
  const score = clamp(Math.round(.3 * base + .3 * need + .3 * roleFit + (afford ? 10 : 0) - (x.m ? 0 : 5)), 0, 100);
  const why = [];
  if (dg.missing.includes(p.role)) why.push(`No tienen ${p.role.toLowerCase()} y él juega de ${p.role.toLowerCase()}.`);
  else if (dg.weakRoles.includes(p.role)) why.push(`Su ${p.role.toLowerCase()} viene flojo: él puede ser titular ahí.`);
  if (x.m) { const best = dg.mets.filter(m => m.r && dg.w[m.f] > 0 && (pc[m.f] ?? 0) >= 60).sort((a, b) => dg.w[b.f] * pc[b.f] - dg.w[a.f] * pc[a.f])[0];
    if (best) why.push(`Tu equipo está ${best.r.pos}° de ${best.r.of} en ${best.low} y él es mejor que el ${pc[best.f]}% de la liga en eso.`); }
  const mates = dg.me.roster.filter(q => q.role === p.role && dg.rt(q) != null).sort((a, b) => dg.rt(a) - dg.rt(b))[0];
  if (mates && rating != null && rating - dg.rt(mates) >= 10) why.push(`Mejora a ${esc(mates.name)} (su ${p.role.toLowerCase()} con menos rating) por ${rating - dg.rt(mates)} puntos.`);
  if (!x.m) why.push(`Todavía no jugó: lo estimamos por su rango${p.rank ? ` (${esc(p.rank)})` : ""}.`);
  why.push(afford ? `Vale ${fmt(p.value)} y tienen ${fmt(t.coins)} coins.` : `Vale ${fmt(p.value)}: les faltan ${fmt(p.value - (+t.coins || 0))} coins.`);
  if (!p.team) why.push("Es agente libre: no hay que negociar con otro equipo."); else if (p.clause) why.push(`Está en ${esc(TM(p.team).name)} con cláusula de ${fmt(p.clause)}.`);
  const v = marketVerdict(p, x, rating); if (v.k === "good") why.push("Además es buena compra para lo que rinde.");
  return {p, x, pc, rating, score, why, afford, v};
}
S.sc.fit = {team: "", free: false, afford: false, more: false};
function renderFit() {
  const box = $("#scFit"), ct = capTeam(), staff = !!S.staff;
  if (!ct && !staff) { box.hidden = true; box.innerHTML = ""; return; }
  const F = S.sc.fit; if (ct) F.team = ct; else if (!TEAM_KEYS.includes(F.team)) F.team = TEAM_KEYS[0];
  const dg = teamDiagnosis(F.team), t = TM(F.team);
  let list = D.P.filter(p => p.team !== F.team && p.role !== "Suplente").map(p => fitFor(dg, p));
  if (F.free) list = list.filter(f => !f.p.team); if (F.afford) list = list.filter(f => f.afford);
  list.sort((a, b) => b.score - a.score);
  const shown = list.slice(0, F.more ? 12 : 6);
  const roleChips = MAIN_ROLES.map(r => `<span class="${dg.counts[r] ? (dg.weakRoles.includes(r) ? "weak" : "ok") : "miss"}">${r} <b>${dg.counts[r] ? dg.counts[r] : "falta"}</b></span>`).join("");
  const metRows = dg.mets.map(m => m.r ? `<div class="pc-row" tabindex="0" data-tiph="${esc(`${m.l}: <b>${m.dir < 0 ? dec2(m.v) + " muertes/ronda" : m.f === "acs" ? Math.round(m.v) : dec2(m.v)}</b><br>${m.r.pos}° de ${m.r.of} equipos`)}"><span class="pc-l">${m.l}<small>${m.r.pos}° de ${m.r.of}</small></span><span class="pc-track"><i style="width:${Math.max(2, m.r.pct)}%"></i><b></b></span><span class="pc-v">${m.r.pct}</span></div>` : "").join("");
  const needs = dg.mets.filter(m => m.r && m.r.pct < 45).map(m => m.need);
  const html = `<div class="fit-scan" aria-hidden="true"></div><div class="fit-head"><div><div class="eyebrow"><span class="fit-new">NUEVO</span> ONYX Scout · ${ct ? "solo para vos, capitán" : "vista de staff"}</div><h3>Jugadores que le convienen a ${staff && !ct ? `<select id="fitTeam" aria-label="Equipo">${TEAM_KEYS.map(k => `<option value="${k}" ${k === F.team ? "selected" : ""}>${esc(TM(k).name)}</option>`).join("")}</select>` : esc(t.name)}</h3></div>
      <div class="rowbtns"><label class="chk"><input type="checkbox" id="fitFree" ${F.free ? "checked" : ""}>Solo agentes libres</label><label class="chk"><input type="checkbox" id="fitAfford" ${F.afford ? "checked" : ""}>Que me alcancen los coins (${fmt(TM(F.team).coins)})</label></div></div>
    <div class="fit-grid"><div class="an-card"><h4>Cómo está jugando ${esc(t.name)}</h4>
        <div class="fit-roles">${roleChips}</div>
        ${metRows ? `<p class="adm-note">Comparado con los otros equipos (100 = el mejor):</p><div class="pc-bars">${metRows}</div>` : '<p class="adm-note">Cuando jueguen partidos, acá aparece en qué están fuertes y en qué flojos.</p>'}
        <p class="fit-need">${dg.missing.length ? `<b>Les falta:</b> ${dg.missing.map(r => r.toLowerCase()).join(", ")}. ` : ""}${needs.length ? `<b>Están flojos en:</b> ${needs.join(", ")}.` : dg.missing.length ? "" : "Están parejos: busquen calidad general."}</p></div>
      <div class="fit-list"><div class="fit-sub">Recomendados por nuestro sistema</div>${shown.map((f, i) => `<article class="fit-card ${i === 0 ? "key" : ""}" style="--tc:${TM(f.p.lastTeam).c};--i:${i}">
          <div class="fit-top">${img(f.p.lastTeam)}<div><b>${esc(f.p.name)}</b><small>${f.p.role} · ${f.p.team ? esc(TM(f.p.team).name) : "Agente libre"}</small></div>${i === 0 ? '<em class="fit-key">PIEZA CLAVE</em>' : ""}
            <span class="fit-score" title="Compatibilidad con tu equipo (0 a 100)"><b data-count="${f.score}">${f.score}</b><small>compat.</small></span></div>
          <div class="fit-meter"><i style="--w:${f.score}%"></i></div>
          <div class="fit-stats"><span>Rating <b>${f.rating ?? "–"}</b></span><span>K/D <b>${f.x.m ? dec2(f.x.kd) : "–"}</b></span><span>ACS <b>${f.x.m ? f.x.acs : "–"}</b></span><span>Valor <b>${fmt(f.p.value)}</b></span></div>
          <ul>${f.why.slice(0, 4).map(w => `<li>${w}</li>`).join("")}</ul>
          <div class="rowbtns"><button class="btn sm ghost" data-fit-an="${f.p.id}">Ver análisis</button>${ct ? `<button class="btn sm gold" data-fit-offer="${f.p.id}">Ofertar</button>` : ""}</div></article>`).join("") || '<p class="muted">No hay jugadores con esos filtros.</p>'}
        ${list.length > 6 ? `<button class="btn sm ghost" id="fitMore">${F.more ? "Ver menos" : `Ver más (${Math.min(12, list.length)})`}</button>` : ""}</div></div>
    <p class="adm-note">La compatibilidad mezcla: el rating del jugador, si los ayuda en lo que están flojos, si les cubre un rol que falta o viene débil, y si les alcanzan los coins.</p>`;
  box.hidden = false;
  if (box._html === html) return; // sin cambios: no se vuelve a dibujar (así la animación no se repite)
  const sig = F.team + "|" + shown.map(f => f.p.id).join(), replay = box._sig !== sig;
  box._html = html; box._sig = sig; box.innerHTML = html;
  if (replay) fitReveal(box);
}
// Animación de "descubrimiento": corre cuando la sección entra en pantalla o cambian los recomendados.
let fitIO = null;
function fitReveal(box) {
  box.classList.remove("play"); void box.offsetWidth;
  const go = () => {
    box.classList.add("play");
    if (reduced) return;
    $$("[data-count]", box).forEach((el, i) => { const to = +el.dataset.count, t0 = performance.now() + 250 + i * 110;
      const step = now => { const f = Math.max(0, Math.min(1, (now - t0) / 900)); el.textContent = Math.round(to * (1 - Math.pow(1 - f, 3))); if (f < 1) requestAnimationFrame(step); };
      el.textContent = "0"; requestAnimationFrame(step); });
  };
  if (!("IntersectionObserver" in window)) { go(); return; }
  if (fitIO) fitIO.disconnect();
  fitIO = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { fitIO.disconnect(); fitIO = null; go(); } }, {threshold: .2});
  fitIO.observe(box);
}
$("#scFit").addEventListener("change", e => {
  const F = S.sc.fit;
  if (e.target.id === "fitTeam") F.team = e.target.value; if (e.target.id === "fitFree") F.free = e.target.checked; if (e.target.id === "fitAfford") F.afford = e.target.checked;
  renderFit();
});
$("#scFit").addEventListener("click", e => {
  const an = e.target.closest("[data-fit-an]"); if (an) { openAnalysis(an.dataset.fitAn); return; }
  const of = e.target.closest("[data-fit-offer]"); if (of) { openOffer(of.dataset.fitOffer); return; }
  if (e.target.id === "fitMore") { S.sc.fit.more = !S.sc.fit.more; renderFit(); }
});
$("#scFit").addEventListener("pointermove", vizMove); $("#scFit").addEventListener("focusin", vizMove); $("#scFit").addEventListener("pointerleave", () => hideTip());

// ---------- sección Scouting: tabla de todos los jugadores ----------
const SC_COLS = [["name", "Jugador"], ["m", "PJ"], ["rating", "Rating"], ["kd", "K/D"], ["acs", "ACS"], ["kpm", "Kills/PJ"], ["dpm", "Muertes/PJ"], ["apm", "Asist/PJ"], ["win", "% Vict."], ["mvps", "MVP"], ["value", "Valor"]];
function renderScouting() {
  const Lg = scLeague(), mk = marketAccess(), F = S.sc, q = F.q.trim().toLowerCase();
  const tSel = $("#scTeam"); if (tSel && tSel.options.length !== TEAM_KEYS.length + 2) { const v = tSel.value || F.team; tSel.innerHTML = '<option value="all">Todos</option><option value="free">Agentes libres</option>' + TEAM_KEYS.map(k => `<option value="${k}">${esc(TM(k).name)}</option>`).join(""); tSel.value = [...tSel.options].some(o => o.value === v) ? v : "all"; }
  let rows = D.P.filter(p => (F.role === "all" || p.role === F.role) && (F.team === "all" || (F.team === "free" ? !p.team : p.team === F.team)) && p.s.m >= F.min && (!q || p.name.toLowerCase().includes(q)))
    .map(p => { const x = metricsOf(p), r = Lg.all[p.id]; return {p, x, rating: r ? r.rating : null}; });
  const val = (r, k) => k === "name" ? r.p.name : k === "rating" ? r.rating : k === "value" ? r.p.value : (r.x.m || k === "m" || k === "mvps" ? r.x[k] : null);
  const cols = SC_COLS.filter(([k]) => k !== "value" || mk);
  if (!cols.some(([k]) => k === F.sort)) F.sort = "rating";
  rows.sort((a, b) => { const A = val(a, F.sort), B = val(b, F.sort); if (A == null && B == null) return 0; if (A == null) return 1; if (B == null) return -1; return (typeof A === "string" ? A.localeCompare(B, "es") : A - B) * F.dir; });
  const cell = (r, k) => { const v = val(r, k); if (k === "name") return ""; if (v == null) return "–"; return k === "kd" ? dec2(v) : ["kpm", "dpm", "apm"].includes(k) ? dec1(v) : k === "win" ? pctTxt(v) : k === "value" ? fmt(v) : k === "rating" ? `<span class="sc-rt"><i style="width:${v}%"></i></span>${v}` : v; };
  $("#scTable").innerHTML = `<thead><tr><th class="ck" aria-label="Comparar"></th>${cols.map(([k, l]) => `<th data-sc-sort="${k}" class="${F.sort === k ? "sorted" : ""} ${k === "name" ? "nm" : ""}" title="Ordenar por ${l}">${l}${F.sort === k ? (F.dir > 0 ? " ▲" : " ▼") : ""}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r => `<tr data-sc-open="${r.p.id}" tabindex="0" style="--tc:${TM(r.p.lastTeam).c}"><td class="ck"><input type="checkbox" data-sc-ck="${r.p.id}" ${F.cmp.includes(r.p.id) ? "checked" : ""} aria-label="Comparar a ${esc(r.p.name)}"></td>
      ${cols.map(([k]) => k === "name" ? `<td class="nm"><span class="sc-p">${img(r.p.lastTeam)}<span><b>${esc(r.p.name)}</b><small>${r.p.role} · ${r.p.team ? esc(TM(r.p.team).name) : "Agente libre"}</small></span></span></td>` : `<td>${cell(r, k)}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length + 1}" class="muted" style="text-align:center;padding:18px">Ningún jugador coincide con los filtros.</td></tr>`}</tbody>`;
  const n = F.cmp.filter(id => D.PM[id]).length, bar = $("#scCmpBar");
  bar.hidden = !n; bar.innerHTML = n ? `<span>${F.cmp.filter(id => D.PM[id]).map(id => esc(D.PM[id].name)).join(" · ")}</span><button class="btn sm gold" data-sc-cmp ${n < 2 ? "disabled" : ""}>${n < 2 ? "Elegí otro para comparar" : `Comparar ${n}`}</button><button class="btn sm ghost" data-sc-clear>Limpiar</button>` : "";
  renderFit();
  if (S.sc.an || S.sc.cmpOpen) renderAnalysis();
}
ROLES.forEach(r => $("#scRole").insertAdjacentHTML("beforeend", `<option>${r}</option>`));
$("#scQ").addEventListener("input", e => { S.sc.q = e.target.value; renderScouting(); });
$("#scRole").addEventListener("change", e => { S.sc.role = e.target.value; renderScouting(); });
$("#scTeam").addEventListener("change", e => { S.sc.team = e.target.value; renderScouting(); });
$("#scMin").addEventListener("change", e => { S.sc.min = +e.target.value; renderScouting(); });
$("#scTable").addEventListener("click", e => {
  const th = e.target.closest("[data-sc-sort]"); if (th) { const k = th.dataset.scSort; if (S.sc.sort === k) S.sc.dir *= -1; else { S.sc.sort = k; S.sc.dir = k === "name" || k === "dpm" ? 1 : -1; } renderScouting(); return; }
  const ck = e.target.closest("[data-sc-ck]"); if (ck) { const id = ck.dataset.scCk; if (ck.checked) { if (S.sc.cmp.length >= 3) { ck.checked = false; toast("Podés comparar hasta 3 jugadores."); return; } S.sc.cmp.push(id); } else S.sc.cmp = S.sc.cmp.filter(x => x !== id); renderScouting(); return; }
  if (e.target.closest("td.ck")) return;
  const tr = e.target.closest("[data-sc-open]"); if (tr) openAnalysis(tr.dataset.scOpen);
});
$("#scTable").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("tr[data-sc-open]")) openAnalysis(e.target.dataset.scOpen); });
$("#scCmpBar").addEventListener("click", e => {
  if (e.target.closest("[data-sc-clear]")) { S.sc.cmp = []; renderScouting(); return; }
  if (e.target.closest("[data-sc-cmp]")) { S.sc.cmpOpen = true; S.sc.an = null; renderAnalysis(); }
});

/* ================= equipos ================= */
const ROLE_ICON = {
  Duelista: '<path d="M4 20 14 10M14 10l2-6 4 0-1 4-5 2zM6 14l4 4" />', Iniciador: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1"/>',
  Controlador: '<path d="M7 17a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A4 4 0 0 1 17 17z"/>', Centinela: '<path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6z"/>',
  Flex: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>', Suplente: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/>',
};
const roleSvg = r => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ROLE_ICON[r] || ROLE_ICON.Flex}</svg>`;
function renderTeams() {
  if (!S.teamSel) S.teamSel = S.my;
  $("#teams").innerHTML = TEAM_KEYS.map(k => { const r = D.real.find(x => x.k === k), t = TM(k);
    return `<button class="tcard cut tilt ${S.teamSel === k ? "on" : ""}" data-t="${k}" style="--tc:${t.c}">${img(k)}<b>${esc(t.name)}</b><span>${r.pos}° · ${r.pts} pts · ${roster(k).length} jugadores</span></button>`; }).join("");
  const k = S.teamSel, t = TM(k), r = D.real.find(x => x.k === k);
  const rs = roster(k).sort((a, b) => (b.id === t.captain) - (a.id === t.captain) || ROLES.indexOf(a.role) - ROLES.indexOf(b.role));
  $("#teamDetail").style.setProperty("--tc", t.c);
  $("#teamDetail").innerHTML = `<div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">${img(k).replace("<img", '<img style="width:72px;height:72px"')}
    <div><div class="eyebrow">${r.pos}° en la tabla</div><h3 class="team-name" style="font-size:clamp(22px,3vw,32px);font-family:var(--f-wide);font-weight:400;--tl:${t.l}">${esc(t.name)}</h3><div class="muted" style="font-size:14px">${r.g + r.gp} victorias · ${r.pp + r.p} derrotas · Dif ${r.dif > 0 ? "+" : ""}${r.dif} · K/D ${dec(r.kd)}</div></div>
    <div class="coins cut-s" style="margin-left:auto"><i class="coin"></i>${fmt(t.coins)}</div></div>
    ${coachesOf(k).length ? `<div class="td-coach"><svg class="ic"><use href="#i-whistle"/></svg><span>Coach: <b>${coachesOf(k).map(c => esc(c.name)).join("</b> y <b>")}</b></span><small>${fmt(coachesOf(k).length * coachCfg().salary)} coins de sueldo por semana</small></div>` : ""}
    <div class="roster">${rs.map(p => `<div class="prow2" style="--tc:${t.c}" data-p="${p.id}" tabindex="0"><span class="ava">${esc(p.name.slice(0, 2).toUpperCase())}</span>
      <div style="min-width:0"><b>${esc(p.name)}</b><small class="role">${roleSvg(p.role)}${p.role}</small></div>
      ${p.id === t.captain ? '<span class="badge c">CAPITÁN</span>' : p.id === t.sub ? '<span class="badge sc">SUBCAPITÁN</span>' : "<span></span>"}
      <span class="mono muted" style="font-size:12px;text-align:right">${p.s.m ? `K/D ${dec(p.s.kd)}<br>ACS ${p.s.acs}` : "Sin partidos"}</span></div>`).join("") || '<p class="muted">Sin jugadores cargados.</p>'}</div>${teamMatchesHtml(k)}`;
}
$("#teams").addEventListener("click", e => { const b = e.target.closest(".tcard"); if (!b) return; S.teamSel = b.dataset.t; renderTeams(); });
const RESP = [
  ["Alineación y horario", "Confirma los 5 titulares y el horario 24 h antes de cada fecha.", '<path d="M8 3v3M16 3v3M4 8h16M5 5h14v15H5zM9 13l2 2 4-4"/>'],
  ["Resultado con capturas", "Carga el marcador final con capturas dentro de las 2 h.", '<path d="M4 7h4l2-2h4l2 2h4v12H4zM12 10a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z"/>'],
  ["Representar al equipo", "Habla por el equipo en reclamos, denuncias y apelaciones.", '<path d="M12 3 4 6v5c0 4.4 3.4 8.4 8 10 4.6-1.6 8-5.6 8-10V6z"/>'],
  ["Mercado de fichajes", "Hace las ofertas del equipo. El equipo puede vetar por mayoría.", '<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5c0-1 1-1.6 2.5-1.6s2.5.7 2.5 1.7-1 1.5-2.5 1.9-2.5.9-2.5 2 1 1.6 2.5 1.6 2.5-.6 2.5-1.6"/>'],
  ["Estrategia y entrenamientos", "Organiza prácticas y prepara los mapas que le quedan al equipo.", '<path d="M4 18 9 9l4 5 3-4 4 8zM15 5h5v5"/>'],
  ["Clima del equipo", "Frena conflictos internos y cuida el fair play.", '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'],
];
$("#resp").innerHTML = RESP.map(([b, s, ic]) => `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ic}</svg><div><b>${b}</b><span>${s}</span></div></li>`).join("") +
  `<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M8 12h8M12 8v8"/><circle cx="12" cy="12" r="9"/></svg><div><b>Subcapitán</b><span>Reemplaza al capitán cuando no está y lo ayuda con la carga de resultados.</span></div></li>`;

/* ================= votación (simulación) ================= */
const vote = {team: null, phase: "cand", cand: null, signs: new Set(), votes: {}, result: null, cap: null};
function resetVote() { Object.assign(vote, {team: S.my, phase: "cand", cand: null, signs: new Set(), votes: {}, result: null, cap: null}); }
function renderVote() {
  if (vote.team !== S.my) resetVote();
  const k = vote.team, t = TM(k), rs = roster(k);
  const capId = vote.cap || t.captain, cap = D.PM[capId];
  if (rs.length < 3) { $("#vote").innerHTML = `<p class="muted">${esc(t.name)} necesita al menos 3 jugadores cargados para probar la votación.</p>`; return; }
  const N = rs.length, need = Math.ceil(N * 2 / 3);
  const si = Object.values(vote.votes).filter(v => v === "si").length, no = Object.values(vote.votes).filter(v => v === "no").length;
  const phases = [["cand", "Candidato"], ["firmas", "Firmas (2)"], ["votacion", "Votación"], ["resultado", "Resultado"]], pi = phases.findIndex(p => p[0] === vote.phase), C = 2 * Math.PI * 60;
  const hint = {cand: "Tocá al jugador que proponen como nuevo capitán.", firmas: `Tocá a 2 compañeros para que firmen la moción (${vote.signs.size}/2).`, votacion: "Tocá a cada jugador para marcar su voto: Sí → No → sin votar.", resultado: ""}[vote.phase];
  $("#vote").style.setProperty("--tc", t.c);
  $("#vote").innerHTML = `<div class="steps">${phases.map((p, i) => `<div class="${i < pi ? "done" : i === pi ? "cur" : ""}">${p[1]}</div>`).join("")}</div>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px">${img(k).replace("<img", '<img style="width:48px;height:48px"')}
      <div><div class="eyebrow">${esc(t.name)} · simulación</div><div style="font-family:var(--f-display);font-size:18px">Capitán actual: <b style="color:var(--gold)">${cap ? esc(cap.name) : "sin asignar"}</b>${vote.cand ? ` · Candidato: <b style="color:var(--accent-hi)">${esc(D.PM[vote.cand].name)}</b>` : ""}</div></div></div>
    ${vote.phase === "votacion" || vote.phase === "resultado" ? `<div class="ringwrap" style="margin-bottom:16px"><svg class="ring-svg" viewBox="0 0 150 150" role="img" aria-label="${si} votos a favor de ${N}, se necesitan ${need}">
        <circle class="trk" cx="75" cy="75" r="60"/><circle class="no" cx="75" cy="75" r="60" stroke-dasharray="${no / N * C} ${C}" stroke-dashoffset="${-(si / N * C)}"/><circle class="val" cx="75" cy="75" r="60" stroke-dasharray="${si / N * C} ${C}"/>
        <circle class="thr" cx="75" cy="75" r="60" stroke-dasharray="2.5 ${C}" stroke-dashoffset="${-(need / N * C) + 1.2}" style="transform:rotate(-90deg);transform-origin:75px 75px"/>
        <text x="75" y="72" text-anchor="middle" font-size="30">${si}/${N}</text><text x="75" y="94" text-anchor="middle" font-size="11" fill="var(--muted)" style="font-family:var(--f-mono)">A FAVOR</text></svg>
      <div><div class="muted" style="font-size:14px">Se necesitan <b style="color:var(--gold)">${need} de ${N}</b> votos a favor (la marca dorada). En contra: ${no}. Sin votar: ${N - si - no}.</div>
      ${vote.phase === "votacion" ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm ghost" id="vtSim">Simular los que faltan</button><button class="btn sm" id="vtClose">Cerrar votación</button></div>` : ""}</div></div>` : ""}
    ${vote.result ? `<div class="result ${vote.result.ok ? "ok" : "no"}" style="margin-bottom:14px">${esc(vote.result.text)}</div>` : ""}
    ${hint ? `<p class="muted" style="font-size:14px;margin-bottom:10px">${hint}</p>` : ""}
    <div class="voters">${rs.map(p => { const v = vote.votes[p.id], signed = vote.signs.has(p.id), isCap = p.id === capId, vv = vote.phase === "votacion" || vote.phase === "resultado";
      const tag = vv ? (v === "si" ? "SÍ" : v === "no" ? "NO" : "SIN VOTAR") : signed ? "FIRMÓ" : isCap ? "CAPITÁN" : p.role.toUpperCase();
      return `<button class="voter ${vv ? (v || "") : signed ? "signed" : ""} ${p.id === vote.cand ? "cand" : ""}" data-v="${p.id}" style="--tc:${t.c}" ${vote.phase === "resultado" ? "disabled" : ""}><span class="ava">${esc(p.name.slice(0, 2).toUpperCase())}</span><b>${esc(p.name)}</b><span class="vs">${tag}</span></button>`; }).join("")}</div>
    ${vote.phase === "resultado" ? `<div style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn ghost sm" id="vtReset">Probar de nuevo</button><span class="muted" style="font-size:13px">En la liga real, el admin registra el nuevo capitán y la próxima moción se habilita en 2 fechas.</span></div>` : ""}`;
}
$("#vote").addEventListener("click", e => {
  const k = vote.team, capId = vote.cap || TM(k).captain;
  if (e.target.closest("#vtReset")) { resetVote(); renderVote(); return; }
  if (e.target.closest("#vtSim")) { roster(k).forEach(p => { if (!vote.votes[p.id]) vote.votes[p.id] = Math.random() < .62 ? "si" : "no"; }); renderVote(); return; }
  if (e.target.closest("#vtClose")) {
    const N = roster(k).length, need = Math.ceil(N * 2 / 3), si = Object.values(vote.votes).filter(v => v === "si").length; vote.phase = "resultado";
    if (si >= need) { vote.cap = vote.cand; vote.result = {ok: true, text: `Aprobada con ${si} de ${N}. ${D.PM[vote.cand].name} sería el nuevo capitán de ${TM(k).name}.`}; confetti([TM(k).c, TM(k).l, "#ffcb52"]); }
    else vote.result = {ok: false, text: `Rechazada: ${si} de ${N} a favor, hacían falta ${need}.`};
    renderVote(); return;
  }
  const b = e.target.closest("[data-v]"); if (!b) return; const id = b.dataset.v;
  if (vote.phase === "cand") { if (id === capId) { toast("El capitán actual no puede ser candidato", k); return; } vote.cand = id; vote.phase = "firmas"; }
  else if (vote.phase === "firmas") {
    if (id === capId) { toast("El capitán no firma la moción en su contra", k); return; }
    if (id === vote.cand) { toast("El candidato no puede firmar su propia moción", k); return; }
    vote.signs.has(id) ? vote.signs.delete(id) : vote.signs.add(id);
    if (vote.signs.size >= 2) { vote.phase = "votacion"; toast("Moción aprobada: se abre la votación por 48 h", k); }
  } else if (vote.phase === "votacion") { const v = vote.votes[id]; if (!v) vote.votes[id] = "si"; else if (v === "si") vote.votes[id] = "no"; else delete vote.votes[id]; }
  renderVote();
});

/* ================= fair play ================= */
const LADDER = [["Leve", "Advertencia formal. Dos leves suman una moderada.", "−0", "#ffd34d"], ["Moderada", "−5 de fair play. Si se repite, −1 punto al equipo.", "−5 FP", "#ffb547"], ["Grave", "Suspensión del jugador por 1 o 2 fechas.", "−15 FP", "#ff7a45"], ["Muy grave", "Expulsión de la temporada (cuentas ajenas, trampas).", "−30 FP", "#ff4f6e"]];
$("#ladder").innerHTML = LADDER.map(([b, s, p, c]) => `<div class="lv" style="--sev:${c}"><i></i><div><b>${b}</b><span>${s}</span></div><em>${p}</em></div>`).join("") + `<p class="muted" style="font-size:13px;margin-top:6px">Toda sanción se puede apelar en 72 h ante un tribunal de 3 capitanes de equipos no involucrados.</p>`;
function myReports() { const d = S.uid && S.remote.reports[S.uid]; return (d && Array.isArray(d.items)) ? d.items : []; }
function renderFairPlay() {
  const openIdx = $$("#rulesAcc details").findIndex(d => d.open);
  $("#rulesAcc").innerHTML = (M.cfg.rules || []).map((r, i) => `<details ${i === (openIdx < 0 ? 0 : openIdx) ? "open" : ""}><summary>${esc(r.t)}</summary><div class="ab">${esc(r.d)}</div></details>`).join("");
  const L = TEAM_KEYS.map(k => ({k, v: +M.teams[k].fp})).sort((a, b) => b.v - a.v);
  $("#fpbars").innerHTML = L.map(x => `<div class="fpb" style="--tc:${TM(x.k).c}">${img(x.k)}<span class="bar"><i style="--w:${clamp(x.v, 0, 100)}%"></i></span><span class="v">${x.v}</span></div>`).join("") + `<p class="muted" style="font-size:13px;margin-top:6px">Los equipos que terminan con 100 ganan el premio Fair Play y +500 ONYX Coins.</p>`;
  const sel = $("#rpWho"), cur = sel.value;
  sel.innerHTML = '<option value="">Elegí un jugador</option>' + TEAM_KEYS.map(k => `<optgroup label="${esc(TM(k).name)}">${roster(k).map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</optgroup>`).join("");
  sel.value = cur;
  const ws = $("#rpWhen"), wcur = ws.value;
  ws.innerHTML = `<option value="">Sin partido / otro</option>` + [...D.played].reverse().map(m => `<option value="${m.id}">Fecha ${m.fecha} · ${esc(TM(m.a).name)} vs ${esc(TM(m.b).name)}</option>`).join("");
  ws.value = wcur;
  const gate = $("#rpGate"); if (gate) gate.hidden = !!S.captain;
  const sb = $("#report button[type=submit]"); if (sb) sb.disabled = !S.captain;
  const mine = myReports().slice().sort((a, b) => b.at - a.at);
  const order = ["recibida", "revision", "resuelta", "apelada", "cerrada"];
  $("#tickets").innerHTML = mine.map(r => { const si = order.indexOf(r.status), p = D.PM[r.pid];
    const steps = [["Recibida", 0], ["En revisión", 1], ["Resolución", 2], ["Apelación", 3]];
    return `<div class="ticket"><div class="th"><b>${esc(r.id.slice(-6).toUpperCase())}</b><span class="muted" style="font-size:13px">${esc(r.type)} · ${p ? esc(p.name) : "jugador"} · ${STATUS_REP[r.status] || r.status}</span></div>
      <div class="tl">${steps.map(([s, i]) => `<div class="${si > i || (i === 2 && si >= 2) ? "done" : si === i ? "cur" : ""}">${s}</div>`).join("")}</div>
      <p class="res">${r.resolution ? `<b>${esc(r.resolution)}</b>` : "La organización revisa la evidencia (hasta 48 h)."}</p></div>`; }).join("");
}
$("#report").addEventListener("submit", async e => {
  e.preventDefault();
  const type = $("#rpType").value, who = $("#rpWho").value, text = $("#rpText").value.trim(), link = $("#rpLink").value.trim(), matchId = $("#rpWhen").value;
  const err = !type ? "Elegí el motivo de la denuncia." : !who ? "Elegí a qué jugador denunciás." : text.length < 15 ? "Contá un poco más qué pasó (al menos 15 caracteres)." : (link && !/^https?:\/\//i.test(link)) ? "El link de la evidencia tiene que empezar con https://" : "";
  $("#rpErr").hidden = !err; $("#rpErr").textContent = err; if (err) return;
  if (M.ex) { toast("Modo de ejemplo: la denuncia no se envía."); return; }
  if (!S.captain || !S.uid) { $("#rpErr").hidden = false; $("#rpErr").textContent = "Las denuncias las hace el capitán de cada equipo. Entrá con tu cuenta de capitán."; return; }
  const uid = S.uid;
  const items = clone(myReports()); items.push({id: newId("r"), type, pid: who, matchId, link, text, at: Date.now(), status: "recibida", resolution: "", fpDelta: 0, applied: false});
  try { await save(`reports/${uid}`, {items}); e.target.reset(); toast("Denuncia enviada. Solo la ve la organización."); } catch (er) {}
});

/* ================= logros ================= */
const IC = {
  cross: '<circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/>', hand: '<path d="M4 13l4 4 4-4M8 17V7M20 11l-4-4-4 4M16 7v10"/>',
  shield: '<path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6z"/><path d="M9 12l2 2 4-4"/>', roller: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
  flame: '<path d="M12 21c-4 0-6-3-6-6 0-4 4-6 4-10 3 2 4 4 4 6 1-1 2-2 2-4 2 2 2 5 2 8 0 3-2 6-6 6z"/>', crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
  wall: '<path d="M3 6h18v12H3zM3 12h18M9 6v6M15 12v6"/>', leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15M5 19l7-7"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>', rocket: '<path d="M12 3c4 2 6 6 5 11l-3 3h-4l-3-3c-1-5 1-9 5-11zM10 17l-2 4M14 17l2 4"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>', cap: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5a4 4 0 1 0 0 5"/>',
};
function renderBadges() {
  const top = (f, min = 1) => D.P.filter(p => p.s.m >= min).sort((a, b) => f(b) - f(a))[0];
  const killer = top(p => p.s.k), assist = top(p => p.s.a), kd = top(p => p.s.kd, Math.min(3, Math.max(1, D.lastF)));
  const wall = D.P.filter(p => p.role === "Centinela" && p.s.m >= 1 && p.s.r).sort((a, b) => a.s.d / a.s.r - b.s.d / b.s.r)[0];
  const roll = [...D.played].sort((a, b) => Math.abs(b.ra - b.rb) - Math.abs(a.ra - a.rb))[0];
  const rollW = roll ? (+roll.ra > +roll.rb ? roll.a : roll.b) : null;
  const otw = {}; D.played.filter(m => m.ot).forEach(m => { const w = +m.ra > +m.rb ? m.a : m.b; otw[w] = (otw[w] || 0) + 1; });
  const otTeam = Object.entries(otw).sort((a, b) => b[1] - a[1])[0];
  const unbeaten = D.lastF ? D.real.find(r => r.pj && r.pp + r.p === 0) : null;
  const mvpc = {}; D.played.forEach(m => { if (m.mvpId) mvpc[m.mvpId] = (mvpc[m.mvpId] || 0) + 1; });
  const mvp2 = Object.entries(mvpc).filter(([id, c]) => c >= 2 && D.PM[id]).sort((a, b) => b[1] - a[1])[0];
  const subs = D.P.filter(p => p.role === "Suplente" && p.s.m).sort((a, b) => b.s.acs - a.s.acs)[0];
  const fp = TEAM_KEYS.filter(k => +M.teams[k].fp >= 100);
  const maps = TEAM_KEYS.map(k => [k, M.teams[k].used.length]).sort((a, b) => b[1] - a[1])[0];
  const pl = (p, s) => p && {k: p.lastTeam, b: p.name, s: s || `${TM(p.lastTeam).name} · ${p.role}`};
  const B = [
    ["Máquina de kills", "Más kills de la temporada", "cross", "#ff4f6e", "#7a1022", killer && pl(killer, `${killer.s.k} kills`)],
    ["Asistidor serial", "Más asistencias", "hand", "#22a8ff", "#0a3b75", assist && pl(assist, `${assist.s.a} asistencias`)],
    ["Intocable", "Mejor K/D", "shield", "#2fe29a", "#0b5a3a", kd && pl(kd, `K/D ${dec(kd.s.kd)}`)],
    ["Muralla", "Centinela con menos muertes por ronda", "wall", "#9aa4c4", "#2c3247", wall && pl(wall)],
    ["MVP repetido", "MVP en 2 o más partidos", "star", "#c9a6ff", "#3b1a7a", mvp2 ? pl(D.PM[mvp2[0]], `${mvp2[1]} veces MVP`) : null],
    ["Debut soñado", "Suplente con mejor ACS", "rocket", "#ff8a3d", "#6e2a05", subs && pl(subs, `ACS ${subs.s.acs}`)],
    ["Rodillo", "Victoria más amplia", "roller", "#1ccf52", "#07501f", roll && {k: rollW, b: TM(rollW).name, s: `${Math.max(roll.ra, roll.rb)}-${Math.min(roll.ra, roll.rb)} en la fecha ${roll.fecha}`}],
    ["Corazón de prórroga", "Más victorias en prórroga", "flame", "#ff6a1a", "#6e1d00", otTeam ? {k: otTeam[0], b: TM(otTeam[0]).name, s: `${otTeam[1]} en prórroga`} : null],
    ["Invicto", "Sin derrotas en la temporada", "crown", "#ffcb52", "#6e4a00", unbeaten ? {k: unbeaten.k, b: TM(unbeaten.k).name, s: "0 derrotas"} : null],
    ["Trotamundos", "El equipo que más mapas jugó", "map", "#5fc4ef", "#0b4a63", maps && maps[1] ? {k: maps[0], b: TM(maps[0]).name, s: `${maps[1]} mapas`} : null],
    ["Juego limpio", "Fair play en 100", "leaf", "#7ef0c0", "#0c4a37", fp.length ? {k: fp[0], b: fp.map(k => TM(k).name).join(" · "), s: `${fp.length} equipo${fp.length > 1 ? "s" : ""}`} : null],
    ["Capitán ejemplar", "Lo votan los capitanes al final", "cap", "#d6ccff", "#3a3466", null],
  ];
  $("#badges").innerHTML = B.map(([t, d, ic, b1, b2, who]) => `<div class="bdg ${who ? "" : "locked"}" tabindex="0"><div class="flip">
    <div class="face cut" style="--tc:${b1}"><div class="hexb" style="--b1:${b1};--b2:${b2}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[ic]}</svg></div><h4>${t}</h4><p>${d}</p></div>
    <div class="face back cut" style="--tc:${b1}">${who ? `<div class="who">${img(who.k)}<b>${esc(who.b)}</b><span class="muted" style="font-size:13px">${esc(who.s)}</span></div>` : `<div class="who"><b style="color:var(--dim)">Nadie todavía</b><span class="muted" style="font-size:13px">${d}</span></div>`}</div></div></div>`).join("");
}
$("#badges").addEventListener("click", e => { const b = e.target.closest(".bdg"); if (b) b.classList.toggle("flipped"); });

const IDEAS = [
  ["Tabla con desempates", "Puntos por victoria y prórroga, 6 criterios de desempate.", "#tabla"], ["Sorteo de mapas", "Cada equipo juega cada mapa una sola vez; el sorteo se transmite en vivo.", "#mapas"],
  ["Rankings individuales", "Kills, asistencias, K/D y ACS, por temporada y por fecha.", "#rankings"], ["Premios", "MVP de temporada y de fecha, mejor por rol y revelación.", "#premios"],
  ["Mercado con ONYX Coins", "Categorías S a C, ofertas y pases aprobados por el admin.", "#mercado"], ["Capitanes con funciones", "Alineación, resultados, reclamos, mercado y clima del equipo.", "#equipos"],
  ["Votación de capitán", "Moción con 2 firmas y mayoría de 2/3.", "#capitania"], ["Fair play", "Reglas, denuncias con evidencia, sanciones y apelaciones.", "#fairplay"],
  ["Reconocimientos", "Insignias para jugadores y equipos destacados.", "#logros"],
  ["Playoffs con cuadro", "Los mejores de la tabla mano a mano, al mejor de 3 o de 5.", "#playoffs"], ["Historia", "Campeones de cada temporada, títulos y récords de siempre.", "#historia"],
  ["Resultados por captura", "El capitán sube el marcador; si coincide con el rival, se carga solo.", "#reglamento"], ["Jugadores con Discord", "Perfil, asistencia, pronósticos y votación con tu cuenta de Discord.", "#perfil"],
  ["Pronósticos", "Elegí quién gana cada partido y competí en el ranking de la comunidad.", "#pronosticos"],
];
$("#ideaList").innerHTML = IDEAS.map(([b, s, h]) => `<a class="idea cut" href="${h}"><em>EN DISCUSIÓN</em><b>${b}</b><span>${s}</span></a>`).join("");

/* ================= ADMIN ================= */
const ADM_TABS = [["inicio","Inicio","Resumen"],["solicitudes","Solicitudes","Resumen"],["partidos","Partidos","Competencia"],["resultados","Resultados","Competencia"],["tabla","Tabla","Competencia"],["playoffs","Playoffs","Competencia"],["mapas","Mapas","Competencia"],
  ["jugadores","Jugadores","Personas"],["rendimiento","Rendimiento","Personas"],["equipos","Equipos","Personas"],["mercado","Mercado","Personas"],["coaches","Coaches","Personas"],["canjes","Canjes","Personas"],["economia","Economía","Personas"],["fairplay","Fair play","Personas"],
  ["general","General","Configuración"],["staff","Cuentas y auditoría","Configuración"],["seguridad","Seguridad","Configuración"],["bot","ONYX Bot","Configuración"]];
const ULTRA_TABS = ["tabla", "general", "staff", "seguridad", "bot"];
const ADM_ICON = {inicio: "i-grid", solicitudes: "i-inbox", partidos: "i-calendar", resultados: "i-check", tabla: "i-table", playoffs: "i-trophy", mapas: "i-map", jugadores: "i-users", rendimiento: "i-pulse", equipos: "i-shield", mercado: "i-coins", coaches: "i-whistle", canjes: "i-gift", economia: "i-wallet", fairplay: "i-scale", general: "i-sliders", staff: "i-key", seguridad: "i-lock", bot: "i-bot"};
const ico = (id, cls = "") => `<svg class="ic ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const ULTRA_ACTS = new Set(["bk-create","bk-dl","bk-restore","bk-upload","acc-revoke","season-close","po-del","lg-del","coach-del","cj-add","cj-pdel","cj-del","tbl-form","tbl-reset","team-add","team-del","team-hide","team-restore","logo-del","m-del","p-del","tr-del","map-del","map-add","used-reset-all","wipe-results","wipe-players","wipe-market","ex-copy","window-new","acc-add","acc-reset","acc-del","fixture-gen","fx-open","fecha-del","fecha-del-all","cap-add","cap-reset","cap-del","acc-import"]);
$("#adminBtn").addEventListener("click", () => openAdmin());
$("#staffLink").addEventListener("click", () => { if (S.captain) openCap(); else openAdmin(); });
$("#capBtn").addEventListener("click", () => openCap());
$("#meBtn").addEventListener("click", () => { if (S.member && !S.staff && !S.captain) goView("perfil"); else openAccount(); });
const opt = (v, l, sel) => `<option value="${esc(v)}" ${sel ? "selected" : ""}>${esc(l)}</option>`;
const teamOpts = (sel, withFree) => (withFree ? opt("", "Agente libre", !sel) : "") + TEAM_KEYS.map(k => opt(k, RM().teams[k].name, sel === k)).join("");
const roleOpts = sel => ROLES.map(r => opt(r, r, sel === r)).join("");
const fld = (label, inner) => `<label class="fld"><span>${label}</span>${inner}</label>`;
function renderAdmin() {
  const root = $("#adminRoot");
  if (S.adm.open && !S.staff) S.adm.open = false;
  if (!S.adm.open) { root.innerHTML = ""; return; }
  if ((!isUltra() && ULTRA_TABS.includes(S.adm.tab)) || (S.adm.tab === "bot" && !isBotAdmin())) S.adm.tab = "inicio";
  const ae = document.activeElement;
  if (root.contains(ae) && ae.matches("input,select,textarea")) { S.adm.dirty = true; return; }
  const body = $(".adm-body", root), scroll = body ? body.scrollTop : 0;
  const R = RM(), Dr = deriveFor(R);
  const tabHtml = {inicio: admInicio, solicitudes: admSolicitudes, rendimiento: admRendimiento, partidos: admPartidos, jugadores: admJugadores, tabla: admTabla, equipos: admEquipos, mercado: admMercado, mapas: admMapas, fairplay: admFair, general: admGeneral, staff: admStaff, bot: admBot, canjes: admCanjes, coaches: admCoaches, resultados: admResultados, playoffs: admPlayoffs, economia: admEconomia, seguridad: admSeguridad}[S.adm.tab](R, Dr);
  const cnt = admCounts(), badge = {solicitudes: cnt.req, mercado: cnt.off, fairplay: cnt.rep, canjes: cnt.cj, coaches: cnt.sal, resultados: cnt.res};
  let lastG = "";
  const tabsHtml = ADM_TABS.filter(([k]) => (isUltra() || !ULTRA_TABS.includes(k)) && (k !== "bot" || isBotAdmin())).map(([k, l, g]) => { const head = g !== lastG ? `<span class="grp">${g}</span>` : ""; lastG = g;
    return `${head}<button class="${S.adm.tab === k ? "on" : ""}" data-act="tab:${k}">${ico(ADM_ICON[k] || "i-grid")}<span>${l}</span>${badge[k] ? `<span class="tab-badge">${badge[k]}</span>` : ""}</button>`; }).join("");
  const again = !!root.querySelector(".adm");
  root.innerHTML = `<div class="adm ${isUltra() ? "is-ultra" : ""} ${again ? "noanim" : ""}" role="dialog" aria-modal="true" aria-label="Panel de administración"><div class="adm-panel">
    <div class="adm-head"><div class="adm-title">${ico("i-staff")}<div><h2>${isUltra() ? "Panel ultra" : "Panel de staff"}</h2><span class="save-state" id="saveState"></span></div></div><span class="sp"></span>
      <span class="who-chip ${isUltra() ? "ultra" : ""}">${ico("i-user")}${esc(S.staff.u)}<small>${isUltra() ? "Ultra staff" : "Staff"}</small></span>
      <button class="btn sm" data-act="stream">${ico("i-play")}<span>Modo streamer</span></button><button class="btn sm ghost" data-act="logout">${ico("i-logout")}<span>Cerrar sesión</span></button><button class="btn sm ghost icon-only" data-act="close" aria-label="Cerrar el panel" title="Cerrar (Esc)">${ico("i-close")}</button></div>
    <div class="adm-main"><nav class="adm-tabs" aria-label="Secciones del panel">${tabsHtml}</nav>
    <div class="adm-body">${M.ex ? `<div class="ex-banner cut-s" style="margin:0"><span><b>OJO</b> &nbsp;La página pública muestra datos de ejemplo porque la liga está vacía. Todo lo que cargues acá es real y reemplaza el ejemplo.</span></div>` : ""}${!S.db ? `<div class="ex-banner cut-s" style="margin:0"><span><b>SIN BASE DE DATOS</b> &nbsp;Abrí la página publicada para guardar cambios.</span></div>` : ""}${tabHtml}</div></div></div></div>`;
  setSaveState(); if (S.adm.tab === "staff") renderAuditList();
  const nb = $(".adm-body", root); if (nb) nb.scrollTop = scroll;
}
function deriveFor(R) { const keepM = M, keepD = D; M = R; derive(); const out = D; M = keepM; D = keepD; return {...out, M: R}; }
$("#adminRoot").addEventListener("focusout", () => setTimeout(() => { const ae = document.activeElement; if (S.adm.dirty && !($("#adminRoot").contains(ae) && ae.matches("input,select,textarea"))) { S.adm.dirty = false; renderAdmin(); } }, 30));

function matchLabel(R, m) { return `F${m.fecha}${m.leg ? " " + LEG_L[m.leg] : ""} · ${R.teams[m.a] ? R.teams[m.a].name : "?"} vs ${R.teams[m.b] ? R.teams[m.b].name : "?"}`; }
function admPartidos(R, Dr) {
  const ms = Dr.ms;
  const allP = Object.entries(R.players).map(([id, p]) => ({id, ...p})).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  const qm = S.adm.quickMatch && R.matches[S.adm.quickMatch] ? S.adm.quickMatch : (Dr.played.slice(-1)[0] || ms[0] || {}).id;
  const qmm = qm ? R.matches[qm] : null;
  const qPlayers = qmm ? allP.filter(p => p.team === qmm.a || p.team === qmm.b || (qmm.stats && qmm.stats[p.id])) : [];
  const quick = `<div class="adm-card"><h3>Carga rápida de estadísticas <small>elegí partido y jugador, poné los números y guardá</small></h3>
    ${ms.length ? `<div class="fgrid">${fld("Partido", `<select id="qMatch" data-act-change="qmatch">${ms.map(m => opt(m.id, matchLabel(R, m) + (m.status === "played" ? ` (${m.ra}-${m.rb})` : " (pendiente)"), m.id === qm)).join("")}</select>`)}
      ${fld("Jugador", `<select id="qPlayer">${qPlayers.length ? qPlayers.map(p => opt(p.id, `${p.name} · ${p.team ? R.teams[p.team].name : "libre"}`, false)).join("") : opt("", "No hay jugadores de estos equipos", true)}</select>`)}
      ${fld("Kills", `<input id="qK" type="number" min="0" inputmode="numeric" placeholder="0">`)}${fld("Muertes", `<input id="qD" type="number" min="0" inputmode="numeric" placeholder="0">`)}
      ${fld("Asistencias", `<input id="qA" type="number" min="0" inputmode="numeric" placeholder="0">`)}${fld("ACS", `<input id="qACS" type="number" min="0" inputmode="numeric" placeholder="0">`)}</div>
      <div class="rowbtns"><button class="btn sm gold" data-act="quick-save">Guardar estadísticas</button><span class="adm-note">Si el jugador ya tenía números en ese partido, se reemplazan. Para que cuenten en los rankings, el partido tiene que estar marcado como jugado.</span></div>` : `<p class="adm-note">Primero creá los partidos.</p>`}</div>`;
  const iv = S.adm.nmType !== "single";
  const add = `<div class="adm-card"><h3>Agregar partido</h3>
    <div class="seg nm-type" role="group" aria-label="Tipo">${[["iv", "Ida y vuelta", "2 partidos: en la vuelta se invierte local y visitante"], ["single", "Partido único", "1 partido"]].map(([v, l, t]) => `<button type="button" data-nm-type="${v}" class="${(v === "iv") === iv ? "on" : ""}" title="${t}" aria-pressed="${(v === "iv") === iv}">${l}</button>`).join("")}</div>
    <div class="fgrid">
    ${fld("Fecha N°", `<input id="nmF" type="number" min="1" value="${Dr.nextF || Dr.fechas + 1 || 1}">`)}${fld("Equipo A", `<select id="nmA">${teamOpts(TEAM_KEYS[0])}</select>`)}${fld("Equipo B", `<select id="nmB">${teamOpts(TEAM_KEYS[1])}</select>`)}
    <label class="fld"><span id="nmDateL">${iv ? "Día y hora de la ida" : "Día y hora"}</span><input id="nmDate" type="datetime-local"></label>
    <label class="fld" id="nmDate2W" ${iv ? "" : "hidden"}><span>Día y hora de la vuelta</span><input id="nmDate2" type="datetime-local"></label></div>
    <div class="rowbtns"><button class="btn sm" data-act="m-add" id="nmGo">${iv ? "Agregar ida y vuelta" : "Agregar partido"}</button>
      <span class="adm-note" id="nmNote">${iv ? "Se crean los dos partidos de la fecha: la ida (A vs B) y la vuelta (B vs A). Cada uno tiene sus propias stats y cada capitán elige el mapa de uno de los dos." : "Se crea un solo partido."}</span></div></div>`;
  const byF = {}; ms.forEach(m => (byF[m.fecha] = byF[m.fecha] || []).push(m));
  const list = Object.keys(byF).map(Number).sort((a, b) => a - b).map(f => {
    const credited = R.cfg.credited.includes(f), allPlayed = byF[f].every(m => m.status === "played");
    return `<div class="adm-card"><h3>Fecha ${f} <small>${byF[f].filter(m => m.status === "played").length}/${byF[f].length} jugados</small><span style="flex:1"></span>
      <button class="btn sm ghost danger ultra-only" data-act="fecha-del:${f}">Borrar fecha</button><button class="btn sm ${credited ? "ghost" : ""}" data-act="credit:${f}" ${credited || !allPlayed ? "disabled" : ""} title="${!allPlayed ? "Se habilita cuando todos los partidos de la fecha estén jugados" : ""}">${credited ? "Coins acreditados" : "Acreditar coins de la fecha"}</button></h3>
      <div style="display:grid;gap:6px">${byCruce(byF[f]).map(m => admMatchRow(R, Dr, m, allP)).join("")}</div></div>`;
  }).join("");
  const gen = `<div class="adm-card ultra-only"><h3>${ico("i-calendar")} Fixture de la temporada <small>solo ultra staff</small></h3>
    <p class="adm-note">Sorteá todas las fechas de una vez: todos contra todos 2 veces (o las que quieras), en fechas distintas, con local y visitante parejos. Antes de crear ves cómo queda y podés sortear de nuevo.${ms.length ? ` Ya hay ${Dr.fechas} fecha${Dr.fechas === 1 ? "" : "s"}: las nuevas se agregan a continuación (o borrá todo y empezá de cero).` : ""}</p>
    <div class="rowbtns"><button class="btn sm gold" data-act="fx-open">${ico("i-swap")}<span>Generar todas las fechas</span></button>${ms.length ? `<button class="btn sm danger" data-act="fecha-del-all">Borrar todas las fechas</button>` : ""}</div></div>`;
  return gen + quick + add + (list || `<div class="adm-card"><p class="adm-note">Todavía no hay partidos.</p></div>`);
}
function admMatchRow(R, Dr, m, allP) {
  const open = S.adm.openMatch === m.id, A = R.teams[m.a] || {name: "?"}, B = R.teams[m.b] || {name: "?"};
  const played = m.status === "played";
  const sum = `<button class="msum" data-act="m-open:${m.id}" aria-expanded="${open}"><span class="mono muted">F${m.fecha}${m.leg ? `<br><b class="leg ${m.leg}">${LEG_L[m.leg]}</b>` : ""}</span>
    <span class="vs">${img(m.a)}${esc(A.name)} <span class="sc" style="color:${played ? "#fff" : "var(--dim)"}">${played ? `${m.ra}-${m.rb}` : "vs"}</span> ${esc(B.name)}${img(m.b)}</span>
    <span class="meta">${played ? "Jugado" + (m.ot ? " · PR" : "") + (m.noShow ? " · W.O." : "") : "Pendiente"}<br>${m.map ? esc(m.map) : "sin mapa"} · ${fmtDate(m.date)}</span></button>`;
  if (!open) return `<div class="mrow" style="--st:${played ? "var(--win)" : "var(--line-2)"}">${sum}</div>`;
  const b = (f) => `match:${m.id}:${f}`;
  const editor = `<div class="medit"><div class="fgrid">
    ${fld("Fecha N°", `<input type="number" min="1" value="${m.fecha}" data-bind="${b("fecha")}" data-t="n">`)}
    ${fld("Día y hora", `<input type="datetime-local" value="${esc((m.date || "").slice(0, 16))}" data-bind="${b("date")}" data-t="s">`)}
    ${fld("Ida / vuelta", `<select data-bind="${b("leg")}" data-t="sn">${opt("", m.legs === 2 ? `Automático (${LEG_L[m.leg]})` : "Automático", !(R.matches[m.id] || {}).leg)}${opt("ida", "Ida", (R.matches[m.id] || {}).leg === "ida")}${opt("vuelta", "Vuelta", (R.matches[m.id] || {}).leg === "vuelta")}</select>`)}
    ${fld("Equipo A", `<select data-bind="${b("a")}" data-t="s">${teamOpts(m.a)}</select>`)}${fld("Equipo B", `<select data-bind="${b("b")}" data-t="s">${teamOpts(m.b)}</select>`)}
    ${fld("Estado", `<select data-bind="${b("status")}" data-t="s">${opt("pending", "Pendiente", !played)}${opt("played", "Jugado", played)}</select>`)}
    ${fld("Rondas " + esc(A.name), `<input type="number" min="0" value="${m.ra ?? ""}" data-bind="${b("ra")}" data-t="nn">`)}${fld("Rondas " + esc(B.name), `<input type="number" min="0" value="${m.rb ?? ""}" data-bind="${b("rb")}" data-t="nn">`)}
    ${fld("Prórroga", `<span class="chk"><input type="checkbox" ${m.ot ? "checked" : ""} data-bind="${b("ot")}" data-t="b">Se definió en prórroga</span>`)}
    ${fld("W.O.", `<select data-bind="${b("noShow")}" data-t="sn">${opt("", "Ninguno", !m.noShow)}${opt("a", esc(A.name) + " no se presentó", m.noShow === "a")}${opt("b", esc(B.name) + " no se presentó", m.noShow === "b")}</select>`)}
    ${fld("Mapa", `<select data-bind="${b("map")}" data-t="sn">${opt("", "Sin mapa", !m.map)}${R.cfg.maps.map(x => opt(x.n, x.n, m.map === x.n)).join("")}</select>`)}
    ${fld("Proyección oficial", `<select data-bind="${b("proj")}" data-t="sn">${opt("", "Sin proyección", !m.proj)}${opt("A", "Gana " + A.name, m.proj === "A")}${opt("a", "Gana " + A.name + " en prórroga", m.proj === "a")}${opt("b", "Gana " + B.name + " en prórroga", m.proj === "b")}${opt("B", "Gana " + B.name, m.proj === "B")}</select>`)}
    ${fld("MVP", `<select data-bind="${b("mvp")}" data-t="sn">${opt("", "Automático (mayor ACS)", !m.mvp)}${Object.keys(m.stats || {}).filter(id => R.players[id]).map(id => opt(id, R.players[id].name, m.mvp === id)).join("")}</select>`)}</div>
    ${admStatsTable(R, m, allP)}
    <div class="rowbtns"><button class="btn sm ghost" data-act="m-open:${m.id}">Cerrar</button><button class="btn sm danger ultra-only" data-act="m-del:${m.id}">Borrar partido</button></div></div>`;
  return `<div class="mrow" style="--st:${played ? "var(--win)" : "var(--gold)"}">${sum}${editor}</div>`;
}
function admStatsTable(R, m, allP) {
  const ids = new Set(allP.filter(p => p.team === m.a || p.team === m.b).map(p => p.id).concat(Object.keys(m.stats || {}).filter(id => R.players[id])));
  const rows = [...ids].map(id => ({id, ...R.players[id]})).sort((a, b) => ((m.stats || {})[a.id] ? (m.stats[a.id].t || a.team) : a.team || "").localeCompare(((m.stats || {})[b.id] ? (m.stats[b.id].t || b.team) : b.team || "")) || (a.name || "").localeCompare(b.name || ""));
  if (!rows.length) return `<p class="adm-note">No hay jugadores cargados en ${esc(R.teams[m.a].name)} ni ${esc(R.teams[m.b].name)}. Agregalos en la pestaña Jugadores.</p>`;
  const tr = p => { const s = (m.stats || {})[p.id], on = !!s, t = s ? s.t : p.team; const k = f => `stat:${m.id}:${p.id}:${f}`;
    return `<tr><td><input type="checkbox" ${on ? "checked" : ""} data-bind="stplay:${m.id}:${p.id}" data-t="b" aria-label="${esc(p.name)} jugó"></td><td class="nm">${img(t)} ${esc(p.name)}</td>
      ${["k", "d", "a", "acs"].map(f => `<td><input class="cell-in" type="number" min="0" value="${on ? (s[f] ?? 0) : ""}" ${on ? "" : "disabled"} data-bind="${k(f)}" data-t="n" aria-label="${f}"></td>`).join("")}</tr>`; };
  return `<div class="stbl-wrap"><table class="stbl"><thead><tr><th>Jugó</th><th>Jugador</th><th>Kills</th><th>Muertes</th><th>Asist.</th><th>ACS</th></tr></thead><tbody>${rows.map(tr).join("")}</tbody></table></div>`;
}
function admJugadores(R, Dr) {
  const ps = Object.entries(R.players).map(([id, p]) => ({id, ...p})).filter(p => S.adm.pTeam === "all" || (S.adm.pTeam === "free" ? !p.team : p.team === S.adm.pTeam))
    .sort((a, b) => (a.team || "zz").localeCompare(b.team || "zz") || ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || (a.name || "").localeCompare(b.name || ""));
  const add = `<div class="adm-card"><h3>Agregar jugadores</h3><div class="fgrid">${fld("Nombre", `<input id="npName" maxlength="40" placeholder="Ej: Jagger" autocomplete="off">`)}${fld("Equipo", `<select id="npTeam">${teamOpts(S.adm.pTeam !== "all" && S.adm.pTeam !== "free" ? S.adm.pTeam : "", true)}</select>`)}${fld("Rol", `<select id="npRole">${roleOpts("Duelista")}</select>`)}${fld("Rango (opcional)", `<input id="npRank" placeholder="Inmortal 1" autocomplete="off">`)}${fld("Riot ID (para Tracker)", `<input id="npIgn" placeholder="Jagger#LAS" maxlength="22" autocomplete="off" spellcheck="false">`)}</div>
    <div class="rowbtns"><button class="btn sm gold" data-act="p-add">Agregar jugador</button></div>
    ${fld("O pegá varios, uno por línea: nombre y Riot ID separados por coma (van al equipo y rol elegidos)", `<textarea id="npBulk" rows="3" placeholder="Jagger, Jagger#LAS&#10;Nova, Nova#ARG&#10;..."></textarea>`)}
    <div class="rowbtns"><button class="btn sm" data-act="p-bulk">Agregar todos</button></div></div>`;
  const filt = `<div class="rowbtns">${[["all", "Todos"], ...TEAM_KEYS.map(k => [k, R.teams[k].name]), ["free", "Libres"]].map(([k, l]) => `<button class="chip ${S.adm.pTeam === k ? "on" : ""}" data-act="pteam:${k}" style="padding-left:10px">${esc(l)}</button>`).join("")}</div>`;
  const rows = ps.map(p => { const b = f => `player:${p.id}:${f}`, dp = Dr.PM[p.id];
    return `<div class="prow3 pl">${`<input class="cell-in" value="${esc(p.name)}" data-bind="${b("name")}" data-t="s" aria-label="Nombre">`}<select class="cell-in" data-bind="${b("team")}" data-t="sn" aria-label="Equipo">${teamOpts(p.team, true)}</select><select class="cell-in" data-bind="${b("role")}" data-t="s" aria-label="Rol">${roleOpts(p.role)}</select><input class="cell-in" value="${esc(p.rank || "")}" placeholder="Rango" data-bind="${b("rank")}" data-t="s" aria-label="Rango"><input class="cell-in" type="number" min="${CAP_VAL_MIN}" max="${CAP_VAL_MAX}" step="50" value="${p.value ?? ""}" placeholder="${dp ? dp.auto : ""} auto" data-bind="${b("value")}" data-t="nn" aria-label="Valor de mercado" title="Valor de mercado (100 a 1.500). Vacío = automático"><input class="cell-in" type="number" min="0" max="${CAP_CLAUSE_MAX}" step="50" value="${+p.clause || ""}" placeholder="Sin cláusula" data-bind="${b("clause")}" data-t="n" aria-label="Cláusula de rescisión" title="Cláusula de rescisión (hasta 3.000). Vacío = sin cláusula"><span class="rowbtns"><span class="mono muted" style="font-size:11px">${dp && dp.s.m ? `${dp.s.m} PJ · ${dp.s.k}/${dp.s.d}/${dp.s.a}` : "0 PJ"}</span><button class="btn sm danger ultra-only" data-act="p-del:${p.id}">Borrar</button></span></div>`; }).join("");
  return add + admLinksCard(R) + `<div class="adm-card"><h3>Jugadores <small>${Object.keys(R.players).length} cargados · el valor vacío se calcula solo según rendimiento</small></h3>${filt}<div class="prow3 pl" style="background:none;padding:0 6px"><span class="adm-note">Nombre</span><span class="adm-note">Equipo</span><span class="adm-note">Rol</span><span class="adm-note">Rango</span><span class="adm-note">Valor</span><span class="adm-note">Cláusula</span><span></span></div><div class="ptable">${rows || '<p class="adm-note">No hay jugadores en este filtro.</p>'}</div></div>`;
}
function admCounts() {
  const req = Object.values(S.requests).filter(r => r.status === "pend").length;
  const off = allOffers().filter(o => o.status === "pend").length;
  let rep = 0; Object.values(S.remote.reports).forEach(d => (d.items || []).forEach(r => { if (["recibida", "revision", "apelada"].includes(r.status)) rep++; }));
  const cj = Object.values(S.remote.redeems).filter(r => r.status === "pend").length;
  const sal = TEAM_KEYS.filter(k => teamPendSal(k).length).length;
  const res = new Set(Object.values(S.remote.results || {}).filter(r => r.status === "pend").map(r => r.mid)).size;
  return {req, off, rep, cj, sal, res};
}
function admInicio(R, Dr) {
  const c = admCounts(), now = Date.now();
  const late = Dr.pending.filter(m => { const d = parseLocal(m.date); return d && d.getTime() < now; });
  const nextF = Dr.nextF, nd = M.cfg.nextDate || (Dr.pending.find(m => m.fecha === nextF && m.date) || {}).date;
  const caps = Object.values(S.captainList), capNoTeam = caps.filter(x => !x.team && x.active !== false).length;
  const tile = (n, label, tab, hot) => `<button class="tile ${n ? (hot ? "hot" : "") : "ok"}" data-act="tab:${tab}"><b>${n}</b><span>${label}</span></button>`;
  const recent = Object.entries(S.requests).map(([id, r]) => ({id, ...r})).sort((a, b) => b.at - a.at).slice(0, 5);
  return `<div class="adm-card"><h3>Hola, ${esc(S.staff.u)} <small>${isUltra() ? "Ultra staff" : "Staff"} · ${esc(R.cfg.season)}</small></h3>
      <div class="tiles">${tile(c.req, "solicitudes de capitanes", "solicitudes", true)}${tile(c.off, "ofertas del mercado", "mercado", true)}${tile(c.rep, "denuncias abiertas", "fairplay", true)}${tile(late.length, "partidos vencidos sin resultado", "partidos", true)}${tile(c.res, "resultados de capitanes por revisar", "resultados", true)}
        <button class="tile" data-act="tab:partidos"><b>${nextF ? "F" + nextF : "–"}</b><span>próxima fecha · ${fmtDate(nd)}</span></button>
        ${isUltra() ? `<button class="tile ${capNoTeam ? "hot" : ""}" data-act="tab:staff"><b>${caps.length}</b><span>capitanes${capNoTeam ? ` · ${capNoTeam} sin equipo` : ""}</span></button>` : ""}</div></div>
    <div class="adm-card"><h3>Accesos rápidos</h3><div class="quick">
      <button class="btn sm gold" data-act="tab:partidos">Cargar resultados y stats</button><button class="btn sm" data-act="tab:rendimiento">Asistencia y puntos</button>
      <button class="btn sm" data-act="tab:jugadores">Agregar jugadores</button><button class="btn sm ghost" data-act="stream">Modo streamer</button></div></div>
    <div class="adm-card"><h3>Últimas solicitudes de capitanes</h3><div style="display:grid;gap:6px">${recent.map(r => reqRow(R, r, false)).join("") || '<p class="adm-note">Todavía no hay solicitudes.</p>'}</div>
      ${recent.length ? `<div class="rowbtns"><button class="btn sm ghost" data-act="tab:solicitudes">Ver todas</button></div>` : ""}</div>`;
}
function reqText(R, r) {
  const t = (R.teams[r.team] || {name: r.team}).name;
  if (r.type === "coachreg") return `<b>${esc(r.name || "?")}</b> pide ser coach de ${esc(t)} (cuenta de la página) · sueldo <b class="mono">${fmt(coachCfg().salary)}</b> coins por semana`;
  if (r.type === "link") return `Vincular la cuenta <b>${esc(r.name || "?")}</b> con el jugador <b>${esc(r.pname || "?")}</b>${r.team ? " de " + esc(t) : " (libre)"}`;
  if (r.type === "coach") return `Fichar al coach <b>${esc(r.name || "?")}</b> en ${esc(t)} · sueldo <b class="mono">${fmt(coachCfg().salary)}</b> coins por semana`;
  if (r.type === "coachOut") return `Dar de baja al coach <b>${esc(r.name || "?")}</b> de ${esc(t)}`;
  if (r.type === "add") return `Agregar a <b>${esc(r.name)}</b> en ${esc(t)} · ${esc(r.role || "")}${r.rank ? " · " + esc(r.rank) : ""}${r.ign ? " · " + esc(r.ign) : ""} · valor <b class="mono">${fmt(r.value)}</b> · cláusula <b class="mono">${r.clause ? fmt(r.clause) : "sin cláusula"}</b>`;
  const p = R.players[r.pid], nm = p ? p.name : r.name || "jugador borrado";
  const dv = r.prevValue != null && r.prevValue !== r.value ? `${fmt(r.prevValue)} → ` : "", dc = (+r.prevClause || 0) !== (+r.clause || 0) ? `${+r.prevClause ? fmt(r.prevClause) : "sin cláusula"} → ` : "";
  return `Cambiar a <b>${esc(nm)}</b> (${esc(t)}): valor <b class="mono">${dv}${fmt(r.value)}</b> · cláusula <b class="mono">${dc}${r.clause ? fmt(r.clause) : "sin cláusula"}</b>`;
}
function reqRow(R, r, actions) {
  const st = {pend: ["Pendiente", "pend", "var(--gold)"], ok: ["Aprobada", "ok", "var(--win)"], no: ["Rechazada", "no", "var(--loss)"]}[r.status] || ["?", "pend", "var(--dim)"];
  return `<div class="req" style="--st:${st[2]}">${img(r.team)}<div><div class="rq-t">${reqText(R, r)}</div>
      <div class="rq-m">Pedido por ${esc(r.u || "capitán")} · ${new Date(r.at).toLocaleString("es-AR", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"})}${r.reviewedBy ? ` · ${st[0].toLowerCase()} por ${esc(r.reviewedBy)}` : ""}${r.note ? ` · “${esc(r.note)}”` : ""}</div></div>
    <div class="rq-acts">${actions && r.status === "pend" ? `<input class="cell-in" id="rqNote-${r.id}" placeholder="Nota para el capitán (opcional)" maxlength="200" autocomplete="off"><span class="rowbtns"><button class="btn sm gold" data-act="rq-ok:${r.id}">Aprobar</button><button class="btn sm ghost" data-act="rq-no:${r.id}">Rechazar</button></span>` : `<span class="st ${st[1]}">${st[0]}</span>`}</div></div>`;
}
function admSolicitudes(R) {
  const L = Object.entries(S.requests).map(([id, r]) => ({id, ...r})).sort((a, b) => (a.status === "pend" ? 0 : 1) - (b.status === "pend" ? 0 : 1) || b.at - a.at);
  const pend = L.filter(r => r.status === "pend"), shown = S.adm.rqAll ? L : pend;
  return `<div class="adm-card"><h3>Solicitudes de capitanes <small>${pend.length} pendientes · los capitanes no pueden cambiar nada sin tu aprobación</small></h3>
      <div class="seg"><button class="${S.adm.rqAll ? "" : "on"}" data-act="rq-filter:pend">Pendientes</button><button class="${S.adm.rqAll ? "on" : ""}" data-act="rq-filter:all">Todas</button></div>
      <div style="display:grid;gap:6px">${shown.map(r => reqRow(R, r, true)).join("") || `<p class="adm-note">${S.adm.rqAll ? "Todavía no hay solicitudes." : "No hay solicitudes pendientes."}</p>`}</div>
      <p class="adm-note">Al aprobar un alta, el jugador se crea en el equipo con el valor y la cláusula pedidos. Al aprobar un cambio, se actualizan el valor y la cláusula del jugador. Rangos que puede pedir un capitán: valor de ${fmt(CAP_VAL_MIN)} a ${fmt(CAP_VAL_MAX)}, cláusula hasta ${fmt(CAP_CLAUSE_MAX)}.</p></div>`;
}
function admRendimiento(R, Dr) {
  const fechas = Math.max(Dr.fechas || 0, 1);
  const ps = Object.entries(R.players).map(([id, p]) => ({id, ...p})).filter(p => p.team && (S.adm.rTeam === "all" || p.team === S.adm.rTeam))
    .sort((a, b) => (R.teams[a.team].order - R.teams[b.team].order) || ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || (a.name || "").localeCompare(b.name || ""));
  const chips = `<div class="rowbtns">${[["all", "Todos"], ...TEAM_KEYS.map(k => [k, R.teams[k].name])].map(([k, l]) => `<button class="chip ${S.adm.rTeam === k ? "on" : ""}" data-act="rteam:${k}" style="padding-left:10px">${esc(l)}</button>`).join("")}</div>`;
  const views = `<div class="seg">${[["att", "Asistencia"], ["skills", "Skills"], ["pts", "Puntos individuales"]].map(([k, l]) => `<button class="${S.adm.rView === k ? "on" : ""}" data-act="rview:${k}">${l}</button>`).join("")}</div>`;
  const nm = p => `<td class="nm">${img(p.team)}${esc(p.name)}</td>`;
  let body = "";
  if (!ps.length) body = `<p class="adm-note">No hay jugadores en equipos con este filtro. Cargalos en la pestaña Jugadores.</p>`;
  else if (S.adm.rView === "att") {
    const cols = Array.from({length: fechas}, (_, i) => i + 1);
    body = `<div class="att-legend">${Object.entries(ATT).map(([k, l]) => `<span><span class="att-b ${k}">${k}</span>${l}</span>`).join("")}<span>Tocá cada casillero para cambiarlo.</span></div>
      <div class="stbl-wrap"><table class="att"><thead><tr><th>Jugador</th>${cols.map(f => `<th>F${f}<br><button class="att-col" data-act="att-all:${f}" title="Marcar presentes a los que están vacíos en la fecha ${f}">todos P</button></th>`).join("")}<th>%</th></tr></thead><tbody>
      ${ps.map(p => { const a = perfOf(p.id).att || {}, st = attStats(p.id);
        return `<tr>${nm(p)}${cols.map(f => { const v = a[f] || ""; return `<td><button class="att-b ${v}" data-act="att:${p.id}:${f}" aria-label="${esc(p.name)} fecha ${f}: ${ATT[v] || "sin cargar"}">${v || "·"}</button></td>`; }).join("")}<td class="mono">${st.pct == null ? "–" : st.pct + "%"}</td></tr>`; }).join("")}</tbody></table></div>`;
  } else if (S.adm.rView === "skills") {
    const sel = (pid, k, v) => `<select class="cell-in" data-bind="skill:${pid}:${k}" data-t="nn" aria-label="${k}">${opt("", "–", !v)}${Array.from({length: 10}, (_, i) => i + 1).map(n => opt(n, n, +v === n)).join("")}</select>`;
    body = `<p class="adm-note">Puntuá de 1 a 10. Se muestran en la ficha de cada jugador y en los premios.</p>
      <div class="stbl-wrap"><table class="att"><thead><tr><th>Jugador</th>${SKILLS.map(([, l]) => `<th>${l}</th>`).join("")}<th>Promedio</th></tr></thead><tbody>
      ${ps.map(p => { const sk = perfOf(p.id).skills || {}, av = skillAvg(p.id); return `<tr>${nm(p)}${SKILLS.map(([k]) => `<td>${sel(p.id, k, sk[k])}</td>`).join("")}<td class="mono">${av == null ? "–" : dec(av, 1)}</td></tr>`; }).join("")}</tbody></table></div>`;
  } else {
    body = `<div class="fgrid">${fld("Jugador", `<select id="ptP">${ps.map(p => opt(p.id, `${p.name} · ${R.teams[p.team].name}`)).join("")}</select>`)}${fld("Puntos (podés poner negativos)", `<input id="ptV" type="number" step="1" value="1">`)}${fld("Motivo", `<input id="ptW" maxlength="80" placeholder="Ej: MVP de la fecha, buena actitud, llegó tarde" autocomplete="off">`)}${fld("Fecha (opcional)", `<select id="ptF">${opt("", "–", true)}${Array.from({length: fechas}, (_, i) => opt(i + 1, "Fecha " + (i + 1))).join("")}</select>`)}</div>
      <div class="rowbtns"><button class="btn sm gold" data-act="pts-add">Sumar puntos</button><span class="adm-note">Cuentan para el ranking de Puntos y el premio “Más puntos individuales”.</span></div>
      <div class="stbl-wrap"><table class="att"><thead><tr><th>Jugador</th><th>Total</th><th style="text-align:left">Movimientos</th></tr></thead><tbody>
      ${ps.map(p => { const L = (perfOf(p.id).pts || []).slice().sort((a, b) => b.at - a.at), tot = ptsSum(p.id);
        return `<tr>${nm(p)}<td class="mono" style="color:${tot > 0 ? "var(--win)" : tot < 0 ? "var(--loss)" : "inherit"}">${fv("pts", tot)}</td><td style="text-align:left"><div class="pts-chips">${L.map(x => `<span class="pts-chip" title="${esc(x.by || "")} · ${new Date(x.at).toLocaleDateString("es-AR")}"><b class="${x.v > 0 ? "up" : "dn"}">${x.v > 0 ? "+" : ""}${x.v}</b>${esc(x.why || "")}${x.f ? ` · F${x.f}` : ""}<button data-act="pts-del:${p.id}:${x.id}" aria-label="Quitar">×</button></span>`).join("") || '<span class="adm-note">–</span>'}</div></td></tr>`; }).join("")}</tbody></table></div>`;
  }
  return `<div class="adm-card"><h3>Rendimiento individual <small>asistencia, skills y puntos para premios individuales</small></h3>${views}${chips}${body}</div>`;
}
function admTabla(R, Dr) {
  const P = R.cfg.points, st = Dr.real;
  return `<div class="adm-card"><h3>Sistema de puntos</h3><div class="fgrid">
    ${fld("Victoria", `<input type="number" value="${P.w}" data-bind="cfg:points.w" data-t="n">`)}${fld("Victoria en prórroga", `<input type="number" value="${P.otw}" data-bind="cfg:points.otw" data-t="n">`)}
    ${fld("Derrota en prórroga", `<input type="number" value="${P.otl}" data-bind="cfg:points.otl" data-t="n">`)}${fld("Derrota", `<input type="number" value="${P.l}" data-bind="cfg:points.l" data-t="n">`)}
    ${fld("Penalización por W.O.", `<input type="number" value="${R.cfg.noShow}" data-bind="cfg:noShow" data-t="n">`)}${fld("Puestos de playoffs", `<input type="number" min="0" max="${TEAM_KEYS.length}" value="${R.cfg.playoff}" data-bind="cfg:playoff" data-t="n">`)}</div></div>
    ${admTablaEditor(R, Dr)}</div>`;
}
// ---- Editor rápido de la tabla (ultra staff) ----
const TBL_F = [["pts", "Pts"], ["g", "V"], ["gp", "VP"], ["pp", "DP"], ["p", "D"], ["rf", "RF"], ["rc", "RC"], ["kills", "K"], ["ast", "A"]];
const TBL_L = {pts: "puntos", g: "victorias", gp: "victorias en prórroga", pp: "derrotas en prórroga", p: "derrotas", rf: "rondas ganadas", rc: "rondas perdidas", kills: "kills", ast: "asistencias"};
const FORM_CYCLE = ["", "W", "w", "l", "L"], FORM_LBL = {W: "V", w: "VP", l: "DP", L: "D"};
function baseStandings(R, Dr) { const kM = M, kD = D; M = R; D = Dr; try { return standings(Dr.played, true); } finally { M = kM; D = kD; } }
function admTablaEditor(R, Dr) {
  const base = Object.fromEntries(baseStandings(R, Dr).map(r => [r.k, r])), P = R.cfg.points;
  const rows = Dr.real.map(r => { const t = R.teams[r.k], b = base[r.k], a = t.adj, extra = Math.round(+a.pts || 0), touched = TBL_F.some(([f]) => +a[f]) || (a.form || []).length;
    const inp = (f) => `<input class="cell-in" type="number" ${f === "pts" ? "" : 'min="0"'} step="1" value="${r[f]}" data-bind="tbl:${r.k}:${f}" data-t="n" aria-label="${TBL_L[f]} de ${esc(t.name)}" title="${b[f]} de los partidos cargados${r[f] !== b[f] ? ` · ${r[f] - b[f] > 0 ? "+" : ""}${r[f] - b[f]} a mano` : ""}">`;
    const form = [0, 1, 2, 3, 4].map(i => { const c = (a.form || [])[i] || ""; return `<button class="fchip ${c}" data-act="tbl-form:${r.k}:${i}" title="Tocá para cambiar">${FORM_LBL[c] || "·"}</button>`; }).join("");
    return `<tr class="${touched ? "touched" : ""}"><td class="mono">${r.pos}</td><td class="nm">${img(r.k)} ${esc(t.name)}</td>
      <td class="ptsc">${inp("pts")}${extra ? `<small class="${extra > 0 ? "up" : "dn"}">${extra > 0 ? "+" : ""}${extra} extra</small>` : ""}</td>
      ${["g", "gp", "pp", "p"].map(f => `<td>${inp(f)}</td>`).join("")}<td class="mono">${r.pj}</td>${["rf", "rc"].map(f => `<td>${inp(f)}</td>`).join("")}
      <td class="mono" style="color:${r.dif > 0 ? "var(--win)" : r.dif < 0 ? "var(--loss)" : "inherit"}">${r.dif > 0 ? "+" : ""}${r.dif}</td>${["kills", "ast"].map(f => `<td>${inp(f)}</td>`).join("")}
      <td><div class="fchips">${form}</div></td><td>${touched ? `<button class="btn sm ghost" data-act="tbl-reset:${r.k}">Reiniciar</button>` : ""}</td></tr>`; }).join("");
  return `<div class="adm-card ultra-only"><h3>Editar la tabla <small>sin crear fechas · solo ultra staff</small></h3>
    <p class="adm-note">Escribí el número final que querés ver y tocá afuera: se guarda solo. La web guarda la diferencia con los partidos cargados, así los resultados nuevos se siguen sumando. Los puntos se calculan solos con V, VP, DP y D (${P.w}, ${P.otw}, ${P.otl} y ${P.l}); si después cambiás los puntos a mano, la diferencia queda como <b>extra</b> (bonus o sanción). PJ y Dif se calculan solos.<br>Si hay empate en puntos, define: <b>rondas ganadas</b> → rondas perdidas (menos es mejor) → kills → asistencias → enfrentamiento directo → K/D.</p>
    <div class="stbl-wrap"><table class="stbl tbl-ed"><thead><tr><th>#</th><th>Equipo</th><th>Pts</th><th>V</th><th>VP</th><th>DP</th><th>D</th><th>PJ</th><th>RF</th><th>RC</th><th>Dif</th><th>K</th><th>A</th><th>Forma manual</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="adm-note">Forma manual: resultados anteriores a la web, del más viejo al más nuevo. En la tabla se muestran antes de los partidos cargados. Los resultados de cada fecha se siguen editando en la pestaña Partidos.</p></div>`;
}
async function tblBind(k, f, v) {
  if (!isUltra()) { toast("La tabla la edita solo ultra staff."); return; }
  if (!Number.isFinite(v) || !Number.isInteger(v) || (f !== "pts" && v < 0) || Math.abs(v) > 9999) { toast(f === "pts" ? "Poné un número entero." : "Poné un número entero, 0 o más."); renderAdminSoon(); return; }
  const R = RM(), Dr = deriveFor(R), b = baseStandings(R, Dr).find(r => r.k === k), cur = Dr.real.find(r => r.k === k), P = R.cfg.points;
  if (!b || !cur) return;
  const d = teamDoc(k); d.adj = Object.assign({}, ADJ0, d.adj || {}); const A = d.adj, n = x => Math.round(+A[x] || 0);
  if (f === "pts") A.pts = v - b.pts - (n("g") * P.w + n("gp") * P.otw + n("pp") * P.otl + n("p") * P.l);
  else A[f] = v - b[f];
  await save(`teams/${k}`, d); audit(`Tabla · ${R.teams[k].name} · ${TBL_L[f]}: ${cur[f]} → ${v}`); renderAdminSoon();
}
function admEquipos(R) {
  const nt = S.adm.nt, hiddenBase = DEF_KEYS.filter(k => S.remote.teams[k] && S.remote.teams[k].hidden);
  const add = `<div class="adm-card ultra-only"><h3>Agregar equipo <small>con logo y colores propios</small></h3>
    <div class="nt-row"><img class="nt-prev" id="ntPrev" src="${esc(nt.logo || initialsLogo(nt.name || "?", nt.c))}" alt="Vista previa del logo" width="72" height="72">
      <div class="fgrid" style="flex:1">${fld("Nombre", `<input id="ntName" value="${esc(nt.name)}" maxlength="20" placeholder="Ej: VELOX" autocomplete="off">`)}${fld("Color", `<input type="color" id="ntC" value="${esc(nt.c)}">`)}${fld("Color claro", `<input type="color" id="ntL" value="${esc(nt.l)}">`)}
        ${fld("Logo (PNG, JPG o WEBP)", `<input type="file" id="ntLogo" accept="image/png,image/jpeg,image/webp,image/svg+xml">`)}</div></div>
    <div class="rowbtns"><button class="btn sm gold" data-act="team-add">Crear equipo</button><span class="adm-note">Aparece en la tabla, el mercado, el fixture, el sorteo y el bot. Si no subís logo, se usa uno con las iniciales.</span></div>
    ${hiddenBase.length ? `<div class="rowbtns"><span class="adm-note">Equipos quitados:</span>${hiddenBase.map(k => `<button class="btn sm ghost" data-act="team-restore:${k}">Volver a agregar ${esc(teamName(k))}</button>`).join("")}</div>` : ""}</div>`;
  return add + `<div class="adm-card"><h3>Equipos <small>${TEAM_KEYS.length} en la liga</small></h3><div style="display:grid;gap:8px">${TEAM_KEYS.map(k => { const t = R.teams[k], b = f => `team:${k}:${f}`;
    const rs = Object.entries(R.players).filter(([, p]) => p.team === k);
    const pOpts = sel => opt("", "Sin asignar", !sel) + rs.map(([id, p]) => opt(id, p.name, sel === id)).join("");
    return `<div class="teamed">${img(k)}<div style="display:grid;gap:10px"><div class="fgrid">
      ${fld("Nombre", `<input value="${esc(t.name)}" maxlength="20" data-bind="${b("name")}" data-t="s">`)}${fld("Color", `<input type="color" value="${t.c}" data-bind="${b("c")}" data-t="s">`)}${fld("Color claro", `<input type="color" value="${t.l}" data-bind="${b("l")}" data-t="s">`)}
      ${fld("ONYX Coins", `<input type="number" step="50" value="${t.coins}" data-bind="${b("coins")}" data-t="n">`)}${fld("Fair play", `<input type="number" min="0" max="100" value="${t.fp}" data-bind="${b("fp")}" data-t="n">`)}
      ${fld("Capitán", `<select data-bind="${b("captain")}" data-t="sn">${pOpts(t.captain)}</select>`)}${fld("Subcapitán", `<select data-bind="${b("sub")}" data-t="sn">${pOpts(t.sub)}</select>`)}${fld("Orden en listas", `<input type="number" min="0" value="${t.order}" data-bind="${b("order")}" data-t="n">`)}</div>
      ${fld("Mapas ya jugados (tocá para tachar o destachar)", `<div class="used-chips">${R.cfg.maps.map(x => `<label class="${t.usedOwn.includes(x.n) ? "on" : ""}"><input type="checkbox" ${t.usedOwn.includes(x.n) ? "checked" : ""} data-bind="used:${k}:${esc(x.n)}" data-t="b">${esc(x.n)}</label>`).join("")}</div>`)}
      ${Object.keys(t.picked).length ? `<div class="adm-note">Elegidos por el capitán (también descartados): ${Object.entries(t.picked).map(([mid, n]) => `<b style="color:#fff">${esc(n)}</b> (F${(R.matches[mid] || {}).fecha || "?"})`).join(", ")}</div>` : ""}
      <div class="rowbtns ultra-only"><label class="btn sm ghost file-btn">${t.logo ? "Cambiar logo" : "Subir logo"}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-logo="${k}"></label>
        ${t.logo ? `<button class="btn sm ghost" data-act="logo-del:${k}">${BASE_EMB[k] ? "Volver al logo original" : "Quitar logo"}</button>` : ""}
        ${t.custom ? `<button class="btn sm danger" data-act="team-del:${k}">Eliminar equipo</button>` : `<button class="btn sm danger" data-act="team-hide:${k}">Quitar de la liga</button>`}</div></div></div>`; }).join("")}</div></div>`;
}
// Achica el logo a 256×256 para guardarlo liviano (WEBP).
function logoFromFile(file) { return imageFromFile(file, 256, true); }
// Achica una imagen para guardarla en la base (WEBP). square = lienzo cuadrado (logos); si no, mantiene la proporción (fotos).
async function imageFromFile(file, max = 640, square = false) {
  if (!file || !/^image\//.test(file.type)) throw new Error("Elegí una imagen (PNG, JPG, WEBP o SVG).");
  if (file.size > 8e6) throw new Error("La imagen pesa demasiado (máximo 8 MB).");
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("No se pudo leer la imagen.")); i.src = url; });
    const w0 = im.naturalWidth || max, h0 = im.naturalHeight || max, sc = Math.min(1, max / w0, max / h0) || 1, w = Math.round(w0 * sc), h = Math.round(h0 * sc);
    const cv = document.createElement("canvas"); cv.width = square ? max : w; cv.height = square ? max : h; const cx = cv.getContext("2d");
    if (square) { const s2 = Math.min(max / w0, max / h0), w2 = w0 * s2, h2 = h0 * s2; cx.imageSmoothingQuality = "high"; cx.drawImage(im, (max - w2) / 2, (max - h2) / 2, w2, h2); }
    else { cx.imageSmoothingQuality = "high"; cx.drawImage(im, 0, 0, w, h); }
    let data = cv.toDataURL("image/webp", square ? .9 : .82); if (!data.startsWith("data:image/webp")) data = cv.toDataURL(square ? "image/png" : "image/jpeg", .85);
    if (data.length > 600000) data = cv.toDataURL("image/webp", .7);
    if (data.length > 900000) throw new Error("La imagen quedó muy pesada. Probá con otra.");
    return data;
  } finally { URL.revokeObjectURL(url); }
}
function lighten(hex, f = .62) { const n = parseInt(String(hex).slice(1), 16); if (!Number.isFinite(n)) return "#d6ccff"; const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(v => Math.round(v + (255 - v) * f)); return "#" + c.map(v => v.toString(16).padStart(2, "0")).join(""); }
function teamBlockers(k) {
  const R = RM(), out = [], nm = Object.values(R.matches).filter(m => m.a === k || m.b === k).length, np = Object.values(R.players).filter(p => p.team === k).length, nc = Object.values(S.captainList).filter(c => c.team === k).length;
  if (nm) out.push(`${nm} partido${nm > 1 ? "s" : ""}`); if (np) out.push(`${np} jugador${np > 1 ? "es" : ""}`); if (nc) out.push(`${nc} capitán${nc > 1 ? "es" : ""} asignado${nc > 1 ? "s" : ""}`);
  return out;
}
async function teamAction(act, k, btn) {
  const R = RM();
  if (act === "team-add") {
    const nt = S.adm.nt, name = nt.name.trim().replace(/\s+/g, " ");
    if (name.length < 2) { toast("Poné el nombre del equipo (2 a 20 letras)."); return; }
    if (Object.values(S.remote.teams).concat(TEAM_KEYS.map(x => R.teams[x])).some(t => t && !t.hidden && String(t.name || "").toLowerCase() === name.toLowerCase())) { toast("Ya hay un equipo con ese nombre."); return; }
    let base = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16); if (base.length < 2) base = "equipo" + base;
    let key = base, n = 2; while (DEF_KEYS.includes(key) || S.remote.teams[key]) key = base.slice(0, 14) + n++;
    const at = Date.now(), order = Math.max(0, ...TEAM_KEYS.map(x => +R.teams[x].order || 0)) + 1;
    await save(`teams/${key}`, {custom: true, name, c: nt.c, l: nt.l, order, captain: null, sub: null, coins: 6000, fp: 100, used: [], adj: clone(ADJ0), logoAt: nt.logo ? at : 0});
    if (nt.logo) await save(`logos/${key}`, {data: nt.logo, at, by: S.staff.u});
    audit(`Agregó el equipo ${name}${nt.logo ? " con logo" : ""}`); toast(`Listo: ${name} ya está en la liga.`);
    S.adm.nt = {name: "", c: "#8a3dff", l: "#d6ccff", logo: "", lTouched: false}; renderAdminSoon(); return;
  }
  const t = R.teams[k] || {name: teamName(k)};
  if (act === "team-del" || act === "team-hide") {
    const bl = teamBlockers(k);
    if (bl.length) { toast(`No se puede: ${t.name} tiene ${bl.join(", ")}. Primero borralos o pasalos a otro equipo.`); return; }
    if (!arm(btn)) return;
    if (act === "team-del") { await save(`teams/${k}`, null, "del"); if (S.remote.logos[k]) await save(`logos/${k}`, null, "del"); audit(`Eliminó el equipo ${t.name}`); }
    else { const d = teamDoc(k); d.hidden = true; await save(`teams/${k}`, d); audit(`Quitó de la liga a ${t.name}`); }
    toast(`${t.name} ya no está en la liga.`); renderAdminSoon(); return;
  }
  if (act === "team-restore") { const d = clone(S.remote.teams[k]) || {}; d.hidden = false; await save(`teams/${k}`, d); audit(`Volvió a agregar a ${teamName(k)}`); renderAdminSoon(); return; }
  if (act === "logo-del") { if (!arm(btn)) return; await save(`logos/${k}`, null, "del"); const d = teamDoc(k); d.logoAt = 0; await save(`teams/${k}`, d); audit(`Quitó el logo personalizado de ${t.name}`); renderAdminSoon(); }
}
async function teamLogoUpload(k, file) {
  if (!isUltra()) { toast("Los logos los cambia solo ultra staff."); return; }
  try { toast("Subiendo logo…"); const data = await logoFromFile(file), at = Date.now();
    await save(`logos/${k}`, {data, at, by: S.staff.u}); const d = teamDoc(k); d.logoAt = at; await save(`teams/${k}`, d);
    audit(`Cambió el logo de ${RM().teams[k].name}`); toast("Logo actualizado."); renderAdminSoon(); }
  catch (e) { toast(e.message || "No se pudo subir el logo."); }
}
function admCanjes(R) {
  const P = prizeList(), rd = redeemList(), pend = rd.filter(r => r.status === "pend"), hist = rd.filter(r => r.status !== "pend").slice(0, 60), np = S.adm.np, U = isUltra();
  const when = t => new Date(t).toLocaleString("es-AR", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"});
  const rowR = r => { const pr = S.remote.prizes[r.prizeId], sal = saldoOf(r.pid, r.id), enough = r.method !== "pts" || sal >= (+r.pts || 0), st = pr ? prizeStock(pr) : null, can = enough && !!pr && (st == null || st > 0);
    const col = r.status === "ok" ? "var(--win)" : r.status === "no" ? "var(--loss)" : "var(--gold)";
    return `<div class="req" style="--st:${col}">${pr && pr.img ? `<img src="${esc(pr.img)}" alt="" style="object-fit:cover">` : img(r.team)}
      <div><div class="rq-t"><b>${esc(R.teams[r.team] ? R.teams[r.team].name : r.team)}</b> pide <b>${esc(r.prize)}</b> para <b>${esc(r.player)}</b> · ${r.method === "usd" ? `paga <b class="mono">${usdTxt(r.usd || 0)}</b>` : `<b class="mono">${fmt(r.pts)} pts</b>`}</div>
        <div class="rq-m">${when(r.at)} · capitán ${esc(r.u || "?")}${r.method === "pts" && r.status === "pend" ? ` · saldo ${fmt(sal)} pts` : ""}${st != null && r.status === "pend" ? ` · stock ${st}` : ""}${r.note ? ` · “${esc(r.note)}”` : ""}${r.reviewedBy ? ` · revisó ${esc(r.reviewedBy)}` : ""}${r.staffNote ? ` · ${esc(r.staffNote)}` : ""}</div>
        ${r.status === "pend" && !can ? `<div class="rq-m" style="color:var(--loss)">${!pr ? "El premio ya no existe" : !enough ? "No le alcanza el saldo" : "Sin stock"}</div>` : ""}</div>
      <div class="rq-acts">${r.status === "pend" ? `<input class="cell-in" id="cjn-${r.id}" placeholder="Nota para el capitán (opcional)" maxlength="140" autocomplete="off"><span class="rowbtns"><button class="btn sm gold" data-act="cj-ok:${r.id}" ${can ? "" : "disabled"}>Aprobar</button><button class="btn sm ghost" data-act="cj-no:${r.id}">Rechazar</button></span>`
        : `<span class="st ${(RD_ST[r.status] || RD_ST.pend)[1]}">${(RD_ST[r.status] || RD_ST.pend)[0]}</span>${r.status === "ok" ? `<label class="chk"><input type="checkbox" ${r.delivered ? "checked" : ""} data-bind="rd:${r.id}:delivered" data-t="b">Entregado</label>` : ""}<button class="btn sm danger ultra-only" data-act="cj-del:${r.id}" title="Borra el canje y devuelve los puntos">Borrar</button>`}</div></div>`; };
  const add = `<div class="adm-card ultra-only"><h3>Agregar premio <small>foto, costo en puntos y/o precio en dólares</small></h3>
    <div class="nt-row"><div class="np-prev" id="npPrev">${np.img ? `<img src="${esc(np.img)}" alt="">` : "<span>Foto</span>"}</div>
      <div class="fgrid" style="flex:1">${fld("Nombre", `<input id="npName" value="${esc(np.name)}" maxlength="60" placeholder="Ej: Skin Vandal" autocomplete="off">`)}${fld("Costo en pts", `<input id="npPts" type="number" min="0" step="50" value="${esc(np.pts)}" placeholder="Ej: 1500">`)}${fld("Precio en USD", `<input id="npUsd" type="number" min="0" step="0.5" value="${esc(np.usd)}" placeholder="Ej: 10">`)}${fld("Stock", `<input id="npStock" type="number" min="0" step="1" value="${esc(np.stock)}" placeholder="Vacío = sin límite">`)}${fld("Foto", `<input type="file" id="npImg" accept="image/png,image/jpeg,image/webp">`)}</div></div>
    ${fld("Descripción (opcional)", `<input id="npDesc" value="${esc(np.desc)}" maxlength="160" placeholder="Ej: Se entrega por regalo en la tienda de Valorant" autocomplete="off">`)}
    <div class="rowbtns"><button class="btn sm gold" data-act="cj-add">Agregar premio</button><span class="adm-note">Podés poner costo en pts, precio en USD o los dos. Si tiene los dos, el capitán elige cómo pagar.</span></div></div>`;
  const prizes = `<div class="adm-card"><h3>Premios <small>${P.length} cargados${U ? "" : " · los edita el ultra staff"}</small></h3><div style="display:grid;gap:8px">${P.map(p => { const b = f => `prize:${p.id}:${f}`, st = prizeStock(p);
    return `<div class="prize-ed ${p.active === false ? "off" : ""}"><div class="np-prev sm">${p.img ? `<img src="${esc(p.img)}" alt="">` : "<span>Sin foto</span>"}</div>
      ${U ? `<div style="display:grid;gap:8px;min-width:0"><div class="fgrid">${fld("Nombre", `<input value="${esc(p.name)}" maxlength="60" data-bind="${b("name")}" data-t="s">`)}${fld("Costo en pts", `<input type="number" min="0" step="50" value="${p.pts ?? ""}" placeholder="–" data-bind="${b("pts")}" data-t="nn">`)}${fld("Precio en USD", `<input type="number" min="0" step="0.5" value="${p.usd ?? ""}" placeholder="–" data-bind="${b("usd")}" data-t="nn">`)}${fld("Stock", `<input type="number" min="0" step="1" value="${p.stock ?? ""}" placeholder="Sin límite" data-bind="${b("stock")}" data-t="nn">`)}${fld("Orden", `<input type="number" value="${+p.order || 0}" data-bind="${b("order")}" data-t="n">`)}</div>
        ${fld("Descripción", `<input value="${esc(p.desc || "")}" maxlength="160" data-bind="${b("desc")}" data-t="s">`)}
        <div class="rowbtns"><span class="chk"><input type="checkbox" ${p.active !== false ? "checked" : ""} data-bind="${b("active")}" data-t="b">Visible en la página</span><label class="btn sm ghost file-btn">Cambiar foto<input type="file" accept="image/png,image/jpeg,image/webp" data-prizeimg="${p.id}"></label><button class="btn sm danger" data-act="cj-pdel:${p.id}">Borrar premio</button></div></div>`
      : `<div><b>${esc(p.name)}</b><div class="adm-note">${p.pts ? fmt(p.pts) + " pts" : ""}${p.pts && p.usd != null && p.usd !== "" ? " o " : ""}${p.usd != null && p.usd !== "" ? usdTxt(p.usd) : ""} · ${st == null ? "sin límite de stock" : "stock " + st}${p.active === false ? " · oculto" : ""}</div></div>`}</div>`; }).join("") || '<p class="adm-note">Todavía no hay premios.</p>'}</div></div>`;
  return `<div class="adm-card"><h3>Pedidos de canje <small>${pend.length} esperando · los piden los capitanes</small></h3><div style="display:grid;gap:8px">${pend.map(rowR).join("") || '<p class="adm-note">No hay pedidos esperando.</p>'}</div>
      <p class="adm-note">Al aprobar con puntos se descuentan del saldo del jugador (los puntos individuales del ranking no cambian). Si el premio tiene stock, baja uno.</p></div>
    ${add}${prizes}
    <div class="adm-card"><h3>Historial de canjes</h3><div style="display:grid;gap:8px">${hist.map(rowR).join("") || '<p class="adm-note">Sin canjes todavía.</p>'}</div></div>`;
}
async function reviewRedeem(id, ok) {
  const r = clone(S.remote.redeems[id]); if (!r || r.status !== "pend") return;
  const note = (($(`#cjn-${id}`) || {}).value || "").trim().slice(0, 140);
  if (ok) {
    const pr = S.remote.prizes[r.prizeId]; if (!pr) { toast("Ese premio ya no existe."); return; }
    const st = prizeStock(pr); if (st === 0) { toast("No queda stock de ese premio."); return; }
    if (r.method === "pts" && saldoOf(r.coach ? "c:" + r.coach : r.pid, id) < (+r.pts || 0)) { toast(`A ${r.player} no le alcanza el saldo.`); return; }
    if (st != null) await save(`prizes/${r.prizeId}`, {...clone(pr), stock: st - 1});
  }
  Object.assign(r, {status: ok ? "ok" : "no", reviewedBy: S.staff.u, reviewedAt: Date.now(), staffNote: note, delivered: false});
  await save(`redeems/${id}`, r);
  if (ok && r.method === "usd" && +r.usd > 0) await addLedger({type: "canje", dir: "in", usd: +r.usd, team: r.team, who: `${r.prize} para ${r.player}`, ref: "redeem:" + id}).catch(() => {});
  audit(`${ok ? "Aprobó" : "Rechazó"} el canje de ${r.prize} para ${r.player} (${RM().teams[r.team] ? RM().teams[r.team].name : r.team}) · ${r.method === "usd" ? usdTxt(r.usd || 0) : fmt(r.pts) + " pts"}${note ? " · " + note : ""}`);
  toast(ok ? `Canje aprobado: ${r.prize} para ${r.player}.` : "Canje rechazado.");
}
async function canjeAction(act, id, btn) {
  if (act === "cj-ok" || act === "cj-no") { await reviewRedeem(id, act === "cj-ok"); renderAdminSoon(); return; }
  if (act === "cj-add") {
    const np = S.adm.np, name = np.name.trim(), num = v => v === "" || v == null ? null : Number(v);
    const pts = num(np.pts), usd = num(np.usd), stock = num(np.stock);
    if (name.length < 2) { toast("Poné el nombre del premio."); return; }
    if (pts != null && (!Number.isInteger(pts) || pts < 0)) { toast("El costo en pts tiene que ser un número entero."); return; }
    if (usd != null && !(usd >= 0)) { toast("El precio en USD tiene que ser un número."); return; }
    if (!(pts > 0) && !(usd > 0)) { toast("Poné un costo en pts, un precio en USD o los dos."); return; }
    if (stock != null && (!Number.isInteger(stock) || stock < 0)) { toast("El stock tiene que ser un número entero (o vacío para sin límite)."); return; }
    const order = Math.max(0, ...prizeList().map(p => +p.order || 0)) + 1;
    await save(`prizes/${newId("pz")}`, {name: name.slice(0, 60), desc: np.desc.trim().slice(0, 160), img: np.img || "", pts: pts > 0 ? pts : null, usd: usd > 0 ? Math.round(usd * 100) / 100 : null, stock, active: true, order, at: Date.now(), by: S.staff.u});
    audit(`Agregó el premio ${name}${pts > 0 ? " · " + fmt(pts) + " pts" : ""}${usd > 0 ? " · " + usdTxt(usd) : ""}`); toast(`Premio agregado: ${name}.`);
    S.adm.np = {name: "", desc: "", pts: "", usd: "", stock: "", img: ""}; renderAdminSoon(); return;
  }
  if (act === "cj-pdel") { if (!arm(btn)) return; const p = S.remote.prizes[id]; await save(`prizes/${id}`, null, "del"); audit(`Borró el premio ${p ? p.name : "?"}`); renderAdminSoon(); return; }
  if (act === "cj-del") {
    if (!arm(btn)) return; const r = S.remote.redeems[id]; if (!r) return;
    await save(`redeems/${id}`, null, "del");
    const pr = S.remote.prizes[r.prizeId]; if (r.status === "ok" && pr && prizeStock(pr) != null) await save(`prizes/${r.prizeId}`, {...clone(pr), stock: prizeStock(pr) + 1});
    audit(`Borró el canje de ${r.prize} para ${r.player}${r.method === "pts" && r.status !== "no" ? " (devolvió " + fmt(r.pts) + " pts)" : ""}`); renderAdminSoon();
  }
}
async function prizeBind(id, f, v) {
  if (!isUltra()) { toast("Los premios los edita solo ultra staff."); return; }
  const d = clone(S.remote.prizes[id]); if (!d) return;
  if (f === "name" && String(v).length < 2) { toast("El nombre no puede quedar vacío."); renderAdminSoon(); return; }
  if ((f === "pts" || f === "stock") && v != null && (!Number.isInteger(v) || v < 0)) { toast("Poné un número entero (o dejalo vacío)."); renderAdminSoon(); return; }
  if (f === "usd" && v != null && !(v >= 0)) { toast("Poné un número (o dejalo vacío)."); renderAdminSoon(); return; }
  const old = d[f]; d[f] = f === "usd" && v != null ? Math.round(v * 100) / 100 : (f === "pts" && v === 0 ? null : v);
  await save(`prizes/${id}`, d);
  audit(`Premio ${d.name} · ${{name: "nombre", desc: "descripción", pts: "costo en pts", usd: "precio en USD", stock: "stock", active: "visible", order: "orden"}[f] || f}: ${old ?? "–"} → ${d[f] ?? "–"}`);
}
async function prizeImgUpload(id, file) {
  if (!isUltra()) { toast("Las fotos las cambia solo ultra staff."); return; }
  try { toast("Subiendo foto…"); const data = await imageFromFile(file, 640, false), d = clone(S.remote.prizes[id]); if (!d) return; d.img = data; await save(`prizes/${id}`, d); audit(`Cambió la foto del premio ${d.name}`); toast("Foto actualizada."); renderAdminSoon(); }
  catch (e) { toast(e.message || "No se pudo subir la foto."); }
}
function admMercado(R, Dr) {
  const c = R.cfg, offers = allOffers(), pend = offers.filter(o => o.status === "pend");
  const pOpts = Object.entries(R.players).map(([id, p]) => ({id, ...p})).sort((a, b) => (a.name || "").localeCompare(b.name || "")).map(p => opt(p.id, `${p.name} · ${p.team ? R.teams[p.team].name : "libre"}`)).join("");
  const offerRow = o => { const p = R.players[o.pid];
    return `<div class="offer-adm">${img(o.team)}<div><b>${esc(R.teams[o.team].name)}</b> ofrece <b class="mono" style="color:var(--gold)">${fmt(o.amt)}</b> por <b>${p ? esc(p.name) : "jugador borrado"}</b>${p ? ` (${p.team ? esc(R.teams[p.team].name) : "libre"})` : ""}${p && +p.clause && o.amt >= +p.clause ? ` <span class="st claus">PAGA LA CLÁUSULA</span>` : p && +p.clause ? ` <span class="adm-note">· cláusula ${fmt(p.clause)}</span>` : ""}<div class="adm-note">${esc(o.len || "")}${o.msg ? " · “" + esc(o.msg) + "”" : ""} · coins de ${esc(R.teams[o.team].name)}: ${fmt(R.teams[o.team].coins)}</div></div>
      ${o.status === "pend" ? `<span class="rowbtns"><button class="btn sm gold" data-act="off-ok:${o.uid}:${o.id}" ${p ? "" : "disabled"}>Aprobar pase</button><button class="btn sm ghost" data-act="off-no:${o.uid}:${o.id}">Rechazar</button></span>` : `<span class="st ${o.status === "ok" ? "ok" : "no"}">${o.status === "ok" ? "Aprobada" : "Rechazada"}</span>`}</div>`; };
  return `<div class="adm-card"><h3>Ventana de fichajes</h3><div class="fgrid">
    ${fld("Estado", `<span class="chk"><input type="checkbox" ${c.windowOpen ? "checked" : ""} data-bind="cfg:windowOpen" data-t="b">Ventana abierta</span>`)}${fld("Cierra", `<input type="datetime-local" value="${esc((c.windowClose || "").slice(0, 16))}" data-bind="cfg:windowClose" data-t="s">`)}
    ${fld("Fichajes por ventana", `<input type="number" min="0" value="${c.maxSign}" data-bind="cfg:maxSign" data-t="n">`)}${fld("Plantel mínimo", `<input type="number" min="1" value="${c.rosterMin}" data-bind="cfg:rosterMin" data-t="n">`)}${fld("Plantel máximo", `<input type="number" min="1" value="${c.rosterMax}" data-bind="cfg:rosterMax" data-t="n">`)}</div>
    <div class="rowbtns"><button class="btn sm ultra-only" data-act="window-new">Abrir una ventana nueva (reinicia el cupo)</button><span class="adm-note">Ventana actual: N° ${c.windowId}</span></div></div>
    <div class="adm-card"><h3>Ofertas <small>${pend.length} esperando</small></h3><div style="display:grid;gap:6px">${offers.length ? offers.map(offerRow).join("") : '<p class="adm-note">No llegaron ofertas. Los capitanes ofertan desde el mercado (necesitan permiso de colaborador).</p>'}</div></div>
    <div class="adm-card"><h3>Pase manual</h3><div class="fgrid">${fld("Jugador", `<select id="trP">${pOpts}</select>`)}${fld("Va a", `<select id="trTo">${teamOpts("", true)}</select>`)}${fld("Monto", `<input id="trAmt" type="number" min="0" step="50" value="0">`)}</div>
      <div class="rowbtns"><button class="btn sm gold" data-act="tr-manual">Hacer el pase</button><span class="adm-note">Descuenta el monto al equipo que compra y se lo suma al que vende. “Agente libre” = liberarlo.</span></div></div>
    <div class="adm-card"><h3>Historial de fichajes</h3><div style="display:grid;gap:4px">${[...R.transfers].sort((a, b) => b.at - a.at).map(t => `<div class="offer-adm">${t.to ? img(t.to) : "<span></span>"}<div><b>${esc(t.name)}</b> ${t.from ? esc(R.teams[t.from].name) : "libre"} → ${t.to ? esc(R.teams[t.to].name) : "libre"} · <span class="mono" style="color:var(--gold)">${fmt(t.amt)}</span><div class="adm-note">Ventana ${t.win ?? "–"} · ${new Date(t.at).toLocaleDateString("es-AR")}</div></div><button class="btn sm danger ultra-only" data-act="tr-del:${t.id}" title="Solo borra el registro; no devuelve coins ni jugador">Borrar registro</button></div>`).join("") || '<p class="adm-note">Sin fichajes.</p>'}</div></div>`;
}
function admMapas(R) {
  const Dr = deriveFor(R), fechas = [...new Set(Dr.pending.map(m => m.fecha))].sort((a, b) => a - b);
  if (!fechas.includes(S.adm.mpF)) S.adm.mpF = fechas[0];
  const rows = fechas.length ? mpRows(Dr, S.adm.mpF) : [];
  const picks = `<div class="adm-card"><h3>Mapas elegidos por los capitanes <small>${rows.filter(r => r.pick).length} de ${rows.length} equipos</small></h3>
    ${fechas.length ? `<div class="rowbtns">${fechas.map(f => `<button class="chip ${S.adm.mpF === f ? "on" : ""}" data-act="mpf:${f}" style="padding-left:10px">Fecha ${f}</button>`).join("")}</div>
    <div class="mp-rows">${rows.map(r => `<div class="mp-row" style="--tc:${R.teams[r.k].c}">${img(r.k)}<div><b>${esc(R.teams[r.k].name)}</b><small>vs ${esc(R.teams[r.rival].name)}</small></div><div class="mp-st">${mpPickTxt(r)}</div>${r.pick ? `<button class="btn sm ghost" data-act="mp-clear:${r.f}:${r.k}" title="Borra su elección y deja la partida libre">Liberar</button>` : ""}</div>`).join("")}</div>
    <p class="adm-note">Lo eligen los capitanes desde la web (sección "Elegí tu mapa"). En cada fecha cada capitán elige <b>la ida o la vuelta</b> (mapa y lado); el otro partido lo elige el capitán rival. Con <b>Liberar</b> borrás una elección y ese partido vuelve a quedar libre. El pedido por Discord se manda desde la pestaña ONYX Bot.</p>` : '<p class="adm-note">No hay partidos pendientes.</p>'}</div>`;
  return picks + admMapasBase(R);
}
function admMapasBase(R) {
  const draws = Object.entries(S.remote.draws).map(([id, d]) => ({id, ...d})).sort((a, b) => (b.at || 0) - (a.at || 0));
  return `<div class="adm-card"><h3>Sorteo en vivo</h3><p class="adm-note">Abrí el modo streamer, elegí el partido y tocá Sortear (o la barra espaciadora). El mapa que sale se tacha para los dos equipos. Quien tenga la página abierta ve el sorteo en vivo.</p><div class="rowbtns"><button class="btn gold" data-act="stream">Abrir modo streamer</button>${draws[0] ? `<button class="btn sm danger" data-act="draw-undo">Deshacer el último sorteo (${esc(draws[0].map)})</button>` : ""}</div></div>
    <div class="adm-card"><h3>Pool de mapas <small>los apagados no entran en el sorteo</small></h3><div style="display:grid;gap:6px">${R.cfg.maps.map((x, i) => `<div class="prow3" style="grid-template-columns:44px minmax(0,1fr) auto auto"><span class="maptile" style="--mc:${mapColor(x.n)};height:30px"></span><input class="cell-in" value="${esc(x.n)}" data-bind="map:${i}:n" data-t="s" aria-label="Nombre del mapa"><span class="chk"><input type="checkbox" ${x.on !== false ? "checked" : ""} data-bind="map:${i}:on" data-t="b">En el sorteo</span><button class="btn sm danger ultra-only" data-act="map-del:${i}">Quitar</button></div>`).join("")}</div>
      <div class="rowbtns ultra-only"><input class="cell-in" id="newMap" placeholder="Nuevo mapa" style="max-width:220px"><button class="btn sm" data-act="map-add">Agregar mapa</button></div></div>
    <div class="adm-card"><h3>Mapas jugados por equipo</h3><div style="display:grid;gap:6px">${TEAM_KEYS.map(k => `<div class="offer-adm">${img(k)}<div><b>${esc(R.teams[k].name)}</b><div class="adm-note">${R.teams[k].used.length ? R.teams[k].used.map(esc).join(", ") : "Ninguno"}</div></div><button class="btn sm ghost" data-act="used-reset:${k}">Reiniciar</button></div>`).join("")}</div>
      <div class="rowbtns"><button class="btn sm danger ultra-only" data-act="used-reset-all">Reiniciar los mapas de todos</button><span class="adm-note">Para tachar o destachar mapas a mano, usá la pestaña Equipos.</span></div></div>
    <div class="adm-card"><h3>Historial de sorteos</h3><div class="draw-hist" style="max-height:none">${draws.map(d => `<div><span class="mono muted">${d.fecha ? "F" + d.fecha : "—"}</span>${img(d.a)}<span class="muted">vs</span>${img(d.b)}<span class="mchip" style="--mc:${mapColor(d.map)}">${esc(d.map)}</span></div>`).join("") || '<p class="adm-note">Sin sorteos todavía.</p>'}</div></div>`;
}
function admFair(R) {
  const reps = []; Object.entries(S.remote.reports).forEach(([uid, d]) => (d.items || []).forEach(r => reps.push({...r, uid})));
  reps.sort((a, b) => b.at - a.at);
  return `<div class="adm-card"><h3>Denuncias <small>${reps.filter(r => r.status === "recibida" || r.status === "revision" || r.status === "apelada").length} abiertas · solo las ve la organización</small></h3><div style="display:grid;gap:8px">${reps.map(r => { const p = R.players[r.pid], m = R.matches[r.matchId], b = f => `rep:${r.uid}:${r.id}:${f}`;
    return `<div class="rep"><div class="rh"><b>${esc(r.type)}</b><span>contra <b>${p ? esc(p.name) : "jugador borrado"}</b>${p && p.team ? " (" + esc(R.teams[p.team].name) + ")" : ""}</span>${m ? `<span class="muted">${esc(matchLabel(R, m))}</span>` : ""}<span class="muted">${new Date(r.at).toLocaleString("es-AR")}</span>${r.link ? `<a href="${esc(r.link)}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-hi)">Ver evidencia</a>` : '<span class="muted">sin evidencia</span>'}</div>
      <div class="txt">${esc(r.text)}</div>
      <div class="fgrid">${fld("Estado", `<select data-bind="${b("status")}" data-t="s">${Object.entries(STATUS_REP).map(([k, l]) => opt(k, l, r.status === k)).join("")}</select>`)}${fld("Resolución (la ve quien denunció)", `<input value="${esc(r.resolution || "")}" data-bind="${b("resolution")}" data-t="s" placeholder="Ej: advertencia formal">`)}${fld("Descontar fair play", `<input type="number" min="0" value="${r.fpDelta || 0}" data-bind="${b("fpDelta")}" data-t="n">`)}</div>
      <div class="rowbtns">${r.applied ? `<span class="st ok">Sanción aplicada</span>` : `<button class="btn sm danger" data-act="rep-apply:${r.uid}:${r.id}" ${p && p.team && r.fpDelta ? "" : "disabled"}>Aplicar: −${r.fpDelta || 0} FP a ${p && p.team ? esc(R.teams[p.team].name) : "–"}</button>`}</div></div>`; }).join("") || '<p class="adm-note">No hay denuncias.</p>'}</div></div>`;
}
function admGeneral(R, Dr) {
  const c = R.cfg, allP = Object.entries(R.players).map(([id, p]) => ({id, ...p})).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return `<div class="adm-card"><h3>Liga</h3><div class="fgrid">${fld("Temporada", `<input value="${esc(c.season)}" data-bind="cfg:season" data-t="s">`)}${fld("Juego", `<input value="${esc(c.game)}" data-bind="cfg:game" data-t="s">`)}${fld("Próxima fecha (cuenta regresiva)", `<input type="datetime-local" value="${esc((c.nextDate || "").slice(0, 16))}" data-bind="cfg:nextDate" data-t="s">`)}</div>
    <p class="adm-note">Si dejás la próxima fecha vacía, se usa el horario del primer partido pendiente.</p></div>
    <div class="adm-card"><h3>${ico("i-chat")} Discord <small>el botón “Unite al Discord” de la página</small></h3><div class="fgrid">${fld("Link de invitación", `<input value="${esc(c.discord || "")}" data-bind="cfg:discord" data-t="s" placeholder="https://discord.gg/tu-invitacion" inputmode="url">`)}</div>
      <p class="adm-note">En Discord: clic derecho en el servidor → Invitar gente → Editar link de invitación → que no caduque. Pegalo acá y aparece el botón en la barra lateral, el inicio y el pie de página.${discordUrl() ? ` Ahora: <a href="${esc(discordUrl())}" target="_blank" rel="noopener" style="color:var(--accent-hi)">${esc(discordUrl())}</a>` : ""}</p></div>
    ${seasonCard(R, Dr)}
    <div class="adm-card"><h3>Novedades <small>una por línea, salen en la cinta de arriba</small></h3>${fld("Texto", `<textarea rows="4" data-bind="cfg:news" data-t="lines">${esc(c.news.join("\n"))}</textarea>`)}</div>
    <div class="adm-card"><h3>Coins por resultado</h3><div class="fgrid">${[["w", "Victoria"], ["otw", "Victoria en prórroga"], ["otl", "Derrota en prórroga"], ["mvp", "MVP de un partido"], ["clean", "Fecha sin sanciones"]].map(([k, l]) => fld(l, `<input type="number" step="50" value="${c.coin[k]}" data-bind="cfg:coin.${k}" data-t="n">`)).join("")}</div><p class="adm-note">Se aplican cuando tocás “Acreditar coins de la fecha” en Partidos. “Fecha sin sanciones” lo sumás a mano en Equipos.</p></div>
    <div class="adm-card"><h3>Premios <small>dejá “Automático” para que se calculen solos</small></h3><div class="fgrid">${AWARD_KINDS.map(([k, l]) => fld(l, `<select data-bind="cfg:awards.${k}" data-t="sn">${opt("", "Automático", !c.awards[k])}${allP.map(p => opt(p.id, p.name, c.awards[k] === p.id)).join("")}</select>`)).join("")}</div></div>
    <div class="adm-card"><h3>Reglas de fair play <small>una por línea: Título: descripción</small></h3>${fld("Reglas", `<textarea rows="7" data-bind="cfg:rules" data-t="rules">${esc(c.rules.map(r => r.t + ": " + r.d).join("\n"))}</textarea>`)}</div>
    <div class="adm-card"><h3>Datos</h3>
      ${M.realEmpty ? `<div class="rowbtns"><button class="btn sm gold" data-act="ex-copy">Copiar los datos de ejemplo a la liga</button><span class="adm-note">Útil para probar. Después los podés editar o borrar.</span></div>` : ""}
      <div class="rowbtns"><button class="btn sm danger" data-act="wipe-results">Borrar todos los resultados</button><button class="btn sm danger" data-act="wipe-players">Borrar todos los jugadores</button><button class="btn sm danger" data-act="wipe-market">Borrar ofertas y fichajes</button></div>
      <p class="adm-note">Borrar resultados deja los partidos como pendientes y sin estadísticas. Pide confirmación con un segundo toque.</p></div>`;
}


/* ================= STAFF: login con Firebase Auth ================= */
const isUltra = () => !!(S.staff && S.staff.role === "ultra");
function logout() { audit("Cerró sesión"); setTimeout(() => AUTH && AUTH.signOut(), 400); S.adm.open = false; renderAdmin(); if (ST.open && ST.admin) closeStream(); toast("Sesión de staff cerrada."); }
function requireStaff(next) {
  if (S.staff) { next(); return; }
  if (S.captain) { toast("Entraste como capitán: el panel de staff no está disponible para tu cuenta."); openCap(); return; }
  openLogin(next);
}
function openAdmin() { requireStaff(() => { S.adm.open = true; renderAdmin(); }); }
const emailOf = u => `${String(u).trim().toLowerCase()}@${STAFF_DOMAIN}`;
function openLogin(next) {
  if (!FB_READY) { toast("Primero configurá Firebase (ver README)."); return; }
  modal(`<div class="box cut login-box" style="--tc:#8b3dff"><div class="bh"><div><img class="login-mark" src="assets/onyx-logo.png" alt="" width="52" height="52"><h3>Entrar a ONYX</h3><div class="muted" style="font-size:14px">Jugadores y coaches: con Discord o con su mail. Staff y capitanes: con su usuario.</div></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="bb login-dc">${DC_BTN("Entrar con Discord")}<span class="login-or">o con tu mail o usuario</span></div>
    <form class="bb" id="loginForm" novalidate style="padding-top:0"><div class="ff"><label for="lgU">Mail o usuario</label><input id="lgU" autocomplete="username" autocapitalize="off" spellcheck="false"></div>
      <div class="ff"><label for="lgP">Contraseña</label><input id="lgP" type="password" autocomplete="current-password"></div>
      <div class="err" id="lgErr" hidden></div>
      <div class="rowbtns"><button class="btn gold" type="submit" id="lgGo">Entrar</button><button class="btn ghost" type="button" id="lgForgot">Me olvidé la contraseña</button></div>
      <p class="login-new">¿No tenés cuenta? <button type="button" class="linkish" id="lgNew">Creala acá</button> (jugadores y coaches)</p></form></div>`);
  $("#lgNew").addEventListener("click", () => openSignup());
  $("#lgForgot").addEventListener("click", () => forgotPassword($("#lgU").value));
  const showErr = t => { $("#lgErr").hidden = !t; $("#lgErr").textContent = t || ""; };
  $("#loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    const u = $("#lgU").value.trim(), p = $("#lgP").value;
    if (!u || !p) { showErr("Completá tu mail o usuario y la contraseña."); return; }
    $("#lgGo").disabled = true; $("#lgGo").textContent = "Verificando…"; showErr("");
    try {
      const cred = await AUTH.signInWithEmailAndPassword(u.includes("@") ? u.toLowerCase() : emailOf(u), p);
      if (isMemberUid(cred.user.uid)) { closeModal(); toast("¡Hola! Entraste a tu cuenta."); goView("perfil"); return; }
      const sn = await FDB.doc(`staff/${cred.user.uid}`).get().catch(() => null);
      if (sn && sn.exists && sn.data().active !== false) {
        closeModal(); toast(`Hola ${sn.data().u}. Entraste como ${sn.data().role === "ultra" ? "ultra staff" : "staff"}.`);
        setTimeout(() => { audit("Inició sesión"); if (next) next(); }, 500); return;
      }
      const cn = await FDB.doc(`captains/${cred.user.uid}`).get().catch(() => null);
      if (cn && cn.exists && cn.data().active !== false) {
        closeModal(); toast(`Hola ${cn.data().u}. Entraste como capitán.`);
        setTimeout(() => openCap(), 500); return;
      }
      await AUTH.signOut(); showErr("Esta cuenta no está activa. Hablá con un ultra staff.");
    } catch (er) {
      const c = er && er.code;
      showErr(c === "auth/too-many-requests" ? "Demasiados intentos. Esperá unos minutos." : c === "auth/network-request-failed" ? "Sin conexión. Revisá internet." : "Mail, usuario o contraseña incorrectos.");
    } finally { const g = $("#lgGo"); if (g) { g.disabled = false; g.textContent = "Entrar"; } }
  });
}
function audit(txt) {
  if (!S.db || !S.staff) return;
  save(`audit/${newId("a")}`, {at: Date.now(), uid: S.staff.uid, u: S.staff.u, role: S.staff.role, txt: String(txt).slice(0, 400)}).catch(() => {});
}
async function staffApi(body) {
  const tok = await AUTH.currentUser.getIdToken();
  const r = await fetch("/api/staff", {method: "POST", headers: {"content-type": "application/json", authorization: "Bearer " + tok}, body: JSON.stringify(body)});
  const j = await r.json().catch(() => ({error: "El servidor no respondió bien. ¿Está configurada la función en Netlify?"}));
  if (!r.ok) throw new Error(j.error || "No se pudo completar.");
  return j;
}
const FL = {discord: "link de Discord", payLink: "link de pago", moneyText: "qué compran los dólares", "coach.maxRefills": "recargas por temporada", "results.auto": "carga automática de resultados", "results.ai": "lectura de capturas con IA", "results.aiDaily": "lecturas por día", "coach.salary": "sueldo semanal del coach", "coach.usd": "recarga en dólares", "coach.refill": "coins de la recarga", fecha: "fecha", leg: "ida/vuelta", date: "día y hora", a: "equipo A", b: "equipo B", status: "estado", ra: "rondas del equipo A", rb: "rondas del equipo B", ot: "prórroga", noShow: "W.O.", map: "mapa", proj: "proyección oficial", mvp: "MVP",
  name: "nombre", team: "equipo", role: "rol", rank: "rango", value: "valor de mercado", c: "color", l: "color claro", coins: "ONYX Coins", fp: "fair play", captain: "capitán", sub: "subcapitán", order: "orden",
  "adj.pts": "ajuste de puntos", "adj.rf": "ajuste de rondas a favor", "adj.rc": "ajuste de rondas en contra", season: "temporada", game: "juego", nextDate: "próxima fecha", windowOpen: "ventana abierta",
  windowClose: "cierre de la ventana", maxSign: "fichajes por ventana", rosterMin: "plantel mínimo", rosterMax: "plantel máximo", noShowCfg: "penalización por W.O.", playoff: "puestos de playoffs", news: "novedades", rules: "reglas",
  "points.w": "puntos por victoria", "points.otw": "puntos por victoria en prórroga", "points.otl": "puntos por derrota en prórroga", "points.l": "puntos por derrota",
  "coin.w": "coins por victoria", "coin.otw": "coins por victoria en prórroga", "coin.otl": "coins por derrota en prórroga", "coin.mvp": "coins por MVP", "coin.clean": "coins por fecha sin sanciones",
  resolution: "resolución", fpDelta: "fair play a descontar", clause: "cláusula de rescisión"};
const STAT_L = {k: "kills", d: "muertes", a: "asistencias", acs: "ACS"};
const lab = f => f.startsWith("awards.") ? "premio " + ((AWARD_KINDS.find(x => x[0] === f.slice(7)) || [0, f])[1]) : (FL[f] || f);
function getPath(o, path) { return path.split(".").reduce((c, k) => c == null ? c : c[k], o); }
function fv2(v, f) {
  if (v == null || v === "") return "vacío";
  if (typeof v === "boolean") return v ? "sí" : "no";
  if (Array.isArray(v)) return v.map(x => typeof x === "object" ? (x.t || x.n || "") : x).join(", ").slice(0, 120) || "vacío";
  if (["a", "b", "team"].includes(f)) return (RM().teams[v] || {name: v}).name;
  if (["captain", "sub", "mvp"].includes(f) || String(f).startsWith("awards.")) return (S.remote.players[v] || {name: "jugador"}).name;
  if (f === "status") return v === "played" ? "jugado" : "pendiente";
  if (f === "proj") return {A: "gana A", a: "gana A en prórroga", b: "gana B en prórroga", B: "gana B"}[v] || v;
  if (f === "noShow") return v === "a" ? "no se presentó A" : "no se presentó B";
  if (f === "date" || f === "nextDate" || f === "windowClose") return fmtDate(v);
  return String(v).slice(0, 120);
}
function describeBind(kind, p, v) {
  const R = RM();
  try {
    if (kind === "cfg") { const old = getPath(mergeCfg(S.remote.config), p[0]); const f = p[0] === "noShow" ? "noShowCfg" : p[0]; return `Configuración · ${lab(f)}: ${fv2(old, p[0])} → ${fv2(v, p[0])}`; }
    if (kind === "team") { const t = R.teams[p[0]]; return `${t.name} · ${lab(p[1])}: ${fv2(getPath(t, p[1]), p[1])} → ${fv2(v, p[1])}`; }
    if (kind === "player") { const pl = S.remote.players[p[0]] || {}; return `Jugador ${pl.name || "?"} · ${lab(p[1])}: ${fv2(pl[p[1]], p[1])} → ${fv2(v, p[1])}`; }
    if (kind === "match") { const m = S.remote.matches[p[0]] || {}; return `${matchLabel(R, m)} · ${lab(p[1])}: ${fv2(m[p[1]], p[1])} → ${fv2(v, p[1])}`; }
    if (kind === "stat") { const m = S.remote.matches[p[0]] || {}, pl = S.remote.players[p[1]] || {}, old = ((m.stats || {})[p[1]] || {})[p[2]]; return `Stats de ${pl.name || "?"} en ${matchLabel(R, m)} · ${STAT_L[p[2]]}: ${old ?? 0} → ${v}`; }
    if (kind === "stplay") { const m = S.remote.matches[p[0]] || {}, pl = S.remote.players[p[1]] || {}; return `${pl.name || "?"} ${v ? "marcado como que jugó" : "quitado de"} ${matchLabel(R, m)}`; }
    if (kind === "map") { const x = mergeCfg(S.remote.config).maps[+p[0]] || {}; return p[1] === "n" ? `Mapa renombrado: ${x.n} → ${v}` : `Mapa ${x.n} ${v ? "activado" : "desactivado"} en el sorteo`; }
    if (kind === "used") return `${R.teams[p[0]].name} · mapa ${p[1]} ${v ? "tachado" : "destachado"}`;
    if (kind === "skill") { const pl = S.remote.players[p[0]] || {}, sk = (SKILLS.find(x => x[0] === p[1]) || [0, p[1]])[1]; return `Skill de ${pl.name || "?"} · ${sk}: ${(perfOf(p[0]).skills || {})[p[1]] ?? "–"} → ${v ?? "–"}`; }
    if (kind === "rep") { const d = S.remote.reports[p[0]], it = d && (d.items || []).find(x => x.id === p[1]), pl = it && S.remote.players[it.pid]; return `Denuncia contra ${pl ? pl.name : "?"} · ${lab(p[2])}: ${fv2(v, p[2])}`; }
  } catch (e) {}
  return "";
}
function staffArr() { return Object.entries(S.staffList).map(([uid, d]) => ({uid, ...d})); }
function ultraCount(users) { return users.filter(x => x.role === "ultra" && x.active !== false).length; }
async function accountBind(p, v) {
  if (!isUltra()) { toast("Esto lo puede cambiar solo ultra staff."); return; }
  const [uid, field] = p, cur = S.staffList[uid]; if (!cur) return;
  const next = {...clone(cur), [field]: v};
  const after = staffArr().map(x => x.uid === uid ? {...x, ...next} : x);
  if (ultraCount(after) < 1) { toast("Tiene que quedar al menos un ultra staff activo."); renderAdminSoon(); return; }
  try {
    await save(`staff/${uid}`, next);
    audit(field === "role" ? `Cambió el rol de ${cur.u}: ${cur.role === "ultra" ? "ultra staff" : "staff"} → ${v === "ultra" ? "ultra staff" : "staff"}` : `${v ? "Activó" : "Desactivó"} la cuenta ${cur.u}`);
  } catch (e) {}
  renderAdminSoon();
}
async function accountAction(act, uid, btn) {
  try {
    if (act === "acc-add") {
      const name = ($("#accNew").value || "").trim().toLowerCase().replace(/\s+/g, ""), role = $("#accRole").value;
      if (!/^[a-z0-9._-]{3,24}$/.test(name)) { toast("El usuario tiene que tener entre 3 y 24 letras, números, punto, guion o guion bajo."); return; }
      if (staffArr().some(x => x.u === name)) { toast("Ese usuario ya existe."); return; }
      toast("Creando la cuenta…"); const j = await staffApi({action: "create", u: name, role}); S.adm.newPw = {u: j.u, p: j.password}; renderAdminSoon(); return;
    }
    const a = S.staffList[uid]; if (!a) return;
    if (act === "acc-reset") { if (!arm(btn)) return; const j = await staffApi({action: "reset", u: a.u}); S.adm.newPw = {u: a.u, p: j.password}; renderAdminSoon(); }
    if (act === "acc-del") {
      if (!arm(btn)) return;
      if (ultraCount(staffArr().filter(x => x.uid !== uid)) < 1) { toast("Tiene que quedar al menos un ultra staff activo."); return; }
      await staffApi({action: "delete", u: a.u}); toast(`Cuenta ${a.u} borrada.`); renderAdminSoon();
    }
  } catch (e) { toast(e.message || "No se pudo completar."); }
}
function admStaff() {
  const users = staffArr().sort((a, b) => (a.role === "ultra" ? 0 : 1) - (b.role === "ultra" ? 0 : 1) || String(a.u).localeCompare(String(b.u)));
  const np = S.adm.newPw ? `<div class="ex-banner cut-s" style="margin:0"><span><b>CONTRASEÑA NUEVA</b> &nbsp;Usuario <span class="mono" style="color:#fff">${esc(S.adm.newPw.u)}</span> · contraseña <span class="mono" style="color:#fff;font-size:16px;user-select:all">${esc(S.adm.newPw.p)}</span>. Copiala ahora: no se vuelve a mostrar.</span><button class="btn sm" data-act="copy-pw">Copiar</button></div>` : "";
  const rows = users.map(a => `<div class="prow3" style="grid-template-columns:minmax(110px,1fr) minmax(130px,1fr) auto auto auto;align-items:center">
      <span class="mono" style="font-size:14px;color:#fff">${esc(a.u)}${S.staff && S.staff.uid === a.uid ? ' <span class="muted" style="font-size:11px">(vos)</span>' : ""}</span>
      <select class="cell-in" data-bind="acc:${a.uid}:role" data-t="s" aria-label="Rol de ${esc(a.u)}">${opt("staff", "Staff", a.role !== "ultra")}${opt("ultra", "Ultra staff", a.role === "ultra")}</select>
      <span class="chk"><input type="checkbox" ${a.active !== false ? "checked" : ""} data-bind="acc:${a.uid}:active" data-t="b">Activa</span>
      <button class="btn sm ghost" data-act="acc-reset:${a.uid}">Nueva contraseña</button><button class="btn sm danger" data-act="acc-del:${a.uid}">Borrar</button></div>`).join("");
  const us = [...new Set(S.audit.map(x => x.u))].sort();
  return `${np}<div class="adm-card"><h3>Cuentas de staff <small>${users.length} cuentas · ${ultraCount(users)} ultra staff activos</small></h3>
      <p class="adm-note">Las contraseñas las guarda Firebase cifradas; nadie las puede ver. Si alguien se olvida la suya, generale una nueva.</p>
      <div class="ptable">${rows || '<p class="adm-note">No hay cuentas.</p>'}</div>
      <div class="rowbtns"><input class="cell-in" id="accNew" placeholder="nuevo usuario" style="max-width:200px" autocomplete="off"><select class="cell-in" id="accRole" style="max-width:160px">${opt("staff", "Staff", true)}${opt("ultra", "Ultra staff", false)}</select><button class="btn sm gold" data-act="acc-add">Crear cuenta</button></div></div>
    ${admCaptains()}
    <div class="adm-card"><h3>Registro de auditoría <small>últimos 400 cambios · nadie lo puede editar ni borrar</small></h3>
      <div class="rowbtns"><select class="cell-in" id="auU" style="max-width:200px" aria-label="Filtrar por staff">${opt("all", "Todo el staff", S.adm.auU === "all")}${us.map(u => opt(u, u, S.adm.auU === u)).join("")}</select><input class="cell-in" id="auQ" placeholder="Buscar en los cambios" value="${esc(S.adm.auQ)}" style="max-width:280px" autocomplete="off"></div>
      <div class="audit-list" id="auditList"></div></div>`;
}
function capArr() { return Object.entries(S.captainList).map(([uid, d]) => ({uid, ...d})).sort((a, b) => String(a.u).localeCompare(String(b.u), "es", {numeric: true})); }
function admCaptains() {
  const R = RM(), caps = capArr();
  const rows = caps.map(a => `<div class="prow3" style="grid-template-columns:minmax(110px,1fr) minmax(140px,1fr) auto auto auto;align-items:center">
      <span class="mono" style="font-size:14px;color:#fff">${esc(a.u)}</span>
      <select class="cell-in" data-bind="cap:${a.uid}:team" data-t="sn" aria-label="Equipo de ${esc(a.u)}">${opt("", "Sin equipo", !a.team)}${TEAM_KEYS.map(k => opt(k, R.teams[k].name, a.team === k)).join("")}</select>
      <span class="chk"><input type="checkbox" ${a.active !== false ? "checked" : ""} data-bind="cap:${a.uid}:active" data-t="b">Activa</span>
      <button class="btn sm ghost" data-act="cap-reset:${a.uid}">Nueva contraseña</button><button class="btn sm danger" data-act="cap-del:${a.uid}">Borrar</button></div>`).join("");
  const res = S.adm.impRes ? `<div class="ex-banner cut-s" style="margin:0"><span><b>IMPORTACIÓN</b> &nbsp;${S.adm.impRes.created.length} cuentas creadas${S.adm.impRes.skipped.length ? ` · ${S.adm.impRes.skipped.length} salteadas (${S.adm.impRes.skipped.map(x => esc(x.u) + ": " + esc(x.why)).join("; ")})` : ""}.</span></div>` : "";
  return `<div class="adm-card"><h3>Cuentas de capitán <small>${caps.length} cuentas · no tienen ningún permiso de staff</small></h3>
      <p class="adm-note">Cada capitán solo ve su equipo y manda solicitudes (altas de jugadores, valor y cláusula). Elegí acá a qué equipo corresponde cada cuenta.</p>
      <div class="ptable">${rows || '<p class="adm-note">Todavía no hay capitanes. Importalos con el archivo CSV de abajo.</p>'}</div>
      <div class="rowbtns"><input class="cell-in" id="capNew" placeholder="nuevo capitán" style="max-width:200px" autocomplete="off"><select class="cell-in" id="capNewTeam" style="max-width:170px">${opt("", "Sin equipo", true)}${TEAM_KEYS.map(k => opt(k, R.teams[k].name)).join("")}</select><button class="btn sm gold" data-act="cap-add">Crear capitán</button></div></div>
    <div class="adm-card"><h3>Importar cuentas desde CSV <small>staff, ultra staff o capitanes, de a muchas</small></h3>
      <p class="adm-note">Formato: <span class="mono">usuario,contraseña,rol,equipo</span>. El rol puede ser <span class="mono">staff</span>, <span class="mono">ultra</span> o <span class="mono">capitan</span>. El equipo es opcional (onyx, orion, nexus, zenith, vortex, zyriax, kyrox). Las cuentas que ya existen se saltean.</p>
      ${res}<div class="fgrid">${fld("Archivo CSV", `<input type="file" id="impFile" accept=".csv,text/csv,text/plain">`)}</div>
      ${fld("O pegá el contenido", `<textarea id="impCsv" rows="4" placeholder="usuario,contraseña,rol,equipo&#10;cap01,xxxx-xxxx-xxxx,capitan,onyx"></textarea>`)}
      <div class="rowbtns"><button class="btn sm gold" data-act="acc-import">Importar cuentas</button></div></div>`;
}
function parseAccCsv(txt) {
  return String(txt || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => l.split(/[,;\t]/).map(x => x.trim()))
    .filter(c => c.length >= 2 && !/^usuario$/i.test(c[0]))
    .map(c => ({u: c[0].toLowerCase(), p: c[1], role: /ultra/i.test(c[2] || "") ? "ultra" : /cap/i.test(c[2] || "") ? "captain" : "staff", team: (c[3] || "").toLowerCase() || null}));
}
async function capBind(p, v) {
  if (!isUltra()) { toast("Esto lo puede cambiar solo ultra staff."); return; }
  const [uid, field] = p, cur = S.captainList[uid]; if (!cur) return;
  try {
    await save(`captains/${uid}`, {...clone(cur), [field]: v});
    audit(field === "team" ? `Asignó a la cuenta de capitán ${cur.u} el equipo ${v ? TM(v).name : "ninguno"}` : `${v ? "Activó" : "Desactivó"} la cuenta de capitán ${cur.u}`);
  } catch (e) {}
}
function renderAuditList() {
  const el = $("#auditList"); if (!el) return;
  const q = S.adm.auQ.toLowerCase();
  const L = S.audit.filter(x => (S.adm.auU === "all" || x.u === S.adm.auU) && (!q || String(x.txt).toLowerCase().includes(q) || String(x.u).toLowerCase().includes(q)));
  el.innerHTML = L.map(x => `<div class="au-row"><span class="mono muted">${new Date(x.at).toLocaleString("es-AR", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"})}</span><span class="au-u ${x.role === "ultra" ? "ultra" : ""}">${esc(x.u)}</span><span>${esc(x.txt)}</span></div>`).join("") || '<p class="adm-note">No hay cambios registrados con ese filtro.</p>';
}
$("#adminRoot").addEventListener("input", e => { if (e.target.id === "auQ") { S.adm.auQ = e.target.value; renderAuditList(); } });
$("#adminRoot").addEventListener("input", e => {
  const id = e.target.id, nt = S.adm.nt;
  const npF = {npName: "name", npDesc: "desc", npPts: "pts", npUsd: "usd", npStock: "stock"}[id]; if (npF) { S.adm.np[npF] = e.target.value; return; }
  if (!["ntName", "ntC", "ntL"].includes(id)) return;
  if (id === "ntName") nt.name = e.target.value;
  if (id === "ntC") { nt.c = e.target.value; if (!nt.lTouched) { nt.l = lighten(nt.c); const l = $("#ntL"); if (l) l.value = nt.l; } }
  if (id === "ntL") { nt.l = e.target.value; nt.lTouched = true; }
  const pv = $("#ntPrev"); if (pv && !nt.logo) pv.src = initialsLogo(nt.name || "?", nt.c);
});
$("#adminRoot").addEventListener("change", e => { if (e.target.id === "auU") { S.adm.auU = e.target.value; renderAuditList(); } });

/* ================= ONYX BOT (solo ultra1 y ultra2) ================= */
const BOT_ADMINS = ["ultra1", "ultra2"];
const isBotAdmin = () => isUltra() && BOT_ADMINS.includes(String(S.staff.u || "").toLowerCase());
S.bot = {status: null, loading: false, err: "", form: null, dirty: false, busy: "",
  an: {to: "", mention: "none", title: "", text: "", color: "#8a3dff", image: ""}, postCh: "", nt: {match: "", kinds: ["chat", "info", "strats", "partidos"]},
  mem: {q: "", list: [], sel: null, role: ""}};
const BOT_OFFSETS = [[1440, "24 h antes"], [720, "12 h"], [360, "6 h"], [180, "3 h"], [60, "1 h"], [30, "30 min"], [0, "Al empezar"]];
const BOT_KINDS = [["chat", "Chat", "Aviso del partido con día, hora, mapa y cómo vienen los dos equipos."],
  ["info", "Info", "Menciona al rol del equipo y les pide que pongan qué roles juegan, qué mapa y si arrancan en ataque o defensa."],
  ["strats", "Strats", "Les pide que suban estrategias, setups y clips, con datos del rival."],
  ["partidos", "Partidos", "Les recuerda subir la captura con las stats cuando termine el partido."]];
const BOT_GEN = [["anuncios", "Anuncios", "Destino por defecto de los anuncios del panel"], ["partidos", "Recordatorios generales", "Todos los partidos de la liga"], ["resultados", "Resultados", "Cada resultado apenas se carga"], ["mapas", "Mapas sorteados", "Cada sorteo del modo streamer"], ["mercado", "Fichajes", "Cada fichaje aprobado"]];
async function botApi(body) {
  const tok = await AUTH.currentUser.getIdToken();
  const r = await fetch("/api/bot", {method: "POST", headers: {"content-type": "application/json", authorization: "Bearer " + tok}, body: JSON.stringify(body)});
  const j = await r.json().catch(() => ({error: "El servidor no respondió bien. ¿Ya subiste la actualización del bot a GitHub?"}));
  if (!r.ok) throw new Error(j.error || "No se pudo completar.");
  return j;
}
async function botLoad() {
  const B = S.bot; if (B.loading) return;
  B.loading = true; B.err = "";
  try { const st = await botApi({action: "status"}); B.status = st; if (!B.form || !B.dirty) { B.form = clone(st.config); B.dirty = false; } if (!B.an.to && st.config.channels.anuncios) B.an.to = st.config.channels.anuncios; if (!B.postCh) B.postCh = st.config.channels.anuncios || ""; }
  catch (e) { B.err = e.message; }
  B.loading = false; if (S.adm.tab === "bot") renderAdminSoon();
}
const botAvatar = () => { const b = S.bot.status && S.bot.status.bot; return b && b.avatar ? `https://cdn.discordapp.com/avatars/${b.id}/${b.avatar}.png?size=96` : "icon-192.png"; };
const memAvatar = m => m.avatar ? `https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=64` : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(m.id) >> 22n) % 6}.png`;
const roleHex = c => c ? "#" + Number(c).toString(16).padStart(6, "0") : "#99aab5";
function botCh(id) { const c = ((S.bot.status || {}).channels || []).find(x => x.id === id); return c ? "#" + c.name : ""; }
function botRole(id) { return ((S.bot.status || {}).roles || []).find(x => x.id === id); }
function botChOpts(sel, multi, none = "— Ninguno —") {
  const chs = (S.bot.status || {}).channels || [];
  const cats = chs.filter(c => c.type === 4).sort((a, b) => a.position - b.position), text = chs.filter(c => c.type === 0 || c.type === 5).sort((a, b) => a.position - b.position);
  let h = opt("", none, !sel);
  if (multi) h += `<optgroup label="Varios canales a la vez">${BOT_KINDS.map(([k, l]) => opt("teams:" + k, `${l} de todos los equipos`, sel === "teams:" + k)).join("")}</optgroup>`;
  const loose = text.filter(c => !cats.some(k => k.id === c.parent));
  if (loose.length) h += `<optgroup label="Sin categoría">${loose.map(c => opt(c.id, "# " + c.name, sel === c.id)).join("")}</optgroup>`;
  cats.forEach(k => { const l = text.filter(c => c.parent === k.id); if (l.length) h += `<optgroup label="${esc(k.name)}">${l.map(c => opt(c.id, "# " + c.name, sel === c.id)).join("")}</optgroup>`; });
  if (sel && !String(sel).startsWith("teams:") && !text.some(c => c.id === sel)) h += opt(sel, "Canal que ya no existe", true);
  return h;
}
function botRoleOpts(sel, none = "— Ninguno —") {
  const rs = ((S.bot.status || {}).roles || []).filter(r => !r.managed);
  return opt("", none, !sel) + rs.map(r => opt(r.id, r.name, sel === r.id)).join("");
}
const botChips = (path, list) => `<div class="bot-chips">${BOT_OFFSETS.map(([v, l]) => `<button class="bot-chip ${list.includes(v) ? "on" : ""}" data-act="bot-chip:${path}:${v}" aria-pressed="${list.includes(v)}">${l}</button>`).join("")}</div>`;
const botSw = (path, on, label) => `<label class="chk"><input type="checkbox" data-bf="${path}" ${on ? "checked" : ""}>${label}</label>`;
const agoTxt = t => { if (!t) return "nunca"; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? "recién" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} días`; };

function botSetup(st) {
  const E = st.env, okv = k => E[k] ? `<b class="ok">✓</b>` : `<b class="no">✗</b>`;
  return `<div class="adm-card"><h3>ONYX Bot <small>falta conectarlo con Discord</small></h3>
    <p class="adm-note">Esto se hace una sola vez. Cuando las cuatro variables estén en verde, este panel se convierte en el control del bot.</p>
    <ol class="bot-steps">
      <li>Entrá a <a href="https://discord.com/developers/applications" target="_blank" rel="noopener">discord.com/developers/applications</a> → <b>New Application</b> → nombre <b>ONYX Bot</b>.</li>
      <li>En <b>General Information</b> copiá el <b>Application ID</b> y la <b>Public Key</b>.</li>
      <li>En <b>Bot</b> tocá <b>Reset Token</b> y copiá el token. Más abajo activá <b>Server Members Intent</b>. Ahí también le podés poner la foto.</li>
      <li>En Discord: Ajustes → Avanzado → <b>Modo desarrollador</b>. Clic derecho en tu servidor → <b>Copiar ID del servidor</b>.</li>
      <li>En Netlify: Project configuration → Environment variables, cargá estas cuatro y después <b>Deploys → Trigger deploy</b>:
        <div class="bot-env">${["DISCORD_APP_ID", "DISCORD_PUBLIC_KEY", "DISCORD_BOT_TOKEN", "DISCORD_GUILD_ID"].map(k => `<span>${okv(k)} <span class="mono">${k}</span></span>`).join("")}</div></li>
      <li>De vuelta en el portal, en <b>General Information</b> → <b>Interactions Endpoint URL</b> pegá esta dirección y guardá:
        <div class="rowbtns"><span class="mono bot-url">${esc(st.endpoint)}</span><button class="btn sm" data-act="bot-copy">Copiar</button></div></li>
      <li>Invitá el bot a tu servidor${st.invite ? `: <a href="${esc(st.invite)}" target="_blank" rel="noopener">abrir link de invitación</a>` : " (el link aparece cuando cargues DISCORD_APP_ID)"}.</li>
    </ol>
    <div class="rowbtns"><button class="btn sm gold" data-act="bot-refresh">Ya lo hice, revisar</button></div></div>`;
}

function admBot(R, Dr) {
  const B = S.bot, st = B.status;
  if (!st) {
    if (!B.loading && !B.err) setTimeout(botLoad, 0);
    return `<div class="adm-card"><h3>ONYX Bot</h3>${B.err ? `<p class="adm-note">${esc(B.err)}</p><div class="rowbtns"><button class="btn sm" data-act="bot-refresh">Reintentar</button></div>` : `<p class="adm-note">Conectando con Discord…</p>`}</div>`;
  }
  if (!st.ready) return botSetup(st);
  const F = B.form, on = F.enabled;
  TEAM_KEYS.forEach(k => { F.teams[k] = F.teams[k] || {role: "", chat: "", info: "", strats: "", partidos: "", mapas: ""}; });
  F.mapAsk = Object.assign({mention: "none", auto: false}, F.mapAsk || {});
  const warns = [...(st.errors || [])];
  if (st.commands < st.commandsTotal) warns.push(`Discord tiene ${st.commands} de ${st.commandsTotal} comandos. Tocá <b>Registrar comandos</b> para que aparezcan.`);
  if (st.botAdmin === false) warns.push("El rol del bot no tiene permiso de <b>Administrador</b>. Sin eso no puede escribir en los canales privados de los equipos.");
  const low = TEAM_KEYS.map(k => botRole(F.teams[k].role)).filter(r => r && st.botTop != null && r.position >= st.botTop);
  if (low.length) warns.push(`El rol del bot (${esc(st.botRole || "ONYX Bot")}) está debajo de ${low.map(r => esc(r.name)).join(", ")}. Subilo en Ajustes del servidor → Roles para poder dar esos roles.`);
  if (on && st.state.lastRun === 0) warns.push("La revisión automática todavía no corrió. Corre sola cada 10 minutos en el sitio publicado.");
  if (st.state.lastError) warns.push("Último error de la revisión automática: " + esc(st.state.lastError));
  const head = `<div class="adm-card bot-head-card">
      <div class="bot-id"><img src="${esc(botAvatar())}" alt="" width="56" height="56"><div><b>${esc(st.bot ? st.bot.name : "ONYX Bot")}</b><span>${st.guild ? `en ${esc(st.guild.name)} · ${st.guild.members} miembros` : "sin servidor"}</span></div>
        <span class="bot-state ${on ? "on" : ""}">${on ? "Avisos automáticos activos" : "Avisos automáticos en pausa"}</span></div>
      <div class="tiles"><div class="tile ${st.commands >= st.commandsTotal ? "ok" : "hot"}" style="cursor:default"><b>${st.commands}/${st.commandsTotal}</b><span>comandos en Discord</span></div>
        <div class="tile" style="cursor:default"><b>${TEAM_KEYS.filter(k => BOT_KINDS.every(([x]) => F.teams[k][x])).length}/${TEAM_KEYS.length}</b><span>equipos con canales listos</span></div>
        <div class="tile" style="cursor:default"><b style="font-size:20px">${agoTxt(st.state.lastRun)}</b><span>última revisión automática</span></div></div>
      ${warns.length ? `<div class="bot-warn">${warns.map(w => `<p>${w}</p>`).join("")}</div>` : ""}
      <div class="rowbtns"><button class="btn sm ${on ? "ghost" : "gold"}" data-act="bot-enable">${on ? "Pausar avisos automáticos" : "Activar avisos automáticos"}</button>
        <button class="btn sm ${st.commands < st.commandsTotal ? "gold" : ""}" data-act="bot-register">Registrar comandos</button><button class="btn sm" data-act="bot-tick">Revisar avisos ahora</button><button class="btn sm ghost" data-act="bot-refresh">Actualizar</button>
        ${st.invite ? `<a class="btn sm ghost" href="${esc(st.invite)}" target="_blank" rel="noopener">Link de invitación</a>` : ""}</div></div>`;
  const teams = `<div class="adm-card"><h3>Canales de cada equipo <small>rol a mencionar y los 4 canales de su categoría</small></h3>
      <div class="rowbtns"><button class="btn sm gold" data-act="bot-detect">Detectar automáticamente</button><span class="adm-note">Busca la categoría de cada equipo (ONYX, ORION, NEXUS…) y sus canales chat, info, strats y partidos. Revisá y tocá Guardar.</span></div>
      <div class="bot-teams">${TEAM_KEYS.map(k => `<div class="bot-team" style="--tc:${R.teams[k].c}"><div class="bt-h"><img src="${EMB[k]}" alt="" width="28" height="28"><b>${esc(R.teams[k].name)}</b></div>
        <div class="fgrid">${fld("Rol del equipo", `<select data-bf="teams.${k}.role">${botRoleOpts(F.teams[k].role)}</select>`)}${BOT_KINDS.map(([x, l]) => fld(l, `<select data-bf="teams.${k}.${x}">${botChOpts(F.teams[k][x])}</select>`)).join("")}</div></div>`).join("")}</div></div>`;
  const plan = `<div class="adm-card"><h3>Avisos de cada fecha <small>uno por cruce: la ida y la vuelta van juntas en el mismo mensaje</small></h3>
      ${BOT_KINDS.map(([x, l, d]) => `<div class="bot-kind"><div><b>${l}</b><span>${d}</span></div>${botChips("team." + x, F.team[x])}</div>`).join("")}
      <div class="rowbtns">${botSw("team.result", F.team.result, "Cuando se carga el resultado, mandarlo con las stats del equipo al canal <b>partidos</b>")}</div>
      <div class="rowbtns">${botSw("team.drawInfo", F.team.drawInfo, "Cuando se sortea el mapa, avisar en el canal <b>info</b> de los dos equipos")}</div>
      <p class="adm-note">Los horarios cuentan desde el primer partido del cruce (la ida). El resultado sale en un solo mensaje cuando se cargaron la ida y la vuelta. Si un partido se carga o se cambia de horario a último momento, se manda solo el aviso más cercano (no llegan todos juntos).</p></div>`;
  const gen = `<div class="adm-card"><h3>Canales generales</h3>
      <div class="fgrid">${BOT_GEN.map(([k, l, d]) => fld(l, `<select data-bf="channels.${k}" title="${esc(d)}">${botChOpts(F.channels[k])}</select>`)).join("")}</div>
      <div class="bot-kind"><div><b>Recordatorios generales</b><span>Cuándo avisar cada cruce (ida y vuelta) en el canal general.</span></div>${botChips("general.reminders", F.general.reminders)}</div>
      <div class="rowbtns">${botSw("general.results", F.general.results, "Publicar resultados")}${botSw("general.draws", F.general.draws, "Publicar mapas sorteados")}${botSw("general.transfers", F.general.transfers, "Publicar fichajes")}</div></div>`;
  const save = `<div class="bot-save ${B.dirty ? "on" : ""}"><span>${B.dirty ? "Tenés cambios sin guardar" : "Configuración guardada"}</span><button class="btn sm gold" data-act="bot-save" ${B.dirty ? "" : "disabled"}>Guardar configuración</button></div>`;
  const seenC = new Set(), pend = Dr.ms.filter(m => m.status !== "played").filter(m => { const c = `${m.fecha}|${[m.a, m.b].sort().join("~")}`; if (seenC.has(c)) return false; seenC.add(c); return true; });
  if (!pend.some(m => m.id === B.nt.match)) B.nt.match = (pend[0] || {}).id || "";
  const now = `<div class="adm-card"><h3>Mandar avisos ahora <small>para probar o si cambió el horario</small></h3>
      ${pend.length ? `<div class="fgrid">${fld("Cruce", `<select data-bn="match">${pend.map(m => opt(m.id, `F${m.fecha} · ${R.teams[m.a] ? R.teams[m.a].name : "?"} vs ${R.teams[m.b] ? R.teams[m.b].name : "?"}${m.legs === 2 ? " · ida y vuelta" : ""}${m.date ? " · " + fmtDate(m.date) : ""}`, m.id === B.nt.match)).join("")}</select>`)}</div>
      <div class="rowbtns">${BOT_KINDS.map(([x, l]) => `<label class="chk"><input type="checkbox" data-bn="k:${x}" ${B.nt.kinds.includes(x) ? "checked" : ""}>${l}</label>`).join("")}<button class="btn sm gold" data-act="bot-notify">Mandar a los dos equipos</button></div>` : `<p class="adm-note">No hay partidos pendientes.</p>`}</div>`;
  const multi = String(B.an.to).startsWith("teams:");
  if (!multi && B.an.mention === "team") B.an.mention = "none";
  const an = `<div class="adm-card"><h3>Anuncio <small>sale con el diseño de la liga</small></h3>
      <div class="fgrid">${fld("Dónde", `<select data-ba="to">${botChOpts(B.an.to, true)}</select>`)}
        ${fld("Mencionar", `<select data-ba="mention">${opt("none", "A nadie", B.an.mention === "none")}${multi ? opt("team", "Al rol de cada equipo", B.an.mention === "team") : ""}${opt("everyone", "@everyone", B.an.mention === "everyone")}${opt("here", "@here", B.an.mention === "here")}<optgroup label="Roles">${((st.roles || []).filter(r => !r.managed)).map(r => opt(r.id, "@" + r.name, B.an.mention === r.id)).join("")}</optgroup></select>`)}
        ${fld("Color", `<input type="color" data-ba="color" value="${esc(B.an.color)}">`)}${fld("Imagen (link, opcional)", `<input data-ba="image" value="${esc(B.an.image)}" placeholder="https://…" autocomplete="off">`)}</div>
      ${fld("Título", `<input data-ba="title" value="${esc(B.an.title)}" maxlength="200" placeholder="Ej: Arranca la fecha 3" autocomplete="off">`)}
      ${fld("Texto", `<textarea data-ba="text" rows="5" maxlength="3800" placeholder="Podés usar **negrita** y saltos de línea.">${esc(B.an.text)}</textarea>`)}
      <div class="bot-prev" id="botPrev">${botPreview()}</div>
      <div class="rowbtns"><button class="btn sm gold" data-act="bot-announce">Publicar anuncio</button></div></div>`;
  const post = `<div class="adm-card"><h3>Publicar ahora</h3>
      <div class="fgrid">${fld("Canal", `<select data-bp="ch">${botChOpts(B.postCh)}</select>`)}</div>
      <div class="rowbtns">${[["table", "Tabla"], ["next", "Próximos partidos"], ["results", "Resultados de la última fecha"], ["awards", "Premios"], ["market", "Mercado"]].map(([k, l]) => `<button class="btn sm" data-act="bot-post:${k}">${l}</button>`).join("")}<button class="btn sm ghost" data-act="bot-test">Mensaje de prueba</button></div></div>`;
  const MB = B.mem, sel = MB.sel;
  const roles = `<div class="adm-card"><h3>Roles <small>dar o quitar roles a cualquiera del servidor</small></h3>
      <div class="rowbtns"><input class="cell-in" data-bm="q" value="${esc(MB.q)}" placeholder="Buscar por nombre de Discord" style="max-width:280px" autocomplete="off"><button class="btn sm" data-act="bot-search">Buscar</button></div>
      ${MB.list.length ? `<div class="bot-mems">${MB.list.map(m => `<button class="bot-mem ${sel && sel.id === m.id ? "on" : ""}" data-act="bot-pick:${m.id}"><img src="${esc(memAvatar(m))}" alt="" width="28" height="28"><span><b>${esc(m.name)}</b><small>@${esc(m.username)}</small></span></button>`).join("")}</div>` : ""}
      ${sel ? `<div class="bot-sel"><div class="bot-rl">${sel.roles.map(id => botRole(id)).filter(Boolean).sort((a, b) => b.position - a.position).map(r => `<span class="bot-r" style="--rc:${roleHex(r.color)}">${esc(r.name)}${r.managed ? "" : `<button data-act="bot-role:remove:${r.id}" aria-label="Quitar ${esc(r.name)}">×</button>`}</span>`).join("") || '<span class="adm-note">No tiene roles.</span>'}</div>
        <div class="rowbtns"><select class="cell-in" data-bm="role" style="max-width:260px">${botRoleOpts(MB.role, "Elegí un rol")}</select><button class="btn sm gold" data-act="bot-role:add">Darle el rol a ${esc(sel.name)}</button></div></div>` : ""}</div>`;
  const log = `<div class="adm-card"><h3>Actividad del bot <small>últimos mensajes que mandó</small></h3>
      <div class="bot-log">${(st.state.log || []).map(l => `<div class="${l.ok ? "" : "bad"}"><span class="mono muted">${new Date(l.at).toLocaleString("es-AR", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"})}</span><span>${l.ok ? "✓" : "✗"}</span><span>${esc(l.txt)}</span></div>`).join("") || '<p class="adm-note">Todavía no mandó nada.</p>'}</div></div>`;
  const fechas = [...new Set(Dr.pending.map(m => m.fecha))].sort((a, b) => a - b);
  if (!fechas.includes(B.mpF)) B.mpF = fechas[0];
  const mrows = fechas.length ? mpRows(Dr, B.mpF) : [], miss = mrows.filter(r => !r.pick).length, withPick = new Set(mrows.filter(r => r.pick).map(r => [r.k, r.rival].sort().join("~"))).size;
  const mapAsk = `<div class="adm-card"><h3>Pedir mapa a los capitanes <small>el bot manda un botón que los lleva a la web para elegir mapa y lado</small></h3>
      ${fechas.length ? `<div class="fgrid">${fld("Fecha", `<select data-bmp="f">${fechas.map(f => opt(f, "Fecha " + f, f === B.mpF)).join("")}</select>`)}
        ${fld("Mencionar", `<select data-bf="mapAsk.mention">${opt("none", "A nadie", F.mapAsk.mention === "none")}${opt("team", "Al rol de cada equipo", F.mapAsk.mention === "team")}<optgroup label="Roles">${(st.roles || []).filter(r => !r.managed).map(r => opt(r.id, "@" + r.name, F.mapAsk.mention === r.id)).join("")}</optgroup></select>`)}</div>
      <div class="mp-rows">${mrows.map(r => `<div class="mp-row ch" style="--tc:${R.teams[r.k].c}">${img(r.k)}<div><b>${esc(R.teams[r.k].name)}</b><small>vs ${esc(R.teams[r.rival].name)}</small></div>
        <select class="cell-in" data-bf="teams.${r.k}.mapas" aria-label="Canal de ${esc(R.teams[r.k].name)}">${botChOpts(F.teams[r.k].mapas, false, F.teams[r.k].info ? `Canal info (${botCh(F.teams[r.k].info)})` : "— Elegí un canal —")}</select><div class="mp-st">${mpPickTxt(r)}</div></div>`).join("")}</div>
      <p class="adm-note">Si no elegís canal para un equipo, se manda a su canal <b>info</b>. Los canales que elijas quedan guardados para la próxima.</p>
      <div class="rowbtns"><button class="btn sm gold" data-act="bot-mapask:all">Mandar el pedido a los ${mrows.length} equipos</button><button class="btn sm" data-act="bot-mapask:missing" ${miss ? "" : "disabled"}>Recordar solo a los que faltan (${miss})</button></div>
      <div class="mp-send"><div><b>Avisar los mapas elegidos</b><span>A los dos equipos de cada cruce: el mapa de la ida y de la vuelta, qué capitán lo eligió y en qué lado arranca cada uno.</span></div>
        <div class="rowbtns"><button class="btn sm gold" data-act="bot-mapsend" ${withPick ? "" : "disabled"}>Mandar ahora (${withPick} cruce${withPick === 1 ? "" : "s"})</button>${botSw("mapAsk.auto", F.mapAsk.auto, "Mandarlos solos cuando los dos capitanes eligieron")}</div></div>` : '<p class="adm-note">No hay partidos pendientes.</p>'}</div>`;
  return head + teams + plan + gen + save + now + mapAsk + an + post + roles + log;
}
function botPreview() {
  const a = S.bot.an, md = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\s\|\s?/g, "<br>").replace(/\n/g, "<br>");
  const r = botRole(a.mention), ment = a.mention === "everyone" ? "@everyone" : a.mention === "here" ? "@here" : a.mention === "team" ? "@ROL DEL EQUIPO" : r ? "@" + r.name : "";
  return `<img class="pv-av" src="${esc(botAvatar())}" alt=""><div class="pv-b"><div class="pv-n">${esc((S.bot.status && S.bot.status.bot && S.bot.status.bot.name) || "ONYX Bot")} <span>BOT</span></div>${ment ? `<div class="pv-m">${esc(ment)}</div>` : ""}
    <div class="pv-e" style="--ec:${esc(a.color)}">${a.title ? `<b>${esc(a.title)}</b>` : ""}<div>${md(a.text) || '<span class="muted">El texto del anuncio aparece acá.</span>'}</div>${/^https:\/\//.test(a.image) ? `<img src="${esc(a.image)}" alt="">` : ""}<small>Anuncio de ${esc(S.staff ? S.staff.u : "")} · ONYX Bot</small></div></div>`;
}
function botSetPath(path, v) { const ks = path.split("."), last = ks.pop(); let o = S.bot.form; ks.forEach(k => { o = o[k] = o[k] || {}; }); o[last] = v; }
function botOnField(e) {
  const t = e.target, B = S.bot;
  if (t.dataset.bf != null && B.form) {
    botSetPath(t.dataset.bf, t.type === "checkbox" ? t.checked : t.value); B.dirty = true;
    const bar = $(".bot-save"); if (bar) { bar.classList.add("on"); bar.querySelector("span").textContent = "Tenés cambios sin guardar"; bar.querySelector("button").disabled = false; }
  } else if (t.dataset.ba != null) {
    B.an[t.dataset.ba] = t.value; const pv = $("#botPrev"); if (pv) pv.innerHTML = botPreview();
    if (t.dataset.ba === "to" && e.type === "change") renderAdminSoon();
  } else if (t.dataset.bn != null) {
    if (t.dataset.bn === "match") B.nt.match = t.value;
    else { const k = t.dataset.bn.slice(2); B.nt.kinds = t.checked ? [...new Set([...B.nt.kinds, k])] : B.nt.kinds.filter(x => x !== k); }
  } else if (t.dataset.bmp != null) { if (e.type === "change") { B.mpF = +t.value; renderAdminSoon(); } }
  else if (t.dataset.bp != null) B.postCh = t.value;
  else if (t.dataset.bm != null) B.mem[t.dataset.bm] = t.value;
}
$("#adminRoot").addEventListener("input", botOnField);
$("#adminRoot").addEventListener("change", botOnField);
$("#adminRoot").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset && e.target.dataset.bm === "q") { e.preventDefault(); botAction("bot-search", [], e.target); } });
async function botAction(act, a, btn) {
  const B = S.bot;
  if (!isBotAdmin()) { toast("ONYX Bot lo manejan solo ultra1 y ultra2."); return; }
  if (B.busy) return;
  const run = async (label, fn) => { B.busy = act; if (btn) btn.classList.add("busy"); try { await fn(); } catch (e) { toast(e.message || "No se pudo completar."); } finally { B.busy = ""; if (btn && btn.isConnected) btn.classList.remove("busy"); } };
  if (act === "bot-refresh") { B.status = null; B.dirty = false; renderAdmin(); return; }
  if (act === "bot-copy") { try { await navigator.clipboard.writeText(B.status.endpoint); toast("Dirección copiada."); } catch (e) { toast("Seleccioná la dirección y copiala a mano."); } return; }
  if (act === "bot-chip") { const path = a[0], v = +a[1], cur = path.split(".").reduce((o, k) => o[k], B.form); botSetPath(path, cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v].sort((x, y) => y - x)); B.dirty = true; renderAdmin(); return; }
  if (act === "bot-pick") { B.mem.sel = B.mem.list.find(m => m.id === a[0]) || null; renderAdmin(); return; }
  await run(act, async () => {
    if (act === "bot-save" || act === "bot-enable") {
      if (act === "bot-enable") B.form.enabled = !B.form.enabled;
      if (B.form.enabled && act === "bot-enable" && !TEAM_KEYS.some(k => B.form.teams[k].chat || B.form.teams[k].info)) toast("Ojo: todavía no elegiste canales de equipos.");
      const j = await botApi({action: "save", config: B.form}); B.status.config = j.config; B.form = clone(j.config); B.dirty = false;
      toast(act === "bot-enable" ? (j.config.enabled ? "Avisos automáticos activados." : "Avisos automáticos en pausa.") : "Configuración guardada.");
    }
    else if (act === "bot-detect") {
      const j = await botApi({action: "detect"});
      TEAM_KEYS.forEach(k => { const d = j.teams[k] || {}; B.form.teams[k] = B.form.teams[k] || {role: "", chat: "", info: "", strats: "", partidos: ""}; Object.keys(d).forEach(x => { if (d[x]) B.form.teams[k][x] = d[x]; }); });
      Object.keys(j.channels || {}).forEach(x => { if (j.channels[x] && !B.form.channels[x]) B.form.channels[x] = j.channels[x]; });
      B.dirty = true; toast(`Encontré ${j.found.channels} canales y ${j.found.roles} roles de equipo. Revisá y tocá Guardar.`);
    }
    else if (act === "bot-register") { const j = await botApi({action: "register"}); B.status.commands = j.count; toast(`Listo: ${j.count} comandos en Discord. Pueden tardar un minuto en aparecer.`); }
    else if (act === "bot-tick") { const j = await botApi({action: "tick"}); toast(j.skipped || (j.sent ? `Mandé ${j.sent} avisos.` : "No había avisos para mandar ahora.")); B.status = null; botLoad(); return; }
    else if (act === "bot-notify") {
      if (!B.nt.match || !B.nt.kinds.length) { toast("Elegí el partido y al menos un canal."); return; }
      const j = await botApi({action: "notify", matchId: B.nt.match, kinds: B.nt.kinds}); const bad = j.log.filter(l => !l.ok);
      toast(bad.length ? `Mandé ${j.sent}. ${bad[0].txt}` : `Listo: ${j.sent} avisos mandados.`); B.status.state.log = [...j.log, ...B.status.state.log].slice(0, 40);
    }
    else if (act === "bot-mapask") {
      const missing = a[0] === "missing";
      const j = await botApi({action: "askMaps", fecha: B.mpF, onlyMissing: missing, mention: B.form.mapAsk.mention, channels: Object.fromEntries(TEAM_KEYS.map(k => [k, (B.form.teams[k] || {}).mapas || ""]))});
      if (j.config) { B.status.config = j.config; TEAM_KEYS.forEach(k => { if (j.config.teams[k]) B.form.teams[k].mapas = j.config.teams[k].mapas; }); B.form.mapAsk = j.config.mapAsk; }
      const bad = (j.log || []).filter(l => !l.ok);
      toast(j.sent ? `Listo: le pedí el mapa a ${j.sent} equipo${j.sent > 1 ? "s" : ""}${j.skipped ? ` (${j.skipped} ya había${j.skipped > 1 ? "n" : ""} elegido)` : ""}.${bad.length ? " " + bad[0].txt : ""}` : (bad[0] ? bad[0].txt : "No había a quién mandarle."));
      B.status.state.log = [...(j.log || []), ...B.status.state.log].slice(0, 40);
    }
    else if (act === "bot-mapsend") {
      const j = await botApi({action: "sendMaps", fecha: B.mpF}); const bad = (j.log || []).filter(l => !l.ok);
      toast(`Listo: mandé los mapas de ${j.matches} cruce${j.matches > 1 ? "s" : ""} (${j.sent} mensajes).${bad.length ? " " + bad[0].txt : ""}`);
      B.status.state.log = [...(j.log || []), ...B.status.state.log].slice(0, 40);
    }
    else if (act === "bot-announce") {
      const an = B.an; if (!an.to) { toast("Elegí dónde publicarlo."); return; } if (!an.title.trim() && !an.text.trim()) { toast("Escribí un título o un texto."); return; }
      const label = an.to.startsWith("teams:") ? `el canal ${an.to.slice(6)} de todos los equipos` : botCh(an.to);
      const j = await botApi({action: "announce", ...an, label}); toast(j.errors.length ? `Publicado en ${j.sent}. ${j.errors[0]}` : "Anuncio publicado."); an.title = ""; an.text = ""; an.image = "";
    }
    else if (act === "bot-post" || act === "bot-test") {
      if (!B.postCh) { toast("Elegí un canal."); return; }
      if (act === "bot-test") await botApi({action: "test", channel: B.postCh}); else await botApi({action: "post", what: a[0], channel: B.postCh, label: botCh(B.postCh)});
      toast(`Publicado en ${botCh(B.postCh)}.`);
    }
    else if (act === "bot-search") { if (!B.mem.q.trim()) { toast("Escribí un nombre."); return; } const j = await botApi({action: "members", q: B.mem.q}); B.mem.list = j.members.filter(m => !m.bot); B.mem.sel = null; if (!B.mem.list.length) toast("No encontré a nadie con ese nombre."); }
    else if (act === "bot-role") {
      const sel = B.mem.sel, op = a[0], rid = op === "remove" ? a[1] : B.mem.role; if (!sel || !rid) { toast("Elegí un rol."); return; }
      const r = botRole(rid), j = await botApi({action: "role", user: sel.id, role: rid, op, roleName: r ? r.name : rid, userName: sel.name});
      sel.roles = j.roles; toast(op === "remove" ? `Le saqué ${r ? r.name : "el rol"} a ${sel.name}.` : `Le di ${r ? r.name : "el rol"} a ${sel.name}.`);
    }
    renderAdminSoon();
  });
}

/* ================= PANEL DEL CAPITÁN ================= */
function openCap() { if (!S.captain) { openLogin(); return; } S.cap.open = true; renderCap(); }
function capLogout() { setTimeout(() => AUTH && AUTH.signOut(), 200); S.cap.open = false; renderCap(); toast("Sesión cerrada."); }
function capReqs() { return Object.entries(S.requests).map(([id, r]) => ({id, ...r})).filter(r => S.captain && r.team === S.captain.team && r.type !== "link" && r.type !== "coachreg").sort((a, b) => b.at - a.at); }
// Deudas del equipo y link de pago de la liga
function capPayCard(k) {
  const pend = teamPendSal(k), u = payLink(), C = coachCfg(); if (!pend.length) return "";
  const owed = pend.reduce((a, s2) => a + (+s2.amt || 0), 0), lim = +C.maxRefills || 0, used = refillsOf(k);
  return `<div class="adm-card"><h3>${ico("i-wallet")} Sueldos impagos <small>${pend.length} sueldo${pend.length > 1 ? "s" : ""} · ${fmt(owed)} coins</small></h3>
    <p class="adm-note">Para ponerte al día, la recarga cuesta ${usdTxt(C.usd)}: tus coins vuelven a ${fmt(C.refill)} menos lo que debés.${lim ? ` Recargas usadas esta temporada: ${used} de ${lim}.` : ""} Cuando pagues, avisale al staff para que la registre.</p>
    ${u && !(lim && used >= lim) ? `<div class="rowbtns"><button class="btn sm gold" data-cap-act="pay">${ico("i-wallet")}<span>Pagar ${usdTxt(C.usd)}</span></button></div>` : ""}</div>`;
}
function renderCap() {
  const root = $("#capRoot");
  if (S.cap.open && !S.captain) S.cap.open = false;
  if (!S.cap.open) { root.innerHTML = ""; return; }
  const ae = document.activeElement;
  if (root.contains(ae) && ae.matches("input,select,textarea")) { S.cap.dirty = true; return; }
  const body = $(".adm-body", root), scroll = body ? body.scrollTop : 0;
  const c = S.captain, k = c.team, t = k ? TM(k) : null, R = RM();
  const reqs = capReqs(), pendBy = new Set(reqs.filter(r => r.status === "pend" && r.pid).map(r => r.pid));
  const ranges = `Valor de ${fmt(CAP_VAL_MIN)} a ${fmt(CAP_VAL_MAX)} · cláusula de rescisión hasta ${fmt(CAP_CLAUSE_MAX)} (0 = sin cláusula)`;
  let main;
  if (!k) main = `<div class="adm-card"><h3>Todavía no tenés equipo asignado</h3><p class="adm-note">Pedile a un ultra staff que le asigne un equipo a tu cuenta (<b>${esc(c.u)}</b>). Apenas lo haga, vas a ver tu plantel acá.</p></div>`;
  else {
    const rs = roster(k).sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || a.name.localeCompare(b.name));
    const row = p => {
      const ed = S.cap.edit === p.id, pend = pendBy.has(p.id), raw = R.players[p.id] || {};
      return `<div class="cap-row"><div class="top"><span class="ava" style="--tc:${t.c}">${esc(p.name.slice(0, 2).toUpperCase())}</span><div style="min-width:0"><b>${esc(p.name)}</b><small>${p.role}${p.rank ? " · " + esc(p.rank) : ""}</small></div>
          <div class="vals"><span>Valor <b>${raw.value != null ? fmt(raw.value) : "auto (" + fmt(p.value) + ")"}</b></span><span>Cláusula <b>${p.clause ? fmt(p.clause) : "–"}</b></span></div>
          ${pend ? '<span class="st pend">En revisión</span>' : `<button class="btn sm ${ed ? "ghost" : ""}" data-cap-act="edit:${p.id}">${ed ? "Cancelar" : "Cambiar valor o cláusula"}</button>`}</div>
        ${ed ? `<div class="fgrid">${fld("Valor nuevo", `<input id="ceV" type="number" min="${CAP_VAL_MIN}" max="${CAP_VAL_MAX}" step="50" value="${clamp(raw.value != null ? +raw.value : p.value, CAP_VAL_MIN, CAP_VAL_MAX)}">`)}${fld("Cláusula de rescisión", `<input id="ceC" type="number" min="0" max="${CAP_CLAUSE_MAX}" step="50" value="${p.clause || 0}">`)}</div>
          <div class="rowbtns"><button class="btn sm gold" data-cap-act="send-edit:${p.id}">Enviar al staff</button><span class="adm-note">${ranges}</span></div>` : ""}</div>`;
    };
    main = `<div class="adm-card"><h3>Plantel de ${esc(t.name)} <small>${rs.length} jugadores</small></h3>
        <div class="cap-roster">${rs.map(row).join("") || '<p class="adm-note">Tu equipo todavía no tiene jugadores. Agregalos abajo.</p>'}</div></div>
      <div class="adm-card"><h3>Agregar un jugador</h3><div class="fgrid">
        ${fld("Nombre", `<input id="caN" maxlength="30" placeholder="Nick del jugador" autocomplete="off">`)}${fld("Rol", `<select id="caR">${roleOpts("Duelista")}</select>`)}${fld("Rango (opcional)", `<input id="caK" maxlength="30" placeholder="Ej: Inmortal 1" autocomplete="off">`)}${fld("Riot ID (para Tracker)", `<input id="caI" maxlength="22" placeholder="Ej: Jagger#LAS" autocomplete="off" spellcheck="false">`)}
        ${fld("Valor", `<input id="caV" type="number" min="${CAP_VAL_MIN}" max="${CAP_VAL_MAX}" step="50" value="500">`)}${fld("Cláusula de rescisión", `<input id="caC" type="number" min="0" max="${CAP_CLAUSE_MAX}" step="50" value="0">`)}</div>
        <div class="rowbtns"><button class="btn sm gold" data-cap-act="send-add">Enviar al staff</button><span class="adm-note">${ranges}</span></div></div>
      <div class="adm-card"><h3>Tus solicitudes <small>${reqs.filter(r => r.status === "pend").length} esperando al staff</small></h3><div style="display:grid;gap:6px">
        ${reqs.map(r => { const st = {pend: ["En revisión", "pend", "var(--gold)"], ok: ["Aprobada", "ok", "var(--win)"], no: ["Rechazada", "no", "var(--loss)"]}[r.status] || ["?", "pend", "var(--dim)"];
          return `<div class="req" style="--st:${st[2]}">${img(r.team)}<div><div class="rq-t">${reqText(R, r)}</div><div class="rq-m">${new Date(r.at).toLocaleString("es-AR", {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"})}${r.reviewedBy ? ` · revisó ${esc(r.reviewedBy)}` : ""}${r.note ? ` · “${esc(r.note)}”` : ""}</div></div>
            <div class="rq-acts"><span class="st ${st[1]}">${st[0]}</span>${r.status === "pend" && r.by === c.uid ? `<button class="btn sm ghost" data-cap-act="cancel:${r.id}">Cancelar</button>` : ""}</div></div>`; }).join("") || '<p class="adm-note">Todavía no mandaste solicitudes.</p>'}</div></div>`;
  }
  root.innerHTML = `<div class="adm" role="dialog" aria-modal="true" aria-label="Panel del capitán"><div class="adm-panel" style="width:min(820px,100%)">
    <div class="adm-head"><div class="adm-title" ${t ? `style="--tc:${t.c}"` : ""}>${t && EMB[k] ? img(k, "adm-em") : ico("i-crown")}<div><h2>Panel de capitán</h2><span class="save-state">${t ? esc(t.name) : "Sin equipo asignado"}</span></div></div><span class="sp"></span><span class="who-chip">${ico("i-crown")}${esc(c.u)}<small>Capitán</small></span>
      ${k ? `<button class="btn sm gold" data-cap-act="market">${ico("i-coins")}<span>Fichar jugadores</span></button><button class="btn sm" data-cap-act="scout">${ico("i-scope")}<span>Ojear jugadores</span></button>` : ""}<button class="btn sm ghost" data-cap-act="logout">${ico("i-logout")}<span>Cerrar sesión</span></button><button class="btn sm ghost icon-only" data-cap-act="close" aria-label="Cerrar el panel" title="Cerrar (Esc)">${ico("i-close")}</button></div>
    <div class="adm-body">${t ? `<div class="ex-banner cut-s" style="margin:0;--tc:${t.c}"><span>Todo lo que pidas acá lo revisa el staff antes de que aparezca en la liga.</span></div>` : ""}${k ? capResultsCard(k) + capLinksCard(k) + capCoachRegCard(k) + capAttCard(k) : ""}${main}${k ? capMapCard(k) + capCoachCard(k) + capPayCard(k) + capCanjesCard(k) : ""}</div></div></div>`;
  const nb = $(".adm-body", root); if (nb) nb.scrollTop = scroll;
}
$("#capRoot").addEventListener("focusout", () => setTimeout(() => { const ae = document.activeElement; if (S.cap.dirty && !($("#capRoot").contains(ae) && ae.matches("input,select,textarea"))) { S.cap.dirty = false; renderCap(); } }, 30));
function capCanjesCard(k) {
  const rs = roster(k).map(p => ({p, s: saldoOf(p.id)})).sort((a, b) => b.s - a.s), pend = redeemList().filter(r => r.team === k && r.status === "pend").length;
  return `<div class="adm-card"><h3>Canjes de premios <small>${pend ? pend + " pedido" + (pend > 1 ? "s" : "") + " esperando al staff" : "saldo de puntos de tu equipo"}</small></h3>
    <div class="cap-saldos">${rs.map(x => `<span><b>${esc(x.p.name)}</b><i class="mono">${fmt(x.s)} pts</i></span>`).join("") || '<span class="adm-note">Sin jugadores.</span>'}</div>
    <div class="rowbtns"><button class="btn sm gold" data-cap-act="canjes">Ver premios y canjear</button></div></div>`;
}
function capReqBase() { const c = S.captain; return {team: c.team, by: c.uid, u: c.u, at: Date.now(), status: "pend", note: ""}; }
function capNum(id, lo, hi, label) {
  const v = Number(($(id) || {}).value);
  if (!Number.isFinite(v) || !Number.isInteger(v) || v < lo || v > hi) { toast(`${label} tiene que ser un número entero entre ${fmt(lo)} y ${fmt(hi)}.`); return null; }
  return v;
}
$("#capRoot").addEventListener("click", async e => {
  if (e.target.classList.contains("adm")) { S.cap.open = false; renderCap(); return; }
  const b = e.target.closest("[data-cap-act]"); if (!b || !S.captain) return;
  const [act, arg] = b.dataset.capAct.split(":"), c = S.captain;
  try {
    if (await extCapAct(act, arg, b)) return;
    if (act === "close") { S.cap.open = false; renderCap(); }
    else if (act === "mapa") { S.cap.open = false; renderCap(); const m = D.pending.find(x => x.a === c.team || x.b === c.team); if (m) S.mp.match = m.id; renderMapPick(); goView("elegir-mapa"); }
    else if (act === "scout") { S.cap.open = false; renderCap(); renderScouting(); goView("scouting"); }
    else if (act === "canjes") { S.cap.open = false; renderCap(); goView("canjes"); }
    else if (act === "market") { S.cap.open = false; renderCap(); renderMarket(); goView("mercado"); }
    else if (act === "logout") capLogout();
    else if (act === "edit") { S.cap.edit = S.cap.edit === arg ? null : arg; renderCap(); }
    else if (act === "send-edit") {
      const p = D.PM[arg], raw = S.remote.players[arg] || {}; if (!p || p.team !== c.team) { toast("Ese jugador ya no está en tu equipo."); return; }
      const value = capNum("#ceV", CAP_VAL_MIN, CAP_VAL_MAX, "El valor"); if (value == null) return;
      const clause = capNum("#ceC", 0, CAP_CLAUSE_MAX, "La cláusula"); if (clause == null) return;
      if (raw.value === value && (+raw.clause || 0) === clause) { toast("No cambiaste nada."); return; }
      b.disabled = true;
      await save(`requests/${newId("q")}`, {...capReqBase(), type: "edit", pid: arg, name: p.name, value, clause, prevValue: raw.value != null ? +raw.value : null, prevClause: +raw.clause || 0});
      S.cap.edit = null; toast("Solicitud enviada. El staff la revisa."); renderCap();
    }
    else if (act === "coach-req") { const cid = ($("#ccSel") || {}).value; if (cid) { b.disabled = true; await requestCoach(cid, "coach"); renderCap(); } }
    else if (act === "coach-out") { if (!arm(b)) return; await requestCoach(arg, "coachOut"); renderCap(); }
    else if (act === "send-add") {
      const name = ($("#caN").value || "").trim(), rank = ($("#caK").value || "").trim(), role = $("#caR").value, ign = normRiot(($("#caI") || {}).value);
      if (ign && !riotOk(ign)) { toast("El Riot ID va como en Valorant: Nombre#TAG."); return; }
      if (name.length < 2) { toast("Escribí el nombre del jugador (al menos 2 letras)."); return; }
      const value = capNum("#caV", CAP_VAL_MIN, CAP_VAL_MAX, "El valor"); if (value == null) return;
      const clause = capNum("#caC", 0, CAP_CLAUSE_MAX, "La cláusula"); if (clause == null) return;
      b.disabled = true;
      await save(`requests/${newId("q")}`, {...capReqBase(), type: "add", pid: null, name: name.slice(0, 30), role, rank: rank.slice(0, 30), value, clause, ...(ign ? {ign} : {})});
      toast(`Pediste agregar a ${name}. El staff lo revisa.`); renderCap();
    }
    else if (act === "cancel") { if (!arm(b)) return; await save(`requests/${arg}`, null, "del"); toast("Solicitud cancelada."); }
  } catch (er) { b.disabled = false; }
});

/* ---- admin: cambios en campos ---- */
function readVal(el) {
  const t = el.dataset.t;
  if (t === "b") return el.checked;
  if (t === "n") return el.value === "" ? 0 : Number(el.value);
  if (t === "nn") return el.value === "" ? null : Number(el.value);
  if (t === "sn") return el.value === "" ? null : el.value;
  if (t === "lines") return el.value.split("\n").map(s => s.trim()).filter(Boolean);
  if (t === "rules") return el.value.split("\n").map(s => s.trim()).filter(Boolean).map(s => { const i = s.indexOf(":"); return i > 0 ? {t: s.slice(0, i).trim(), d: s.slice(i + 1).trim()} : {t: s, d: ""}; });
  return el.value.trim();
}
// Agregar partido: ida y vuelta o partido único (cambia el formulario sin perder lo que ya escribiste)
$("#adminRoot").addEventListener("click", e => {
  const t = e.target.closest("[data-nm-type]"); if (!t) return;
  S.adm.nmType = t.dataset.nmType; const iv = S.adm.nmType !== "single";
  t.parentElement.querySelectorAll("button").forEach(b => { b.classList.toggle("on", b === t); b.setAttribute("aria-pressed", b === t); });
  const set = (id, fn) => { const el = $(id); if (el) fn(el); };
  set("#nmDate2W", el => { el.hidden = !iv; }); set("#nmDateL", el => { el.textContent = iv ? "Día y hora de la ida" : "Día y hora"; });
  set("#nmGo", el => { el.textContent = iv ? "Agregar ida y vuelta" : "Agregar partido"; });
  set("#nmNote", el => { el.textContent = iv ? "Se crean los dos partidos de la fecha: la ida (A vs B) y la vuelta (B vs A). Cada uno tiene sus propias stats y cada capitán elige el mapa de uno de los dos." : "Se crea un solo partido."; });
});
$("#adminRoot").addEventListener("change", async e => {
  const el = e.target.closest("[data-bind]");
  if (!el) {
    if (e.target.id === "qMatch") { S.adm.quickMatch = e.target.value; renderAdminSoon(); }
    if (e.target.dataset && e.target.dataset.logo && e.target.files[0]) { teamLogoUpload(e.target.dataset.logo, e.target.files[0]); e.target.value = ""; }
    if (e.target.dataset && e.target.dataset.prizeimg && e.target.files[0]) { prizeImgUpload(e.target.dataset.prizeimg, e.target.files[0]); e.target.value = ""; }
    if (e.target.id === "npImg" && e.target.files[0]) { imageFromFile(e.target.files[0], 640, false).then(d => { S.adm.np.img = d; const pv = $("#npPrev"); if (pv) pv.innerHTML = `<img src="${d}" alt="">`; }).catch(er => { toast(er.message); e.target.value = ""; }); }
    if (e.target.id === "ntLogo" && e.target.files[0]) { logoFromFile(e.target.files[0]).then(d => { S.adm.nt.logo = d; const pv = $("#ntPrev"); if (pv) pv.src = d; }).catch(er => { toast(er.message); e.target.value = ""; }); }
    if (e.target.id === "impFile" && e.target.files[0]) { const r = new FileReader(); r.onload = () => { const ta = $("#impCsv"); if (ta) ta.value = r.result; }; r.readAsText(e.target.files[0]); }
    return;
  }
  const [kind, ...p] = el.dataset.bind.split(":"), v = readVal(el);
  if (!S.staff) return;
  if (kind === "player" && p[1] === "value" && v != null && !(v >= CAP_VAL_MIN && v <= CAP_VAL_MAX)) { toast(`El valor va de ${fmt(CAP_VAL_MIN)} a ${fmt(CAP_VAL_MAX)}.`); renderAdminSoon(); return; }
  if (kind === "player" && p[1] === "clause" && !(v >= 0 && v <= CAP_CLAUSE_MAX)) { toast(`La cláusula va de 0 a ${fmt(CAP_CLAUSE_MAX)}.`); renderAdminSoon(); return; }
  if (kind === "acc") { await accountBind(p, v); return; }
  if (kind === "tbl") { await tblBind(p[0], p[1], v); return; }
  if (kind === "prize") { await prizeBind(p[0], p[1], v); return; }
  if (kind === "rd") { const r = clone(S.remote.redeems[p[0]]); if (!r) return; r.delivered = !!v; await save(`redeems/${p[0]}`, r); audit(`Canje de ${r.prize} para ${r.player}: ${v ? "marcado como entregado" : "marcado como no entregado"}`); return; }
  if (kind === "cap") { await capBind(p, v); return; }
  if (kind === "cfg" && !isUltra() && !/^(windowOpen|windowClose|maxSign|rosterMin|rosterMax)$/.test(p[0])) { toast("Esto lo puede cambiar solo ultra staff."); return; }
  if (kind === "cfg" && p[0] === "discord" && v && !DISCORD_RE.test(v)) { toast("Ese link no es una invitación de Discord (tiene que empezar con https://discord.gg/)."); renderAdminSoon(); return; }
  if (kind === "cfg" && p[0] === "payLink" && v && !/^https:\/\/[^\s"'<>]{6,300}$/.test(v)) { toast("El link de pago tiene que empezar con https://"); renderAdminSoon(); return; }
  if (kind === "cfg" && p[0] === "results.aiDaily" && !(v >= 1 && v <= 200)) { toast("Entre 1 y 200 lecturas por día."); renderAdminSoon(); return; }
  if (kind === "player" && (p[1] === "ign" || p[1] === "discord")) { const d = playerDoc(p[0]); if (!d) return; d[p[1]] = String(v || "").slice(0, 40); await save(`players/${p[0]}`, d); audit(`Cambió ${p[1] === "ign" ? "el Riot ID" : "el Discord"} de ${d.name}: ${v || "(vacío)"}`); return; }
  const desc = describeBind(kind, p, v);
  try {
    if (kind === "cfg") { const d = cfgDoc(); setPath(d, p[0], v); await save("league/config", d); }
    else if (kind === "team") { const d = teamDoc(p[0]); setPath(d, p[1], v); await save(`teams/${p[0]}`, d); }
    else if (kind === "player") { const d = playerDoc(p[0]); if (!d) return; if (p[1] === "name" && !v) { toast("El nombre no puede quedar vacío."); return; } setPath(d, p[1], v); await save(`players/${p[0]}`, d); }
    else if (kind === "match") {
      const d = matchDoc(p[0]); if (!d) return; setPath(d, p[1], v);
      if (p[1] === "status" && v === "played") { if (d.ra == null) d.ra = 13; if (d.rb == null) d.rb = 0; }
      if (p[1] === "noShow" && v) { d.status = "played"; d.ot = false; if (v === "a") { d.ra = 0; d.rb = 13; } else { d.ra = 13; d.rb = 0; } }
      if ((p[1] === "ra" || p[1] === "rb") && d.ra != null && d.rb != null && d.status !== "played") d.status = "played";
      await save(`matches/${p[0]}`, d);
      if (d.status === "played") await lockPickedMaps(p[0], d);
    }
    else if (kind === "stat") { const [mid, pid, f] = p, d = matchDoc(mid); if (!d) return; d.stats = d.stats || {}; const cur = d.stats[pid] || {t: teamFor(pid, d), k: 0, d: 0, a: 0, acs: 0}; cur[f] = v; d.stats[pid] = cur; await save(`matches/${mid}`, d); }
    else if (kind === "stplay") { const [mid, pid] = p, d = matchDoc(mid); if (!d) return; d.stats = d.stats || {}; if (v) d.stats[pid] = d.stats[pid] || {t: teamFor(pid, d), k: 0, d: 0, a: 0, acs: 0}; else delete d.stats[pid]; await save(`matches/${mid}`, d); renderAdminSoon(); }
    else if (kind === "map") { const d = cfgDoc(), i = +p[0]; if (!d.maps[i]) return;
      if (p[1] === "n") { const old = d.maps[i].n; if (!v) return; d.maps[i].n = v; await save("league/config", d); for (const k of TEAM_KEYS) { const t = teamDoc(k); if (t.used.includes(old)) { t.used = t.used.map(x => x === old ? v : x); await save(`teams/${k}`, t); } } }
      else { d.maps[i].on = v; await save("league/config", d); } }
    else if (kind === "used") { const [k, map] = p, d = teamDoc(k), set = new Set(d.used); v ? set.add(map) : set.delete(map); d.used = [...set]; await save(`teams/${k}`, d); renderAdminSoon(); }
    else if (kind === "skill") { const [pid, k] = p, d = clone(perfOf(pid)) || {}; d.skills = d.skills || {}; if (v == null) delete d.skills[k]; else d.skills[k] = clamp(v, 1, 10); await save(`perf/${pid}`, d); }
    else if (kind === "rep") { const [uid, rid, f] = p, doc = clone(S.remote.reports[uid]); if (!doc) return; const it = doc.items.find(x => x.id === rid); if (!it) return; it[f] = v; await save(`reports/${uid}`, doc); }
    if (desc) audit(desc);
  } catch (er) {}
});
// Pasa a "descartado" (público) el mapa que eligió cada capitán para ese partido.
async function lockPickedMaps(mid, m) {
  const all = Object.values(S.remote.mappicks).filter(p => p && p.matchId === mid);
  for (const k of [m.a, m.b]) {
    const pk = all.find(p => p.team === k); if (!pk || !pk.map || !RM().teams[k]) continue;
    const t = teamDoc(k); t.picked = t.picked || {}; if (t.picked[mid] === pk.map) continue;
    t.picked[mid] = pk.map; await save(`teams/${k}`, t);
  }
}
function teamFor(pid, m) { const p = S.remote.players[pid]; return p && (p.team === m.a || p.team === m.b) ? p.team : m.a; }
function renderAdminSoon() { setTimeout(() => { S.adm.dirty = true; const ae = document.activeElement; if (ae && $("#adminRoot").contains(ae)) ae.blur(); renderAdmin(); }, 60); }
function arm(el) {
  if (el.dataset.armed === "1") return true;
  el.dataset.armed = "1"; const t = el.textContent; el.textContent = "¿Seguro? Tocá de nuevo"; el.classList.add("armed");
  setTimeout(() => { if (el.isConnected) { el.dataset.armed = ""; el.textContent = t; el.classList.remove("armed"); } }, 3200);
  return false;
}

/* ---- admin: botones ---- */
$("#adminRoot").addEventListener("click", async e => {
  try { await adminClick(e); } catch (er) { if (er && er.message && !er.code) toast(er.message); }
});
async function adminClick(e) {
  if (e.target.classList.contains("adm")) { S.adm.open = false; renderAdmin(); return; }
  const b = e.target.closest("[data-act]"); if (!b) return;
  const [act, ...a] = b.dataset.act.split(":"); const R = RM();
  if (!S.staff) { S.adm.open = false; renderAdmin(); return; }
  if (ULTRA_ACTS.has(act) && !isUltra()) { toast("Esto lo puede hacer solo ultra staff."); return; }
  if (await extAdminAct(act, a, b)) return;
  try {
    if (act.startsWith("bot-")) { await botAction(act, a, b); }
    else if (act === "close") { S.adm.open = false; renderAdmin(); }
    else if (act === "logout") { logout(); }
    else if (act === "copy-pw") { const t = S.adm.newPw ? `${S.adm.newPw.u} / ${S.adm.newPw.p}` : ""; try { await navigator.clipboard.writeText(t); toast("Copiado."); } catch (er) { toast("No se pudo copiar: seleccioná el texto y copialo a mano."); } }
    else if (act === "acc-add" || act === "acc-reset" || act === "acc-del") { await accountAction(act, a[0], b); }
    else if (act === "tab") { S.adm.tab = a[0]; S.adm.newPw = null; S.adm.impRes = null; renderAdmin(); $(".adm-body").scrollTop = 0; }
    else if (act.startsWith("team-") || act === "logo-del") { await teamAction(act, a[0], b); }
    else if (act.startsWith("cj-")) { await canjeAction(act, a[0], b); }
    else if (act.startsWith("coach-")) { await coachAction(act, a, b); }
    else if (act === "topup") { await topupTeam(a[0], b); }
    else if (act === "tbl-form") {
      const [k, i] = a, d = teamDoc(k); d.adj = Object.assign({}, ADJ0, d.adj || {}); const f = [0, 1, 2, 3, 4].map(j => (d.adj.form || [])[j] || "");
      f[+i] = FORM_CYCLE[(FORM_CYCLE.indexOf(f[+i]) + 1) % FORM_CYCLE.length];
      while (f.length && !f[f.length - 1]) f.pop(); d.adj.form = f.map(x => x || "");
      await save(`teams/${k}`, d); audit(`Tabla · ${R.teams[k].name} · forma manual: ${d.adj.form.filter(Boolean).map(x => FORM_LBL[x]).join(" ") || "vacía"}`); renderAdminSoon();
    }
    else if (act === "tbl-reset") {
      if (!arm(b)) return; const k = a[0], d = teamDoc(k); d.adj = clone(ADJ0); await save(`teams/${k}`, d);
      audit(`Tabla · ${R.teams[k].name}: borró los cambios manuales (queda solo lo de los partidos)`); toast(`${R.teams[k].name}: quedó solo lo de los partidos.`); renderAdminSoon();
    }
    else if (act === "rteam") { S.adm.rTeam = a[0]; renderAdmin(); }
    else if (act === "mpf") { S.adm.mpF = +a[0]; renderAdmin(); }
    else if (act === "mp-clear") {
      if (!arm(b)) return; const f = +a[0], k = a[1], pk = pickOf(f, k); if (!pk) return;
      await save(`mappicks/f${f}_${k}`, null, "del"); const cl = claimOf(pk.matchId); if (cl && cl.team === k) await save(`mapclaims/${pk.matchId}`, null, "del");
      audit(`Mapas · Fecha ${f} · liberó la elección de ${R.teams[k] ? R.teams[k].name : k} (${pk.map})`); toast("Listo: ese partido quedó libre."); renderAdminSoon();
    }
    else if (act === "rview") { S.adm.rView = a[0]; renderAdmin(); }
    else if (act === "rq-filter") { S.adm.rqAll = a[0] === "all"; renderAdmin(); }
    else if (act === "rq-ok" || act === "rq-no") { await reviewRequest(a[0], act === "rq-ok"); renderAdminSoon(); }
    else if (act === "att") {
      const [pid, f] = a, d = clone(perfOf(pid)) || {}; d.att = d.att || {};
      const next = ATT_CYCLE[(ATT_CYCLE.indexOf(d.att[f] || "") + 1) % ATT_CYCLE.length];
      if (next) d.att[f] = next; else delete d.att[f];
      S.remote.perf = {...S.remote.perf, [pid]: d}; renderAdmin();
      await save(`perf/${pid}`, d); audit(`Asistencia de ${(R.players[pid] || {}).name} en la fecha ${f}: ${ATT[next] || "sin cargar"}`);
    }
    else if (act === "att-all") {
      const f = a[0]; let n = 0;
      const ps = Object.entries(R.players).filter(([, p]) => p.team && (S.adm.rTeam === "all" || p.team === S.adm.rTeam));
      for (const [pid] of ps) { const d = clone(perfOf(pid)) || {}; d.att = d.att || {}; if (!d.att[f]) { d.att[f] = "P"; n++; await save(`perf/${pid}`, d); } }
      audit(`Marcó presentes a ${n} jugadores en la fecha ${f}${S.adm.rTeam !== "all" ? " (" + R.teams[S.adm.rTeam].name + ")" : ""}`); toast(`${n} jugadores marcados presentes en la fecha ${f}.`); renderAdminSoon();
    }
    else if (act === "pts-add") {
      const pid = $("#ptP").value, v = Math.round(+$("#ptV").value || 0), why = $("#ptW").value.trim(), f = $("#ptF").value;
      if (!pid) { toast("Elegí un jugador."); return; } if (!v) { toast("Poné una cantidad de puntos distinta de cero."); return; } if (!why) { toast("Escribí el motivo."); return; }
      const d = clone(perfOf(pid)) || {}; d.pts = d.pts || []; d.pts.push({id: newId("x"), v, why: why.slice(0, 80), f: f ? +f : null, at: Date.now(), by: S.staff.u});
      await save(`perf/${pid}`, d); audit(`${v > 0 ? "Sumó" : "Restó"} ${Math.abs(v)} puntos individuales a ${R.players[pid].name}: ${why}`);
      toast(`${R.players[pid].name}: ${v > 0 ? "+" : ""}${v} puntos.`); renderAdminSoon();
    }
    else if (act === "pts-del") {
      if (!arm(b)) return; const [pid, xid] = a, d = clone(perfOf(pid)) || {}, x = (d.pts || []).find(y => y.id === xid); if (!x) return;
      d.pts = d.pts.filter(y => y.id !== xid); await save(`perf/${pid}`, d); audit(`Quitó ${x.v > 0 ? "+" : ""}${x.v} puntos individuales de ${(R.players[pid] || {}).name} (${x.why})`); renderAdminSoon();
    }
    else if (act === "cap-add") {
      const name = ($("#capNew").value || "").trim().toLowerCase().replace(/\s+/g, ""), team = $("#capNewTeam").value || null;
      if (!/^[a-z0-9._-]{3,24}$/.test(name)) { toast("El usuario tiene que tener entre 3 y 24 letras, números, punto, guion o guion bajo."); return; }
      toast("Creando la cuenta…"); const j = await staffApi({action: "create", u: name, role: "captain", team}); S.adm.newPw = {u: j.u, p: j.password}; renderAdminSoon();
    }
    else if (act === "cap-reset") { if (!arm(b)) return; const c = S.captainList[a[0]]; if (!c) return; const j = await staffApi({action: "reset", u: c.u}); S.adm.newPw = {u: c.u, p: j.password}; renderAdminSoon(); }
    else if (act === "cap-del") { if (!arm(b)) return; const c = S.captainList[a[0]]; if (!c) return; await staffApi({action: "delete", u: c.u}); toast(`Cuenta ${c.u} borrada.`); renderAdminSoon(); }
    else if (act === "acc-import") {
      const users = parseAccCsv($("#impCsv").value); if (!users.length) { toast("No hay cuentas para importar. Elegí el archivo o pegá el contenido."); return; }
      const bad = users.find(x => !/^[a-z0-9._-]{3,24}$/.test(x.u) || x.p.length < 6 || (x.team && !TEAM_KEYS.includes(x.team)));
      if (bad) { toast(`Revisá la fila de “${bad.u}”: usuario de 3 a 24 caracteres, contraseña de 6 o más y equipo válido.`); return; }
      toast(`Importando ${users.length} cuentas…`); b.disabled = true;
      try { const j = await staffApi({action: "import", users}); S.adm.impRes = j; toast(`${j.created.length} cuentas creadas.`); } finally { b.disabled = false; }
      renderAdminSoon();
    }
    else if (act === "stream") { S.adm.open = false; renderAdmin(); openStream(true); }
    else if (act === "m-open") { S.adm.openMatch = S.adm.openMatch === a[0] ? null : a[0]; renderAdmin(); }
    else if (act === "pteam") { S.adm.pTeam = a[0]; renderAdmin(); }
    else if (act === "m-add") {
      const f = +$("#nmF").value || 1, A = $("#nmA").value, B = $("#nmB").value, date = $("#nmDate").value, iv = S.adm.nmType !== "single";
      if (A === B) { toast("Elegí dos equipos distintos."); return; }
      const base = {fecha: f, status: "pending", ra: null, rb: null, ot: false, noShow: null, map: null, proj: null, mvp: null, stats: {}};
      const id = newId("m");
      if (!iv) { await save(`matches/${id}`, {...base, a: A, b: B, date, leg: null}); audit(`Creó el partido F${f}: ${R.teams[A].name} vs ${R.teams[B].name}`); toast("Partido agregado."); }
      else {
        const id2 = id + "v", date2 = ($("#nmDate2") || {}).value || "";
        await save(`matches/${id}`, {...base, a: A, b: B, date, leg: "ida"});
        await save(`matches/${id2}`, {...base, a: B, b: A, date: date2, leg: "vuelta"});
        audit(`Creó la ida y vuelta F${f}: ${R.teams[A].name} vs ${R.teams[B].name}`); toast("Ida y vuelta agregadas: 2 partidos.");
      }
      S.adm.openMatch = id; renderAdminSoon();
    }
    else if (act === "fixture-gen") {
      const iv = S.adm.nmType !== "single", base = {date: "", status: "pending", ra: null, rb: null, ot: false, noShow: null, map: null, proj: null, mvp: null, stats: {}};
      const fd0 = roundRobin(TEAM_KEYS); let n = 0;
      for (const [f, fd] of fd0.entries()) for (const [i, [A, B]] of fd.ms.entries()) {
        await save(`matches/f${f + 1}m${i}`, {...base, fecha: f + 1, a: A, b: B, leg: iv ? "ida" : null}); n++;
        if (iv) { await save(`matches/f${f + 1}m${i}v`, {...base, fecha: f + 1, a: B, b: A, leg: "vuelta"}); n++; }
      }
      toast(`Fixture creado: ${n} partidos en ${fd0.length} fechas${iv ? " (ida y vuelta)" : ""}.`); audit(`Generó el fixture todos contra todos${iv ? " ida y vuelta" : ""} (${n} partidos)`); renderAdminSoon();
    }
    else if (act === "fx-open") { openFixtureGen(); }
    else if (act === "fecha-del") { await deleteFechas([+a[0]]); }
    else if (act === "fecha-del-all") { await deleteFechas(null); }
    else if (act === "m-del") { if (!arm(b)) return; const md = S.remote.matches[a[0]]; await save(`matches/${a[0]}`, null, "del"); if (md) audit(`Borró el partido ${matchLabel(R, md)}${md.status === "played" ? ` (${md.ra}-${md.rb})` : ""}`); S.adm.openMatch = null; toast("Partido borrado."); renderAdminSoon(); }
    else if (act === "credit") {
      const f = +a[0], Dr = deriveFor(R), C = R.cfg.coin, add = Object.fromEntries(TEAM_KEYS.map(k => [k, 0]));
      Dr.played.filter(m => m.fecha === f).forEach(m => { const aw = +m.ra > +m.rb, W = aw ? m.a : m.b, L = aw ? m.b : m.a; add[W] += m.ot ? C.otw : C.w; if (m.ot) add[L] += C.otl;
        if (m.mvpId && m.stats[m.mvpId]) add[m.stats[m.mvpId].t] += C.mvp; });
      for (const k of TEAM_KEYS) if (add[k]) { const t = teamDoc(k); t.coins = (+t.coins || 0) + add[k]; await save(`teams/${k}`, t); }
      const d = cfgDoc(); d.credited = [...new Set([...d.credited, f])]; await save("league/config", d);
      audit(`Acreditó coins de la fecha ${f}: ${TEAM_KEYS.filter(k => add[k]).map(k => R.teams[k].name + " +" + add[k]).join(", ") || "sin cambios"}`);
      toast(`Coins de la fecha ${f} acreditados.`); renderAdminSoon();
    }
    else if (act === "quick-save") {
      const mid = $("#qMatch").value, pid = $("#qPlayer").value; if (!mid || !pid) { toast("Elegí partido y jugador."); return; }
      const d = matchDoc(mid); d.stats = d.stats || {};
      d.stats[pid] = {t: teamFor(pid, d), k: +$("#qK").value || 0, d: +$("#qD").value || 0, a: +$("#qA").value || 0, acs: +$("#qACS").value || 0};
      await save(`matches/${mid}`, d); S.adm.quickMatch = mid;
      audit(`Stats de ${R.players[pid].name} en ${matchLabel(R, d)}: ${d.stats[pid].k} kills, ${d.stats[pid].d} muertes, ${d.stats[pid].a} asistencias, ${d.stats[pid].acs} ACS`);
      toast(`${R.players[pid].name}: ${d.stats[pid].k} kills, ${d.stats[pid].d} muertes, ${d.stats[pid].a} asistencias${d.status !== "played" ? ". Ojo: el partido sigue pendiente." : "."}`); renderAdminSoon();
    }
    else if (act === "p-add") {
      const name = $("#npName").value.trim(); if (!name) { toast("Escribí el nombre del jugador."); return; }
      const ign = normRiot(($("#npIgn") || {}).value); if (ign && !riotOk(ign)) { toast("El Riot ID va como en Valorant: Nombre#TAG."); return; }
      await save(`players/${newId("p")}`, {name, team: $("#npTeam").value || null, role: $("#npRole").value, rank: $("#npRank").value.trim(), value: null, ...(ign ? {ign} : {})});
      toast(`${name} agregado.`); audit(`Agregó al jugador ${name} (${$("#npTeam").value ? R.teams[$("#npTeam").value].name : "agente libre"} · ${$("#npRole").value})`); renderAdminSoon();
    }
    else if (act === "p-bulk") {
      const names = $("#npBulk").value.split("\n").map(s => s.trim()).filter(Boolean); if (!names.length) { toast("Pegá al menos un nombre."); return; }
      const team = $("#npTeam").value || null, role = $("#npRole").value;
      for (const line of names) { const [nm, rid] = line.split(/\s*[,;\t|]\s*/), ign = normRiot(rid || (riotOk(nm) ? nm : "")); const name = (riotOk(nm) && !rid ? nm.split("#")[0] : nm).trim();
        await save(`players/${newId("p")}`, {name, team, role, rank: "", value: null, ...(riotOk(ign) ? {ign} : {})}); }
      toast(`${names.length} jugadores agregados.`); audit(`Agregó ${names.length} jugadores a ${team ? R.teams[team].name : "agentes libres"}: ${names.join(", ")}`); renderAdminSoon();
    }
    else if (act === "p-del") { if (!arm(b)) return; const pid = a[0]; const pn = (R.players[pid] || {}).name; await save(`players/${pid}`, null, "del"); audit(`Borró al jugador ${pn}`);
      for (const k of TEAM_KEYS) { const t = teamDoc(k); if (t.captain === pid || t.sub === pid) { if (t.captain === pid) t.captain = null; if (t.sub === pid) t.sub = null; await save(`teams/${k}`, t); } }
      toast("Jugador borrado. Sus estadísticas en partidos quedan guardadas pero no se muestran."); renderAdminSoon(); }
    else if (act === "window-new") { if (!arm(b)) return; const d = cfgDoc(); d.windowId = (+d.windowId || 1) + 1; d.windowOpen = true; await save("league/config", d); toast("Ventana nueva abierta: el cupo de fichajes vuelve a cero."); audit(`Abrió la ventana de fichajes N° ${d.windowId}`); renderAdminSoon(); }
    else if (act === "off-ok" || act === "off-no") {
      const [uid, oid] = a, doc = clone(S.remote.offers[uid]); const o = doc && doc.items.find(x => x.id === oid); if (!o) return;
      if (doc.team) o.team = doc.team;
      if (act === "off-ok") { if (!R.players[o.pid]) return; await doTransfer(o.pid, o.team, o.amt); o.status = "ok"; o.note = "Pase aprobado"; }
      else { o.status = "no"; o.note = "Rechazada por la organización"; }
      await save(`offers/${uid}`, doc); audit(`${act === "off-ok" ? "Aprobó" : "Rechazó"} la oferta de ${R.teams[o.team].name} por ${(R.players[o.pid] || {}).name || "jugador borrado"} (${fmt(o.amt)} coins)`); renderAdminSoon();
    }
    else if (act === "tr-manual") { const pid = $("#trP").value, to = $("#trTo").value || null, amt = +$("#trAmt").value || 0; if (!pid) return; if ((R.players[pid].team || null) === to) { toast("El jugador ya está en ese equipo."); return; } await doTransfer(pid, to, amt); renderAdminSoon(); }
    else if (act === "tr-del") { if (!arm(b)) return; const tr = S.remote.transfers[a[0]]; await save(`transfers/${a[0]}`, null, "del"); audit(`Borró el registro del fichaje de ${tr ? tr.name : "?"}`); renderAdminSoon(); }
    else if (act === "map-add") { const n = $("#newMap").value.trim(); if (!n) return; const d = cfgDoc(); if (d.maps.some(x => x.n.toLowerCase() === n.toLowerCase())) { toast("Ese mapa ya está."); return; } d.maps.push({n, on: true}); await save("league/config", d); audit(`Agregó el mapa ${n}`); renderAdminSoon(); }
    else if (act === "map-del") { if (!arm(b)) return; const d = cfgDoc(); const gone = d.maps.splice(+a[0], 1)[0]; await save("league/config", d); audit(`Quitó el mapa ${gone ? gone.n : "?"} del pool`); renderAdminSoon(); }
    else if (act === "used-reset") { if (!arm(b)) return; const t = teamDoc(a[0]); t.used = []; t.picked = {}; await save(`teams/${a[0]}`, t); toast(`Mapas de ${R.teams[a[0]].name} reiniciados.`); audit(`Reinició los mapas jugados de ${R.teams[a[0]].name}`); renderAdminSoon(); }
    else if (act === "used-reset-all") { if (!arm(b)) return; for (const k of TEAM_KEYS) { const t = teamDoc(k); t.used = []; t.picked = {}; await save(`teams/${k}`, t); } toast("Mapas de todos los equipos reiniciados."); audit("Reinició los mapas jugados de todos los equipos"); renderAdminSoon(); }
    else if (act === "draw-undo") { if (!arm(b)) return; await undoDraw(); renderAdminSoon(); }
    else if (act === "rep-apply") { const [uid, rid] = a, doc = clone(S.remote.reports[uid]); const r = doc.items.find(x => x.id === rid), p = R.players[r.pid]; if (!p || !p.team) return;
      const t = teamDoc(p.team); t.fp = Math.max(0, (+t.fp || 0) - (+r.fpDelta || 0)); await save(`teams/${p.team}`, t); r.applied = true; if (r.status === "recibida" || r.status === "revision") r.status = "resuelta"; await save(`reports/${uid}`, doc); toast("Sanción aplicada."); audit(`Aplicó una sanción de −${r.fpDelta} fair play a ${R.teams[p.team].name} (denuncia contra ${p.name})`); renderAdminSoon(); }
    else if (act === "ex-copy") { if (!arm(b)) return; await copyExample(); audit("Copió los datos de ejemplo a la liga"); renderAdminSoon(); }
    else if (act === "wipe-results") { if (!await dangerGate("Borrar todos los resultados", "<p>Todos los partidos vuelven a pendientes y se borran sus estadísticas.</p>")) return; for (const [id, m] of Object.entries(S.remote.matches)) await save(`matches/${id}`, {...clone(m), status: "pending", ra: null, rb: null, ot: false, noShow: null, map: null, mvp: null, stats: {}}); const d = cfgDoc(); d.credited = []; await save("league/config", d); toast("Resultados borrados."); audit("Borró todos los resultados y estadísticas"); renderAdminSoon(); }
    else if (act === "wipe-players") { if (!await dangerGate("Borrar todos los jugadores", "<p>Se borran todos los jugadores y los equipos quedan sin capitán ni subcapitán.</p>")) return; for (const id of Object.keys(S.remote.players)) await save(`players/${id}`, null, "del"); for (const k of TEAM_KEYS) { const t = teamDoc(k); t.captain = null; t.sub = null; await save(`teams/${k}`, t); } toast("Jugadores borrados."); audit("Borró todos los jugadores"); renderAdminSoon(); }
    else if (act === "wipe-market") { if (!await dangerGate("Borrar ofertas y fichajes", "<p>Se borran todos los fichajes y se vacían las ofertas.</p>")) return; for (const id of Object.keys(S.remote.transfers)) await save(`transfers/${id}`, null, "del"); for (const id of Object.keys(S.remote.offers)) await save(`offers/${id}`, {items: []}); toast("Ofertas y fichajes borrados."); audit("Borró todas las ofertas y fichajes"); renderAdminSoon(); }
  } catch (er) { if (er && er.message && !er.code) toast(er.message); }
}
async function reviewRequest(id, ok) {
  const r = S.requests[id], R = RM(); if (!r || r.status !== "pend") return;
  if (r.type === "coachreg") { await reviewCoachReg(id, ok); return; }
  if (r.type === "link") { try { await api("/api/member", {action: "approve", id, ok}); toast(ok ? "Cuenta vinculada." : "Pedido rechazado."); } catch (er) { toast(er.message); } return; }
  const note = (($(`#rqNote-${id}`) || {}).value || "").trim().slice(0, 200);
  const plain = reqText(R, r).replace(/<[^>]+>/g, "");
  if (ok && (r.type === "coach" || r.type === "coachOut")) {
    const c = clone((S.remote.coaches || {})[r.coach]); if (!c) { toast("Ese coach ya no existe. Rechazá la solicitud."); return; }
    c.teams = c.teams || {};
    if (r.type === "coach") { if (!c.teams[r.team]) c.teams[r.team] = {since: Date.now(), by: S.staff.u}; } else delete c.teams[r.team];
    await save(`coaches/${r.coach}`, c);
  } else if (ok) {
    if (r.type === "add") {
      await save(`players/${newId("p")}`, {name: r.name, team: r.team, role: ROLES.includes(r.role) ? r.role : "Flex", rank: r.rank || "", value: +r.value, clause: +r.clause || 0, ...(riotOk(r.ign) ? {ign: normRiot(r.ign)} : {})});
    } else {
      const d = playerDoc(r.pid);
      if (!d) { toast("Ese jugador ya no existe. Rechazá la solicitud."); return; }
      if (d.team !== r.team) { toast(`${d.name} ya no está en ${TM(r.team).name}. Rechazá la solicitud.`); return; }
      d.value = +r.value; d.clause = +r.clause || 0; await save(`players/${r.pid}`, d);
    }
  }
  await save(`requests/${id}`, {...clone(r), status: ok ? "ok" : "no", note, reviewedBy: S.staff.u, reviewedAt: Date.now()});
  audit(`${ok ? "Aprobó" : "Rechazó"} la solicitud de ${r.u}: ${plain}${note ? ` (nota: ${note})` : ""}`);
  toast(ok ? "Solicitud aprobada." : "Solicitud rechazada.", r.team);
}
async function doTransfer(pid, to, amt) {
  const R = RM(), p = clone(S.remote.players[pid]), from = p.team || null; to = to || null;
  p.team = to; await save(`players/${pid}`, p);
  if (to && amt) { const t = teamDoc(to); t.coins = (+t.coins || 0) - amt; await save(`teams/${to}`, t); }
  if (from) { const f = teamDoc(from); if (amt) f.coins = (+f.coins || 0) + amt; if (f.captain === pid) f.captain = null; if (f.sub === pid) f.sub = null; await save(`teams/${from}`, f); }
  await save(`transfers/${newId("t")}`, {pid, name: p.name, from, to, amt, at: Date.now(), win: R.cfg.windowId});
  audit(`Pase: ${p.name} de ${from ? R.teams[from].name : "agente libre"} a ${to ? R.teams[to].name : "agente libre"} por ${fmt(amt)} coins`);
  toast(`Pase hecho: ${p.name} → ${to ? R.teams[to].name : "agente libre"}`, to || from); if (to) confetti([R.teams[to].c, R.teams[to].l, "#ffcb52"]);
}
async function copyExample() {
  const E = example(); let n = 0; toast("Copiando datos de ejemplo…");
  for (const [id, p] of Object.entries(E.players)) { await save(`players/${id}`, p); n++; }
  for (const [id, m] of Object.entries(E.matches)) { await save(`matches/${id}`, m); n++; }
  for (const t of E.transfers) { const {id, ...rest} = t; await save(`transfers/${id}`, {...rest, win: 1}); n++; }
  for (const k of TEAM_KEYS) { const t = teamDoc(k); Object.assign(t, clone(E.teams[k])); await save(`teams/${k}`, t); n++; }
  toast(`Listo: ${n} registros copiados. Ya podés editarlos.`);
}

/* ================= MODO STREAMER ================= */
const ST = {open: false, admin: false, sel: {mid: "", a: TEAM_KEYS[0], b: TEAM_KEYS[1]}, chroma: store.get("chroma", false), sound: store.get("sound", true), clean: false, spinning: false, revealing: null, shown: null, struck: null};
let audio = null;
function tick(freq = 1400, dur = .03, vol = .08) {
  if (!ST.sound) return;
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); const o = audio.createOscillator(), g = audio.createGain(); o.type = "square"; o.frequency.value = freq; g.gain.value = vol; g.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + dur); o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur); } catch (e) {}
}
function chord() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tick(f, .5, .06), i * 70)); }
function streamMatches() { const Dr = deriveFor(RM()); return Dr.ms.filter(m => m.a && m.b && m.a !== m.b && (m.status !== "played" || !m.map)); }
function openStream(admin) {
  if (admin && !S.staff) { openLogin(() => openStream(true)); return; }
  ST.open = true; ST.admin = admin && !!S.staff; ST.clean = false; ST.struck = null;
  if (ST.admin) { const list = streamMatches(); const first = list.find(m => !m.map) || list[0]; if (first && !ST.sel.mid) ST.sel = {mid: first.id, a: first.a, b: first.b}; }
  else { const L = S.remote.live; ST.shown = L && !L.undo && L.map ? L : null; }
  $("#stream").hidden = false; $("#stream").classList.toggle("chroma", ST.chroma); $("#stream").classList.remove("clean");
  document.body.style.overflow = "hidden";
  renderStage(); renderCtrl(); fitStage();
}
function closeStream() { ST.open = false; $("#stream").hidden = true; document.body.style.overflow = ""; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
function fitStage() {
  if (!ST.open) return;
  const ch = ST.clean ? 0 : ($("#stCtrl").offsetHeight || 0), avH = innerHeight - ch, s = Math.min(innerWidth / 1600, avH / 900);
  $("#stage").style.transform = `translate(-50%,-50%) scale(${s})`; $("#stage").style.top = (avH / 2) + "px";
}
addEventListener("resize", fitStage);
function stageTeams() {
  if (ST.admin) return [ST.sel.a, ST.sel.b];
  const L = ST.shown || S.remote.live; return L && L.a ? [L.a, L.b] : [TEAM_KEYS[0], TEAM_KEYS[1]];
}
function renderStage() {
  const R = model(true), [a, b] = stageTeams(), A = R.teams[a], B = R.teams[b];
  const st = $("#stage"); st.style.setProperty("--ca", A.c); st.style.setProperty("--cb", B.c);
  const on = R.cfg.maps.filter(x => x.on !== false).map(x => x.n);
  const usedOf = t => { let u = [...t.used]; if (ST.revealing && (t.k === ST.revealing.a || t.k === ST.revealing.b)) u = u.filter(x => x !== ST.revealing.map); return u; };
  const left = t => on.filter(n => !usedOf(t).includes(n)).length;
  const m = ST.admin ? R.matches[ST.sel.mid] : null, L = ST.shown;
  $("#stFecha").textContent = m ? `FECHA ${m.fecha}` : L && L.fecha ? `FECHA ${L.fecha}` : "PARTIDO";
  const team = (k, t) => `<img src="${EMB[k]}" alt=""><div class="nm" style="--tc:${t.c};--tl:${t.l}">${esc(t.name)}</div><div class="left">Le quedan ${left(t)} mapas</div>`;
  $("#stA").innerHTML = team(a, A); $("#stA").style.setProperty("--tc", A.c);
  $("#stB").innerHTML = team(b, B); $("#stB").style.setProperty("--tc", B.c);
  const chips = t => `<div class="st-pool"><img src="${EMB[t.k]}" alt=""><div class="st-chips">${R.cfg.maps.filter(x => x.on !== false).map(x => { const u = usedOf(t).includes(x.n); const strike = ST.struck && ST.struck.map === x.n && (ST.struck.a === t.k || ST.struck.b === t.k);
    return `<span class="st-chip ${u ? "used" : ""} ${strike ? "strike" : ""}" style="--mc:${mapColor(x.n)}">${esc(x.n)}</span>`; }).join("")}</div></div>`;
  $("#stPools").innerHTML = chips(A) + chips(B);
  if (!ST.spinning) {
    const res = ST.admin ? (m && m.map ? {map: m.map} : (ST.struck && ST.struck.a === a && ST.struck.b === b ? {map: ST.struck.map} : null)) : ST.shown;
    if (res && res.map) { showFinal(res.map); $("#stResult").textContent = `SE JUEGA EN ${res.map.toUpperCase()}`; $("#stResult").classList.add("show"); }
    else { $("#reelStrip").innerHTML = ""; $("#reelIdle").hidden = false; $("#reelIdle").textContent = ST.admin ? "LISTO PARA SORTEAR" : "ESPERANDO EL SORTEO"; $("#stResult").classList.remove("show"); }
    const common = on.filter(n => !usedOf(A).includes(n) && !usedOf(B).includes(n)).length;
    $("#stMsg").textContent = ST.admin && !(m && m.map) && !common ? "No quedan mapas que los dos equipos puedan jugar. Reiniciá los mapas de alguno desde el panel." : "";
  }
}
function showFinal(map) {
  $("#reelIdle").hidden = true;
  $("#reelStrip").innerHTML = `<div class="rcard" style="--mc:${mapColor(map)};transform:scale(1)"><b>${esc(map.toUpperCase())}</b></div>`;
  $("#reelStrip").style.transform = `translateY(130px)`;
}
function renderCtrl() {
  const c = $("#stCtrl"), R = RM();
  if (ST.admin) {
    const list = streamMatches();
    c.innerHTML = `<select id="stMatch" aria-label="Partido">${list.map(m => opt(m.id, `${matchLabel(R, m)}${m.map ? " · " + m.map : ""}`, m.id === ST.sel.mid)).join("")}${opt("", "Elegir equipos a mano", !ST.sel.mid)}</select>
      ${!ST.sel.mid ? `<select id="stA2" aria-label="Equipo A">${teamOpts(ST.sel.a)}</select><select id="stB2" aria-label="Equipo B">${teamOpts(ST.sel.b)}</select>` : ""}
      <button class="btn gold" id="stDraw">Sortear mapa</button><button class="btn sm ghost" id="stUndo">Deshacer último</button>
      <button class="btn sm ghost" id="stChroma">${ST.chroma ? "Fondo oscuro" : "Fondo verde (OBS)"}</button><button class="btn sm ghost" id="stSound">${ST.sound ? "Sonido: sí" : "Sonido: no"}</button>
      <button class="btn sm ghost" id="stClean">Ocultar controles</button><button class="btn sm ghost" id="stFull">Pantalla completa</button><button class="btn sm ghost" id="stClose">Cerrar</button>
      <span class="hint">Espacio: sortear · H: controles · F: pantalla completa · Esc: cerrar</span>`;
  } else {
    c.innerHTML = `<button class="btn sm ghost" id="stChroma">${ST.chroma ? "Fondo oscuro" : "Fondo verde"}</button><button class="btn sm ghost" id="stSound">${ST.sound ? "Sonido: sí" : "Sonido: no"}</button><button class="btn sm ghost" id="stClean">Ocultar controles</button><button class="btn sm ghost" id="stFull">Pantalla completa</button><button class="btn sm ghost" id="stClose">Cerrar</button><span class="hint">Se actualiza solo cuando el admin sortea.</span>`;
  }
  fitStage();
}
$("#stCtrl").addEventListener("change", e => {
  if (e.target.id === "stMatch") { const m = RM().matches[e.target.value]; ST.sel = m ? {mid: e.target.value, a: m.a, b: m.b} : {mid: "", a: ST.sel.a, b: ST.sel.b}; ST.struck = null; renderCtrl(); renderStage(); }
  if (e.target.id === "stA2") { ST.sel.a = e.target.value; renderStage(); }
  if (e.target.id === "stB2") { ST.sel.b = e.target.value; renderStage(); }
});
$("#stCtrl").addEventListener("click", e => {
  const id = e.target.closest("button") && e.target.closest("button").id;
  if (id === "stDraw") adminDraw();
  else if (id === "stUndo") { const b = e.target.closest("button"); if (arm(b)) undoDraw(); }
  else if (id === "stChroma") { ST.chroma = !ST.chroma; store.set("chroma", ST.chroma); $("#stream").classList.toggle("chroma", ST.chroma); renderCtrl(); }
  else if (id === "stSound") { ST.sound = !ST.sound; store.set("sound", ST.sound); if (ST.sound) tick(); renderCtrl(); }
  else if (id === "stClean") toggleClean();
  else if (id === "stFull") toggleFull();
  else if (id === "stClose") closeStream();
});
function toggleClean() { ST.clean = !ST.clean; $("#stream").classList.toggle("clean", ST.clean); fitStage(); if (ST.clean) toast("Controles ocultos. Tocá H para mostrarlos."); }
function toggleFull() { const el = $("#stream"); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); else if (el.requestFullscreen) el.requestFullscreen().then(() => setTimeout(fitStage, 100)).catch(() => toast("Este navegador no deja usar pantalla completa acá.")); }
document.addEventListener("fullscreenchange", () => setTimeout(fitStage, 120));
addEventListener("keydown", e => {
  if (!ST.open) return;
  if (e.target.matches && e.target.matches("input,select,textarea")) return;
  if (e.code === "Space" && ST.admin) { e.preventDefault(); adminDraw(); }
  else if (e.key === "h" || e.key === "H") toggleClean();
  else if (e.key === "f" || e.key === "F") toggleFull();
  else if (e.key === "Escape") { if (ST.clean) toggleClean(); else closeStream(); }
});
$("#stage").addEventListener("dblclick", () => { if (ST.clean) toggleClean(); });

async function adminDraw() {
  if (ST.spinning || !S.staff) return;
  const R = RM(), {mid, a, b} = ST.sel; if (!a || !b || a === b) { toast("Elegí dos equipos distintos."); return; }
  const m = mid ? R.matches[mid] : null, A = R.teams[a], B = R.teams[b];
  const on = R.cfg.maps.filter(x => x.on !== false).map(x => x.n);
  const old = m && m.map ? m.map : null;
  if (old && !ST.redrawOk) { ST.redrawOk = true; setTimeout(() => ST.redrawOk = false, 5000); toast(`Este partido ya tiene mapa (${old}). Tocá Sortear otra vez para volver a sortear; ${old} vuelve al pool.`); return; }
  ST.redrawOk = false;
  const ua = A.used.filter(x => x !== old), ub = B.used.filter(x => x !== old);
  const pool = on.filter(n => !ua.includes(n) && !ub.includes(n));
  if (!pool.length) { $("#stMsg").textContent = "No quedan mapas que los dos equipos puedan jugar. Reiniciá los mapas de alguno desde el panel."; tick(200, .3); return; }
  const buf = new Uint32Array(1); crypto.getRandomValues(buf);
  const map = pool[buf[0] % pool.length];
  const live = {seq: ((S.remote.live && S.remote.live.seq) || 0) + 1, matchId: mid || null, a, b, map, pool, at: Date.now(), fecha: m ? m.fecha : null};
  if (!S.db) { spin(live); return; }
  try {
    await save("live/draw", live);
    const ta = teamDoc(a), tb = teamDoc(b);
    ta.used = [...new Set([...ta.used.filter(x => x !== old), map])]; tb.used = [...new Set([...tb.used.filter(x => x !== old), map])];
    await save(`teams/${a}`, ta); await save(`teams/${b}`, tb);
    if (m) { const d = matchDoc(mid); d.map = map; await save(`matches/${mid}`, d); }
    if (old) { const prev = Object.entries(S.remote.draws).filter(([, d]) => d.matchId === mid && d.map === old); for (const [id] of prev) await save(`draws/${id}`, null, "del"); }
    await save(`draws/${newId("d")}`, {matchId: mid || null, a, b, map, pool, at: live.at, fecha: live.fecha, seq: live.seq});
    audit(`Sorteó el mapa ${map} para ${A.name} vs ${B.name}${m ? " (fecha " + m.fecha + ")" : ""}${old ? ` (antes era ${old})` : ""}`);
  } catch (e) {}
}
async function undoDraw() {
  const last = Object.entries(S.remote.draws).map(([id, d]) => ({id, ...d})).sort((x, y) => (y.at || 0) - (x.at || 0))[0];
  if (!last) { toast("No hay sorteos para deshacer."); return; }
  for (const k of [last.a, last.b]) { const t = teamDoc(k); t.used = t.used.filter(x => x !== last.map); await save(`teams/${k}`, t); }
  if (last.matchId && S.remote.matches[last.matchId]) { const d = matchDoc(last.matchId); if (d.map === last.map) { d.map = null; await save(`matches/${last.matchId}`, d); } }
  await save(`draws/${last.id}`, null, "del");
  await save("live/draw", {seq: ((S.remote.live && S.remote.live.seq) || 0) + 1, undo: true, a: last.a, b: last.b, map: null, at: Date.now()});
  ST.struck = null; toast(`Sorteo deshecho: ${last.map} vuelve a estar disponible.`); audit(`Deshizo el sorteo de ${last.map} (${TM(last.a).name} vs ${TM(last.b).name})`);
}
function onLiveDraw(d) {
  if (d.undo) { if (ST.open && !ST.admin) { ST.shown = null; renderStage(); } return; }
  if (ST.open) { if (!ST.admin) ST.shown = d; spin(d); return; }
  if (Date.now() - (d.at || 0) < 120000) showLivePill(d);
}
function showLivePill(d) {
  const root = $("#livePillRoot");
  root.innerHTML = `<button class="live-pill cut-s" id="livePill"><i></i>EN VIVO · sorteo de mapa ${esc(TM(d.a).name)} vs ${esc(TM(d.b).name)} — ver</button>`;
  $("#livePill").addEventListener("click", () => { root.innerHTML = ""; openStream(false); ST.shown = d; if (Date.now() - d.at < 12000) spin(d); else renderStage(); });
  clearTimeout(showLivePill.t); showLivePill.t = setTimeout(() => { root.innerHTML = ""; }, 60000);
}
function spin(d) {
  if (ST.spinning) return;
  ST.spinning = true; ST.revealing = {map: d.map, a: d.a, b: d.b}; ST.struck = null;
  if (ST.admin) { const R = RM(); if (d.matchId && R.matches[d.matchId]) ST.sel = {mid: d.matchId, a: d.a, b: d.b}; else ST.sel = {mid: "", a: d.a, b: d.b}; renderCtrl(); }
  renderStage();
  $("#reelIdle").hidden = true; $("#stResult").classList.remove("show"); $("#stMsg").textContent = "";
  $$(".st-team").forEach(el => el.classList.remove("win"));
  const pool = d.pool && d.pool.length ? d.pool : [d.map], H = 130, N = 46;
  const seq = []; for (let i = 0; i < N; i++) seq.push(pool[Math.floor(Math.random() * pool.length)]);
  seq.push(d.map); seq.push(pool[Math.floor(Math.random() * pool.length)]);
  const strip = $("#reelStrip");
  strip.innerHTML = seq.map(n => `<div class="rcard" style="--mc:${mapColor(n)}"><b>${esc(n.toUpperCase())}</b></div>`).join("");
  const target = N, startY = H, endY = H - target * H, dur = reduced ? 300 : 5200, t0 = performance.now();
  let lastIdx = -1;
  const ease = t => 1 - Math.pow(1 - t, 4);
  const frame = now => {
    const t = Math.min(1, (now - t0) / dur), y = startY + (endY - startY) * ease(t);
    strip.style.transform = `translateY(${y}px)`;
    const idx = Math.round((startY - y) / H); if (idx !== lastIdx) { lastIdx = idx; tick(900 + Math.random() * 500); }
    if (t < 1) requestAnimationFrame(frame); else land(d);
  };
  requestAnimationFrame(frame);
}
function land(d) {
  const cards = $$("#reelStrip .rcard"); const fc = cards[cards.length - 2];
  if (fc) { fc.style.transform = "scale(1.04)"; fc.style.boxShadow = "0 0 60px #fff"; }
  $("#stFlash").classList.remove("go"); void $("#stFlash").offsetWidth; $("#stFlash").classList.add("go");
  $("#stResult").textContent = `SE JUEGA EN ${d.map.toUpperCase()}`; $("#stResult").classList.add("show");
  chord();
  setTimeout(() => {
    ST.spinning = false; ST.revealing = null; ST.struck = {map: d.map, a: d.a, b: d.b};
    renderStage();
    if (!reduced) confetti([mapColor(d.map), "#ffffff", TM(d.a).c, TM(d.b).c]);
  }, 900);
}

/* ================= efectos y helpers comunes ================= */
function toast(msg, k) {
  const t = TM(k && M && M.teams[k] ? k : S.my), el = document.createElement("div");
  el.className = "toast cut-s"; el.style.setProperty("--tc", t.c); el.innerHTML = `${EMB[t.k] ? img(t.k) : ""}<span>${esc(msg)}</span>`;
  $("#toasts").appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 320); }, 3800);
  while ($("#toasts").children.length > 4) $("#toasts").firstChild.remove();
}
const cf = {cv: $("#confetti"), parts: [], running: false};
function confetti(colors) {
  if (reduced) return;
  const cv = cf.cv, ctx = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let i = 0; i < 140; i++) cf.parts.push({x: innerWidth / 2 + (Math.random() - .5) * 240, y: innerHeight * .45, vx: (Math.random() - .5) * 14, vy: -6 - Math.random() * 10, g: .32, s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: colors[i % colors.length], life: 0});
  if (cf.running) return; cf.running = true;
  const loop = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    cf.parts = cf.parts.filter(p => p.y < innerHeight + 20 && p.life < 240);
    for (const p of cf.parts) { p.vy += p.g; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
    if (cf.parts.length) requestAnimationFrame(loop); else { cf.running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  };
  requestAnimationFrame(loop);
}
let lastFocus = null;
function modal(html) {
  lastFocus = document.activeElement;
  $("#modalRoot").innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  const m = $("#modalRoot .modal");
  m.addEventListener("click", e => { if (e.target === m || e.target.closest("[data-close]")) closeModal(); });
  const f = m.querySelector("input,select,textarea") || m.querySelector("button:not([data-close])"); if (f) f.focus({preventScroll: true});
}
function closeModal() { $("#modalRoot").innerHTML = ""; if (lastFocus && lastFocus.isConnected) lastFocus.focus(); }
addEventListener("keydown", e => {
  if (e.key !== "Escape" || ST.open) return;
  if ($("#modalRoot").innerHTML) closeModal(); else if (S.adm.open) { S.adm.open = false; renderAdmin(); } else if (S.cap.open) { S.cap.open = false; renderCap(); }
});
document.addEventListener("pointermove", e => {
  const sp = e.target.closest && e.target.closest(".panel, .adm-card, .cj-card, .pcard");
  if (sp) { const r = sp.getBoundingClientRect(); sp.style.setProperty("--mx", (e.clientX - r.left) + "px"); sp.style.setProperty("--my", (e.clientY - r.top) + "px"); }
  if (reduced || e.pointerType !== "mouse") return;
  const t = e.target.closest && e.target.closest(".tilt");
  if (t) { const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    t.style.transform = `perspective(700px) rotateX(${(.5 - y) * 10}deg) rotateY(${(x - .5) * 12}deg) translateY(-3px)`; t.style.setProperty("--gx", x * 100 + "%"); t.style.setProperty("--gy", y * 100 + "%"); }
});
document.addEventListener("pointerout", e => { const t = e.target.closest && e.target.closest(".tilt"); if (t && !t.contains(e.relatedTarget)) t.style.transform = ""; });
// Escudos de todos los equipos (los de base y los que agrega el staff) girando alrededor del logo de ONYX.
// Con más equipos se achican para que entren todos en la misma órbita.
let orbitSig = "";
function renderOrbit() {
  const o = $("#orbit"); if (!o) return;
  const items = TEAM_KEYS.map(k => { const d = S.remote.teams[k] || {}, t = teamDef(k); return {k, nm: d.name || t.n, c: d.c || t.c, src: EMB[k]}; });
  const sig = items.map(x => [x.k, x.nm, x.c, x.src && x.src.length, x.src && x.src.slice(-40)].join("|")).join("~");
  if (sig === orbitSig && o.querySelector(".sat")) return; orbitSig = sig;
  o.querySelectorAll(".sat").forEach(x => x.remove());
  const n = items.length || 1, R = 39, sz = Math.min(19, (2 * Math.PI * R) / n * .72);
  o.style.setProperty("--sz", sz.toFixed(2) + "%"); o.style.setProperty("--ty", (-R / sz * 100).toFixed(1) + "%");
  items.forEach((x, i) => { const nm = esc(x.nm);
    o.insertAdjacentHTML("beforeend", `<div class="sat ${BASE_EMB[x.k] && x.src === BASE_EMB[x.k] ? "" : "custom"}" style="--a:${i * 360 / n}deg;--tc:${x.c};--d:${(i * .08).toFixed(2)}s"><button data-t="${x.k}" aria-label="Ver ${nm}"><img src="${x.src}" alt="${nm}"><span class="tag">${nm}</span></button></div>`); });
}
function buildOrbit() {
  const o = $("#orbit"); renderOrbit();
  o.addEventListener("click", e => { const b = e.target.closest("[data-t]"); if (!b) return; S.teamSel = b.dataset.t; renderTeams(); goView("equipos"); });
}
/* ================= inicio: tablero ================= */
// Cruces (ida y vuelta juntas) de una lista de partidos, en orden
function cruceGroups(list) {
  const out = [], by = {};
  list.forEach(m => { const key = `${m.fecha}|${[m.a, m.b].sort().join("~")}`; if (!by[key]) out.push(by[key] = {f: m.fecha, a: m.a, b: m.b, games: []}); by[key].games.push(m); });
  out.forEach(c => c.games.sort((x, y) => (x.legN || 0) - (y.legN || 0)));
  return out;
}
const teamTag = k => `<span class="tt" style="--tc:${TM(k).c}">${img(k)}<b>${esc(TM(k).name)}</b></span>`;
const FORM_DOT = {W: ["w", "Victoria"], w: ["w ot", "Victoria en prórroga"], l: ["l ot", "Derrota en prórroga"], L: ["l", "Derrota"]};
function renderHome() {
  const nf = D.nextF, next = nf ? cruceGroups(D.ms.filter(m => m.fecha === nf)) : [];
  const busy = new Set(next.flatMap(c => [c.a, c.b])), bye = nf ? TEAM_KEYS.filter(k => !busy.has(k)) : [];
  $("#homeNext").innerHTML = next.length
    ? next.map(c => `<div class="dn-row"><div class="dn-vs">${teamTag(c.a)}<span class="vs">vs</span>${teamTag(c.b)}</div>
        <div class="dn-legs">${c.games.map(g => `<span class="${g.status === "played" ? "done" : ""}">${g.leg ? `<em>${LEG_L[g.leg]}</em>` : ""}${g.status === "played" ? `<b>${g.ra}-${g.rb}</b>` : g.date ? fmtDate(g.date) : "A confirmar"}</span>`).join("")}</div></div>`).join("")
      + (bye.length ? `<p class="dn-bye">Libre: ${bye.map(k => esc(TM(k).name)).join(", ")}</p>` : "")
    : (() => { const pst = typeof poState === "function" ? poState(playoffDoc()) : null, live = pst && !pst.champion ? pst.rounds.flatMap(r => r.series).filter(x => x.a && x.b && !x.winner) : [];
      return live.length ? `<p class="dn-bye" style="margin:0 0 8px">Terminó la fase regular. Siguen los playoffs:</p><div class="po-mini">${live.slice(0, 2).map(x => poCard(x)).join("")}</div>`
        : `<p class="empty">${pst && pst.champion ? `Terminó la temporada: ${esc(TM(pst.champion).name)} es el campeón.` : D.ms.length ? "No quedan partidos por jugar en la temporada." : "Todavía no hay fixture. El staff lo carga desde el panel."}</p>`; })();
  const top = D.real.slice(0, Math.min(5, D.real.length));
  $("#homeTop").innerHTML = top.map(r => { const t = TM(r.k);
    return `<a class="dt-row ${r.k === S.my ? "me" : ""} ${r.pos <= M.cfg.playoff ? "po" : ""}" href="#tabla" style="--tc:${t.c}"><span class="pos">${r.pos}</span>${img(r.k)}<b>${esc(t.name)}</b>
      <span class="form">${r.form.slice(-5).map(f => { const d = FORM_DOT[f.c] || ["", ""]; return `<i class="${d[0]}" title="${d[1]}"></i>`; }).join("")}</span><span class="pts">${r.pts}<small>pts</small></span></a>`; }).join("")
    || '<p class="empty">La tabla aparece cuando se cargan los equipos.</p>';
  const last = D.lastF ? cruceGroups(D.played.filter(m => m.fecha === D.lastF)) : [];
  $("#homeResT").textContent = D.lastF ? `Resultados de la fecha ${D.lastF}` : "Últimos resultados";
  $("#homeRes").innerHTML = last.length ? last.map(c => `<div class="dr-row">${c.games.map(g => { const aw = +g.ra > +g.rb;
      return `<button type="button" class="dr-g" data-mid="${g.id}" title="Ver el partido"><em>${g.leg ? LEG_L[g.leg] : ""}</em><span class="${aw ? "win" : ""}">${img(g.a)}${esc(TM(g.a).name)}</span><b>${g.ra}<i>-</i>${g.rb}</b><span class="r ${aw ? "" : "win"}">${esc(TM(g.b).name)}${img(g.b)}</span></button>`; }).join("")}</div>`).join("")
    : '<p class="empty">Todavía no se jugó ninguna fecha.</p>';
  const mv = D.lastF ? fechaMvp(D.lastF) : null;
  if (mv) { const a = agg(mv.log, D.lastF), t = TM(mv.lastTeam);
    $("#homeMvp").innerHTML = `<button class="mvp-card" type="button" data-p="${mv.id}" style="--tc:${t.c}">${img(mv.lastTeam, "mvp-em")}<span class="mvp-n"><b>${esc(mv.name)}</b><small>${esc(mv.role)} · ${esc(t.name)}</small></span>
      <span class="mvp-s"><span><b>${a.acs}</b>ACS</span><span><b>${dec(a.kd)}</b>K/D</span><span><b>${a.k}</b>Kills</span></span></button>`; }
  else $("#homeMvp").innerHTML = '<p class="empty">Se define con la primera fecha jugada.</p>';
  const trs = [...M.transfers].sort((a, b) => b.at - a.at).slice(0, 4);
  $("#homeTr").innerHTML = trs.length ? trs.map(f => `<div class="dtr-row">${f.to ? img(f.to) : '<span class="ava">LB</span>'}<div><b>${esc(f.name)}</b><small>${f.from ? esc(TM(f.from).name) : "Libre"} → ${f.to ? esc(TM(f.to).name) : "Libre"}</small></div>${f.amt ? `<span class="amt"><i class="coin"></i>${fmt(f.amt)}</span>` : ""}</div>`).join("")
    : `<p class="empty">Sin fichajes todavía.${M.cfg.windowOpen ? " La ventana está abierta." : ""}</p>`;
  $("#homeTrLink").hidden = $("#navMk").hidden;
}
$("#homeMvp").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) openPlayer(b.dataset.p); });
// Números que suben al mostrarse el inicio (una vez)
let countedUp = false;
function countUp() {
  if (countedUp || reduced) return; countedUp = true;
  $$("#statbar b.num").forEach(el => {
    const to = +String(el.textContent).replace(/\D/g, "") || 0; if (!to) return;
    const t0 = performance.now(), step = now => { const f = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - f, 3); el.textContent = fmt(Math.round(to * e)); if (f < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* ================= navegación: barra lateral y vistas ================= */
// Cada sección es una vista: se muestra una por vez y la barra lateral marca dónde estás. Los links #seccion siguen andando.
const VIEW_IDS = $$("main > section.view").map(s => s.id);
const viewEl = id => document.getElementById(id);
const viewOf = el => { const v = el && el.closest ? el.closest("main > section.view") : null; return v ? v.id : null; };
let curView = null;
function goView(id, o = {}) {
  let target = id ? document.getElementById(id) : null;
  let vid = target ? (VIEW_IDS.includes(target.id) ? target.id : viewOf(target)) : null;
  if (!vid || viewEl(vid).hidden) { vid = "inicio"; target = null; }
  if (vid !== curView) {
    const first = curView === null; curView = vid;
    VIEW_IDS.forEach(x => viewEl(x).classList.toggle("on", x === vid));
    const t = viewEl(vid).dataset.title || "";
    document.title = vid === "inicio" ? "ONYX · Liga de Valorant" : `${t} · ONYX`;
    $("#mbarTitle").textContent = vid === "inicio" ? "" : t;
    markNav();
    if (!first && (!target || target.id === vid)) window.scrollTo({top: 0, behavior: "auto"});
    if (vid === "inicio") requestAnimationFrame(countUp);
    if (o.focus) $("#main").focus({preventScroll: true});
  }
  const url = location.pathname + location.search + "#" + (target && target.id !== vid ? target.id : vid);
  if (location.hash !== "#" + (target ? target.id : vid)) { if (o.replace) history.replaceState(null, "", url); else history.pushState(null, "", url); }
  if (target && target.id !== vid) requestAnimationFrame(() => scrollToEl.call(target, {behavior: reduced ? "auto" : "smooth", block: "start"}));
  closeSide();
}
// Si algo del código pide ir a un elemento de otra vista, primero se abre esa vista
const scrollToEl = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = function (o) { const v = viewOf(this); if (v && v !== curView) goView(v, {replace: false}); return scrollToEl.call(this, o); };
function markNav() {
  const a = $(`#nav a[data-v="${curView}"]`);
  $$("#nav a").forEach(x => { x.classList.toggle("on", x === a); if (x === a) x.setAttribute("aria-current", "page"); else x.removeAttribute("aria-current"); });
  const ind = $("#sideInd"); if (!ind) return;
  if (!a || a.hidden || !a.offsetHeight) { ind.style.opacity = 0; return; }
  ind.style.opacity = 1; ind.style.height = a.offsetHeight + "px"; ind.style.transform = `translateY(${a.offsetTop}px)`;
}
const isDrawer = () => matchMedia("(max-width: 900px)").matches;
function openSide() { if (!isDrawer()) return; document.body.classList.add("side-open"); $("#scrim").hidden = false; const fa = $("#nav a.on") || $("#nav a"); if (fa) fa.focus({preventScroll: true}); }
function closeSide() { if (!document.body.classList.contains("side-open")) return; document.body.classList.remove("side-open"); $("#scrim").hidden = true; }
function shellState() {
  $("#staffLink").hidden = !!(S.staff || S.captain || S.member);
  const cnt = S.staff ? admCounts() : null, n = cnt ? cnt.req + cnt.off + cnt.rep + cnt.cj + cnt.sal + cnt.res : 0, bd = $("#admBadge");
  bd.hidden = !n; bd.textContent = n > 99 ? "99+" : String(n);
  const ct = capTeam(), pend = ct ? D.pending.find(x => x.a === ct || x.b === ct) : null;
  const missing = !!(pend && !pickOf(pend.fecha, ct));
  $("#navMpDot").hidden = !missing; $("#heroMp").hidden = !missing; if (missing) $("#heroMpTxt").textContent = `Elegí tu mapa de la fecha ${pend.fecha}`;
  if (curView && viewEl(curView).hidden) goView("inicio", {replace: true}); else markNav();
}
// Con la barra achicada, cada ícono muestra su nombre al pasar el mouse
function railTitles() { const mini = document.documentElement.classList.contains("side-mini"); $$("#nav a, .side-act, #cmdOpen, #sideCd").forEach(a => { if (mini) a.title = a.textContent.replace(/\s+/g, " ").trim(); else a.removeAttribute("title"); }); }
function initShell() {
  addEventListener("hashchange", () => { const id = location.hash.slice(1); if (!id) return; goView(id, {replace: true}); if (VIEW_IDS.includes(id)) window.scrollTo({top: 0, behavior: "auto"}); });
  addEventListener("popstate", () => goView(location.hash.slice(1) || "inicio", {replace: true}));
  $("#nav").addEventListener("click", e => { const a = e.target.closest("a[data-v]"); if (!a) return; e.preventDefault(); goView(a.dataset.v, {focus: e.detail === 0}); });
  $("#sideRail").addEventListener("click", () => {
    const on = !document.documentElement.classList.contains("side-mini");
    document.documentElement.classList.toggle("side-mini", on); store.set("side", on);
    $("#sideRail").setAttribute("aria-label", on ? "Agrandar el menú" : "Achicar el menú"); $("#sideRail").title = on ? "Agrandar el menú" : "Achicar el menú";
    setTimeout(markNav, 260); railTitles();
  });
  $("#sideCd").addEventListener("click", e => { e.preventDefault(); goView("inicio"); });
  $("#sideOpen").addEventListener("click", openSide); $("#sideClose").addEventListener("click", closeSide); $("#scrim").addEventListener("click", closeSide);
  addEventListener("resize", () => { if (!isDrawer()) closeSide(); markNav(); });
  [$("#cmdOpen"), $("#cmdOpen2")].forEach(b => b.addEventListener("click", openCmd));
  goView(location.hash.slice(1) || "inicio", {replace: true}); railTitles();
  if (document.documentElement.classList.contains("side-mini")) { $("#sideRail").setAttribute("aria-label", "Agrandar el menú"); $("#sideRail").title = "Agrandar el menú"; }
  requestAnimationFrame(() => document.body.classList.add("ready"));
}

/* ================= buscador rápido (Ctrl+K) ================= */
const cmd = {open: false, sel: 0, items: []};
const normTxt = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function cmdResults(q) {
  const nq = normTxt(q.trim());
  const score = l => { const n = normTxt(l); return !nq ? 1 : n.startsWith(nq) ? 3 : n.split(/\s+/).some(w => w.startsWith(nq)) ? 2 : n.includes(nq) ? 1 : 0; };
  const pick = (list, max) => list.map(x => ({...x, sc: score(x.label)})).filter(x => x.sc).sort((a, b) => b.sc - a.sc).slice(0, max);
  const secs = $$("#nav a[data-v]").filter(a => !a.hidden).map(a => ({grp: "Secciones", icon: a.querySelector("use").getAttribute("href"), label: a.textContent.trim(), sub: a.closest(".ngrp").querySelector(".ngrp-t").textContent, run: () => goView(a.dataset.v, {focus: true})}));
  const acts = [];
  if (S.staff) acts.push({grp: "Acciones", icon: "#i-staff", label: "Abrir el panel de staff", sub: S.staff.u, run: openAdmin});
  if (S.captain) acts.push({grp: "Acciones", icon: "#i-crown", label: "Abrir el panel de capitán", sub: S.captain.u, run: openCap});
  if (!S.staff && !S.captain && !S.member) acts.push({grp: "Acciones", icon: "#i-user", label: "Entrar", sub: "Jugadores con Discord, staff y capitanes con usuario", run: () => $("#staffLink").click()});
  if (S.staff || S.captain || S.member) acts.push({grp: "Acciones", icon: "#i-lock", label: "Mi cuenta", sub: S.member ? "Perfil y sesión" : "Cambiar mi contraseña", run: openAccount});
  if (discordUrl()) acts.push({grp: "Acciones", icon: "#i-chat", label: "Unirme al Discord", sub: "Servidor de la liga", run: () => window.open(discordUrl(), "_blank", "noopener")});
  acts.push({grp: "Acciones", icon: "#i-live", label: "Ver el sorteo de mapas en vivo", sub: "Modo espectador", run: () => $("#openStreamView").click()});
  const teams = TEAM_KEYS.map(k => ({grp: "Equipos", team: k, label: TM(k).name, sub: `${roster(k).length} jugadores`, run: () => { S.teamSel = k; renderTeams(); goView("equipos", {focus: true}); }}));
  const players = D.P.map(p => ({grp: "Jugadores", player: p, label: p.name, sub: `${p.role} · ${p.team ? TM(p.team).name : "Agente libre"}`, run: () => openPlayer(p.id)}));
  const coaches = coachList().map(c => ({grp: "Coaches", icon: "#i-whistle", label: c.name, sub: coachTeams(c).length ? "Coach de " + coachTeams(c).map(k => TM(k).name).join(", ") : "Coach sin equipo", run: () => { goView("equipos", {focus: true}); setTimeout(() => { const b = $("#coachesBox"); if (b) b.scrollIntoView({behavior: reduced ? "auto" : "smooth", block: "start"}); }, 80); }}));
  return nq ? [...pick(players, 7), ...pick(coaches, 4), ...pick(teams, 4), ...pick(secs, 6), ...pick(acts, 3)] : [...secs, ...acts];
}
function renderCmd() {
  const q = $("#cmdQ").value, items = cmd.items = cmdResults(q);
  if (cmd.sel >= items.length) cmd.sel = Math.max(0, items.length - 1);
  let g = "";
  $("#cmdList").innerHTML = items.length ? items.map((x, i) => { const head = x.grp !== g ? `<div class="cmd-g" role="presentation">${x.grp}</div>` : ""; g = x.grp;
    const ico = x.team ? img(x.team) : x.player ? (x.player.team ? img(x.player.team) : `<span class="ava">${esc(x.player.name.slice(0, 2).toUpperCase())}</span>`) : `<svg class="ic"><use href="${x.icon}"/></svg>`;
    return `${head}<button type="button" class="cmd-it ${i === cmd.sel ? "on" : ""}" role="option" id="cmdo${i}" aria-selected="${i === cmd.sel}" data-i="${i}"><span class="ci">${ico}</span><span class="cl"><b>${esc(x.label)}</b><small>${esc(x.sub)}</small></span><svg class="ic go"><use href="#i-arrow"/></svg></button>`; }).join("")
    : `<p class="cmd-empty">No encontré nada con “${esc(q)}”. Probá con el nombre de un jugador, un equipo o una sección.</p>`;
  $("#cmdQ").setAttribute("aria-activedescendant", items.length ? "cmdo" + cmd.sel : "");
  const on = $("#cmdList .cmd-it.on"); if (on) on.scrollIntoView({block: "nearest"});
}
function openCmd() {
  if (cmd.open) return; cmd.open = true; cmd.sel = 0; cmd.last = document.activeElement; closeSide();
  $("#cmdRoot").innerHTML = `<div class="cmd" role="dialog" aria-modal="true" aria-label="Buscar"><div class="cmd-box">
    <div class="cmd-in"><svg class="ic"><use href="#i-search"/></svg><input id="cmdQ" type="text" placeholder="Buscá un jugador, un equipo o una sección" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="cmdList"><kbd>Esc</kbd></div>
    <div class="cmd-list" id="cmdList" role="listbox"></div>
    <div class="cmd-foot"><span><kbd>↑</kbd><kbd>↓</kbd> moverte</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Esc</kbd> cerrar</span></div></div></div>`;
  const root = $("#cmdRoot .cmd");
  root.addEventListener("click", e => { if (e.target === root) closeCmd(); const it = e.target.closest(".cmd-it"); if (it) runCmd(+it.dataset.i); });
  root.addEventListener("pointermove", e => { const it = e.target.closest(".cmd-it"); if (it && +it.dataset.i !== cmd.sel) { cmd.sel = +it.dataset.i; $$("#cmdList .cmd-it").forEach(b => { const on = +b.dataset.i === cmd.sel; b.classList.toggle("on", on); b.setAttribute("aria-selected", on); }); } });
  const q = $("#cmdQ");
  q.addEventListener("input", () => { cmd.sel = 0; renderCmd(); });
  q.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = cmd.items.length; if (!n) return; cmd.sel = (cmd.sel + (e.key === "ArrowDown" ? 1 : -1) + n) % n; renderCmd(); }
    else if (e.key === "Enter") { e.preventDefault(); runCmd(cmd.sel); }
    else if (e.key === "Tab") e.preventDefault();
  });
  renderCmd(); q.focus();
}
function closeCmd(restore = true) { if (!cmd.open) return; cmd.open = false; $("#cmdRoot").innerHTML = ""; if (restore && cmd.last && cmd.last.isConnected) cmd.last.focus(); }
function runCmd(i) { const x = cmd.items[i]; if (!x) return; closeCmd(false); x.run(); }
addEventListener("keydown", e => {
  const typing = e.target.closest && e.target.closest("input,textarea,select,[contenteditable]");
  if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (cmd.open) closeCmd(); else openCmd(); return; }
  if (e.key === "/" && !typing && !cmd.open && !ST.open && !$("#modalRoot").innerHTML && !S.adm.open && !S.cap.open) { e.preventDefault(); openCmd(); return; }
  if (e.key === "Escape" && cmd.open) { e.stopImmediatePropagation(); closeCmd(); return; }
  if (e.key === "Escape" && document.body.classList.contains("side-open")) { e.stopImmediatePropagation(); closeSide(); }
}, true);


/* ================= Discord, cuenta y seguridad ================= */
// Link de invitación al servidor de Discord (lo carga ultra staff en Panel → General)
const DISCORD_RE = /^https:\/\/(?:www\.)?(?:discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[A-Za-z0-9-]{2,40}\/?$/;
const discordUrl = () => { const u = String((M && M.cfg && M.cfg.discord) || "").trim(); return DISCORD_RE.test(u) ? u : ""; };
function renderDiscord() {
  const u = discordUrl();
  ["#discordBtn", "#heroDc", "#footDc", "#mbarDc", "#homeDcBtn"].forEach(id => { const a = $(id); if (!a) return; a.hidden = !u; if (u) a.href = u; });
  const box = $("#homeDc"); if (box) box.hidden = !u;
}

// Quién está logueado, para el botón de cuenta de la barra lateral
function meInfo() {
  if (S.staff) return {kind: "staff", name: S.staff.u, sub: isUltra() ? "Ultra staff" : "Staff", icon: "i-staff"};
  if (S.captain) return {kind: "captain", name: S.captain.u, sub: "Capitán" + (S.captain.team ? " de " + TM(S.captain.team).name : ""), icon: "i-crown"};
  if (S.member && myCoachTeams().length && !(S.member.pid && D && D.PM[S.member.pid])) return {kind: "member", name: S.member.name || "Coach", sub: "Coach de " + myCoachTeams().map(k => TM(k).name).join(" y "), avatar: S.member.avatar, icon: "i-whistle"};
  if (S.member) return {kind: "member", name: S.member.name || "Jugador", sub: S.member.pid && D && D.PM[S.member.pid] ? D.PM[S.member.pid].name + " · " + (D.PM[S.member.pid].team ? TM(D.PM[S.member.pid].team).name : "libre") : "Sin vincular", avatar: S.member.avatar, icon: "i-user"};
  return null;
}
function renderMe() {
  const b = $("#meBtn"); if (!b) return;
  const me = meInfo(); b.hidden = !me;
  if (!me) return;
  b.classList.toggle("compact", me.kind !== "member"); b.title = me.kind !== "member" ? `Mi cuenta (${me.name})` : "";
  $("#meAva").innerHTML = me.avatar ? `<img src="${esc(me.avatar)}" alt="" referrerpolicy="no-referrer">` : ico(me.icon);
  $("#meName").textContent = me.name; $("#meSub").textContent = me.sub;
}

// Cambiar la contraseña (staff y capitanes). Firebase pide la contraseña actual para confirmar que sos vos.
function pwScore(p) {
  let s = 0; if (p.length >= 10) s++; if (p.length >= 14) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++; if (/\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++;
  if (/^(.)\1+$/.test(p) || /^(?:1234|qwer|asdf|pass|onyx|valorant)/i.test(p)) s = Math.min(s, 1);
  return Math.min(4, s);
}
const PW_L = ["Muy débil", "Débil", "Aceptable", "Buena", "Muy buena"];
function openAccount() {
  const me = meInfo(); if (!me) { openLogin(); return; }
  const pw = me.kind !== "member" || isMailMember();
  const linkTxt = me.kind === "member" ? (S.member.pid && D.PM[S.member.pid] ? `Vinculada con <b>${esc(D.PM[S.member.pid].name)}</b>.` : "Todavía no vinculaste tu cuenta con tu jugador.") : "";
  modal(`<div class="box cut acct"><div class="bh"><span class="acct-ava">${me.avatar ? `<img src="${esc(me.avatar)}" alt="" referrerpolicy="no-referrer">` : ico(me.icon)}</span><div><div class="eyebrow">${esc(me.sub)}</div><h3>${esc(me.name)}</h3></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="bb">${pw ? `<form id="pwForm" class="pw-form" novalidate><div class="h3" style="font-size:16px">Cambiar mi contraseña</div>
        <div class="ff"><label for="pwCur">Contraseña actual</label><input id="pwCur" type="password" autocomplete="current-password"></div>
        <div class="ff"><label for="pwNew">Contraseña nueva <small class="muted">(10 caracteres o más)</small></label><input id="pwNew" type="password" autocomplete="new-password"><div class="pw-meter" aria-hidden="true"><i id="pwBar"></i></div><small class="muted" id="pwLbl">&nbsp;</small></div>
        <div class="ff"><label for="pwRep">Repetila</label><input id="pwRep" type="password" autocomplete="new-password"></div>
        <div class="err" id="pwErr" hidden></div>
        <div class="rowbtns"><button class="btn gold" type="submit" id="pwGo">Cambiar contraseña</button></div>
        <p class="adm-note">Usá una contraseña que no uses en otro lado y no la compartas. Al cambiarla se cierran tus sesiones en los otros dispositivos.</p></form>`
      : ""}${me.kind === "member" ? `<p class="muted">${linkTxt}</p><div class="rowbtns"><a class="btn gold" href="#perfil" data-close>${ico("i-user")}Ir a mi perfil</a></div>` : ""}
      <div class="rowbtns" style="margin-top:6px"><button class="btn ghost" id="acctOut" type="button">${ico("i-logout")}Cerrar sesión</button></div></div></div>`);
  $("#acctOut").addEventListener("click", () => { closeModal(); if (S.staff) logout(); else if (S.captain) capLogout(); else memberLogout(); });
  if (!pw) return;
  const err = t => { $("#pwErr").hidden = !t; $("#pwErr").textContent = t || ""; };
  $("#pwNew").addEventListener("input", e => { const v = e.target.value, sc = v ? pwScore(v) : 0; $("#pwBar").style.width = (v ? (sc + 1) * 20 : 0) + "%"; $("#pwBar").dataset.s = sc; $("#pwLbl").textContent = v ? PW_L[sc] : " "; });
  $("#pwForm").addEventListener("submit", async e => {
    e.preventDefault();
    const cur = $("#pwCur").value, nw = $("#pwNew").value, rep = $("#pwRep").value;
    if (!cur || !nw) { err("Completá la contraseña actual y la nueva."); return; }
    if (nw.length < 10) { err("La contraseña nueva tiene que tener al menos 10 caracteres."); return; }
    if (nw !== rep) { err("Las dos contraseñas nuevas no coinciden."); return; }
    if (nw === cur) { err("La nueva tiene que ser distinta de la actual."); return; }
    if (pwScore(nw) < 2) { err("Es muy fácil de adivinar. Mezclá mayúsculas, minúsculas, números o símbolos."); return; }
    const go = $("#pwGo"); go.disabled = true; go.textContent = "Cambiando…"; err("");
    try {
      const u = AUTH.currentUser, email = u.email || emailOf(me.name);
      await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(email, cur));
      await u.updatePassword(nw);
      if (S.staff) audit("Cambió su contraseña");
      closeModal(); toast("Listo: tu contraseña cambió.");
    } catch (er) {
      const c = er && er.code;
      err(["auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials", "auth/user-mismatch"].includes(c) ? "La contraseña actual no es correcta."
        : c === "auth/weak-password" ? "Firebase la rechazó por débil. Probá con una más larga." : c === "auth/too-many-requests" ? "Demasiados intentos. Esperá unos minutos." : c === "auth/network-request-failed" ? "Sin conexión. Revisá internet." : "No se pudo cambiar. Probá de nuevo.");
    } finally { const g = $("#pwGo"); if (g) { g.disabled = false; g.textContent = "Cambiar contraseña"; } }
  });
}

// Confirmación escribiendo una palabra (para lo que no tiene vuelta atrás)
function confirmTyped({title, html = "", word = "BORRAR", btn = "Confirmar", danger = true}) {
  return new Promise(res => {
    let done = false; const fin = v => { if (done) return; done = true; res(v); };
    modal(`<div class="box cut confirm" style="--tc:${danger ? "#ff4d6d" : "var(--accent)"}"><div class="bh"><span class="acct-ava warn">${ico("i-shield")}</span><div><div class="eyebrow">${danger ? "No tiene vuelta atrás" : "Confirmá"}</div><h3>${title}</h3></div><button class="x" data-close aria-label="Cancelar">×</button></div>
      <div class="bb">${html}<div class="ff"><label for="cfW">Para confirmar, escribí <b class="mono cf-word">${esc(word)}</b></label><input id="cfW" autocomplete="off" spellcheck="false" autocapitalize="characters"></div>
      <div class="rowbtns"><button class="btn ${danger ? "danger" : "gold"}" id="cfGo" type="button" disabled>${btn}</button><button class="btn ghost" type="button" data-close>Cancelar</button></div></div></div>`);
    const go = $("#cfGo"), inp = $("#cfW");
    inp.addEventListener("input", () => { go.disabled = inp.value.trim().toUpperCase() !== word; });
    inp.addEventListener("keydown", e => { if (e.key === "Enter" && !go.disabled) go.click(); });
    go.addEventListener("click", () => { fin(true); closeModal(); });
    const mo = new MutationObserver(() => { if (!document.getElementById("cfGo")) { mo.disconnect(); fin(false); } });
    mo.observe($("#modalRoot"), {childList: true});
  });
}
// Pide un texto corto en una ventana (devuelve null si se cancela)
function askText({title, label, btn = "Aceptar", danger = false, value = "", max = 200}) {
  return new Promise(res => {
    let done = false; const fin = v => { if (done) return; done = true; res(v); };
    modal(`<div class="box cut"><div class="bh"><div><h3>${title}</h3></div><button class="x" data-close aria-label="Cancelar">×</button></div>
      <div class="bb"><div class="ff"><label for="atV">${label}</label><input id="atV" maxlength="${max}" value="${esc(value)}" autocomplete="off"></div>
      <div class="rowbtns"><button class="btn ${danger ? "danger" : "gold"}" id="atGo" type="button">${btn}</button><button class="btn ghost" type="button" data-close>Cancelar</button></div></div></div>`);
    $("#atGo").addEventListener("click", () => { const v = $("#atV").value.trim(); fin(v); closeModal(); });
    $("#atV").addEventListener("keydown", e => { if (e.key === "Enter") $("#atGo").click(); });
    const mo = new MutationObserver(() => { if (!document.getElementById("atGo")) { mo.disconnect(); fin(null); } });
    mo.observe($("#modalRoot"), {childList: true});
  });
}
// Antes de borrar algo grande: confirmación escrita y copia de seguridad automática
async function dangerGate(title, html, word = "BORRAR") {
  if (!await confirmTyped({title, html: html + `<p class="adm-note">Antes de borrar se guarda una copia de seguridad de toda la base (Panel → Seguridad).</p>`, word, btn: title})) return false;
  toast("Guardando una copia de seguridad…");
  try { const r = await api("/api/backup", {action: "create", reason: "Antes de: " + title}); toast(`Copia guardada (${fmt(r.docs)} documentos).`); return true; }
  catch (er) { return confirmTyped({title: "No se pudo hacer la copia", html: `<p>${esc(er.message)}</p><p>¿Querés borrar igual, sin copia?</p>`, word: "SIN COPIA", btn: "Borrar sin copia"}); }
}

/* ---------- Panel → Seguridad (ultra): copias, resumen público y sesiones ---------- */
S.adm.bk = {list: null, loading: false, err: "", meta: null, upData: null, upName: ""};
async function loadBackups(force) {
  const B = S.adm.bk; if (B.loading || (B.list && !force)) return; B.loading = true; B.err = "";
  try { const j = await api("/api/backup", null, "GET"); B.list = j.list || []; } catch (er) { B.err = er.message; B.list = B.list || []; }
  try { const m = await FDB.doc("public/meta").get(); B.meta = m.exists ? m.data() : {rev: 0}; } catch (er) { B.meta = null; }
  B.loading = false; if (S.adm.open && S.adm.tab === "seguridad") renderAdminSoon();
}
const kb = n => n > 1048576 ? dec(n / 1048576, 1) + " MB" : fmt(Math.max(1, n / 1024)) + " KB";
const BK_KIND = {daily: "Diaria", manual: "Manual", auto: "Automática"};
const dt = t => t ? new Date(t).toLocaleString("es-AR", {day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit"}) : "–";
function admSeguridad() {
  const B = S.adm.bk; if (!B.list && !B.loading) loadBackups();
  const list = (B.list || []).slice(0, 40);
  const bk = `<div class="adm-card"><h3>${ico("i-shield")} Copias de seguridad <small>una por día a las 03:17 y antes de cada borrado o cierre de temporada</small></h3>
    ${B.err ? `<div class="ex-banner cut-s" style="margin:0"><span>${esc(B.err)}</span></div>` : ""}
    <div class="rowbtns"><input class="cell-in" id="bkReason" placeholder="Motivo (opcional)" style="max-width:260px" autocomplete="off"><button class="btn sm gold" data-act="bk-create">${ico("i-check")}<span>Hacer una copia ahora</span></button><button class="btn sm ghost" data-act="bk-reload">Actualizar</button></div>
    <div class="bk-list">${B.loading && !B.list ? '<p class="adm-note">Cargando…</p>' : list.map(x => `<div class="bk-row"><span class="bk-k ${x.kind}">${BK_KIND[x.kind] || x.kind}</span><div><b>${dt(x.at)}</b><small>${x.docs ? fmt(x.docs) + " documentos · " : ""}${x.size ? kb(x.size) : ""}${x.reason ? " · " + esc(x.reason) : ""}${x.by ? " · " + esc(x.by) : ""}</small></div>
        <span class="rowbtns"><button class="btn sm ghost" data-act="bk-dl:${esc(x.key)}">Descargar</button><button class="btn sm danger" data-act="bk-restore:${esc(x.key)}">Restaurar</button></span></div>`).join("") || '<p class="adm-note">Todavía no hay copias. La primera se hace sola esta noche, o tocá “Hacer una copia ahora”.</p>'}</div>
    <p class="adm-note">Restaurar vuelve la liga a cómo estaba en esa copia (partidos, jugadores, equipos, mercado, canjes, coaches, etc.). No toca las cuentas, la auditoría ni ONYX Bot, y antes guarda una copia del estado actual por si te arrepentís.</p>
    <div class="rowbtns"><label class="btn sm ghost file-btn">${ico("i-arrow")}<span>${B.upName ? esc(B.upName) : "Restaurar desde un archivo descargado"}</span><input type="file" id="bkFile" accept=".json,application/json" hidden></label>${B.upData ? `<button class="btn sm danger" data-act="bk-upload">Restaurar este archivo</button>` : ""}</div></div>`;
  const m = B.meta;
  const pub = `<div class="adm-card"><h3>${ico("i-bolt")} Resumen público <small>lo que baja cada visitante: 1 lectura en vez de cientos</small></h3>
    <p class="adm-note">${m == null ? "No se pudo leer el estado." : m.rev ? `Versión ${fmt(m.rev)} · actualizado ${dt(m.at)} · ${kb(m.size || 0)}${m.full ? ` · armado completo ${dt(m.full)}` : ""}.` : "Todavía no se armó: tocá “Rearmar ahora” (mientras tanto, los visitantes leen todo como antes)."}</p>
    <p class="adm-note">Se actualiza solo cada vez que el staff o un capitán guarda algo, y se rearma completo todas las noches. Si ves algo desactualizado en la página pública, rearmalo.</p>
    <div class="rowbtns"><button class="btn sm" data-act="pub-full">${ico("i-bolt")}<span>Rearmar ahora</span></button></div></div>`;
  const users = staffArr().concat(capArr().map(c => ({...c, role: "captain"}))).sort((a, b) => String(a.u).localeCompare(String(b.u), "es", {numeric: true}));
  const ses = `<div class="adm-card"><h3>${ico("i-key")} Sesiones y contraseñas</h3>
    <p class="adm-note">Si una contraseña se filtró: generá una nueva en Cuentas y auditoría (eso cierra sus sesiones), o desactivá la cuenta para cortar el acceso al instante. Cada persona puede cambiar su propia contraseña desde el botón de su cuenta, abajo en la barra lateral.</p>
    <div class="rowbtns"><select class="cell-in" id="revU" style="max-width:220px" aria-label="Cuenta">${users.map(x => opt(x.u, `${x.u} · ${x.role === "ultra" ? "ultra" : x.role === "captain" ? "capitán" : "staff"}`)).join("")}</select><button class="btn sm ghost" data-act="acc-revoke">Cerrar sus sesiones</button></div>
    <p class="adm-note">Cerrar sesiones tarda hasta 1 hora en hacer efecto en los dispositivos abiertos.</p></div>`;
  return bk + pub + ses;
}

/* ---------- cerrar la temporada (ultra, Panel → General) ---------- */
function seasonCard(R, Dr) {
  const po = poState(playoffDoc()), champ = seasonChampion();
  return `<div class="adm-card season-card"><h3>${ico("i-trophy")} Temporada <small>${esc(R.cfg.season)}</small></h3>
    <p class="adm-note">Al terminar la temporada, cerrala: queda guardada en <b>Historia</b> (campeón, tabla final, premios y estadísticas de cada jugador) y la liga arranca de cero para la siguiente, sin perder jugadores, equipos, logos, premios ni coaches.</p>
    <div class="season-sum"><span>${champ ? `${img(champ)}<b>${esc(TM(champ).name)}</b><small>${po && po.champion ? "campeón de playoffs" : "primero en la tabla"}</small>` : "<small>Sin campeón todavía</small>"}</span>
      <span><b>${Dr.played.length}</b><small>partidos jugados</small></span><span><b>${Dr.lastF || 0}</b><small>fechas</small></span><span><b>${Object.keys(S.remote.seasons || {}).length}</b><small>temporadas archivadas</small></span></div>
    <div class="rowbtns"><button class="btn sm danger" data-act="season-close">Cerrar ${esc(R.cfg.season)} y empezar la siguiente</button></div></div>`;
}
function seasonChampion() { const st = poState(playoffDoc()); if (st && st.champion) return st.champion; return D.real.length && D.played.length ? D.real[0].k : null; }
function nextSeasonName(n) { const m = String(n || "").match(/^(.*?)(\d+)\s*$/); return m ? m[1] + (+m[2] + 1) : (n ? n + " 2" : "Temporada 2"); }
function buildArchive() {
  const A = computeAwards(), po = poState(playoffDoc()), champ = seasonChampion();
  const runner = po && po.champion ? po.runnerUp : (D.real[1] || {}).k || null;
  const pl = {};
  D.P.filter(p => p.s.m).forEach(p => { const s = p.s; pl[p.id] = {name: p.name, team: p.lastTeam || null, role: p.role, m: s.m, k: s.k, d: s.d, a: s.a, acs: s.acs, kd: Math.round(s.kd * 100) / 100, w: s.w}; });
  const aw = {}; AWARD_KINDS.forEach(([k, l]) => { const p = A[k]; if (p) aw[k] = {id: p.id, name: p.name, team: p.lastTeam || null, label: l}; });
  const teams = {}; TEAM_KEYS.forEach(k => { const t = TM(k); teams[k] = {name: t.name, c: t.c, l: t.l}; });
  return {name: M.cfg.season, game: M.cfg.game, champion: champ, championName: champ ? TM(champ).name : "", runnerUp: runner, runnerUpName: runner ? TM(runner).name : "",
    standings: D.real.map(r => ({k: r.k, name: TM(r.k).name, c: TM(r.k).c, pos: r.pos, pts: r.pts, pj: r.pj, g: r.g, gp: r.gp, pp: r.pp, p: r.p, rf: r.rf, rc: r.rc, dif: r.dif, kills: r.kills})),
    teams, players: pl, awards: aw, fechas: D.lastF, matches: D.played.length, transfers: M.transfers.length,
    playoffs: po ? {size: po.doc.size, champion: po.champion || null, rounds: po.rounds.map(r => ({key: r.key, name: r.name, series: r.series.map(x => ({a: x.a, b: x.b, sa: x.sa, sb: x.sb, wa: x.wa, wb: x.wb, winner: x.winner || null}))}))} : null};
}
async function seasonClose() {
  const R = RM(), champ = seasonChampion(), next = nextSeasonName(R.cfg.season);
  modal(`<div class="box cut" style="--tc:var(--gold)"><div class="bh"><span class="acct-ava gold">${ico("i-trophy")}</span><div><div class="eyebrow">Cerrar la temporada</div><h3>${esc(R.cfg.season)}</h3></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="bb"><div class="ff"><label for="scChamp">Campeón</label><select id="scChamp">${opt("", "Sin campeón", !champ)}${TEAM_KEYS.map(k => opt(k, TM(k).name, k === champ)).join("")}</select></div>
      <div class="ff"><label for="scNext">Nombre de la temporada nueva</label><input id="scNext" value="${esc(next)}" maxlength="40"></div>
      <div class="ff"><label for="scCoins">ONYX Coins de cada equipo al empezar</label><select id="scCoins">${opt("", "Las que tiene cada uno", false)}${opt("6000", "6.000 para todos", true)}${opt("custom", "Otro valor…", false)}</select><input id="scCoinsN" type="number" min="0" step="500" placeholder="Ej: 8000" hidden></div>
      <label class="chk"><input type="checkbox" id="scKeep" checked>Mantener los planteles (si lo destildás, todos los jugadores quedan libres)</label>
      <div class="season-what"><b>Se archiva</b><span>Tabla final, campeón, premios, playoffs y estadísticas de cada jugador.</span><b>Se reinicia</b><span>Partidos, sorteos, fichajes, mapas usados, elecciones de mapa, asistencia y skills, pronósticos, votaciones y playoffs. Fair play vuelve a 100.</span><b>Pasa a la temporada nueva</b><span>El saldo de canjes de cada jugador. Equipos, logos, jugadores, premios, coaches y sueldos quedan igual.</span></div>
      <div class="rowbtns"><button class="btn danger" id="scGo" type="button">Seguir</button><button class="btn ghost" type="button" data-close>Cancelar</button></div></div></div>`);
  $("#scCoins").addEventListener("change", e => { $("#scCoinsN").hidden = e.target.value !== "custom"; });
  $("#scGo").addEventListener("click", async () => {
    const chosen = $("#scChamp").value || null, nextName = $("#scNext").value.trim(), cs = $("#scCoins").value, keep = $("#scKeep").checked;
    const coins = cs === "custom" ? (+$("#scCoinsN").value >= 0 && $("#scCoinsN").value !== "" ? +$("#scCoinsN").value : null) : cs ? +cs : null;
    if (!nextName) { toast("Poné el nombre de la temporada nueva."); return; }
    if (cs === "custom" && coins == null) { toast("Poné cuántas coins arranca cada equipo."); return; }
    closeModal();
    if (!await confirmTyped({title: `Cerrar ${esc(R.cfg.season)}`, html: `<p>Se archiva la temporada${chosen ? ` con <b>${esc(TM(chosen).name)}</b> campeón` : ""} y empieza <b>${esc(nextName)}</b>. Antes se guarda una copia de seguridad completa.</p>`, word: "CERRAR", btn: "Cerrar la temporada"})) return;
    const arch = buildArchive(); arch.champion = chosen; arch.championName = chosen ? TM(chosen).name : "";
    if (chosen && arch.runnerUp === chosen) arch.runnerUp = (D.real.find(r => r.k !== chosen) || {}).k || null;
    arch.runnerUpName = arch.runnerUp ? TM(arch.runnerUp).name : "";
    const carry = {}; D.P.forEach(p => { const v = saldoOf(p.id); if (v > 0) carry[p.id] = v; });
    toast("Cerrando la temporada… (guarda la copia primero)");
    try {
      let r;
      try { r = await api("/api/season", {action: "close", archive: arch, carry, next: {season: nextName}, opts: {coins, keepRosters: keep}}); }
      catch (er) {
        if (!(er.body && er.body.noBackup)) throw er;
        if (!await confirmTyped({title: "No se pudo hacer la copia", html: `<p>${esc(er.message)}</p><p>¿Cerrar la temporada igual, sin copia de seguridad?</p>`, word: "SIN COPIA", btn: "Cerrar sin copia"})) return;
        r = await api("/api/season", {action: "close", archive: arch, carry, next: {season: nextName}, opts: {coins, keepRosters: keep}, force: true});
      }
      toast(`Listo: ${R.cfg.season} quedó en Historia y empezó ${nextName}.`); if (chosen) confetti([TM(chosen).c, TM(chosen).l, "#ffcb52"]);
      S.adm.open = false; renderAdmin(); goView("historia");
    } catch (er) { toast(er.message || "No se pudo cerrar la temporada."); }
  });
}

/* ---------- acciones nuevas del panel ---------- */
async function extAdminAct(act, a, b) {
  if (act === "bk-reload") { S.adm.bk.list = null; await loadBackups(true); return true; }
  if (act === "bk-create") {
    b.disabled = true; toast("Guardando la copia…");
    try { const r = await api("/api/backup", {action: "create", reason: ($("#bkReason") || {}).value || ""}); toast(`Copia guardada: ${fmt(r.docs)} documentos.`); S.adm.bk.list = null; loadBackups(true); }
    catch (er) { toast(er.message); b.disabled = false; }
    return true;
  }
  if (act === "bk-dl") {
    const key = a.join(":");
    try {
      const u = AUTH.currentUser, r = await fetch(`/api/backup?key=${encodeURIComponent(key)}`, {headers: {authorization: "Bearer " + await u.getIdToken()}});
      if (!r.ok) throw new Error(((await r.json().catch(() => ({}))).error) || "No se pudo descargar.");
      const blob = await r.blob(), url = URL.createObjectURL(blob), l = document.createElement("a");
      l.href = url; l.download = `onyx-${key.replace(/\//g, "-")}.json`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (er) { toast(er.message); }
    return true;
  }
  if (act === "bk-restore" || act === "bk-upload") {
    const key = a.join(":"), x = (S.adm.bk.list || []).find(y => y.key === key);
    const when = act === "bk-upload" ? `del archivo ${esc(S.adm.bk.upName)}` : `del ${dt(x ? x.at : 0)}`;
    if (!await confirmTyped({title: "Restaurar una copia", html: `<p>La liga vuelve a como estaba en la copia <b>${when}</b>. Todo lo que se cargó después se pierde (antes se guarda una copia del estado actual).</p>`, word: "RESTAURAR", btn: "Restaurar"})) return true;
    toast("Restaurando… no cierres la página.");
    try { const r = await api("/api/backup", act === "bk-upload" ? {action: "upload", data: S.adm.bk.upData} : {action: "restore", key}); S.adm.bk.upData = null; S.adm.bk.upName = ""; toast(`Copia restaurada. Antes se guardó ${r.pre}.`); S.adm.bk.list = null; loadBackups(true); }
    catch (er) { toast(er.message); }
    return true;
  }
  if (act === "pub-full") { b.disabled = true; try { const r = await pubFull(); toast(`Resumen rearmado (versión ${r.rev}, ${kb(r.size || 0)}).`); S.adm.bk.meta = null; loadBackups(true); } catch (er) { toast(er.message); b.disabled = false; } return true; }
  if (act === "acc-revoke") { const u = ($("#revU") || {}).value; if (!u || !arm(b)) return true; try { await staffApi({action: "revoke", u}); toast(`Se cerrarán las sesiones de ${u}.`); } catch (er) { toast(er.message); } return true; }
  if (act === "season-close") { await seasonClose(); return true; }
  return (await resAdminAct(act, a, b)) || (await poAdminAct(act, a, b)) || (await econAdminAct(act, a, b)) || (await memAdminAct(act, a, b));
}
// Archivo para restaurar subido desde la computadora
$("#adminRoot").addEventListener("change", e => {
  if (e.target.id !== "bkFile" || !e.target.files[0]) return;
  const f = e.target.files[0]; if (f.size > 40e6) { toast("El archivo es demasiado grande."); return; }
  const r = new FileReader();
  r.onload = () => { try { const d = JSON.parse(r.result); if (d.app !== "onyx" || !d.colls) throw 0; S.adm.bk.upData = d; S.adm.bk.upName = f.name; renderAdminSoon(); } catch (er) { toast("Ese archivo no es una copia de ONYX."); } };
  r.readAsText(f);
});

/* ================= resultados por captura ================= */
// El capitán carga el resultado de su partido (con la captura del marcador). La página puede leer la captura con IA
// y completar sola el marcador y las estadísticas. Si los dos capitanes mandan lo mismo, el partido se carga solo.
// El staff también usa esta carga rápida para cargar un partido entero de una vez.
const RES_ST = {pend: ["Esperando", "pend"], auto: ["Cargado solo", "ok"], ok: ["Aprobado", "ok"], rej: ["Rechazado", "no"]};
const resCfgC = () => Object.assign({auto: true, ai: true, aiDaily: 30}, (M.cfg && M.cfg.results) || {});
const resList = () => Object.entries(S.remote.results || {}).map(([id, r]) => ({id, ...r}));
const resOf = (mid, k) => (S.remote.results || {})[`${mid}_${k}`] || null;
const nrm = s => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/#.*$/, "").replace(/[^a-z0-9]/g, "");
function lev2(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; let p = Array.from({length: n + 1}, (_, j) => j); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[n]; }
function simName(x, y) { const a = nrm(x), b = nrm(y); if (!a || !b) return 0; if (a === b) return 1; const r = Math.min(a.length, b.length) / Math.max(a.length, b.length); if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return Math.max(.72, .6 + .35 * r); return Math.max(0, 1 - lev2(a, b) / Math.max(a.length, b.length)); }
const bestPlayer = (name, pool) => pool.map(p => ({p, s: Math.max(simName(name, p.name), p.ign ? simName(name, p.ign) : 0)})).sort((a, b) => b.s - a.s)[0] || null;
// Pegar texto: una línea por jugador. "Nombre 20/10/5 250", "Nombre 20 10 5 250" o "Nombre 250 20 10 5" (si el primer número es grande, es el ACS)
function parsePasted(txt) {
  const out = [];
  String(txt || "").split(/\r?\n/).forEach(l => {
    const line = l.trim(); if (!line) return;
    const kda = line.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
    let name, k, d, a, acs = null;
    if (kda) { name = line.slice(0, kda.index).replace(/[\s|,;:\-]+$/, "").trim(); [k, d, a] = kda.slice(1, 4).map(Number); const rest = (line.slice(0, kda.index).match(/\d{2,3}(?!.*\d)/) || [])[0] || (line.slice(kda.index + kda[0].length).match(/\d{2,3}/) || [])[0]; if (rest) acs = +rest; if (name && /\d{2,3}$/.test(name) && acs != null && name.endsWith(String(acs))) name = name.slice(0, -String(acs).length).trim(); }
    else { const nums = [...line.matchAll(/(?:^|\s)(\d{1,3})(?=\s|$)/g)].map(m => +m[1]); if (nums.length < 3) return; const first = line.search(/(?:^|\s)\d{1,3}(?=\s|$)/); name = line.slice(0, first).trim(); const n4 = nums.slice(-4); if (n4.length === 4 && n4[0] > 60) [acs, k, d, a] = n4; else if (n4.length === 4) [k, d, a, acs] = n4; else [k, d, a] = nums.slice(-3); }
    name = (name || "").replace(/^[\d.\-)\s]+/, "").replace(/#\S*/, "").trim();
    if (name) out.push({name, k, d, a, acs});
  });
  return out;
}

// Estado de la carga abierta
let RS = null;
function resPool(m) { return D.P.filter(p => p.team === m.a || p.team === m.b || (m.stats && m.stats[p.id])); }
function openResult(mid, mode) {
  const m = D.ms.find(x => x.id === mid); if (!m) { toast("Ese partido ya no existe."); return; }
  const raw = S.remote.matches[mid] || {}, own = mode === "cap" ? resOf(mid, capTeam()) : null, base = own || (mode === "staff" && raw.status === "played" ? raw : null);
  const rows = [];
  const push = (pid, s) => { const p = D.PM[pid]; if (!p) return; const side = (s && s.t ? s.t : p.team) === m.b ? "b" : "a"; rows.push({pid, side, k: s ? s.k : "", d: s ? s.d : "", a: s ? s.a : "", acs: s ? s.acs : "", sure: 1}); };
  if (base && base.stats && Object.keys(base.stats).length) Object.entries(base.stats).forEach(([pid, s]) => push(pid, s));
  else [m.a, m.b].forEach(k => roster(k).filter(p => p.role !== "Suplente").forEach(p => push(p.id, null)));
  RS = {mid, mode, img: null, rows, ra: base ? base.ra ?? "" : "", rb: base ? base.rb ?? "" : "", map: (base && base.map) || "", note: (own && own.note) || "", busy: false, ai: null, paste: false, left: null};
  renderResult(true);
}
function renderResult(first) {
  const m = D.ms.find(x => x.id === RS.mid); if (!m) { closeModal(); return; }
  const A = TM(m.a), B = TM(m.b), cfgR = resCfgC(), pool = resPool(m).concat(D.P.filter(p => !p.team)), used = new Set(RS.rows.map(r => r.pid));
  const rowsOf = side => RS.rows.map((r, i) => ({r, i})).filter(x => x.r.side === side);
  const rowHtml = ({r, i}) => { const p = D.PM[r.pid];
    return `<div class="rs-row ${r.sure < .75 ? "doubt" : ""}" data-i="${i}">
      <select class="cell-in rs-p" data-rs="pid" aria-label="Jugador">${r.pid ? "" : opt("", "¿Quién es?", true)}${pool.concat(r.pid && !pool.includes(D.PM[r.pid]) && D.PM[r.pid] ? [D.PM[r.pid]] : []).map(x => opt(x.id, x.name + (x.team !== m.a && x.team !== m.b ? ` (${x.team ? TM(x.team).name : "libre"})` : ""), x.id === r.pid)).join("")}</select>
      ${["k", "d", "a", "acs"].map(f => `<input class="cell-in" type="number" min="0" max="${f === "acs" ? 999 : 99}" inputmode="numeric" value="${r[f] ?? ""}" data-rs="${f}" aria-label="${{k: "Kills", d: "Muertes", a: "Asistencias", acs: "ACS"}[f]} de ${esc(p ? p.name : "")}">`).join("")}
      <button class="btn sm ghost icon-only" type="button" data-rs-swap="${i}" aria-label="Pasar al otro equipo" title="Pasar al otro equipo">${ico("i-swap")}</button><button class="btn sm ghost icon-only" type="button" data-rs-del="${i}" aria-label="Sacar" title="Sacar">${ico("i-close")}</button>${r.read && (!p || nrm(r.read) !== nrm(p.name) || r.sure < .75) ? `<small class="rs-read" title="Lo que se leyó">Leído: ${esc(r.read)}${!r.pid ? " · elegí quién es" : r.sure < .75 ? " · revisá el jugador" : ""}</small>` : ""}</div>`; };
  const addSel = side => { const left = pool.filter(p => !used.has(p.id)); return left.length ? `<select class="cell-in rs-add" data-rs-add="${side}" aria-label="Agregar jugador"><option value="">+ Agregar jugador</option>${left.map(p => opt(p.id, p.name + (p.team ? " · " + TM(p.team).name : " · libre"))).join("")}</select>` : ""; };
  const team = (side, t) => `<div class="rs-team" style="--tc:${t.c}"><div class="rs-th">${img(side === "a" ? m.a : m.b)}<b>${esc(t.name)}</b><span class="rs-cols"><i>K</i><i>D</i><i>A</i><i>ACS</i></span></div>${rowsOf(side).map(rowHtml).join("")}${addSel(side)}</div>`;
  const ai = RS.ai ? `<div class="rs-ai ${RS.ai.confidence}">${ico("i-bolt")}<span>Leído con IA · confianza ${{high: "alta", medium: "media", low: "baja"}[RS.ai.confidence] || "media"}${RS.ai.notes ? " · " + esc(RS.ai.notes) : ""}. Revisá los números antes de ${RS.mode === "cap" ? "enviar" : "guardar"}.${RS.left != null ? ` Te quedan ${RS.left} lecturas hoy.` : ""}</span></div>` : "";
  const html = `<div class="box cut rs-box" style="--tc:${A.c}"><div class="bh">${img(m.a)}<div><div class="eyebrow">F${m.fecha}${m.leg ? " · " + LEG_L[m.leg] : ""} · ${RS.mode === "cap" ? "Cargar resultado" : "Carga rápida"}</div><h3>${esc(A.name)} vs ${esc(B.name)}</h3><div class="muted" style="font-size:13px">${fmtDate(m.date)}</div></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="bb">
      <div class="rs-shot ${RS.img ? "has" : ""}"><label class="rs-drop" tabindex="0">${RS.img ? `<img src="${RS.img}" alt="Captura del marcador">` : `${ico("i-play")}<b>Subí la captura del marcador</b><small>Tocá o arrastrá la imagen (la pantalla final con K / D / A y ACS)</small>`}<input type="file" id="rsFile" accept="image/*" hidden></label>
        <div class="rs-tools">${cfgR.ai ? `<button class="btn sm gold" type="button" id="rsRead" ${RS.img && !RS.busy ? "" : "disabled"}>${ico("i-bolt")}<span>${RS.busy ? "Leyendo…" : "Leer la captura"}</span></button>` : ""}<button class="btn sm ghost" type="button" id="rsPasteT">${RS.paste ? "Ocultar texto" : "Pegar texto"}</button></div></div>
      ${RS.paste ? `<div class="ff"><label for="rsPaste">Una línea por jugador: <span class="mono">Nombre K/D/A ACS</span></label><textarea id="rsPaste" rows="5" placeholder="Jagger 22/14/6 268&#10;Nova 18/15/9 231"></textarea><div class="rowbtns"><button class="btn sm" type="button" id="rsPasteGo">Completar con el texto</button></div></div>` : ""}
      ${ai}
      <div class="rs-score"><label><span>${esc(A.name)}</span><input type="number" min="0" max="40" inputmode="numeric" id="rsRa" value="${RS.ra}"></label><b>–</b><label><span>${esc(B.name)}</span><input type="number" min="0" max="40" inputmode="numeric" id="rsRb" value="${RS.rb}"></label>
        <label class="rs-map"><span>Mapa</span><select id="rsMap">${opt("", "Sin mapa", !RS.map)}${M.cfg.maps.map(x => opt(x.n, x.n, RS.map === x.n)).join("")}</select></label></div>
      <div class="rs-grid">${team("a", A)}${team("b", B)}</div>
      ${RS.mode === "cap" ? `<div class="ff"><label for="rsNote">Nota para el staff (opcional)</label><input id="rsNote" maxlength="300" value="${esc(RS.note)}" placeholder="Ej: entró un suplente por desconexión"></div>` : ""}
      <div class="err" id="rsErr" hidden></div>
      <div class="rowbtns"><button class="btn gold" type="button" id="rsGo">${RS.mode === "cap" ? "Enviar resultado" : "Guardar en el partido"}</button><span class="adm-note">${RS.mode === "cap" ? (cfgR.auto ? "Si el otro capitán manda lo mismo, se carga solo. Si no, lo revisa el staff." : "Lo revisa el staff antes de que aparezca en la tabla.") : "Marca el partido como jugado con este marcador y estas estadísticas."}</span></div></div></div>`;
  if (first || !$("#modalRoot .rs-box")) { modal(html); wireResult(); }
  else { const sc = $("#modalRoot .rs-box").scrollTop; $("#modalRoot .modal").innerHTML = html; $("#modalRoot .rs-box").scrollTop = sc; wireResult(); }
}
function rsSync() {
  if (!RS) return; const g = id => $(id);
  if (g("#rsRa")) RS.ra = g("#rsRa").value; if (g("#rsRb")) RS.rb = g("#rsRb").value; if (g("#rsMap")) RS.map = g("#rsMap").value; if (g("#rsNote")) RS.note = g("#rsNote").value;
  $$("#modalRoot .rs-row").forEach(el => { const r = RS.rows[+el.dataset.i]; if (!r) return; el.querySelectorAll("[data-rs]").forEach(i => { const f = i.dataset.rs; r[f] = f === "pid" ? i.value : i.value; }); });
}
function wireResult() {
  const box = $("#modalRoot .rs-box"); if (!box) return;
  const file = $("#rsFile");
  const take = async f => { try { RS.img = await imageFromFile(f, 1568, false); RS.ai = null; rsSync(); renderResult(); } catch (er) { toast(er.message); } };
  file.addEventListener("change", () => { if (file.files[0]) take(file.files[0]); });
  const drop = $(".rs-drop", box);
  drop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); file.click(); } });
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => { e.preventDefault(); drop.classList.remove("over"); const f = e.dataTransfer.files[0]; if (f) take(f); });
  box.addEventListener("paste", e => { const it = [...(e.clipboardData || {}).items || []].find(x => x.type.startsWith("image/")); if (it) { e.preventDefault(); take(it.getAsFile()); } });
  box.addEventListener("change", e => {
    const add = e.target.closest("[data-rs-add]"); if (add && add.value) { rsSync(); RS.rows.push({pid: add.value, side: add.dataset.rsAdd, k: "", d: "", a: "", acs: "", sure: 1}); renderResult(); return; }
    if (e.target.matches("[data-rs=pid]")) { rsSync(); const r = RS.rows[+e.target.closest(".rs-row").dataset.i]; if (r) r.sure = 1; renderResult(); }
  });
  box.addEventListener("click", async e => {
    const del = e.target.closest("[data-rs-del]"); if (del) { rsSync(); RS.rows.splice(+del.dataset.rsDel, 1); renderResult(); return; }
    const sw = e.target.closest("[data-rs-swap]"); if (sw) { rsSync(); const r = RS.rows[+sw.dataset.rsSwap]; if (r) r.side = r.side === "a" ? "b" : "a"; renderResult(); return; }
    if (e.target.closest("#rsPasteT")) { rsSync(); RS.paste = !RS.paste; renderResult(); return; }
    if (e.target.closest("#rsPasteGo")) { rsSync(); fillRows(parsePasted($("#rsPaste").value).map(x => ({...x, side: null}))); return; }
    if (e.target.closest("#rsRead")) { rsSync(); await aiRead(); return; }
    if (e.target.closest("#rsGo")) { rsSync(); await sendResult(); }
  });
}
// Completa las filas con lo leído (IA o texto pegado): cada nombre va al jugador más parecido (cada jugador una sola vez)
function fillRows(read) {
  const m = D.ms.find(x => x.id === RS.mid), base = resPool(m), pool = base.concat(D.P.filter(p => !base.includes(p)));
  if (!read.length) { toast("No encontré jugadores en el texto."); return; }
  const pairs = [];
  read.forEach((x, i) => {
    if (x.pid && D.PM[x.pid]) pairs.push({i, pid: x.pid, s: 2 + (x.score || .9)});
    else pool.forEach(p => { const s = Math.max(simName(x.name, p.name), p.ign ? simName(x.name, p.ign) : 0); if (s >= .5) pairs.push({i, pid: p.id, s: s + (base.includes(p) ? .04 : 0)}); });
  });
  pairs.sort((a, b) => b.s - a.s);
  const got = {}, used = new Set();
  pairs.forEach(x => { if (got[x.i] || used.has(x.pid)) return; got[x.i] = x; used.add(x.pid); });
  const rows = read.map((x, i) => { const g = got[i], p = g ? D.PM[g.pid] : null, side = x.side || (p && p.team === m.b ? "b" : "a");
    return {pid: p ? p.id : "", side, k: x.k ?? "", d: x.d ?? "", a: x.a ?? "", acs: x.acs ?? "", sure: g ? (g.s >= 2 ? g.s - 2 : g.s) : 0, read: x.name}; });
  RS.rows = rows.concat(RS.rows.filter(r => r.pid && !used.has(r.pid) && (r.k !== "" || r.acs !== "")));
  renderResult();
  const miss = rows.filter(r => !r.pid).length, doubt = rows.filter(r => r.pid && r.sure < .75).length;
  toast(`Completé ${rows.length - miss} jugador${rows.length - miss === 1 ? "" : "es"}.${miss ? ` ${miss} no coincide${miss === 1 ? "" : "n"} con nadie: elegilo${miss === 1 ? "" : "s"} en la lista.` : ""}${doubt ? ` Revisá los marcados en amarillo.` : ""}`);
}
async function aiRead() {
  if (!RS.img || RS.busy) return; RS.busy = true; renderResult();
  try {
    const r = await api("/api/results", {action: "read", mid: RS.mid, image: RS.img});
    RS.ai = {confidence: r.confidence, notes: r.notes}; RS.left = r.left;
    if (r.ra != null) RS.ra = r.ra; if (r.rb != null) RS.rb = r.rb; if (r.map && M.cfg.maps.some(x => x.n === r.map)) RS.map = r.map;
    RS.busy = false;
    fillRows((r.rows || []).map(x => ({name: x.name, k: x.k, d: x.d, a: x.a, acs: x.acs, side: x.side, pid: x.pid, score: x.score})));
    if (!r.sidesSure) toast("Revisá que cada equipo haya quedado de su lado.");
  } catch (er) { RS.busy = false; renderResult(); toast(er.message); }
}
function resErr(t) { const e = $("#rsErr"); if (e) { e.hidden = !t; e.textContent = t || ""; } }
function resPayload() {
  const m = D.ms.find(x => x.id === RS.mid), ra = RS.ra === "" ? NaN : +RS.ra, rb = RS.rb === "" ? NaN : +RS.rb;
  if (!Number.isInteger(ra) || !Number.isInteger(rb)) return {err: "Poné las rondas de los dos equipos."};
  if (ra === rb) return {err: "Un partido no puede terminar empatado."};
  const hi = Math.max(ra, rb), lo = Math.min(ra, rb);
  if (hi < 13) return {err: "Nadie llegó a 13. Si un equipo se rindió o no se presentó, avisale al staff."};
  if (hi > 13 && hi - lo !== 2) return {err: `${ra}-${rb} no es posible: en la prórroga se gana por 2.`};
  const stats = {}, seen = new Set();
  if (RS.rows.some(r => !r.pid && ["k", "d", "a", "acs"].some(f => r[f] !== "" && r[f] != null))) return {err: "Hay filas sin jugador: elegí quién es cada uno (o sacá la fila)."};
  for (const r of RS.rows) {
    if (!r.pid) continue;
    if (seen.has(r.pid)) return {err: `${D.PM[r.pid] ? D.PM[r.pid].name : "Un jugador"} está dos veces.`};
    seen.add(r.pid);
    const v = ["k", "d", "a", "acs"].map(f => r[f] === "" || r[f] == null ? null : +r[f]);
    if (v.every(x => x == null)) continue;
    if (v.some(x => x == null || !Number.isInteger(x) || x < 0)) return {err: `Faltan números de ${D.PM[r.pid] ? D.PM[r.pid].name : "un jugador"}.`};
    if (v[0] > 99 || v[1] > 99 || v[2] > 99 || v[3] > 999) return {err: `Revisá los números de ${D.PM[r.pid].name}: son demasiado altos.`};
    stats[r.pid] = {t: r.side === "b" ? m.b : m.a, k: v[0], d: v[1], a: v[2], acs: v[3]};
  }
  return {ra, rb, ot: ra + rb > 24, map: RS.map || null, stats, m};
}
async function sendResult() {
  const P = resPayload(); if (P.err) { resErr(P.err); return; }
  const go = $("#rsGo"); go.disabled = true; resErr("");
  try {
    if (RS.mode === "cap") {
      const r = await api("/api/results", {action: "submit", mid: RS.mid, ra: P.ra, rb: P.rb, map: P.map, stats: P.stats, img: RS.img, note: RS.note});
      closeModal(); RS = null;
      if (r.status === "auto") { toast("¡Coincidió con el otro capitán! El resultado ya está cargado."); confetti([TM(capTeam()).c, "#ffffff", "#8b3dff"]); }
      else toast(r.why ? `Enviado. ${r.why}` : "Enviado. Esperamos al otro capitán o al staff.");
    } else {
      const m = P.m, d = matchDoc(m.id); if (!d) throw new Error("El partido ya no existe.");
      Object.assign(d, {status: "played", ra: P.ra, rb: P.rb, ot: P.ot, noShow: null, map: P.map, stats: P.stats});
      await save(`matches/${m.id}`, d); await lockPickedMaps(m.id, d);
      for (const k of [m.a, m.b]) { const r = resOf(m.id, k); if (r && r.status === "pend") await save(`results/${m.id}_${k}`, {status: "ok", reviewedBy: S.staff.u, reviewedAt: Date.now()}, "update"); }
      audit(`Cargó el resultado de F${m.fecha}${m.leg ? " " + LEG_L[m.leg] : ""} ${TM(m.a).name} ${P.ra}-${P.rb} ${TM(m.b).name} con ${Object.keys(P.stats).length} jugadores (carga rápida)`);
      closeModal(); RS = null; toast("Partido cargado."); renderAdminSoon();
    }
  } catch (er) { resErr(er.message || "No se pudo."); if ($("#rsGo")) $("#rsGo").disabled = false; }
}

// Panel del capitán: resultados de su equipo
function capResultsCard(k) {
  const pend = D.pending.filter(m => (m.a === k || m.b === k)), nf = pend.length ? Math.min(...pend.map(m => m.fecha)) : null, now = Date.now();
  const due = pend.filter(m => m.fecha === nf || (parseLocal(m.date) && parseLocal(m.date).getTime() < now));
  const recent = D.played.filter(m => (m.a === k || m.b === k) && resOf(m.id, k) && m.fecha >= (D.lastF || 0) - 1);
  const list = [...due, ...recent].sort((a, b) => a.fecha - b.fecha || (a.legN || 0) - (b.legN || 0));
  if (!list.length) return "";
  const row = m => { const r = resOf(m.id, k), rival = m.a === k ? m.b : m.a, started = parseLocal(m.date) && parseLocal(m.date).getTime() < now;
    const st = m.status === "played" ? (r && RES_ST[r.status] ? RES_ST[r.status] : ["Cargado por el staff", "ok"]) : r ? (r.status === "rej" ? RES_ST.rej : ["Enviado", "pend"]) : ["Sin enviar", started ? "warn" : "idle"];
    return `<div class="req res-req" style="--st:var(--${st[1] === "ok" ? "win" : st[1] === "no" ? "loss" : "gold"})">${img(rival)}<div><div class="rq-t"><b>F${m.fecha}${m.leg ? " " + LEG_L[m.leg] : ""}</b> vs ${esc(TM(rival).name)}${r ? ` · <span class="mono">${r.ra}-${r.rb}</span>` : ""}</div>
      <div class="rq-m">${fmtDate(m.date)}${r && r.check && r.status === "pend" ? ` · ${esc(r.check)}` : ""}${r && r.status === "rej" && r.reviewNote ? ` · “${esc(r.reviewNote)}”` : ""}</div></div>
      <div class="rq-acts"><span class="st ${st[1]}">${st[0]}</span>${m.status !== "played" ? `<button class="btn sm ${r ? "ghost" : "gold"}" data-cap-act="res:${m.id}">${r ? "Corregir" : "Cargar resultado"}</button>` : ""}</div></div>`; };
  return `<div class="adm-card"><h3>${ico("i-check")} Resultados <small>subí la captura del marcador después de jugar</small></h3><div style="display:grid;gap:6px">${list.map(row).join("")}</div>
    <p class="adm-note">${resCfgC().auto ? "Cuando los dos capitanes mandan el mismo resultado, se carga solo en la tabla. Si no coinciden, lo revisa el staff con las dos capturas." : "El staff revisa cada resultado con la captura antes de cargarlo."}</p></div>`;
}

// Staff: pestaña Resultados
function admResultados(R, Dr) {
  const all = resList(), byM = {};
  all.forEach(r => { (byM[r.mid] = byM[r.mid] || []).push(r); });
  const open = Object.keys(byM).filter(mid => byM[mid].some(r => r.status === "pend")).map(mid => Dr.ms.find(m => m.id === mid)).filter(Boolean).sort((a, b) => a.fecha - b.fecha);
  const qm = S.adm.rsMatch && Dr.ms.some(m => m.id === S.adm.rsMatch) ? S.adm.rsMatch : (Dr.pending[0] || Dr.played.slice(-1)[0] || {}).id;
  const quick = `<div class="adm-card"><h3>${ico("i-bolt")} Carga rápida <small>un partido entero de una vez: captura, texto pegado o a mano</small></h3>
    ${Dr.ms.length ? `<div class="rowbtns"><select class="cell-in" id="rsMatchSel" style="max-width:380px" aria-label="Partido">${byCruce(Dr.ms).map(m => opt(m.id, matchLabel(R, m) + (m.status === "played" ? ` (${m.ra}-${m.rb})` : " · pendiente"), m.id === qm)).join("")}</select><button class="btn sm gold" data-act="rs-open:${qm || ""}" id="rsOpenBtn">Abrir carga rápida</button></div>
    <p class="adm-note">${resCfgC().ai ? "Subí la captura del marcador y tocá “Leer la captura”: completa el marcador, el mapa y las estadísticas de los 10 jugadores. Revisás y guardás." : "La lectura con IA está apagada (General). Podés pegar el texto o cargar a mano."}</p>` : '<p class="adm-note">Primero creá los partidos.</p>'}</div>`;
  const sub = r => { const t = TM(r.team), st = RES_ST[r.status] || RES_ST.pend;
    return `<div class="res-sub" style="--tc:${t.c}">${img(r.team)}<div><b>${esc(t.name)}</b> <span class="mono">${r.ra}-${r.rb}</span>${r.map ? ` · ${esc(r.map)}` : ""} · ${Object.keys(r.stats || {}).length} jugadores<div class="adm-note">${esc(r.u || "")} · ${dt(r.at)}${r.note ? ` · “${esc(r.note)}”` : ""}${r.check ? ` · <b style="color:var(--gold)">${esc(r.check)}</b>` : ""}</div></div>
      <span class="rowbtns"><span class="st ${st[1]}">${st[0]}</span>${r.hasImg ? `<button class="btn sm ghost" data-act="rs-img:${r.id}">Ver captura</button>` : ""}${r.status === "pend" ? `<button class="btn sm gold" data-act="rs-use:${r.id}">Usar este</button><button class="btn sm danger" data-act="rs-rej:${r.id}">Rechazar</button>` : ""}</span></div>`; };
  const list = `<div class="adm-card"><h3>${ico("i-inbox")} Enviados por los capitanes <small>${open.length} partido${open.length === 1 ? "" : "s"} por revisar</small></h3>
    ${open.map(m => { const subs = byM[m.id].sort((a, b) => a.team === m.a ? -1 : 1), both = subs.filter(x => x.status === "pend").length === 2;
      return `<div class="res-match"><div class="res-mh"><b>${esc(matchLabel(R, m))}</b>${m.status === "played" ? ` <span class="st ok">ya cargado ${m.ra}-${m.rb}</span>` : ""}${both ? `<button class="btn sm" data-act="rs-check:${m.id}">Comparar y cargar si coinciden</button>` : ""}</div>${subs.map(sub).join("")}</div>`; }).join("") || '<p class="adm-note">No hay resultados esperando revisión.</p>'}
    ${all.filter(r => r.status !== "pend").length ? `<details class="res-old"><summary>Ya revisados (${all.filter(r => r.status !== "pend").length})</summary>${all.filter(r => r.status !== "pend").sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 30).map(sub).join("")}</details>` : ""}</div>`;
  const C = resCfgC(), U = isUltra();
  const cfg = `<div class="adm-card"><h3>${ico("i-sliders")} Cómo se cargan</h3><div class="fgrid">
      ${fld("Carga automática", `<span class="chk"><input type="checkbox" ${C.auto ? "checked" : ""} data-bind="cfg:results.auto" data-t="b" ${U ? "" : "disabled"}>Si los dos capitanes coinciden, se carga solo</span>`)}
      ${fld("Lectura de capturas con IA", `<span class="chk"><input type="checkbox" ${C.ai ? "checked" : ""} data-bind="cfg:results.ai" data-t="b" ${U ? "" : "disabled"}>Activada</span>`)}
      ${fld("Lecturas por persona por día", `<input type="number" min="1" max="200" value="${C.aiDaily}" data-bind="cfg:results.aiDaily" data-t="n" ${U ? "" : "disabled"}>`)}</div>
    <p class="adm-note">Para que se carguen solos, los dos capitanes tienen que mandar el mismo marcador y las mismas estadísticas (el ACS puede variar 3 puntos), con al menos 4 jugadores por equipo. La lectura con IA usa Gemini de Google (gratis): necesita <span class="mono">GEMINI_API_KEY</span> en Netlify.${U ? "" : " Esto lo cambia ultra staff."}</p></div>`;
  return quick + list + cfg;
}
async function resAdminAct(act, a, b) {
  if (act === "rs-open") { const mid = ($("#rsMatchSel") || {}).value || a[0]; if (mid) openResult(mid, "staff"); return true; }
  if (act === "rs-img") {
    const id = a[0]; toast("Abriendo la captura…");
    try { const d = await FDB.doc(`resultimg/${id}`).get(); if (!d.exists) { toast("La captura ya no está."); return true; }
      modal(`<div class="box cut rs-img"><div class="bh"><div><div class="eyebrow">Captura</div><h3>${esc(id.replace("_", " · "))}</h3></div><button class="x" data-close aria-label="Cerrar">×</button></div><div class="bb"><img src="${d.data().data}" alt="Captura del marcador"></div></div>`); }
    catch (er) { toast("No se pudo abrir la captura."); }
    return true;
  }
  if (act === "rs-use") {
    const r = (S.remote.results || {})[a[0]]; if (!r) return true;
    const m = D.ms.find(x => x.id === r.mid); if (!m) return true;
    RS = null; openResult(m.id, "staff");
    RS.ra = r.ra; RS.rb = r.rb; RS.map = r.map || ""; RS.rows = Object.entries(r.stats || {}).map(([pid, s]) => ({pid, side: s.t === m.b ? "b" : "a", k: s.k, d: s.d, a: s.a, acs: s.acs, sure: 1}));
    renderResult(); toast(`Cargué lo que mandó ${TM(r.team).name}: revisalo y guardá.`);
    return true;
  }
  if (act === "rs-rej") {
    const r = (S.remote.results || {})[a[0]]; if (!r) return true;
    const note = await askText({title: `Rechazar el resultado de ${esc(TM(r.team).name)}`, label: "¿Por qué? (lo ve el capitán)", btn: "Rechazar", danger: true}); if (note === null) return true;
    await save(`results/${a[0]}`, {status: "rej", reviewNote: String(note).slice(0, 200), reviewedBy: S.staff.u, reviewedAt: Date.now()}, "update");
    audit(`Rechazó el resultado que mandó ${TM(r.team).name} para ${r.mid}${note ? ": " + note : ""}`); toast("Rechazado."); renderAdminSoon();
    return true;
  }
  if (act === "rs-check") {
    b.disabled = true;
    try { const r = await api("/api/results", {action: "check", mid: a[0]}); toast(r.applied ? "Coincidían: partido cargado." : r.why || "No coinciden."); } catch (er) { toast(er.message); }
    renderAdminSoon(); return true;
  }
  return false;
}
$("#adminRoot").addEventListener("change", e => { if (e.target.id === "rsMatchSel") { S.adm.rsMatch = e.target.value; const bt = $("#rsOpenBtn"); if (bt) bt.dataset.act = "rs-open:" + e.target.value; } });

/* ================= playoffs ================= */
// playoffs/current { size, third, bo: { qf, sf, f, t3 }, seeds: [equipos en orden], series: { id: { games: [{ ra, rb, map }], date } }, at, by }
// El cuadro se arma con la tabla (1° vs último clasificado, etc.). Los ganadores pasan solos a la ronda siguiente.
const PO_NAME = {qf: "Cuartos de final", sf: "Semifinales", f: "Final", t3: "Tercer puesto"};
const PO_SIZES = [2, 4, 6, 8];
function poTemplate(n, third) {
  const S2 = (id, a, b) => ({id, src: {a, b}});
  const R = [];
  if (n === 8) R.push({key: "qf", series: [S2("qf1", "s1", "s8"), S2("qf2", "s4", "s5"), S2("qf3", "s2", "s7"), S2("qf4", "s3", "s6")]});
  if (n === 6) R.push({key: "qf", series: [S2("qf1", "s4", "s5"), S2("qf2", "s3", "s6")]});
  if (n === 8) R.push({key: "sf", series: [S2("sf1", "w:qf1", "w:qf2"), S2("sf2", "w:qf3", "w:qf4")]});
  if (n === 6) R.push({key: "sf", series: [S2("sf1", "s1", "w:qf1"), S2("sf2", "s2", "w:qf2")]});
  if (n === 4) R.push({key: "sf", series: [S2("sf1", "s1", "s4"), S2("sf2", "s2", "s3")]});
  R.push({key: "f", series: [n === 2 ? S2("f1", "s1", "s2") : S2("f1", "w:sf1", "w:sf2")]});
  if (third && n >= 4) R.push({key: "t3", series: [S2("t31", "l:sf1", "l:sf2")]});
  return R;
}
const playoffDoc = () => { const d = (S.remote.playoffs || {}).current; return d && d.seeds && d.seeds.length ? d : null; };
// Estado del cuadro: equipos de cada serie, victorias y ganador
function poState(doc) {
  if (!doc) return null;
  const rounds = poTemplate(doc.size, doc.third), win = {}, lose = {}, out = [];
  const seedOf = {}; doc.seeds.forEach((k, i) => { seedOf[k] = i + 1; });
  const res = s => s.startsWith("s") ? doc.seeds[+s.slice(1) - 1] || null : s.startsWith("w:") ? win[s.slice(2)] || null : lose[s.slice(2)] || null;
  for (const r of rounds) {
    const bo = +((doc.bo || {})[r.key]) || 1, need = Math.ceil(bo / 2);
    const series = r.series.map(x => {
      const d = (doc.series || {})[x.id] || {}, a = res(x.src.a), b = res(x.src.b), games = (d.games || []).filter(g => g && g.ra != null && g.rb != null && g.ra !== "" && g.rb !== "");
      const wa = games.filter(g => +g.ra > +g.rb).length, wb = games.filter(g => +g.rb > +g.ra).length;
      const winner = a && b ? (wa >= need ? a : wb >= need ? b : null) : null;
      if (winner) { win[x.id] = winner; lose[x.id] = winner === a ? b : a; }
      return {id: x.id, round: r.key, src: x.src, a, b, sa: a ? seedOf[a] : null, sb: b ? seedOf[b] : null, games: d.games || [], date: d.date || "", bo, need, wa, wb, winner};
    });
    out.push({key: r.key, name: PO_NAME[r.key], bo, series});
  }
  const fin = out.find(r => r.key === "f").series[0];
  return {rounds: out, champion: fin.winner || null, runnerUp: fin.winner ? (fin.winner === fin.a ? fin.b : fin.a) : null, doc};
}
const poWins = (x, side) => side === "a" ? x.wa : x.wb;
const poRunnerUp = doc => (poState(doc) || {}).runnerUp || null;
// Próxima serie con fecha (para la cuenta regresiva cuando terminó la fase regular)
function poNextDate() { const st = poState(playoffDoc()); if (!st || st.champion) return ""; const ds = st.rounds.flatMap(r => r.series).filter(s => !s.winner && s.date && s.a && s.b).map(s => s.date).sort(); return ds[0] || ""; }

/* ---------- vista pública ---------- */
function poCard(s, big) {
  const row = side => { const k = s[side], sd = s[side === "a" ? "sa" : "sb"], w = poWins(s, side), won = s.winner && s.winner === k, lost = s.winner && s.winner !== k;
    return k ? `<div class="po-t ${won ? "win" : ""} ${lost ? "out" : ""}" style="--tc:${TM(k).c}"><span class="po-seed">${sd || ""}</span>${img(k)}<b>${esc(TM(k).name)}</b><span class="po-w">${s.bo > 1 || s.games.length ? w : ""}</span></div>`
      : `<div class="po-t tbd"><span class="po-seed"></span><span class="ava">?</span><b>${s.src[side].startsWith("w:") ? "Ganador " + s.src[side].slice(2).toUpperCase() : s.src[side].startsWith("l:") ? "Perdedor " + s.src[side].slice(2).toUpperCase() : "A definir"}</b><span class="po-w"></span></div>`; };
  const gs = s.games.filter(g => g && g.ra != null && g.ra !== "").map(g => `<span class="${+g.ra > +g.rb ? "a" : "b"}">${g.ra}-${g.rb}${g.map ? `<i>${esc(g.map)}</i>` : ""}</span>`).join("");
  return `<div class="po-card ${s.winner ? "done" : s.a && s.b ? "live" : ""} ${big ? "big" : ""}" data-po="${s.id}">${row("a")}${row("b")}
    <div class="po-f"><span>${s.bo > 1 ? "Bo" + s.bo : "Partido único"}</span>${gs ? `<span class="po-gs">${gs}</span>` : `<span>${s.date ? fmtDate(s.date) : "Día a confirmar"}</span>`}</div></div>`;
}
function renderPlayoffs() {
  const sec = $("#playoffs"), nav = $("#navPo"), doc = playoffDoc();
  if (sec) sec.hidden = !doc; if (nav) nav.hidden = !doc;
  const home = $("#homePo"); if (home) home.hidden = !doc;
  if (!doc) return;
  const st = poState(doc), main = st.rounds.filter(r => r.key !== "t3"), t3 = st.rounds.find(r => r.key === "t3");
  const champ = st.champion ? `<div class="po-champ" style="--tc:${TM(st.champion).c}">${TROPHY}<div><small>Campeón de ${esc(M.cfg.season)}</small><b>${esc(TM(st.champion).name)}</b></div>${img(st.champion, "po-champ-em")}</div>` : "";
  $("#poBracket").innerHTML = `${champ}<div class="po-cols n${main.length}">${main.map(r => `<div class="po-col"><div class="po-rh">${r.name}<small>${r.bo > 1 ? "al mejor de " + r.bo : "partido único"}</small></div><div class="po-list">${r.series.map(s => poCard(s, r.key === "f")).join("")}</div></div>`).join("")}</div>
    ${t3 ? `<div class="po-third"><div class="po-rh">${t3.name}</div>${poCard(t3.series[0])}</div>` : ""}`;
  // inicio
  const hp = $("#homePoBody");
  if (hp) {
    const live = st.rounds.flatMap(r => r.series).filter(s => s.a && s.b && !s.winner);
    $("#homePoT").textContent = st.champion ? `${TM(st.champion).name}, campeón` : "Playoffs";
    hp.innerHTML = st.champion ? `<div class="po-mini-champ" style="--tc:${TM(st.champion).c}">${img(st.champion)}<div><b>${esc(TM(st.champion).name)}</b><small>Campeón de ${esc(M.cfg.season)}${st.runnerUp ? ` · le ganó la final a ${esc(TM(st.runnerUp).name)}` : ""}</small></div></div>`
      : `<div class="po-mini">${st.rounds.flatMap(r => r.series).filter(s => s.a && s.b).sort((x, y) => (!!x.winner - !!y.winner)).slice(0, 4).map(s => poCard(s)).join("")}</div>`;
  }
  if (st.champion && !S.poCelebrated && curView === "playoffs") { S.poCelebrated = true; if (!reduced) confetti([TM(st.champion).c, TM(st.champion).l, "#ffcb52"]); }
}

/* ---------- panel de staff ---------- */
S.adm.po = {size: 0, third: false, bo: {qf: 1, sf: 3, f: 3, t3: 1}};
function admPlayoffs(R, Dr) {
  const doc = playoffDoc(), n = TEAM_KEYS.length;
  if (!doc) {
    const P = S.adm.po, def = PO_SIZES.filter(x => x <= n).reduce((a, x) => Math.abs(x - (+R.cfg.playoff || 4)) < Math.abs(a - (+R.cfg.playoff || 4)) ? x : a, 2), size = P.size || def;
    const seeds = Dr.real.slice(0, size).map(r => r.k), rounds = poTemplate(size, P.third);
    return `<div class="adm-card"><h3>${ico("i-trophy")} Armar los playoffs <small>con la tabla actual</small></h3>
      <div class="fgrid">${fld("Equipos que clasifican", `<select id="poSize">${PO_SIZES.filter(x => x <= n).map(x => opt(x, `${x} equipos${x === 6 ? " (1° y 2° pasan directo a semis)" : ""}`, x === size)).join("")}</select>`)}
        ${rounds.map(r => fld(`${PO_NAME[r.key]}: al mejor de`, `<select data-po-bo="${r.key}">${[1, 3, 5].map(b => opt(b, b === 1 ? "1 (partido único)" : String(b), +P.bo[r.key] === b)).join("")}</select>`)).join("")}
        ${size >= 4 ? fld("Tercer puesto", `<span class="chk"><input type="checkbox" id="poThird" ${P.third ? "checked" : ""}>Jugar el partido por el 3°</span>`) : ""}</div>
      <div class="po-seeds">${seeds.map((k, i) => `<span style="--tc:${TM(k).c}"><b>${i + 1}</b>${img(k)}${esc(TM(k).name)}</span>`).join("")}</div>
      <div class="rowbtns"><button class="btn sm gold" data-act="po-make">Armar el cuadro</button><span class="adm-note">Los cruces salen de la tabla: el 1° juega con el último clasificado. Los resultados de playoffs no suman a la tabla.</span></div></div>`;
  }
  const st = poState(doc), U = isUltra(), maps = M.cfg.maps.filter(x => x.on !== false);
  const card = s => {
    const can = s.a && s.b, games = s.games.length ? s.games : (can ? [{ra: "", rb: "", map: ""}] : []);
    return `<div class="po-ed ${s.winner ? "done" : ""}"><div class="po-ed-h"><b>${s.id.toUpperCase()}</b> ${s.a ? `${img(s.a)}${esc(TM(s.a).name)}` : "A definir"} <span class="muted">vs</span> ${s.b ? `${esc(TM(s.b).name)}${img(s.b)}` : "A definir"}${s.winner ? `<span class="st ok">Pasa ${esc(TM(s.winner).name)}</span>` : ""}</div>
      ${can ? `<div class="fgrid">${fld("Día y hora", `<input type="datetime-local" value="${esc((s.date || "").slice(0, 16))}" data-po="${s.id}:date">`)}</div>
      <div class="po-games">${games.map((g, i) => `<div class="po-g"><span class="mono muted">P${i + 1}</span><input class="cell-in" type="number" min="0" max="40" value="${g.ra ?? ""}" data-po="${s.id}:${i}:ra" aria-label="Rondas ${esc(TM(s.a).name)}"><span>-</span><input class="cell-in" type="number" min="0" max="40" value="${g.rb ?? ""}" data-po="${s.id}:${i}:rb" aria-label="Rondas ${esc(TM(s.b).name)}">
        <select class="cell-in" data-po="${s.id}:${i}:map" aria-label="Mapa">${opt("", "Mapa", !g.map)}${maps.map(x => opt(x.n, x.n, g.map === x.n)).join("")}</select>${s.games.length ? `<button class="btn sm ghost icon-only" data-act="po-gdel:${s.id}:${i}" aria-label="Borrar partido">${ico("i-close")}</button>` : ""}</div>`).join("")}
        ${!s.winner && s.games.length && s.games.length < s.bo ? `<button class="btn sm ghost" data-act="po-gadd:${s.id}">+ Partido ${s.games.length + 1}</button>` : ""}</div>` : '<p class="adm-note">Se completa cuando terminen las series anteriores.</p>'}</div>`; };
  return `${st.champion ? `<div class="adm-card"><h3>${ico("i-trophy")} ${esc(TM(st.champion).name)} es campeón</h3><p class="adm-note">Cuando quieras, cerrá la temporada desde General: queda guardada en Historia con este campeón.</p></div>` : ""}
    ${st.rounds.map(r => `<div class="adm-card"><h3>${r.name} <small>${r.bo > 1 ? "al mejor de " + r.bo : "partido único"}</small></h3><div class="po-eds">${r.series.map(card).join("")}</div></div>`).join("")}
    <div class="adm-card"><div class="rowbtns"><a class="btn sm ghost" href="#playoffs" data-act="close">Ver el cuadro público</a>${U ? `<button class="btn sm danger" data-act="po-del">Borrar el cuadro</button>` : ""}</div></div>`;
}
function poDocCopy() { return clone(S.remote.playoffs.current); }
async function poAdminAct(act, a, b) {
  if (act === "po-make") {
    const R = RM(), Dr = deriveFor(R), P = S.adm.po, size = +(($("#poSize") || {}).value) || P.size || 4;
    if (Dr.real.length < size) { toast("No hay suficientes equipos."); return true; }
    const doc = {size, third: size >= 4 && !!P.third, bo: {...P.bo}, seeds: Dr.real.slice(0, size).map(r => r.k), series: {}, at: Date.now(), by: S.staff.u, season: R.cfg.season};
    await save("playoffs/current", doc); audit(`Armó los playoffs (${size} equipos): ${doc.seeds.map((k, i) => `${i + 1}° ${TM(k).name}`).join(", ")}`);
    toast("Cuadro armado."); renderAdminSoon(); return true;
  }
  if (act === "po-gadd" || act === "po-gdel") {
    const d = poDocCopy(), sid = a[0]; d.series = d.series || {}; const x = d.series[sid] = d.series[sid] || {games: []}; x.games = x.games || [];
    if (act === "po-gadd") x.games.push({ra: null, rb: null, map: ""}); else x.games.splice(+a[1], 1);
    await save("playoffs/current", d); renderAdminSoon(); return true;
  }
  if (act === "po-del") {
    if (!await confirmTyped({title: "Borrar el cuadro de playoffs", html: "<p>Se borran las series y sus resultados.</p>", word: "BORRAR", btn: "Borrar el cuadro"})) return true;
    await save("playoffs/current", null, "del"); audit("Borró el cuadro de playoffs"); renderAdminSoon(); return true;
  }
  return false;
}
$("#adminRoot").addEventListener("change", async e => {
  const t = e.target;
  if (t.id === "poSize") { S.adm.po.size = +t.value; renderAdminSoon(); return; }
  if (t.id === "poThird") { S.adm.po.third = t.checked; renderAdminSoon(); return; }
  if (t.dataset && t.dataset.poBo) { S.adm.po.bo[t.dataset.poBo] = +t.value; return; }
  if (!(t.dataset && t.dataset.po) || !S.staff) return;
  const [sid, i, f] = t.dataset.po.split(":"), d = poDocCopy(); if (!d) return;
  d.series = d.series || {}; const x = d.series[sid] = d.series[sid] || {games: []}; x.games = x.games || [];
  if (i === "date") x.date = t.value || "";
  else { while (x.games.length <= +i) x.games.push({ra: null, rb: null, map: ""}); x.games[+i][f] = f === "map" ? t.value : (t.value === "" ? null : Math.max(0, Math.min(40, Math.round(+t.value)))); }
  const before = poState(playoffDoc()), sb = before.rounds.flatMap(r => r.series).find(s => s.id === sid);
  await save("playoffs/current", d);
  const after = poState(d), sa = after.rounds.flatMap(r => r.series).find(s => s.id === sid);
  if (sa && sa.winner && (!sb || sb.winner !== sa.winner)) { audit(`Playoffs ${sid.toUpperCase()}: pasa ${TM(sa.winner).name} (${sa.wa}-${sa.wb})`); toast(`${TM(sa.winner).name} gana la serie.`, sa.winner); }
  if (after.champion && !before.champion) { confetti([TM(after.champion).c, TM(after.champion).l, "#ffcb52"]); audit(`Playoffs: ${TM(after.champion).name} campeón`); }
  renderAdminSoon();
});
$("#poFull") && $("#poFull").addEventListener("click", () => { const el = $("#poBracket"); if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); });

/* ================= historia: temporadas archivadas y salón de la fama ================= */
const seasonList = () => Object.values(S.remote.seasons || {}).filter(s => s && s.name).sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
const stName = (s, k) => (s.teams && s.teams[k] && s.teams[k].name) || (k ? TM(k).name : "–");
const stColor = (s, k) => (s.teams && s.teams[k] && s.teams[k].c) || TM(k).c;
// Carrera de cada jugador: temporadas archivadas + la actual
function careerOf(pid) {
  const rows = seasonList().map(s => s.players && s.players[pid] ? {season: s.name, id: s.id, champ: s.champion && s.players[pid].team === s.champion, ...s.players[pid]} : null).filter(Boolean).reverse();
  const p = D.PM[pid]; if (p && p.s.m) rows.push({season: M.cfg.season, cur: true, team: p.lastTeam, m: p.s.m, k: p.s.k, d: p.s.d, a: p.s.a, acs: p.s.acs, kd: p.s.kd, w: p.s.w});
  return rows;
}
function careerHtml(pid) {
  const rows = careerOf(pid); if (rows.length < 2 && !(rows[0] && !rows[0].cur)) return "";
  const tot = rows.reduce((t, r) => ({m: t.m + r.m, k: t.k + r.k, d: t.d + r.d, a: t.a + r.a, acsS: t.acsS + r.acs * r.m, w: t.w + (r.w || 0), titles: t.titles + (r.champ ? 1 : 0)}), {m: 0, k: 0, d: 0, a: 0, acsS: 0, w: 0, titles: 0});
  return `<div class="career"><div class="h3" style="font-size:15px">Carrera en ONYX <small class="muted">${rows.length} temporada${rows.length > 1 ? "s" : ""}${tot.titles ? ` · ${tot.titles} título${tot.titles > 1 ? "s" : ""}` : ""}</small></div>
    <div class="car-rows">${rows.map(r => `<div class="${r.cur ? "cur" : ""}"><span>${esc(r.season)}${r.champ ? ` <i class="car-cup" title="Campeón">${ico("i-trophy")}</i>` : ""}${r.cur ? ' <em>en curso</em>' : ""}</span><span>${r.team ? img(r.team) : ""}</span><span class="mono">${r.m} PJ</span><span class="mono">${r.k}/${r.d}/${r.a}</span><span class="mono">${dec(r.kd)} K/D</span><span class="mono">${r.acs} ACS</span></div>`).join("")}
      <div class="tot"><span>Total</span><span></span><span class="mono">${tot.m} PJ</span><span class="mono">${tot.k}/${tot.d}/${tot.a}</span><span class="mono">${dec(tot.d ? tot.k / tot.d : tot.k)} K/D</span><span class="mono">${tot.m ? Math.round(tot.acsS / tot.m) : 0} ACS</span></div></div></div>`;
}
// Récords de todas las temporadas (archivadas + la actual)
function allTime() {
  const acc = {};
  const add = (pid, name, team, s, champ) => { const x = acc[pid] = acc[pid] || {pid, name, team, m: 0, k: 0, d: 0, a: 0, acsS: 0, w: 0, seasons: 0, titles: 0}; x.name = name || x.name; x.team = team || x.team; x.m += s.m; x.k += s.k; x.d += s.d; x.a += s.a; x.acsS += s.acs * s.m; x.w += s.w || 0; x.seasons++; if (champ) x.titles++; };
  seasonList().forEach(s => Object.entries(s.players || {}).forEach(([pid, p]) => add(pid, p.name, p.team, p, s.champion && p.team === s.champion)));
  D.P.filter(p => p.s.m).forEach(p => add(p.id, p.name, p.lastTeam, p.s, false));
  return Object.values(acc).map(x => ({...x, acs: x.m ? Math.round(x.acsS / x.m) : 0, kd: x.d ? x.k / x.d : x.k}));
}
function renderHistory() {
  const sec = $("#historia"); if (!sec) return;
  const list = seasonList(), titles = {};
  list.forEach(s => { if (s.champion) titles[s.champion] = (titles[s.champion] || 0) + 1; });
  const po = poState(playoffDoc()), cur = po && po.champion ? po.champion : null;
  $("#histSeasons").innerHTML = list.length ? list.map(s => { const c = s.champion, mv = s.awards && s.awards.mvp;
    return `<button class="hs-card" type="button" data-season="${esc(s.id)}" style="--tc:${c ? stColor(s, c) : "var(--accent)"}">${c ? `<img class="hs-em" src="${esc(EMB[c] || "")}" alt="">` : ""}<span class="hs-y">${esc(s.name)}</span>
      ${TROPHY}<b class="hs-c">${c ? esc(stName(s, c)) : "Sin campeón"}</b><span class="hs-r">${s.runnerUp ? `Subcampeón: ${esc(stName(s, s.runnerUp))}` : ""}</span>
      <span class="hs-m">${mv ? `MVP: <b>${esc(mv.name)}</b>` : ""}</span><span class="hs-n">${s.matches || 0} partidos · ${s.fechas || 0} fechas</span></button>`; }).join("")
    : `<div class="hs-empty panel pad cut">${TROPHY}<div><b>Acá van a quedar los campeones de cada temporada.</b><p class="muted">Cuando termine ${esc(M.cfg.season)}, el staff la cierra y queda guardada con la tabla final, el campeón, los premios y las estadísticas de cada jugador.${cur ? ` Por ahora, ${esc(TM(cur).name)} ganó los playoffs.` : ""}</p></div></div>`;
  const tt = Object.entries(titles).sort((a, b) => b[1] - a[1]);
  $("#histTitles").innerHTML = tt.length ? tt.map(([k, n], i) => `<div class="ht-row" style="--tc:${TM(k).c}"><span class="pos">${i + 1}</span>${img(k)}<b>${esc(TM(k).name)}</b><span class="ht-n">${"★".repeat(Math.min(n, 6))}<em>${n}</em></span></div>`).join("") : '<p class="empty">Todavía no hay títulos.</p>';
  const at = allTime(), minM = 6;
  const board = (title, f, fmtv, filt = () => true) => `<div class="rec"><div class="rec-t">${title}</div>${at.filter(filt).sort((a, b) => f(b) - f(a)).slice(0, 5).map((x, i) => `<button type="button" class="rec-r" data-p="${x.pid}"><span class="pos">${i + 1}</span>${x.team ? img(x.team) : '<span class="ava">LB</span>'}<b>${esc(x.name)}</b><span class="mono">${fmtv(x)}</span></button>`).join("") || '<p class="empty">Sin datos.</p>'}</div>`;
  $("#histRecords").innerHTML = board("Kills", x => x.k, x => fmt(x.k)) + board("Asistencias", x => x.a, x => fmt(x.a)) + board("Partidos jugados", x => x.m, x => fmt(x.m))
    + board(`ACS promedio <small>mín. ${minM} PJ</small>`, x => x.acs, x => x.acs, x => x.m >= minM) + board(`K/D <small>mín. ${minM} PJ</small>`, x => x.kd, x => dec(x.kd), x => x.m >= minM) + (tt.length ? board("Más títulos", x => x.titles * 1000 + x.m, x => x.titles + " ★", x => x.titles > 0) : "");
  const tp = $("#histTitlesBox"); if (tp) { tp.hidden = !tt.length; tp.parentElement.classList.toggle("one", !tt.length); }
}
function openSeason(id) {
  const s = (S.remote.seasons || {})[id]; if (!s) return;
  const pl = Object.entries(s.players || {}).map(([pid, p]) => ({pid, ...p}));
  const top = (f, n = 5) => [...pl].sort((a, b) => f(b) - f(a)).slice(0, n);
  modal(`<div class="box cut hs-modal" style="--tc:${s.champion ? stColor(s, s.champion) : "var(--accent)"}"><div class="bh">${s.champion ? img(s.champion) : ""}<div><div class="eyebrow">${esc(s.name)}${s.closedAt ? ` · cerrada el ${new Date(s.closedAt).toLocaleDateString("es-AR")}` : ""}</div><h3>${s.champion ? `${esc(stName(s, s.champion))}, campeón` : "Temporada sin campeón"}</h3></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="bb"><div class="tbl-wrap"><table class="st hs-tbl"><thead><tr><th>#</th><th>Equipo</th><th>Pts</th><th>PJ</th><th>V</th><th>D</th><th>Dif</th></tr></thead><tbody>${(s.standings || []).map(r => `<tr class="${r.k === s.champion ? "champ" : ""}"><td>${r.pos}</td><td><span class="tcell">${img(r.k)}${esc(r.name)}</span></td><td><b>${r.pts}</b></td><td>${r.pj}</td><td>${r.g + r.gp}</td><td>${r.pp + r.p}</td><td>${r.dif > 0 ? "+" : ""}${r.dif}</td></tr>`).join("")}</tbody></table></div>
      ${s.awards && Object.keys(s.awards).length ? `<div class="h3" style="font-size:15px;margin-top:14px">Premios</div><div class="hs-aw">${Object.values(s.awards).map(a => `<span>${a.team ? img(a.team) : ""}<small>${esc(a.label)}</small><b>${esc(a.name)}</b></span>`).join("")}</div>` : ""}
      <div class="h3" style="font-size:15px;margin-top:14px">Los que más</div>
      <div class="hs-top">${[["Kills", x => x.k, x => x.k], ["ACS", x => x.m >= 3 ? x.acs : 0, x => x.acs], ["K/D", x => x.m >= 3 ? x.kd : 0, x => dec(x.kd)]].map(([l, f, v]) => `<div><small>${l}</small>${top(f, 3).map(x => `<span>${x.team ? img(x.team) : ""}<b>${esc(x.name)}</b><i class="mono">${v(x)}</i></span>`).join("")}</div>`).join("")}</div></div></div>`);
}
$("#histSeasons") && $("#histSeasons").addEventListener("click", e => { const b = e.target.closest("[data-season]"); if (b) openSeason(b.dataset.season); });
$("#histRecords") && $("#histRecords").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b && D.PM[b.dataset.p]) openPlayer(b.dataset.p); else if (b) toast("Ese jugador ya no está en la liga."); });

/* ================= jugadores con cuenta (entran con Discord) ================= */
// Cada jugador entra con su Discord (sin contraseñas) y vincula su cuenta con su jugador de la liga
// (lo aprueba su capitán o el staff). Con eso confirma si juega, hace pronósticos y vota en su equipo.
S.member = null; S.myPicks = {}; S.myLink = null; S.membersList = {};
let memSubs = [], dLoginTok = null;
// Vuelta del login con Discord: #dlogin=<token> (se procesa apenas carga la página)
(function readDiscordReturn() {
  const h = location.hash;
  if (h.startsWith("#dlogin=")) { dLoginTok = decodeURIComponent(h.slice(8)); history.replaceState(null, "", location.pathname + location.search + "#perfil"); }
  else if (/^#perfil&login=/.test(h)) {
    const why = h.split("login=")[1]; history.replaceState(null, "", location.pathname + location.search + "#perfil");
    setTimeout(() => toast({cancel: "Cancelaste el ingreso con Discord.", nocfg: "El ingreso con Discord todavía no está configurado (falta DISCORD_CLIENT_SECRET en Netlify).", state: "El ingreso venció. Probá de nuevo.", banned: "Tu cuenta está bloqueada. Hablá con el staff."}[why] || "No se pudo entrar con Discord. Probá de nuevo."), 600);
  }
})();
function finishDiscordLogin() {
  if (!dLoginTok || !AUTH) return; const t = dLoginTok; dLoginTok = null;
  AUTH.signInWithCustomToken(t).then(() => toast("Entraste con Discord. ¡Bienvenido!")).catch(() => toast("No se pudo entrar con Discord. Probá de nuevo."));
}
function onMemberAuth(user) {
  memSubs.splice(0).forEach(f => { try { f(); } catch (e) {} });
  S.member = null; S.myPicks = {}; S.myLink = null; S.myCoachReq = null; S.myNotes = null; myNotesAt = 0; S.cn = {notes: [], loaded: false, busy: false, err: ""}; S.seg.pid = null;
  if (!user || !isMemberUid(user.uid)) return;
  S.member = {uid: user.uid, name: "", avatar: "", pid: null};
  memSubs.push(FDB.doc(`members/${user.uid}`).onSnapshot(s => { S.member = {uid: user.uid, ...(s.exists ? s.data() : {})}; schedule(); }, () => {}));
  memSubs.push(FDB.doc(`pickem/${user.uid}`).onSnapshot(s => { if (!pickPending.size) S.myPicks = (s.exists && s.data().picks) || {}; schedule(); }, () => {}));
  memSubs.push(FDB.doc(`requests/link_${user.uid}`).onSnapshot(s => { S.myLink = s.exists ? s.data() : null; schedule(); }, () => {}));
  memSubs.push(FDB.doc(`requests/coachreg_${user.uid}`).onSnapshot(s => { S.myCoachReq = s.exists ? s.data() : null; schedule(); }, () => {}));
}
function memberLogout() { setTimeout(() => AUTH && AUTH.signOut(), 150); toast("Sesión cerrada."); }
const myPid = () => (S.member && S.member.pid && D.PM[S.member.pid]) ? S.member.pid : null;
const DC_BTN = (txt = "Entrar con Discord") => `<a class="btn dc-login" href="/api/auth/discord">${ico("i-chat")}<span>${txt}</span></a>`;

/* ---------- Mi perfil ---------- */
const ATT_S = {si: ["Juego", "win"], duda: ["En duda", "gold"], no: ["No puedo", "loss"]};
function nextFor(k) { const ps = D.pending.filter(m => m.a === k || m.b === k); if (!ps.length) return null; const f = Math.min(...ps.map(m => m.fecha)); return {f, games: ps.filter(m => m.fecha === f).sort((a, b) => (a.legN || 0) - (b.legN || 0))}; }
const attOf = (f, pid) => (S.remote.att || {})[`${f}_${pid}`] || null;
function renderProfile() {
  const root = $("#profRoot"); if (!root) return;
  { const pid0 = S.member ? myPid() : null, k0 = pid0 && D.PM[pid0].team, nx0 = k0 ? nextFor(k0) : null, need = !!(nx0 && !attOf(nx0.f, pid0)), ha = $("#heroAtt");
    if (ha) { ha.hidden = !need; if (need) $("#heroAttTxt").textContent = `Confirmá si jugás la fecha ${nx0.f}`; } }
  if (!S.member) {
    root.innerHTML = S.staff || S.captain ? `<div class="panel pad cut"><p class="muted">Entraste con tu cuenta de ${S.staff ? "staff" : "capitán"}. El perfil de jugador es para entrar con Discord: cerrá sesión y entrá con el botón de Discord.</p></div>`
      : `<div class="prof-cta panel pad cut"><div class="pc-l"><div class="eyebrow">Para jugadores</div><h3>Tu lugar en ONYX</h3><p class="muted">Entrá con Discord o creá tu cuenta con tu mail, y vinculala con tu jugador.</p><div class="rowbtns">${DC_BTN()}<button class="btn" type="button" data-signup="player">${ico("i-user")}<span>Crear cuenta con mail</span></button></div><small class="muted">De Discord solo vemos tu nombre y tu foto. Tu mail no se muestra.</small>
        <div class="pc-coach">${ico("i-whistle")}<span><b>¿Sos coach?</b> Creá tu cuenta, pedí tu equipo y seguí a tus jugadores con estadísticas, gráficos y notas.</span><button class="btn sm gold" type="button" data-signup="coach">Soy coach</button></div></div>
        <div class="pc-r">${[["i-check", "Confirmá si jugás", "Tu capitán ve quién confirmó para la próxima fecha."], ["i-target", "Pronosticá", "Elegí quién gana cada partido y competí en el ranking."], ["i-crown", "Votá en tu equipo", "La votación de capitán es real: firmás y votás desde acá."], ["i-chart", "Tus números", "Tus estadísticas de la temporada y de toda tu carrera."]].map(([i, t, d]) => `<div class="pc-f">${ico(i)}<b>${t}</b><span>${d}</span></div>`).join("")}</div></div>`;
    return;
  }
  const me = S.member, pid = myPid();
  const head = `<div class="prof-head panel pad cut" style="--tc:${pid && D.PM[pid].team ? TM(D.PM[pid].team).c : "var(--accent)"}"><span class="prof-ava">${me.avatar ? `<img src="${esc(me.avatar)}" alt="" referrerpolicy="no-referrer">` : ico("i-user")}</span>
    <div><div class="eyebrow">${isMailMember() ? "Cuenta con mail" : "Discord · " + esc(me.username || me.name || "")}${myCoachTeams().length ? " · Coach" : ""}</div><h3>${esc(pid ? D.PM[pid].name : me.name || "Jugador")}</h3><div class="muted">${pid ? `${esc(D.PM[pid].role)} · ${D.PM[pid].team ? esc(TM(D.PM[pid].team).name) : "Agente libre"} · valor ${fmt(D.PM[pid].value)}` : myCoachTeams().length ? "Coach de " + myCoachTeams().map(k => esc(TM(k).name)).join(" y ") : me.role === "coach" ? "Coach" : "Cuenta sin vincular"}</div></div>
    ${pid && D.PM[pid].team ? img(D.PM[pid].team, "prof-em") : ""}<span class="sp"></span>${isMailMember() ? `<button class="btn sm ghost" id="profAcct" type="button">${ico("i-key")}<span>Contraseña</span></button>` : ""}<button class="btn sm ghost" id="profOut" type="button">${ico("i-logout")}<span>Salir</span></button></div>`;
  if (!pid && (me.role === "coach" || myCoachTeams().length || S.myCoachReq)) {
    root.innerHTML = head + `<div class="prof-grid"><div class="prof-main">${coachProfileHtml()}</div><div class="prof-side"><div class="panel pad cut"><div class="h3">${ico("i-target")} Pronósticos</div><p class="muted">También podés jugar a los pronósticos de cada fecha.</p><a class="btn sm" href="#pronosticos">Ver pronósticos</a></div></div></div>`;
    $("#profOut").addEventListener("click", memberLogout); return;
  }
  if (!pid) {
    const L = S.myLink, pend = L && L.status === "pend", rej = L && L.status === "no";
    root.innerHTML = head + `<div class="panel pad cut prof-link"><div class="h3">¿Quién sos en la liga?</div>
      ${pend ? `<p class="muted">Pediste vincular tu cuenta con <b>${esc(L.pname)}</b>. Lo aprueba tu capitán o el staff.</p>` : `${rej ? `<p class="muted">El vínculo con <b>${esc(L.pname)}</b> fue rechazado. Si es un error, avisale a tu capitán.</p>` : ""}
        <p class="muted">Buscá tu nombre y tocá “Soy yo”. Tu capitán o el staff lo confirman.</p><input class="cell-in" id="plQ" placeholder="Tu nick en la liga" autocomplete="off" style="max-width:320px">
        <div class="pl-list" id="plList"></div>`}</div><div class="panel pad cut seg-cta"><p class="muted" style="margin:0">¿No sos jugador sino coach? <button type="button" class="linkish" data-coach-req>Pedí ser coach de un equipo</button></p></div>`;
    if (!pend) { const draw = () => { const q = normTxt($("#plQ").value.trim()); $("#plList").innerHTML = D.P.filter(p => !q || normTxt(p.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 24).map(p => `<button type="button" class="pl-it" data-link="${p.id}" style="--tc:${p.team ? TM(p.team).c : "#777"}">${p.team ? img(p.team) : '<span class="ava">LB</span>'}<b>${esc(p.name)}</b><small>${esc(p.role)}${p.team ? " · " + esc(TM(p.team).name) : ""}</small><em>Soy yo</em></button>`).join("") || '<p class="muted">No encontré ese nombre. Si no estás cargado, pedile a tu capitán que te agregue.</p>'; }; $("#plQ").addEventListener("input", draw); draw(); }
    $("#profOut").addEventListener("click", memberLogout);
    return;
  }
  const p = D.PM[pid], k = p.team, nx = k ? nextFor(k) : null, a = nx ? attOf(nx.f, pid) : null;
  const mates = nx ? roster(k).map(x => ({x, s: attOf(nx.f, x.id)})) : [], yes = mates.filter(x => x.s && x.s.s === "si").length;
  const att = nx ? `<div class="panel pad cut prof-att"><div class="h3">${ico("i-check")} Fecha ${nx.f}: ¿jugás?</div><p class="muted">${nx.games.map(g => `${legName(g)} vs ${esc(TM(g.a === k ? g.b : g.a).name)} · ${fmtDate(g.date)}`).join("<br>")}</p>
      <div class="att-btns">${Object.entries(ATT_S).map(([v, [l, c]]) => `<button type="button" class="att-opt ${a && a.s === v ? "on" : ""}" data-att="${v}" style="--c:var(--${c})">${l}</button>`).join("")}</div>
      <p class="adm-note">${yes} de ${mates.length} de ${esc(TM(k).name)} confirmaron que juegan.</p></div>` : "";
  const s = p.s, board = (S.remote.pickboard && S.remote.pickboard.rows) || [], mine = board.find(r => r.uid === me.uid);
  const stats = `<div class="panel pad cut"><div class="h3">${ico("i-chart")} Tu temporada</div><div class="pstats" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div><b>${s.m}</b><span>Partidos</span></div><div><b>${s.k}/${s.d}/${s.a}</b><span>K/D/A</span></div><div><b>${dec(s.kd)}</b><span>K/D</span></div><div><b>${s.acs}</b><span>ACS</span></div></div>${careerHtml(pid)}
      <div class="rowbtns" style="margin-top:10px"><button class="btn sm" type="button" data-prof-an="${pid}">Ver mi análisis completo</button></div></div>`;
  const mot = k ? Object.entries(S.remote.motions || {}).map(([id, m]) => ({id, ...m})).find(m => m.team === k && ["firmas", "votacion"].includes(m.status)) : null;
  const side = `<div class="panel pad cut"><div class="h3">${ico("i-target")} Pronósticos</div><p class="muted">${mine ? `Vas <b>${mine.pos}°</b> con <b>${mine.pts}</b> punto${mine.pts === 1 ? "" : "s"} (${mine.hits} de ${mine.n} aciertos).` : "Todavía no sumaste puntos. Elegí quién gana cada partido de la fecha."}</p><a class="btn sm gold" href="#pronosticos">Hacer mis pronósticos</a></div>
    <div class="panel pad cut"><div class="h3">${ico("i-crown")} Capitanía de ${k ? esc(TM(k).name) : "tu equipo"}</div><p class="muted">${mot ? (mot.status === "firmas" ? `Hay una moción para que <b>${esc(mot.candName)}</b> sea capitán: junta firmas.` : `Se está votando si <b>${esc(mot.candName)}</b> pasa a ser capitán.`) : "No hay votaciones abiertas en tu equipo."}</p><a class="btn sm" href="#capitania">Ir a la votación</a></div>
    <div class="panel pad cut"><button class="linkish" id="profUnlink" type="button">Desvincular mi cuenta de ${esc(p.name)}</button></div>`;
  root.innerHTML = head + `<div class="prof-grid"><div class="prof-main">${att}${stats}${riotIdCard(pid)}${k ? playerCoachHtml(pid) : ""}</div><div class="prof-side">${myCoachTeams().length || S.myCoachReq ? coachProfileHtml() : ""}${side}</div></div>`;
  $("#profOut").addEventListener("click", memberLogout);
}
$("#profRoot") && $("#profRoot").addEventListener("click", async e => {
  const l = e.target.closest("[data-link]");
  if (l) { const p = D.PM[l.dataset.link]; if (!p) return; l.disabled = true; try { await api("/api/member", {action: "link", pid: p.id}); toast(`Pedido enviado: ${p.name}. Lo confirma tu capitán o el staff.`); } catch (er) { toast(er.message); l.disabled = false; } return; }
  const at = e.target.closest("[data-att]");
  if (at) { const pid = myPid(), k = pid && D.PM[pid].team, nx = k && nextFor(k); if (!nx) return; const cur = attOf(nx.f, pid), v = cur && cur.s === at.dataset.att ? null : at.dataset.att;
    $$("#profRoot .att-opt").forEach(x => x.classList.toggle("on", x === at && !!v)); at.disabled = true;
    try { await api("/api/member", {action: "att", fecha: nx.f, s: v}); toast(v ? `Listo: ${ATT_S[v][0].toLowerCase()}.` : "Borraste tu respuesta."); } catch (er) { toast(er.message); } at.disabled = false; return; }
  const an = e.target.closest("[data-prof-an]"); if (an) { openAnalysis(an.dataset.profAn); return; }
  if (e.target.closest("#profUnlink")) { if (!await confirmTyped({title: "Desvincular tu cuenta", html: "<p>Vas a dejar de poder confirmar asistencia y votar hasta que te vuelvas a vincular.</p>", word: "SI", btn: "Desvincular", danger: false})) return; try { await api("/api/member", {action: "unlink"}); toast("Cuenta desvinculada."); } catch (er) { toast(er.message); } }
});

/* ---------- Pronósticos ---------- */
const pickPending = new Map(); let pickT = 0;
const pickOpen = m => m.status !== "played" && !(parseLocal(m.date) && parseLocal(m.date).getTime() <= Date.now());
function pkCard(m) {
  const agg2 = S.remote.pickagg || {}, can = !!S.member;
  { const ag = agg2[m.id] || {}, na = Math.max(0, +ag.a || 0), nb = Math.max(0, +ag.b || 0), tot = na + nb, pa = tot ? Math.round(na / tot * 100) : 50, mine = S.myPicks[m.id], open = pickOpen(m);
    const side = (k, s) => `<button type="button" class="pk-t ${mine === s ? "on" : ""}" data-pick="${m.id}:${s}" ${can && open ? "" : "disabled"} style="--tc:${TM(k).c}">${img(k)}<b>${esc(TM(k).name)}</b></button>`;
    return `<div class="pk-card ${open ? "" : "locked"}"><div class="pk-h"><span>${m.leg ? LEG_L[m.leg] : "Partido"}</span><span>${open ? fmtDate(m.date) : "Cerrado"}</span></div><div class="pk-vs">${side(m.a, "a")}<span class="vs">vs</span>${side(m.b, "b")}</div>
      <div class="pk-bar" title="${tot} pronóstico${tot === 1 ? "" : "s"}"><i style="width:${pa}%;--tc:${TM(m.a).c}"></i><i style="width:${100 - pa}%;--tc:${TM(m.b).c}"></i></div><div class="pk-pct"><span>${tot ? pa + "%" : ""}</span><small>${tot ? `${tot} voto${tot === 1 ? "" : "s"}` : "Sé el primero"}</small><span>${tot ? 100 - pa + "%" : ""}</span></div></div>`; }
}
function renderHomePk() {
  const box = $("#homePk"); if (!box) return;
  const open = D.pending.filter(pickOpen), f = open.length ? Math.min(...open.map(m => m.fecha)) : null;
  $("#homePkT").textContent = f ? `¿Quién gana la fecha ${f}?` : "Pronósticos";
  if (!f) { const B = S.remote.pickboard, rows = (B && B.rows) || [];
    box.innerHTML = rows.length ? `<div class="pkb">${rows.slice(0, 3).map(r => `<div class="pkb-r ${S.member && r.uid === S.member.uid ? "me" : ""}"><span class="pos">${r.pos}</span><span class="pkb-a">${r.avatar ? `<img src="${esc(r.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</span><b>${esc(r.name)}</b><span class="mono muted">${r.hits}/${r.n}</span><span class="pts">${r.pts}<small>pts</small></span></div>`).join("")}</div><p class="muted" style="font-size:13px;margin-top:8px">Los pronósticos vuelven con la próxima fecha.</p>`
      : '<p class="empty">Los pronósticos vuelven con la próxima fecha.</p>'; return; }
  const list = byCruce(open.filter(m => m.fecha === f)), mineN = list.filter(m => S.myPicks[m.id]).length;
  const n = discordUrl() ? 2 : 4;
  box.innerHTML = `<div class="home-pk"><div class="pk-grid" id="homePkGrid">${list.slice(0, n).map(pkCard).join("")}</div><p class="muted" style="font-size:13px">${S.member ? `Elegiste ${mineN} de ${list.length} partidos de la fecha.` : "Entrá con Discord para jugar: 1 punto por acierto."}${list.length > 2 ? ` <a href="#pronosticos" style="color:var(--accent-hi)">Ver los ${list.length}</a>` : ""}</p></div>`;
}
function renderPickem() {
  renderHomePk();
  const root = $("#pkRoot"); if (!root) return;
  const fs = [...new Set(D.pending.map(m => m.fecha))].sort((a, b) => a - b).slice(0, 2), can = !!S.member;
  const groups = fs.map(f => `<div class="pk-f"><div class="h3">Fecha ${f}</div><div class="pk-grid">${byCruce(D.pending.filter(m => m.fecha === f)).map(pkCard).join("")}</div></div>`).join("");
  const last = D.lastF ? D.played.filter(m => m.fecha === D.lastF && S.myPicks[m.id]) : [];
  const res = can && last.length ? `<div class="pk-res">${last.map(m => { const w = winnerSide(m), ok = S.myPicks[m.id] === w; return `<span class="${ok ? "ok" : "no"}">${img(S.myPicks[m.id] === "a" ? m.a : m.b)}${ok ? "Acertaste" : "Fallaste"} · ${esc(TM(m.a).name)} ${m.ra}-${m.rb} ${esc(TM(m.b).name)}</span>`; }).join("")}</div>` : "";
  root.innerHTML = (can ? "" : `<div class="pk-cta panel pad cut"><div><b>Entrá con Discord para jugar</b><span class="muted">Elegí quién gana cada partido. 1 punto por acierto.</span></div>${DC_BTN()}</div>`) + res
    + (groups || '<p class="empty">No quedan partidos por pronosticar.</p>');
  const B = S.remote.pickboard, rows = (B && B.rows) || [];
  $("#pkBoard").innerHTML = rows.length ? rows.slice(0, 25).map(r => `<div class="pkb-r ${S.member && r.uid === S.member.uid ? "me" : ""}"><span class="pos">${r.pos}</span><span class="pkb-a">${r.avatar ? `<img src="${esc(r.avatar)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</span><b>${esc(r.name)}</b><span class="mono muted">${r.hits}/${r.n}</span><span class="pts">${r.pts}<small>pts</small></span></div>`).join("")
    : '<p class="empty">El ranking arranca con los primeros resultados.</p>';
}
const winnerSide = m => m.noShow === "a" ? "b" : m.noShow === "b" ? "a" : +m.ra > +m.rb ? "a" : "b";
const onPickClick = e => {
  const b = e.target.closest("[data-pick]"); if (!b || b.disabled || !S.member) return;
  const [mid, s] = b.dataset.pick.split(":"), v = S.myPicks[mid] === s ? null : s;
  S.myPicks = {...S.myPicks}; if (v) S.myPicks[mid] = v; else delete S.myPicks[mid];
  pickPending.set(mid, v); renderPickem();
  clearTimeout(pickT); pickT = setTimeout(async () => {
    const picks = Object.fromEntries(pickPending); pickPending.clear();
    try { await api("/api/member", {action: "pickem", picks}); } catch (er) { toast(er.message); }
  }, 700);
};
$("#pkRoot") && $("#pkRoot").addEventListener("click", onPickClick);
$("#homePk") && $("#homePk").addEventListener("click", e => { if (e.target.closest("[data-pick]")) onPickClick(e); else if (e.target.closest(".pk-t:disabled") && !S.member) goView("pronosticos"); });

/* ---------- Capitanía: votación real ---------- */
const MOT_ST = {firmas: ["Juntando firmas", "gold"], votacion: ["Votando", "accent"], aprobada: ["Aprobada", "win"], rechazada: ["Rechazada", "loss"], cancelada: ["Cancelada", "dim"], vencida: ["Venció", "dim"]};
const leftTxt = t => { const ms = t - Date.now(); if (ms <= 0) return "terminó"; const d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), mi = Math.floor(ms % 36e5 / 6e4); return d ? `${d} d ${h} h` : h ? `${h} h ${mi} min` : `${mi} min`; };
function renderVoteReal() {
  const root = $("#voteReal"); if (!root) return;
  const ms = Object.entries(S.remote.motions || {}).map(([id, m]) => ({id, ...m})).sort((a, b) => (b.at || 0) - (a.at || 0));
  const act = ms.filter(m => ["firmas", "votacion"].includes(m.status)), old = ms.filter(m => !["firmas", "votacion"].includes(m.status)).slice(0, 6);
  const pid = myPid(), myK = pid ? D.PM[pid].team : null, mine = myK ? act.find(m => m.team === myK) : null;
  const card = m => { const st = MOT_ST[m.status] || ["", "dim"], t = TM(m.team), n = (m.roster || []).length, inRoster = pid && (m.roster || []).includes(pid);
    const acts = m.id === (mine || {}).id && inRoster ? (m.status === "firmas" ? (pid !== m.by && pid !== m.captain && !(m.sigs || []).includes(pid) ? `<button class="btn sm gold" data-mot="sign:${m.id}">Firmar la moción</button>` : (m.sigs || []).includes(pid) ? '<span class="st ok">Firmaste</span>' : "") + (pid === m.by ? `<button class="btn sm ghost" data-mot="cancel:${m.id}">Cancelar</button>` : "")
      : m.status === "votacion" ? ((m.voted || []).includes(pid) ? '<span class="st ok">Ya votaste</span>' : `<button class="btn sm gold" data-mot="vote:${m.id}:si">Votar SÍ</button><button class="btn sm danger" data-mot="vote:${m.id}:no">Votar NO</button>`) : "") : "";
    return `<div class="mot ${m.status}" style="--tc:${t.c}">${img(m.team)}<div><div class="mot-t"><b>${esc(t.name)}</b>: que <b>${esc(m.candName)}</b> sea capitán <span class="st" style="--c:var(--${st[1]})">${st[0]}</span></div>
      <div class="mot-m">Propuso ${esc(m.byName)} · ${m.status === "firmas" ? `${(m.sigs || []).length} de 2 firmas` : m.status === "votacion" ? `votaron ${(m.voted || []).length} de ${n} · se necesitan ${m.need} a favor · cierra en ${leftTxt(m.ends)}` : m.si != null && ["aprobada", "rechazada"].includes(m.status) ? `${m.si} a favor, ${m.no} en contra (se necesitaban ${m.need})` : ""}</div>
      ${m.status === "votacion" ? `<div class="mot-bar"><i style="width:${n ? (m.voted || []).length / n * 100 : 0}%"></i></div>` : ""}<div class="rowbtns">${acts}</div></div></div>`; };
  let start = "";
  if (S.member && pid && myK && !mine) {
    const c = roster(myK).filter(p => p.id !== TM(myK).captain);
    start = `<div class="mot-new"><b>Iniciar una moción en ${esc(TM(myK).name)}</b><span class="muted">Necesita 2 firmas de compañeros (sin contar al capitán) para abrir la votación.</span><div class="rowbtns"><select class="cell-in" id="motCand" style="max-width:240px" aria-label="Candidato">${c.map(p => opt(p.id, p.name)).join("")}</select><button class="btn sm" data-mot="create">Proponer como capitán</button></div></div>`;
  } else if (!S.member) start = `<div class="mot-new"><b>¿Sos jugador?</b><span class="muted">Entrá con Discord y vinculá tu cuenta para firmar y votar en tu equipo. El voto es secreto.</span>${DC_BTN()}</div>`;
  else if (!pid) start = `<div class="mot-new"><span class="muted">Vinculá tu cuenta con tu jugador en <a href="#perfil">Mi perfil</a> para votar.</span></div>`;
  root.innerHTML = `<div class="h3">Votaciones de los equipos</div>${start}${act.map(card).join("") || '<p class="muted" style="margin-top:10px">No hay votaciones abiertas.</p>'}${old.length ? `<details class="mot-old"><summary>Anteriores</summary>${old.map(card).join("")}</details>` : ""}`;
}
$("#voteReal") && $("#voteReal").addEventListener("click", async e => {
  const b = e.target.closest("[data-mot]"); if (!b) return;
  const [op, id, v] = b.dataset.mot.split(":");
  if (op === "vote" && !await confirmTyped({title: `Votar ${v === "si" ? "SÍ" : "NO"}`, html: "<p>El voto es secreto y no se puede cambiar.</p>", word: v === "si" ? "SI" : "NO", btn: "Votar", danger: false})) return;
  b.disabled = true;
  try {
    const r = await api("/api/member", op === "create" ? {action: "motion", op, cand: ($("#motCand") || {}).value} : {action: "motion", op, id, v});
    toast(op === "create" ? "Moción creada: ahora necesita 2 firmas." : op === "sign" ? (r.open ? "¡Se abrió la votación! Hay 48 horas para votar." : "Firmaste la moción.") : op === "vote" ? (r.closed ? (r.closed.ok ? "Votación cerrada: se aprobó." : "Votación cerrada: no se aprobó.") : "Voto registrado.") : "Moción cancelada.");
  } catch (er) { toast(er.message); b.disabled = false; }
});

/* ---------- capitán: asistencia y vínculos de su equipo ---------- */
function capAttCard(k) {
  const nx = nextFor(k); if (!nx) return "";
  const rs = roster(k).map(p => ({p, a: attOf(nx.f, p.id)})), by = s => rs.filter(x => (x.a ? x.a.s : "") === s);
  const chip = (x) => `<span class="att-chip ${x.a ? x.a.s : "none"}">${esc(x.p.name)}</span>`;
  return `<div class="adm-card"><h3>${ico("i-check")} ¿Quién juega la fecha ${nx.f}? <small>lo confirma cada jugador desde su perfil</small></h3>
    <div class="att-cols"><div><b>Juegan (${by("si").length})</b>${by("si").map(chip).join("") || '<span class="adm-note">—</span>'}</div><div><b>En duda (${by("duda").length})</b>${by("duda").map(chip).join("") || '<span class="adm-note">—</span>'}</div><div><b>No pueden (${by("no").length})</b>${by("no").map(chip).join("") || '<span class="adm-note">—</span>'}</div><div><b>Sin responder (${by("").length})</b>${by("").map(chip).join("") || '<span class="adm-note">—</span>'}</div></div>
    <p class="adm-note">Para confirmar, cada jugador entra a la página (con Discord o con su mail) y vincula su cuenta en Mi perfil.</p></div>`;
}
function capLinksCard(k) {
  const L = Object.entries(S.requests).map(([id, r]) => ({id, ...r})).filter(r => r.type === "link" && r.team === k && r.status === "pend");
  if (!L.length) return "";
  return `<div class="adm-card"><h3>${ico("i-users")} Cuentas para vincular <small>jugadores que crearon su cuenta</small></h3>${L.map(r => `<div class="req" style="--st:var(--gold)">${r.avatar ? `<img src="${esc(r.avatar)}" alt="" referrerpolicy="no-referrer" style="border-radius:50%">` : img(k)}<div><div class="rq-t"><b>${esc(r.name)}</b> dice que es <b>${esc(r.pname)}</b></div><div class="rq-m">${dt(r.at)}</div></div>
    <div class="rq-acts"><span class="rowbtns"><button class="btn sm gold" data-cap-act="link-ok:${r.id}">Es él</button><button class="btn sm ghost" data-cap-act="link-no:${r.id}">No es</button></span></div></div>`).join("")}</div>`;
}
async function extCapAct(act, arg, b) {
  if (act === "res") { const m = D.ms.find(x => x.id === arg); if (m) openResult(arg, "cap"); return true; }
  if (act === "link-ok" || act === "link-no") { b.disabled = true; try { await api("/api/member", {action: "approve", id: arg, ok: act === "link-ok"}); toast(act === "link-ok" ? "Cuenta vinculada." : "Pedido rechazado."); } catch (er) { toast(er.message); b.disabled = false; } return true; }
  if (act === "coachreg-ok" || act === "coachreg-no") { await reviewCoachReg(arg, act === "coachreg-ok", b); return true; }
  if (act === "pay") { const u = payLink(); if (u) window.open(u, "_blank", "noopener"); return true; }
  return false;
}

/* ---------- staff: vínculos, Riot ID y Discord de cada jugador ---------- */
function admLinksCard(R) {
  const linked = {}; Object.entries(S.membersList || {}).forEach(([uid, m]) => { if (m.pid) linked[m.pid] = {uid, ...m}; });
  const ps = Object.entries(R.players).map(([id, p]) => ({id, ...p})).filter(p => S.adm.pTeam === "all" || (S.adm.pTeam === "free" ? !p.team : p.team === S.adm.pTeam)).sort((a, b) => (a.team || "zz").localeCompare(b.team || "zz") || (a.name || "").localeCompare(b.name || ""));
  return `<div class="adm-card"><h3>${ico("i-users")} Nombre en el juego y Discord <small>para leer las capturas y vincular cuentas solas</small></h3>
    <p class="adm-note">El <b>Riot ID</b> (nombre en VALORANT) ayuda a reconocer a cada jugador en la captura del marcador. Si cargás el <b>usuario de Discord</b>, cuando el jugador entra con Discord su cuenta se vincula sola.</p>
    <div class="ptable lk-table">${ps.map(p => { const l = linked[p.id];
      return `<div class="lk-row"><span><b>${esc(p.name)}</b><small>${p.team ? esc(R.teams[p.team].name) : "libre"}</small></span><input class="cell-in" value="${esc(p.ign || "")}" placeholder="Riot ID (ej: Jagger#LAS)" data-bind="player:${p.id}:ign" data-t="s" aria-label="Riot ID de ${esc(p.name)}"><input class="cell-in" value="${esc(p.discord || "")}" placeholder="usuario de Discord" data-bind="player:${p.id}:discord" data-t="s" aria-label="Discord de ${esc(p.name)}">
        <span>${l ? `<span class="st ok" title="${esc(l.username || "")}">${esc(l.name || "vinculado")}</span><button class="btn sm ghost" data-act="mem-unlink:${l.uid}">Desvincular</button>` : '<span class="adm-note">sin cuenta</span>'}</span></div>`; }).join("") || '<p class="adm-note">No hay jugadores en este filtro.</p>'}</div></div>`;
}
async function memAdminAct(act, a, b) {
  if (act === "mem-unlink") { if (!arm(b)) return true; await save(`members/${a[0]}`, {pid: null, linkedBy: S.staff.u, linkedAt: Date.now()}, "update"); audit(`Desvinculó la cuenta de Discord ${(S.membersList[a[0]] || {}).name || a[0]}`); toast("Desvinculada."); renderAdminSoon(); return true; }
  return false;
}

/* ================= economía: ONYX Coins y dólares ================= */
// ledger/<id> { at, type, dir: "in" | "out", usd, team, who, note, by, ref }   (solo staff; lo borra ultra)
const LEDGER_T = {recarga: "Recarga de coins", canje: "Canje pagado en US$", inscripcion: "Inscripción", sponsor: "Sponsor", premio: "Premio pagado", otro: "Otro"};
const payLink = () => { const u = String((M.cfg && M.cfg.payLink) || "").trim(); return /^https:\/\/[^\s"'<>]{6,300}$/.test(u) ? u : ""; };
const ledgerList = () => Object.entries(S.remote.ledger || {}).map(([id, x]) => ({id, ...x})).sort((a, b) => (b.at || 0) - (a.at || 0));
function addLedger(e) { return save(`ledger/${newId("lg")}`, {at: Date.now(), by: S.staff.u, dir: "in", note: "", team: null, who: "", ref: "", ...e}); }
function gini(xs) { const v = xs.filter(x => x >= 0).sort((a, b) => a - b), n = v.length, s = v.reduce((a, b) => a + b, 0); if (!n || !s) return 0; let c = 0; v.forEach((x, i) => { c += (2 * (i + 1) - n - 1) * x; }); return c / (n * s); }
function admEconomia(R, Dr) {
  const ks = TEAM_KEYS, coins = ks.map(k => ({k, c: +R.teams[k].coins || 0})).sort((a, b) => b.c - a.c), tot = coins.reduce((s, x) => s + x.c, 0), avg = coins.length ? tot / coins.length : 0, mx = Math.max(1, ...coins.map(x => x.c));
  const g = gini(coins.map(x => x.c)), hi = coins.filter(x => avg && x.c > avg * 1.5), lo = coins.filter(x => avg && x.c < avg * .5);
  const C = coachCfg(), wk = k => coachesOf(k).length * C.salary, debt = ks.filter(k => teamPendSal(k).length);
  const L = ledgerList(), inUsd = L.filter(x => x.dir !== "out").reduce((s, x) => s + (+x.usd || 0), 0), outUsd = L.filter(x => x.dir === "out").reduce((s, x) => s + (+x.usd || 0), 0);
  const tile = (v, l, hot) => `<div class="tile ${hot ? "hot" : ""}"><b>${v}</b><span>${l}</span></div>`;
  const warn = [];
  hi.forEach(x => warn.push(`<b>${esc(R.teams[x.k].name)}</b> tiene ${dec(x.c / avg, 1)} veces el promedio de coins: puede dominar el mercado.`));
  lo.forEach(x => warn.push(`<b>${esc(R.teams[x.k].name)}</b> tiene menos de la mitad del promedio: le va a costar fichar.`));
  ks.forEach(k => { if (wk(k) && (+R.teams[k].coins || 0) < wk(k) * 2) warn.push(`<b>${esc(R.teams[k].name)}</b> paga ${fmt(wk(k))} coins por semana de sueldos y le alcanza para menos de 2 semanas.`); });
  const kpi = `<div class="adm-card"><h3>${ico("i-coins")} ONYX Coins <small>cómo está repartida la plata de la liga</small></h3><div class="tiles">
      ${tile(fmt(tot), "coins en circulación")}${tile(fmt(Math.round(avg)), "promedio por equipo")}${tile(coins.length ? dec(coins[0].c / Math.max(1, coins[coins.length - 1].c), 1) + "×" : "–", "del más rico al más pobre", coins.length && coins[0].c > 3 * Math.max(1, coins[coins.length - 1].c))}${tile(Math.round(g * 100) + "%", "desigualdad (Gini)", g > .35)}${tile(debt.length, "equipos con sueldos impagos", debt.length)}</div>
    <div class="eco-bars">${coins.map(x => `<div class="eco-b" style="--tc:${R.teams[x.k].c}">${img(x.k)}<b>${esc(R.teams[x.k].name)}</b><span class="bar"><i style="width:${(x.c / mx * 100).toFixed(1)}%"></i><em style="left:${(avg / mx * 100).toFixed(1)}%" title="Promedio"></em></span><span class="mono">${fmt(x.c)}</span></div>`).join("")}</div>
    ${warn.length ? `<div class="eco-warn">${warn.map(w => `<p>${ico("i-scale")}<span>${w}</span></p>`).join("")}</div>` : '<p class="adm-note">La economía está pareja: ningún equipo tiene más de 1,5 veces el promedio ni menos de la mitad.</p>'}
    <p class="adm-note">La línea blanca es el promedio. Si la desigualdad pasa de 35%, conviene revisar las coins por resultado (General) o los valores de los jugadores.</p></div>`;
  const U = isUltra();
  const led = `<div class="adm-card"><h3>${ico("i-gift")} Dólares <small>registro de lo que entra y sale (solo lo ve el staff)</small></h3>
    <div class="tiles">${tile("US$ " + fmt(inUsd), "entraron")}${tile("US$ " + fmt(outUsd), "salieron")}${tile("US$ " + fmt(inUsd - outUsd), "saldo", inUsd - outUsd < 0)}</div>
    <div class="fgrid">${fld("Tipo", `<select id="lgType">${Object.entries(LEDGER_T).map(([k, l]) => opt(k, l)).join("")}</select>`)}${fld("Entra o sale", `<select id="lgDir">${opt("in", "Entra")}${opt("out", "Sale")}</select>`)}${fld("US$", `<input id="lgUsd" type="number" min="0" step="0.5" placeholder="5">`)}
      ${fld("Equipo (opcional)", `<select id="lgTeam">${opt("", "–", true)}${ks.map(k => opt(k, R.teams[k].name)).join("")}</select>`)}${fld("Quién / detalle", `<input id="lgWho" maxlength="60" placeholder="Ej: pagó por Mercado Pago">`)}</div>
    <div class="rowbtns"><button class="btn sm gold" data-act="lg-add">Registrar</button><button class="btn sm ghost" data-act="lg-csv">Descargar CSV</button></div>
    <div class="lg-list">${L.slice(0, 60).map(x => `<div class="lg-row ${x.dir === "out" ? "out" : ""}"><span class="mono">${dt(x.at)}</span><span>${esc(LEDGER_T[x.type] || x.type)}${x.team && R.teams[x.team] ? ` · ${esc(R.teams[x.team].name)}` : ""}${x.who ? ` · ${esc(x.who)}` : ""}</span><b class="mono">${x.dir === "out" ? "−" : "+"}US$ ${fmt(x.usd)}</b><small>${esc(x.by || "")}</small>${U ? `<button class="btn sm ghost icon-only" data-act="lg-del:${x.id}" aria-label="Borrar">${ico("i-close")}</button>` : ""}</div>`).join("") || '<p class="adm-note">Todavía no hay movimientos. Las recargas de coins y los canjes pagados en dólares se anotan solos.</p>'}</div></div>`;
  const cfg = `<div class="adm-card"><h3>${ico("i-sliders")} Cobros y reglas</h3><div class="fgrid">
      ${fld("Link de pago (Mercado Pago, PayPal…)", `<input value="${esc(R.cfg.payLink || "")}" data-bind="cfg:payLink" data-t="s" placeholder="https://..." ${U ? "" : "disabled"}>`)}
      ${fld("Recargas por equipo por temporada (0 = sin límite)", `<input type="number" min="0" max="20" value="${+C.maxRefills || 0}" data-bind="cfg:coach.maxRefills" data-t="n" ${U ? "" : "disabled"}>`)}</div>
    ${fld("Qué compran los dólares (sale en el Reglamento público)", `<textarea rows="4" data-bind="cfg:moneyText" data-t="s" ${U ? "" : "disabled"} placeholder="Ej: La recarga de US$ 5 renueva las ONYX Coins del equipo...">${esc(R.cfg.moneyText || "")}</textarea>`)}
    <p class="adm-note">Los capitanes ven el link de pago en su panel cuando deben sueldos. Limitar las recargas evita que un equipo “compre” ventaja en el mercado.${U ? "" : " Esto lo cambia ultra staff."}</p></div>`;
  return kpi + led + cfg;
}
async function econAdminAct(act, a, b) {
  if (act === "lg-add") {
    const usd = Math.round(+($("#lgUsd").value || 0) * 100) / 100; if (!(usd > 0)) { toast("Poné cuántos dólares."); return true; }
    const e = {type: $("#lgType").value, dir: $("#lgDir").value, usd, team: $("#lgTeam").value || null, who: $("#lgWho").value.trim().slice(0, 60)};
    await addLedger(e); audit(`Registró ${e.dir === "out" ? "una salida" : "un ingreso"} de US$ ${usd} (${LEDGER_T[e.type]})`); toast("Registrado."); renderAdminSoon(); return true;
  }
  if (act === "lg-del") { if (!arm(b)) return true; const x = (S.remote.ledger || {})[a[0]]; await save(`ledger/${a[0]}`, null, "del"); audit(`Borró un movimiento de US$ ${x ? x.usd : "?"}`); renderAdminSoon(); return true; }
  if (act === "lg-csv") {
    const R = RM(), rows = [["fecha", "tipo", "entra/sale", "usd", "equipo", "detalle", "registró"]].concat(ledgerList().map(x => [new Date(x.at).toISOString(), LEDGER_T[x.type] || x.type, x.dir === "out" ? "sale" : "entra", x.usd, x.team && R.teams[x.team] ? R.teams[x.team].name : "", x.who || "", x.by || ""]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n"), url = URL.createObjectURL(new Blob(["﻿" + csv], {type: "text/csv"})), l = document.createElement("a");
    l.href = url; l.download = "onyx-dolares.csv"; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); return true;
  }
  return false;
}
// Recargas del equipo en esta temporada (para el límite)
const refillsOf = k => Object.values(S.remote.topups || {}).filter(x => x.team === k && (!M.cfg.seasonStart || (x.at || 0) >= M.cfg.seasonStart)).length;

/* ---------- Reglamento público ---------- */
function renderRules() {
  const root = $("#rgRoot"); if (!root) return;
  const c = M.cfg, P = c.points, C = coachCfg(), co = c.coin, mt = String(c.moneyText || "").trim();
  const sec = (icon, t, body) => `<article class="panel pad cut rg-s"><div class="h3">${ico(icon)} ${t}</div>${body}</article>`;
  root.innerHTML = `<div class="rg-grid">
    ${sec("i-calendar", "Formato", `<ul class="rg-l"><li>Todos contra todos. En cada fecha, los dos equipos juegan <b>ida y vuelta</b> (dos partidos).</li><li>Victoria <b>${P.w}</b> pts · victoria en prórroga <b>${P.otw}</b> · derrota en prórroga <b>${P.otl}</b> · derrota <b>${P.l}</b>. W.O.: ${c.noShow} punto${Math.abs(c.noShow) === 1 ? "" : "s"} para el que no se presentó.</li><li>Desempate: rondas ganadas, rondas perdidas, kills, asistencias, resultado entre ellos y K/D.</li><li>Clasifican a playoffs los primeros <b>${c.playoff}</b>.</li></ul>`)}
    ${sec("i-map", "Mapas", `<ul class="rg-l"><li>Cada capitán elige <b>uno</b> de los dos partidos de la fecha (ida o vuelta): el mapa y si arranca en ataque o defensa. El otro lo elige el capitán rival.</li><li>Un mapa que tu equipo ya jugó o eligió no se puede repetir en la temporada.</li></ul>`)}
    ${sec("i-check", "Resultados", `<ul class="rg-l"><li>Después de cada partido, cada capitán sube la captura del marcador desde su panel.</li><li>${resCfgC().auto ? "Si los dos capitanes mandan lo mismo, el resultado se carga solo." : "El staff revisa cada resultado antes de cargarlo."} Si no coinciden, decide el staff con las dos capturas.</li></ul>`)}
    ${sec("i-coins", "Mercado y ONYX Coins", `<ul class="rg-l"><li>Cada equipo arranca con ONYX Coins para fichar. Se ganan coins por resultado: victoria ${fmt(co.w)}, victoria en prórroga ${fmt(co.otw)}, derrota en prórroga ${fmt(co.otl)}, MVP ${fmt(co.mvp)}.</li><li>Los jugadores tienen valor (de ${fmt(CAP_VAL_MIN)} a ${fmt(CAP_VAL_MAX)}) y pueden tener cláusula de rescisión. El capitán ofrece y el staff aprueba.</li><li><b>Las ONYX Coins no son dinero:</b> no se compran ni se venden entre personas y no se cambian por plata.</li></ul>`)}
    ${sec("i-whistle", "Coaches y recargas", `<ul class="rg-l"><li>Cada equipo le paga a cada coach que ficha ${fmt(C.salary)} coins por semana (los lunes a las 00:00).</li><li>Si un equipo no puede pagar, puede hacer una <b>recarga</b>: paga US$ ${fmt(C.usd)} y sus coins vuelven a ${fmt(C.refill)} (menos lo que debía de sueldos).${+C.maxRefills ? ` Máximo ${C.maxRefills} recarga${+C.maxRefills > 1 ? "s" : ""} por equipo por temporada.` : ""}</li>${mt ? `<li>${esc(mt).replace(/\n/g, "<br>")}</li>` : ""}</ul>`)}
    ${sec("i-gift", "Canjes", `<ul class="rg-l"><li>Los jugadores juntan puntos individuales (y los coaches, coins de su sueldo) para canjear premios.</li><li>El capitán pide el canje y el staff lo aprueba y lo entrega.</li></ul>`)}
    ${sec("i-scale", "Fair play", `<p class="muted">Respeto, puntualidad y cuentas propias. Las sanciones y las denuncias están en <a href="#fairplay">Fair play</a>.</p>`)}
    ${sec("i-shield", "Aviso legal", `<p class="muted">ONYX es una competencia comunitaria de VALORANT organizada por jugadores; no es una competencia oficial de Riot Games. ONYX fue creado bajo la política “Legal Jibber Jabber” de Riot Games usando recursos propiedad de Riot Games. Riot Games no respalda ni patrocina este proyecto.</p>`)}
  </div>`;
}


/* ================= partidos, centro del partido, links para compartir, calendario e imágenes ================= */
const legLbl = m => m.leg ? LEG_L[m.leg] : m.legs > 1 ? `Partida ${m.legN}` : "";
const okMs = () => D.ms.filter(m => M.teams[m.a] && M.teams[m.b] && m.a !== m.b);
const gameScore = m => m.status === "played" ? `${m.ra}-${m.rb}` : "";
const siteUrl = () => location.origin + location.pathname;

// ---------- links que se pueden compartir: #partido=<id>, #jugador=<id>, #equipo=<k> ----------
const DEEP_VIEW = {partido: "partidos", jugador: "scouting", equipo: "equipos"};
const parseDeep = h => { const m = /^#(partido|jugador|equipo)=([A-Za-z0-9_\-]{1,40})$/.exec(h || ""); return m ? {kind: m[1], id: m[2]} : null; };
let deep = parseDeep(location.hash), deepAt = Date.now();
if (deep) history.replaceState(null, "", location.pathname + location.search + "#" + DEEP_VIEW[deep.kind]);
const onDeepNav = e => {
  const d = parseDeep(location.hash); if (!d) return;
  e.stopImmediatePropagation(); deep = d; deepAt = Date.now();
  history.replaceState(null, "", location.pathname + location.search + "#" + DEEP_VIEW[d.kind]);
  goView(DEEP_VIEW[d.kind], {replace: true}); tryDeep();
};
// el navegador avisa "popstate" y después "hashchange": se atajan los dos antes que el menú
addEventListener("popstate", onDeepNav); addEventListener("hashchange", onDeepNav);
function tryDeep() {
  if (!deep || !D) return;
  if (Date.now() - deepAt > 15000) { deep = null; return; } // si lo que pide el link no existe, no queda esperando para siempre
  const d = deep;
  if (d.kind === "partido" && okMs().some(m => m.id === d.id)) { deep = null; openMatch(d.id); }
  else if (d.kind === "jugador" && D.PM[d.id]) { deep = null; openPlayer(d.id); }
  else if (d.kind === "equipo" && TEAM_KEYS.includes(d.id)) { deep = null; S.teamSel = d.id; renderTeams(); goView("equipos", {replace: true}); }
}
async function shareLink(kind, id, title) {
  const url = `${siteUrl()}#${kind}=${id}`;
  if (navigator.share && matchMedia("(pointer: coarse)").matches) { try { await navigator.share({title: title || "ONYX", url}); return; } catch (e) { if (e && e.name === "AbortError") return; } }
  try { await navigator.clipboard.writeText(url); toast("Link copiado. Pegalo donde quieras."); }
  catch (e) { await askText({title: "Copiá el link", label: "Link para compartir", value: url, btn: "Listo"}); }
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-share]"); if (!b) return;
  const [kind, id] = b.dataset.share.split(":"); shareLink(kind, id, b.dataset.title);
});

// ---------- calendario (.ics) ----------
const icsDate = d => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
const icsEsc = s => String(s).replace(/[\\;,]/g, x => "\\" + x).replace(/\n/g, "\\n");
function downloadFile(name, data, type) {
  const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], {type})), a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
function exportIcs(list, label) {
  const ev = list.filter(m => parseLocal(m.date)).map(m => { const st = parseLocal(m.date), en = new Date(st.getTime() + 75 * 60000);
    return ["BEGIN:VEVENT", `UID:${m.id}@onyx-liga`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(st)}`, `DTEND:${icsDate(en)}`,
      `SUMMARY:${icsEsc(`ONYX · F${m.fecha} ${legLbl(m)} · ${TM(m.a).name} vs ${TM(m.b).name}`)}`, `DESCRIPTION:${icsEsc(`${M.cfg.season}\n${siteUrl()}#partido=${m.id}`)}`, `URL:${siteUrl()}#partido=${m.id}`, "END:VEVENT"].join("\r\n"); });
  if (!ev.length) { toast("No hay partidos con día y hora para agregar."); return; }
  downloadFile(`onyx-${label}.ics`, ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ONYX//Liga//ES", "CALSCALE:GREGORIAN", `X-WR-CALNAME:ONYX · ${M.cfg.season}`, ...ev, "END:VCALENDAR"].join("\r\n"), "text/calendar");
  toast(`${ev.length} partido${ev.length > 1 ? "s" : ""} al calendario: abrí el archivo y se agregan.`);
}

// ---------- sección Partidos ----------
S.px = {team: "all", show: "all"};
function renderPartidos() {
  const root = $("#pxRoot"); if (!root) return;
  const ut = $("#pxUltra"); if (ut) ut.hidden = !isUltra();
  const sel = $("#pxTeam");
  if (sel) { const v = S.px.team; sel.innerHTML = opt("all", "Todos los equipos", v === "all") + TEAM_KEYS.map(k => opt(k, TM(k).name, v === k)).join(""); if (!TEAM_KEYS.includes(v)) S.px.team = "all"; }
  $$("#pxShow button").forEach(b => b.classList.toggle("on", b.dataset.show === S.px.show));
  const k = S.px.team, list = okMs().filter(m => (k === "all" || m.a === k || m.b === k) && (S.px.show === "all" || (S.px.show === "played") === (m.status === "played")));
  const fs = [...new Set(list.map(m => m.fecha))].sort((a, b) => S.px.show === "played" ? b - a : a - b);
  const card = c => `<div class="px-cruce">${c.games.map(g => { const won = g.status === "played" ? (+g.ra > +g.rb ? "a" : "b") : "";
    return `<button type="button" class="px-g ${g.status === "played" ? "done" : ""}" data-mid="${g.id}"><em>${legLbl(g)}</em>
      <span class="px-t ${won === "a" ? "win" : won ? "lose" : ""}">${img(g.a)}<b>${esc(TM(g.a).name)}</b></span>
      <span class="px-s">${g.status === "played" ? `${g.ra}<i>-</i>${g.rb}` : "vs"}</span>
      <span class="px-t r ${won === "b" ? "win" : won ? "lose" : ""}"><b>${esc(TM(g.b).name)}</b>${img(g.b)}</span>
      <small>${g.status === "played" ? `${g.map ? esc(g.map) + " · " : ""}${g.noShow ? "W.O." : g.ot ? "Prórroga" : "Final"}` : g.date ? fmtDate(g.date) : "A confirmar"}</small></button>`; }).join("")}</div>`;
  root.innerHTML = fs.map(f => { const gs = cruceGroups(list.filter(m => m.fecha === f)), anyP = D.played.some(m => m.fecha === f), d = list.find(m => m.fecha === f && m.date);
    return `<section class="px-f"><header><h3>Fecha ${f}</h3><span class="muted">${d ? fmtDate(d.date, false) : ""}</span><span class="sp"></span>${isUltra() ? `<button class="btn sm ghost px-del" data-px-del="${f}">Borrar fecha</button>` : ""}${anyP ? `<button class="btn sm ghost" data-px-img="${f}">${ico("i-image")}<span>Imagen de la fecha</span></button>` : ""}</header><div class="px-list">${gs.map(card).join("")}</div></section>`; }).join("")
    || `<p class="empty">${okMs().length ? "No hay partidos con ese filtro." : "Todavía no hay fixture."}</p>`;
}
$("#pxRoot") && $("#pxRoot").addEventListener("click", e => {
  const g = e.target.closest("[data-mid]"); if (g) { openMatch(g.dataset.mid); return; }
  const im = e.target.closest("[data-px-img]"); if (im) shareImage("fecha", {f: +im.dataset.pxImg});
  const dl = e.target.closest("[data-px-del]"); if (dl) deleteFechas([+dl.dataset.pxDel]);
});
$("#pxTeam") && $("#pxTeam").addEventListener("change", e => { S.px.team = e.target.value; renderPartidos(); });
$("#pxShow") && $("#pxShow").addEventListener("click", e => { const b = e.target.closest("[data-show]"); if (b) { S.px.show = b.dataset.show; renderPartidos(); } });
$("#pxGen") && $("#pxGen").addEventListener("click", () => openFixtureGen());
$("#pxDelAll") && $("#pxDelAll").addEventListener("click", () => deleteFechas(null));
$("#pxIcs") && $("#pxIcs").addEventListener("click", () => { const k = S.px.team; exportIcs(D.pending.filter(m => k === "all" || m.a === k || m.b === k), k === "all" ? "fixture" : k); });

// ---------- centro del partido ----------
function boxRows(m, k) {
  return Object.entries(m.stats || {}).filter(([pid, s]) => (s.t || (D.PM[pid] || {}).team) === k)
    .map(([pid, s]) => ({pid, p: D.PM[pid], k: +s.k || 0, d: +s.d || 0, a: +s.a || 0, acs: +s.acs || 0})).sort((x, y) => y.acs - x.acs);
}
function openMatch(mid) {
  const m = okMs().find(x => x.id === mid); if (!m) { toast("Ese partido ya no existe."); return; }
  const A = TM(m.a), B = TM(m.b), played = m.status === "played", aw = played && +m.ra > +m.rb;
  const series = cruceGroups(okMs().filter(x => x.fecha === m.fecha && [x.a, x.b].sort().join() === [m.a, m.b].sort().join()))[0];
  const tab = k => { const rows = boxRows(m, k), t = TM(k);
    return `<div class="mc-box" style="--tc:${t.c}"><div class="mc-bh">${img(k)}<b>${esc(t.name)}</b></div><table class="mc-tbl"><thead><tr><th>Jugador</th><th>ACS</th><th>K</th><th>D</th><th>A</th><th>K/D</th></tr></thead><tbody>
      ${rows.map(r => `<tr ${r.p ? `data-p="${r.pid}" tabindex="0"` : ""}><td>${r.pid === m.mvpId ? '<i class="mc-mvp" title="MVP">MVP</i>' : ""}${esc(r.p ? r.p.name : "Jugador borrado")}</td><td><b>${r.acs}</b></td><td>${r.k}</td><td>${r.d}</td><td>${r.a}</td><td class="${r.k >= r.d ? "kdp" : "kdn"}">${dec(r.d ? r.k / r.d : r.k)}</td></tr>`).join("") || '<tr><td colspan="6" class="muted">Sin estadísticas cargadas.</td></tr>'}</tbody></table></div>`; };
  const h2h = D.played.filter(x => x.id !== m.id && ((x.a === m.a && x.b === m.b) || (x.a === m.b && x.b === m.a))).slice(-4);
  const pre = !played ? `<div class="mc-pre"><div><div class="h3" style="font-size:15px">Planteles</div><div class="mc-rosters">${[m.a, m.b].map(k => `<div style="--tc:${TM(k).c}">${roster(k).map(p => `<button type="button" class="mc-pl" data-p="${p.id}"><b>${esc(p.name)}</b><small>${esc(p.role)}${p.s.m ? ` · ${p.s.acs} ACS` : ""}</small></button>`).join("") || '<span class="muted">Sin jugadores</span>'}</div>`).join("")}</div></div>
      ${h2h.length ? `<div><div class="h3" style="font-size:15px">Se enfrentaron antes</div><div class="mc-h2h">${h2h.map(x => `<button type="button" data-mid="${x.id}"><span>F${x.fecha}${legTag(x)}</span><b>${esc(TM(x.a).name)} ${x.ra}-${x.rb} ${esc(TM(x.b).name)}</b></button>`).join("")}</div></div>` : ""}</div>` : "";
  modal(`<div class="box cut mc" style="--tc:${A.c};--tc2:${B.c}"><div class="mc-head"><button class="x" data-close aria-label="Cerrar">×</button>
      <div class="mc-meta">${esc(M.cfg.season)} · Fecha ${m.fecha}${legLbl(m) ? " · " + legLbl(m) : ""}${m.date ? " · " + fmtDate(m.date) : ""}</div>
      <div class="mc-score"><button type="button" class="mc-team ${played && !aw ? "lose" : ""}" data-team="${m.a}">${img(m.a)}<b>${esc(A.name)}</b></button>
        <div class="mc-num">${played ? `<span class="${aw ? "w" : ""}">${m.ra}</span><i>:</i><span class="${!aw ? "w" : ""}">${m.rb}</span>` : `<span class="vs">VS</span>`}<small>${played ? (m.noShow ? "W.O." : m.ot ? "Final · prórroga" : "Final") : m.date ? "Por jugarse" : "Día a confirmar"}</small></div>
        <button type="button" class="mc-team ${played && aw ? "lose" : ""}" data-team="${m.b}">${img(m.b)}<b>${esc(B.name)}</b></button></div>
      <div class="mc-chips">${m.map ? `<span>${ico("i-map")}${esc(m.map)}</span>` : ""}${m.mvpId && D.PM[m.mvpId] ? `<span>${ico("i-star")}MVP: ${esc(D.PM[m.mvpId].name)}</span>` : ""}
        ${series && series.games.length > 1 ? series.games.map(g => `<button type="button" class="${g.id === m.id ? "on" : ""}" data-mid="${g.id}">${legLbl(g)}${g.status === "played" ? ` ${g.ra}-${g.rb}` : ""}</button>`).join("") : ""}</div></div>
    <div class="bb">${played ? `<div class="mc-boxes">${tab(m.a)}${tab(m.b)}</div>` : pre}
      <div class="rowbtns"><button class="btn sm" type="button" data-share="partido:${m.id}" data-title="${esc(A.name)} vs ${esc(B.name)}">${ico("i-share")}<span>Compartir</span></button>
        ${played ? `<button class="btn sm gold" type="button" id="mcImg">${ico("i-image")}<span>Descargar imagen</span></button>` : m.date ? `<button class="btn sm gold" type="button" id="mcIcs">${ico("i-calendar")}<span>Agregar al calendario</span></button>` : ""}</div></div></div>`);
  const box = $("#modalRoot .mc");
  box.addEventListener("click", e => {
    const g = e.target.closest("[data-mid]"); if (g && g.dataset.mid !== m.id) { openMatch(g.dataset.mid); return; }
    const p = e.target.closest("[data-p]"); if (p) { closeModal(); openPlayer(p.dataset.p); return; }
    const t = e.target.closest("[data-team]"); if (t) { closeModal(); S.teamSel = t.dataset.team; renderTeams(); goView("equipos"); }
  });
  const ib = $("#mcImg"); if (ib) ib.addEventListener("click", () => shareImage("partido", {mid: m.id}));
  const cb = $("#mcIcs"); if (cb) cb.addEventListener("click", () => exportIcs([m], m.id));
}

// ---------- imágenes para redes (1080 × 1350) ----------
const imgCache = {};
function loadImg(src) {
  if (!src) return Promise.resolve(null);
  if (imgCache[src]) return imgCache[src];
  return imgCache[src] = new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
function rr(cx, x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
const FONT = (w, s) => `${w} ${s}px Archivo, Inter, "Segoe UI", Arial, sans-serif`;
function fitText(cx, txt, max) { let t = String(txt); while (t.length > 1 && cx.measureText(t).width > max) t = t.slice(0, -1); return t === String(txt) ? t : t.slice(0, -1) + "…"; }
async function shareImage(kind, o = {}) {
  toast("Armando la imagen…");
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
  const W = 1080, H = 1350, cv = document.createElement("canvas"); cv.width = W; cv.height = H; const cx = cv.getContext("2d");
  const bg = cx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#0d0918"); bg.addColorStop(1, "#06050a"); cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
  const glow = (x, y, r, c) => { const g = cx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)"); cx.fillStyle = g; cx.fillRect(0, 0, W, H); };
  glow(W * .85, 0, 700, "rgba(139,61,255,.35)"); glow(0, H, 600, "rgba(106,31,240,.18)");
  const logo = await loadImg("assets/onyx-logo.png");
  if (logo) cx.drawImage(logo, 64, 58, 92, 92);
  cx.fillStyle = "#fff"; cx.font = FONT(800, 44); cx.textBaseline = "middle"; cx.fillText("ONYX", 172, 92);
  cx.fillStyle = "#c8adff"; cx.font = FONT(500, 24); cx.fillText(M.cfg.season, 172, 128);
  const title = (t, sub) => { cx.fillStyle = "#fff"; cx.font = FONT(800, 76); cx.fillText(t, 64, 238); if (sub) { cx.fillStyle = "#a19cb4"; cx.font = FONT(500, 30); cx.fillText(sub, 64, 296); } };
  const emb = async (k, x, y, s) => { const im = await loadImg(EMB[k]); if (im) cx.drawImage(im, x, y, s, s); };
  let name = "onyx";
  if (kind === "fecha") {
    const f = o.f, gs = cruceGroups(D.played.filter(m => m.fecha === f)).flatMap(c => c.games);
    title(`Fecha ${f}`, "Resultados"); name = `onyx-fecha-${f}`;
    const rowH = Math.min(140, (H - 520) / Math.max(1, gs.length)), y0 = 350;
    for (let i = 0; i < gs.length; i++) {
      const g = gs[i], y = y0 + i * rowH, aw = +g.ra > +g.rb, s = Math.min(76, rowH - 30);
      cx.fillStyle = "rgba(255,255,255,.04)"; rr(cx, 64, y, W - 128, rowH - 16, 22); cx.fill();
      cx.textAlign = "left"; if (legLbl(g)) { cx.fillStyle = "#c8adff"; cx.font = FONT(600, 20); cx.fillText(legLbl(g).toUpperCase(), 92, y + 26); }
      const my = y + (rowH - 16) / 2 + (legLbl(g) ? 6 : 0);
      await emb(g.a, 92, my - s / 2, s); await emb(g.b, W - 92 - s, my - s / 2, s);
      cx.font = FONT(aw ? 800 : 500, 34); cx.fillStyle = aw ? "#fff" : "#8f8aa6"; cx.fillText(fitText(cx, TM(g.a).name, 260), 92 + s + 18, my);
      cx.textAlign = "right"; cx.font = FONT(!aw ? 800 : 500, 34); cx.fillStyle = !aw ? "#fff" : "#8f8aa6"; cx.fillText(fitText(cx, TM(g.b).name, 260), W - 92 - s - 18, my);
      cx.textAlign = "center"; cx.font = FONT(800, 54); cx.fillStyle = "#fff"; cx.fillText(`${g.ra} - ${g.rb}`, W / 2, my); cx.textAlign = "left";
    }
    const mv = fechaMvp(f);
    if (mv) { const a = agg(mv.log, f), y = H - 190; cx.fillStyle = "rgba(139,61,255,.18)"; rr(cx, 64, y, W - 128, 110, 24); cx.fill(); await emb(mv.lastTeam, 92, y + 15, 80);
      cx.fillStyle = "#e3c27e"; cx.font = FONT(700, 22); cx.fillText("FIGURA DE LA FECHA", 196, y + 36); cx.fillStyle = "#fff"; cx.font = FONT(800, 38); cx.fillText(fitText(cx, mv.name, 420), 196, y + 76);
      cx.textAlign = "right"; cx.font = FONT(600, 28); cx.fillStyle = "#efedf7"; cx.fillText(`${a.acs} ACS · ${a.k}/${a.d}/${a.a}`, W - 96, y + 58); cx.textAlign = "left"; }
  } else if (kind === "tabla") {
    title("Tabla", `Después de la fecha ${D.lastF || 0}`); name = "onyx-tabla";
    const rows = D.real, rowH = Math.min(112, (H - 470) / Math.max(1, rows.length)), y0 = 350;
    cx.fillStyle = "#6f6a82"; cx.font = FONT(600, 22); cx.textAlign = "right"; ["PJ", "DIF", "PTS"].forEach((h, i) => cx.fillText(h, [W - 330, W - 210, W - 96][i], y0 - 22)); cx.textAlign = "left";
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], y = y0 + i * rowH, t = TM(r.k), s = Math.min(64, rowH - 30), my = y + (rowH - 12) / 2;
      cx.fillStyle = r.pos <= M.cfg.playoff ? "rgba(61,220,154,.07)" : "rgba(255,255,255,.035)"; rr(cx, 64, y, W - 128, rowH - 12, 18); cx.fill();
      if (r.pos <= M.cfg.playoff) { cx.fillStyle = "#3ddc9a"; cx.fillRect(64, y + 14, 5, rowH - 40); }
      cx.fillStyle = "#a19cb4"; cx.font = FONT(700, 30); cx.fillText(String(r.pos), 92, my); await emb(r.k, 140, my - s / 2, s);
      cx.fillStyle = "#fff"; cx.font = FONT(700, 34); cx.fillText(fitText(cx, t.name, 380), 140 + s + 18, my);
      cx.textAlign = "right"; cx.font = FONT(500, 30); cx.fillStyle = "#cfcbe0"; cx.fillText(String(r.pj), W - 330, my); cx.fillText((r.dif > 0 ? "+" : "") + r.dif, W - 210, my);
      cx.font = FONT(800, 40); cx.fillStyle = "#fff"; cx.fillText(String(r.pts), W - 96, my); cx.textAlign = "left";
    }
  } else if (kind === "partido") {
    const m = D.ms.find(x => x.id === o.mid); if (!m) return; name = `onyx-${m.id}`;
    title(`Fecha ${m.fecha}`, [legLbl(m) || "Resultado final", m.map, m.ot ? "Prórroga" : "", m.noShow ? "W.O." : ""].filter(Boolean).join(" · "));
    const aw = +m.ra > +m.rb;
    await emb(m.a, 80, 370, 190); await emb(m.b, W - 270, 370, 190);
    cx.textAlign = "center"; cx.fillStyle = "#fff"; cx.font = FONT(800, 132); cx.fillText(`${m.ra}-${m.rb}`, W / 2, 470);
    cx.font = FONT(800, 38); cx.fillStyle = aw ? "#fff" : "#8f8aa6"; cx.fillText(fitText(cx, TM(m.a).name, 300), 175, 620); cx.fillStyle = !aw ? "#fff" : "#8f8aa6"; cx.fillText(fitText(cx, TM(m.b).name, 300), W - 175, 620); cx.textAlign = "left";
    for (const [i, k] of [m.a, m.b].entries()) {
      const rows = boxRows(m, k).slice(0, 5), x = i ? W / 2 + 12 : 64, w = W / 2 - 76;
      cx.fillStyle = "rgba(255,255,255,.04)"; rr(cx, x, 690, w, 540, 24); cx.fill();
      cx.fillStyle = TM(k).c; cx.fillRect(x, 690, w, 6);
      rows.forEach((r, j) => { const y = 750 + j * 96;
        cx.fillStyle = r.pid === m.mvpId ? "#e3c27e" : "#fff"; cx.font = FONT(700, 30); cx.fillText(fitText(cx, r.p ? r.p.name : "?", w - 60), x + 28, y);
        cx.fillStyle = "#a19cb4"; cx.font = FONT(500, 24); cx.fillText(`${r.acs} ACS · ${r.k}/${r.d}/${r.a}${r.pid === m.mvpId ? " · MVP" : ""}`, x + 28, y + 36); });
    }
  }
  cx.fillStyle = "#6f6a82"; cx.font = FONT(500, 22); cx.textAlign = "center"; cx.fillText(location.host || "ONYX", W / 2, H - 42); cx.textAlign = "left";
  try {
    const blob = await new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error("no")), "image/png"));
    const file = new File([blob], name + ".png", {type: "image/png"});
    if (navigator.canShare && matchMedia("(pointer: coarse)").matches && navigator.canShare({files: [file]})) { try { await navigator.share({files: [file], title: "ONYX"}); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    downloadFile(name + ".png", blob); toast("Imagen descargada. Lista para Discord o Instagram.");
  } catch (e) { toast("No se pudo armar la imagen en este navegador."); }
}
$("#tblImg") && $("#tblImg").addEventListener("click", () => shareImage("tabla"));

// clics que abren el centro del partido desde otras secciones
$("#homeRes") && $("#homeRes").addEventListener("click", e => { const g = e.target.closest("[data-mid]"); if (g) openMatch(g.dataset.mid); });
$("#standings") && $("#standings").addEventListener("click", e => { const g = e.target.closest(".mcard[data-mid]"); if (g) { e.stopPropagation(); openMatch(g.dataset.mid); } }, true);
$("#teamDetail") && $("#teamDetail").addEventListener("click", e => { const g = e.target.closest("[data-mid]"); if (g) openMatch(g.dataset.mid); });
// Partidos del equipo (en Equipos)
function teamMatchesHtml(k) {
  const ms = okMs().filter(m => m.a === k || m.b === k), last = ms.filter(m => m.status === "played").slice(-5).reverse(), next = ms.filter(m => m.status !== "played").slice(0, 3);
  const row = m => { const vs = m.a === k ? m.b : m.a, my = m.a === k ? m.ra : m.rb, op = m.a === k ? m.rb : m.ra, p = m.status === "played", won = p && +my > +op;
    return `<button type="button" class="td-m ${p ? (won ? "w" : "l") : ""}" data-mid="${m.id}"><span class="mono">F${m.fecha}${legTag(m)}</span>${img(vs)}<b>${esc(TM(vs).name)}</b><span class="r">${p ? `${won ? "V" : "D"} ${my}-${op}` : m.date ? fmtDate(m.date) : "A confirmar"}</span></button>`; };
  return `<div class="td-ms"><div><div class="td-mt">Últimos resultados</div>${last.map(row).join("") || '<span class="muted">Sin partidos jugados.</span>'}</div><div><div class="td-mt">Próximos</div>${next.map(row).join("") || '<span class="muted">No le quedan partidos.</span>'}</div></div>
    <div class="rowbtns" style="margin-top:12px"><button class="btn sm ghost" type="button" data-share="equipo:${k}" data-title="${esc(TM(k).name)}">${ico("i-share")}<span>Compartir equipo</span></button><button class="btn sm ghost" type="button" data-team-ics="${k}">${ico("i-calendar")}<span>Sus partidos al calendario</span></button></div>`;
}
$("#standings") && $("#standings").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches(".mcard[data-mid]")) openMatch(e.target.dataset.mid); });
$("#teamDetail") && $("#teamDetail").addEventListener("click", e => { const b = e.target.closest("[data-team-ics]"); if (b) exportIcs(D.pending.filter(m => m.a === b.dataset.teamIcs || m.b === b.dataset.teamIcs), b.dataset.teamIcs); });


/* ================= cuentas con mail, coaches y seguimiento ================= */
// Jugadores y coaches pueden crear su cuenta con mail (además de Discord). Los coaches piden su equipo:
// lo aprueba el capitán de ese equipo o el staff. Con eso tienen la sección Seguimiento (estadísticas, gráficos,
// qué mejorar y notas para el equipo o para cada jugador).
const isMailMember = () => !!(S.member && /^e_/.test(S.member.uid || ""));
const myCoachId = () => (S.member && S.member.coachId && (S.remote.coaches || {})[S.member.coachId]) ? S.member.coachId : null;
const myCoachTeams = () => { const id = myCoachId(); return id ? coachTeams({...S.remote.coaches[id]}) : []; };
const segTeams = () => S.staff ? TEAM_KEYS.slice() : myCoachTeams().length ? myCoachTeams() : S.captain && S.captain.team ? [S.captain.team] : [];
const isCoachUser = () => !!(S.member && !S.staff && !S.captain && myCoachTeams().length);

// ---------- crear cuenta ----------
function openSignup(role = "player") {
  if (!FB_READY) { toast("Primero configurá Firebase (ver README)."); return; }
  const teamOpts = TEAM_KEYS.map(k => opt(k, TM(k).name, false)).join("");
  modal(`<div class="box cut login-box su-box" style="--tc:#8b3dff"><div class="bh"><div><img class="login-mark" src="assets/onyx-logo.png" alt="" width="52" height="52"><h3>Crear cuenta</h3><div class="muted" style="font-size:14px">Para jugadores y coaches. Tu mail no se muestra en la página.</div></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <form class="bb" id="suForm" novalidate>
      <div class="seg su-role" id="suRole"><button type="button" data-r="player" class="${role === "player" ? "on" : ""}">Soy jugador</button><button type="button" data-r="coach" class="${role === "coach" ? "on" : ""}">Soy coach</button></div>
      <div class="ff"><label for="suN">Nick</label><input id="suN" maxlength="32" autocomplete="nickname" spellcheck="false"></div>
      <div class="ff"><label for="suE">Mail</label><input id="suE" type="email" autocomplete="email" autocapitalize="off" spellcheck="false"></div>
      <div class="ff"><label for="suP">Contraseña <small class="muted">(10 caracteres o más)</small></label><input id="suP" type="password" autocomplete="new-password"></div>
      <div class="ff"><label for="suR">Repetila</label><input id="suR" type="password" autocomplete="new-password"></div>
      <div class="su-coach" ${role === "coach" ? "" : "hidden"}><div class="ff"><label for="suT">¿De qué equipo querés ser coach?</label><select id="suT">${teamOpts}</select></div>
        <div class="ff"><label for="suM">Mensaje para el capitán <small class="muted">(opcional)</small></label><input id="suM" maxlength="200" placeholder="Ej.: entreno al equipo desde la temporada pasada"></div>
        <p class="adm-note">Lo aprueba el capitán de ese equipo o el staff. Cuando te aprueben, se te abre la sección Seguimiento.</p></div>
      <div class="err" id="suErr" hidden></div>
      <div class="rowbtns"><button class="btn gold" type="submit" id="suGo">Crear cuenta</button><button class="btn ghost" type="button" id="suLogin">Ya tengo cuenta</button></div>
      <div class="login-dc" style="padding:0">${DC_BTN("O entrá con Discord")}</div></form></div>`);
  let r = role;
  const showErr = t => { $("#suErr").hidden = !t; $("#suErr").textContent = t || ""; };
  $("#suRole").addEventListener("click", e => { const b = e.target.closest("[data-r]"); if (!b) return; r = b.dataset.r; $$("#suRole button").forEach(x => x.classList.toggle("on", x === b)); $(".su-coach").hidden = r !== "coach"; });
  $("#suLogin").addEventListener("click", () => openLogin());
  $("#suForm").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("#suN").value.trim(), email = $("#suE").value.trim().toLowerCase(), p = $("#suP").value, rep = $("#suR").value;
    if (name.length < 2) return showErr("Poné tu nick.");
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return showErr("Revisá el mail.");
    if (email.endsWith("@" + STAFF_DOMAIN)) return showErr("Ese mail no se puede usar.");
    if (p.length < 10) return showErr("La contraseña tiene que tener 10 caracteres o más.");
    if (p !== rep) return showErr("Las contraseñas no coinciden.");
    if (pwScore(p) < 2) return showErr("Es muy fácil de adivinar. Mezclá mayúsculas, minúsculas, números o símbolos.");
    const go = $("#suGo"); go.disabled = true; go.textContent = "Creando…"; showErr("");
    try {
      const body = {name, email, password: p, role: r}; if (r === "coach") { body.team = $("#suT").value; body.note = $("#suM").value.trim(); }
      let res; try { res = await fetch("/api/register", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify(body)}); } catch (er) { throw new Error("Sin conexión con el servidor. Probá de nuevo."); }
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error((j && j.error) || (res.status === 404 ? "Esta función todavía no está publicada en Netlify." : "No se pudo crear la cuenta."));
      await AUTH.signInWithEmailAndPassword(email, p);
      closeModal(); goView("perfil");
      toast(r === "coach" ? `¡Listo, ${name}! Tu pedido para ${TM(body.team).name} quedó enviado.` : `¡Listo, ${name}! Ahora buscá tu nombre y tocá “Soy yo”.`);
    } catch (er) { showErr(er.message || "No se pudo crear la cuenta."); }
    finally { const g = $("#suGo"); if (g) { g.disabled = false; g.textContent = "Crear cuenta"; } }
  });
}
async function forgotPassword(email) {
  email = String(email || "").trim().toLowerCase();
  if (!email.includes("@")) { toast("Escribí tu mail en el campo de arriba y tocá de nuevo."); return; }
  if (email.endsWith("@" + STAFF_DOMAIN)) { toast("Las cuentas de staff y capitanes las restablece un ultra staff."); return; }
  try { await AUTH.sendPasswordResetEmail(email); } catch (e) { if (e && e.code === "auth/too-many-requests") { toast("Demasiados intentos. Esperá unos minutos."); return; } }
  toast("Si ese mail tiene cuenta, te llega un correo para elegir una contraseña nueva. Revisá también el spam.");
}

// ---------- pedir ser coach desde el perfil ----------
function openCoachReq() {
  if (!S.member) { openSignup("coach"); return; }
  modal(`<div class="box cut"><div class="bh"><div><div class="eyebrow">Coaches</div><h3>Pedir ser coach</h3></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="bb"><div class="ff"><label for="crT">Equipo</label><select id="crT">${TEAM_KEYS.filter(k => !myCoachTeams().includes(k)).map(k => opt(k, TM(k).name, false)).join("")}</select></div>
      <div class="ff"><label for="crM">Mensaje para el capitán <small class="muted">(opcional)</small></label><input id="crM" maxlength="200"></div>
      <p class="adm-note">Lo aprueba el capitán de ese equipo o el staff.</p>
      <div class="rowbtns"><button class="btn gold" id="crGo" type="button">Enviar pedido</button></div></div></div>`);
  $("#crGo").addEventListener("click", async () => {
    const b = $("#crGo"); b.disabled = true;
    try { await api("/api/member", {action: "coachreq", team: $("#crT").value, note: $("#crM").value.trim()}); closeModal(); toast("Pedido enviado. Te avisamos acá cuando lo aprueben."); }
    catch (er) { toast(er.message); b.disabled = false; }
  });
}
function coachProfileHtml() {
  const R = S.myCoachReq, ts = myCoachTeams();
  if (ts.length) return `<div class="panel pad cut seg-cta"><div class="h3">${ico("i-whistle")} Sos coach de ${ts.map(k => `<b>${esc(TM(k).name)}</b>`).join(" y ")}</div>
      <p class="muted">En Seguimiento tenés las estadísticas de tus jugadores, gráficos, qué puede mejorar cada uno y tus notas.</p>
      <div class="rowbtns"><a class="btn gold" href="#seguimiento">${ico("i-pulse")}<span>Ir a Seguimiento</span></a>${R && R.status === "pend" ? `<span class="st pend">Pedido para ${esc(TM(R.team).name)} pendiente</span>` : `<button class="btn sm ghost" type="button" data-coach-req>Pedir otro equipo</button>`}</div></div>`;
  if (R && R.status === "pend") return `<div class="panel pad cut seg-cta"><div class="h3">${ico("i-whistle")} Pedido de coach</div><p class="muted">Pediste ser coach de <b>${esc(TM(R.team).name)}</b>. Lo aprueba el capitán de ese equipo o el staff. Apenas lo aprueben se te abre Seguimiento.</p></div>`;
  return `<div class="panel pad cut seg-cta"><div class="h3">${ico("i-whistle")} ¿Sos coach?</div>${R && R.status === "no" ? `<p class="muted">El pedido para <b>${esc(TM(R.team).name)}</b> fue rechazado. Podés pedir de nuevo o hablar con el capitán.</p>` : `<p class="muted">Pedí ser coach de un equipo: el capitán o el staff lo aprueban.</p>`}<div class="rowbtns"><button class="btn gold sm" type="button" data-coach-req>Pedir equipo</button></div></div>`;
}
$("#profRoot") && $("#profRoot").addEventListener("click", e => { if (e.target.closest("#profAcct")) openAccount(); if (e.target.closest("[data-coach-req]")) openCoachReq(); if (e.target.closest("[data-signup]")) openSignup(e.target.closest("[data-signup]").dataset.signup || "player"); });

// ---------- notas para el jugador (en su perfil) ----------
S.myNotes = null; let myNotesAt = 0, myNotesBusy = false;
async function loadMyNotes(force) {
  if (!S.member || !myPid() || myNotesBusy || (!force && Date.now() - myNotesAt < 60000)) return;
  myNotesBusy = true; myNotesAt = Date.now();
  try { const r = await api("/api/coach", {action: "mine"}); S.myNotes = r.notes || []; } catch (e) { S.myNotes = S.myNotes || []; }
  myNotesBusy = false; schedule();
}
const NK = {mejorar: ["A mejorar", "loss"], bien: ["Bien hecho", "win"], nota: ["Nota", "accent"]};
const noteHtml = (n, edit) => `<div class="cn-n" data-note="${n.id}" style="--nc:var(--${NK[n.kind] ? NK[n.kind][1] : "accent"})"><div class="cn-h"><span class="cn-k">${NK[n.kind] ? NK[n.kind][0] : "Nota"}</span>${edit ? `<span class="cn-v">${{private: "Solo yo", team: "Todo el equipo", player: "Solo el jugador"}[n.vis] || ""}</span>` : `<span class="cn-v">${n.pid ? "Para vos" : "Para el equipo"}${n.coachName ? " · " + esc(n.coachName) : ""}</span>`}<span class="sp"></span><time>${new Date(n.upd || n.at).toLocaleDateString("es-AR", {day: "2-digit", month: "2-digit"})}</time>${edit ? `<button type="button" class="linkish" data-note-edit="${n.id}">Editar</button><button type="button" class="linkish" data-note-del="${n.id}">Borrar</button>` : ""}</div><p>${esc(n.text).replace(/\n/g, "<br>")}</p></div>`;
function playerCoachHtml(pid) {
  loadMyNotes();
  const p = D.PM[pid], ins = p && p.team ? insights(p) : null, notes = S.myNotes || [];
  return `<div class="panel pad cut"><div class="h3">${ico("i-whistle")} Tu seguimiento</div>
    ${ins ? `<div class="ins-cols">${insHtml(ins)}</div>` : ""}
    <div class="h3" style="font-size:15px;margin-top:14px">Notas de tu coach</div>${S.myNotes == null ? '<p class="muted">Cargando…</p>' : notes.length ? `<div class="cn-list">${notes.map(n => noteHtml(n, false)).join("")}</div>` : `<p class="muted">${p && p.team && coachesOf(p.team).length ? "Tu coach todavía no dejó notas." : "Tu equipo todavía no tiene coach en la página."}</p>`}</div>`;
}

// ---------- números de cada jugador y qué puede mejorar ----------
function pnums(p) {
  const L = p.log || [], m = L.length, R = L.reduce((s, e) => s + (e.rounds || 0), 0) || 1;
  const k = L.reduce((s, e) => s + e.k, 0), d = L.reduce((s, e) => s + e.d, 0), a = L.reduce((s, e) => s + e.a, 0), acsL = L.map(e => e.acs);
  const mean = m ? acsL.reduce((s, x) => s + x, 0) / m : 0, sd = m > 1 ? Math.sqrt(acsL.reduce((s, x) => s + (x - mean) ** 2, 0) / (m - 1)) : 0;
  const last = acsL.slice(-3), lastAvg = last.length ? last.reduce((s, x) => s + x, 0) / last.length : 0;
  return {m, acs: Math.round(mean), kd: d ? k / d : k, kpr: k / R, dpr: d / R, apr: a / R, win: m ? L.filter(e => e.won).length / m : 0, sd, cv: mean ? sd / mean : 0, lastAvg, acsL, L};
}
function roleAvg(role) {
  const pool = D.P.filter(x => x.s.m && (role ? x.role === role : true)), src = pool.length >= 3 ? pool : D.P.filter(x => x.s.m);
  const ns = src.map(pnums), av = f => ns.length ? ns.reduce((s, x) => s + f(x), 0) / ns.length : 0;
  return {n: ns.length, acs: av(x => x.acs), kd: av(x => x.kd), kpr: av(x => x.kpr), dpr: av(x => x.dpr), apr: av(x => x.apr), byRole: pool.length >= 3};
}
const UTIL_ROLES = ["Iniciador", "Controlador", "Centinela"];
function insights(p) {
  const n = pnums(p), av = roleAvg(p.role), good = [], bad = [], lbl = av.byRole ? `los ${p.role.toLowerCase()}s` : "la liga";
  if (n.m < 2) return {n, av, good, bad: [], few: true};
  const pct = (a, b) => b ? Math.round((a / b - 1) * 100) : 0;
  if (n.acs >= av.acs * 1.1) good.push(`Mucho impacto: ${n.acs} de ACS, ${pct(n.acs, av.acs)}% más que el promedio de ${lbl}.`);
  else if (n.acs <= av.acs * .88) bad.push(`Impacto bajo: ${n.acs} de ACS contra ${Math.round(av.acs)} de ${lbl}. Buscar más participación en las rondas.`);
  if (n.kd >= Math.max(1.1, av.kd * 1.12)) good.push(`Gana sus duelos: K/D ${dec(n.kd)}.`);
  else if (n.kd < Math.min(.95, av.kd * .9)) bad.push(`Pierde más duelos de los que gana (K/D ${dec(n.kd)}). Trabajar posicionamiento, no pelear solo y jugar con trade.`);
  if (n.dpr > av.dpr * 1.1) bad.push(`Muere en ${Math.round(n.dpr * 100)}% de las rondas (promedio ${Math.round(av.dpr * 100)}%). Cuidar la vida: menos entradas sin utilidad y mejores rotaciones.`);
  else if (n.dpr < av.dpr * .9) good.push(`Cuida la vida: muere en ${Math.round(n.dpr * 100)}% de las rondas.`);
  if (UTIL_ROLES.includes(p.role) && n.apr < av.apr * .85) bad.push(`Pocas asistencias para un ${p.role.toLowerCase()} (${dec(n.apr * 10)} cada 10 rondas). Usar más utilidad para el equipo.`);
  else if (n.apr > av.apr * 1.15) good.push(`Juega para el equipo: ${dec(n.apr * 10)} asistencias cada 10 rondas.`);
  if (p.role === "Duelista" && n.kpr < av.kpr * .9) bad.push(`Como duelista le faltan kills de entrada (${dec(n.kpr * 10)} cada 10 rondas). Practicar el primer contacto.`);
  if (n.m >= 4 && n.lastAvg && n.lastAvg < n.acs * .85) bad.push(`Viene en baja: ${Math.round(n.lastAvg)} de ACS en los últimos 3 partidos contra ${n.acs} de su temporada.`);
  if (n.m >= 4 && n.lastAvg > n.acs * 1.12) good.push(`Viene en alza: ${Math.round(n.lastAvg)} de ACS en los últimos 3 partidos.`);
  if (n.m >= 4 && n.cv > .32) bad.push("Rendimiento irregular: alterna partidos muy buenos con otros flojos. Buscar una rutina previa estable.");
  else if (n.m >= 4 && n.cv < .15) good.push("Muy regular: rinde parecido todos los partidos.");
  return {n, av, good, bad, few: false};
}
const insHtml = ins => ins.few ? '<p class="muted">Con 2 partidos o más aparecen sus fortalezas y qué puede mejorar.</p>'
  : `<div class="ins ins-g"><b>${ico("i-check")} Fortalezas</b>${ins.good.map(t => `<span>${esc(t)}</span>`).join("") || '<span class="muted">Todavía no se destaca en nada puntual.</span>'}</div>
     <div class="ins ins-b"><b>${ico("i-target")} Para mejorar</b>${ins.bad.map(t => `<span>${esc(t)}</span>`).join("") || '<span class="muted">Nada para marcar: viene bien en todo.</span>'}</div>`;

// ---------- gráficos simples (SVG) ----------
function lineSvg(series, labels, {h = 190, fmtV = v => Math.round(v), min = null} = {}) {
  const W = 640, pl = 40, pr = 12, pt = 14, pb = 26, all = series.flatMap(s => s.v.filter(v => v != null));
  if (!all.length || labels.length < 1) return '<p class="muted">Todavía no hay partidos.</p>';
  let lo = min != null ? min : Math.min(...all), hi = Math.max(...all); if (hi === lo) { hi += 1; lo = Math.max(0, lo - 1); } const pad = (hi - lo) * .12; lo = min != null ? min : lo - pad; hi += pad;
  const X = i => labels.length === 1 ? (pl + W - pr) / 2 : pl + i * (W - pl - pr) / (labels.length - 1), Y = v => pt + (1 - (v - lo) / (hi - lo)) * (h - pt - pb);
  const ticks = [0, .5, 1].map(f => lo + f * (hi - lo));
  return `<svg class="ch" viewBox="0 0 ${W} ${h}" role="img">${ticks.map(t => `<line x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}" class="ch-g"/><text x="${pl - 6}" y="${Y(t) + 4}" text-anchor="end" class="ch-t">${fmtV(t)}</text>`).join("")}
    ${labels.map((l, i) => (labels.length <= 12 || i % Math.ceil(labels.length / 12) === 0) ? `<text x="${X(i)}" y="${h - 6}" text-anchor="middle" class="ch-t">${esc(l)}</text>` : "").join("")}
    ${series.map(s => { const pts = s.v.map((v, i) => v == null ? null : [X(i), Y(v)]).filter(Boolean);
      return `<polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="${s.c}" stroke-width="${s.dash ? 1.6 : 2.4}" ${s.dash ? 'stroke-dasharray="5 5"' : ""} stroke-linejoin="round" stroke-linecap="round"/>${s.dash ? "" : pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${s.c}"><title>${esc(labels[i] || "")}: ${fmtV(s.v.filter(v => v != null)[i])}</title></circle>`).join("")}`; }).join("")}</svg>
    <div class="ch-leg">${series.map(s => `<span><i style="background:${s.c};${s.dash ? "opacity:.6" : ""}"></i>${esc(s.n)}</span>`).join("")}</div>`;
}
function cmpBars(rows) {
  return `<div class="cmp">${rows.map(([l, v, a, f, hiGood = true]) => { const mx = Math.max(v, a, .0001), good = hiGood ? v >= a : v <= a;
    return `<div class="cmp-r"><span class="cmp-l">${l}</span><div class="cmp-b"><i class="me ${good ? "good" : "bad"}" style="width:${v / mx * 100}%"></i><i class="avg" style="width:${a / mx * 100}%"></i></div><b class="${good ? "good" : "bad"}">${f(v)}</b><small>${f(a)}</small></div>`; }).join("")}</div>`;
}

// ---------- sección Seguimiento ----------
S.seg = {team: null, pid: null, edit: null}; S.cn = {notes: [], loaded: false, busy: false, err: ""};
async function loadCoachNotes(force) {
  if (!isCoachUser() || S.cn.busy || (S.cn.loaded && !force)) return;
  S.cn.busy = true;
  try { const r = await api("/api/coach", {action: "list"}); S.cn.notes = r.notes || []; S.cn.err = ""; } catch (e) { S.cn.err = e.message; }
  S.cn.loaded = true; S.cn.busy = false; renderSeg();
}
function renderSeg() {
  const ts = segTeams(), sec = $("#seguimiento"), nav = $("#navSeg");
  if (nav) nav.hidden = !ts.length; if (sec) sec.hidden = !ts.length;
  const root = $("#segRoot"); if (!root || !ts.length) return;
  if (!ts.includes(S.seg.team)) { S.seg.team = ts[0]; S.seg.pid = null; }
  const k = S.seg.team, t = TM(k), r = D.real.find(x => x.k === k) || {}, rs = roster(k), coach = isCoachUser() && myCoachTeams().includes(k);
  if (coach) loadCoachNotes();
  const ms = D.played.filter(m => m.a === k || m.b === k), lab = ms.map(m => `F${m.fecha}${m.leg ? (m.leg === "ida" ? "i" : "v") : ""}`);
  const tAcs = ms.map(m => { const v = Object.values(m.stats || {}).filter(s => (s.t || "") === k); return v.length ? v.reduce((s, x) => s + (+x.acs || 0), 0) / v.length : null; });
  const lAcs = ms.map(m => { const v = Object.values(m.stats || {}); return v.length ? v.reduce((s, x) => s + (+x.acs || 0), 0) / v.length : null; });
  const tKd = ms.map(m => { const v = Object.values(m.stats || {}).filter(s => (s.t || "") === k), kk = v.reduce((s, x) => s + (+x.k || 0), 0), dd = v.reduce((s, x) => s + (+x.d || 0), 0); return v.length ? (dd ? kk / dd : kk) : null; });
  const rDiff = ms.map(m => m.a === k ? m.ra - m.rb : m.rb - m.ra);
  const ws = ms.filter(m => (m.a === k ? +m.ra > +m.rb : +m.rb > +m.ra)).length;
  const P = rs.filter(p => p.s.m).map(p => ({p, n: pnums(p), ins: insights(p)})).sort((a, b) => b.n.acs - a.n.acs);
  const best = f => P.length ? P.reduce((a, b) => f(b) > f(a) ? b : a) : null;
  const tops = P.length ? [["MVP del equipo", best(x => mvpScore(x.p)), x => `${x.n.acs} ACS`], ["Mejor K/D", best(x => x.n.kd), x => `K/D ${dec(x.n.kd)}`], ["Más asistencias", best(x => x.n.apr), x => `${dec(x.n.apr * 10)} cada 10 rondas`], ["En alza", best(x => x.n.m >= 3 ? x.n.lastAvg - x.n.acs : -1e9), x => `${Math.round(x.n.lastAvg)} ACS últimos 3`]] : [];
  const tnotes = coach ? S.cn.notes.filter(n => n.team === k && !n.pid) : [];
  const sel = S.seg.pid && D.PM[S.seg.pid] && D.PM[S.seg.pid].team === k ? D.PM[S.seg.pid] : null;
  root.innerHTML = `<div class="seg-top">${ts.length > 1 ? `<select id="segTeam" aria-label="Equipo">${ts.map(x => opt(x, TM(x).name, x === k)).join("")}</select>` : ""}
      <div class="seg-team" style="--tc:${t.c}">${img(k)}<div><b>${esc(t.name)}</b><small>${r.pos || "–"}° · ${r.pts || 0} pts · ${ws}-${ms.length - ws} · ${coachesOf(k).length ? "Coach: " + coachesOf(k).map(c => esc(c.name)).join(", ") : "sin coach"}</small></div></div>
      <span class="sp"></span>${coach ? '<span class="st ok">Sos coach de este equipo</span>' : S.staff ? '<span class="st pend">Vista de staff</span>' : '<span class="st pend">Vista de capitán</span>'}</div>
    <div class="seg-kpis">${[["Posición", (r.pos || "–") + "°"], ["Victorias", `${ws}/${ms.length}`], ["Dif. de rondas", (r.dif > 0 ? "+" : "") + (r.dif || 0)], ["ACS del equipo", tAcs.filter(v => v != null).length ? Math.round(tAcs.filter(v => v != null).reduce((s, v) => s + v, 0) / tAcs.filter(v => v != null).length) : "–"], ["K/D del equipo", dec(r.kd || 0)]].map(([l, v]) => `<div><b>${v}</b><span>${l}</span></div>`).join("")}</div>
    <div class="seg-grid">
      <div class="panel pad cut"><div class="h3">ACS por partido <small>equipo contra el promedio de la liga</small></div>${lineSvg([{n: t.name, c: t.c || "#9085e9", v: tAcs}, {n: "Promedio de la liga", c: "#a19cb4", v: lAcs, dash: true}], lab)}</div>
      <div class="panel pad cut"><div class="h3">K/D y diferencia de rondas</div>${lineSvg([{n: "K/D", c: "#3ddc9a", v: tKd}, {n: "Empate (1,00)", c: "#a19cb4", v: tKd.map(() => 1), dash: true}], lab, {fmtV: v => dec(v), min: 0})}
        <div class="seg-rd">${ms.map((m, i) => `<button type="button" class="${rDiff[i] > 0 ? "w" : "l"}" data-mid="${m.id}" title="${esc(lab[i])} vs ${esc(TM(m.a === k ? m.b : m.a).name)}: ${m.a === k ? m.ra : m.rb}-${m.a === k ? m.rb : m.ra}"><i style="height:${Math.min(100, Math.abs(rDiff[i]) / 13 * 100)}%"></i><small>${rDiff[i] > 0 ? "+" : ""}${rDiff[i]}</small></button>`).join("")}</div></div>
    </div>
    ${tops.length ? `<div class="seg-tops">${tops.map(([l, x, f]) => x ? `<button type="button" class="seg-top1" data-seg-p="${x.p.id}"><small>${l}</small><b>${esc(x.p.name)}</b><span>${f(x)}</span></button>` : "").join("")}</div>` : ""}
    <div class="panel pad cut"><div class="h3">Jugadores <small>tocá uno para ver su detalle${coach ? " y dejarle notas" : ""}</small></div>
      <div class="tbl-wrap"><table class="st seg-tbl"><thead><tr><th>Jugador</th><th>PJ</th><th>ACS</th><th>K/D</th><th>Kills/10r</th><th>Muertes/10r</th><th>Asist/10r</th><th>Últimos 3</th><th>Para mejorar</th></tr></thead><tbody>
      ${P.map(({p, n, ins}) => `<tr class="${sel && sel.id === p.id ? "on" : ""}" data-seg-p="${p.id}" tabindex="0"><td><b>${esc(p.name)}</b><small class="muted"> ${esc(p.role)}</small></td><td>${n.m}</td><td><b>${n.acs}</b></td><td class="${n.kd >= 1 ? "kdp" : "kdn"}">${dec(n.kd)}</td><td>${dec(n.kpr * 10)}</td><td>${dec(n.dpr * 10)}</td><td>${dec(n.apr * 10)}</td>
        <td>${spark(n.acsL.slice(-6), t.c)}<span class="${n.m >= 3 && n.lastAvg < n.acs * .9 ? "kdn" : n.m >= 3 && n.lastAvg > n.acs * 1.1 ? "kdp" : ""}">${n.m >= 3 ? Math.round(n.lastAvg) : "–"}</span></td><td>${ins.few ? '<span class="muted">pocos datos</span>' : ins.bad.length ? `<span class="pill bad">${ins.bad.length}</span>` : '<span class="pill good">ok</span>'}</td></tr>`).join("")}
      ${rs.filter(p => !p.s.m).map(p => `<tr data-seg-p="${p.id}" tabindex="0" class="${sel && sel.id === p.id ? "on" : ""}"><td><b>${esc(p.name)}</b><small class="muted"> ${esc(p.role)}</small></td><td colspan="8" class="muted">Sin partidos jugados</td></tr>`).join("") || ""}</tbody></table></div></div>
    <div id="segP">${sel ? segPlayerHtml(sel, coach) : ""}</div>
    ${coach ? `<div class="panel pad cut"><div class="h3">${ico("i-chat")} Notas para el equipo</div>${noteForm(k, null)}${S.cn.err ? `<p class="err">${esc(S.cn.err)}</p>` : ""}<div class="cn-list">${tnotes.map(n => noteHtml(n, true)).join("") || '<p class="muted">Todavía no escribiste notas generales.</p>'}</div></div>` : ""}`;
}
function spark(vals, c) {
  if (vals.length < 2) return "";
  const lo = Math.min(...vals), hi = Math.max(...vals), W = 60, H = 18, X = i => i * W / (vals.length - 1), Y = v => H - 2 - (hi === lo ? .5 : (v - lo) / (hi - lo)) * (H - 4);
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><polyline points="${vals.map((v, i) => `${X(i)},${Y(v)}`).join(" ")}" fill="none" stroke="${c || "#9085e9"}" stroke-width="1.8"/></svg>`;
}
function noteForm(k, pid) {
  const ed = S.seg.edit && S.cn.notes.find(n => n.id === S.seg.edit && n.team === k && (n.pid || null) === (pid || null));
  return `<form class="cn-form" data-team="${k}" data-pid="${pid || ""}" ${ed ? `data-id="${ed.id}"` : ""}>
    <textarea maxlength="1500" placeholder="${pid ? "Qué tiene que mejorar, qué hizo bien, ejercicios…" : "Plan de la semana, objetivos, estrategia…"}" required>${ed ? esc(ed.text) : ""}</textarea>
    <div class="cn-opts"><select name="kind" aria-label="Tipo">${[["mejorar", "A mejorar"], ["bien", "Bien hecho"], ["nota", "Nota"]].map(([v, l]) => opt(v, l, ed ? ed.kind === v : v === (pid ? "mejorar" : "nota"))).join("")}</select>
      <select name="vis" aria-label="Quién la ve">${(pid ? [["player", "La ve solo el jugador"], ["private", "Solo yo (privada)"]] : [["team", "La ve todo el equipo"], ["private", "Solo yo (privada)"]]).map(([v, l]) => opt(v, l, ed ? ed.vis === v : false)).join("")}</select>
      <button class="btn sm gold" type="submit">${ed ? "Guardar cambios" : "Agregar nota"}</button>${ed ? '<button class="btn sm ghost" type="button" data-note-cancel>Cancelar</button>' : ""}</div></form>`;
}
function segPlayerHtml(p, coach) {
  const ins = insights(p), n = ins.n, av = ins.av, t = TM(p.team), notes = coach ? S.cn.notes.filter(x => x.pid === p.id) : [];
  const lab = n.L.map(e => `F${e.f}${e.lg ? e.lg[0].toLowerCase() : ""}`);
  return `<div class="panel pad cut seg-p" style="--tc:${t.c}"><div class="seg-ph"><span class="ava">${esc(p.name.slice(0, 2).toUpperCase())}</span><div><div class="eyebrow">${esc(p.role)} · ${esc(t.name)}</div><h3>${esc(p.name)}</h3></div><span class="sp"></span>${trackerBtn(p.id)}<button class="btn sm ghost" type="button" data-seg-an="${p.id}">Análisis completo</button><button class="x" type="button" data-seg-close aria-label="Cerrar">×</button></div>
    ${n.m ? `<div class="seg-grid"><div><div class="h3" style="font-size:15px">ACS por partido</div>${lineSvg([{n: p.name, c: t.c || "#9085e9", v: n.acsL}, {n: `Promedio de ${av.byRole ? "su rol" : "la liga"}`, c: "#a19cb4", v: n.acsL.map(() => av.acs), dash: true}], lab, {h: 170})}</div>
      <div><div class="h3" style="font-size:15px">Contra el promedio de ${av.byRole ? "su rol" : "la liga"}</div>${cmpBars([["ACS", n.acs, av.acs, v => Math.round(v)], ["K/D", n.kd, av.kd, v => dec(v)], ["Kills cada 10 rondas", n.kpr * 10, av.kpr * 10, v => dec(v)], ["Muertes cada 10 rondas", n.dpr * 10, av.dpr * 10, v => dec(v), false], ["Asist. cada 10 rondas", n.apr * 10, av.apr * 10, v => dec(v)]])}<p class="adm-note">Barra de color: ${esc(p.name)} · barra gris: promedio.</p></div></div>
      <div class="ins-cols">${insHtml(ins)}</div>` : '<p class="muted">Todavía no jugó partidos esta temporada.</p>'}
    ${coach ? `<div class="h3" style="font-size:15px;margin-top:16px">${ico("i-chat")} Notas para ${esc(p.name)}</div>${noteForm(p.team, p.id)}<div class="cn-list">${notes.map(x => noteHtml(x, true)).join("") || '<p class="muted">Todavía no le dejaste notas.</p>'}</div>` : ""}</div>`;
}
$("#segRoot") && $("#segRoot").addEventListener("change", e => { if (e.target.id === "segTeam") { S.seg.team = e.target.value; S.seg.pid = null; S.seg.edit = null; renderSeg(); } });
$("#segRoot") && $("#segRoot").addEventListener("click", async e => {
  const mid = e.target.closest("[data-mid]"); if (mid) { openMatch(mid.dataset.mid); return; }
  const an = e.target.closest("[data-seg-an]"); if (an) { openAnalysis(an.dataset.segAn); return; }
  if (e.target.closest("[data-seg-close]")) { S.seg.pid = null; renderSeg(); return; }
  const pr = e.target.closest("[data-seg-p]"); if (pr) { S.seg.pid = S.seg.pid === pr.dataset.segP && pr.tagName === "TR" ? null : pr.dataset.segP; S.seg.edit = null; renderSeg(); if (S.seg.pid) requestAnimationFrame(() => { const x = $("#segP"); if (x) x.scrollIntoView({behavior: reduced ? "auto" : "smooth", block: "start"}); }); return; }
  const ed = e.target.closest("[data-note-edit]"); if (ed) { S.seg.edit = ed.dataset.noteEdit; renderSeg(); return; }
  if (e.target.closest("[data-note-cancel]")) { S.seg.edit = null; renderSeg(); return; }
  const del = e.target.closest("[data-note-del]");
  if (del) { if (!await confirmTyped({title: "Borrar la nota", html: "<p>La nota desaparece para vos y para quien la veía.</p>", word: "SI", btn: "Borrar", danger: true})) return;
    try { await api("/api/coach", {action: "del", id: del.dataset.noteDel}); S.cn.notes = S.cn.notes.filter(n => n.id !== del.dataset.noteDel); toast("Nota borrada."); renderSeg(); } catch (er) { toast(er.message); } }
});
$("#segRoot") && $("#segRoot").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("tr[data-seg-p]")) e.target.click(); });
$("#segRoot") && $("#segRoot").addEventListener("submit", async e => {
  const f = e.target.closest(".cn-form"); if (!f) return; e.preventDefault();
  const text = f.querySelector("textarea").value.trim(); if (!text) { toast("Escribí la nota."); return; }
  const body = {action: "save", team: f.dataset.team, pid: f.dataset.pid || null, text, kind: f.kind.value, vis: f.vis.value}; if (f.dataset.id) body.id = f.dataset.id;
  const b = f.querySelector("[type=submit]"); b.disabled = true;
  try {
    const r = await api("/api/coach", body), now = Date.now();
    if (body.id) S.cn.notes = S.cn.notes.map(n => n.id === body.id ? {...n, text, kind: body.kind, vis: body.vis, upd: now} : n);
    else S.cn.notes.unshift({id: r.id, team: body.team, pid: body.pid, text, kind: body.kind, vis: body.vis, at: now, upd: now});
    S.seg.edit = null; toast(body.vis === "private" ? "Nota guardada (solo la ves vos)." : body.pid ? "Nota guardada: la ve el jugador en su perfil." : "Nota guardada: la ve todo el equipo en su perfil."); renderSeg();
  } catch (er) { toast(er.message); b.disabled = false; }
});

// ---------- capitán: coaches que pidieron sumarse ----------
function capCoachRegCard(k) {
  const L = Object.entries(S.requests).map(([id, r]) => ({id, ...r})).filter(r => r.type === "coachreg" && r.team === k && r.status === "pend");
  if (!L.length) return "";
  return `<div class="adm-card"><h3>${ico("i-whistle")} Coaches que quieren sumarse <small>si lo aprobás, ${esc(TM(k).name)} le paga ${fmt(coachCfg().salary)} coins por semana</small></h3>${L.map(r => `<div class="req" style="--st:var(--gold)">${r.avatar ? `<img src="${esc(r.avatar)}" alt="" referrerpolicy="no-referrer" style="border-radius:50%">` : img(k)}<div><div class="rq-t"><b>${esc(r.name)}</b> quiere ser coach del equipo</div><div class="rq-m">${dt(r.at)}${r.note ? ` · “${esc(r.note)}”` : ""}</div></div>
    <div class="rq-acts"><span class="rowbtns"><button class="btn sm gold" data-cap-act="coachreg-ok:${r.id}">Aceptar</button><button class="btn sm ghost" data-cap-act="coachreg-no:${r.id}">Rechazar</button></span></div></div>`).join("")}</div>`;
}
async function reviewCoachReg(id, ok, b) {
  if (b) b.disabled = true;
  try { await api("/api/member", {action: "coachok", id, ok}); toast(ok ? "Coach aprobado: ya puede usar Seguimiento." : "Pedido rechazado."); }
  catch (er) { toast(er.message); if (b) b.disabled = false; }
}


/* ================= fixture: generar la temporada y borrar fechas (ultra) ================= */
// Sorteo de todos contra todos: el orden de los equipos se sortea, cada vuelta usa el método del círculo
// (cada equipo juega una vez por fecha y, si son impares, descansa una vez por vuelta) y en la vuelta siguiente
// se invierte quién es local. Las vueltas se ordenan para que un mismo cruce nunca se repita en fechas seguidas.
const rnd = n => { try { const u = new Uint32Array(1); crypto.getRandomValues(u); return u[0] % n; } catch (e) { return Math.floor(Math.random() * n); } };
const shuffled = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const pairKey = (x, y) => [x, y].sort().join("~");
function circle(keys) {
  const a = keys.length % 2 ? [...keys, null] : [...keys], n = a.length, out = [];
  for (let r = 0; r < n - 1; r++) {
    const ms = []; let bye = null;
    for (let i = 0; i < n / 2; i++) { const x = a[i], y = a[n - 1 - i];
      if (x === null) bye = y; else if (y === null) bye = x; else ms.push((i === 0 ? r % 2 : i % 2) ? [y, x] : [x, y]); }
    out.push({ms, bye}); a.splice(1, 0, a.pop());
  }
  return out;
}
function planSeason(keys, rounds = 2) {
  if (keys.length < 2) return [];
  const base = circle(shuffled(keys));
  const out = [];
  for (let r = 0; r < rounds; r++) {
    const flip = r % 2 === 1;
    let order = shuffled(base.map((_, i) => i));
    // que el primer cruce de esta vuelta no sea uno de la última fecha de la anterior
    const last = out.length ? new Set(out[out.length - 1].ms.map(([a, b]) => pairKey(a, b))) : null;
    for (let t = 0; t < 300 && last && base[order[0]].ms.some(([a, b]) => last.has(pairKey(a, b))); t++) order = shuffled(order);
    order.forEach(i => out.push({ms: base[i].ms.map(([a, b]) => flip ? [b, a] : [a, b]), bye: base[i].bye, round: r + 1}));
  }
  return out;
}
// Días y horas: primera fecha + días entre fechas; dentro de la fecha, un partido cada "gap" minutos
function planDates(plan, {start, hour, gap, every, legs}) {
  if (!start) return plan.map(fd => fd.ms.map(() => legs ? ["", ""] : [""]));
  const [y, mo, d] = start.split("-").map(Number), [h, mi] = (hour || "21:00").split(":").map(Number);
  const iso = t => { const x = new Date(t); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}T${String(x.getUTCHours()).padStart(2, "0")}:${String(x.getUTCMinutes()).padStart(2, "0")}`; };
  return plan.map((fd, f) => { const t0 = Date.UTC(y, mo - 1, d + f * (every || 7), h || 0, mi || 0); let k = 0;
    return fd.ms.map(() => legs ? [iso(t0 + (k++) * gap * 60000), iso(t0 + (k++) * gap * 60000)] : [iso(t0 + (k++) * gap * 60000)]); });
}
S.fx = {rounds: 2, legs: false, start: "", hour: "21:00", gap: 90, every: 7, plan: null};
function openFixtureGen() {
  if (!isUltra()) { toast("Esto lo hace ultra staff."); return; }
  const F = S.fx, from = (D.fechas || 0) + 1;
  if (!F.plan || F.plan.keys !== TEAM_KEYS.join() || F.plan.rounds !== F.rounds) { F.plan = planSeason(TEAM_KEYS, F.rounds); F.plan.keys = TEAM_KEYS.join(); F.plan.rounds = F.rounds; }
  const P = F.plan, dates = planDates(P, F), per = P[0] ? P[0].ms.length : 0, total = P.reduce((s, fd) => s + fd.ms.length, 0) * (F.legs ? 2 : 1);
  const vs = (a, b) => `<span class="fx-m">${img(a)}<b>${esc(TM(a).name)}</b><i>vs</i><b>${esc(TM(b).name)}</b>${img(b)}</span>`;
  modal(`<div class="box cut fx-box"><div class="bh"><div><div class="eyebrow">Ultra staff · Partidos</div><h3>Generar la temporada</h3><div class="muted" style="font-size:14px">Todos contra todos, sorteado y parejo para los ${TEAM_KEYS.length} equipos.</div></div><button class="x" data-close aria-label="Cerrar">×</button></div>
    <div class="bb">
      <div class="fgrid">
        ${fld("Cuántas veces se enfrentan", `<select id="fxR">${[1, 2, 3, 4].map(n => opt(n, n === 1 ? "1 vez" : `${n} veces`, n === F.rounds)).join("")}</select>`)}
        ${fld("Cada cruce", `<select id="fxL">${opt("0", "Partido único", !F.legs)}${opt("1", "Ida y vuelta en la misma fecha", F.legs)}</select>`)}
        ${fld("Día de la primera fecha", `<input id="fxS" type="date" value="${esc(F.start)}">`)}
        ${fld("Hora del primer partido", `<input id="fxH" type="time" value="${esc(F.hour)}">`)}
        ${fld("Minutos entre partidos", `<input id="fxG" type="number" min="15" max="600" step="15" value="${F.gap}">`)}
        ${fld("Días entre fechas", `<input id="fxE" type="number" min="1" max="60" value="${F.every}">`)}</div>
      <p class="adm-note">Se crean <b>${P.length} fechas</b> (de la ${from} a la ${from + P.length - 1}) con <b>${total} partidos</b>: ${per} cruce${per === 1 ? "" : "s"} por fecha${TEAM_KEYS.length % 2 ? ", y cada equipo descansa una fecha por vuelta" : ""}. En cada vuelta se invierte quién es local y un mismo cruce nunca se repite en fechas seguidas.${F.start ? "" : " Sin día, los partidos quedan “a confirmar” y se completan después."}${D.fechas ? ` Ya hay ${D.fechas} fecha${D.fechas === 1 ? "" : "s"} cargada${D.fechas === 1 ? "" : "s"}: las nuevas van a continuación.` : ""}</p>
      <div class="fx-prev">${P.map((fd, i) => `<div class="fx-f"><header><b>Fecha ${from + i}</b><small>${F.rounds > 1 ? `Vuelta ${fd.round}` : ""}${dates[i][0] && dates[i][0][0] ? " · " + fmtDate(dates[i][0][0], false) : ""}</small></header>${fd.ms.map(([a, b]) => vs(a, b)).join("")}${fd.bye ? `<span class="fx-bye">Libre: ${esc(TM(fd.bye).name)}</span>` : ""}</div>`).join("")}</div>
      <div class="rowbtns"><button class="btn gold" id="fxGo" type="button">Crear ${P.length} fechas</button><button class="btn" id="fxAgain" type="button">${ico("i-swap")}<span>Sortear de nuevo</span></button><button class="btn ghost" type="button" data-close>Cancelar</button></div></div></div>`);
  const read = () => { F.rounds = +$("#fxR").value || 2; F.legs = $("#fxL").value === "1"; F.start = $("#fxS").value; F.hour = $("#fxH").value || "21:00"; F.gap = Math.max(15, +$("#fxG").value || 90); F.every = Math.max(1, +$("#fxE").value || 7); };
  $(".fx-box").addEventListener("change", e => { if (e.target.matches("select, input")) { read(); openFixtureGen(); } });
  $("#fxAgain").addEventListener("click", () => { read(); F.plan = null; openFixtureGen(); });
  $("#fxGo").addEventListener("click", async () => { read(); const b = $("#fxGo"); b.disabled = true; b.textContent = "Creando…"; await createSeason(); });
}
async function createSeason() {
  const F = S.fx, P = F.plan, from = (D.fechas || 0) + 1, dates = planDates(P, F), base = {status: "pending", ra: null, rb: null, ot: false, noShow: null, map: null, proj: null, mvp: null, stats: {}};
  const taken = new Set(Object.keys(S.remote.matches || {})), idFor = (f, i, v) => { const id = `f${f}m${i}${v ? "v" : ""}`; return taken.has(id) ? newId("m") : id; };
  let n = 0;
  try {
    for (const [j, fd] of P.entries()) {
      const f = from + j;
      for (const [i, [A, B]] of fd.ms.entries()) {
        const id = idFor(f, i, false); taken.add(id);
        await save(`matches/${id}`, {...base, fecha: f, a: A, b: B, date: dates[j][i][0] || "", leg: F.legs ? "ida" : null}); n++;
        if (F.legs) { const id2 = taken.has(id + "v") ? newId("m") : id + "v"; taken.add(id2); await save(`matches/${id2}`, {...base, fecha: f, a: B, b: A, date: dates[j][i][1] || "", leg: "vuelta"}); n++; }
      }
    }
  } catch (er) { toast(`Se cortó después de ${n} partidos: ${er.message || "error al guardar"}. Revisá y borrá lo que sobre.`); renderAdminSoon(); return; }
  closeModal(); F.plan = null;
  audit(`Generó la temporada: ${P.length} fechas (de la ${from} a la ${from + P.length - 1}), ${n} partidos, todos contra todos ${F.rounds} ${F.rounds === 1 ? "vez" : "veces"}${F.legs ? " con ida y vuelta" : ""}`);
  toast(`Listo: ${P.length} fechas y ${n} partidos creados.`); renderAdminSoon();
}
// Borrar una fecha o todas: también se borran las elecciones de mapa de esas fechas y se saca la marca de coins acreditados
async function deleteFechas(fs) {
  if (!isUltra()) { toast("Esto lo hace ultra staff."); return; }
  const all = !fs, R = RM(), ms = Object.entries(S.remote.matches || {}).filter(([, m]) => all || fs.includes(+m.fecha || 1));
  if (!ms.length) { toast("No hay partidos para borrar."); return; }
  const played = ms.filter(([, m]) => m.status === "played").length, label = all ? "todas las fechas" : `la fecha ${fs[0]}`;
  const ok = await dangerGate(all ? "Borrar todas las fechas" : `Borrar la fecha ${fs[0]}`,
    `<p>Se borran <b>${ms.length} partido${ms.length === 1 ? "" : "s"}</b> de ${label}${played ? `, <b>${played} ya jugado${played === 1 ? "" : "s"}</b> con sus resultados y estadísticas (la tabla y los rankings se recalculan)` : ""}. También se borran las elecciones de mapa de esas fechas.</p>${played ? '<p class="adm-note">Las coins que ya se acreditaron no se descuentan.</p>' : ""}`);
  if (!ok) return;
  const fset = new Set(ms.map(([, m]) => +m.fecha || 1)), ids = new Set(ms.map(([id]) => id));
  let n = 0;
  try {
    for (const [id] of ms) { await save(`matches/${id}`, null, "del"); n++; }
    for (const id of Object.keys(S.remote.mappicks || {})) { const f = +((/^f(\d+)_/.exec(id) || [])[1]); if (fset.has(f)) await save(`mappicks/${id}`, null, "del"); }
    for (const id of Object.keys(S.remote.mapclaims || {})) if (ids.has(id)) await save(`mapclaims/${id}`, null, "del");
    const d = cfgDoc(), cr = (d.credited || []).filter(f => !fset.has(+f)); if (cr.length !== (d.credited || []).length) { d.credited = cr; await save("league/config", d); }
  } catch (er) { toast(`Se borraron ${n} de ${ms.length}: ${er.message || "error"}.`); renderAdminSoon(); return; }
  audit(`Borró ${label} (${n} partidos${played ? `, ${played} jugados` : ""})`); S.adm.openMatch = null;
  toast(all ? `Fixture borrado: ${n} partidos.` : `Fecha ${fs[0]} borrada: ${n} partidos.`); renderAdminSoon();
}


/* ================= Riot ID y Tracker (tracker.gg) ================= */
// Cada jugador puede tener su Riot ID (Nombre#TAG). Con eso, su ficha, el análisis y Seguimiento muestran un botón a su perfil de tracker.gg.
const normRiot = s => String(s || "").trim().replace(/\s*#\s*/, "#").replace(/\s{2,}/g, " ");
const riotOk = s => /^[^#]{3,16}#[A-Za-z0-9]{2,5}$/.test(normRiot(s));
const ignOf = pid => { const p = (M && M.players && M.players[pid]) || null; return p && riotOk(p.ign) ? normRiot(p.ign) : ""; };
const trackerUrl = ign => `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(normRiot(ign))}/overview`;
const trackerBtn = (pid, cls = "btn sm ghost") => { const g = ignOf(pid);
  return g ? `<a class="${cls} trk" href="${trackerUrl(g)}" target="_blank" rel="noopener noreferrer" title="Ver ${esc(g)} en tracker.gg">${ico("i-chart")}<span>Tracker</span></a>` : ""; };
function riotIdCard(pid) {
  const g = ignOf(pid), raw = ((M.players[pid] || {}).ign) || "";
  return `<div class="panel pad cut riot-card"><div class="h3">${ico("i-chart")} Tu Riot ID y Tracker</div>
    <p class="muted">${g ? `Tu perfil de tracker.gg queda en tu ficha para que todos puedan ver tus stats de rankeds.` : "Cargá tu Riot ID (como aparece en Valorant: Nombre#TAG) y tu ficha va a tener el botón a tu perfil de tracker.gg."}</p>
    <div class="riot-row"><input class="cell-in" id="riotIn" value="${esc(raw)}" placeholder="Ej: Jagger#LAS" maxlength="22" autocomplete="off" spellcheck="false"><button class="btn sm gold" type="button" id="riotGo">Guardar</button>${g ? `<a class="btn sm ghost" href="${trackerUrl(g)}" target="_blank" rel="noopener noreferrer">${ico("i-chart")}<span>Ver mi Tracker</span></a>` : ""}</div>
    <small class="muted">Para que tracker.gg muestre tus stats, tu perfil tiene que ser público ahí (entrás con tu cuenta de Riot en tracker.gg y lo activás).</small></div>`;
}
$("#profRoot") && $("#profRoot").addEventListener("click", async e => {
  if (!e.target.closest("#riotGo")) return;
  const v = normRiot($("#riotIn").value);
  if (v && !riotOk(v)) { toast("Escribilo como en Valorant: Nombre#TAG (por ejemplo Jagger#LAS)."); return; }
  const b = $("#riotGo"); b.disabled = true;
  try { await api("/api/member", {action: "ign", ign: v}); toast(v ? `Riot ID guardado: ${v}.` : "Riot ID borrado."); } catch (er) { toast(er.message); }
  b.disabled = false;
});

/* ================= arranque ================= */
buildOrbit();
paintCached();
renderAll();
setInterval(tickClock, 1000);
initShell();
initFirebase();
finishDiscordLogin();
})();
