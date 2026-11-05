// Lectura de la captura del marcador de VALORANT con IA y emparejado de nombres con los jugadores de la liga.
// Gemini de Google (gratis): GEMINI_API_KEY en Netlify. Modelo: GEMINI_MODEL (si no, prueba los de la lista en orden).
// Claude (pago, opcional): ANTHROPIC_API_KEY. Si están las dos claves, se usa Claude y Gemini queda de respaldo.
// Las claves viven solo en el servidor: a la página vuelve el resultado leído y nunca datos de las cuentas.
const hasGemini = () => !!process.env.GEMINI_API_KEY, hasClaude = () => !!process.env.ANTHROPIC_API_KEY;
export const aiConfigured = () => hasGemini() || hasClaude();
const MODEL = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const GEMINI_MODELS = () => (process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []).concat(["gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]).filter((m, i, a) => a.indexOf(m) === i);

const PROMPT = `You are reading a screenshot of a VALORANT match scoreboard (end of game or the in-game Tab scoreboard).
Return ONLY one JSON object, with no extra text, using exactly this shape:
{"map": string|null, "teams": [{"score": integer|null, "players": [{"name": string, "agent": string|null, "acs": integer|null, "k": integer|null, "d": integer|null, "a": integer|null}]}, {"score": integer|null, "players": [...]}], "ot": boolean|null, "confidence": "high"|"medium"|"low", "notes": string}
Rules:
- Put the two teams in "teams". Players of the same team share the same row color or side (for example teal/green vs red). Each team has up to 5 players.
- "name": the in-game name exactly as written, without the "#tag".
- "k", "d", "a": the K / D / A columns. "acs": Average Combat Score (ACS column).
- "score": rounds won by that team, from the header (for example "13 - 9"). If the header shows only one number for "your" team, still fill both when visible.
- "ot": true when the total of rounds is more than 24 (overtime), false otherwise, null if the score is not visible.
- "map": the map name if it is visible, otherwise null.
- If a value is not visible or you cannot read it with certainty, use null. Never guess numbers.
- If the image is not a VALORANT scoreboard, return {"error": "not_scoreboard"}.
- "notes": short, in Spanish, only if something could not be read.`;

// staffMsg: explicación técnica que ve solo el staff (nunca datos de la cuenta, solo qué revisar)
export class AiError extends Error { constructor(msg, status = 502, staffMsg = "") { super(msg); this.status = status; this.staffMsg = staffMsg; } }

export function parseDataUrl(s) {
  const m = String(s || "").match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new AiError("La imagen no es válida (usá JPG, PNG o WEBP).", 400);
  if (m[2].length > 6.5e6) throw new AiError("La imagen es demasiado pesada.", 413);
  return { mediaType: m[1], data: m[2] };
}

// Saca el primer objeto JSON del texto de la respuesta
export function extractJson(txt) {
  const s = String(txt || ""), i = s.indexOf("{");
  if (i < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true; else if (c === "{") depth++; else if (c === "}") { depth--; if (!depth) { try { return JSON.parse(s.slice(i, j + 1)); } catch (_) { return null; } } }
  }
  return null;
}

const int = (v, max) => { const n = Math.round(+v); return Number.isFinite(n) && n >= 0 && n <= max ? n : null; };
export function cleanRead(j) {
  if (!j || typeof j !== "object") throw new AiError("No pude leer la captura. Probá con otra más nítida.");
  if (j.error) throw new AiError(j.error === "not_scoreboard" ? "La imagen no parece un marcador de VALORANT." : "No pude leer la captura.", 422);
  const teams = (Array.isArray(j.teams) ? j.teams : []).slice(0, 2).map((t) => ({
    score: int((t || {}).score, 40),
    players: (Array.isArray((t || {}).players) ? t.players : []).slice(0, 6).map((p) => ({ name: String((p || {}).name || "").replace(/#.*$/, "").trim().slice(0, 32), agent: (p && p.agent) ? String(p.agent).slice(0, 20) : null, acs: int(p && p.acs, 999), k: int(p && p.k, 99), d: int(p && p.d, 99), a: int(p && p.a, 99) })).filter((p) => p.name),
  }));
  while (teams.length < 2) teams.push({ score: null, players: [] });
  return { map: j.map ? String(j.map).slice(0, 30) : null, teams, ot: typeof j.ot === "boolean" ? j.ot : null, confidence: ["high", "medium", "low"].includes(j.confidence) ? j.confidence : "medium", notes: String(j.notes || "").slice(0, 300) };
}

const NOT_NOW = "La lectura automática no está disponible ahora. Cargá el resultado a mano o avisale al staff.";
const BUSY = "Se leyeron muchas capturas hoy o en este minuto. Esperá un rato o cargá el resultado a mano.";

async function readWithClaude(mediaType, data, fetchImpl) {
  let r;
  try {
    r = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL(), max_tokens: 1500, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data } }, { type: "text", text: PROMPT }] }] }),
    });
  } catch (_) { throw new AiError("No se pudo conectar con el servicio de lectura. Probá de nuevo."); }
  const body = await r.json().catch(() => null);
  if (!r.ok) {
    // El detalle del error queda solo en el registro de Netlify: a la página nunca le llega nada de la cuenta.
    const t = body && body.error && body.error.type;
    console.error("lectura de captura (Claude):", r.status, t || "");
    if (r.status === 401 || r.status === 403 || t === "authentication_error" || t === "permission_error") throw new AiError(NOT_NOW, 502, "La clave de Claude cargada en Netlify (ANTHROPIC_API_KEY) no funciona: revisá que esté bien copiada, que la cuenta de la consola tenga saldo y volvé a publicar.");
    if (r.status === 429) throw new AiError(BUSY, 429);
    if (r.status === 529 || r.status >= 500) throw new AiError("El servicio de lectura está ocupado. Probá en un rato.", 503);
    if (r.status === 413) throw new AiError("La captura es demasiado pesada.", 413);
    const noCredit = /credit|billing|balance/i.test(String((body && body.error && body.error.message) || ""));
    if (noCredit) throw new AiError(NOT_NOW, 502, "La cuenta de la consola de Claude se quedó sin saldo: cargá crédito en Billing y probá de nuevo.");
    throw new AiError("No se pudo leer la captura. Cargá el resultado a mano o probá con otra imagen.", 502);
  }
  const txt = ((body && body.content) || []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
  return cleanRead(extractJson(txt));
}

async function readWithGemini(mediaType, data, fetchImpl) {
  let last = null;
  for (const model of GEMINI_MODELS()) {
    let r;
    try {
      // la clave va en un encabezado (no en la dirección) para que no quede en ningún registro
      r = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ inline_data: { mime_type: mediaType, data } }, { text: PROMPT }] }], generationConfig: { temperature: 0, maxOutputTokens: 4096, response_mime_type: "application/json" } }),
      });
    } catch (_) { throw new AiError("No se pudo conectar con el servicio de lectura. Probá de nuevo."); }
    const body = await r.json().catch(() => null);
    if (r.ok) {
      const c = body && body.candidates && body.candidates[0];
      if (!c) { if (body && body.promptFeedback && body.promptFeedback.blockReason) throw new AiError("No pude leer esa imagen. Probá con otra captura.", 422); throw new AiError("No pude leer la captura. Probá con otra más nítida."); }
      const txt = ((c.content && c.content.parts) || []).map((p) => p.text || "").join("\n");
      return cleanRead(extractJson(txt));
    }
    const e = (body && body.error) || {}, st = String(e.status || ""), msg = String(e.message || "");
    console.error("lectura de captura (Gemini):", model, r.status, st);
    if (/api[_ ]key/i.test(msg) || st === "UNAUTHENTICATED" || r.status === 401) throw new AiError(NOT_NOW, 502, "La clave de Gemini cargada en Netlify (GEMINI_API_KEY) no funciona: revisá que esté bien copiada y volvé a publicar.");
    // modelo que ya no existe o que esta clave no puede usar, o cupo de ese modelo agotado: se prueba el siguiente
    if (r.status === 404 || r.status === 429 || st === "RESOURCE_EXHAUSTED" || st === "NOT_FOUND" || (r.status === 403 && !/api[_ ]key/i.test(msg))) { last = r.status === 404 || st === "NOT_FOUND" || r.status === 403 ? "model" : "quota"; continue; }
    if (r.status >= 500) { last = "busy"; continue; }
    if (/location|region|country/i.test(msg)) throw new AiError(NOT_NOW, 502, "Google no habilita el uso gratis de Gemini desde la región del servidor de Netlify.");
    throw new AiError("No se pudo leer la captura. Cargá el resultado a mano o probá con otra imagen.", 502);
  }
  if (last === "quota") throw new AiError(BUSY, 429, "Se terminó el cupo gratis de Gemini por ahora (se renueva cada día). Mientras tanto, cargá el resultado a mano.");
  if (last === "busy") throw new AiError("El servicio de lectura está ocupado. Probá en un rato.", 503);
  throw new AiError(NOT_NOW, 502, "Ningún modelo de Gemini respondió con esta clave. Probá poner GEMINI_MODEL en Netlify con un modelo de la lista de Google AI Studio.");
}

export async function readScoreboard(dataUrl, { fetchImpl = fetch } = {}) {
  if (!aiConfigured()) throw new AiError("La lectura automática todavía no está activada.", 501, "Falta cargar GEMINI_API_KEY en Netlify y volver a publicar.");
  const { mediaType, data } = parseDataUrl(dataUrl);
  if (hasClaude()) {
    try { return await readWithClaude(mediaType, data, fetchImpl); }
    catch (e) { if (!hasGemini() || e.status === 422 || e.status === 400 || e.status === 413) throw e; } // si Claude falla por la cuenta o por cupo, sigue con Gemini
  }
  return readWithGemini(mediaType, data, fetchImpl);
}

// ---------- emparejar nombres del marcador con jugadores de la liga ----------
export const normName = (s) => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/#.*$/, "").replace(/[^a-z0-9]/g, "");
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
export function nameSim(x, y) {
  const a = normName(x), b = normName(y);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const r = Math.min(a.length, b.length) / Math.max(a.length, b.length);
  if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) return Math.max(0.72, 0.6 + 0.35 * r);
  return Math.max(0, 1 - lev(a, b) / Math.max(a.length, b.length));
}
// players: [{ id, name, ign, team }]. Devuelve, para cada fila, el jugador más parecido (cada jugador una sola vez).
export function matchRows(rows, players, min = 0.55) {
  const pairs = [];
  rows.forEach((r, i) => players.forEach((p) => { const s = Math.max(nameSim(r.name, p.name), p.ign ? nameSim(r.name, p.ign) : 0); if (s >= min) pairs.push({ i, pid: p.id, s }); }));
  pairs.sort((x, y) => y.s - x.s);
  const usedR = new Set(), usedP = new Set(), out = rows.map(() => ({ pid: null, score: 0 }));
  for (const x of pairs) { if (usedR.has(x.i) || usedP.has(x.pid)) continue; usedR.add(x.i); usedP.add(x.pid); out[x.i] = { pid: x.pid, score: Math.round(x.s * 100) / 100 }; }
  return out;
}

// Ubica cada equipo del marcador como A o B del partido (según qué jugadores coinciden) y arma la propuesta
export function mapToMatch(read, m, players) {
  const roster = (k) => players.filter((p) => p.team === k);
  const both = [...roster(m.a), ...roster(m.b)];
  const teamRows = read.teams.map((t) => t.players);
  const all = teamRows.flat(), match = matchRows(all, both);
  let idx = 0;
  const groups = teamRows.map((rows) => rows.map((r) => ({ ...r, ...match[idx++] })));
  const vote = (g, k) => g.filter((r) => r.pid && (players.find((p) => p.id === r.pid) || {}).team === k).length;
  // equipo 0 es A si coincide más con A que con B (o equipo 1 coincide más con B)
  const firstIsA = vote(groups[0], m.a) + vote(groups[1], m.b) >= vote(groups[0], m.b) + vote(groups[1], m.a);
  const [ga, gb] = firstIsA ? [groups[0], groups[1]] : [groups[1], groups[0]];
  const [ta, tb] = firstIsA ? [read.teams[0], read.teams[1]] : [read.teams[1], read.teams[0]];
  const rows = [...ga.map((r) => ({ ...r, side: "a" })), ...gb.map((r) => ({ ...r, side: "b" }))];
  const ra = ta.score, rb = tb.score;
  return { map: read.map, ra, rb, ot: read.ot != null ? read.ot : (ra != null && rb != null ? ra + rb > 24 : null), rows, confidence: read.confidence, notes: read.notes, sidesSure: Math.abs((vote(groups[0], m.a) + vote(groups[1], m.b)) - (vote(groups[0], m.b) + vote(groups[1], m.a))) >= 2 };
}
