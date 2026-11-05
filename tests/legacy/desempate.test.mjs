import { DB } from "../helpers/legacy-mock.mjs";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FALLA:", m); } else console.log("ok ·", m); };
const { build } = await import("../../netlify/lib/league.mjs");
const { loadLeague } = await import("../../netlify/lib/fsrest.mjs");
const E = await import("../../netlify/lib/embeds.mjs");
DB.matches = {}; // tabla cargada a mano, sin partidos
const T = (pts, rf, rc, kills, ast) => ({ adj: { pts, rf, rc, kills, ast } });
DB.teams = { zenith: T(6, 20, 10, 0, 0), vortex: T(6, 25, 15, 0, 0), zyriax: T(3, 18, 12, 0, 0), kyrox: T(3, 18, 9, 0, 0), onyx: T(1, 10, 10, 40, 5), orion: T(1, 10, 10, 40, 9), nexus: T(1, 10, 10, 55, 0) };
const L = build(await loadLeague());
const order = L.real.map(r => r.k).join(" > ");
console.log(order);
ok(L.real[0].k === "vortex" && L.real[1].k === "zenith", "6 pts: VORTEX (25 rondas ganadas) arriba de ZENITH (20)");
ok(L.real[2].k === "kyrox" && L.real[3].k === "zyriax", "3 pts e igual de rondas ganadas: KYROX (9 perdidas) arriba de ZYRIAX (12)");
ok(L.real.slice(4).map(r => r.k).join() === "nexus,orion,onyx", "1 pt e igual rondas: NEXUS (más kills), después ORION (más asistencias que ONYX)");
console.log(E.tableEmbed(L).description);
console.log(fails ? `\n${fails} FALLAS` : "\nTODO OK (desempate)");
if (typeof fails !== "undefined" && fails) process.exitCode = 1;
