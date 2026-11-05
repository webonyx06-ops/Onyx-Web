// Quién está llamando a una función: staff, ultra staff, capitán, o jugador/coach que entró con Discord o con su mail.
// Verifica el token de Firebase que manda la página (Authorization: Bearer <token>).
export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

export async function whoIs(req, admin) {
  const h = req.headers.get("authorization") || "";
  if (!h.startsWith("Bearer ")) return null;
  let dec;
  try { dec = await admin.auth().verifyIdToken(h.slice(7)); } catch (_) { return null; }
  const db = admin.firestore(), uid = dec.uid;
  if (dec.discord || /^e_[a-f0-9]{24}$/.test(uid)) { // cuenta de jugador o coach (entró con Discord o con su mail)
    const m = await db.doc(`members/${uid}`).get();
    const d = m.exists ? m.data() : {};
    if (d.banned || (!dec.discord && !m.exists)) return null;
    return { uid, kind: "member", discord: dec.discord ? String(dec.discord) : null, name: d.name || "", avatar: d.avatar || "", pid: d.pid || null, role: d.role || "player", coachId: d.coachId || null, member: d };
  }
  const s = await db.doc(`staff/${uid}`).get();
  if (s.exists && s.data().active !== false) { const d = s.data(); return { uid, kind: d.role === "ultra" ? "ultra" : "staff", staff: true, ultra: d.role === "ultra", u: d.u, role: d.role }; }
  const c = await db.doc(`captains/${uid}`).get();
  if (c.exists && c.data().active !== false) { const d = c.data(); return { uid, kind: "captain", captain: true, u: d.u, team: d.team || null }; }
  return null;
}

export async function readBody(req, max = 8e6) {
  const txt = await req.text();
  if (txt.length > max) { const e = new Error("El pedido es demasiado grande."); e.status = 413; throw e; }
  try { return txt ? JSON.parse(txt) : {}; } catch (_) { const e = new Error("El pedido no es un JSON válido."); e.status = 400; throw e; }
}
