// Mensajes de ONYX Bot (embeds de Discord) armados con los datos de la liga.
import { fmt, dec, parseLocal, SKILLS, catOf, LEG_L, TEAM_KEYS as BASE_KEYS } from "./league.mjs";
import { env } from "./discord.mjs";

export const ONYX_COLOR = 0x8a3dff;
const hex = (c) => { const n = parseInt(String(c || "").replace("#", ""), 16); return Number.isFinite(n) ? n : ONYX_COLOR; };
// Logo del equipo: el personalizado (servido por /api/logo) o el de base. Los equipos nuevos sin logo no llevan imagen.
const emblem = (k, L) => {
  const t = L && L.teams && L.teams[k];
  if (t && t.logoAt) return `${env().site}/api/logo/${k}?v=${t.logoAt}`;
  return BASE_KEYS.includes(k) ? `${env().site}/assets/emblemas/${k}.webp` : undefined;
};
const thumb = (k, L) => { const u = emblem(k, L); return u ? { url: u } : undefined; };
const footer = (L) => ({ text: `ONYX Bot · ${L && L.cfg ? L.cfg.season : "Liga ONYX"}`, icon_url: `${env().site}/icon-192.png` });
const when = (d) => d ? `${ts(d, "F")} (${ts(d, "R")})` : "Día y hora a confirmar";
const pad = (s, n) => String(s).slice(0, n).padEnd(n);
const lpad = (s, n) => String(s).slice(0, n).padStart(n);
const ts = (d, style = "F") => `<t:${Math.floor(d.getTime() / 1000)}:${style}>`;
const tname = (L, k) => (L.teams[k] || { name: k || "Libre" }).name;

export const linkRow = (label = "Ver la liga", path = "") => [{ type: 1, components: [{ type: 2, style: 5, label, url: env().site + path }] }];
export const msg = (embeds, extra = {}) => ({ embeds: Array.isArray(embeds) ? embeds : [embeds], components: linkRow(), allowed_mentions: { parse: [] }, ...extra });

export function tableEmbed(L) {
  const head = `${pad("#", 3)}${pad("EQUIPO", 9)}${lpad("PTS", 4)}${lpad("PJ", 3)}${lpad("V", 3)}${lpad("VP", 3)}${lpad("DP", 3)}${lpad("D", 3)}${lpad("RF", 4)}${lpad("RC", 4)}`;
  const rows = L.real.map((r) => `${pad(r.pos + (r.pos <= L.cfg.playoff ? "*" : ""), 3)}${pad(tname(L, r.k), 9)}${lpad(r.pts, 4)}${lpad(r.pj, 3)}${lpad(r.g, 3)}${lpad(r.gp, 3)}${lpad(r.pp, 3)}${lpad(r.p, 3)}${lpad(r.rf, 4)}${lpad(r.rc, 4)}`);
  return { title: "Tabla de posiciones", color: ONYX_COLOR, description: "```\n" + head + "\n" + rows.join("\n") + "\n```" + `\n\\* Puestos de playoffs (1° a ${L.cfg.playoff}°). V victoria · VP victoria en prórroga · DP derrota en prórroga · D derrota · RF rondas ganadas · RC rondas perdidas.\nEmpate en puntos: rondas ganadas → rondas perdidas → kills → asistencias.`,
    footer: footer(L), timestamp: new Date().toISOString() };
}

export function nextEmbed(L, max = 10) {
  const list = L.pending.slice(0, max);
  if (!list.length) return { title: "Próximos partidos", color: ONYX_COLOR, description: "No quedan partidos por jugar.", footer: footer(L) };
  return { title: `Próximos partidos${L.nextF ? " · Fecha " + L.nextF : ""}`, color: ONYX_COLOR, footer: footer(L),
    fields: list.map((m) => { const d = parseLocal(m.date);
      return { name: `F${m.fecha}${m.leg ? " · " + LEG_L[m.leg] : ""} · ${tname(L, m.a)} vs ${tname(L, m.b)}`, value: `${d ? `${ts(d, "F")} (${ts(d, "R")})` : "Día y hora a confirmar"}\nMapa: ${m.map ? `**${m.map}**` : "se sortea en vivo"}`, inline: false }; }) };
}

export function resultLine(L, m) {
  const aw = +m.ra > +m.rb, A = tname(L, m.a), B = tname(L, m.b), mvp = m.mvpId && L.PM[m.mvpId];
  const score = aw ? `**${A} ${m.ra}** - ${m.rb} ${B}` : `${A} ${m.ra} - **${m.rb} ${B}**`;
  const st = mvp ? ((m.stats || {})[m.mvpId] || {}) : null;
  return `${score}${m.ot ? " · prórroga" : ""}${m.noShow ? " · W.O." : ""}${m.map ? ` · ${m.map}` : ""}${mvp ? `\nMVP: **${mvp.name}** (${st.k || 0}/${st.d || 0}/${st.a || 0} · ACS ${st.acs || 0})` : ""}`;
}

export function resultsEmbed(L, fecha) {
  const f = fecha || L.lastF;
  const list = L.played.filter((m) => m.fecha === f);
  if (!list.length) return { title: `Resultados${f ? " · Fecha " + f : ""}`, color: ONYX_COLOR, description: f ? "Todavía no hay resultados de esa fecha." : "Todavía no se jugó ninguna fecha.", footer: footer(L) };
  return { title: `Resultados · Fecha ${f}`, color: ONYX_COLOR, description: list.map((m) => (m.leg ? `**${LEG_L[m.leg]}** · ` : "") + resultLine(L, m)).join("\n\n"), footer: footer(L) };
}

export function resultEmbed(L, m, corrected) {
  const w = +m.ra > +m.rb ? m.a : m.b;
  return { author: { name: `${corrected ? "Resultado corregido" : "Resultado"} · Fecha ${m.fecha}` }, title: `${tname(L, m.a)} ${m.ra} - ${m.rb} ${tname(L, m.b)}`, color: hex(L.teams[w].c),
    description: resultLine(L, m).split("\n").slice(1).join("\n") || undefined, thumbnail: thumb(w, L),
    fields: [{ name: "Ganó", value: `**${tname(L, w)}**${m.ot ? " en prórroga" : ""}`, inline: true }, ...(m.map ? [{ name: "Mapa", value: m.map, inline: true }] : [])],
    footer: footer(L), timestamp: new Date().toISOString() };
}

const bar = (v) => "█".repeat(Math.max(0, Math.min(10, v))) + "░".repeat(10 - Math.max(0, Math.min(10, v)));
export function playerEmbed(L, p) {
  const s = p.s, at = L.attStats(p.id), pts = L.ptsSum(p.id), sk = L.perfOf(p.id).skills || {}, t = p.team ? L.teams[p.team] : null;
  const isCap = t && t.captain === p.id;
  const fields = [
    { name: "Valor", value: `${fmt(p.value)} · Cat. ${catOf(p.value)}`, inline: true },
    { name: "Cláusula", value: p.clause ? fmt(p.clause) : "Sin cláusula", inline: true },
    { name: "Partidos", value: String(s.m), inline: true },
    { name: "K / D / A", value: `${s.k} / ${s.d} / ${s.a}`, inline: true },
    { name: "K/D", value: dec(s.kd), inline: true },
    { name: "ACS", value: String(s.acs), inline: true },
    { name: "Victorias", value: s.m ? `${s.w} de ${s.m}` : "–", inline: true },
    { name: "Asistencia", value: at.pct == null ? "–" : `${at.pct}% (${at.n} fechas)`, inline: true },
    { name: "Puntos individuales", value: (pts > 0 ? "+" : "") + pts, inline: true },
  ];
  const hasSk = SKILLS.some(([k]) => +sk[k] > 0);
  if (hasSk) fields.push({ name: "Skills", value: "```\n" + SKILLS.map(([k, l]) => `${pad(l, 18)}${bar(+sk[k] || 0)} ${+sk[k] || "–"}`).join("\n") + "\n```", inline: false });
  if (s.m) fields.push({ name: "Últimos partidos", value: p.log.slice(-5).reverse().map((e) => `F${e.f}${e.lg ? " " + e.lg : ""} vs ${tname(L, e.vs)} · ${e.k}/${e.d}/${e.a} · ACS ${e.acs} · ${e.won ? "ganó" : "perdió"}`).join("\n"), inline: false });
  return { title: p.name, description: `${p.role}${isCap ? " · Capitán" : ""} · ${t ? t.name : "Agente libre"}${p.rank ? " · " + p.rank : ""}`,
    color: hex(t ? t.c : null), thumbnail: t ? thumb(t.k, L) : undefined, fields, footer: footer(L) };
}

export function teamEmbed(L, k) {
  const t = L.teams[k], r = L.real.find((x) => x.k === k), rs = L.roster(k).sort((a, b) => b.value - a.value);
  const usedMaps = new Set(t.used), left = L.cfg.maps.filter((m) => m.on !== false && !usedMaps.has(m.n)).length;
  return { title: t.name, color: hex(t.c), thumbnail: thumb(k, L), footer: footer(L),
    fields: [
      { name: "Posición", value: `${r.pos}° · ${r.pts} pts`, inline: true },
      { name: "Récord", value: `${r.g + r.gp}V ${r.pp + r.p}D · Dif ${r.dif > 0 ? "+" : ""}${r.dif}`, inline: true },
      { name: "Forma", value: r.form.slice(-5).join(" ") || "–", inline: true },
      { name: "ONYX Coins", value: fmt(t.coins), inline: true },
      { name: "Fair play", value: String(t.fp), inline: true },
      { name: "Mapas que le quedan", value: String(left), inline: true },
      { name: `Plantel (${rs.length})`, value: rs.map((p) => `${t.captain === p.id ? "👑 " : ""}**${p.name}** · ${p.role} · ${fmt(p.value)}${p.clause ? ` · cláusula ${fmt(p.clause)}` : ""}`).join("\n").slice(0, 1024) || "Sin jugadores cargados", inline: false },
    ] };
}

const RK = { k: ["Kills", (p) => p.s.k], a: ["Asistencias", (p) => p.s.a], kd: ["K/D", (p) => p.s.kd], acs: ["ACS", (p) => p.s.acs] };
export function rankingEmbed(L, stat) {
  let title, rows;
  if (stat === "pts") { title = "Puntos individuales"; rows = L.P.map((p) => ({ p, v: L.ptsSum(p.id) })).filter((x) => x.v !== 0).sort((a, b) => b.v - a.v).map((x) => ({ ...x, txt: (x.v > 0 ? "+" : "") + x.v })); }
  else if (stat === "att") { title = "Asistencia a fechas"; rows = L.P.map((p) => ({ p, a: L.attStats(p.id) })).filter((x) => x.a.pct != null).sort((a, b) => b.a.pct - a.a.pct || b.a.n - a.a.n).map((x) => ({ ...x, txt: `${x.a.pct}% · ${x.a.n} fechas` })); }
  else { const [l, f] = RK[stat] || RK.k; title = l; const min = stat === "kd" || stat === "acs" ? 2 : 1; rows = L.P.filter((p) => p.s.m >= min).map((p) => ({ p, v: f(p) })).sort((a, b) => b.v - a.v).map((x) => ({ ...x, txt: stat === "kd" ? dec(x.v) : fmt(x.v) })); }
  const top = rows.slice(0, 10), medal = ["🥇", "🥈", "🥉"];
  return { title: `Ranking · ${title}`, color: ONYX_COLOR, footer: footer(L),
    description: top.length ? top.map((x, i) => `${medal[i] || `**${i + 1}.**`} **${x.p.name}** (${tname(L, x.p.lastTeam)}) — ${x.txt}`).join("\n") : "Todavía no hay datos cargados para este ranking." };
}

export function mapsEmbed(L, k) {
  const t = L.teams[k], used = new Set(t.used), on = L.cfg.maps.filter((m) => m.on !== false).map((m) => m.n);
  const left = on.filter((n) => !used.has(n)), gone = on.filter((n) => used.has(n));
  return { title: `Mapas de ${t.name}`, color: hex(t.c), thumbnail: thumb(k, L), footer: footer(L),
    fields: [{ name: `Le quedan (${left.length})`, value: left.join(" · ") || "Ninguno", inline: false }, { name: `Ya jugados (${gone.length})`, value: gone.map((n) => `~~${n}~~`).join(" · ") || "Ninguno", inline: false }] };
}

export function marketEmbed(L) {
  const tr = L.transfers.slice(0, 10);
  const d = parseLocal(L.cfg.windowClose);
  return { title: "Mercado de fichajes", color: 0xffcb52, footer: footer(L),
    description: `Ventana **${L.cfg.windowOpen ? "abierta" : "cerrada"}**${L.cfg.windowOpen && d ? ` hasta ${ts(d, "f")} (${ts(d, "R")})` : ""}. Solo los capitanes pueden fichar.`,
    fields: [{ name: "Últimos fichajes", value: tr.map((t) => `**${t.name}** · ${t.from ? tname(L, t.from) : "libre"} → ${t.to ? tname(L, t.to) : "libre"}${t.amt ? ` · ${fmt(t.amt)} coins` : ""}`).join("\n").slice(0, 1024) || "Sin fichajes todavía.", inline: false }] };
}

export function awardsEmbed(L) {
  const minM = Math.min(3, Math.max(1, L.lastF - 1));
  const mvp = L.P.filter((p) => p.s.m >= minM).sort((a, b) => L.mvpScore(b) - L.mvpScore(a)).slice(0, 3);
  const pts = L.P.map((p) => ({ p, v: L.ptsSum(p.id) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v)[0];
  const att = L.P.map((p) => ({ p, a: L.attStats(p.id) })).filter((x) => x.a.pct != null).sort((a, b) => b.a.pct - a.a.pct || b.a.n - a.a.n)[0];
  const fields = [];
  fields.push({ name: "Carrera al MVP", value: mvp.map((p, i) => `${["🥇", "🥈", "🥉"][i]} **${p.name}** (${tname(L, p.lastTeam)}) · K/D ${dec(p.s.kd)} · ACS ${p.s.acs}`).join("\n") || "Todavía no hay estadísticas.", inline: false });
  if (pts) fields.push({ name: "Más puntos individuales", value: `**${pts.p.name}** (${tname(L, pts.p.lastTeam)}) · +${pts.v}`, inline: true });
  if (att) fields.push({ name: "Mejor asistencia", value: `**${att.p.name}** (${tname(L, att.p.lastTeam)}) · ${att.a.pct}%`, inline: true });
  return { title: "Premios de la temporada", color: 0xffcb52, fields, footer: footer(L) };
}

export function helpEmbed(L) {
  return { title: "ONYX Bot", color: ONYX_COLOR, thumbnail: { url: `${env().site}/icon-192.png` }, footer: footer(L),
    description: "Estoy conectado a la web de la liga: todo lo que muestro sale de ahí, en vivo.",
    fields: [
      { name: "Liga", value: "`/tabla` · `/proximos` · `/resultados` · `/premios` · `/mercado`", inline: false },
      { name: "Jugadores y equipos", value: "`/jugador` · `/equipo` · `/ranking` · `/mapas`", inline: false },
      { name: "Admins", value: "`/anuncio` publica un anuncio · `/rol` da o quita roles", inline: false },
      { name: "Avisos automáticos", value: "Un recordatorio por fecha para cada cruce (ida y vuelta juntas), resultados, mapas y fichajes.", inline: false }] };
}

// ---------- avisos automáticos ----------
// Cruce (s) = los partidos de una fecha entre los mismos dos equipos: ida y vuelta, o uno solo.
// Todos los avisos van una vez por cruce, con los dos partidos en el mismo mensaje.
export const asSeries = (x) => (x && Array.isArray(x.games) ? x : { key: x.id, f: +x.fecha || 1, a: x.a, b: x.b, games: [x] });
export const legOf = (s, i) => (s.games.length === 2 ? ["Ida", "Vuelta"][i] : s.games.length > 2 ? `Partida ${i + 1}` : "Partido");
const ivName = (s) => (s.games.length === 2 ? "la ida y vuelta" : s.games.length > 2 ? `los ${s.games.length} partidos` : "el partido");
const firstDate = (s) => s.games.map((g) => parseLocal(g.date)).filter(Boolean).sort((a, b) => a - b)[0] || null;
const gameWhen = (g) => { const d = parseLocal(g.date); return d ? `${ts(d, "F")}` : "día y hora a confirmar"; };
const gamesList = (s) => s.games.map((g, i) => `**${legOf(s, i)}** · ${gameWhen(g)}${g.map ? ` · 🗺️ ${g.map}` : ""}`).join("\n");
export function reminderEmbed(L, x) {
  const s = asSeries(x), many = s.games.length > 1, m = s.games[0], d = firstDate(s);
  return { author: { name: `Recordatorio · Fecha ${s.f}${many ? " · Ida y vuelta" : ""}` }, title: `${tname(L, m.a)} vs ${tname(L, m.b)}`, color: hex(L.teams[m.a].c), thumbnail: thumb(m.a, L),
    description: many ? `${d ? `⏰ Arranca ${ts(d, "R")}\n\n` : ""}${gamesList(s)}` : `📅 ${when(d)}\n🗺️ Mapa: ${m.map ? `**${m.map}**` : "se sortea en vivo antes del partido"}`, footer: footer(L) };
}
// Resultado de un cruce (cuando se jugaron todos sus partidos)
const winnerOf = (g) => (+g.ra > +g.rb ? g.a : g.b);
function gameDetail(L, g) {
  const mvp = g.mvpId && L.PM && L.PM[g.mvpId], st = mvp ? ((g.stats || {})[g.mvpId] || {}) : null;
  return `Ganó **${tname(L, winnerOf(g))}**${g.ot ? " en prórroga" : ""}${g.noShow ? " (W.O.)" : ""}${g.map ? ` · 🗺️ ${g.map}` : ""}${mvp ? `\nMVP: **${mvp.name}** (${st.k || 0}/${st.d || 0}/${st.a || 0} · ACS ${st.acs || 0})` : ""}`;
}
export function seriesResultEmbed(L, x, corrected) {
  const s = asSeries(x);
  if (s.games.length === 1) return resultEmbed(L, s.games[0], corrected);
  const wins = { [s.a]: 0, [s.b]: 0 }; s.games.forEach((g) => { wins[winnerOf(g)] = (wins[winnerOf(g)] || 0) + 1; });
  const top = wins[s.a] === wins[s.b] ? null : wins[s.a] > wins[s.b] ? s.a : s.b, lo = top === s.a ? s.b : s.a;
  const global = !top ? `Empate ${wins[s.a]}-${wins[s.b]}: cada uno ganó un partido.` : wins[lo] ? `**${tname(L, top)}** ganó ${wins[top]} a ${wins[lo]}.` : `**${tname(L, top)}** ganó los ${wins[top]} partidos.`;
  return { author: { name: `${corrected ? "Resultado corregido" : "Resultado"} · Fecha ${s.f} · Ida y vuelta` }, title: `${tname(L, s.a)} vs ${tname(L, s.b)}`, color: top ? hex(L.teams[top].c) : ONYX_COLOR,
    description: global, thumbnail: top ? thumb(top, L) : undefined,
    fields: s.games.map((g, i) => ({ name: `${legOf(s, i)} · ${tname(L, g.a)} ${g.ra}-${g.rb} ${tname(L, g.b)}`, value: gameDetail(L, g), inline: false })),
    footer: footer(L), timestamp: new Date().toISOString() };
}
export function drawEmbed(L, d) {
  return { author: { name: `Sorteo de mapa${d.fecha ? " · Fecha " + d.fecha : ""}` }, title: `${tname(L, d.a)} vs ${tname(L, d.b)} se juega en ${d.map}`, color: ONYX_COLOR,
    description: `${d.map} queda tachado para los dos equipos.`, footer: footer(L) };
}
export function transferEmbed(L, t) {
  return { author: { name: "Fichaje" }, title: `${t.name} → ${t.to ? tname(L, t.to) : "agente libre"}`, color: hex(t.to ? L.teams[t.to].c : 0xffcb52), thumbnail: t.to ? thumb(t.to, L) : undefined,
    description: `${t.from ? `Viene de ${tname(L, t.from)}` : "Llega como agente libre"}${t.amt ? ` · ${fmt(t.amt)} ONYX Coins` : ""}`, footer: footer(L) };
}
export function announceEmbed({ title, text, color, image }, L) {
  return { title: String(title || "").slice(0, 256), description: String(text || "").replace(/\s\|\s?/g, "\n").slice(0, 4000), color: color != null ? color : ONYX_COLOR,
    image: image ? { url: image } : undefined, footer: L ? footer(L) : { text: "ONYX Bot" }, timestamp: new Date().toISOString() };
}

// ---------- avisos en los canales de cada equipo ----------
// x = un cruce (ida y vuelta) o un partido suelto
function ctx(L, x, k) {
  const s = asSeries(x), ok = k === s.a ? s.b : s.a, t = L.teams[k], o = L.teams[ok];
  const row = L.real.find((r) => r.k === k), orow = L.real.find((r) => r.k === ok);
  const used = new Set(t.used), left = L.cfg.maps.filter((m) => m.on !== false && !used.has(m.n)).map((m) => m.n);
  return { s, many: s.games.length > 1, t, o, ok, d: firstDate(s), row, orow, left };
}
const standLine = (r) => r ? `${r.pos}° · ${r.pts} pts${r.form.length ? " · " + r.form.slice(-5).join(" ") : ""}` : "–";
const mapField = (s, left) => s.games.length === 1 && s.games[0].map ? { name: "Mapa sorteado", value: `**${s.games[0].map}**`, inline: false }
  : { name: `Mapas que les quedan (${left.length})`, value: left.join(" · ") || "Ninguno", inline: false };
const gamesField = (s) => ({ name: s.games.length > 1 ? "Ida y vuelta" : "Partido", value: gamesList(s), inline: false });

// Canal chat: aviso del cruce.
export function teamChatMsg(L, x, k) {
  const { s, many, t, o, ok, d, row, orow } = ctx(L, x, k), m = s.games[0];
  return { allowed_mentions: { parse: [] }, components: linkRow(),
    embeds: [{ author: { name: `Fecha ${s.f} · ${many ? "Ida y vuelta" : "Partido"} de ${t.name}`, icon_url: emblem(k, L) || undefined }, title: `⚔️ ${t.name} vs ${o.name}`, color: hex(t.c), thumbnail: thumb(ok, L),
      description: many ? `${d ? `⏰ Arranca ${ts(d, "R")}\n\n` : ""}${gamesList(s)}\n🗺️ Mapas: cada capitán elige el de uno de los dos partidos.\n\n¡Vamos ${t.name}! 💪`
        : `📅 ${when(d)}\n🗺️ Mapa: ${m.map ? `**${m.map}**` : "se sortea en vivo antes del partido"}\n\n¡Vamos ${t.name}! 💪`,
      fields: [{ name: t.name, value: standLine(row), inline: true }, { name: o.name, value: standLine(orow), inline: true }], footer: footer(L) }] };
}

// Link a la sección de la web donde el capitán elige mapa y lado.
export const mapPickUrl = (m) => `${env().site}/?mapa=${encodeURIComponent(m.id)}#elegir-mapa`;
const mapPickRow = (m) => [{ type: 1, components: [{ type: 2, style: 5, label: "Elegir mapa en la web", url: mapPickUrl(m), emoji: { name: "🗺️" } }] }];

// Pedido de mapa a los capitanes (se manda desde el panel de ONYX Bot).
export function mapAskMsg(L, x, k, roleId) {
  const { s, many, t, o, d, left } = ctx(L, x, k), g0 = s.games[0];
  return { content: `${roleId ? `<@&${roleId}> ` : ""}Capitán de **${t.name}**: elegí ${many ? "la ida o la vuelta, con su mapa," : "el mapa"} para la fecha ${s.f}.`,
    allowed_mentions: { parse: [], roles: roleId ? [roleId] : [] }, components: mapPickRow(g0),
    embeds: [{ author: { name: `Fecha ${s.f} · ${t.name} vs ${o.name}`, icon_url: emblem(k, L) || undefined }, title: "🗺️ ¿Qué mapa van a jugar?", color: hex(t.c), thumbnail: thumb(k, L),
      description: many
        ? `Esta fecha juegan **ida y vuelta** contra **${o.name}**. Entrá a la web con tu cuenta de capitán y elegí **uno solo de los dos partidos**:\n**1.** ¿Ida o vuelta? (si el capitán de ${o.name} ya eligió uno, te queda el otro).\n**2.** El mapa.\n**3.** Si tu equipo arranca en **ataque** o en **defensa**.\n\nEl otro partido lo elige el capitán de ${o.name}. Lo que elijas lo ve solo el staff hasta que el bot avise los mapas.`
        : `Entrá a la web con tu cuenta de capitán y elegí:\n**1.** El mapa que van a jugar contra **${o.name}**.\n**2.** Si arrancan en **ataque** o en **defensa**.\n\n📅 ${when(d)}\nLo ve solo el staff, no el rival.`,
      fields: [...(many ? [gamesField(s)] : []), { name: `Mapas que les quedan (${left.length})`, value: left.join(" · ") || "Ninguno", inline: false }], footer: footer(L) }] };
}

// Mapas confirmados de la fecha: a cada equipo le dice el mapa de la ida y de la vuelta, quién lo eligió y en qué lado arrancan.
const SIDE = { atk: "Ataque", def: "Defensa" }, OPP = { atk: "def", def: "atk" };
export function mapResultMsg(L, x, k, picks, roleId, changed) {
  const { s, t, o, ok } = ctx(L, x, k), tn = (q) => (L.teams[q] ? L.teams[q].name : q);
  const fields = s.games.map((g, i) => {
    const p = picks[g.id] || {}, pk = p[s.a] || p[s.b] || null, label = legOf(s, i);
    if (!pk) return { name: `${label} · sin elegir`, value: `Todavía no lo eligió nadie · ${gameWhen(g)}`, inline: false };
    const mine = pk.team === k ? pk.side : OPP[pk.side];
    return { name: `${label} · 🗺️ ${pk.map}`, value: `${pk.team === k ? "Lo eligieron ustedes" : `Lo eligió ${tn(pk.team)}`} · ${gameWhen(g)}\n**${t.name}** arranca en **${SIDE[mine] || "?"}** · ${o.name} en ${SIDE[OPP[mine]] || "?"}`, inline: false };
  });
  return { content: `${roleId ? `<@&${roleId}> ` : ""}${changed ? "Cambió un mapa de" : "Mapas confirmados para"} **${t.name} vs ${o.name}** (fecha ${s.f}).`,
    allowed_mentions: { parse: [], roles: roleId ? [roleId] : [] },
    embeds: [{ author: { name: `Fecha ${s.f} · ${t.name} vs ${o.name}`, icon_url: emblem(k, L) || undefined }, title: changed ? "🔁 Cambió un mapa" : "🗺️ Mapas de la fecha", color: hex(t.c), thumbnail: thumb(ok, L),
      fields, footer: footer(L) }] };
}

// Canal info: menciona al rol del equipo y pide roles, mapa y lado.
export function teamInfoMsg(L, x, k, roleId) {
  const { s, many, t, o, d, left } = ctx(L, x, k);
  return { components: mapPickRow(s.games[0]), content: `${roleId ? `<@&${roleId}> ` : ""}¡Se viene ${ivName(s)} contra **${o.name}**!${d ? " " + ts(d, "R") : ""}`,
    allowed_mentions: { parse: [], roles: roleId ? [roleId] : [] },
    embeds: [{ title: "📝 Antes del partido, pongan acá:", color: hex(t.c), thumbnail: thumb(k, L),
      description: many
        ? "**1. Roles** · qué rol va a jugar cada uno en la ida y en la vuelta (Duelista, Iniciador, Controlador o Centinela).\n**2. Mapa y lado** · el capitán elige en la web **uno de los dos partidos** (ida o vuelta): el mapa y si arrancan en **ataque** o en **defensa**. El otro lo elige el capitán rival."
        : "**1. Roles** · qué rol va a jugar cada uno (Duelista, Iniciador, Controlador o Centinela).\n**2. Mapa** · qué mapa van a jugar.\n**3. Lado** · si arrancan en **ataque** o en **defensa**.",
      fields: [mapField(s, left), many ? gamesField(s) : { name: "Partido", value: `${t.name} vs ${o.name} · Fecha ${s.f}\n${when(d)}`, inline: false }], footer: footer(L) }] };
}

// Canal strats: invita a subir estrategias y clips, con datos del rival.
export function teamStratsMsg(L, x, k) {
  const { s, t, o, ok, d, orow, left } = ctx(L, x, k);
  const star = L.P.filter((p) => p.team === ok && p.s.m).sort((a, b) => b.s.acs - a.s.acs)[0];
  const fields = [mapField(s, left), { name: `Cómo viene ${o.name}`, value: standLine(orow), inline: true }];
  if (star) fields.push({ name: `Figura de ${o.name}`, value: `${star.name} · ${star.role} · ACS ${star.s.acs} · K/D ${dec(star.s.kd)}`, inline: true });
  return { allowed_mentions: { parse: [] },
    embeds: [{ author: { name: `Strats · ${t.name} vs ${o.name}` }, title: "🎯 Suban sus estrategias y clips", color: hex(t.c), thumbnail: thumb(ok, L),
      description: `Para ${ivName(s)} contra **${o.name}** (${d ? ts(d, "R") : "a confirmar"}): dejen acá las estrategias, setups, lineups o clips que quieran usar.\nAsí todo el equipo llega con el plan claro.`,
      fields, footer: footer(L) }] };
}

// Canal partidos: recordatorio de subir las stats al terminar.
export function teamPartidosMsg(L, x, k, now = Date.now()) {
  const { s, many, t, o, d } = ctx(L, x, k), started = d && now >= d.getTime() - 60000;
  return { allowed_mentions: { parse: [] },
    embeds: [{ author: { name: `Fecha ${s.f}${many ? " · Ida y vuelta" : ""}` }, title: started ? `🎮 ¡Arranca ${t.name} vs ${o.name}!` : `🎮 ${t.name} vs ${o.name}`, color: hex(t.c), thumbnail: thumb(k, L),
      description: many
        ? `${started ? "" : `${gamesList(s)}\n\n`}Cuando termine **cada partido**, suban acá las stats **de la ida y de la vuelta** (una captura del marcador final por partido, con kills, muertes, asistencias y ACS de todos). 📸\nCon eso el staff carga los dos resultados en la web.`
        : `${started ? "" : `📅 ${when(d)}\n\n`}Cuando termine el partido, **no se olviden de subir acá las stats**: la captura del marcador final con kills, muertes, asistencias y ACS de todos. 📸\nCon eso el staff carga el resultado en la web.`,
      footer: footer(L) }] };
}

// Canal partidos: resultado del cruce con las stats del equipo (ida y vuelta en el mismo mensaje).
const teamRows = (L, g, k) => Object.entries(g.stats || {}).filter(([pid, st]) => (st.t || (L.PM[pid] || {}).team) === k && L.PM[pid])
  .map(([pid, st]) => ({ n: L.PM[pid].name, k: +st.k || 0, d: +st.d || 0, a: +st.a || 0, acs: +st.acs || 0, mvp: pid === g.mvpId })).sort((a, b) => b.acs - a.acs);
const statsBlock = (rows) => "```\n" + rows.map((r) => `${pad(r.n + (r.mvp ? " ★" : ""), 14)}${lpad(`${r.k}/${r.d}/${r.a}`, 9)}  ACS ${r.acs}`).join("\n") + "\n```";
export function teamResultMsg(L, x, k) {
  const { s, many, t, o, row } = ctx(L, x, k);
  const res = s.games.map((g) => { const mine = k === g.a ? +g.ra : +g.rb, theirs = k === g.a ? +g.rb : +g.ra; return { g, mine, theirs, won: mine > theirs }; });
  const tail = `Ahora están **${row.pos}°** con **${row.pts} pts**.`;
  if (!many) {
    const { g: m, mine, theirs, won } = res[0], rows = teamRows(L, m, k);
    return { allowed_mentions: { parse: [] }, components: linkRow(),
      embeds: [{ author: { name: `Fecha ${s.f} · ${t.name}` }, title: `${won ? "✅ Victoria" : "❌ Derrota"} ${mine}-${theirs} vs ${o.name}`, color: won ? 0x2fe29a : 0xff4f6e, thumbnail: thumb(k, L),
        description: `${m.ot ? "En prórroga. " : ""}${m.noShow ? "Por W.O. " : ""}${m.map ? `Mapa: ${m.map}. ` : ""}${tail}`,
        fields: rows.length ? [{ name: "Stats del equipo", value: statsBlock(rows), inline: false }] : [], footer: footer(L) }] };
  }
  const w = res.filter((r) => r.won).length, l = res.length - w;
  const fields = res.map((r, i) => ({ r, i, rows: teamRows(L, r.g, k) })).filter((x2) => x2.rows.length).map((x2) => ({ name: `Stats · ${legOf(s, x2.i)}`, value: statsBlock(x2.rows), inline: false }));
  return { allowed_mentions: { parse: [] }, components: linkRow(),
    embeds: [{ author: { name: `Fecha ${s.f} · Ida y vuelta · ${t.name}` }, title: `${w > l ? "✅" : w < l ? "❌" : "➖"} ${w > l ? "Ganaron" : w < l ? "Perdieron" : "Empataron"} ${w}-${l} vs ${o.name}`,
      color: w > l ? 0x2fe29a : w < l ? 0xff4f6e : ONYX_COLOR, thumbnail: thumb(k, L),
      description: res.map((r, i) => `**${legOf(s, i)}** · ${r.won ? "Victoria" : "Derrota"} ${r.mine}-${r.theirs}${r.g.ot ? " (prórroga)" : ""}${r.g.noShow ? " (W.O.)" : ""}${r.g.map ? ` · ${r.g.map}` : ""}`).join("\n") + `\n\n${tail}`,
      fields, footer: footer(L) }] };
}

// Canal info: mapa sorteado para su partido.
export function teamDrawMsg(L, dr, k) {
  const t = L.teams[k], o = L.teams[dr.a === k ? dr.b : dr.a];
  return { allowed_mentions: { parse: [] },
    embeds: [{ title: `🗺️ Mapa sorteado: ${dr.map}`, color: hex(t.c), thumbnail: thumb(k, L),
      description: `Para el partido contra **${o ? o.name : "el rival"}**${dr.fecha ? ` (fecha ${dr.fecha})` : ""}. ${dr.map} queda tachado para los dos equipos.\nYa pueden ir armando roles y estrategias.`, footer: footer(L) }] };
}
