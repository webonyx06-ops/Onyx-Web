// Avisos automáticos de ONYX Bot: configuración, detección de canales y la revisión que corre cada 10 minutos.
import { TEAM_DEF, TEAM_KEYS, parseLocal, build, legSort } from "./league.mjs";
const KEY_OK = /^[a-z0-9]{2,20}$/;
import { listColl, loadLeague, loadMatches, loadSnapshot } from "./fsrest.mjs";
import { patchSnapshot } from "./publish.mjs";
import { sendMessage } from "./discord.mjs";
import * as E from "./embeds.mjs";

export const OFFSETS = [[1440, "24 h antes"], [720, "12 h antes"], [360, "6 h antes"], [180, "3 h antes"], [60, "1 h antes"], [30, "30 min antes"], [0, "Al empezar"]];
export const TEAM_KINDS = [["chat", "Chat"], ["info", "Info"], ["strats", "Strats"], ["partidos", "Partidos"]];
export const GEN_CHANNELS = [["anuncios", "Anuncios"], ["partidos", "Recordatorios generales"], ["resultados", "Resultados"], ["mapas", "Mapas sorteados"], ["mercado", "Fichajes"]];
const OFF_OK = new Set(OFFSETS.map((o) => o[0]));
const MAX_SENDS = 30;
const H = 3600000;

export function defaultConfig() {
  return {
    enabled: false,
    channels: Object.fromEntries(GEN_CHANNELS.map(([k]) => [k, ""])),
    general: { reminders: [1440, 60], results: true, draws: true, transfers: true },
    teams: Object.fromEntries(TEAM_KEYS.map((k) => [k, { role: "", chat: "", info: "", strats: "", partidos: "", mapas: "" }])),
    mapAsk: { mention: "none", auto: false },
    team: { chat: [1440, 60], info: [1440], strats: [1440], partidos: [0], result: true, drawInfo: true },
  };
}

const sid = (v) => (/^\d{5,25}$/.test(String(v || "")) ? String(v) : "");
const offs = (v, def) => (Array.isArray(v) ? [...new Set(v.map(Number).filter((n) => OFF_OK.has(n)))].sort((a, b) => b - a) : def);
const bool = (v, def) => (typeof v === "boolean" ? v : def);

export function normConfig(c) {
  const d = defaultConfig(); c = c || {};
  const out = { enabled: bool(c.enabled, d.enabled), channels: {}, general: {}, teams: {}, team: {} };
  GEN_CHANNELS.forEach(([k]) => { out.channels[k] = sid((c.channels || {})[k]); });
  const g = c.general || {};
  out.general = { reminders: offs(g.reminders, d.general.reminders), results: bool(g.results, true), draws: bool(g.draws, true), transfers: bool(g.transfers, true) };
  // equipos de base más los que se agregaron desde el panel
  const keys = [...new Set([...TEAM_KEYS, ...Object.keys(c.teams || {}).filter((k) => KEY_OK.test(k))])].slice(0, 40);
  keys.forEach((k) => { const t = (c.teams || {})[k] || {}; out.teams[k] = { role: sid(t.role) }; TEAM_KINDS.forEach(([kind]) => { out.teams[k][kind] = sid(t[kind]); }); out.teams[k].mapas = sid(t.mapas); });
  // pedido de mapa a los capitanes: a quién mencionar
  const mm = (c.mapAsk || {}).mention;
  out.mapAsk = { mention: mm === "team" ? "team" : sid(mm) || "none", auto: bool((c.mapAsk || {}).auto, false) };
  const t = c.team || {};
  TEAM_KINDS.forEach(([kind]) => { out.team[kind] = offs(t[kind], d.team[kind]); });
  out.team.result = bool(t.result, true); out.team.drawInfo = bool(t.drawInfo, true);
  return out;
}

// ---------- detección automática de canales y roles por nombre ----------
// Saca emojis, acentos y letras decoradas: "🦉 𝐎𝐍𝐘𝐗" -> "onyx", "📋・nexus-info" -> "nexusinfo".
export const norm = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const KIND_WORDS = { chat: ["chat"], info: ["info"], strats: ["strat", "estrateg", "tactic"], partidos: ["partido", "match"] };
const GEN_WORDS = { anuncios: ["anuncio"], partidos: ["partidosyresultado", "calendario", "agenda", "fixture", "partido"], resultados: ["resultado"], mapas: ["sorteo", "mapa", "partidosyresultado"], mercado: ["mercado", "fichaje", "traspaso", "novedad"] };
const isText = (c) => c.type === 0 || c.type === 5;

export function detect(channels, roles, guildId, teamList = TEAM_DEF.map(([k, n]) => [k, n])) {
  const cats = Object.fromEntries(channels.filter((c) => c.type === 4).map((c) => [c.id, norm(c.name)]));
  const text = channels.filter(isText).sort((a, b) => (a.position || 0) - (b.position || 0));
  const teamKeys = teamList.map(([k, n]) => [k, norm(n) || k]);
  const teams = {}, found = { channels: 0, roles: 0 };
  for (const [k, kn] of teamKeys) {
    const t = { role: "" };
    for (const [kind] of TEAM_KINDS) {
      let best = null, bs = 0;
      for (const c of text) {
        const n = norm(c.name), cat = cats[c.parent_id] || "";
        if (!KIND_WORDS[kind].some((w) => n.includes(w))) continue;
        let sc = 0;
        if (cat === kn || cat === "equipo" + kn || cat === "team" + kn) sc += 3; else if (cat.includes(kn)) sc += 2;
        if (n.startsWith(kn)) sc += 2; else if (n.includes(kn)) sc += 1;
        if (sc >= 2 && sc > bs) { best = c; bs = sc; }
      }
      t[kind] = best ? best.id : "";
      if (best) found.channels++;
    }
    const r = roles.find((x) => x.id !== guildId && !x.managed && norm(x.name) === kn);
    if (r) { t.role = r.id; found.roles++; }
    teams[k] = t;
  }
  // canales generales: los que no son de ningún equipo
  const teamNames = teamKeys.map((x) => x[1]);
  const general = text.filter((c) => { const n = norm(c.name), cat = cats[c.parent_id] || ""; return !teamNames.some((tn) => cat === tn || n.startsWith(tn)) && !cat.includes("staff"); });
  const channelsOut = {};
  for (const [k] of GEN_CHANNELS) {
    let hit = null;
    for (const w of GEN_WORDS[k]) { hit = general.find((c) => norm(c.name).includes(w)); if (hit) break; }
    channelsOut[k] = hit ? hit.id : "";
  }
  return { teams, channels: channelsOut, found };
}

// ---------- cuándo toca cada aviso ----------
// Devuelve { send, skip }: el offset a mandar (el más cercano al partido) y los que ya pasaron y se dan por hechos.
export function dueOffsets(list, start, now, done) {
  const due = list.filter((M) => now >= start - M * 60000 && (M === 0 ? now < start + 3 * H : now < start)).filter((M) => !done(M));
  if (!due.length) return { send: null, skip: [] };
  const send = Math.min(...due);
  return { send, skip: due.filter((M) => M !== send) };
}
const keyOf = (...p) => p.join("|").replace(/[^A-Za-z0-9|_-]/g, "_");
// Cruce = las partidas de una misma fecha entre los mismos dos equipos (ida y vuelta).
// Cada capitán elige UNA de esas partidas (mapa + lado); la otra la elige el capitán rival.
export function seriesOf(ms) {
  const map = {};
  ms.forEach((m) => { if (!m.a || !m.b) return; const [a, b] = [m.a, m.b].sort(), key = `f${m.fecha}_${a}_${b}`; (map[key] = map[key] || { key, f: +m.fecha, a, b, games: [] }).games.push(m); });
  const out = Object.values(map);
  out.forEach((x) => x.games.sort(legSort)); // ida primero, después la vuelta
  return out;
}
// El cruce de un partido (con los datos ya armados de la liga)
export const seriesFor = (ms, m) => seriesOf(ms.filter((x) => +x.fecha === +m.fecha && [x.a, x.b].sort().join("~") === [m.a, m.b].sort().join("~")))[0] || { key: m.id, f: +m.fecha, a: m.a, b: m.b, games: [m] };
const liveSeries = (L, s) => ({ ...s, games: s.games.map((g) => L.ms.find((x) => x.id === g.id) || g) });
// Cuándo arranca el cruce: el primer partido con día y hora
const seriesStart = (s) => s.games.map((g) => ({ g, d: parseLocal(g.date) })).filter((x) => x.d).sort((x, y) => x.d - y.d)[0] || null;
const seriesScore = (s) => s.games.map((m) => `${m.ra}-${m.rb}${m.noShow ? "-wo" : ""}${m.ot ? "-ot" : ""}`).join("/");
// Elección de cada partida del cruce (la hizo uno de los dos capitanes) o null
export const seriesPicks = (s, picks) => s.games.map((g) => { const p = picks[g.id] || {}; return p[s.a] || p[s.b] || null; });
// Huella de lo elegido en un cruce (para no repetir el aviso si no cambió nada).
export const mapHash = (s, picks) => seriesPicks(s, picks).map((p) => (p ? `${p.team}/${p.map}/${p.side}` : "-")).join("|");
// ¿Ya eligieron los dos capitanes? (si el cruce tiene una sola partida, alcanza con que esté elegida)
export const seriesReady = (s, picks) => { const sp = seriesPicks(s, picks), who = new Set(sp.filter(Boolean).map((p) => p.team)); return s.games.length >= 2 ? who.has(s.a) && who.has(s.b) : sp.every(Boolean); };
// Elecciones con el formato actual (una por equipo y fecha: f<fecha>_<equipo>). Las de antes (<partido>_<equipo>)
// solo cuentan para descartar mapas de partidos ya jugados.
export const isNewPick = (id) => /^f\d+_[a-z0-9]{2,20}$/.test(String(id || ""));
export const newPicks = (snap) => groupPicks(snap.docs.filter((d) => isNewPick(d.id)).map((d) => d.data()));
// { partido: { equipo: elección } } a partir de la colección mappicks
export const groupPicks = (docs) => { const out = {}; docs.forEach((x) => { if (x && x.matchId && x.team) (out[x.matchId] = out[x.matchId] || {})[x.team] = x; }); return out; };
// Los mapas que eligen los capitanes quedan descartados para su equipo (teams/{k}.picked) cuando
// el bot ya avisó los mapas a los dos equipos o cuando el partido se jugó. Antes de eso, solo lo sabe el staff.
export async function syncPickedMaps(db, { force = false } = {}) {
  // Huella barata de todo lo que influye (resumen público, elecciones y avisos del bot): si no cambió, no se lee nada más.
  // Así esta revisión gasta 4 lecturas en vez de leer todas las elecciones cada 10 minutos.
  const [snap, stSnap, sysSnap, cnt, last] = await Promise.all([loadSnapshot().catch(() => null), db.doc("bot/state").get(), db.doc("sys/picksync").get(),
    db.collection("mappicks").count().get().then((r) => r.data().count).catch(() => -1), db.collection("mappicks").orderBy("at", "desc").limit(1).get().then((r) => (r.docs[0] && r.docs[0].data().at) || 0).catch(() => -1)]);
  const sentNow = ((stSnap.exists ? stSnap.data() : {}) || {}).mapsSent || {};
  const sig = [snap ? snap.rev : "x", cnt, last, JSON.stringify(Object.keys(sentNow).sort().map((k) => [k, sentNow[k]]))].join("|");
  if (!force && snap && cnt >= 0 && last >= 0 && sysSnap.exists && sysSnap.data().sig === sig) return { changed: 0, skipped: true };
  const [rawMatches, pickSnap, teamSnap] = await Promise.all([snap && snap.matches ? snap.matches : listColl("matches"), db.collection("mappicks").get(), db.collection("teams").get()]);
  const picks = newPicks(pickSnap), all = groupPicks(pickSnap.docs.map((d) => d.data())), sent = sentNow;
  const teams = {}; teamSnap.docs.forEach((d) => { teams[d.id] = d.data(); });
  const want = {};
  for (const s of seriesOf(Object.entries(rawMatches).map(([id, m]) => ({ ...m, id })))) {
    const announced = sent[s.key] && sent[s.key] === mapHash(s, picks);
    s.games.forEach((g, i) => {
      if (g.status === "played") { Object.values(all[g.id] || {}).forEach((x) => { if (x && x.team && x.map) (want[x.team] = want[x.team] || {})[g.id] = x.map; }); return; }
      const pk = seriesPicks(s, picks)[i]; if (!pk) return;
      const k = pk.team, prev = ((teams[k] || {}).picked || {})[g.id];
      if (announced) (want[k] = want[k] || {})[g.id] = pk.map;
      else if (prev) (want[k] = want[k] || {})[g.id] = prev; // lo ya publicado se mantiene hasta que se vuelva a avisar
    });
  }
  const norm = (o) => JSON.stringify(Object.keys(o || {}).sort().map((x) => [x, o[x]]));
  let changed = 0; const touched = [];
  for (const k of new Set([...Object.keys(want), ...Object.keys(teams).filter((x) => Object.keys((teams[x] || {}).picked || {}).length)])) {
    const next = want[k] || {};
    if (norm(next) === norm((teams[k] || {}).picked)) continue;
    if (teams[k]) await db.doc(`teams/${k}`).update({ picked: next }); else await db.doc(`teams/${k}`).set({ picked: next }, { merge: true });
    changed++; touched.push(`teams/${k}`);
  }
  if (touched.length) { try { await patchSnapshot(db, touched); } catch (e) { console.error("resumen:", e); } }
  // con la huella nueva (si se tocaron equipos, cambia el resumen y se vuelve a revisar una vez más)
  await db.doc("sys/picksync").set({ sig: touched.length ? "" : sig, at: Date.now() });
  return { changed };
}
export const mapRole = (cfg, k) => (cfg.mapAsk.mention === "team" ? (cfg.teams[k] || {}).role : cfg.mapAsk.mention !== "none" ? cfg.mapAsk.mention : "");

// Qué mensaje va a cada canal del equipo. x = cruce (ida y vuelta) o partido suelto.
export function teamPayload(kind, L, x, k, cfg, now) {
  if (kind === "chat") return E.teamChatMsg(L, x, k);
  if (kind === "info") return E.teamInfoMsg(L, x, k, (cfg.teams[k] || {}).role);
  if (kind === "strats") return E.teamStratsMsg(L, x, k);
  if (kind === "partidos") return E.teamPartidosMsg(L, x, k, now);
  return null;
}

async function post(ch, payload, log, label) {
  try { await sendMessage(ch, payload); log.unshift({ at: Date.now(), ok: true, txt: label }); return true; }
  catch (e) { log.unshift({ at: Date.now(), ok: false, txt: `${label} — ${e.message}` }); return false; }
}

// Manda ya los avisos de un cruce (botón del panel), sin esperar el horario: un mensaje por canal con la ida y la vuelta.
export async function sendMatchNow(cfg, L, m, kinds, now = Date.now()) {
  const log = [], s = liveSeries(L, seriesFor(L.ms, m));
  for (const k of [s.a, s.b]) for (const kind of kinds) {
    const ch = cfg.teams[k] && cfg.teams[k][kind];
    if (!ch) { log.unshift({ at: now, ok: false, txt: `${L.teams[k].name}: no hay canal ${kind} elegido` }); continue; }
    await post(ch, teamPayload(kind, L, s, k, cfg, now), log, `${L.teams[k].name} · ${kind} · F${s.f} vs ${L.teams[k === s.a ? s.b : s.a].name}${s.games.length > 1 ? " (ida y vuelta)" : ""}`);
  }
  return log;
}

// ---------- revisión periódica ----------
export async function runTick(db, { now = Date.now(), force = false } = {}) {
  const cfgSnap = await db.doc("bot/config").get();
  const cfg = normConfig(cfgSnap.exists ? cfgSnap.data() : null);
  if (!cfg.enabled && !force) return { skipped: "Los avisos automáticos están apagados." };

  const stRef = db.doc("bot/state");
  const locked = await db.runTransaction(async (tx) => {
    const s = await tx.get(stRef), d = s.exists ? s.data() : {};
    if (d.lockAt && now - d.lockAt < 120000) return true;
    tx.set(stRef, { lockAt: now }, { merge: true });
    return false;
  });
  if (locked) return { skipped: "Ya había una revisión en curso." };

  const st = (await stRef.get()).data() || {};
  const state = { init: !!st.init, rv: st.rv || 1, sent: st.sent || {}, mapsSent: st.mapsSent || {}, results: st.results || {}, seenPlayed: st.seenPlayed || {}, draws: st.draws || [], transfers: st.transfers || [], log: st.log || [] };
  const log = [];
  try {
    const rawMatches = await loadMatches();
    const ms = Object.entries(rawMatches).map(([id, m]) => ({ ...m, id, fecha: +m.fecha || 1 })).filter((m) => m.a && m.b && m.a !== m.b && KEY_OK.test(m.a) && KEY_OK.test(m.b));
    const recent = async (coll) => (await db.collection(coll).where("at", ">", now - 3 * 24 * H).get()).docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.at || 0) - (b.at || 0));
    const [draws, transfers] = await Promise.all([recent("draws"), recent("transfers")]);
    const series = seriesOf(ms), allPlayed = (s) => s.games.every((g) => g.status === "played");

    // Primera vez: todo lo que ya existía se da por avisado (no repite resultados viejos).
    if (!state.init) {
      series.filter(allPlayed).forEach((s) => { state.results[s.key] = seriesScore(s); });
      state.draws = draws.map((d) => d.id); state.transfers = transfers.map((t) => t.id); state.init = true; state.rv = 2;
      log.unshift({ at: now, ok: true, txt: "ONYX Bot empezó a vigilar la liga: los resultados, sorteos y fichajes anteriores no se publican." });
    }
    // Cambio a avisos por cruce (antes eran por partido): pasa lo ya avisado a la cuenta nueva para no repetir nada.
    if (state.rv < 2) {
      const res = {}, kinds = [["all", "gen", cfg.general.reminders], ...[].concat(...TEAM_KINDS.map(([kind]) => [["A", kind, cfg.team[kind]], ["B", kind, cfg.team[kind]]]))];
      for (const s of series) {
        if (allPlayed(s) && s.games.every((g) => state.results[g.id] != null)) res[s.key] = seriesScore(s);
        const st0 = seriesStart(s); if (!st0) continue;
        for (const [sc, kind, list] of kinds) for (const M of list || []) {
          const scope = sc === "A" ? s.a : sc === "B" ? s.b : sc;
          if (s.games.some((g) => state.sent[keyOf(g.id, scope, kind, M, g.date)])) state.sent[keyOf(s.key, scope, kind, M, st0.g.date)] = now;
        }
      }
      state.results = res; state.seenPlayed = {}; state.rv = 2;
    }

    const jobs = []; // { ch, make(L), label, mark() }
    const sentMark = (key) => () => { state.sent[key] = now; };

    // 1) recordatorios: uno por cruce (ida y vuelta juntas), contando desde el primer partido
    for (const s of series) {
      if (allPlayed(s)) continue;
      const st0 = seriesStart(s); if (!st0) continue;
      const start = st0.d.getTime(), dkey = st0.g.date, iv = s.games.length > 1 ? " (ida y vuelta)" : "";
      const plan = (scope, kind, list, ch, make, label) => {
        if (!ch || !list.length) return;
        const done = (M) => !!state.sent[keyOf(s.key, scope, kind, M, dkey)];
        const { send, skip } = dueOffsets(list, start, now, done);
        skip.forEach((M) => { state.sent[keyOf(s.key, scope, kind, M, dkey)] = now; });
        if (send != null) jobs.push({ ch, make, label, mark: sentMark(keyOf(s.key, scope, kind, send, dkey)) });
      };
      plan("all", "gen", cfg.general.reminders, cfg.channels.partidos, (L) => ({ embeds: [E.reminderEmbed(L, liveSeries(L, s))], components: E.linkRow(), allowed_mentions: { parse: [] } }), `Recordatorio general · F${s.f} ${s.a} vs ${s.b}${iv}`);
      for (const k of [s.a, s.b]) for (const [kind] of TEAM_KINDS) {
        plan(k, kind, cfg.team[kind], (cfg.teams[k] || {})[kind], (L) => teamPayload(kind, L, liveSeries(L, s), k, cfg, now), `${k.toUpperCase()} · ${kind} · F${s.f} vs ${(k === s.a ? s.b : s.a).toUpperCase()}${iv}`);
      }
    }

    // 1b) mapas elegidos por los capitanes: cuando los dos eligieron, se avisa a los dos equipos
    if (cfg.mapAsk.auto) {
      // solo las elecciones de las fechas con partidos por jugar (las demás no cambian nada acá)
      const pendF = [...new Set(series.filter((s) => !allPlayed(s)).map((s) => +s.f))], pickDocs = [];
      for (let i = 0; i < pendF.length; i += 10) pickDocs.push(...(await db.collection("mappicks").where("fecha", "in", pendF.slice(i, i + 10)).get()).docs);
      const picks = newPicks({ docs: pickDocs });
      for (const s of series) {
        if (allPlayed(s) || !seriesReady(s, picks)) continue;
        const h = mapHash(s, picks); if (state.mapsSent[s.key] === h) continue;
        const changed = !!state.mapsSent[s.key], mark = () => { state.mapsSent[s.key] = h; };
        const targets = [s.a, s.b].map((k) => ({ k, ch: (cfg.teams[k] || {}).mapas || (cfg.teams[k] || {}).info })).filter((x) => x.ch)
          .map((x) => ({ ch: x.ch, make: (L) => E.mapResultMsg(L, s, x.k, picks, mapRole(cfg, x.k), changed), label: `${x.k.toUpperCase()} · mapas confirmados · F${s.f}` }));
        if (!targets.length) { mark(); continue; }
        targets.forEach((t, i) => jobs.push({ ...t, first: i === 0, mark: i === targets.length - 1 ? mark : () => {} }));
      }
    }

    // 2) resultados: uno por cruce, cuando se jugaron la ida y la vuelta (espera 15 minutos para que el staff termine de cargar las stats)
    for (const s of series) {
      if (!allPlayed(s)) { delete state.results[s.key]; delete state.seenPlayed[s.key]; continue; }
      const sc = seriesScore(s), prev = state.results[s.key];
      if (prev === sc) continue;
      if (prev == null) {
        const first = state.seenPlayed[s.key] || (state.seenPlayed[s.key] = now);
        const nStats = Math.min(...s.games.map((g) => Object.keys(g.stats || {}).length));
        if (now - first < 15 * 60000 && nStats < 10) continue;
      }
      const corrected = prev != null, mark = () => { state.results[s.key] = sc; delete state.seenPlayed[s.key]; };
      const txt = s.games.map((g) => `${g.ra}-${g.rb}`).join(" / "), targets = [];
      if (cfg.general.results && cfg.channels.resultados) targets.push({ ch: cfg.channels.resultados, make: (L) => E.msg(E.seriesResultEmbed(L, liveSeries(L, s), corrected)), label: `${corrected ? "Resultado corregido" : "Resultado"} · F${s.f} ${s.a} vs ${s.b} · ${txt}` });
      if (cfg.team.result && !corrected) for (const k of [s.a, s.b]) if ((cfg.teams[k] || {}).partidos) targets.push({ ch: cfg.teams[k].partidos, make: (L) => E.teamResultMsg(L, liveSeries(L, s), k), label: `${k.toUpperCase()} · resultado · F${s.f}` });
      if (!targets.length) { mark(); continue; }
      targets.forEach((t, i) => jobs.push({ ...t, first: i === 0, mark: i === targets.length - 1 ? mark : () => {} }));
    }

    // 3) mapas sorteados
    for (const dr of draws) {
      if (state.draws.includes(dr.id)) continue;
      const mark = () => { state.draws.push(dr.id); };
      const targets = [];
      if (cfg.general.draws && cfg.channels.mapas) targets.push({ ch: cfg.channels.mapas, make: (L) => E.msg(E.drawEmbed(L, dr)), label: `Sorteo · ${dr.map} · ${dr.a} vs ${dr.b}` });
      if (cfg.team.drawInfo) for (const k of [dr.a, dr.b]) if (cfg.teams[k] && cfg.teams[k].info) targets.push({ ch: cfg.teams[k].info, make: (L) => E.teamDrawMsg(L, dr, k), label: `${k.toUpperCase()} · info · mapa ${dr.map}` });
      if (!targets.length) { mark(); continue; }
      targets.forEach((t, i) => jobs.push({ ...t, first: i === 0, mark: i === targets.length - 1 ? mark : () => {} }));
    }

    // 4) fichajes
    for (const tr of transfers) {
      if (state.transfers.includes(tr.id)) continue;
      const mark = () => { state.transfers.push(tr.id); };
      if (cfg.general.transfers && cfg.channels.mercado) jobs.push({ ch: cfg.channels.mercado, make: (L) => E.msg(E.transferEmbed(L, tr)), label: `Fichaje · ${tr.name}`, mark });
      else mark();
    }

    let n = 0;
    if (jobs.length) {
      const L = build(await loadLeague());
      for (const j of jobs) {
        if (n >= MAX_SENDS && j.first !== false) break; // el resto sale en la próxima revisión
        let payload = null;
        try { payload = j.make(L); } catch (e) { log.unshift({ at: now, ok: false, txt: `${j.label} — no se pudo armar el mensaje (${e.message})` }); }
        if (payload) { await post(j.ch, payload, log, j.label); n++; }
        j.mark(); // si Discord da error, igual se marca para no reintentar cada 10 minutos (queda en el registro)
      }
    }

    // limpieza
    for (const [k, at] of Object.entries(state.sent)) if (now - at > 21 * 24 * H) delete state.sent[k];
    state.draws = state.draws.slice(-300); state.transfers = state.transfers.slice(-300);
    const fullLog = [...log, ...state.log].slice(0, 60);
    await stRef.set({ ...state, log: fullLog, lockAt: 0, lastRun: now, lastSent: n, pending: Math.max(0, jobs.length - n), lastError: "" });
    return { sent: n, pending: Math.max(0, jobs.length - n), log };
  } catch (e) {
    await stRef.set({ lockAt: 0, lastRun: now, lastError: String(e.message || e).slice(0, 300) }, { merge: true });
    throw e;
  }
}
