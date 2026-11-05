// Ida y vuelta: un aviso por cruce, un resultado por cruce, y el paso desde los avisos por partido.
import { NOW, DB, sent, ADM, db } from "../helpers/legacy-mock.mjs";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FALLA:", m); } else console.log("ok ·", m); };
Object.assign(process.env, { DISCORD_BOT_TOKEN: "tok", DISCORD_PUBLIC_KEY: "ab", DISCORD_APP_ID: "777", DISCORD_GUILD_ID: "g1", SITE_URL: "https://onyxt1.netlify.app" });
const N = await import("../../netlify/lib/notify.mjs");
const { build } = await import("../../netlify/lib/league.mjs");
const { loadLeague } = await import("../../netlify/lib/fsrest.mjs");
const E = await import("../../netlify/lib/embeds.mjs");
const MIN = 60000;
DB.matches.m2 = { ...DB.matches.m2, leg: "ida" };                                   // NEXUS vs ORION 21:00
DB.matches.m2v = { fecha: 2, a: "orion", b: "nexus", status: "pending", date: "2026-10-24T22:30", leg: "vuelta" };
DB.matches.m3v = { fecha: 2, a: "kyrox", b: "onyx", status: "pending", date: "2026-10-25T20:45" }; // sin leg: sale por el horario
ADM["bot/config"] = { enabled: true, channels: { partidos: "100001", resultados: "100002", mapas: "100003", mercado: "100004", anuncios: "100005" },
  teams: Object.fromEntries(["onyx","orion","nexus","zenith","vortex","zyriax","kyrox"].map((k, i) => [k, { role: String(900000 + i), chat: String(200000 + i), info: String(300000 + i), strats: String(400000 + i), partidos: String(500000 + i) }])) };
const posts = () => sent.filter(s => s.method === "POST" && s.path.startsWith("/channels/"));
const cnt = (id) => posts().filter(p => p.path === `/channels/${id}/messages`).length;
// la liga marca ida y vuelta
const L0 = build(await loadLeague());
ok(L0.ms.find(m => m.id === "m2").leg === "ida" && L0.ms.find(m => m.id === "m2v").leg === "vuelta" && L0.ms.find(m => m.id === "m3").leg === "ida" && L0.ms.find(m => m.id === "m3v").leg === "vuelta" && L0.ms.find(m => m.id === "m4").leg === "", "la liga marca ida y vuelta (con el campo o por horario) y el partido único queda sin marca");
const s2 = N.seriesOf(L0.ms).find(s => s.key === "f2_nexus_orion");
ok(s2.games.map(g => g.id).join() === "m2,m2v", "cruce NEXUS-ORION: ida y vuelta en orden");
// 1) primera revisión: un solo aviso por canal aunque haya dos partidos
let r = await N.runTick(db, { now: NOW });
console.log("1ª revisión:", r.sent, "mensajes");
ok(cnt("200002") === 1 && cnt("200001") === 1 && cnt("300002") === 1 && cnt("400001") === 1, "NEXUS y ORION: un aviso en chat, info y strats (no dos)");
ok(cnt("100001") === 2, "canal general: un recordatorio por cruce (NEXUS-ORION y ONYX-KYROX)");
ok(cnt("200000") === 1 && cnt("200006") === 1, "ONYX y KYROX: un aviso cada uno para su ida y vuelta");
ok(r.sent === 16, "la misma cantidad de mensajes que si fuera un partido por cruce (16)");
const chat = posts().find(p => p.path === "/channels/200002/messages").body.embeds[0];
console.log("chat NEXUS →", chat.author.name, "|", chat.description.replace(/\n/g, " / "));
ok(chat.author.name.includes("Ida y vuelta") && chat.description.includes("**Ida**") && chat.description.includes("**Vuelta**"), "el aviso trae la ida y la vuelta");
const info = posts().find(p => p.path === "/channels/300001/messages").body;
ok(info.content.includes("la ida y vuelta") && info.embeds[0].description.includes("uno de los dos partidos") && info.components[0].components[0].url.endsWith("?mapa=m2#elegir-mapa"), "info: pide elegir la ida o la vuelta, con el botón a la web");
const gen = posts().find(p => p.path === "/channels/100001/messages" && p.body.embeds[0].title.startsWith("NEXUS")).body.embeds[0];
ok(gen.author.name.includes("Ida y vuelta") && gen.description.includes("**Vuelta**"), "recordatorio general con los dos partidos");
// 2) 1 h antes de la ida: un recordatorio por equipo (no uno por partido)
sent.length = 0; r = await N.runTick(db, { now: NOW + 14 * MIN });
ok(r.sent === 3 && cnt("200002") === 1 && cnt("200001") === 1 && cnt("100001") === 1, "1 h antes: chat de los dos equipos y general, una vez");
// 3) arranca la ida: aviso de subir stats una sola vez; en la vuelta no se repite
sent.length = 0; r = await N.runTick(db, { now: Date.parse("2026-10-24T21:01:00-03:00") });
const part = posts().find(p => p.path === "/channels/500002/messages");
ok(cnt("500002") === 1 && cnt("500001") === 1 && part.body.embeds[0].description.includes("de la ida y de la vuelta"), "al empezar: un aviso para subir las stats de la ida y la vuelta");
sent.length = 0; r = await N.runTick(db, { now: Date.parse("2026-10-24T22:31:00-03:00") });
ok(!posts().some(p => /\/channels\/(5|2|3|4)0000[12]\//.test(p.path)), "cuando arranca la vuelta no manda avisos de nuevo");
// 4) resultados: espera a que se jueguen los dos
const stats = (t1, t2) => Object.fromEntries(["p2","p9","p16","p23","p30","p1","p8","p15","p22","p29"].map((p, i) => [p, { t: i < 5 ? t1 : t2, k: 10 + i, d: 12, a: 4, acs: 180 + i * 5 }]));
DB.matches.m2 = { ...DB.matches.m2, status: "played", ra: 13, rb: 9, map: "Ascent", stats: stats("nexus", "orion") };
sent.length = 0; r = await N.runTick(db, { now: Date.parse("2026-10-24T22:20:00-03:00") });
ok(!posts().some(p => p.path.includes("100002") || p.path.includes("500002")), "jugada solo la ida: todavía no publica el resultado");
DB.matches.m2v = { ...DB.matches.m2v, status: "played", ra: 13, rb: 11, ot: true, map: "Lotus", stats: stats("orion", "nexus") };
sent.length = 0; r = await N.runTick(db, { now: Date.parse("2026-10-24T23:10:00-03:00") });
const res = posts().filter(p => p.path === "/channels/100002/messages");
ok(res.length === 1 && cnt("500002") === 1 && cnt("500001") === 1, "jugados los dos: un resultado en general y uno en partidos de cada equipo");
const re = res[0].body.embeds[0];
console.log("resultado →", re.author.name, "|", re.title, "|", re.description, "|", re.fields.map(f => f.name).join(" · "));
ok(re.author.name.includes("Ida y vuelta") && re.fields.length === 2 && re.fields[0].name.startsWith("Ida · NEXUS 13-9") && re.fields[1].name.startsWith("Vuelta · ORION 13-11") && re.description.startsWith("Empate 1-1"), "resultado del cruce: ida, vuelta y global 1-1");
const tr = posts().find(p => p.path === "/channels/500002/messages").body.embeds[0];
console.log("NEXUS partidos →", tr.title, "|", tr.description.replace(/\n/g, " / "), "|", tr.fields.map(f => f.name).join(" · "));
ok(tr.title.includes("Empataron 1-1") && tr.description.includes("**Ida** · Victoria 13-9") && tr.description.includes("**Vuelta** · Derrota 11-13 (prórroga)") && tr.fields.map(f => f.name).join() === "Stats · Ida,Stats · Vuelta", "equipo: los dos resultados y las stats de cada partido en un solo mensaje");
sent.length = 0; r = await N.runTick(db, { now: Date.parse("2026-10-24T23:20:00-03:00") });
ok(r.sent === 0, "no repite el resultado");
DB.matches.m2v.rb = 9; DB.matches.m2v.ot = false;
sent.length = 0; r = await N.runTick(db, { now: Date.parse("2026-10-24T23:30:00-03:00") });
ok(posts().length === 1 && posts()[0].body.embeds[0].author.name.startsWith("Resultado corregido"), "corrección: un solo mensaje en general");
// 5) botón "mandar ahora" del panel: el cruce entero
const L = build(await loadLeague());
sent.length = 0; const log = await N.sendMatchNow(N.normConfig(ADM["bot/config"]), L, L.ms.find(m => m.id === "m3v"), ["chat"]);
ok(posts().length === 2 && log.every(l => l.ok && l.txt.includes("ida y vuelta")), "mandar ahora: un mensaje por equipo para la ida y vuelta");
// 6) paso desde los avisos viejos (por partido): no repite nada
const keyOf = (...p) => p.join("|").replace(/[^A-Za-z0-9|_-]/g, "_");
DB.matches.m2 = { fecha: 2, a: "nexus", b: "orion", status: "pending", date: "2026-10-24T21:00" }; DB.matches.m2v = { fecha: 2, a: "orion", b: "nexus", status: "pending", date: "2026-10-24T22:30" };
ADM["bot/state"] = { init: true, sent: { [keyOf("m2", "nexus", "chat", 1440, "2026-10-24T21:00")]: NOW - 3 * 3600000, [keyOf("m2", "all", "gen", 1440, "2026-10-24T21:00")]: NOW - 3 * 3600000 }, results: { m1: "13-9" }, log: [] };
sent.length = 0; r = await N.runTick(db, { now: Date.parse("2026-10-24T01:00:00-03:00") });
console.log("después de actualizar →", posts().map(p => p.path.split("/")[2]).join(","));
ok(!posts().some(p => p.path === "/channels/200002/messages") && cnt("200001") === 1, "lo ya avisado por partido (chat de NEXUS) no se repite; lo que faltaba (chat de ORION) sale");
ok(!posts().some(p => p.path.includes("100002")), "no vuelve a publicar resultados viejos");
ok(posts().filter(p => p.path.includes("100001")).every(p => !p.body.embeds[0].title.startsWith("NEXUS")), "el recordatorio general ya mandado de NEXUS-ORION no se repite (el que sale es de " + posts().filter(p => p.path.includes("100001")).map(p => p.body.embeds[0].title).join() + ")");
ok(ADM["bot/state"].rv === 2 && ADM["bot/state"].results.f1_nexus_zenith === "13-9", "estado pasado a cruces");
console.log(fails ? `\n${fails} FALLAS` : "\nTODO OK (ida y vuelta: avisos por cruce)");
if (typeof fails !== "undefined" && fails) process.exitCode = 1;
