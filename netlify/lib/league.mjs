// Cálculos de la liga para el bot: misma lógica que la página (tabla, desempates, stats, premios).
export const TEAM_DEF = [
  ["onyx", "ONYX", "#7a8ce8"], ["orion", "ORION", "#2f7dff"], ["nexus", "NEXUS", "#ff6a1a"], ["zenith", "ZENITH", "#ff3fa4"],
  ["vortex", "VORTEX", "#22a8ff"], ["zyriax", "ZYRIAX", "#1ccf52"], ["kyrox", "KYROX", "#3a5bff"],
];
export const TEAM_KEYS = TEAM_DEF.map((t) => t[0]); // equipos de base
// Equipos en uso: los de base que no se quitaron más los que agregó el ultra staff.
export function teamKeysFrom(rawTeams = {}) {
  const T = rawTeams || {};
  const custom = Object.keys(T).filter((k) => !TEAM_KEYS.includes(k) && /^[a-z0-9]{2,20}$/.test(k) && T[k] && T[k].custom && !T[k].hidden)
    .sort((a, b) => (+T[a].order || 0) - (+T[b].order || 0) || a.localeCompare(b));
  return [...TEAM_KEYS.filter((k) => !(T[k] && T[k].hidden)), ...custom];
}
// [[clave, nombre]] de los equipos en uso (para detectar canales y autocompletar).
export function teamListFrom(rawTeams = {}) {
  return teamKeysFrom(rawTeams).map((k) => [k, ((rawTeams || {})[k] || {}).name || (TEAM_DEF.find((t) => t[0] === k) || [k, k.toUpperCase()])[1]]);
}
export const ROLES = ["Duelista", "Iniciador", "Controlador", "Centinela", "Flex", "Suplente"];
export const SKILLS = [["aim", "Puntería"], ["sense", "Lectura de juego"], ["comms", "Comunicación"], ["util", "Uso de utilidades"], ["attitude", "Actitud"]];

export const fmt = (n) => Math.round(+n || 0).toLocaleString("es-AR");
export const dec = (n, d = 2) => (+n || 0).toFixed(d).replace(".", ",");
const r50 = (v) => Math.round(v / 50) * 50;
export const VAL_MIN = 100, VAL_MAX = 1500, CLAUSE_MAX = 3000;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Valor inicial según el rango de Valorant (igual que la página).
const RANK_VALUES = [["radiant", 1500], ["radiante", 1500], ["inmortal 3", 1400], ["inmortal 2", 1300], ["inmortal 1", 1200], ["inmortal", 1250],
  ["ascendente 3", 1100], ["ascendente 2", 1000], ["ascendente 1", 900], ["ascendente", 1000], ["diamante 3", 850], ["diamante 2", 800], ["diamante 1", 750], ["diamante", 800],
  ["platino 3", 700], ["platino 2", 650], ["platino 1", 600], ["platino", 650], ["oro", 450], ["plata", 300], ["bronce", 200], ["hierro", 100]];
export function rankValue(rank) { const r = String(rank || "").toLowerCase(); for (const [t, v] of RANK_VALUES) if (r.includes(t)) return v; return 500; }
export const catOf = (v) => (v >= 1200 ? "S" : v >= 900 ? "A" : v >= 600 ? "B" : "C");

// Fechas de la página: "2026-10-24T21:00" en hora argentina.
export function parseLocal(s) {
  if (!s) return null;
  const d = new Date(String(s).slice(0, 16) + ":00-03:00");
  return isNaN(d) ? null : d;
}

function agg(log, f) {
  const L = f ? log.filter((e) => e.f === f) : log;
  const s = { m: L.length, k: 0, d: 0, a: 0, acs: 0, w: 0, r: 0 };
  L.forEach((e) => { s.k += e.k; s.d += e.d; s.a += e.a; s.acs += e.acs; s.w += e.won ? 1 : 0; s.r += e.rounds; });
  s.acs = s.m ? Math.round(s.acs / s.m) : 0; s.kd = s.d ? s.k / s.d : s.k;
  return s;
}

// Desempate con los mismos puntos (igual que la página): lo principal son las rondas ganadas.
export const TIEBREAK = [["rf", 1, "Rondas ganadas"], ["rc", -1, "Rondas perdidas"], ["kills", 1, "Kills"], ["ast", 1, "Asistencias"], ["h2h", 1, "Directo"], ["kd", 1, "K/D"]];
// Ida y vuelta: los dos partidos de una fecha entre los mismos equipos. Usa el campo leg si está cargado; si no, el día y hora.
export const LEG_L = { ida: "Ida", vuelta: "Vuelta" };
export const legRank = (m) => (m.leg === "ida" ? 0 : m.leg === "vuelta" ? 2 : 1);
export const legSort = (x, y) => legRank(x) - legRank(y) || String(x.date || "").localeCompare(String(y.date || "")) || String(x.id).localeCompare(String(y.id));
export function tagLegs(ms) {
  const g = {};
  ms.forEach((m) => { const key = `${m.fecha}|${[m.a, m.b].sort().join("~")}`; (g[key] = g[key] || []).push(m); });
  Object.values(g).forEach((arr) => { arr.sort(legSort); arr.forEach((m, i) => { m.legN = i + 1; m.legs = arr.length; m.leg = arr.length === 2 ? (i ? "vuelta" : "ida") : ""; }); });
  return ms;
}
export const legName = (m) => (m.leg ? LEG_L[m.leg] : m.legs > 1 ? `Partida ${m.legN}` : "");

export function build(raw) {
  const c = raw.config || {};
  const cfg = {
    season: c.season || "Temporada 1", points: { w: 3, otw: 2, otl: 1, l: 0, ...(c.points || {}) }, noShow: c.noShow ?? -1,
    playoff: c.playoff ?? 4, windowOpen: c.windowOpen !== false, windowClose: c.windowClose || "", nextDate: c.nextDate || "",
    maps: Array.isArray(c.maps) && c.maps.length ? c.maps : [], news: c.news || [],
  };
  const teams = {}, keys = teamKeysFrom(raw.teams);
  keys.forEach((k, i) => {
    const d = (raw.teams || {})[k] || {}, def = TEAM_DEF.find((t) => t[0] === k) || [k, k.toUpperCase(), "#8a3dff"];
    teams[k] = { k, name: d.name || def[1], c: d.c || def[2], coins: d.coins ?? 6000, fp: d.fp ?? 100, custom: !!d.custom,
      used: [...new Set([...(d.used || []), ...Object.values(d.picked || {}).filter((x) => typeof x === "string")])], logoAt: +d.logoAt || 0,
      adj: { pts: 0, rf: 0, rc: 0, g: 0, gp: 0, pp: 0, p: 0, ...(d.adj || {}) }, order: d.order ?? i, captain: d.captain || null };
  });
  const ptsOf = (m) => {
    const P = cfg.points;
    if (m.noShow === "a") return [P.l + cfg.noShow, P.w];
    if (m.noShow === "b") return [P.w, P.l + cfg.noShow];
    const aw = +m.ra > +m.rb;
    if (m.ot) return aw ? [P.otw, P.otl] : [P.otl, P.otw];
    return aw ? [P.w, P.l] : [P.l, P.w];
  };
  const ms = Object.entries(raw.matches || {}).map(([id, m]) => ({ ...m, id, fecha: +m.fecha || 1 }))
    .filter((m) => m.a && m.b && m.a !== m.b && teams[m.a] && teams[m.b])
    .sort((x, y) => x.fecha - y.fecha || String(x.date || "").localeCompare(String(y.date || "")) || x.id.localeCompare(y.id));
  tagLegs(ms);
  const played = ms.filter((m) => m.status === "played");
  const pending = ms.filter((m) => m.status !== "played");
  const logs = {}, TK = Object.fromEntries(keys.map((k) => [k, { k: 0, d: 0, a: 0 }]));
  played.forEach((m) => {
    const R = (+m.ra || 0) + (+m.rb || 0); let best = null;
    Object.entries(m.stats || {}).forEach(([pid, s]) => {
      const t = s.t || (raw.players[pid] && raw.players[pid].team); if (t !== m.a && t !== m.b) return;
      const won = t === m.a ? +m.ra > +m.rb : +m.rb > +m.ra;
      const e = { mid: m.id, f: m.fecha, lg: legName(m), n: m.legN || 0, team: t, vs: t === m.a ? m.b : m.a, won, k: +s.k || 0, d: +s.d || 0, a: +s.a || 0, acs: +s.acs || 0, rounds: R };
      (logs[pid] = logs[pid] || []).push(e); TK[t].k += e.k; TK[t].d += e.d; TK[t].a += e.a;
      if (raw.players[pid] && (!best || e.acs > best.acs)) best = { id: pid, acs: e.acs };
    });
    m.mvpId = (m.mvp && m.stats && m.stats[m.mvp]) ? m.mvp : best ? best.id : null;
  });
  const lastF = played.length ? Math.max(...played.map((m) => m.fecha)) : 0;
  const nextF = pending.length ? Math.min(...pending.map((m) => m.fecha)) : null;
  const P = Object.entries(raw.players || {}).map(([id, p]) => {
    const log = (logs[id] || []).sort((a, b) => a.f - b.f || a.n - b.n);
    return { id, name: p.name || "Sin nombre", team: p.team || null, role: ROLES.includes(p.role) ? p.role : "Flex", rank: p.rank || "", clause: clamp(+p.clause || 0, 0, CLAUSE_MAX),
      vOverride: (p.value === 0 || p.value) ? +p.value : null, log, s: agg(log), lastTeam: p.team || (log.length ? log[log.length - 1].team : null) };
  });
  const withLog = P.filter((p) => p.s.m);
  withLog.forEach((p) => { p.perf = p.s.acs * 0.6 + p.s.kd * 90 + (p.s.k / p.s.m) * 4 + p.s.m * 6; });
  [...withLog].sort((a, b) => a.perf - b.perf).forEach((p, i, arr) => { const q = arr.length > 1 ? i / (arr.length - 1) : 0.5; p.auto = r50(300 + Math.pow(q, 1.6) * 1200); });
  P.forEach((p) => { p.value = clamp(p.vOverride != null ? p.vOverride : (p.auto ?? rankValue(p.rank)), VAL_MIN, VAL_MAX); });
  const PM = Object.fromEntries(P.map((p) => [p.id, p]));

  function standings(results) {
    const rows = {};
    const PT = cfg.points, FM = { W: "V", w: "VP", l: "DP", L: "D" };
    keys.forEach((k) => { const a = teams[k].adj, n = (f) => Math.round(+a[f] || 0);
      rows[k] = { k, pj: n("g") + n("gp") + n("pp") + n("p"), g: n("g"), gp: n("gp"), pp: n("pp"), p: n("p"), rf: n("rf"), rc: n("rc"), kills: TK[k].k + n("kills"), ast: TK[k].a + n("ast"),
        pts: n("pts") + n("g") * PT.w + n("gp") * PT.otw + n("pp") * PT.otl + n("p") * PT.l, kd: TK[k].d ? TK[k].k / TK[k].d : 1, h2h: 0,
        form: (Array.isArray(a.form) ? a.form : []).map((c) => FM[c]).filter(Boolean) }; });
    results.forEach((m) => {
      const [pa, pb] = ptsOf(m);
      [[m.a, +m.ra || 0, +m.rb || 0, pa], [m.b, +m.rb || 0, +m.ra || 0, pb]].forEach(([k, f, c2, pt]) => {
        const r = rows[k]; r.pj++; r.rf += f; r.rc += c2; r.pts += pt;
        const won = f > c2, code = won ? (m.ot ? "VP" : "V") : (m.ot ? "DP" : "D"); r.form.push(code);
        if (code === "V") r.g++; else if (code === "VP") r.gp++; else if (code === "DP") r.pp++; else r.p++;
      });
    });
    const arr = Object.values(rows); arr.forEach((r) => { r.dif = r.rf - r.rc; });
    arr.sort((x, y) => y.pts - x.pts);
    const out = [];
    for (let i = 0; i < arr.length;) {
      let j = i; while (j < arr.length && arr[j].pts === arr[i].pts) j++;
      const g = arr.slice(i, j);
      if (g.length > 1) {
        const ks = new Set(g.map((r) => r.k));
        results.forEach((m) => { if (ks.has(m.a) && ks.has(m.b)) { const [pa, pb] = ptsOf(m); rows[m.a].h2h += pa; rows[m.b].h2h += pb; } });
        g.sort((x, y) => { for (const [f, dir] of TIEBREAK) { const d = (y[f] - x[f]) * dir; if (d) return d; } return teams[x.k].order - teams[y.k].order; });
      }
      out.push(...g); i = j;
    }
    out.forEach((r, i) => { r.pos = i + 1; });
    return out;
  }

  const perfOf = (pid) => (raw.perf || {})[pid] || {};
  const attStats = (pid) => {
    const a = perfOf(pid).att || {}, c2 = { P: 0, T: 0, A: 0, J: 0 };
    Object.values(a).forEach((v) => { if (c2[v] != null) c2[v]++; });
    const n = c2.P + c2.T + c2.A;
    return { ...c2, n, pct: n ? Math.round((c2.P + c2.T * 0.5) / n * 100) : null };
  };
  const ptsSum = (pid) => (perfOf(pid).pts || []).reduce((s, x) => s + (+x.v || 0), 0);
  const mvpScore = (p) => p.s.acs * 0.5 + p.s.kd * 55 + (p.s.w / Math.max(1, p.s.m)) * 50 + (p.s.a / Math.max(1, p.s.m)) * 2;

  return { cfg, keys, teams, ms, played, pending, lastF, nextF, P, PM, real: standings(played), standings, ptsOf, perfOf, attStats, ptsSum, mvpScore, agg,
    roster: (k) => P.filter((p) => p.team === k), transfers: Object.entries(raw.transfers || {}).map(([id, t]) => ({ id, ...t })).sort((a, b) => (b.at || 0) - (a.at || 0)),
    draws: Object.entries(raw.draws || {}).map(([id, d]) => ({ id, ...d })).sort((a, b) => (b.at || 0) - (a.at || 0)) };
}

// Busca un jugador por id o por nombre (sin distinguir mayúsculas ni acentos).
export function findPlayer(L, q) {
  if (L.PM[q]) return L.PM[q];
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const n = norm(q);
  return L.P.find((p) => norm(p.name) === n) || L.P.find((p) => norm(p.name).startsWith(n)) || L.P.find((p) => norm(p.name).includes(n)) || null;
}
