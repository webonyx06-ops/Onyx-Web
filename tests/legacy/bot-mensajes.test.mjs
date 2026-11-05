import { NOW, DB, sent, ADM, db } from "../helpers/legacy-mock.mjs";
const L_ = new URL("../../netlify/lib/", import.meta.url).href;
const { build } = await import(L_ + "league.mjs");
const { loadLeague } = await import(L_ + "fsrest.mjs");
const E = await import(L_ + "embeds.mjs");
const N = await import(L_ + "notify.mjs");
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FALLA:", m); } };
const L = build(await loadLeague());
ok(L.P.length === 14 && L.played.length === 1 && L.pending.length === 3, "carga de liga");
const lenOk = (e) => { const s = JSON.stringify(e); ok(!e.title || e.title.length <= 256, "título largo"); (e.fields || []).forEach(f => { ok(f.value && f.value.length <= 1024 && f.name && f.name.length <= 256, "campo inválido " + f.name); }); ok(!e.description || e.description.length <= 4096, "descr"); return s.length; };
const all = { tabla: E.tableEmbed(L), prox: E.nextEmbed(L), res: E.resultsEmbed(L), res9: E.resultsEmbed(L, 9), jug: E.playerEmbed(L, L.PM.p2), jugLibre: E.playerEmbed(L, { ...L.PM.p5, team: null }),
  eq: E.teamEmbed(L, "nexus"), rk: E.rankingEmbed(L, "acs"), rkpts: E.rankingEmbed(L, "pts"), rkatt: E.rankingEmbed(L, "att"), rkkd: E.rankingEmbed(L, "kd"), mapas: E.mapsEmbed(L, "nexus"), merc: E.marketEmbed(L), prem: E.awardsEmbed(L), ayuda: E.helpEmbed(L),
  resM: E.resultEmbed(L, L.played[0]), rem: E.reminderEmbed(L, L.pending[0]) };
for (const [k, e] of Object.entries(all)) lenOk(e);
const m2 = L.ms.find(m => m.id === "m2"), m1 = L.ms.find(m => m.id === "m1");
for (const kind of ["chat","info","strats","partidos"]) { const p = N.teamPayload(kind, L, m2, "nexus", { teams: { nexus: { role: "999999" } } }, NOW); p.embeds.forEach(lenOk); }
const info = E.teamInfoMsg(L, m2, "nexus", "123456789");
ok(info.content.startsWith("<@&123456789>") && info.allowed_mentions.roles[0] === "123456789", "mención de rol en info");
const tr = E.teamResultMsg(L, m1, "nexus"); lenOk(tr.embeds[0]); ok(tr.embeds[0].title.includes("Victoria 13-9"), "resultado nexus");
ok(E.teamResultMsg(L, m1, "zenith").embeds[0].title.includes("Derrota 9-13"), "resultado zenith");
console.log("\n--- TABLA ---\n" + all.tabla.description);
console.log("\n--- INFO NEXUS ---\n" + info.content + "\n" + info.embeds[0].title + "\n" + info.embeds[0].description + "\n" + info.embeds[0].fields.map(f => f.name + ": " + f.value).join("\n"));
console.log("\n--- STRATS ---\n" + JSON.stringify(E.teamStratsMsg(L, m2, "nexus").embeds[0].fields));
console.log("\n--- RESULTADO EN PARTIDOS ---\n" + tr.embeds[0].title + "\n" + tr.embeds[0].description + "\n" + tr.embeds[0].fields[0].value);

// detección con la estructura real del servidor
const cats = ["STAFF","📌 INFORMACIÓN","💬 COMUNIDAD","🏆 PREMIER","🧛 ONYX","🌌 ORION","🀄 NEXUS","🌸 ZENITH","🌀 VORTEX","🐉 ZYRIAX","🐙 KYROX"];
let id = 1000, ch = [];
const cat = {}; cats.forEach((c, i) => { cat[c] = String(id++); ch.push({ id: cat[c], name: c, type: 4, position: i }); });
const add = (c, names, type = 0) => names.forEach((n, i) => ch.push({ id: String(id++), name: n, type, parent_id: cat[c], position: i }));
add("STAFF", ["🏳️‍🌈・chat-de-staff", "📋・solicitudes-de-admin", "chat-logs"]);
add("📌 INFORMACIÓN", ["📢・anuncios","📜・reglas","🌐・sitio-web","💜・bienvenida","✅・verificado","📅・calendario","🏆・onyx-cup","📊・clasificación","📰・novedades","🎉・eventos"]);
add("💬 COMUNIDAD", ["👑・capitanes","💭・general","👋・intros","🖼️・multimedia","🎮・gaming","📷・clips","🎵・música","🤖・bots","💡・dudas-y-sugerencias"]);
add("🏆 PREMIER", ["🏆・premier","📋・inscripciones","🔎・reclutamiento","🖼️・multimedia","🧪・tryouts","📅・partidos-y-resultados","🎥・vods","📈・estadísticas","🏅・rankings"]);
for (const [c, k] of [["🧛 ONYX","onyx"],["🌌 ORION","orion"],["🀄 NEXUS","nexus"],["🌸 ZENITH","zenith"],["🌀 VORTEX","vortex"],["🐉 ZYRIAX","zyriax"],["🐙 KYROX","kyrox"]]) {
  add(c, [`💬・${k}-chat`, `📋・${k}-info`, `🎯・${k}-strats`, `📅・${k}-partidos`, `🎥・${k}-vods`]);
  add(c, [k.toUpperCase(), `${k.toUpperCase()} — Match`, `${k.toUpperCase()} — Review`], 2);
}
const bold = (s) => [...s].map(ch => { const c = ch.charCodeAt(0); return c >= 65 && c <= 90 ? String.fromCodePoint(0x1D400 + c - 65) : ch; }).join("");
const roles = ["ROMPE BOLAS 3000","Bots","👑 CÚPULA DE ONYX","👑 ONYX — FOUNDER","💎 ONYX — CO-FOUNDER","🛡️ " + bold("ONYX — DIRECTOR"),"ADMINISTRACIÓN","⚜️ ONYX — ADMIN","🧠 " + bold("ONYX — COACH NEXUS"),
  "🧛 " + bold("ONYX"),"🌌 ORION","🔥 VELOX","🀄 NEXUS","🌸 ZENITH","🌀 VORTEX","🐉 ZYRIAX","🎴 ZYHAN","🧙 ZHARD","🐙 KYROX","🀄 VYRON","👑 CAPTAIN","PLAYER 🎮","SANTIAGO"].map((n, i) => ({ id: String(5000 + i), name: n, position: 50 - i, managed: false }));
roles.push({ id: "g1", name: "@everyone", position: 0 }, { id: "5999", name: "ONYX Bot", position: 1, managed: true });
const det = N.detect(ch, roles, "g1");
const nameOf = (i) => (ch.find(c => c.id === i) || roles.find(r => r.id === i) || { name: "—" }).name;
for (const [k, t] of Object.entries(det.teams)) console.log(k.padEnd(7), "rol:", nameOf(t.role).padEnd(12), "|", ["chat","info","strats","partidos"].map(x => nameOf(t[x])).join(" | "));
console.log("generales:", Object.entries(det.channels).map(([k, v]) => k + "=" + nameOf(v)).join(", "), det.found);
ok(det.found.channels === 28 && det.found.roles === 7, "detección completa");
ok(det.teams.onyx.role === "5009", "rol onyx exacto");
ok(nameOf(det.teams.onyx.chat) === "💬・onyx-chat", "canal onyx-chat");

// cuándo toca cada aviso
const S = Date.parse("2026-10-24T21:00:00-03:00"), none = () => false, H = 3600000;
ok(N.dueOffsets([1440, 60], S, S - 25 * H, none).send === null, "antes de 24h nada");
ok(N.dueOffsets([1440, 60], S, S - 23 * H, none).send === 1440, "24h");
const late = N.dueOffsets([1440, 60], S, S - 30 * 60000, none); ok(late.send === 60 && late.skip[0] === 1440, "atrasado manda solo el de 1h");
ok(N.dueOffsets([0], S, S + 10 * 60000, none).send === 0, "al empezar");
ok(N.dueOffsets([0], S, S + 4 * H, none).send === null, "ya pasó");
ok(N.dueOffsets([60], S, S + 60000, none).send === null, "no manda recordatorio previo después de empezar");
console.log(fails ? `\n${fails} FALLAS` : "\nTODO OK (embeds, detección, horarios)");
if (typeof fails !== "undefined" && fails) process.exitCode = 1;
