// Resultados que mandan los capitanes: cada capitán carga el marcador (con la captura) de su partido.
//   results/<partido>_<equipo>    { mid, team, fecha, ra, rb, ot, map, stats: { pid: { t, k, d, a, acs } }, by, u, at, status, note, hasImg }
//   resultimg/<partido>_<equipo>  { data }   la captura (aparte, para que la lista no pese)
// status: "pend" (espera al rival o al staff) · "auto" (coincidieron los dos y se cargó solo) · "ok" (lo aprobó el staff) · "rej" (rechazado)
// Si los dos capitanes mandan lo mismo, el resultado se carga solo (se puede apagar en Panel → General).
export const RES_DEF = { auto: true, ai: true, aiDaily: 30 };
export const resCfg = (cfg) => ({ ...RES_DEF, ...((cfg && cfg.results) || {}) });

const int = (v, max) => { const n = Math.round(+v); return Number.isFinite(n) && n >= 0 && n <= max ? n : null; };

// Valida y limpia lo que manda el capitán. players: { pid: { team } } (de la liga)
export function cleanSubmission(b, m, players) {
  const ra = int(b.ra, 40), rb = int(b.rb, 40);
  if (ra == null || rb == null) throw Object.assign(new Error("Poné las rondas de los dos equipos."), { status: 400 });
  if (ra === rb) throw Object.assign(new Error("Un partido no puede terminar empatado."), { status: 400 });
  const hi = Math.max(ra, rb), lo = Math.min(ra, rb);
  if (hi < 13) throw Object.assign(new Error(`Con ${ra}-${rb} nadie llegó a 13. Si un equipo se rindió o no se presentó, avisale al staff.`), { status: 400 });
  if (hi > 13 && hi - lo !== 2) throw Object.assign(new Error(`El marcador ${ra}-${rb} no es posible: en la prórroga se gana por 2 rondas.`), { status: 400 });
  const stats = {};
  for (const [pid, s] of Object.entries(b.stats || {}).slice(0, 14)) {
    const p = players[pid]; if (!p || !s) continue;
    const t = s.t === m.a || s.t === m.b ? s.t : p.team;
    if (t !== m.a && t !== m.b) continue;
    const k = int(s.k, 99), d = int(s.d, 99), a = int(s.a, 99), acs = int(s.acs, 999);
    if ([k, d, a, acs].some((x) => x == null)) continue;
    stats[pid] = { t, k, d, a, acs };
  }
  return { ra, rb, ot: ra + rb > 24, map: b.map ? String(b.map).slice(0, 30) : null, stats, note: String(b.note || "").slice(0, 300) };
}

// ¿Los dos envíos dicen lo mismo? Devuelve { ok, why, merged }
export function agree(x, y) {
  if (!x || !y) return { ok: false, why: "Falta el envío del otro capitán." };
  if (x.ra !== y.ra || x.rb !== y.rb) return { ok: false, why: `Los marcadores no coinciden (${x.ra}-${x.rb} y ${y.ra}-${y.rb}).` };
  if (x.map && y.map && x.map !== y.map) return { ok: false, why: `Los mapas no coinciden (${x.map} y ${y.map}).` };
  const stats = {}, diffs = [];
  for (const pid of new Set([...Object.keys(x.stats || {}), ...Object.keys(y.stats || {})])) {
    const a = (x.stats || {})[pid], b = (y.stats || {})[pid];
    if (a && b) {
      if (a.k !== b.k || a.d !== b.d || a.a !== b.a || Math.abs(a.acs - b.acs) > 3 || a.t !== b.t) diffs.push(pid);
      stats[pid] = a;
    } else stats[pid] = a || b;
  }
  if (diffs.length) return { ok: false, why: `Las estadísticas de ${diffs.length} jugador${diffs.length > 1 ? "es" : ""} no coinciden.`, diffs };
  return { ok: true, merged: { ra: x.ra, rb: x.rb, ot: x.ra + x.rb > 24, map: x.map || y.map || null, stats } };
}

// ¿Alcanza para cargarlo solo? Los dos equipos con al menos 4 jugadores con estadísticas
export function enoughStats(merged, m) {
  const n = (k) => Object.values(merged.stats).filter((s) => s.t === k).length;
  return n(m.a) >= 4 && n(m.b) >= 4;
}

// Lo que se guarda en el partido
export const matchPatch = (merged) => ({ status: "played", ra: merged.ra, rb: merged.rb, ot: !!merged.ot, noShow: null, map: merged.map || null, stats: merged.stats });

// Intenta cargar el partido solo. db: admin. Devuelve { applied, why }
export async function tryAuto(db, mid, { cfg, now = Date.now(), audit = null } = {}) {
  const R = resCfg(cfg);
  const mref = db.doc(`matches/${mid}`);
  return db.runTransaction(async (tx) => {
    const ms = await tx.get(mref); if (!ms.exists) return { applied: false, why: "El partido no existe." };
    const m = ms.data(), ids = [`${mid}_${m.a}`, `${mid}_${m.b}`];
    const [sa, sb] = await tx.getAll(...ids.map((id) => db.doc(`results/${id}`)));
    const A = sa.exists ? sa.data() : null, B = sb.exists ? sb.data() : null;
    if (!A || !B || A.status !== "pend" || B.status !== "pend") return { applied: false, why: !A || !B ? "Falta el envío del otro capitán." : "Ya se revisó." };
    const g = agree(A, B);
    if (!g.ok) { tx.update(db.doc(`results/${ids[0]}`), { check: g.why }); tx.update(db.doc(`results/${ids[1]}`), { check: g.why }); return { applied: false, why: g.why }; }
    if (m.status === "played") return { applied: false, why: "El staff ya cargó este partido." };
    if (!R.auto) return { applied: false, why: "Los dos coinciden. La carga automática está apagada: lo aprueba el staff." };
    if (!enoughStats(g.merged, m)) return { applied: false, why: "Los dos coinciden, pero faltan estadísticas (mínimo 4 jugadores por equipo): lo revisa el staff." };
    tx.update(mref, matchPatch(g.merged));
    for (const id of ids) tx.update(db.doc(`results/${id}`), { status: "auto", appliedAt: now, check: "" });
    if (audit) tx.set(db.collection("audit").doc(), audit(m, g.merged));
    return { applied: true, merged: g.merged, m };
  });
}
