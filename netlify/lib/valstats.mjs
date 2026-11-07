// Estadísticas de rankeds de cada jugador (rango, RR, pico, K/D, HS%, ADR, ACS, % de victorias, agentes),
// a partir de su Riot ID (Nombre#TAG). Fuente: API no oficial de HenrikDev (api.henrikdev.xyz), que usa el
// historial público de Riot. Necesita HENRIKDEV_API_KEY en Netlify (clave gratis en api.henrikdev.xyz/dashboard).
// Se guarda en valstats/{idDelJugador} (va en el resumen público) y se actualiza sola cada hora.
const BASE = "https://api.henrikdev.xyz/valorant";
export const vsConfigured = () => !!process.env.HENRIKDEV_API_KEY;
export const splitRiot = (s) => { const m = /^\s*([^#]{3,16}?)\s*#\s*([A-Za-z0-9]{2,5})\s*$/.exec(String(s || "")); return m ? { name: m[1], tag: m[2] } : null; };
const AFF = { latam: "latam", br: "br", na: "na", eu: "eu", ap: "ap", kr: "kr" };
export class VsError extends Error { constructor(msg, status = 502, code = "") { super(msg); this.status = status; this.code = code; } }

async function call(path, fetchImpl) {
  let r;
  try { r = await fetchImpl(BASE + path, { headers: { Authorization: process.env.HENRIKDEV_API_KEY, accept: "application/json" } }); }
  catch (_) { throw new VsError("No se pudo conectar con el servicio de estadísticas.", 503, "net"); }
  const body = await r.json().catch(() => null);
  if (r.status === 429) throw new VsError("Se pidieron muchas estadísticas seguidas. Se reintenta solo en un rato.", 429, "rate");
  if (r.status === 401 || r.status === 403) throw new VsError("La clave de estadísticas (HENRIKDEV_API_KEY) no funciona.", 502, "key");
  if (r.status === 404) throw new VsError("No se encontró esa cuenta de Riot. Revisá el Riot ID (Nombre#TAG).", 404, "notfound");
  if (!r.ok || !body) throw new VsError("El servicio de estadísticas no respondió bien. Se reintenta solo.", 502, "bad");
  return body.data;
}
const num = (v) => (Number.isFinite(+v) ? +v : 0);
const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;

// Resume las últimas rankeds del jugador
export function summarizeMatches(list) {
  const ms = (Array.isArray(list) ? list : []).filter((m) => m && m.stats);
  let k = 0, d = 0, a = 0, score = 0, rounds = 0, dmg = 0, hs = 0, shots = 0, wins = 0, decided = 0;
  const agents = {}, maps = {};
  for (const m of ms) {
    const s = m.stats, t = m.teams || {}, red = num(t.red), blue = num(t.blue), rr = red + blue;
    k += num(s.kills); d += num(s.deaths); a += num(s.assists); score += num(s.score); rounds += rr; dmg += num(s.damage && s.damage.made);
    const sh = s.shots || {}; hs += num(sh.head); shots += num(sh.head) + num(sh.body) + num(sh.leg);
    const side = String(s.team || "").toLowerCase();
    if ((side === "red" || side === "blue") && red !== blue) { decided++; if ((side === "red") === (red > blue)) wins++; }
    const ag = s.character && s.character.name; if (ag) agents[ag] = (agents[ag] || 0) + 1;
    const mp = m.meta && m.meta.map && m.meta.map.name; if (mp) maps[mp] = (maps[mp] || 0) + 1;
  }
  const top = (o) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([n, c]) => ({ n, c }));
  const last = ms.map((m) => Date.parse(m.meta && m.meta.started_at) || 0).sort((x, y) => y - x)[0] || null;
  return {
    games: ms.length, wins, winPct: decided ? Math.round((wins / decided) * 100) : null,
    k, d, a, kd: d ? r2(k / d) : r2(k), kda: d ? r2((k + a) / d) : r2(k + a),
    acs: rounds ? Math.round(score / rounds) : null, adr: rounds ? Math.round(dmg / rounds) : null,
    hs: shots ? r1((hs / shots) * 100) : null, kpr: rounds ? r2(k / rounds) : null,
    agents: top(agents), maps: top(maps), lastGame: last,
  };
}

// Trae todo de un jugador: cuenta (región), rango y últimas rankeds. 3 pedidos.
export async function fetchValStats(ign, { fetchImpl = fetch, prev = null, now = Date.now() } = {}) {
  if (!vsConfigured()) throw new VsError("Las estadísticas automáticas no están activadas (falta HENRIKDEV_API_KEY).", 501, "nokey");
  const id = splitRiot(ign); if (!id) throw new VsError("El Riot ID no es válido (Nombre#TAG).", 400, "badid");
  const n = encodeURIComponent(id.name), t = encodeURIComponent(id.tag);
  let region = prev && prev.ign === `${id.name}#${id.tag}` && AFF[prev.region] ? prev.region : null, level = prev ? prev.level : null, card = prev ? prev.card : null;
  if (!region) { const acc = await call(`/v2/account/${n}/${t}`, fetchImpl); region = AFF[String(acc.region || "").toLowerCase()] || "latam"; level = acc.account_level ?? null; card = acc.card || null; }
  const mmr = await call(`/v3/mmr/${region}/pc/${n}/${t}`, fetchImpl).catch((e) => { if (e.code === "notfound") return null; throw e; });
  const sm = await call(`/v1/stored-matches/${region}/${n}/${t}?mode=competitive&size=20`, fetchImpl).catch((e) => { if (e.code === "notfound") return []; throw e; });
  const cur = (mmr && mmr.current) || {}, peak = (mmr && mmr.peak) || null, season = mmr && Array.isArray(mmr.seasonal) && mmr.seasonal.length ? mmr.seasonal[mmr.seasonal.length - 1] : null;
  return {
    ign: `${id.name}#${id.tag}`, region, level, card: typeof card === "string" ? card.slice(0, 60) : null,
    rank: cur.tier && cur.tier.name && cur.tier.name !== "Unrated" ? cur.tier.name : null, tierId: (cur.tier && cur.tier.id) || 0, rr: cur.rr ?? null, elo: cur.elo ?? null, lastChange: cur.last_change ?? null,
    peak: peak && peak.tier ? { rank: peak.tier.name, season: (peak.season && peak.season.short) || "" } : null,
    season: season ? { short: (season.season && season.season.short) || "", wins: season.wins || 0, games: season.games || 0 } : null,
    recent: summarizeMatches(sm), at: now, ok: true,
  };
}

// Quién toca actualizar: los que nunca se actualizaron o los más viejos; los que dieron error esperan más
export function pickDue(players, stats, { now = Date.now(), max = 10, every = 60 * 60e3 } = {}) {
  return Object.entries(players || {}).filter(([, p]) => p && splitRiot(p.ign)).map(([pid, p]) => {
    const s = (stats || {})[pid], ign = splitRiot(p.ign), same = s && s.ign === `${ign.name}#${ign.tag}`;
    const wait = !s || !same ? 0 : s.ok ? every : s.code === "notfound" ? 12 * every : 2 * every;
    return { pid, ign: p.ign, due: (!same ? 0 : (s.at || 0)) + wait, prev: same ? s : null };
  }).filter((x) => x.due <= now).sort((a, b) => a.due - b.due).slice(0, max);
}

// Actualiza varios jugadores (de a 3 en paralelo). Si la API corta por límite, para y sigue en la próxima vuelta.
export async function refreshMany(db, due, { fetchImpl = fetch, now = Date.now() } = {}) {
  const paths = [], res = { ok: 0, err: 0, stopped: false };
  for (let i = 0; i < due.length && !res.stopped; i += 3) {
    await Promise.all(due.slice(i, i + 3).map(async (x) => {
      try { const v = await fetchValStats(x.ign, { fetchImpl, prev: x.prev, now }); await db.doc(`valstats/${x.pid}`).set(v); paths.push(`valstats/${x.pid}`); res.ok++; }
      catch (e) {
        if (e.code === "rate" || e.code === "key" || e.code === "nokey") { res.stopped = e.code; return; }
        const id = splitRiot(x.ign), keep = x.prev && x.prev.ok ? x.prev : {};
        await db.doc(`valstats/${x.pid}`).set({ ...keep, ign: id ? `${id.name}#${id.tag}` : String(x.ign), ok: !!keep.ok, code: e.code || "bad", error: String(e.message || "").slice(0, 160), at: now, tried: now });
        paths.push(`valstats/${x.pid}`); res.err++;
      }
    }));
  }
  return { ...res, paths };
}
