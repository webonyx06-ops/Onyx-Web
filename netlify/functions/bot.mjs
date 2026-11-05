// ONYX Bot · API del panel admin. Ruta: /api/bot (POST, JSON)
// Solo la pueden usar las cuentas de ultra staff listadas en BOT_ADMINS (por defecto ultra1 y ultra2).
import { initAdmin } from "../lib/admin.mjs";
import { env, configured, api, registerCommands, sendMessage, COMMANDS } from "../lib/discord.mjs";
import { loadLeagueFresh as loadLeague, listColl } from "../lib/fsrest.mjs"; // el panel siempre lee lo último cargado
import { build, teamListFrom } from "../lib/league.mjs";
import * as E from "../lib/embeds.mjs";
import { normConfig, detect, runTick, sendMatchNow, TEAM_KINDS, mapHash, newPicks, isNewPick, mapRole, syncPickedMaps, seriesOf } from "../lib/notify.mjs";

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const BOT_ADMINS = () => (process.env.BOT_ADMINS || "ultra1,ultra2").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const sid = (v) => (/^\d{5,25}$/.test(String(v || "")) ? String(v) : "");

async function caller(req, admin) {
  const h = req.headers.get("authorization") || "";
  if (!h.startsWith("Bearer ")) return null;
  const dec = await admin.auth().verifyIdToken(h.slice(7));
  const snap = await admin.firestore().doc(`staff/${dec.uid}`).get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (d.active === false || d.role !== "ultra" || !BOT_ADMINS().includes(String(d.u).toLowerCase())) return null;
  return { uid: dec.uid, ...d };
}
const audit = (db, by, txt) => db.collection("audit").add({ at: Date.now(), uid: by.uid, u: by.u, role: by.role, txt: `ONYX Bot · ${String(txt).slice(0, 380)}` });
const getCfg = async (db) => { const s = await db.doc("bot/config").get(); return normConfig(s.exists ? s.data() : null); };

async function guildData() {
  const { guildId } = env();
  const [channels, roles] = await Promise.all([api("GET", `/guilds/${guildId}/channels`), api("GET", `/guilds/${guildId}/roles`)]);
  return { channels, roles };
}

async function status(db) {
  const e = env();
  const out = { env: { DISCORD_BOT_TOKEN: !!e.token, DISCORD_PUBLIC_KEY: !!e.publicKey, DISCORD_APP_ID: !!e.appId, DISCORD_GUILD_ID: !!e.guildId }, endpoint: `${e.site}/api/discord`, site: e.site };
  out.invite = e.appId ? `https://discord.com/oauth2/authorize?client_id=${e.appId}&permissions=8&scope=bot%20applications.commands${e.guildId ? `&guild_id=${e.guildId}&disable_guild_select=true` : ""}` : "";
  const [cfgSnap, stSnap] = await Promise.all([db.doc("bot/config").get(), db.doc("bot/state").get()]);
  out.config = normConfig(cfgSnap.exists ? cfgSnap.data() : null);
  out.configSaved = cfgSnap.exists;
  const st = stSnap.exists ? stSnap.data() : {};
  out.state = { lastRun: st.lastRun || 0, lastError: st.lastError || "", lastSent: st.lastSent || 0, pending: st.pending || 0, init: !!st.init, log: (st.log || []).slice(0, 40) };
  out.ready = configured();
  if (!out.ready) return out;
  const errors = [];
  const safe = async (f) => { try { return await f(); } catch (er) { if (!errors.includes(er.message)) errors.push(er.message); return null; } };
  const [me, guild, channels, roles, cmds] = await Promise.all([
    safe(() => api("GET", "/users/@me")),
    safe(() => api("GET", `/guilds/${e.guildId}?with_counts=true`)),
    safe(() => api("GET", `/guilds/${e.guildId}/channels`)),
    safe(() => api("GET", `/guilds/${e.guildId}/roles`)),
    safe(() => api("GET", `/applications/${e.appId}/guilds/${e.guildId}/commands`)),
  ]);
  const arr = (x) => (Array.isArray(x) ? x : []);
  out.bot = me && { id: me.id, name: me.global_name || me.username, username: me.username, avatar: me.avatar };
  out.guild = guild && { id: guild.id, name: guild.name, icon: guild.icon, members: guild.approximate_member_count || 0, online: guild.approximate_presence_count || 0 };
  out.channels = arr(channels).map((c) => ({ id: c.id, name: c.name, type: c.type, parent: c.parent_id || "", position: c.position || 0 }));
  out.roles = arr(roles).filter((r) => r.id !== e.guildId).sort((a, b) => b.position - a.position)
    .map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position, managed: !!r.managed }));
  out.everyone = e.guildId;
  out.commands = arr(cmds).length; out.commandsTotal = COMMANDS.length;
  if (me && Array.isArray(roles)) {
    const mem = await safe(() => api("GET", `/guilds/${e.guildId}/members/${me.id}`));
    if (mem) {
      const byId = Object.fromEntries(roles.map((r) => [r.id, r]));
      const mine = (mem.roles || []).map((id) => byId[id]).filter(Boolean).sort((a, b) => b.position - a.position);
      out.botTop = mine.length ? mine[0].position : 0;
      out.botRole = mine.length ? mine[0].name : "";
      out.botAdmin = mine.some((r) => (BigInt(r.permissions || 0) & 8n) === 8n);
    }
  }
  out.errors = errors;
  return out;
}

function mentionFor(mention, everyoneId, teamRole) {
  if (!mention || mention === "none") return { content: undefined, allowed_mentions: { parse: [] } };
  if (mention === "everyone" || mention === everyoneId) return { content: "@everyone", allowed_mentions: { parse: ["everyone"] } };
  if (mention === "here") return { content: "@here", allowed_mentions: { parse: ["everyone"] } };
  const rid = mention === "team" ? teamRole : sid(mention);
  return rid ? { content: `<@&${rid}>`, allowed_mentions: { parse: [], roles: [rid] } } : { content: undefined, allowed_mentions: { parse: [] } };
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Usá POST." });
  let admin;
  try { admin = initAdmin(); } catch (e) { return json(500, { error: e.message }); }
  const db = admin.firestore();
  let me;
  try { me = await caller(req, admin); } catch (_) { me = null; }
  if (!me) return json(403, { error: `Solo ${BOT_ADMINS().join(" y ")} pueden manejar ONYX Bot.` });
  let b; try { b = await req.json(); } catch (_) { return json(400, { error: "Pedido inválido." }); }
  const act = b.action, e = env();

  try {
    if (act === "status") return json(200, await status(db));
    if (!configured()) return json(400, { error: "Primero cargá las variables de Discord en Netlify (mirá la lista de pasos)." });

    if (act === "save") {
      const cfg = normConfig(b.config);
      await db.doc("bot/config").set(cfg);
      await audit(db, me, `guardó la configuración (avisos automáticos ${cfg.enabled ? "activados" : "apagados"})`);
      return json(200, { ok: true, config: cfg });
    }
    if (act === "detect") {
      const [{ channels, roles }, rawTeams] = await Promise.all([guildData(), listColl("teams").catch(() => ({}))]);
      return json(200, detect(channels, roles, e.guildId, teamListFrom(rawTeams)));
    }
    if (act === "register") {
      const list = await registerCommands();
      await audit(db, me, `registró ${list.length} comandos en Discord`);
      return json(200, { ok: true, count: list.length });
    }
    if (act === "test") {
      const ch = sid(b.channel); if (!ch) return json(400, { error: "Elegí un canal." });
      await sendMessage(ch, { embeds: [{ title: "✅ ONYX Bot conectado", description: `Mensaje de prueba enviado desde el panel por **${me.u}**.\nUsá \`/ayuda\` para ver los comandos.`, color: E.ONYX_COLOR, footer: { text: "ONYX Bot" } }], allowed_mentions: { parse: [] } });
      return json(200, { ok: true });
    }
    if (act === "tick") {
      const r = await runTick(db);
      try { r.mapas = await syncPickedMaps(db); } catch (_) { /* sigue */ }
      return json(200, r);
    }
    if (act === "announce") {
      const title = String(b.title || "").trim(), text = String(b.text || "").trim();
      if (!title && !text) return json(400, { error: "Escribí un título o un texto." });
      const image = /^https:\/\/\S+$/i.test(String(b.image || "")) ? String(b.image) : "";
      const color = /^#?[0-9a-f]{6}$/i.test(String(b.color || "")) ? parseInt(String(b.color).replace("#", ""), 16) : E.ONYX_COLOR;
      const embed = { ...E.announceEmbed({ title, text, color, image }), footer: { text: `Anuncio de ${me.u} · ONYX Bot` } };
      if (!title) delete embed.title;
      const targets = [];
      if (String(b.to || "").startsWith("teams:")) {
        const kind = b.to.slice(6), cfg = await getCfg(db);
        if (!TEAM_KINDS.some(([k]) => k === kind)) return json(400, { error: "Destino inválido." });
        Object.entries(cfg.teams).forEach(([k, t]) => { if (t[kind]) targets.push({ ch: t[kind], m: mentionFor(b.mention, e.guildId, t.role), k }); });
        if (!targets.length) return json(400, { error: "Todavía no elegiste los canales de los equipos." });
      } else {
        const ch = sid(b.to); if (!ch) return json(400, { error: "Elegí un canal." });
        targets.push({ ch, m: mentionFor(b.mention === "team" ? "none" : b.mention, e.guildId) });
      }
      const errors = []; let sent = 0;
      for (const t of targets) {
        try { await sendMessage(t.ch, { content: t.m.content, allowed_mentions: t.m.allowed_mentions, embeds: [embed] }); sent++; }
        catch (er) { errors.push(`${t.k ? t.k.toUpperCase() + ": " : ""}${er.message}`); }
      }
      if (sent) await audit(db, me, `publicó el anuncio "${title || text.slice(0, 60)}" en ${String(b.label || "Discord").slice(0, 80)}`);
      return json(sent ? 200 : 400, { ok: !!sent, sent, errors, error: sent ? undefined : errors[0] });
    }
    if (act === "post") {
      const ch = sid(b.channel); if (!ch) return json(400, { error: "Elegí un canal." });
      const L = build(await loadLeague());
      const make = { table: E.tableEmbed, next: E.nextEmbed, results: E.resultsEmbed, awards: E.awardsEmbed, market: E.marketEmbed }[b.what];
      if (!make) return json(400, { error: "No sé qué publicar." });
      await sendMessage(ch, E.msg(make(L)));
      await audit(db, me, `publicó ${{ table: "la tabla", next: "los próximos partidos", results: "los resultados", awards: "los premios", market: "el mercado" }[b.what]} en ${String(b.label || "Discord").slice(0, 80)}`);
      return json(200, { ok: true });
    }
    if (act === "notify") {
      const cfg = await getCfg(db), L = build(await loadLeague());
      const m = L.ms.find((x) => x.id === b.matchId); if (!m) return json(400, { error: "No encontré ese partido." });
      const kinds = (Array.isArray(b.kinds) ? b.kinds : []).filter((k) => TEAM_KINDS.some(([x]) => x === k));
      if (!kinds.length) return json(400, { error: "Elegí al menos un canal." });
      const log = await sendMatchNow(cfg, L, m, kinds);
      const okN = log.filter((x) => x.ok).length;
      if (okN) await audit(db, me, `mandó a mano los avisos de F${m.fecha} ${L.teams[m.a].name} vs ${L.teams[m.b].name}${m.legs === 2 ? " (ida y vuelta)" : ""} (${kinds.join(", ")})`);
      const st = db.doc("bot/state"), cur = (await st.get()).data() || {};
      await st.set({ log: [...log, ...(cur.log || [])].slice(0, 60) }, { merge: true });
      return json(200, { ok: okN > 0, sent: okN, log });
    }
    if (act === "askMaps") {
      const f = +b.fecha; if (!Number.isInteger(f) || f < 1) return json(400, { error: "Elegí una fecha." });
      const cur = await getCfg(db);
      Object.entries(b.channels || {}).forEach(([k, ch]) => { if (/^[a-z0-9]{2,20}$/.test(k)) { cur.teams[k] = cur.teams[k] || {}; cur.teams[k].mapas = sid(ch); } });
      cur.mapAsk = { ...(cur.mapAsk || {}), mention: b.mention };
      const cfg = normConfig(cur); await db.doc("bot/config").set(cfg);
      const L = build(await loadLeague()), ms = L.ms.filter((m) => m.fecha === f);
      if (!ms.some((m) => m.status !== "played")) return json(400, { error: `La fecha ${f} no tiene partidos pendientes.` });
      const done = new Set(); // equipos que ya eligieron su partida de esa fecha
      if (b.onlyMissing) (await db.collection("mappicks").where("fecha", "==", f).get()).docs.forEach((d) => { const x = d.data(); if (x && x.team && isNewPick(d.id)) done.add(x.team); });
      const log = [], now = Date.now(); let sent = 0, skipped = 0;
      for (const s of seriesOf(ms).filter((x) => x.games.some((g) => g.status !== "played"))) for (const k of [s.a, s.b]) {
        if (done.has(k)) { skipped++; continue; }
        const t = cfg.teams[k] || {}, ch = t.mapas || t.info, name = L.teams[k].name;
        if (!ch) { log.unshift({ at: now, ok: false, txt: `${name}: no hay canal elegido para el pedido de mapa` }); continue; }
        try { await sendMessage(ch, E.mapAskMsg(L, s, k, mapRole(cfg, k))); sent++; log.unshift({ at: now, ok: true, txt: `${name} · pedido de mapa · F${f}` }); }
        catch (er) { log.unshift({ at: now, ok: false, txt: `${name} · pedido de mapa — ${er.message}` }); }
      }
      const st = db.doc("bot/state"), sd = (await st.get()).data() || {};
      await st.set({ log: [...log, ...(sd.log || [])].slice(0, 60) }, { merge: true });
      if (sent) await audit(db, me, `pidió el mapa de la fecha ${f} a ${sent} equipo${sent > 1 ? "s" : ""}${b.onlyMissing ? " (solo a los que faltaban)" : ""}`);
      return json(200, { ok: sent > 0, sent, skipped, log, config: cfg });
    }
    if (act === "sendMaps") {
      const f = +b.fecha; if (!Number.isInteger(f) || f < 1) return json(400, { error: "Elegí una fecha." });
      const cfg = await getCfg(db), L = build(await loadLeague()), ms = L.ms.filter((m) => m.fecha === f); // todo el cruce, aunque la ida ya se haya jugado
      const picks = newPicks(await db.collection("mappicks").where("fecha", "==", f).get());
      const st = db.doc("bot/state"), sd = (await st.get()).data() || {}, mapsSent = sd.mapsSent || {};
      const log = [], now = Date.now(); let sent = 0, matches = 0;
      for (const s of seriesOf(ms)) {
        if (!s.games.some((g) => picks[g.id]) || s.games.every((g) => g.status === "played")) continue;
        const h = mapHash(s, picks), changed = !!mapsSent[s.key] && mapsSent[s.key] !== h; let any = false;
        for (const k of [s.a, s.b]) {
          const t = cfg.teams[k] || {}, ch = t.mapas || t.info, name = L.teams[k].name;
          if (!ch) { log.unshift({ at: now, ok: false, txt: `${name}: no hay canal para avisar los mapas` }); continue; }
          try { await sendMessage(ch, E.mapResultMsg(L, s, k, picks, mapRole(cfg, k), changed)); sent++; any = true; log.unshift({ at: now, ok: true, txt: `${name} · mapas de la fecha · F${f}` }); }
          catch (er) { log.unshift({ at: now, ok: false, txt: `${name} · mapas de la fecha — ${er.message}` }); }
        }
        if (any) { mapsSent[s.key] = h; matches++; }
      }
      await st.set({ mapsSent, log: [...log, ...(sd.log || [])].slice(0, 60) }, { merge: true });
      if (sent) await syncPickedMaps(db).catch(() => null); // los mapas avisados quedan descartados para cada equipo
      if (sent) await audit(db, me, `mandó los mapas elegidos de la fecha ${f} a los equipos (${matches} cruce${matches > 1 ? "s" : ""})`);
      return json(sent ? 200 : 400, { ok: sent > 0, sent, matches, log, error: sent ? undefined : (log[0] ? log[0].txt : "Todavía ningún capitán eligió mapa en esa fecha.") });
    }
    if (act === "members") {
      const q = String(b.q || "").trim().slice(0, 40); if (!q) return json(400, { error: "Escribí un nombre." });
      const list = await api("GET", `/guilds/${e.guildId}/members/search?query=${encodeURIComponent(q)}&limit=12`);
      return json(200, { members: list.map((m) => ({ id: m.user.id, name: m.nick || m.user.global_name || m.user.username, username: m.user.username, avatar: m.user.avatar, roles: m.roles, bot: !!m.user.bot })) });
    }
    if (act === "role") {
      const user = sid(b.user), role = sid(b.role), op = b.op === "remove" ? "remove" : "add";
      if (!user || !role) return json(400, { error: "Elegí la persona y el rol." });
      if (role === e.guildId) return json(400, { error: "El rol @everyone no se puede dar ni quitar." });
      await api(op === "remove" ? "DELETE" : "PUT", `/guilds/${e.guildId}/members/${user}/roles/${role}`, undefined, `ONYX Bot · panel web (${me.u})`);
      await audit(db, me, `${op === "remove" ? "le sacó" : "le dio"} el rol ${String(b.roleName || role).slice(0, 60)} a ${String(b.userName || user).slice(0, 60)}`);
      const m = await api("GET", `/guilds/${e.guildId}/members/${user}`);
      return json(200, { ok: true, roles: m.roles });
    }
    return json(400, { error: "Acción desconocida." });
  } catch (er) {
    return json(400, { error: er.message || "No se pudo completar." });
  }
};

export const config = { path: "/api/bot" };
