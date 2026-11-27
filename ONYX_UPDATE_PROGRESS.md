# ONYX_UPDATE_PROGRESS.md — Competitive System 6.0

**Última actualización:** 26/11/2026 · **Base:** ONYX-Veto-en-vivo.zip (Netlify Functions + Firestore, Node 22)
**Tests de referencia:** `npm test` → antes 102/102 · ahora 118/118 (16 nuevos: invitaciones, tabla, navidad y web)

## Estado por etapa
| Etapa | Estado |
|---|---|
| 1 Auditoría inicial | Hecha para el flujo de invitaciones (no del proyecto entero) |
| 2 Discord e invitaciones | Hecha en código y probada con Discord simulado. **Sin probar contra Discord real ni desplegada** |
| 3 Bugs críticos, pagos y permisos | Auditoría hecha; 1 endurecimiento aplicado; sin escalada de privilegios encontrada |
| 4 Sistema competitivo | Auditoría de tabla y desempates hecha; **1 bug real corregido** (ver abajo) |
| 5 Fixture y Map Veto | Lógica del servidor revisada sin fallo. **Bug real en la web corregido: el veto en vivo no abría** (ver abajo) |
| 6 Automatizaciones, 7 Perfiles/tienda/economía | Billetera y canjes revisados (transaccionales, con operación idempotente y reglas que impiden canjes de puntos sin pasar por el servidor). Sin fallos encontrados; **no auditadas todas las automatizaciones del bot** |
| 8 Interfaces y rendimiento | **Bug real corregido: panel de operaciones de Discord y vínculo de postulaciones anteriores (staff) no respondían**. Resto sin cambios |
| 9 Evento navideño | **Versión propia reducida** (8 decoraciones), probada en Chromium |
| 10 Verificación final | 116/116 pruebas del repo. Las "97 pruebas" originales no existen en este chat: **no ejecutadas** |

## Causas raíz encontradas (Etapa 2)
1. **Panel de staff:** `public/js/app.js` ocultaba la línea de invitación (y su botón de reintento) si el jugador no estaba aprobado y pagado. El staff no veía ni podía reintentar invitaciones de quienes no pagaron.
2. **Vencimiento sin salida:** la invitación dura 24 h y 1 uso. Al vencer queda en `expired` y solo un reintento manual del staff la renovaba. El jugador no tenía forma de pedir otra.
3. **Mensajes privados cerrados:** el enlace se guardaba, pero el jugador solo lo veía si seguía vigente y no había aviso del motivo.
4. **Límite por IP:** 5 postulaciones por día por IP (`signupLimit`). Con IP compartida (CGNAT, ciber, facultad) se bloqueaba a jugadores reales. Ya hay login de Discord, así que se subió a 30.
5. **Errores silenciosos:** `deliver(...).catch(()=>{})` tras postular, y el resultado de `guilds.join` (OAuth2) solo iba a `console.warn`.
6. **Postulaciones web anteriores (`web_...`) sin ID de Discord:** nunca reciben invitación hasta que un ultra admin las vincula (`bindLegacy`). No se cambió (requiere decisión humana).

No encontré una dependencia directa pago → invitación en el servidor (`deliver`, `submitApplication`). La del punto 1 era solo del panel.

## Cambios hechos
- `netlify/lib/recruit-delivery.mjs`: `reissueInvite` (autoservicio, cooldown 5 min, solo su cuenta, no depende del pago) y `recoverInvites` (simulación por defecto; al confirmar deja los casos en cola y el cron entrega 5 por estado cada 10 min).
- `netlify/functions/recruitment.mjs`: acciones `reinvite` (jugador) y `recoverInvites` (ultra admin, `confirm:true` para ejecutar); `identity` devuelve `inviteState`, `inviteNote`, `canReinvite`; límite por IP 30; errores de invitación al log.
- `netlify/functions/auth-discord.mjs`: cada intento de unión OAuth2 deja un evento `oauthJoin:*` en `invitehistory`.
- `public/postular.html` + `public/js/apply.js`: aviso de estado y botón "Pedir una invitación nueva".
- `public/js/app.js`: el panel muestra y permite reintentar la invitación a todo jugador no rechazado.

## Pendiente / decisiones para el dueño
- **`target_user_ids`** en la creación de la invitación no es un parámetro documentado de Discord (la restricción por usuario usa `target_users_file`, multipart, y requiere Manage Guild). Hoy la invitación es de 1 uso pero **no personal**. No lo toqué: hay que probarlo contra Discord real.
- **Guild fijo** `1550607388267122788` en `community-sync.mjs`: si `DISCORD_GUILD_ID` difiere, todo queda en `config`. Es una protección deliberada; documentado.
- **Recuperación real:** correr primero `recoverInvites` sin `confirm` (simulación), revisar, y recién después con `confirm:true`. No se ejecutó nada contra datos reales.
- Postulaciones `web_` sin Discord: vincular con `bindLegacy`.
- Despliegue: no realizado. Migraciones: ninguna (solo campos nuevos en documentos existentes).

## Etapa 3 — resultado
- Reglas de Firestore (`firestore.rules`): las colecciones de pagos e invitaciones (`recruits`, `recruitjobs`, `paymenthistory`, `receiptuploads`, `invitehistory`) no tienen regla, o sea acceso denegado al cliente; solo escribe el servidor. Correcto.
- Cuentas de staff/capitán solo se crean desde el servidor y solo ultra gestiona cuentas. Sin escalada encontrada.
- Pago y registro ya son estados separados (`status` vs `paymentState`/`paid`). Probado: aceptar no marca pago, verificar exige comprobante enviado.
- **Cambio:** la clave `SETUP_KEY` de instalación se compara ahora sin filtrar por tiempo (`staff.mjs`).
- No verificado: reglas de Firestore reales (no hay emulador sin internet), integridad de la base de producción.

## Etapa 4 — bug corregido
- `netlify/lib/league.mjs` (`standings`): usaba la variable `c2`, que no existe en ese ámbito. Con cualquier serie decidida (2 victorias) `build()` lanzaba `ReferenceError`. Reproducido antes y comprobado después. Lo usa la lógica del servidor (bot, resumen); la web tiene su propia copia, que estaba bien. Pruebas en `tests/tabla-onyx6.test.mjs`.

## Errores de la web corregidos (verificados en Chromium antes y después)
1. `public/js/series-veto.js` usaba `D`, `TM`, `S` y `api`, privados de `app.js`: abrir el veto en vivo daba `ReferenceError: D is not defined`. Ahora `app.js` expone `onyxVetoCtx` y el veto lo usa.
2. `public/js/app.js` cerraba su función principal antes de los últimos manejadores (botón de "Operaciones de Discord" y "Vincular cuenta" de postulaciones `web_`), que usaban `isUltra`, `api`, `esc`, `modal`, `toast`: daban `ReferenceError`. Ahora quedan dentro. Esto afectaba a la Etapa 2 (vincular postulaciones anteriores sin Discord).
Método: análisis de nombres no definidos con el compilador de TypeScript (fuera del repo); tras la corrección solo queda `firebase`, que viene de un script externo. Pruebas: `tests/frontend-onyx6.test.mjs`.

## Etapa 9 — evento navideño (diseño propio, NO las 73 decoraciones originales)
Archivos: `public/js/navidad.mjs`, `public/css/navidad.css`, enganche en `public/index.html`, `tests/navidad.test.mjs`.
8 elementos: luces superiores, nieve (36/64/90 partículas según ancho; se detiene con la pestaña oculta o movimiento reducido), árbol con destellos, regalo animado, calendario de adviento de 24 puertas, cuenta regresiva a Nochebuena, y botón para apagar todo (se recuerda). Se activa solo del 1 de dic al 6 de ene; `?navidad=1` la fuerza para probar y `?navidad=0` la apaga.
Verificado en Chromium (Playwright): se crean los elementos, abre el calendario con 24 puertas y el botón apaga la decoración, sin errores de JavaScript propios. **No hice revisión visual del resultado ni prueba en celular real.**
No implementado: recompensas reales (monedas/premios) del calendario: requieren decisión de economía; hoy es solo visual.

## Etapas 4 a 9: qué falta
El código ya trae puntuación, desempates (`tiebreak.mjs`), fixture, veto con temporizadores (`map-veto.mjs`), mercado, tienda y perfiles. Las "mejoras solicitadas anteriormente" (lista de las 73 decoraciones, las 97 pruebas obligatorias, criterios de desempate y cambios de fixture concretos) **no están en el zip ni en este chat**. Sin esos prompts no puedo saber qué falta, y no voy a inventarlo ni marcar como hecho lo que no se pidió con detalle. Pasame esos prompts (o un resumen) y sigo.

## Próxima acción exacta
Probar a mano en un entorno con Firebase y Discord reales: veto en vivo, panel de operaciones, vínculo de postulaciones anteriores y reenvío de invitaciones. Si hay prompts anteriores con requisitos concretos (73 decoraciones, 97 pruebas), pasarlos.
