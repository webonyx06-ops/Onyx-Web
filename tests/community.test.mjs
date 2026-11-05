// Pronósticos y votación de capitán
import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeDb, FieldValue } from "./helpers/fakedb.mjs";
import { buildSnapshot } from "../netlify/lib/publish.mjs";
import { savePicks, boardFrom, afterPatch, resultSig, scorePicks } from "../netlify/lib/pickem.mjs";
import { createMotion, signMotion, voteMotion, closeMotion, closeExpired, cancelMotion } from "../netlify/lib/motions.mjs";
import { parseLocal } from "../netlify/lib/league.mjs";

const NOW = Date.parse("2026-10-30T12:00:00-03:00");
const matches = {
  f1m0: { fecha: 1, a: "onyx", b: "orion", status: "played", ra: 13, rb: 9 },
  f2m0: { fecha: 2, a: "onyx", b: "nexus", status: "pending", date: "2026-10-31T21:00" },
  f2m1: { fecha: 2, a: "orion", b: "kyrox", status: "pending", date: "2026-10-29T21:00" }, // ya empezó
};

test("pronósticos: solo partidos que no empezaron, con contador de la comunidad", async () => {
  const db = fakeDb({ "league/config": {} });
  await buildSnapshot(db, { now: NOW });
  const who = { uid: "d_1", name: "Tomi", avatar: "" }, inc = FieldValue.increment;
  let r = await savePicks(db, who, { f2m0: "a", f2m1: "b", f1m0: "a", nope: "a" }, { matches, parseLocal, now: NOW, inc });
  assert.deepEqual(r.picks, { f2m0: "a" });
  await savePicks(db, { uid: "d_2", name: "Leo" }, { f2m0: "b" }, { matches, parseLocal, now: NOW, inc });
  r = await savePicks(db, who, { f2m0: "b" }, { matches, parseLocal, now: NOW, inc }); // cambia de opinión
  assert.deepEqual(db._get("public/pickagg").f2m0, { a: 0, b: 2 });
  assert.deepEqual(JSON.parse(db._get("public/snapshot").json).pickagg.f2m0, { a: 0, b: 2 });
  r = await savePicks(db, who, { f2m0: null }, { matches, parseLocal, now: NOW, inc });
  assert.deepEqual(r.picks, {}); assert.equal(db._get("public/pickagg").f2m0.b, 1);
});

test("ranking de pronósticos cuando cambian los resultados", async () => {
  const picks = { d_1: { name: "Tomi", picks: { f1m0: "a", f2m0: "b" } }, d_2: { name: "Leo", picks: { f1m0: "b" } }, d_3: { name: "Ana", picks: {} } };
  const rows = boardFrom(picks, matches);
  assert.deepEqual(rows.map((r) => [r.name, r.pts, r.pos]), [["Tomi", 1, 1], ["Leo", 0, 2]]);
  assert.deepEqual(scorePicks({ f1m0: "a" }, { f1m0: { status: "played", noShow: "b", ra: 0, rb: 13 } }), { pts: 1, hits: 1, n: 1 }, "W.O.: gana el que se presentó");
  const db = fakeDb({ "pickem/d_1": picks.d_1, "pickem/d_2": picks.d_2 });
  await buildSnapshot(db);
  const snap = JSON.parse(db._get("public/snapshot").json); snap.matches = matches;
  await afterPatch(db, { matches: true, snap });
  const b = db._get("public/pickboard");
  assert.equal(b.sig, resultSig(matches)); assert.equal(b.rows[0].name, "Tomi");
  assert.equal(await afterPatch(db, { matches: true, snap: { ...snap, pickboard: b } }), null, "si no cambió nada no recalcula");
});

const league = () => ({
  players: { p1: { name: "Uno", team: "onyx" }, p2: { name: "Dos", team: "onyx" }, p3: { name: "Tres", team: "onyx" }, p4: { name: "Cuatro", team: "onyx" }, p5: { name: "Cinco", team: "onyx" }, x: { name: "Otro", team: "orion" } },
  teams: { onyx: { captain: "p1" } },
  matches: { f1m0: { fecha: 1, status: "played" }, f2m0: { fecha: 2, status: "pending" }, f3m0: { fecha: 3, status: "pending" } },
});

test("votación de capitán: moción, firmas, voto secreto y resultado", async () => {
  const db = fakeDb({ "teams/onyx": { captain: "p1" } }), L = league();
  await assert.rejects(createMotion(db, { pid: "p2" }, "x", L, NOW), /de tu equipo/);
  await assert.rejects(createMotion(db, { pid: "p2" }, "p1", L, NOW), /ya es el capitán/);
  const m = await createMotion(db, { pid: "p2" }, "p3", L, NOW);
  assert.equal(m.need, 4, "2/3 de 5 = 4");
  await assert.rejects(createMotion(db, { pid: "p4" }, "p5", L, NOW), /en curso/);
  await assert.rejects(signMotion(db, { pid: "p2" }, m.id, L, NOW), /no cuenta/);
  await assert.rejects(signMotion(db, { pid: "p1" }, m.id, L, NOW), /capitán no puede/);
  await assert.rejects(voteMotion(db, { pid: "p3" }, m.id, "si", NOW), /cerrada/);
  await signMotion(db, { pid: "p3" }, m.id, L, NOW);
  const r = await signMotion(db, { pid: "p4" }, m.id, L, NOW);
  assert.ok(r.open); assert.equal(db._get(`motions/${m.id}`).status, "votacion");
  for (const [p, v] of [["p1", "no"], ["p2", "si"], ["p3", "si"], ["p4", "si"]]) await voteMotion(db, { pid: p }, m.id, v, NOW + 1000);
  await assert.rejects(voteMotion(db, { pid: "p2" }, m.id, "no", NOW + 2000), /Ya votaste/);
  assert.ok(!("si" in db._get(`motions/${m.id}`)) || db._get(`motions/${m.id}`).si === 0, "mientras se vota no se ve el conteo");
  const last = await voteMotion(db, { pid: "p5" }, m.id, "si", NOW + 3000);
  assert.ok(last.all);
  const c = await closeMotion(db, m.id, L, { now: NOW + 3000 });
  assert.deepEqual([c.ok, c.si, c.no], [true, 4, 1]);
  assert.equal(db._get("teams/onyx").captain, "p3");
  assert.equal(db._get(`motions/${m.id}`).fechaAt, 1);
  await assert.rejects(createMotion(db, { pid: "p2" }, "p4", { ...L, teams: { onyx: { captain: "p3" } } }, NOW + 5000), /esperar 2 fechas/);
});

test("votación que vence: se cierra sola y se rechaza si no llega", async () => {
  const db = fakeDb({ "teams/onyx": { captain: "p1" } }), L = league();
  const m = await createMotion(db, { pid: "p2" }, "p3", L, NOW);
  await signMotion(db, { pid: "p4" }, m.id, L, NOW); await signMotion(db, { pid: "p5" }, m.id, L, NOW);
  await voteMotion(db, { pid: "p2" }, m.id, "si", NOW);
  const paths = await closeExpired(db, L, NOW + 49 * 3600000);
  assert.ok(paths.includes(`motions/${m.id}`));
  assert.equal(db._get(`motions/${m.id}`).status, "rechazada");
  assert.equal(db._get("teams/onyx").captain, "p1");
  const m2 = await createMotion(db, { pid: "p2" }, "p3", { ...L, matches: { ...L.matches, f2m0: { fecha: 2, status: "played" }, f3m0: { fecha: 3, status: "played" } } }, NOW + 50 * 3600000);
  await assert.rejects(cancelMotion(db, { pid: "p3" }, m2.id), /Solo quien/);
  await cancelMotion(db, { pid: "p2" }, m2.id);
  assert.equal(db._get(`motions/${m2.id}`).status, "cancelada");
});
