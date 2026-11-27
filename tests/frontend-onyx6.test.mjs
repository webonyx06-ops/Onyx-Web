// ONYX 6.0 · regresiones de alcance (scope) en la web: antes fallaban con ReferenceError en el navegador.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
const read = (f) => readFileSync(new URL("../public/js/" + f, import.meta.url), "utf8");

test("el veto en vivo no depende de variables privadas de app.js", () => {
  const ctx = { document: { createElement: () => ({}) }, Option: class {}, globalThis: null };
  ctx.globalThis = ctx;
  ctx.onyxVetoCtx = { TM: (k) => ({ name: k }), api: async () => ({}), D: { pending: [] }, S: { mp: {} } };
  vm.createContext(ctx);
  vm.runInContext(read("series-veto.js") + "\nthis.render = renderSeriesVeto;", ctx);
  const root = { querySelector: () => ({ add() {}, length: 0, options: [] }) , set innerHTML(v) {}, set textContent(v) { this.t = v; }, get textContent() { return this.t; } };
  assert.doesNotThrow(() => ctx.render(root, null));
  assert.equal(root.textContent, "Sin cruces pendientes.");
});
test("app.js: los manejadores finales (panel de operaciones, vínculo de postulaciones anteriores) quedan dentro de la función principal", () => {
  const src = read("app.js").replace(/\r/g, "");
  assert.ok(src.trimEnd().endsWith("})();"), "la función principal debe cerrar al final del archivo");
  assert.ok(!/finishDiscordLogin\(\);\n\}\)\(\);\n/.test(src), "no debe cerrarse antes de los manejadores finales");
  assert.ok(/globalThis\.onyxVetoCtx=/.test(src), "app.js expone el contexto del veto");
});
