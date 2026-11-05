// Crear cuenta con mail y contraseña (jugadores y coaches). Ruta: /api/register (POST, sin sesión)
//   { name, email, password, role: "player" | "coach", team?, note? }
// La cuenta la crea el servidor (así queda marcada como jugador/coach y no puede pasar por staff ni capitán).
// Los coaches quedan con un pedido para su equipo: lo aprueba el capitán de ese equipo o el staff.
import { initAdmin } from "../lib/admin.mjs";
import { json, readBody } from "../lib/auth.mjs";
import { createMemberAccount, signupLimit } from "../lib/coaching.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Usá POST." });
  let admin;
  try { admin = initAdmin(); } catch (e) { return json(500, { error: e.message }); }
  const db = admin.firestore(), now = Date.now();
  try {
    const b = await readBody(req, 5000);
    const cfg = await db.doc("league/config").get();
    if (cfg.exists && cfg.data().signupOff) return json(403, { error: "Por ahora no se pueden crear cuentas nuevas. Entrá con Discord o hablá con el staff." });
    const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "?";
    if (!(await signupLimit(db, ip, now))) return json(429, { error: "Se crearon muchas cuentas desde esta conexión hoy. Probá mañana." });
    const teams = Object.fromEntries((await db.collection("teams").get()).docs.map((d) => [d.id, d.data()]));
    const r = await createMemberAccount(db, admin.auth(), b, { now, teams });
    return json(200, r);
  } catch (e) {
    if (!e.status) console.error("register:", e);
    return json(e.status || 500, { error: e.status ? String(e.message) : "No se pudo crear la cuenta. Probá de nuevo." });
  }
};

export const config = { path: "/api/register" };
