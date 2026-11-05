// Función de Netlify: maneja las cuentas de staff con privilegios de servidor.
// Ruta pública: /api/staff  (POST, JSON)
//
// Acciones:
//   bootstrap  -> instalación inicial: crea las cuentas de staff y la liga base.
//                 Requiere la clave SETUP_KEY y solo funciona si todavía no hay staff.
//   create     -> crea una cuenta nueva (solo ultra staff).
//   reset      -> genera una contraseña nueva para una cuenta (solo ultra staff).
//   delete     -> borra una cuenta (solo ultra staff).
//
// Variables de entorno en Netlify:
//   FIREBASE_SERVICE_ACCOUNT  JSON completo de la cuenta de servicio de Firebase.
//   SETUP_KEY                 Clave que inventás vos para la instalación inicial.
//   STAFF_EMAIL_DOMAIN        (opcional) dominio interno para los usuarios. Por defecto staff.ligat1.app

import admin from "firebase-admin";
import { randomInt } from "node:crypto";

const DOMAIN = () => process.env.STAFF_EMAIL_DOMAIN || "staff.ligat1.app";
const emailOf = (u) => `${u}@${DOMAIN()}`;
const okUser = (u) => /^[a-z0-9._-]{3,24}$/.test(u);
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function readServiceAccount() {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || !raw.trim()) {
    // Alternativa: tres variables separadas
    const pid = process.env.FIREBASE_PROJECT_ID, email = process.env.FIREBASE_CLIENT_EMAIL, key = process.env.FIREBASE_PRIVATE_KEY;
    if (pid && email && key) return { project_id: pid, client_email: email, private_key: key.replace(/\\n/g, "\n") };
    const e = new Error("missing"); e.kind = "missing"; throw e;
  }
  raw = raw.trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"') && !raw.startsWith('"{'))) raw = raw.slice(1, -1).trim();
  if (!raw.startsWith("{")) {
    try { raw = Buffer.from(raw, "base64").toString("utf8").trim(); } catch (_) { /* sigue abajo */ }
  }
  let sa;
  try { sa = JSON.parse(raw); } catch (_) { const e = new Error("badjson"); e.kind = "badjson"; throw e; }
  if (!sa.private_key || !sa.client_email || !sa.project_id) { const e = new Error("incomplete"); e.kind = "incomplete"; throw e; }
  sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

function initAdmin() {
  if (!admin.apps.length) {
    const sa = readServiceAccount();
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
}

const SETUP_ERRORS = {
  missing: "Netlify no le está pasando la variable FIREBASE_SERVICE_ACCOUNT a la función. Revisá que exista, que su alcance (Scopes) incluya Functions, y volvé a desplegar.",
  badjson: "La variable FIREBASE_SERVICE_ACCOUNT existe pero no es un JSON válido. Volvé a copiar TODO el archivo .json (desde la primera { hasta la última }) y pegalo de nuevo.",
  incomplete: "La variable FIREBASE_SERVICE_ACCOUNT no tiene project_id, client_email o private_key. Asegurate de pegar el archivo .json completo de Cuentas de servicio.",
};

function genPassword() {
  const al = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let c = "";
  for (let i = 0; i < 12; i++) c += al[randomInt(al.length)];
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

async function caller(req) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return null;
  const decoded = await admin.auth().verifyIdToken(token);
  const snap = await admin.firestore().doc(`staff/${decoded.uid}`).get();
  if (!snap.exists) return null;
  const d = snap.data();
  if (d.active === false) return null;
  return { uid: decoded.uid, ...d };
}

async function audit(by, txt) {
  await admin.firestore().collection("audit").add({
    at: Date.now(), uid: by.uid || "sistema", u: by.u || "sistema", role: by.role || "sistema", txt: String(txt).slice(0, 400),
  });
}

// Busca la cuenta en staff y en capitanes. Devuelve { uid, coll, ...datos }.
async function findByUser(u) {
  const db = admin.firestore();
  for (const coll of ["staff", "captains"]) {
    const q = await db.collection(coll).where("u", "==", u).limit(1).get();
    if (!q.empty) return { uid: q.docs[0].id, coll, ...q.docs[0].data() };
  }
  return null;
}
const TEAM_KEYS = ["onyx", "orion", "nexus", "zenith", "vortex", "zyriax", "kyrox"];
// Equipos válidos: los de base que no se quitaron más los que agregó el ultra staff.
async function validTeams() {
  const snap = await admin.firestore().collection("teams").get(), T = {};
  snap.docs.forEach((d) => { T[d.id] = d.data(); });
  return new Set([...TEAM_KEYS.filter((k) => !(T[k] && T[k].hidden)), ...Object.keys(T).filter((k) => T[k].custom && !T[k].hidden)]);
}
const roleName = (r) => r === "ultra" ? "ultra staff" : r === "captain" ? "capitán" : "staff";

async function activeUltras() {
  const q = await admin.firestore().collection("staff").where("role", "==", "ultra").get();
  return q.docs.filter((d) => d.data().active !== false).length;
}

// ---------- liga base (se crea en la instalación si no existe) ----------
const TEAMS = [
  ["onyx", "ONYX", "#7a8ce8", "#d6ccff"], ["orion", "ORION", "#2f7dff", "#9cc9ff"], ["nexus", "NEXUS", "#ff6a1a", "#ffd27a"],
  ["zenith", "ZENITH", "#ff3fa4", "#ffb3da"], ["vortex", "VORTEX", "#22a8ff", "#b9efff"], ["zyriax", "ZYRIAX", "#1ccf52", "#b5ffc8"],
  ["kyrox", "KYROX", "#3a5bff", "#b3c2ff"],
];
const MAPS = ["Ascent", "Bind", "Haven", "Split", "Icebox", "Breeze", "Fracture", "Pearl", "Lotus", "Sunset", "Abyss", "Corrode"];
const RULES = [
  ["Respeto", "Sin insultos, discriminación ni acoso, en la partida, en el chat de voz y en el Discord. Primera vez: advertencia."],
  ["Puntualidad", "Tolerancia de 15 minutos. Pasado ese tiempo, el equipo que no está completo pierde 0-13 por W.O. y resta 1 punto."],
  ["Cuentas", "Cada jugador usa su cuenta registrada. Prohibido el smurf y compartir cuenta: es muy grave."],
  ["Bugs y exploits", "Prohibido usar bugs conocidos. Si pasa sin querer, se avisa y los capitanes acuerdan repetir la ronda."],
  ["Desconexiones", "Cada equipo tiene una pausa técnica de 10 minutos por partido. Si no vuelve, se juega 4 vs 5 o entra el suplente."],
  ["Resultados", "El capitán ganador sube la captura del marcador en 2 h. Si no coincide, se revisa con las capturas de los dos equipos."],
];
function roundRobin(keys) {
  const a = [...keys, null], n = a.length, out = [];
  for (let r = 0; r < n - 1; r++) {
    const ms = [];
    for (let i = 0; i < n / 2; i++) {
      const x = a[i], y = a[n - 1 - i];
      if (x !== null && y !== null) ms.push(r % 2 ? [y, x] : [x, y]);
    }
    out.push(ms);
    a.splice(1, 0, a.pop());
  }
  return out;
}
async function seedLeague(db) {
  const cfgRef = db.doc("league/config");
  if ((await cfgRef.get()).exists) return false;
  const batch = db.batch();
  batch.set(cfgRef, {
    season: "Temporada 1", game: "Valorant", points: { w: 3, otw: 2, otl: 1, l: 0 }, noShow: -1, playoff: 4,
    maps: MAPS.map((n) => ({ n, on: true })), nextDate: "", windowOpen: true, windowClose: "", windowId: 1,
    maxSign: 2, rosterMin: 5, rosterMax: 7, news: [], awards: {}, credited: [],
    rules: RULES.map(([t, d]) => ({ t, d })), coin: { w: 300, otw: 200, otl: 100, mvp: 150, clean: 100 },
  });
  TEAMS.forEach(([k, name, c, l], i) => batch.set(db.doc(`teams/${k}`), {
    name, c, l, order: i, captain: null, sub: null, coins: 6000, fp: 100, used: [], adj: { pts: 0, rf: 0, rc: 0 },
  }));
  roundRobin(TEAMS.map((t) => t[0])).forEach((ms, f) => ms.forEach(([a, b], i) => batch.set(db.doc(`matches/f${f + 1}m${i}`), {
    fecha: f + 1, a, b, date: "", status: "pending", ra: null, rb: null, ot: false, noShow: null, map: null, proj: null, mvp: null, stats: {},
  })));
  await batch.commit();
  return true;
}

async function upsertUser(u, password, role, team = null) {
  const auth = admin.auth(), db = admin.firestore();
  let rec;
  try { rec = await auth.getUserByEmail(emailOf(u)); await auth.updateUser(rec.uid, { password, disabled: false }); }
  catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
    rec = await auth.createUser({ email: emailOf(u), password, displayName: u });
  }
  if (role === "captain") {
    await db.doc(`captains/${rec.uid}`).set({ u, team: team && (await validTeams()).has(team) ? team : null, active: true, createdAt: Date.now() });
  } else {
    await db.doc(`staff/${rec.uid}`).set({ u, role, active: true, createdAt: Date.now() });
  }
  return rec.uid;
}

export default async (req) => {
  if (req.method !== "POST" && req.method !== "GET") return json(405, { error: "Usá POST." });
  if (req.method === "GET") {
    // Diagnóstico rápido: abrí /api/staff en el navegador
    let status = "ok";
    try { initAdmin(); } catch (e) { status = e.kind || "error: " + e.message; }
    return json(200, { funcion: "activa", firebase: status === "ok" ? "conectado" : (SETUP_ERRORS[status] || status), setupKey: process.env.SETUP_KEY ? "cargada" : "no cargada" });
  }
  try { initAdmin(); } catch (e) {
    return json(500, { error: SETUP_ERRORS[e.kind] || ("No se pudo conectar con Firebase: " + e.message) });
  }
  let body;
  try { body = await req.json(); } catch { return json(400, { error: "Pedido inválido." }); }
  const db = admin.firestore(), auth = admin.auth();

  try {
    if (body.action === "bootstrap") {
      const key = process.env.SETUP_KEY;
      if (!key) return json(403, { error: "La instalación está deshabilitada: falta SETUP_KEY en Netlify." });
      if (body.key !== key) return json(403, { error: "Clave de instalación incorrecta." });
      const existing = await db.collection("staff").limit(1).get();
      if (!existing.empty) return json(409, { error: "Ya hay staff creado. Para sumar cuentas, entrá con un ultra staff y usá el panel." });
      const users = Array.isArray(body.users) ? body.users : [];
      if (!users.length || users.length > 100) return json(400, { error: "Mandá entre 1 y 100 cuentas." });
      const clean = users.map((x) => ({ u: String(x.u || "").trim().toLowerCase(), p: String(x.p || ""), role: x.role === "ultra" ? "ultra" : "staff" }));
      const bad = clean.find((x) => !okUser(x.u) || x.p.length < 6);
      if (bad) return json(400, { error: `Cuenta inválida: "${bad.u}". Usuario de 3 a 24 caracteres y contraseña de 6 o más.` });
      if (!clean.some((x) => x.role === "ultra")) return json(400, { error: "Tiene que haber al menos un ultra staff." });
      const created = [];
      for (const x of clean) { await upsertUser(x.u, x.p, x.role); created.push({ u: x.u, role: x.role }); }
      const seeded = await seedLeague(db);
      await audit({ u: "sistema" }, `Instalación: se crearon ${created.length} cuentas de staff${seeded ? " y la liga base" : ""}`);
      return json(200, { ok: true, created, seeded });
    }

    const me = await caller(req).catch(() => null);
    if (!me) return json(401, { error: "Tu sesión de staff no es válida. Volvé a entrar." });
    if (me.role !== "ultra") return json(403, { error: "Solo ultra staff puede manejar cuentas." });

    if (body.action === "create") {
      const u = String(body.u || "").trim().toLowerCase();
      const role = ["ultra", "staff", "captain"].includes(body.role) ? body.role : "staff";
      if (!okUser(u)) return json(400, { error: "El usuario tiene que tener entre 3 y 24 letras, números, punto, guion o guion bajo." });
      if (await findByUser(u)) return json(409, { error: "Ese usuario ya existe." });
      const password = genPassword();
      await upsertUser(u, password, role, body.team || null);
      await audit(me, `Creó la cuenta ${u} (${roleName(role)}${role === "captain" && body.team ? ", equipo " + body.team : ""})`);
      return json(200, { ok: true, u, password });
    }

    if (body.action === "import") {
      const users = Array.isArray(body.users) ? body.users : [];
      if (!users.length || users.length > 60) return json(400, { error: "Mandá entre 1 y 60 cuentas por vez." });
      const created = [], skipped = [], okTeams = await validTeams();
      for (const x of users) {
        const u = String(x.u || "").trim().toLowerCase(), p = String(x.p || "");
        const role = ["ultra", "staff", "captain"].includes(x.role) ? x.role : "staff";
        const team = x.team ? String(x.team).toLowerCase() : null;
        if (!okUser(u)) { skipped.push({ u, why: "usuario inválido" }); continue; }
        if (p.length < 6) { skipped.push({ u, why: "contraseña muy corta" }); continue; }
        if (team && !okTeams.has(team)) { skipped.push({ u, why: "equipo inválido" }); continue; }
        if (await findByUser(u)) { skipped.push({ u, why: "ya existe" }); continue; }
        try { await upsertUser(u, p, role, team); created.push({ u, role }); }
        catch (e) { skipped.push({ u, why: e.message || "error" }); }
      }
      await audit(me, `Importó ${created.length} cuentas (${created.map((c) => c.u).join(", ") || "ninguna"})${skipped.length ? `; salteó ${skipped.length}` : ""}`);
      return json(200, { ok: true, created, skipped });
    }

    if (body.action === "reset") {
      const target = await findByUser(String(body.u || "").toLowerCase());
      if (!target) return json(404, { error: "No existe esa cuenta." });
      const password = genPassword();
      await auth.updateUser(target.uid, { password });
      await auth.revokeRefreshTokens(target.uid);
      await audit(me, `Generó una contraseña nueva para ${target.u} (${target.coll === "captains" ? "capitán" : roleName(target.role)})`);
      return json(200, { ok: true, u: target.u, password });
    }

    if (body.action === "revoke") {
      // Cierra las sesiones abiertas de la cuenta en todos los dispositivos (tarda hasta 1 hora; para cortar ya, desactivala)
      const target = await findByUser(String(body.u || "").toLowerCase());
      if (!target) return json(404, { error: "No existe esa cuenta." });
      await auth.revokeRefreshTokens(target.uid);
      await audit(me, `Cerró las sesiones de ${target.u} en todos los dispositivos`);
      return json(200, { ok: true });
    }

    if (body.action === "delete") {
      const target = await findByUser(String(body.u || "").toLowerCase());
      if (!target) return json(404, { error: "No existe esa cuenta." });
      if (target.coll === "staff" && target.role === "ultra" && target.active !== false && (await activeUltras()) <= 1) {
        return json(409, { error: "Tiene que quedar al menos un ultra staff activo." });
      }
      await auth.deleteUser(target.uid).catch((e) => { if (e.code !== "auth/user-not-found") throw e; });
      await db.doc(`${target.coll}/${target.uid}`).delete();
      await audit(me, `Borró la cuenta ${target.u} (${target.coll === "captains" ? "capitán" : roleName(target.role)})`);
      return json(200, { ok: true });
    }

    return json(400, { error: "Acción desconocida." });
  } catch (e) {
    console.error(e);
    return json(500, { error: "Error del servidor: " + (e.message || "desconocido") });
  }
};

export const config = { path: "/api/staff" };
