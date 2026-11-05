// Sueldos de los coaches
import { ADM, db } from "../helpers/legacy-mock.mjs";
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log("FALLA:", m); } else console.log("ok ·", m); };
const P = await import("../../netlify/lib/payroll.mjs");
const at = (s) => Date.parse(s);
// semana: lunes 00:00 hora de Argentina
ok(P.weekStart(at("2026-10-26T13:00:00-03:00")).key === "2026-10-26", "lunes al mediodía → semana del 26/10");
ok(P.weekStart(at("2026-11-01T23:59:00-03:00")).key === "2026-10-26", "domingo 23:59 → sigue siendo la semana del 26/10");
ok(P.weekStart(at("2026-11-02T00:00:00-03:00")).key === "2026-11-02", "lunes 00:00 → semana nueva");
ok(P.weekStart(at("2026-11-02T00:00:00-03:00")).at === at("2026-11-02T00:00:00-03:00"), "el lunes arranca a las 00:00 de Argentina");
ADM["league/config"] = { coach: { salary: 150, usd: 5, refill: 6000 } };
ADM.teams = { orion: { coins: 1000 }, nexus: { coins: 100 }, zenith: { coins: 5000, hidden: true }, velox: { custom: true } };
ADM.coaches = { c1: { name: "Profe", teams: { orion: { since: at("2026-10-20T10:00:00-03:00") }, nexus: { since: at("2026-10-21T10:00:00-03:00") }, zenith: { since: 1 } } },
  c2: { name: "Nuevo", teams: { orion: { since: at("2026-10-26T09:00:00-03:00") }, kyrox: { since: at("2026-10-22T09:00:00-03:00") } } } };
ADM.salaries = {}; ADM.payroll = {};
let r = await P.runPayroll(db, { now: at("2026-10-26T13:00:00-03:00") });
console.log("semana 1:", r);
ok(r.paid === 2 && r.pend === 1, "pagan ORION (150) y KYROX (sin documento, arranca con 6000); NEXUS no llega");
ok(ADM.teams.orion.coins === 850 && ADM.teams.kyrox.coins === 5850 && ADM.teams.nexus.coins === 100, "coins: ORION 850, KYROX 5850, NEXUS 100");
ok(ADM.salaries["2026-10-26_c1_nexus"].status === "pend" && ADM.salaries["2026-10-26_c1_orion"].status === "paid", "el de NEXUS queda pendiente");
ok(!ADM.salaries["2026-10-26_c2_orion"], "el coach fichado el lunes a la mañana cobra desde la semana que viene");
ok(!ADM.salaries["2026-10-26_c1_zenith"], "equipo quitado de la liga: no paga");
r = await P.runPayroll(db, { now: at("2026-10-26T13:10:00-03:00") });
ok(!!r.skipped, "la misma semana no se paga dos veces");
ADM.teams.nexus.coins = 500; // le acreditaron coins por resultados
r = await P.runPayroll(db, { now: at("2026-11-02T00:05:00-03:00") });
console.log("semana 2:", r);
ok(r.settled === 1 && ADM.salaries["2026-10-26_c1_nexus"].status === "paid", "el pendiente de NEXUS se paga solo cuando le alcanza");
ok(ADM.teams.nexus.coins === 200 && ADM.teams.orion.coins === 550, "NEXUS 500 → 200 (pendiente + semana); ORION 850 → 550 (dos coaches)");
ok(ADM.payroll["2026-11-02"].status === "done" && ADM.payroll["2026-11-02"].total === 750 && ADM.payroll["2026-11-02"].paid === 4, "queda el resumen de la semana (4 sueldos + 1 pendiente = 750)");
ADM["league/config"].coach.salary = 200;
r = await P.runPayroll(db, { now: at("2026-11-09T08:00:00-03:00") });
ok(ADM.salaries["2026-11-09_c1_orion"].amt === 200, "si el staff cambia el sueldo, se usa el nuevo");
console.log(fails ? `\n${fails} FALLAS` : "\nTODO OK (sueldos de coaches)");
if (typeof fails !== "undefined" && fails) process.exitCode = 1;
