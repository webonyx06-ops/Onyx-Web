// Cerrar la temporada. Ruta: /api/season (POST) — solo ultra staff.
// { action: "close", archive, carry, next: { season }, opts: { coins, keepRosters } }
//   1. Copia de seguridad completa (si no se puede hacer, no se cierra nada).
//   2. Guarda el archivo de la temporada en seasons/<id> (tabla final, campeón, premios y estadísticas de cada jugador).
//   3. Deja la liga lista para la temporada nueva: sin partidos, sorteos, fichajes, mapas usados ni estadísticas;
//      fair play en 100; coins de los equipos (si se eligió un valor); el saldo de canjes de cada jugador pasa a la temporada nueva.
// No toca: jugadores (salvo que se pida dejar a todos libres), equipos, logos, premios, coaches, sueldos, cuentas, ONYX Bot.
import { initAdmin } from "../lib/admin.mjs";
import { json, whoIs, readBody } from "../lib/auth.mjs";
import { dumpAll, saveBackup } from "../lib/backup.mjs";
import { buildSnapshot } from "../lib/publish.mjs";

const WIPE = ["matches", "draws", "transfers", "mappicks", "mapclaims", "results", "resultimg", "att", "perf", "pickem", "votes", "motions", "playoffs"];
const slug = (s) => String(s || "temporada").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "temporada";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Usá POST." });
  let admin;
  try { admin = initAdmin(); } catch (e) { return json(500, { error: e.message }); }
  const who = await whoIs(req, admin);
  if (!who || !who.ultra) return json(403, { error: "Cerrar la temporada es solo para ultra staff." });
  const db = admin.firestore(), now = Date.now();
  try {
    const b = await readBody(req, 3e6);
    if (b.action !== "close") return json(400, { error: "Acción desconocida." });
    const arch = b.archive || {}, next = String((b.next || {}).season || "").trim().slice(0, 40), opts = b.opts || {};
    if (!next) return json(400, { error: "Poné el nombre de la temporada nueva." });
    if (!arch.name || !Array.isArray(arch.standings)) return json(400, { error: "Falta el resumen de la temporada." });
    const archTxt = JSON.stringify(arch);
    if (archTxt.length > 850000) return json(413, { error: "El resumen de la temporada es demasiado grande." });

    // 1. copia
    let pre = null;
    try { pre = await saveBackup(await dumpAll(db, now), { kind: "auto", reason: `Antes de cerrar ${arch.name}`, by: who.u }); }
    catch (e) { if (!b.force) return json(503, { error: `No se pudo hacer la copia de seguridad (${e.message}). No se cerró nada.`, noBackup: true }); }

    // 2. archivo
    const id = `${slug(arch.name)}-${new Date(now - 3 * 3600000).toISOString().slice(0, 10)}`;
    await db.doc(`seasons/${id}`).set({ ...arch, id, closedAt: now, closedBy: who.u, next });

    // 3. limpieza, en tandas
    let batch = db.batch(), ops = 0, count = 0;
    const add = async (fn) => { fn(batch); ops++; count++; if (ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; } };
    for (const c of WIPE) { const s = await db.collection(c).get(); for (const d of s.docs) await add((x) => x.delete(d.ref)); }
    for (const p of ["public/pickagg", "public/pickboard"]) await add((x) => x.delete(db.doc(p)));
    const teams = await db.collection("teams").get();
    for (const d of teams.docs) {
      const upd = { used: [], picked: {}, adj: {}, fp: 100 };
      if (Number.isFinite(+opts.coins) && opts.coins !== null && opts.coins !== "") upd.coins = Math.max(0, Math.round(+opts.coins));
      if (opts.keepRosters === false) { upd.captain = null; upd.sub = null; }
      await add((x) => x.set(d.ref, upd, { merge: true }));
    }
    if (opts.keepRosters === false) { const ps = await db.collection("players").get(); for (const d of ps.docs) await add((x) => x.update(d.ref, { team: null })); }
    // canjes ya resueltos de jugadores: quedan en el historial pero no cuentan para el saldo nuevo
    const rd = await db.collection("redeems").get();
    for (const d of rd.docs) { const r = d.data(); if (!r.coach && !r.arch && (r.status === "ok" || r.status === "no")) await add((x) => x.update(d.ref, { arch: id })); }
    // saldo de canjes que pasa a la temporada nueva
    for (const [pid, v] of Object.entries(b.carry || {}).slice(0, 500)) {
      const n = Math.round(+v || 0); if (n <= 0 || !/^[A-Za-z0-9_\-]{1,40}$/.test(pid)) continue;
      await add((x) => x.set(db.doc(`perf/${pid}`), { pts: [{ id: "carry", v: n, why: `Saldo de ${arch.name}`, at: now }] }));
    }
    await add((x) => x.set(db.doc("league/config"), { season: next, credited: [], nextDate: "", awards: {}, seasonStart: now }, { merge: true }));
    if (ops) await batch.commit();
    await db.collection("audit").add({ at: now, uid: who.uid, u: who.u, role: who.role, txt: `Cerró ${arch.name} (campeón: ${arch.championName || "sin definir"}) y empezó ${next}. ${count} cambios. Copia previa: ${pre ? pre.key : "no se pudo"}` });
    const snap = await buildSnapshot(db).catch((e) => ({ error: e.message }));
    return json(200, { id, changes: count, backup: pre ? pre.key : null, rev: snap.rev });
  } catch (e) {
    console.error("season:", e);
    return json(e.status || 500, { error: String(e.message || e) });
  }
};

export const config = { path: "/api/season" };
