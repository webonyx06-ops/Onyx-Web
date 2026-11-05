// Resumen público (public/snapshot)
import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeDb } from "./helpers/fakedb.mjs";
import { buildSnapshot, patchSnapshot, flushQueue, healSnapshot, okPath, fit, emptySnap, applyDoc } from "../netlify/lib/publish.mjs";

const seed = () => ({
  "league/config": { season: "Temporada 1", playoff: 4 },
  "teams/onyx": { name: "ONYX", coins: 6000 },
  "teams/orion": { name: "ORION", coins: 5000 },
  "logos/onyx": { data: "data:image/webp;base64,AAAA", at: 5 },
  "players/p1": { name: "Jagger", team: "onyx" },
  "matches/f1m0": { fecha: 1, a: "onyx", b: "orion", status: "pending" },
  "prizes/pz1": { name: "Skin", img: "data:image/webp;base64,BBBB", pts: 100 },
  "offers/u1": { items: [{ pid: "p1" }] }, // privado: no va
  "mappicks/f1_onyx": { map: "Bind" }, // privado: no va
});
const read = (db) => JSON.parse(db._get("public/snapshot").json);

test("arma el resumen completo, sin datos privados y con las imágenes como enlace", async () => {
  const db = fakeDb(seed());
  const r = await buildSnapshot(db, { now: 1000 });
  assert.equal(r.rev, 1);
  const s = read(db);
  assert.equal(s.config.season, "Temporada 1");
  assert.equal(s.players.p1.name, "Jagger");
  assert.ok(!("offers" in s) && !("mappicks" in s), "nada privado");
  assert.match(s.logos.onyx.data, /^\/api\/img\/logos\/onyx\?h=[0-9a-f]{12}$/);
  assert.match(s.prizes.pz1.img, /^\/api\/img\/prizes\/pz1\?h=/);
  assert.equal(db._get("public/meta").rev, 1);
});

test("actualiza solo lo que cambió, incluidos los borrados, y sube la versión", async () => {
  const db = fakeDb(seed());
  await buildSnapshot(db);
  await db.doc("matches/f1m0").update({ status: "played", ra: 13, rb: 7 });
  await db.doc("players/p1").delete();
  db._reset();
  const r = await patchSnapshot(db, ["matches/f1m0", "players/p1", "offers/u1", "../hack"]);
  assert.equal(r.rev, 2); assert.equal(r.n, 2, "ignora rutas privadas o inválidas");
  assert.ok(db._stats().reads <= 4, `pocas lecturas (${db._stats().reads})`);
  const s = read(db);
  assert.equal(s.matches.f1m0.ra, 13);
  assert.ok(!s.players.p1);
});

test("procesa la cola que dejó la página cuando la función no respondió", async () => {
  const db = fakeDb(seed());
  await buildSnapshot(db);
  await db.doc("teams/orion").update({ coins: 4000 });
  await db.doc("pubqueue/main").set({ paths: ["teams/orion"], at: 1 });
  const r = await flushQueue(db);
  assert.equal(r.n, 1);
  assert.equal(read(db).teams.orion.coins, 4000);
  assert.deepEqual(db._get("pubqueue/main").paths, []);
  db._reset();
  const r2 = await flushQueue(db);
  assert.equal(r2.n, 0); assert.equal(db._stats().reads, 1, "cola vacía: 1 sola lectura");
});

test("si todavía no hay resumen, lo arma completo", async () => {
  const db = fakeDb(seed());
  const r = await patchSnapshot(db, ["players/p1"]);
  assert.equal(r.full, true);
  assert.equal(read(db).players.p1.name, "Jagger");
});

test("el control de cada hora corrige lo que no se avisó", async () => {
  const db = fakeDb(seed());
  await buildSnapshot(db);
  await db.doc("matches/f1m0").update({ status: "played", ra: 13, rb: 3 });
  await db.doc("matches/f2m0").set({ fecha: 2, a: "orion", b: "onyx", status: "pending" });
  const r = await healSnapshot(db);
  assert.equal(r.healed, 2);
  const s = read(db);
  assert.equal(s.matches.f1m0.rb, 3); assert.ok(s.matches.f2m0);
  const r2 = await healSnapshot(db);
  assert.equal(r2.healed, 0);
});

test("rutas permitidas", () => {
  assert.ok(okPath("matches/f1m0")); assert.ok(okPath("league/config")); assert.ok(okPath("public/pickagg"));
  assert.ok(!okPath("staff/x")); assert.ok(!okPath("matches")); assert.ok(!okPath("matches/a/b")); assert.ok(!okPath("public/snapshot"));
});

test("si se pasa de 1 MB, recorta lo más viejo", () => {
  const s = emptySnap();
  for (let i = 0; i < 4000; i++) applyDoc(s, `salaries/s${i}`, { at: i, note: "x".repeat(300) });
  const json = fit(s);
  assert.ok(json.length <= 1000000, `tamaño ${json.length}`);
  const back = JSON.parse(json);
  assert.ok(back.trimmed); assert.ok(back.salaries.s3999, "queda lo más nuevo");
});
