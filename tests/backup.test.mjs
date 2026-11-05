// Copias de seguridad: copia completa, lista, recorte de copias viejas y restauración
import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeDb } from "./helpers/fakedb.mjs";
import { dumpAll, saveBackup, listBackups, readBackup, restoreAll, countDocs, dec } from "../netlify/lib/backup.mjs";

function fakeStore() {
  const m = new Map();
  return {
    set: async (k, v, o = {}) => { m.set(k, { v, md: o.metadata || {} }); },
    get: async (k) => (m.has(k) ? m.get(k).v : null),
    getMetadata: async (k) => (m.has(k) ? { metadata: m.get(k).md } : null),
    list: async (o = {}) => ({ blobs: [...m.keys()].filter((k) => !o.prefix || k.startsWith(o.prefix)).map((key) => ({ key })) }),
    delete: async (k) => { m.delete(k); },
    _m: m,
  };
}

test("copia todo menos capturas y el resumen; restaura sin tocar cuentas ni auditoría", async () => {
  const db = fakeDb({
    "matches/m1": { fecha: 1, status: "played", ra: 13, rb: 2 }, "players/p1": { name: "Jagger" },
    "staff/u1": { u: "ultra1", role: "ultra" }, "audit/a1": { txt: "x" }, "resultimg/m1_onyx": { data: "data:..." },
    "public/snapshot": { json: "{}" }, "public/pickagg": { m1: { a: 1 } }, "league/config": { season: "T1" },
  });
  const store = fakeStore();
  const d = await dumpAll(db, 1700000000000);
  assert.ok(!d.colls.resultimg && !("snapshot" in (d.colls.public || {})), "sin capturas ni resumen");
  assert.ok(d.colls.public.pickagg, "los contadores sí");
  assert.equal(countDocs(d), 6);
  const r = await saveBackup(d, { kind: "manual", reason: "prueba", by: "ultra1", store });
  assert.match(r.key, /^manual\/2023-11-14T22-13-20Z$/);
  const list = await listBackups(store);
  assert.equal(list[0].reason, "prueba"); assert.equal(list[0].docs, 6);
  // se rompe todo
  await db.doc("matches/m1").delete(); await db.doc("matches/m9").set({ basura: true });
  await db.doc("players/p1").update({ name: "Roto" }); await db.doc("staff/u1").update({ role: "staff" });
  const done = await restoreAll(db, JSON.parse(await readBackup(r.key, store)));
  assert.equal(db._get("matches/m1").ra, 13); assert.equal(db._get("matches/m9"), undefined, "borra lo que no estaba");
  assert.equal(db._get("players/p1").name, "Jagger");
  assert.equal(db._get("staff/u1").role, "staff", "las cuentas no se pisan");
  assert.ok(done.matches && !done.staff && !done.audit);
  await assert.rejects(readBackup("../../etc/passwd", store), /no existe/);
  await assert.rejects(restoreAll(db, { colls: {} }), /no es una copia/);
});

test("guarda las últimas 30 diarias", async () => {
  const store = fakeStore();
  for (let i = 0; i < 33; i++) await saveBackup({ app: "onyx", at: Date.UTC(2026, 0, 1 + i), colls: {} }, { kind: "daily", store });
  const keys = [...store._m.keys()].sort();
  assert.equal(keys.length, 30); assert.equal(keys[0], "daily/2026-01-04T00-00-00Z");
});

test("fechas de Firestore ida y vuelta", () => {
  const v = dec({ a: { __ts: 5 }, b: [{ __ts: 7 }], c: { __ts: 1, x: 2 } }, { fromMillis: (n) => ({ ms: n }) });
  assert.deepEqual(v, { a: { ms: 5 }, b: [{ ms: 7 }], c: { __ts: 1, x: 2 } });
});
