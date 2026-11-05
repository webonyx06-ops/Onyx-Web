// Resultados por captura: validación, comparación de los dos envíos, carga automática y lectura de la IA
import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeDb } from "./helpers/fakedb.mjs";
import { cleanSubmission, agree, tryAuto, enoughStats } from "../netlify/lib/results.mjs";
import { extractJson, cleanRead, nameSim, matchRows, mapToMatch, readScoreboard } from "../netlify/lib/scoreboard.mjs";

const M = { fecha: 3, a: "onyx", b: "orion", status: "pending" };
const P = Object.fromEntries([..."abcde"].map((x, i) => [`o${i}`, { name: `Onyx${x}`, team: "onyx" }]).concat([..."abcde"].map((x, i) => [`r${i}`, { name: `Orion${x}`, team: "orion" }])));
const stats = () => Object.fromEntries(Object.keys(P).map((id, i) => [id, { k: 10 + i, d: 8, a: 3, acs: 200 + i, t: P[id].team }]));

test("valida el marcador", () => {
  assert.throws(() => cleanSubmission({ ra: 13, rb: 13 }, M, P), /empatado/);
  assert.throws(() => cleanSubmission({ ra: 10, rb: 8 }, M, P), /nadie llegó a 13/);
  assert.throws(() => cleanSubmission({ ra: 16, rb: 13 }, M, P), /por 2/);
  const ok = cleanSubmission({ ra: 14, rb: 12, stats: { ...stats(), zz: { k: 1, d: 1, a: 1, acs: 1 } }, map: "Bind" }, M, P);
  assert.equal(ok.ot, true); assert.ok(!ok.stats.zz, "ignora jugadores que no existen");
  assert.equal(cleanSubmission({ ra: 13, rb: 12 }, M, P).ot, true, "13-12 (muerte súbita) cuenta como prórroga");
  assert.equal(Object.keys(ok.stats).length, 10);
});

test("compara los dos envíos", () => {
  const x = { ra: 13, rb: 9, map: "Bind", stats: stats() }, y = { ra: 13, rb: 9, map: null, stats: stats() };
  y.stats.o0.acs += 2; // diferencia chica de ACS: se tolera
  const g = agree(x, y);
  assert.ok(g.ok); assert.equal(g.merged.map, "Bind");
  assert.ok(enoughStats(g.merged, M));
  assert.match(agree(x, { ...y, rb: 8 }).why, /marcadores/);
  const z = { ...y, stats: stats() }; z.stats.r1.k = 99;
  const g2 = agree(x, z); assert.ok(!g2.ok); assert.deepEqual(g2.diffs, ["r1"]);
});

test("si los dos capitanes coinciden, el partido se carga solo", async () => {
  const db = fakeDb({ "matches/m1": M });
  const sub = (team) => ({ mid: "m1", team, ra: 13, rb: 9, ot: false, map: "Bind", stats: stats(), status: "pend" });
  await db.doc("results/m1_onyx").set(sub("onyx"));
  let r = await tryAuto(db, "m1", { cfg: {} });
  assert.equal(r.applied, false); assert.match(r.why, /otro capitán/);
  await db.doc("results/m1_orion").set(sub("orion"));
  r = await tryAuto(db, "m1", { cfg: {}, audit: () => ({ txt: "auto" }) });
  assert.equal(r.applied, true);
  const m = db._get("matches/m1");
  assert.equal(m.status, "played"); assert.equal(m.ra, 13); assert.equal(Object.keys(m.stats).length, 10);
  assert.equal(db._get("results/m1_onyx").status, "auto");
  assert.ok(Object.keys(db._coll("audit")).length === 1);
});

test("con la carga automática apagada o si no coinciden, espera al staff", async () => {
  const db = fakeDb({ "matches/m1": M });
  await db.doc("results/m1_onyx").set({ ra: 13, rb: 9, stats: stats(), status: "pend" });
  await db.doc("results/m1_orion").set({ ra: 13, rb: 9, stats: stats(), status: "pend" });
  let r = await tryAuto(db, "m1", { cfg: { results: { auto: false } } });
  assert.equal(r.applied, false); assert.match(r.why, /apagada/);
  await db.doc("results/m1_orion").update({ rb: 10 });
  r = await tryAuto(db, "m1", { cfg: {} });
  assert.equal(r.applied, false); assert.match(db._get("results/m1_onyx").check, /no coinciden/);
  assert.equal(db._get("matches/m1").status, "pending");
});

test("lee el JSON de la respuesta de la IA", () => {
  const j = extractJson('Acá va:\n{"map":"Bind","teams":[{"score":13,"players":[{"name":"Jagger#LAS","k":"20","d":10,"a":5,"acs":250}]},{"score":9,"players":[]}],"ot":false,"confidence":"high","notes":"{ok}"}\nlisto');
  const c = cleanRead(j);
  assert.equal(c.map, "Bind"); assert.equal(c.teams[0].players[0].name, "Jagger"); assert.equal(c.teams[0].players[0].k, 20);
  assert.throws(() => cleanRead({ error: "not_scoreboard" }), /no parece/);
});

test("empareja nombres del marcador con los jugadores", () => {
  assert.equal(nameSim("Jägger", "jagger"), 1);
  assert.ok(nameSim("xX_Nova_Xx", "Nova") >= 0.6);
  assert.ok(nameSim("Polaris", "Bruno") < 0.5);
  const out = matchRows([{ name: "NOVA" }, { name: "jaggerr" }, { name: "Desconocido" }], [{ id: "a", name: "Jagger" }, { id: "b", name: "Nova" }, { id: "c", name: "Leo", ign: "Desconocido#123" }]);
  assert.deepEqual(out.map((x) => x.pid), ["b", "a", "c"]);
});

test("ubica cada equipo del marcador como A o B aunque vengan al revés", () => {
  const players = Object.entries(P).map(([id, p]) => ({ id, ...p }));
  const read = { map: "Bind", ot: null, confidence: "high", notes: "", teams: [
    { score: 9, players: [..."abcde"].map((x) => ({ name: `Orion${x}`, k: 5, d: 9, a: 1, acs: 150 })) },
    { score: 13, players: [..."abcde"].map((x) => ({ name: `Onyx${x}`, k: 15, d: 7, a: 4, acs: 260 })) }] };
  const r = mapToMatch(read, M, players);
  assert.equal(r.ra, 13); assert.equal(r.rb, 9); assert.equal(r.ot, false); assert.ok(r.sidesSure);
  assert.ok(r.rows.filter((x) => x.side === "a").every((x) => x.pid && x.pid.startsWith("o")));
});

test("llama a la API de Anthropic con la imagen y el formato correcto", async () => {
  process.env.ANTHROPIC_API_KEY = "k-test";
  let sent = null;
  const fetchImpl = async (url, o) => { sent = { url, o: { ...o, body: JSON.parse(o.body) } }; return { ok: true, status: 200, json: async () => ({ content: [{ type: "text", text: '{"map":null,"teams":[{"score":13,"players":[]},{"score":5,"players":[]}],"ot":false,"confidence":"low","notes":""}' }] }) }; };
  const r = await readScoreboard("data:image/png;base64,iVBORw0KGgo=", { fetchImpl });
  assert.equal(sent.url, "https://api.anthropic.com/v1/messages");
  assert.equal(sent.o.headers["anthropic-version"], "2023-06-01");
  assert.equal(sent.o.headers["x-api-key"], "k-test");
  const c = sent.o.body.messages[0].content;
  assert.equal(c[0].type, "image"); assert.equal(c[0].source.media_type, "image/png"); assert.equal(c[1].type, "text");
  assert.equal(r.teams[1].score, 5);
  const bad = async () => ({ ok: false, status: 401, json: async () => ({ error: { type: "authentication_error" } }) });
  await assert.rejects(readScoreboard("data:image/png;base64,iVBORw0KGgo=", { fetchImpl: bad }), (e) => /no está disponible/.test(e.message) && /ANTHROPIC_API_KEY/.test(e.staffMsg) && !/authentication_error/.test(e.message));
  const bad2 = async () => ({ ok: false, status: 400, json: async () => ({ error: { type: "invalid_request_error", message: "Your credit balance is too low (org xyz)" } }) });
  await assert.rejects(readScoreboard("data:image/png;base64,iVBORw0KGgo=", { fetchImpl: bad2 }), (e) => !/credit|org/.test(e.message + e.staffMsg));
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(readScoreboard("data:image/png;base64,iVBORw0KGgo="), /no está activada/);
});

test("Gemini (gratis): manda la imagen, prueba otro modelo si uno no existe o se quedó sin cupo, y no muestra datos de la cuenta", async () => {
  delete process.env.ANTHROPIC_API_KEY; process.env.GEMINI_API_KEY = "g-test"; delete process.env.GEMINI_MODEL;
  const IMG = "data:image/png;base64,iVBORw0KGgo=";
  const okBody = { candidates: [{ content: { parts: [{ text: '{"map":"Bind","teams":[{"score":13,"players":[{"name":"Jagger#LAS","acs":250,"k":20,"d":10,"a":5}]},{"score":7,"players":[]}],"ot":false,"confidence":"high","notes":""}' }] } }] };
  const calls = [];
  const fetchImpl = async (url, o) => {
    calls.push({ url, o: { ...o, body: JSON.parse(o.body) } });
    if (calls.length === 1) return { ok: false, status: 404, json: async () => ({ error: { code: 404, status: "NOT_FOUND", message: "models/x is not found" } }) };
    if (calls.length === 2) return { ok: false, status: 429, json: async () => ({ error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for project 123456" } }) };
    return { ok: true, status: 200, json: async () => okBody };
  };
  const r = await readScoreboard(IMG, { fetchImpl });
  assert.equal(calls.length, 3, "probó tres modelos");
  assert.match(calls[0].url, /^https:\/\/generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-[^/]+:generateContent$/);
  assert.ok(!calls[0].url.includes("g-test"), "la clave no va en la dirección");
  assert.equal(calls[0].o.headers["x-goog-api-key"], "g-test");
  const parts = calls[0].o.body.contents[0].parts;
  assert.equal(parts[0].inline_data.mime_type, "image/png"); assert.equal(parts[0].inline_data.data, "iVBORw0KGgo="); assert.equal(typeof parts[1].text, "string");
  assert.equal(r.map, "Bind"); assert.equal(r.teams[0].score, 13); assert.equal(r.teams[0].players[0].name, "Jagger");
  // clave mala: mensaje general para todos, pista solo para el staff, sin datos de la cuenta
  const bad = async () => ({ ok: false, status: 400, json: async () => ({ error: { code: 400, status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key. project 999" } }) });
  await assert.rejects(readScoreboard(IMG, { fetchImpl: bad }), (e) => /no está disponible/.test(e.message) && /GEMINI_API_KEY/.test(e.staffMsg) && !/project|999/.test(e.message + e.staffMsg));
  // todos sin cupo
  const quota = async () => ({ ok: false, status: 429, json: async () => ({ error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for project 123456" } }) });
  await assert.rejects(readScoreboard(IMG, { fetchImpl: quota }), (e) => e.status === 429 && /cupo/.test(e.staffMsg) && !/123456/.test(e.message + e.staffMsg));
  // modelo elegido a mano va primero
  process.env.GEMINI_MODEL = "gemini-propio"; const seen = [];
  await readScoreboard(IMG, { fetchImpl: async (url) => { seen.push(url); return { ok: true, status: 200, json: async () => okBody }; } });
  assert.match(seen[0], /models\/gemini-propio:generateContent$/);
  // con las dos claves: si Claude falla por la cuenta, sigue con Gemini
  process.env.ANTHROPIC_API_KEY = "k-test"; delete process.env.GEMINI_MODEL; const order = [];
  const both = async (url) => { order.push(url.includes("anthropic") ? "claude" : "gemini"); return url.includes("anthropic") ? { ok: false, status: 401, json: async () => ({ error: { type: "authentication_error" } }) } : { ok: true, status: 200, json: async () => okBody }; };
  const r2 = await readScoreboard(IMG, { fetchImpl: both });
  assert.deepEqual(order, ["claude", "gemini"]); assert.equal(r2.map, "Bind");
  delete process.env.ANTHROPIC_API_KEY; delete process.env.GEMINI_API_KEY;
});
