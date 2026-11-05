// Lee la cuenta de servicio de Firebase desde Netlify (sin cargar firebase-admin, para que sea rápido).
export function readServiceAccount() {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || !raw.trim()) {
    const pid = process.env.FIREBASE_PROJECT_ID, email = process.env.FIREBASE_CLIENT_EMAIL, key = process.env.FIREBASE_PRIVATE_KEY;
    if (pid && email && key) return { project_id: pid, client_email: email, private_key: key.replace(/\\n/g, "\n") };
    const e = new Error("Falta FIREBASE_SERVICE_ACCOUNT en Netlify."); e.kind = "missing"; throw e;
  }
  raw = raw.trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"') && !raw.startsWith('"{'))) raw = raw.slice(1, -1).trim();
  if (!raw.startsWith("{")) { try { raw = Buffer.from(raw, "base64").toString("utf8").trim(); } catch (_) { /* sigue */ } }
  let sa;
  try { sa = JSON.parse(raw); } catch (_) { const e = new Error("FIREBASE_SERVICE_ACCOUNT no es un JSON válido."); e.kind = "badjson"; throw e; }
  if (!sa.private_key || !sa.client_email || !sa.project_id) { const e = new Error("FIREBASE_SERVICE_ACCOUNT está incompleta."); e.kind = "incomplete"; throw e; }
  sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
}

export function projectId() {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  try { return readServiceAccount().project_id; } catch (_) { return "onyx-237a9"; }
}
