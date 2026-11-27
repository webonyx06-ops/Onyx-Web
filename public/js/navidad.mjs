// ONYX Christmas Event 2026 · diseño propio (no hay lista previa de decoraciones).
// Lógica pura arriba (se prueba con npm test); el DOM abajo solo corre en el navegador.
export const SEASON = { from: [12, 1], to: [1, 6] }; // 1 de diciembre al 6 de enero
export const DOORS = 24;
export const DECORATIONS = [
  "Luces del borde superior", "Nieve cayendo", "Árbol con adornos", "Destellos al tocar el árbol",
  "Regalo animado", "Calendario de adviento", "Cuenta regresiva a Nochebuena", "Botón para activar y apagar",
];
const md = (d) => [d.getMonth() + 1, d.getDate()];
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1];
// ?navidad=1 fuerza la decoración (para probarla fuera de fecha); ?navidad=0 la apaga.
export function isSeason(date = new Date(), force = null) {
  if (force === "0") return false;
  if (force === "1") return true;
  const m = md(date);
  return cmp(m, SEASON.from) >= 0 || cmp(m, SEASON.to) <= 0;
}
export function particleCount({ width = 1280, reducedMotion = false, hidden = false } = {}) {
  if (reducedMotion || hidden) return 0;
  return width < 700 ? 36 : width < 1100 ? 64 : 90;
}
// Una puerta se puede abrir si ya llegó su día de diciembre (todas desde el 24 en adelante).
export function doorState(day, date = new Date(), opened = []) {
  const m = date.getMonth() + 1, today = m === 12 ? date.getDate() : (m === 1 && date.getDate() <= 6 ? DOORS : 0);
  return opened.includes(day) ? "open" : day <= today ? "ready" : "locked";
}
export const daysToChristmasEve = (date = new Date()) => {
  const y = date.getMonth() === 11 && date.getDate() > 24 ? date.getFullYear() + 1 : date.getFullYear();
  const t = new Date(y, 11, 24), s = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(0, Math.round((t - s) / 864e5));
};
export const MESSAGES = Array.from({ length: DOORS }, (_, i) => `Día ${i + 1}: ¡Feliz camino a Navidad, ONYX!`);

// ---------- navegador ----------
function start() {
  const q = new URLSearchParams(location.search).get("navidad");
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  if (!isSeason(new Date(), q)) return;
  const root = document.documentElement, reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let on = store.get("onyx:navidad") !== "off";
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  const lights = el("div", "nv-lights"); lights.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 40; i++) { const b = el("i"); b.style.setProperty("--d", (i % 7) * 0.35 + "s"); b.dataset.c = i % 4; lights.append(b); }
  const canvas = el("canvas", "nv-snow"); canvas.setAttribute("aria-hidden", "true");
  const tree = el("button", "nv-tree", "🎄"); tree.type = "button"; tree.setAttribute("aria-label", "Árbol de Navidad: tocá para ver destellos");
  const gift = el("span", "nv-gift", "🎁"); gift.setAttribute("aria-hidden", "true");
  const toggle = el("button", "nv-toggle"); toggle.type = "button";
  const cal = el("button", "nv-cal", "Calendario navideño"); cal.type = "button";
  const count = el("span", "nv-count"); count.setAttribute("role", "status");
  const panel = el("dialog", "nv-panel");
  document.body.append(lights, canvas, tree, gift, toggle, cal, count, panel);

  function sparkle(x, y) {
    if (reduced.matches) return;
    for (let i = 0; i < 10; i++) {
      const s = el("b", "nv-spark", "✦"); s.style.left = x + "px"; s.style.top = y + "px";
      s.style.setProperty("--dx", (Math.random() * 120 - 60) + "px"); s.style.setProperty("--dy", (-20 - Math.random() * 90) + "px");
      document.body.append(s); setTimeout(() => s.remove(), 900);
    }
  }
  tree.addEventListener("click", () => { const r = tree.getBoundingClientRect(); sparkle(r.left + r.width / 2, r.top + 10); });

  function renderPanel() {
    const opened = JSON.parse(store.get("onyx:navidad:doors") || "[]"), now = new Date();
    panel.innerHTML = `<form method="dialog"><h2>Calendario de adviento ONYX</h2><p>${daysToChristmasEve(now)} días para Nochebuena.</p><div class="nv-doors"></div><button>Cerrar</button></form>`;
    const grid = panel.querySelector(".nv-doors");
    for (let d = 1; d <= DOORS; d++) {
      const st = doorState(d, now, opened), b = el("button", "nv-door " + st, String(d)); b.type = "button"; b.disabled = st === "locked";
      b.setAttribute("aria-label", `Puerta ${d}, ${st === "locked" ? "todavía cerrada" : st === "open" ? "abierta" : "lista para abrir"}`);
      b.addEventListener("click", () => { if (!opened.includes(d)) { opened.push(d); store.set("onyx:navidad:doors", JSON.stringify(opened)); } b.className = "nv-door open"; b.title = MESSAGES[d - 1]; panel.querySelector("p").textContent = MESSAGES[d - 1]; const r = b.getBoundingClientRect(); sparkle(r.left + 12, r.top); });
      grid.append(b);
    }
  }
  cal.addEventListener("click", () => { renderPanel(); panel.showModal(); });

  // Nieve: cantidad acotada, se detiene con la pestaña oculta y con movimiento reducido.
  const ctx = canvas.getContext("2d"); let flakes = [], raf = 0;
  const size = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
  function seed() { const n = on ? particleCount({ width: innerWidth, reducedMotion: reduced.matches, hidden: document.hidden }) : 0; flakes = Array.from({ length: n }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, r: 1 + Math.random() * 2.6, v: 0.4 + Math.random() * 1.1, w: Math.random() * 6 })); }
  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "rgba(255,255,255,.85)";
    for (const f of flakes) { f.y += f.v; f.w += 0.02; f.x += Math.sin(f.w) * 0.4; if (f.y > canvas.height + 5) { f.y = -5; f.x = Math.random() * canvas.width; } ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill(); }
    raf = flakes.length ? requestAnimationFrame(frame) : 0;
  }
  function apply() {
    root.classList.toggle("nv-on", on); root.classList.toggle("nv-still", reduced.matches);
    toggle.textContent = on ? "Decoración: sí" : "Decoración: no"; toggle.setAttribute("aria-pressed", String(on));
    count.textContent = on ? `${daysToChristmasEve()} días para Nochebuena` : "";
    cancelAnimationFrame(raf); size(); seed(); ctx.clearRect(0, 0, canvas.width, canvas.height); if (flakes.length) raf = requestAnimationFrame(frame);
  }
  toggle.addEventListener("click", () => { on = !on; store.set("onyx:navidad", on ? "on" : "off"); apply(); });
  addEventListener("resize", apply); document.addEventListener("visibilitychange", apply); reduced.addEventListener?.("change", apply);
  apply();
}
if (typeof document !== "undefined") { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start(); }
