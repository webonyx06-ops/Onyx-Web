import test from "node:test";
import assert from "node:assert/strict";
import { isSeason, particleCount, doorState, daysToChristmasEve, DOORS, MESSAGES, DECORATIONS } from "../public/js/navidad.mjs";
const D = (y, m, d) => new Date(y, m - 1, d);
test("temporada: 1 dic a 6 ene, con forzado por URL", () => {
  assert.equal(isSeason(D(2026, 11, 27)), false); assert.equal(isSeason(D(2026, 12, 1)), true);
  assert.equal(isSeason(D(2027, 1, 6)), true); assert.equal(isSeason(D(2027, 1, 7)), false);
  assert.equal(isSeason(D(2026, 7, 1), "1"), true); assert.equal(isSeason(D(2026, 12, 10), "0"), false);
});
test("partículas acotadas y apagadas con movimiento reducido o pestaña oculta", () => {
  assert.equal(particleCount({ width: 400 }), 36); assert.equal(particleCount({ width: 1920 }), 90);
  assert.equal(particleCount({ reducedMotion: true }), 0); assert.equal(particleCount({ hidden: true }), 0);
});
test("calendario: puertas bloqueadas, listas y abiertas según la fecha", () => {
  assert.equal(doorState(5, D(2026, 12, 4)), "locked"); assert.equal(doorState(5, D(2026, 12, 5)), "ready");
  assert.equal(doorState(5, D(2026, 12, 5), [5]), "open"); assert.equal(doorState(24, D(2026, 11, 30)), "locked");
  assert.equal(doorState(24, D(2027, 1, 2)), "ready");
  assert.equal(MESSAGES.length, DOORS);
});
test("cuenta regresiva a Nochebuena", () => {
  assert.equal(daysToChristmasEve(D(2026, 12, 24)), 0); assert.equal(daysToChristmasEve(D(2026, 12, 14)), 10);
  assert.equal(DECORATIONS.length, 8);
});
