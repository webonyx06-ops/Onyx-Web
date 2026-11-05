// Seguimiento de los coaches. Ruta: /api/coach (POST, con sesión)
//   { action: "list" }                                   coach: sus notas y sus equipos
//   { action: "save", id?, team, pid?, text, vis, kind } coach: crea o edita una nota
//   { action: "del", id }                                coach: borra una nota suya
//   { action: "mine" }                                   jugador vinculado: notas de su coach para él y para su equipo
import { initAdmin } from "../lib/admin.mjs";
import { json, whoIs, readBody } from "../lib/auth.mjs";
import { saveNote, deleteNote, coachNotes, playerNotes } from "../lib/coaching.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Usá POST." });
  let admin;
  try { admin = initAdmin(); } catch (e) { return json(500, { error: e.message }); }
  const who = await whoIs(req, admin);
  if (!who) return json(401, { error: "Tu sesión no es válida. Volvé a entrar." });
  const db = admin.firestore(), now = Date.now();
  try {
    const b = await readBody(req, 20000), A = b.action;
    if (A === "list") return json(200, await coachNotes(db, who));
    if (A === "save") return json(200, await saveNote(db, who, b, { now }));
    if (A === "del") return json(200, await deleteNote(db, who, b.id));
    if (A === "mine") return json(200, await playerNotes(db, who));
    return json(400, { error: "Acción desconocida." });
  } catch (e) {
    if (!e.status) console.error("coach:", e);
    return json(e.status || 500, { error: String(e.message || e) });
  }
};

export const config = { path: "/api/coach" };
