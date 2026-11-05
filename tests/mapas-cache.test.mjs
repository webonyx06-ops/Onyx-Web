// La revisión de cada 10 minutos no vuelve a leer todas las elecciones de mapa si no cambió nada
import { test } from "node:test";
import assert from "node:assert/strict";
import { DB, ADM, db } from "./helpers/legacy-mock.mjs";
const N = await import("../netlify/lib/notify.mjs");
const F = await import("../netlify/lib/fsrest.mjs");

test("mapas descartados: con la misma huella no relee nada", async () => {
  DB.public = { snapshot: { v: 1, rev: 5, json: JSON.stringify({ v: 1, rev: 5, matches: DB.matches, teams: {}, players: {}, config: {} }) } };
  ADM.teams = {}; ADM["bot/state"] = { mapsSent: {} };
  ADM.mappicks = { f2_nexus: { matchId: "m2", fecha: 2, team: "nexus", map: "Bind", side: "atk", at: 100 } };
  const r1 = await N.syncPickedMaps(db);
  assert.ok(!r1.skipped, "la primera vez revisa");
  F.clearSnapshotCache();
  const r2 = await N.syncPickedMaps(db);
  assert.equal(r2.skipped, true, "la segunda, sin cambios, no relee");
  ADM.mappicks.f2_nexus = { ...ADM.mappicks.f2_nexus, map: "Haven", at: 200 };
  F.clearSnapshotCache();
  const r3 = await N.syncPickedMaps(db);
  assert.ok(!r3.skipped, "si un capitán cambia su elección, vuelve a revisar");
  ADM["bot/state"] = { mapsSent: { f2_nexus_orion: "x" } };
  F.clearSnapshotCache();
  const r4 = await N.syncPickedMaps(db);
  assert.ok(!r4.skipped, "si el bot avisó mapas, vuelve a revisar");
});

test("la liga se lee del resumen (1 lectura) y el panel del bot sigue leyendo lo último", async () => {
  F.clearSnapshotCache();
  DB.public = { snapshot: { v: 1, rev: 7, json: JSON.stringify({ v: 1, rev: 7, config: { season: "Resumen" }, matches: {}, teams: {}, players: {}, perf: {}, transfers: {}, draws: {} }) } };
  const fromSnap = await F.loadLeague();
  assert.equal(fromSnap.config.season, "Resumen");
  const fresh = await F.loadLeagueFresh();
  assert.notEqual(fresh.config.season, "Resumen", "fresh lee las colecciones");
  assert.ok(Object.keys(fresh.matches).length > 0);
});
