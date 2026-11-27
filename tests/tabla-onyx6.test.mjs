// ONYX 6.0 · Etapa 4: la tabla del servidor (bot, resumen) no debe romperse con series decididas.
import test from "node:test";
import assert from "node:assert/strict";
import { DB } from "./helpers/legacy-mock.mjs";
const { build } = await import("../netlify/lib/league.mjs");
const { loadLeague } = await import("../netlify/lib/fsrest.mjs");
const mk = (fecha, a, b, ra, rb, leg) => ({ fecha, a, b, ra, rb, leg, status: "played", date: `2026-01-0${fecha} 20:00`, stats: {} });
const row = (L, k) => L.real.find((r) => r.k === k);

test("serie ganada 2-0: 3 puntos al ganador, 1 al perdedor, rondas sumadas, sin errores", async () => {
  DB.matches = { m1: mk(1, "zenith", "vortex", 13, 5, "ida"), m2: mk(1, "vortex", "zenith", 5, 13, "vuelta") };
  const L = build(await loadLeague());
  assert.equal(row(L, "zenith").pts, 3); assert.equal(row(L, "vortex").pts, 1);
  assert.equal(row(L, "zenith").rf, 26); assert.equal(row(L, "zenith").rc, 10);
  assert.equal(row(L, "vortex").rf, 10); assert.equal(row(L, "vortex").dif, -16);
  assert.equal(row(L, "zenith").g, 1); assert.equal(row(L, "vortex").p, 1);
});
test("serie 1-1 con desempate: gana quien se lleva el desempate", async () => {
  DB.matches = { m1: mk(2, "zenith", "vortex", 13, 8, "ida"), m2: mk(2, "vortex", "zenith", 13, 9, "vuelta"), m3: mk(2, "zenith", "vortex", 13, 11, "desempate") };
  const L = build(await loadLeague());
  assert.equal(row(L, "zenith").pts, 3); assert.equal(row(L, "vortex").pts, 1);
});
test("la tabla sigue ordenada por puntos y el orden es estable", async () => {
  DB.matches = { m1: mk(1, "zenith", "vortex", 13, 5, "ida"), m2: mk(1, "vortex", "zenith", 5, 13, "vuelta"), m3: mk(1, "onyx", "orion", 13, 2, "ida"), m4: mk(1, "orion", "onyx", 4, 13, "vuelta") };
  const a = build(await loadLeague()).real.map((r) => r.k).join(), b = build(await loadLeague()).real.map((r) => r.k).join();
  assert.equal(a, b);
  const L = build(await loadLeague());
  for (let i = 1; i < L.real.length; i++) assert.ok(L.real[i - 1].pts >= L.real[i].pts);
});
