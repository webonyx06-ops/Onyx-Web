// Estadísticas de rankeds desde el Riot ID (HenrikDev)
import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeDb } from "./helpers/fakedb.mjs";
import { splitRiot, summarizeMatches, fetchValStats, pickDue, refreshMany } from "../netlify/lib/valstats.mjs";

const NOW = Date.parse("2026-11-07T12:00:00-03:00");
const match = (team, red, blue, k, d, a, agent, map) => ({ meta: { map: { name: map }, started_at: "2026-11-06T22:00:00Z" }, stats: { team, kills: k, deaths: d, assists: a, score: (red + blue) * 200, character: { name: agent }, shots: { head: 10, body: 25, leg: 5 }, damage: { made: (red + blue) * 150 } }, teams: { red, blue } });
const api = (calls, over = {}) => async (url, o) => {
  calls.push({ url, key: o.headers.Authorization });
  const ok = (data) => ({ ok: true, status: 200, json: async () => ({ status: 200, data }) });
  if (over[url.split("?")[0].split("/valorant")[1].split("/")[1]]) return over[url.split("?")[0].split("/valorant")[1].split("/")[1]];
  if (url.includes("/v2/account/")) return ok({ region: "latam", account_level: 210, card: "abc" });
  if (url.includes("/v3/mmr/")) return ok({ current: { tier: { id: 21, name: "Ascendant 1" }, rr: 45, elo: 1845, last_change: 18 }, peak: { tier: { name: "Immortal 1" }, season: { short: "e9a2" } }, seasonal: [{ season: { short: "e9a3" }, wins: 30, games: 52 }] });
  if (url.includes("/v1/stored-matches/")) return ok([match("Red", 13, 7, 20, 12, 5, "Jett", "Bind"), match("Blue", 13, 9, 15, 18, 6, "Jett", "Haven"), match("blue", 5, 13, 22, 14, 2, "Raze", "Bind")]);
  return { ok: false, status: 404, json: async () => ({ errors: [{}] }) };
};

test("Riot ID", () => {
  assert.deepEqual(splitRiot("Jagger # LAS"), { name: "Jagger", tag: "LAS" });
  assert.equal(splitRiot("Jagger"), null); assert.equal(splitRiot("ab#LAS"), null);
});

test("resumen de las últimas rankeds", () => {
  const s = summarizeMatches([match("Red", 13, 7, 20, 12, 5, "Jett", "Bind"), match("Blue", 13, 9, 15, 18, 6, "Jett", "Haven"), match("blue", 5, 13, 22, 14, 2, "Raze", "Bind")]);
  assert.equal(s.games, 3); assert.equal(s.wins, 2, "ganó la primera (rojo 13) y la tercera (azul 13)"); assert.equal(s.winPct, 67);
  assert.equal(s.kd, Math.round(57 / 44 * 100) / 100); assert.equal(s.hs, 25); assert.equal(s.acs, 200); assert.equal(s.adr, 150);
  assert.deepEqual(s.agents[0], { n: "Jett", c: 2 }); assert.equal(s.maps[0].n, "Bind");
});

test("trae cuenta, rango y partidas con la clave en el encabezado", async () => {
  process.env.HENRIKDEV_API_KEY = "HDEV-test";
  const calls = [];
  const v = await fetchValStats("Jagger#LAS", { fetchImpl: api(calls), now: NOW });
  assert.equal(calls.length, 3); assert.ok(calls.every((c) => c.key === "HDEV-test" && !c.url.includes("HDEV")));
  assert.match(calls[1].url, /\/v3\/mmr\/latam\/pc\/Jagger\/LAS$/); assert.match(calls[2].url, /stored-matches\/latam\/Jagger\/LAS\?mode=competitive&size=20$/);
  assert.equal(v.rank, "Ascendant 1"); assert.equal(v.rr, 45); assert.equal(v.peak.rank, "Immortal 1"); assert.equal(v.season.games, 52); assert.equal(v.recent.games, 3);
  const calls2 = []; await fetchValStats("Jagger#LAS", { fetchImpl: api(calls2), prev: v, now: NOW });
  assert.equal(calls2.length, 2, "con la región guardada no vuelve a pedir la cuenta");
});

test("quién toca actualizar y qué pasa con errores y límites", async () => {
  process.env.HENRIKDEV_API_KEY = "HDEV-test";
  const players = { p1: { ign: "Uno#LAS" }, p2: { ign: "Dos#LAS" }, p3: { name: "Sin" }, p4: { ign: "Cuatro#LAS" } };
  const stats = { p1: { ign: "Uno#LAS", ok: true, at: NOW - 10 * 60e3 }, p2: { ign: "Dos#LAS", ok: true, at: NOW - 3 * 3600e3 }, p4: { ign: "Viejo#LAS", ok: true, at: NOW } };
  assert.deepEqual(pickDue(players, stats, { now: NOW }).map((x) => x.pid).sort(), ["p2", "p4"], "p1 está fresco, p3 no tiene Riot ID, p4 cambió de Riot ID");
  const db = fakeDb(), calls = [];
  const r = await refreshMany(db, [{ pid: "p2", ign: "Dos#LAS" }, { pid: "p9", ign: "Nadie#LAS" }], { fetchImpl: api(calls, { account: null }), now: NOW });
  assert.equal(db._get("valstats/p2").rank, "Ascendant 1");
  const bad = fakeDb(); const nf = async () => ({ ok: false, status: 404, json: async () => ({}) });
  const r2 = await refreshMany(bad, [{ pid: "p9", ign: "Nadie#LAS" }], { fetchImpl: nf, now: NOW });
  assert.equal(r2.err, 1); assert.equal(bad._get("valstats/p9").code, "notfound");
  const lim = fakeDb(); const rl = async () => ({ ok: false, status: 429, json: async () => ({}) });
  const r3 = await refreshMany(lim, [{ pid: "a", ign: "Aaa#LAS" }, { pid: "b", ign: "Bbb#LAS" }, { pid: "c", ign: "Ccc#LAS" }, { pid: "d", ign: "Ddd#LAS" }], { fetchImpl: rl, now: NOW });
  assert.equal(r3.stopped, "rate"); assert.equal(lim._get("valstats/d"), undefined, "con el límite para y sigue la próxima vez");
  delete process.env.HENRIKDEV_API_KEY;
});
