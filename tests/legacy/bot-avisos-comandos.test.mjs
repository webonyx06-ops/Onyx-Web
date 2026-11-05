import { NOW, DB, sent, ADM, db } from "../helpers/legacy-mock.mjs";
import { generateKeyPairSync, sign } from "node:crypto";
const L_ = new URL("../../netlify/", import.meta.url).href;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FALLA:", m); } else console.log("ok ·", m); };
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const pubHex = Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url").toString("hex");
Object.assign(process.env, { DISCORD_BOT_TOKEN: "tok", DISCORD_PUBLIC_KEY: pubHex, DISCORD_APP_ID: "777", DISCORD_GUILD_ID: "g1", SITE_URL: "https://onyxt1.netlify.app" });
const N = await import(L_ + "lib/notify.mjs");

// ---------- avisos automáticos ----------
const T = (k) => ({ role: "R" + k, chat: k + "chat", info: k + "info", strats: k + "strats", partidos: k + "part" });
ADM["bot/config"] = { enabled: true, channels: { partidos: "100001", resultados: "100002", mapas: "100003", mercado: "100004", anuncios: "100005" },
  teams: Object.fromEntries(["onyx","orion","nexus","zenith","vortex","zyriax","kyrox"].map((k, i) => [k, { role: String(900000 + i), chat: String(200000 + i), info: String(300000 + i), strats: String(400000 + i), partidos: String(500000 + i) }])) };
// primera vuelta: no repite lo viejo
let r = await N.runTick(db, { now: NOW });
const posts = () => sent.filter(s => s.method === "POST" && s.path.startsWith("/channels/"));
const p1 = posts();
console.log("1ª revisión:", r.sent, "mensajes:", p1.map(p => p.path.split("/")[2]).join(","));
ok(!p1.some(p => p.path.includes("100002")), "no publica resultados viejos al activar");
// m2 nexus-orion 21:00 → 1h05 antes: 24h (chat/info/strats) y general 24h. m4 vortex-zyriax 19:40 → ya empezó: partidos "al empezar"
const ch = (id) => p1.filter(p => p.path === `/channels/${id}/messages`).length;
ok(ch("200002") === 1 && ch("300002") === 1 && ch("400002") === 1 && ch("200001") === 1, "nexus y orion: chat, info y strats");
ok(p1.length === 16 && ch("500004") === 1 && ch("500005") === 1, "vortex y zyriax: aviso de subir stats al empezar");
const infoMsg = p1.find(p => p.path === "/channels/300002/messages");
ok(infoMsg.body.content.startsWith("<@&900002>"), "info menciona al rol de NEXUS");
// segunda vuelta 10 min después: nada nuevo; tercera a 55 min antes: el de 1 h en chat
const seen = new Set(p1.map(p => p.path)); sent.length = 0; r = await N.runTick(db, { now: NOW + 4 * 60000 }); ok(r.sent === 0, "no repite en la siguiente revisión");
sent.length = 0; r = await N.runTick(db, { now: NOW + 14 * 60000 }); // 51 min antes
console.log("1 h antes →", posts().map(p => p.path.split("/")[2]).join(","));
ok(r.sent === 3 && posts().some(p => p.path === "/channels/200002/messages") && !posts().some(p => p.path === "/channels/300002/messages"), "recordatorio de 1 h en chat de los dos equipos y en el general");
sent.length = 0; r = await N.runTick(db, { now: NOW + 24 * 60000 }); ok(r.sent === 0, "no repite el de 1 h");
// cargan resultado de m2 con stats completas → resultado general + partidos de cada equipo
DB.matches.m2 = { ...DB.matches.m2, status: "played", ra: 11, rb: 13, stats: Object.fromEntries(["p2","p9","p1","p8","p0","p7","p14","p15","p16","p17"].map(p => [p, { t: ["p2","p9","p16"].includes(p) ? "nexus" : "orion", k: 10, d: 10, a: 2, acs: 200 }])) };
ADM.draws.d1 = { matchId: "m3", a: "onyx", b: "kyrox", map: "Haven", at: NOW + 30 * 60000, fecha: 2 };
ADM.transfers.t1 = { pid: "p5", name: "Santi", from: "zyriax", to: "nexus", amt: 1200, at: NOW + 30 * 60000 };
sent.length = 0; r = await N.runTick(db, { now: NOW + 40 * 60000 });
const p3 = posts().map(p => p.path.split("/")[2]);
console.log("resultado/sorteo/fichaje →", p3.join(","));
ok(p3.includes("100002") && p3.includes("500002") && p3.includes("500001"), "resultado en general y en partidos de cada equipo");
ok(p3.includes("100003") && p3.includes("300000") && p3.includes("300006"), "mapa sorteado en general y en info de ONYX y KYROX");
ok(p3.includes("100004"), "fichaje en novedades");
// corrigen el resultado
DB.matches.m2.ra = 13; DB.matches.m2.rb = 11; DB.matches.m2.ot = true;
sent.length = 0; r = await N.runTick(db, { now: NOW + 50 * 60000 });
ok(posts().length === 1 && posts()[0].body.embeds[0].author.name.startsWith("Resultado corregido"), "resultado corregido solo en el canal general");
// canal sin permisos → queda en el registro
ADM["bot/config"].channels.mercado = "666666"; ADM.transfers.t2 = { pid: "p6", name: "Mati", from: null, to: "onyx", amt: 0, at: NOW + 55 * 60000 };
await N.runTick(db, { now: NOW + 60 * 60000 });
ok(ADM["bot/state"].log.some(l => !l.ok), "error de Discord queda en el registro");
ADM["bot/config"].enabled = false; r = await N.runTick(db, { now: NOW + 70 * 60000 }); ok(!!r.skipped, "apagado no manda nada");

// ---------- comandos de Discord (firma real) ----------
const fn = (await import(L_ + "functions/discord.mjs")).default;
const call = async (obj, badSig) => {
  const body = JSON.stringify(obj), ts = String(Math.floor(Date.now() / 1000));
  const sig = sign(null, Buffer.from(ts + body), privateKey).toString("hex");
  const req = new Request("https://x/api/discord", { method: "POST", body, headers: { "x-signature-ed25519": badSig ? "00".repeat(64) : sig, "x-signature-timestamp": ts } });
  const res = await fn(req, {}); return { status: res.status, j: res.status === 200 ? await res.json() : null };
};
ok((await call({ type: 1 })).j.type === 1, "responde el PING de Discord");
ok((await call({ type: 1 }, true)).status === 401, "rechaza firmas falsas");
const member = { permissions: "0", roles: [], user: { username: "pablo" } };
for (const [name, options] of [["tabla"], ["proximos"], ["resultados", [{ name: "fecha", value: 2 }]], ["jugador", [{ name: "nombre", value: "lucho" }]], ["equipo", [{ name: "equipo", value: "nexus" }]],
  ["ranking", [{ name: "estadistica", value: "kd" }]], ["mapas", [{ name: "equipo", value: "kyrox" }]], ["mercado"], ["premios"], ["ayuda"]]) {
  const { j } = await call({ type: 2, guild_id: "g1", channel_id: "c1", member, data: { name, options } });
  ok(j.type === 4 && j.data.embeds && j.data.embeds[0].title, `/${name} → ${j.data.embeds[0].title}`);
}
const nf = await call({ type: 2, guild_id: "g1", member, data: { name: "jugador", options: [{ name: "nombre", value: "zzz" }] } });
ok(nf.j.data.flags === 64, "jugador inexistente responde en privado");
const ac = await call({ type: 4, guild_id: "g1", member, data: { name: "jugador", options: [{ name: "nombre", value: "ju", focused: true }] } });
ok(ac.j.type === 8 && ac.j.data.choices.some(c => c.name.startsWith("Juanchi")), "autocompletar jugadores");
const an0 = await call({ type: 2, guild_id: "g1", channel_id: "c1", member, data: { name: "anuncio", options: [{ name: "titulo", value: "Hola" }, { name: "mensaje", value: "a | b" }] } });
ok(an0.j.data.content.includes("Solo los admins"), "/anuncio bloqueado sin permiso");
sent.length = 0;
const admin = { ...member, permissions: String(1n << 3n) };
const an = await call({ type: 2, guild_id: "g1", channel_id: "c1", member: admin, data: { name: "anuncio", options: [{ name: "titulo", value: "Fecha 3" }, { name: "mensaje", value: "Arranca el sábado | Suerte a todos" }, { name: "mencionar", value: "g1" }] } });
ok(an.j.data.content.startsWith("✅") && sent[0].body.content === "@everyone" && sent[0].body.embeds[0].description === "Arranca el sábado\nSuerte a todos", "/anuncio publica con @everyone y saltos de línea");
const mod = { ...member, permissions: String(1n << 28n), roles: ["r1"] };
sent.length = 0;
const rl = await call({ type: 2, guild_id: "g1", member: mod, data: { name: "rol", options: [{ name: "accion", value: "add" }, { name: "usuario", value: "u9" }, { name: "rol", value: "r2" }], resolved: { roles: { r2: { position: 3 } } } } });
ok(rl.j.data.content.startsWith("✅") && sent.some(s => s.method === "PUT" && s.path === "/guilds/g1/members/u9/roles/r2"), "/rol da el rol");
const rl2 = await call({ type: 2, guild_id: "g1", member: mod, data: { name: "rol", options: [{ name: "accion", value: "add" }, { name: "usuario", value: "u9" }, { name: "rol", value: "r3" }], resolved: { roles: { r3: { position: 9 } } } } });
ok(rl2.j.data.content.includes("más arriba"), "/rol no deja dar un rol más alto que el propio");
console.log(fails ? `\n${fails} FALLAS` : "\nTODO OK (avisos y comandos)");
if (typeof fails !== "undefined" && fails) process.exitCode = 1;
