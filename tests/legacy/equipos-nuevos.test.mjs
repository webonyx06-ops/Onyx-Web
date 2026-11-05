import { NOW, DB, sent, ADM, db } from "../helpers/legacy-mock.mjs";
import { generateKeyPairSync, sign } from "node:crypto";
const L_ = new URL("../../netlify/", import.meta.url).href;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FALLA:", m); } else console.log("ok ·", m); };
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
Object.assign(process.env, { DISCORD_BOT_TOKEN: "tok", DISCORD_PUBLIC_KEY: Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url").toString("hex"), DISCORD_APP_ID: "777", DISCORD_GUILD_ID: "g1" });
// equipo nuevo con logo, un equipo de base quitado y ajustes manuales
DB.teams.velox = { custom: true, name: "VELOX", c: "#d8402c", order: 9, logoAt: 1700000000000 };
DB.teams.kyrox = { hidden: true };
DB.teams.zenith = { adj: { pts: 0, g: 2, gp: 0, pp: 1, p: 0, rf: 30, rc: 20, form: ["W", "l", "W"] } };
DB.logos = { velox: { data: "data:image/png;base64," + Buffer.from("PNGDATA").toString("base64"), at: 1 } };
DB.matches.m5 = { fecha: 3, a: "velox", b: "nexus", status: "played", ra: 13, rb: 7, stats: {} };
delete DB.matches.m3; // tenía a kyrox
const { build } = await import(L_ + "lib/league.mjs");
const { loadLeague } = await import(L_ + "lib/fsrest.mjs");
const E = await import(L_ + "lib/embeds.mjs");
const L = build(await loadLeague());
ok(L.keys.includes("velox") && !L.keys.includes("kyrox") && L.keys.length === 7, "equipos en uso: suma VELOX y saca KYROX");
const z = L.real.find(r => r.k === "zenith");
ok(z.g === 2 && z.pp === 1 && z.p === 1 && z.pj === 4 && z.pts === 2 * 3 + 1 + 0 && z.rf === 30 + 9 && z.form.join(" ") === "V DP V D", `ZENITH con ajustes: ${z.pj} PJ, ${z.pts} pts, forma ${z.form.join(" ")}`);
const v = L.real.find(r => r.k === "velox"); ok(v.pj === 1 && v.pts === 3, "VELOX suma su partido");
const tbl = E.tableEmbed(L); console.log(tbl.description.split("\n").slice(0, 3).join("\n"));
ok(tbl.description.split("\n")[1].includes("PTS") && tbl.description.split("\n")[1].indexOf("PTS") < tbl.description.split("\n")[1].indexOf("PJ"), "tabla del bot con puntos primero");
ok(E.teamEmbed(L, "velox").thumbnail.url.includes("/api/logo/velox?v="), "VELOX usa su logo subido");
ok(E.teamEmbed(L, "nexus").thumbnail.url.endsWith("/assets/emblemas/nexus.webp"), "NEXUS sigue con su escudo");
DB.teams.velox.logoAt = 0; const L2 = build(await loadLeague()); ok(E.teamEmbed(L2, "velox").thumbnail === undefined, "equipo nuevo sin logo: sin imagen"); DB.teams.velox.logoAt = 1700000000000;
// detección con un equipo nuevo
const { detect } = await import(L_ + "lib/notify.mjs");
const { teamListFrom } = await import(L_ + "lib/league.mjs");
const ch = [{ id: "c1", name: "🔥 VELOX", type: 4 }, { id: "c2", name: "💬・velox-chat", type: 0, parent_id: "c1" }, { id: "c3", name: "📋・velox-info", type: 0, parent_id: "c1" }];
const det = detect(ch, [{ id: "r1", name: "🔥 VELOX" }], "g", teamListFrom(DB.teams));
ok(det.teams.velox && det.teams.velox.chat === "c2" && det.teams.velox.role === "r1" && !det.teams.kyrox, "detecta canales y rol de VELOX");
// Discord: autocompletar y /equipo por nombre
const fn = (await import(L_ + "functions/discord.mjs")).default;
const call = async (obj) => { const body = JSON.stringify(obj), ts = String(Math.floor(Date.now() / 1000)); const sig = sign(null, Buffer.from(ts + body), privateKey).toString("hex");
  const r = await fn(new Request("https://x/api/discord", { method: "POST", body, headers: { "x-signature-ed25519": sig, "x-signature-timestamp": ts } }), {}); return r.json(); };
const member = { permissions: "0", roles: [], user: { username: "p" } };
const ac = await call({ type: 4, member, data: { name: "equipo", options: [{ name: "equipo", value: "vel", focused: true }] } });
ok(ac.data.choices.length === 1 && ac.data.choices[0].value === "velox", "autocompletar equipo encuentra VELOX");
const eq = await call({ type: 2, member, data: { name: "equipo", options: [{ name: "equipo", value: "Velox" }] } });
ok(eq.data.embeds && eq.data.embeds[0].title === "VELOX", "/equipo funciona escribiendo el nombre");
const eq2 = await call({ type: 2, member, data: { name: "mapas", options: [{ name: "equipo", value: "kyrox" }] } });
ok(eq2.data.flags === 64, "equipo quitado no aparece");
// endpoint de logos
const logo = (await import(L_ + "functions/logo.mjs")).default;
let r = await logo(new Request("https://onyxt1.netlify.app/api/logo/velox"), { params: { team: "velox" } });
ok(r.status === 200 && r.headers.get("content-type") === "image/png" && Buffer.from(await r.arrayBuffer()).toString() === "PNGDATA", "logo subido se sirve como imagen");
r = await logo(new Request("https://onyxt1.netlify.app/api/logo/nexus"), { params: { team: "nexus" } });
ok(r.status === 302 && r.headers.get("location").endsWith("/assets/emblemas/nexus.webp"), "sin logo subido: redirige al escudo de base");
r = await logo(new Request("https://onyxt1.netlify.app/api/logo/zzz"), { params: { team: "zzz" } }); ok(r.status === 404, "equipo inexistente: 404");
console.log(fails ? `\n${fails} FALLAS` : "\nTODO OK (equipos nuevos y tabla)");
if (typeof fails !== "undefined" && fails) process.exitCode = 1;
