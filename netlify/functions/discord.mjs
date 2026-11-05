// ONYX Bot · comandos de Discord.
// Discord manda cada comando a esta dirección (Interactions Endpoint URL): https://TU-SITIO/api/discord
// No hace falta tener una compu prendida: Netlify responde cada vez que alguien usa un comando.
import { verifyDiscord, env, api, hasPerm, PERM, sendMessage } from "../lib/discord.mjs";
import { loadLeague } from "../lib/fsrest.mjs";
import { build, findPlayer } from "../lib/league.mjs";
import * as E from "../lib/embeds.mjs";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const reply = (data) => json({ type: 4, data });
const ephemeral = (content) => reply({ content, flags: 64, allowed_mentions: { parse: [] } });

// Los datos de la liga se guardan unos segundos para responder rápido.
let cache = null;
async function league(maxAge = 20000) {
  if (cache && Date.now() - cache.at < maxAge) return cache.L;
  const L = build(await loadLeague());
  cache = { at: Date.now(), L };
  return L;
}

const opt = (data, name) => ((data.options || []).find((o) => o.name === name) || {}).value;
const userName = (i) => { const u = (i.member && i.member.user) || i.user || {}; return (i.member && i.member.nick) || u.global_name || u.username || "alguien"; };

async function command(i) {
  const d = i.data, name = d.name;
  if (name === "anuncio") return announce(i);
  if (name === "rol") return roleCmd(i);
  const L = await league();
  if (name === "tabla") return E.msg(E.tableEmbed(L));
  if (name === "proximos") return E.msg(E.nextEmbed(L));
  if (name === "resultados") return E.msg(E.resultsEmbed(L, opt(d, "fecha")));
  if (name === "premios") return E.msg(E.awardsEmbed(L));
  if (name === "mercado") return E.msg(E.marketEmbed(L));
  if (name === "ayuda") return E.msg(E.helpEmbed(L));
  if (name === "ranking") return E.msg(E.rankingEmbed(L, opt(d, "estadistica") || "k"));
  if (name === "equipo" || name === "mapas") {
    const k = findTeam(L, opt(d, "equipo"));
    if (!k) return { content: "No conozco ese equipo. Empezá a escribir el nombre y elegilo de la lista.", flags: 64 };
    return E.msg(name === "equipo" ? E.teamEmbed(L, k) : E.mapsEmbed(L, k));
  }
  if (name === "jugador") {
    const q = String(opt(d, "nombre") || "").trim(), p = q && findPlayer(L, q);
    if (!p) return { content: `No encontré a ningún jugador que se llame "${q}". Probá escribir las primeras letras y elegilo de la lista.`, flags: 64, allowed_mentions: { parse: [] } };
    return E.msg(E.playerEmbed(L, p));
  }
  return { content: "No conozco ese comando. Probá con /ayuda.", flags: 64 };
}

// /anuncio · publica un anuncio con el formato de la liga.
async function announce(i) {
  if (!hasPerm(i.member, PERM.MANAGE_GUILD)) return { content: "Solo los admins del servidor pueden publicar anuncios.", flags: 64 };
  const d = i.data, ch = opt(d, "canal") || i.channel_id || (i.channel && i.channel.id), role = opt(d, "mencionar");
  const everyone = role && role === i.guild_id;
  const payload = {
    content: role ? (everyone ? "@everyone" : `<@&${role}>`) : undefined,
    allowed_mentions: role ? (everyone ? { parse: ["everyone"] } : { parse: [], roles: [role] }) : { parse: [] },
    embeds: [{ ...E.announceEmbed({ title: opt(d, "titulo"), text: opt(d, "mensaje") }), footer: { text: `Anuncio de ${userName(i)} · ONYX Bot` } }],
  };
  try { await sendMessage(ch, payload); return { content: `✅ Anuncio publicado en <#${ch}>.`, flags: 64 }; }
  catch (e) { return { content: `❌ No pude publicarlo: ${e.message}`, flags: 64 }; }
}

// /rol · da o quita un rol respetando la jerarquía de roles de quien lo pide.
async function roleCmd(i) {
  if (!hasPerm(i.member, PERM.MANAGE_ROLES)) return { content: "Solo los admins del servidor pueden dar o quitar roles.", flags: 64 };
  const d = i.data, act = opt(d, "accion"), uid = opt(d, "usuario"), rid = opt(d, "rol");
  const role = ((d.resolved || {}).roles || {})[rid] || {};
  if (rid === i.guild_id) return { content: "El rol @everyone no se puede dar ni quitar.", flags: 64 };
  if (role.managed) return { content: "Ese rol es de una integración o de otro bot: Discord no deja asignarlo a mano.", flags: 64 };
  try {
    const isAdmin = (BigInt(i.member.permissions || 0) & PERM.ADMIN) === PERM.ADMIN;
    if (!isAdmin) {
      const roles = await api("GET", `/guilds/${i.guild_id}/roles`);
      const pos = Object.fromEntries(roles.map((r) => [r.id, r.position]));
      const top = Math.max(0, ...(i.member.roles || []).map((r) => pos[r] || 0));
      if ((pos[rid] || 0) >= top) return { content: "No podés manejar un rol que está igual o más arriba que tu rol más alto.", flags: 64 };
    }
    const reason = `ONYX Bot · /rol por ${userName(i)}`;
    await api(act === "remove" ? "DELETE" : "PUT", `/guilds/${i.guild_id}/members/${uid}/roles/${rid}`, undefined, reason);
    return { content: act === "remove" ? `✅ Le saqué el rol <@&${rid}> a <@${uid}>.` : `✅ Le di el rol <@&${rid}> a <@${uid}>.`, flags: 64, allowed_mentions: { parse: [] } };
  } catch (e) { return { content: `❌ ${e.message}`, flags: 64 }; }
}

const plain = (x) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
// Acepta la clave del equipo o su nombre (por si escriben sin elegir de la lista).
function findTeam(L, q) {
  if (q && L.teams[q]) return q;
  const n = plain(q).replace(/[^a-z0-9]/g, ""); if (!n) return null;
  const nm = (k) => plain(L.teams[k].name).replace(/[^a-z0-9]/g, "");
  return L.keys.find((k) => nm(k) === n) || L.keys.find((k) => nm(k).startsWith(n)) || null;
}

// Autocompletar jugadores (/jugador) y equipos (/equipo y /mapas).
async function autocomplete(i) {
  const L = await league(60000);
  const focused = (i.data.options || []).find((o) => o.focused) || {};
  const q = plain(focused.value);
  if (focused.name === "equipo") {
    const teams = L.keys.filter((k) => !q || plain(L.teams[k].name).includes(q)).slice(0, 25).map((k) => ({ name: L.teams[k].name, value: k }));
    return json({ type: 8, data: { choices: teams } });
  }
  const list = L.P.filter((p) => !q || plain(p.name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, "es")).slice(0, 25)
    .map((p) => ({ name: `${p.name} · ${p.team ? L.teams[p.team].name : "Agente libre"} · ${p.role}`.slice(0, 100), value: p.id }));
  return json({ type: 8, data: { choices: list } });
}

// Si los datos tardan más de lo que Discord espera (3 s), responde "pensando…" y edita el mensaje cuando estén.
async function withDeadline(i, work, context) {
  const TIMEOUT = Symbol("t");
  const p = work().catch((e) => ({ content: `❌ No pude leer los datos de la liga: ${e.message}`, flags: 64 }));
  const first = await Promise.race([p, new Promise((ok) => setTimeout(() => ok(TIMEOUT), 2300))]);
  if (first !== TIMEOUT) return reply(first);
  if (context && typeof context.waitUntil === "function") {
    const { appId } = env();
    context.waitUntil(p.then((data) => fetch(`https://discord.com/api/v10/webhooks/${appId}/${i.token}/messages/@original`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(data) })));
    return json({ type: 5 });
  }
  return reply(await p);
}

export default async (req, context) => {
  if (req.method === "GET") return json({ bot: "ONYX Bot", ok: true, configurado: !!(env().publicKey && env().token) });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const { publicKey } = env();
  const body = await req.text();
  const ok = verifyDiscord(publicKey, req.headers.get("x-signature-ed25519"), req.headers.get("x-signature-timestamp"), body);
  if (!ok) return new Response("Firma inválida", { status: 401 });
  let i; try { i = JSON.parse(body); } catch (_) { return new Response("JSON inválido", { status: 400 }); }

  if (i.type === 1) return json({ type: 1 }); // PING de Discord
  if (i.type === 4) { try { return await autocomplete(i); } catch (_) { return json({ type: 8, data: { choices: [] } }); } }
  if (i.type === 2) return withDeadline(i, () => command(i), context);
  return json({ type: 4, data: { content: "Esto todavía no lo sé hacer.", flags: 64 } });
};

export const config = { path: "/api/discord" };
