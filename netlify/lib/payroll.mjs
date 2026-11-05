// Sueldos de los coaches: cada lunes a las 00:00 (hora de Argentina) cada equipo le paga a cada coach que tiene fichado.
// Si al equipo no le alcanzan las ONYX Coins, el sueldo queda pendiente hasta que el staff registre la recarga
// (el equipo paga en dólares y se le renuevan las coins). Los pendientes se pagan solos apenas al equipo le alcanza.
import { TEAM_KEYS as BASE_KEYS } from "./league.mjs";
export const COACH_DEF = { salary: 150, usd: 5, refill: 6000 };
const ART = -3 * 3600000; // Argentina no tiene horario de verano

// Lunes 00:00 (hora de Argentina) de la semana de `now`: { key: "2026-10-26", at: epoch ms }
export function weekStart(now = Date.now()) {
  const d = new Date(now + ART);
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - dow);
  return { key: d.toISOString().slice(0, 10), at: d.getTime() - ART };
}
export const coachCfg = (cfg) => ({ ...COACH_DEF, ...((cfg && cfg.coach) || {}) });

// inc(n): incremento atómico de Firestore (admin.firestore.FieldValue.increment) para no pisar otros cambios de coins.
export async function runPayroll(db, { now = Date.now(), inc } = {}) {
  const { key, at } = weekStart(now), ref = db.doc(`payroll/${key}`);
  const fresh = await db.runTransaction(async (tx) => {
    const s = await tx.get(ref); if (s.exists) return false;
    tx.set(ref, { status: "running", at: now }); return true;
  });
  if (!fresh) return { skipped: `Los sueldos de la semana del ${key} ya se pagaron.`, week: key };
  try {
    const [cfgSnap, coachSnap, teamSnap, pendSnap] = await Promise.all([db.doc("league/config").get(), db.collection("coaches").get(),
      db.collection("teams").get(), db.collection("salaries").where("status", "==", "pend").get()]);
    const amt = Math.max(0, Math.round(+coachCfg(cfgSnap.exists ? cfgSnap.data() : null).salary || 0));
    const teams = {}, hasCoins = new Set(); teamSnap.docs.forEach((d) => { const t = d.data() || {}; teams[d.id] = t; if (t.coins != null) hasCoins.add(d.id); });
    BASE_KEYS.forEach((k) => { if (!teams[k]) teams[k] = { coins: 6000 }; }); // equipos de base que todavía no tienen documento (arrancan con 6000)
    const coins = Object.fromEntries(Object.entries(teams).map(([k, t]) => [k, t.coins == null ? 6000 : +t.coins || 0]));
    const spent = {}, out = { week: key, paid: 0, pend: 0, settled: 0, total: 0 }, paths = [];
    const pay = (k, n) => { coins[k] = (coins[k] ?? 6000) - n; spent[k] = (spent[k] || 0) + n; };
    // 1) pendientes de semanas anteriores, del más viejo al más nuevo
    const pend = pendSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.week).localeCompare(String(b.week)));
    for (const p of pend) {
      const n = +p.amt || 0; if ((coins[p.team] ?? 0) < n) continue;
      pay(p.team, n); await db.doc(`salaries/${p.id}`).update({ status: "paid", paidAt: now, via: "auto" }); out.settled++; out.total += n; paths.push(`salaries/${p.id}`);
    }
    // 2) la semana nueva: contratos firmados antes del lunes
    if (amt > 0) for (const c of coachSnap.docs) {
      const coach = c.data() || {};
      for (const [k, con] of Object.entries(coach.teams || {})) {
        if (!teams[k] || teams[k].hidden || !(+((con || {}).since) < at)) continue;
        const ok = (coins[k] ?? 0) >= amt;
        if (ok) { pay(k, amt); out.paid++; out.total += amt; } else out.pend++;
        paths.push(`salaries/${key}_${c.id}_${k}`);
        await db.doc(`salaries/${key}_${c.id}_${k}`).set({ coach: c.id, coachName: coach.name || "", team: k, week: key, amt, status: ok ? "paid" : "pend", at: now, ...(ok ? { paidAt: now, via: "auto" } : {}) });
      }
    }
    for (const [k, n] of Object.entries(spent)) {
      if (!n) continue;
      paths.push(`teams/${k}`);
      if (hasCoins.has(k) && inc) await db.doc(`teams/${k}`).update({ coins: inc(-n) });
      else await db.doc(`teams/${k}`).set({ coins: coins[k] }, { merge: true }); // sin coins guardadas: arranca de 6000
    }
    await ref.set({ status: "done", at: now, ...out });
    return { ...out, paths }; // paths: documentos públicos que cambiaron (para el resumen de la página)
  } catch (e) {
    await ref.set({ status: "error", at: now, error: String(e.message || e).slice(0, 300) });
    throw e;
  }
}
