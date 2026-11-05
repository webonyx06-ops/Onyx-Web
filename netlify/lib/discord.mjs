// Conexión con Discord: verificación de firmas, API REST y definición de comandos de ONYX Bot.
import { createPublicKey, verify } from "node:crypto";

export const API = "https://discord.com/api/v10";
export const env = () => ({
  token: process.env.DISCORD_BOT_TOKEN || "",
  publicKey: process.env.DISCORD_PUBLIC_KEY || "",
  appId: process.env.DISCORD_APP_ID || "",
  guildId: process.env.DISCORD_GUILD_ID || "",
  site: (process.env.SITE_URL || process.env.URL || "https://onyxt1.netlify.app").replace(/\/$/, ""),
});
export const configured = () => { const e = env(); return !!(e.token && e.publicKey && e.appId && e.guildId); };

// Firma Ed25519 que Discord manda en cada interacción.
let keyCache = null;
export function verifyDiscord(publicKeyHex, signatureHex, timestamp, body) {
  try {
    if (!publicKeyHex || !signatureHex || !timestamp) return false;
    if (!keyCache || keyCache.hex !== publicKeyHex) {
      const x = Buffer.from(publicKeyHex, "hex").toString("base64url");
      keyCache = { hex: publicKeyHex, key: createPublicKey({ key: { kty: "OKP", crv: "Ed25519", x }, format: "jwk" }) };
    }
    return verify(null, Buffer.from(timestamp + body), keyCache.key, Buffer.from(signatureHex, "hex"));
  } catch (_) { return false; }
}

export class DiscordError extends Error {
  constructor(status, body) {
    super(DiscordError.explain(status, body)); this.status = status; this.body = body;
  }
  static explain(status, b) {
    const code = b && b.code;
    if (code === 50013) return "Discord no le dio permiso a ONYX Bot. Revisá que tenga el permiso necesario y que su rol esté más arriba que el rol que querés dar o quitar (Ajustes del servidor → Roles).";
    if (code === 50001) return "ONYX Bot no tiene acceso a ese canal. Dale permiso de ver el canal y enviar mensajes.";
    if (code === 10004) return "ONYX Bot no está en tu servidor o DISCORD_GUILD_ID está mal. Invitalo con el link del panel.";
    if (code === 10003) return "No encontré ese canal.";
    if (code === 10011) return "No encontré ese rol.";
    if (code === 10007 || code === 10013) return "No encontré a ese usuario en el servidor.";
    if (status === 401) return "El token del bot es inválido. Revisá DISCORD_BOT_TOKEN en Netlify.";
    if (status === 403) return "Discord rechazó el pedido por falta de permisos.";
    if (status === 429) return "Discord está limitando los pedidos. Esperá unos segundos.";
    return `Discord respondió ${status}${b && b.message ? ": " + b.message : ""}`;
  }
}

export async function api(method, path, body, reason) {
  const { token } = env();
  const headers = { Authorization: `Bot ${token}`, "User-Agent": "ONYX Bot (onyx, 1.0)" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (reason) headers["X-Audit-Log-Reason"] = encodeURIComponent(String(reason).slice(0, 400));
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetch(API + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    if (r.status === 429 && attempt === 0) { const j = await r.json().catch(() => ({})); await new Promise((ok) => setTimeout(ok, Math.min(3000, (j.retry_after || 1) * 1000))); continue; }
    if (r.status === 204) return null;
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new DiscordError(r.status, j);
    return j;
  }
}

export const sendMessage = (channelId, payload) => api("POST", `/channels/${channelId}/messages`, payload);

// Permisos de Discord
export const PERM = { ADMIN: 1n << 3n, MANAGE_GUILD: 1n << 5n, MANAGE_ROLES: 1n << 28n };
export const hasPerm = (member, bit) => { try { const p = BigInt(member && member.permissions || 0); return (p & PERM.ADMIN) === PERM.ADMIN || (p & bit) === bit; } catch (_) { return false; } };

export const COMMANDS = [
  { name: "tabla", description: "Tabla de posiciones de la liga" },
  { name: "proximos", description: "Próximos partidos con día, hora y mapa" },
  { name: "resultados", description: "Resultados de una fecha", options: [{ type: 4, name: "fecha", description: "Número de fecha (si no ponés nada, la última jugada)", required: false, min_value: 1, max_value: 50 }] },
  { name: "jugador", description: "Ficha completa de un jugador", options: [{ type: 3, name: "nombre", description: "Nombre del jugador", required: true, autocomplete: true }] },
  { name: "equipo", description: "Plantel, posición y datos de un equipo", options: [{ type: 3, name: "equipo", description: "Equipo (empezá a escribir y elegilo)", required: true, autocomplete: true }] },
  { name: "ranking", description: "Top 10 de la liga", options: [{ type: 3, name: "estadistica", description: "Qué ranking querés ver", required: true, choices: [
    { name: "Kills", value: "k" }, { name: "Asistencias", value: "a" }, { name: "K/D", value: "kd" }, { name: "ACS", value: "acs" }, { name: "Puntos individuales", value: "pts" }, { name: "Asistencia a fechas", value: "att" }] }] },
  { name: "mapas", description: "Mapas que le quedan a un equipo", options: [{ type: 3, name: "equipo", description: "Equipo (empezá a escribir y elegilo)", required: true, autocomplete: true }] },
  { name: "mercado", description: "Últimos fichajes y estado de la ventana" },
  { name: "premios", description: "MVP de la temporada y destacados" },
  { name: "ayuda", description: "Qué puede hacer ONYX Bot" },
  { name: "anuncio", description: "Publicar un anuncio de la liga (solo admins)", default_member_permissions: String(PERM.MANAGE_GUILD), options: [
    { type: 3, name: "titulo", description: "Título del anuncio", required: true, max_length: 200 },
    { type: 3, name: "mensaje", description: "Texto. Usá | para hacer un salto de línea", required: true, max_length: 1800 },
    { type: 7, name: "canal", description: "Dónde publicarlo (si no elegís, en este mismo canal)", required: false, channel_types: [0, 5] },
    { type: 8, name: "mencionar", description: "Rol a mencionar", required: false }] },
  { name: "rol", description: "Dar o quitar un rol a un usuario (solo admins)", default_member_permissions: String(PERM.MANAGE_ROLES), options: [
    { type: 3, name: "accion", description: "Dar o quitar", required: true, choices: [{ name: "Dar", value: "add" }, { name: "Quitar", value: "remove" }] },
    { type: 6, name: "usuario", description: "A quién", required: true },
    { type: 8, name: "rol", description: "Qué rol", required: true }] },
];

export async function registerCommands() {
  const { appId, guildId } = env();
  return api("PUT", `/applications/${appId}/guilds/${guildId}/commands`, COMMANDS);
}
