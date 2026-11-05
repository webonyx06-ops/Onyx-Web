// Carga de resultados por captura. Ruta: /api/results (POST)
//   { action: "read", mid, image }   → lee la captura con IA y propone marcador, mapa y estadísticas (capitanes del partido y staff)
//   { action: "submit", mid, ra, rb, map, stats, img?, note? } → el capitán manda su resultado; si coincide con el del rival, se carga solo
//   { action: "check", mid }         → staff: vuelve a comparar los dos envíos
import { initAdmin } from "../lib/admin.mjs";
import { json, whoIs, readBody } from "../lib/auth.mjs";
import { readScoreboard, mapToMatch, aiConfigured, AiError } from "../lib/scoreboard.mjs";
import { cleanSubmission, tryAuto, resCfg } from "../lib/results.mjs";
import { patchSnapshot } from "../lib/publish.mjs";
import { afterPatch } from "../lib/pickem.mjs";
import { loadSnapshot, clearSnapshotCache } from "../lib/fsrest.mjs";

const ART = -3 * 3600000;
const day = (now) => new Date(now + ART).toISOString().slice(0, 10);

async function players(db) {
  try { const s = await loadSnapshot({ maxAge: 5000 }); if (s && s.players) return s.players; } catch (_) { /* sigue */ }
  const q = await db.collection("players").get(); return Object.fromEntries(q.docs.map((d) => [d.id, d.data()]));
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Usá POST." });
  let admin;
  try { admin = initAdmin(); } catch (e) { return json(500, { error: e.message }); }
  const who = await whoIs(req, admin);
  if (!who || !(who.staff || who.captain)) return json(401, { error: "Entrá con tu cuenta de capitán o de staff." });
  const db = admin.firestore(), now = Date.now();
  try {
    const b = await readBody(req, 9e6);
    const mid = String(b.mid || "");
    if (!/^[A-Za-z0-9_\-]{1,40}$/.test(mid)) return json(400, { error: "Partido inválido." });
    const ms = await db.doc(`matches/${mid}`).get();
    if (!ms.exists) return json(404, { error: "Ese partido no existe." });
    const m = ms.data();
    const team = who.staff ? null : who.team;
    if (!who.staff && team !== m.a && team !== m.b) return json(403, { error: "Ese partido no es de tu equipo." });
    const cfgS = await db.doc("league/config").get(), cfg = cfgS.exists ? cfgS.data() : {}, R = resCfg(cfg);

    if (b.action === "read") {
      if (!aiConfigured()) return json(501, { error: who.staff ? "La lectura automática todavía no está activada: falta cargar GEMINI_API_KEY (gratis, de Google AI Studio) en Netlify y volver a publicar." : "La lectura automática todavía no está activada.", noAi: true });
      if (!R.ai) return json(403, { error: "La lectura automática está apagada (Panel → General)." });
      // límite por persona y por día
      const lim = db.doc(`ailimit/${who.uid}_${day(now)}`);
      const used = await db.runTransaction(async (tx) => { const s = await tx.get(lim), n = (s.exists ? +s.data().n : 0) || 0; if (n >= R.aiDaily) return -1; tx.set(lim, { n: n + 1, at: now, u: who.u || who.uid }); return n + 1; });
      if (used < 0) return json(429, { error: `Llegaste al máximo de ${R.aiDaily} lecturas por día.` });
      const read = await readScoreboard(b.image);
      const P = await players(db);
      const list = Object.entries(P).map(([id, p]) => ({ id, name: p.name, ign: p.ign || "", team: p.team || null }));
      return json(200, { ...mapToMatch(read, m, list), left: R.aiDaily - used });
    }

    if (b.action === "submit") {
      if (who.staff) return json(400, { error: "El staff carga el resultado directo en el partido." });
      if (m.status === "played") return json(409, { error: "Ese partido ya está cargado. Si hay un error, avisale al staff." });
      const P = await players(db), clean = cleanSubmission(b, m, P);
      let hasImg = false;
      if (typeof b.img === "string" && b.img.startsWith("data:image/")) {
        if (b.img.length > 950000) return json(413, { error: "La captura es demasiado pesada." });
        await db.doc(`resultimg/${mid}_${team}`).set({ data: b.img, at: now, by: who.u });
        hasImg = true;
      }
      const prev = await db.doc(`results/${mid}_${team}`).get();
      if (prev.exists && ["auto", "ok"].includes(prev.data().status)) return json(409, { error: "Tu resultado ya fue aprobado." });
      await db.doc(`results/${mid}_${team}`).set({ mid, team, fecha: +m.fecha || 1, ...clean, by: who.uid, u: who.u, at: now, status: "pend", hasImg: hasImg || !!(prev.exists && prev.data().hasImg), check: "" });
      const label = (k) => String(k).toUpperCase();
      const r = await tryAuto(db, mid, { cfg, now, audit: (mm, x) => ({ at: now, uid: "servidor", u: "servidor", role: "auto", txt: `Resultado cargado solo (los dos capitanes coincidieron): F${mm.fecha} ${label(mm.a)} ${x.ra}-${x.rb} ${label(mm.b)}${x.map ? " · " + x.map : ""}` }) });
      if (r.applied) { clearSnapshotCache(); const p = await patchSnapshot(db, [`matches/${mid}`]); await afterPatch(db, p).catch(() => {}); }
      return json(200, { status: r.applied ? "auto" : "pend", why: r.why || "" });
    }

    if (b.action === "check") {
      if (!who.staff) return json(403, { error: "Solo staff." });
      const r = await tryAuto(db, mid, { cfg: { ...cfg, results: { ...R, auto: true } }, now, audit: (mm, x) => ({ at: now, uid: who.uid, u: who.u, role: who.role, txt: `Aprobó el resultado que mandaron los dos capitanes: F${mm.fecha} ${String(mm.a).toUpperCase()} ${x.ra}-${x.rb} ${String(mm.b).toUpperCase()}` }) });
      if (r.applied) { const p = await patchSnapshot(db, [`matches/${mid}`]); await afterPatch(db, p).catch(() => {}); }
      return json(200, { applied: !!r.applied, why: r.why || "" });
    }
    return json(400, { error: "Acción desconocida." });
  } catch (e) {
    if (!(e instanceof AiError) && !e.status) console.error("results:", e);
    return json(e.status || 500, { error: String((who.staff && e.staffMsg) || e.message || e) });
  }
};

export const config = { path: "/api/results" };
