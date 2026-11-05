# ONYX · Liga comunitaria de Valorant

Web de la liga: tabla de posiciones con desempates, simulador, playoffs con cuadro, rankings, premios, historia de temporadas, mercado de fichajes con ONYX Coins, resultados por captura (con lectura automática), pronósticos de la comunidad, votación real de capitán, fair play, panel de staff con auditoría y copias de seguridad, y sorteo de mapas en vivo para streamear.

- **Hosting:** Netlify (gratis).
- **Base de datos y logins:** Firebase (plan gratuito Spark).
- **Cuentas de staff:** las crea y administra una función de Netlify (`/api/staff`).

## Qué hay en el repo

```
public/                 La web (esto es lo que publica Netlify)
  index.html            La liga
  setup.html            Instalación inicial (se usa una sola vez)
  css/styles.css
  js/app.js             Toda la lógica de la página
  js/firebase-config.js Acá van los datos de tu proyecto de Firebase
  assets/emblemas/      Emblemas de los equipos
  assets/logos/         Logos completos con nombre
netlify/functions/staff.mjs   Crea, resetea y borra cuentas de staff
netlify/functions/discord.mjs Comandos de ONYX Bot en Discord (/api/discord)
netlify/functions/bot.mjs     Panel de ONYX Bot (/api/bot, solo ultra1 y ultra2)
netlify/functions/bot-cron.mjs Avisos automáticos cada 10 minutos
netlify/functions/logo.mjs    Sirve los logos subidos desde el panel (/api/logo/equipo)
netlify/functions/publish.mjs   Actualiza el resumen público cuando se guarda algo (/api/publish)
netlify/functions/snapshot.mjs  Resumen público con la caché de Netlify (/api/snapshot)
netlify/functions/img.mjs       Logos y fotos de premios con caché (/api/img/...)
netlify/functions/backup.mjs    Copias de seguridad: listar, descargar, crear, restaurar (/api/backup, ultra)
netlify/functions/backup-cron.mjs Copia diaria y resumen completo (todas las noches)
netlify/functions/results.mjs   Resultados por captura: lectura con IA y envíos de capitanes (/api/results)
netlify/functions/season.mjs    Cerrar la temporada (/api/season, ultra)
netlify/functions/auth-discord.mjs Entrar con Discord (/api/auth/discord)
netlify/functions/member.mjs    Cuenta de jugador: vínculo, asistencia, pronósticos, votación (/api/member)
netlify/lib/                  Código compartido (liga, mensajes, avisos, resumen, copias, resultados, pronósticos, votación)
tests/                        Pruebas automáticas (npm test)
.github/workflows/pruebas.yml Corre las pruebas en GitHub cada vez que subís cambios
firestore.rules         Reglas de seguridad (se pegan en Firebase)
netlify.toml            Configuración de Netlify
staff.example.csv       Formato del archivo de cuentas
```

## Diseño y navegación

- **Barra lateral** con todas las secciones agrupadas (Liga, Jugadores, Capitanes, Comunidad). Cada sección se abre como una pantalla propia y los links `#tabla`, `#mercado`, etc. siguen funcionando. El botón de arriba la achica a solo íconos (se acuerda en cada navegador). En el celular se abre con el botón de menú.
- **Cuenta regresiva** para la próxima fecha: grande en el inicio (días, horas, minutos y segundos) y chica en la barra lateral, visible desde cualquier sección. Cuando falta menos de una hora se pone en naranja y cuando arranca muestra "Se está jugando". La hora sale del primer partido de la fecha (o de *Próxima fecha* en Panel → General).
- **Buscador rápido**: `Ctrl K` (o `/`) busca jugadores, equipos, secciones y acciones (entrar, abrir el panel, sorteo en vivo).
- **Inicio** tipo tablero: próxima fecha con sus cruces de ida y vuelta, top de la tabla, resultados de la última fecha, figura de la fecha y últimos fichajes. Si sos capitán y te falta elegir mapa, aparece el botón para hacerlo y un punto naranja en *Mi mapa*.
- **Logo**: la máscara de ONYX sin fondo (`public/assets/onyx-logo.png`), también en el favicon y los íconos de la app.
- **Temporadas**: nada dice "Temporada 1" fijo. Al terminar, se cierra desde Panel → General → *Temporada* y queda en *Historia* (ver *Temporadas e Historia*).
- **Discord**: pegá el link de invitación en Panel → General → *Discord* y aparece el botón *Unite al Discord* en la barra lateral, el inicio, el pie y el menú del celular.
- **Aviso legal**: el pie de página y el Reglamento dicen que ONYX es una competencia comunitaria y llevan el aviso que pide Riot Games ("Legal Jibber Jabber").

## Instalación paso a paso

### 1. Firebase

1. Entrá a <https://console.firebase.google.com> y creá un proyecto. Google Analytics no hace falta.
2. **Firestore Database** → *Crear base de datos* → modo producción → elegí una ubicación cercana (por ejemplo `southamerica-east1`).
3. En Firestore, pestaña **Reglas**: borrá lo que hay, pegá todo el contenido de `firestore.rules` y tocá **Publicar**.
4. **Authentication** → *Comenzar* → pestaña *Sign-in method*. Habilitá:
   - **Correo electrónico/contraseña**, para el staff.
5. **Configuración del proyecto** (ícono de engranaje) → *Tus apps* → ícono **Web** (`</>`). Registrá la app y copiá los valores de `firebaseConfig` en `public/js/firebase-config.js`.
6. **Configuración del proyecto** → *Cuentas de servicio* → **Generar nueva clave privada**. Se descarga un archivo `.json`.
   > Ese archivo es una llave maestra. No lo subas a GitHub: el `.gitignore` ya lo bloquea si lo dejás en la carpeta.

### 2. GitHub

Subí la carpeta a un repositorio nuevo. Puede ser privado.

```bash
git init
git add .
git commit -m "ONYX"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/liga-t1.git
git push -u origin main
```

### 3. Netlify

1. <https://app.netlify.com> → *Add new site* → *Import an existing project* → GitHub → elegí el repo.
2. La configuración de build la toma sola de `netlify.toml`. No cambies nada y tocá **Deploy**.
3. Andá a *Site configuration* → *Environment variables* y agregá:

| Variable | Valor |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Todo el contenido del `.json` del paso 1.6 (abrilo con un editor, copiá y pegá todo) |
| `SETUP_KEY` | Una clave que inventes, por ejemplo `liga-instalacion-2026` |
| `STAFF_EMAIL_DOMAIN` | Opcional. Si no la ponés, se usa `staff.ligat1.app` |
| `GEMINI_API_KEY` | Opcional (gratis). Activa la lectura automática de las capturas del marcador con Gemini de Google (ver *Resultados por captura*) |
| `GEMINI_MODEL` | Opcional. Modelo de Gemini a usar primero (si no, prueba `gemini-3.8-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite` y `gemini-3.1-flash-lite`) |
| `ANTHROPIC_API_KEY` | Opcional (pago). Lee las capturas con Claude; si también está Gemini, queda de respaldo |
| `ANTHROPIC_MODEL` | Opcional. Modelo de Claude (por defecto `claude-sonnet-5-5`) |
| `DISCORD_CLIENT_SECRET` | Opcional. Activa *Entrar con Discord* para los jugadores (ver *Jugadores con Discord*) |

4. *Deploys* → **Trigger deploy** → *Deploy site*, para que la función tome las variables. Para verificar, abrí `https://TU-SITIO.netlify.app/api/staff`: tiene que decir `"firebase": "conectado"`. Si no, el mensaje te dice qué falta.
5. En Firebase → Authentication → *Settings* → *Authorized domains*, agregá tu dominio de Netlify (por ejemplo `tu-liga.netlify.app`).

### 4. Crear las cuentas de staff (una sola vez)

1. Abrí `https://TU-SITIO.netlify.app/setup.html`.
2. Poné la `SETUP_KEY` y cargá tu `staff.csv` con el formato `usuario,contraseña,rol` (rol = `ultra` o `staff`).
3. Tocá **Crear cuentas**. También se crean los 7 equipos, el pool de 12 mapas y el fixture de 7 fechas.
4. Borrá la variable `SETUP_KEY` en Netlify. Igual, la instalación se bloquea sola una vez que existe alguna cuenta.

### 5. Listo

En la liga tocá **Acceso staff**, al pie de la página, y entrá con tu usuario de ultra staff.

## Roles

**Staff**
- Carga resultados y estadísticas.
- Agrega y edita jugadores y equipos.
- Aprueba ofertas, pases y solicitudes de capitanes.
- Carga asistencia, skills y puntos individuales.
- Sortea mapas en el modo streamer.
- Resuelve denuncias.

**Ultra staff**
- Todo lo anterior.
- Sistema de puntos y ajustes manuales de la tabla.
- Configuración general y premios elegidos a mano.
- Todo lo que sea borrar o reiniciar.
- Cuentas de staff: crear, activar, desactivar, cambiar rol y generar contraseña nueva.
- Ver la auditoría.

La **auditoría** registra cada cambio con quién lo hizo y cuándo. Firebase no deja que nadie la edite ni la borre, ni siquiera un ultra staff.

Estos permisos los aplica Firebase con `firestore.rules`, no solo la página. Un visitante no puede cambiar nada aunque sepa programar.

## Capitanes

Las cuentas de capitán no tienen ningún permiso de staff. Cada capitán:

- Ve el panel **Mi equipo** con el plantel de su equipo.
- Pide altas de jugadores y cambios de **valor** (100 a 1.500) y **cláusula de rescisión** (hasta 3.000). Nada se aplica hasta que el staff lo aprueba en **Solicitudes**.
- Es el único que puede **fichar** (ofertar en el mercado) y **hacer denuncias**, siempre por su propio equipo.

Los visitantes sin cuenta solo pueden ver la liga.

Para crear capitanes: entrá con un ultra staff → **Cuentas y auditoría** → **Importar cuentas desde CSV** y cargá un archivo con el formato `usuario,contraseña,rol,equipo` (rol = `capitan`). Después asignale a cada cuenta su equipo en la lista **Cuentas de capitán**.

Un jugador con cláusula se va si otro capitán la paga: la oferta aparece marcada como **PAGA LA CLÁUSULA** y el staff solo confirma el pase.

## Rendimiento individual

En el panel, pestaña **Rendimiento**:

- **Asistencia** por fecha: presente, tarde, ausente o justificado.
- **Skills** del 1 al 10: puntería, lectura de juego, comunicación, uso de utilidades y actitud.
- **Puntos individuales**: bonus y descuentos con motivo.

Todo eso alimenta el ranking de **Puntos** y **Asistencia** y los premios **Más puntos individuales** y **Mejor asistencia**.

## Modo streamer

Panel de staff → **Modo streamer**. Se usa así:

1. Elegí el partido.
2. Tocá **Sortear** o la barra espaciadora. El mapa que sale se tacha para los dos equipos.

Atajos y opciones:
- **H:** oculta los controles para capturar limpio.
- **F:** pantalla completa.
- **Fondo verde:** para el chroma key de OBS.
- **Deshacer último:** si te equivocaste.

Quien tenga la página abierta ve el sorteo en vivo.

En OBS: *Fuente de navegador* con la URL de la liga, o *Captura de ventana* del navegador con el modo streamer abierto.

## Tabla y equipos (ultra staff)

**Desempate** (con los mismos puntos): rondas ganadas (lo principal) → rondas perdidas (menos es mejor) → kills → asistencias → enfrentamiento directo → K/D. Kills y asistencias salen de las stats de los partidos más lo que se cargue a mano en el editor.

**Editar la tabla sin crear fechas:** Panel → *Tabla* → *Editar la tabla*. Escribís el número final de Pts, V, VP, DP, D, RF, RC, kills (K) y asistencias (A) y se guarda solo. La web guarda la diferencia con los partidos cargados, así los resultados nuevos se siguen sumando. Los puntos se calculan con V/VP/DP/D; si los cambiás a mano, la diferencia queda como *extra* (bonus o sanción). *Forma manual* agrega resultados anteriores a la web. *Reiniciar* deja solo lo que sale de los partidos. Los resultados por fecha se siguen cargando en *Partidos*.

**Equipos nuevos:** Panel → *Equipos* → *Agregar equipo* (nombre, colores y logo). El logo se achica solo a 256×256. Cualquier equipo puede cambiar su logo o volver al original. Un equipo se puede quitar solo si no tiene partidos, jugadores ni capitanes asignados.

## Ida y vuelta

Cada fecha se juega **ida y vuelta**: dos partidos entre los mismos equipos (en la vuelta se invierte local y visitante). Cada partido tiene su resultado y **sus propias stats**.

- **Crear**: Panel → *Partidos* → *Agregar partido* → elegís **Ida y vuelta** (crea los dos de una, con el día y hora de cada uno) o **Partido único**. El generador de fixture también usa esa opción.
- En todo el sitio aparecen como **IDA** y **VUELTA** (fixture, panel, tabla de cada equipo, análisis de jugadores). Si un partido viejo no tiene la marca, se toma por el horario: el primero es la ida. Se puede corregir en el partido (*Ida / vuelta*).
- **Bot**: manda **un solo aviso por cruce y por fecha** (la ida y la vuelta juntas en el mismo mensaje), contando los horarios desde la ida. El resultado sale en un solo mensaje cuando se cargaron los dos partidos.

## Elegir mapa (capitanes)

- **ONYX Bot → Pedir mapa a los capitanes** (solo ultra1 y ultra2): elegís la fecha, el canal de cada equipo (si no, va al canal *info*) y a quién mencionar. El bot manda un mensaje con el botón **Elegir mapa en la web**.
- **En la web**, sección *Elegí tu mapa* (aparece para capitanes y para quien llega desde el botón): el capitán elige **uno solo de los dos partidos (la ida o la vuelta)**, uno de los mapas que le quedan y si su equipo arranca en ataque o defensa (el rival arranca del otro lado). El otro partido lo elige el capitán rival: el primero que guarda se queda con ese partido y al otro le queda bloqueado. Lo puede cambiar hasta que se juegue. El mapa lo ven solo su capitán y el staff, no el rival.
- **Liberar**: en Panel → *Mapas* el staff puede borrar la elección de un capitán y ese partido vuelve a quedar libre.
- **Estado**: Panel → *Mapas* (staff) y la tarjeta del bot muestran quién eligió y quién falta. *Recordar solo a los que faltan* vuelve a mandar el pedido solo a esos.
- **Cada mapa se elige una sola vez**: el mapa que elige un capitán ya no le aparece a su equipo para las otras fechas. Para la liga (sección Mapas, sorteo y bot) queda tachado cuando el bot avisa los mapas o cuando se carga el resultado, así el rival no se entera antes. *Reiniciar* mapas también libera los elegidos.
- **Avisar los mapas elegidos**: el bot le manda a los dos equipos de cada cruce un solo mensaje con el mapa de la ida y de la vuelta, qué capitán lo eligió y en qué lado arranca cada uno. Se puede mandar a mano o dejar activado *Mandarlos solos cuando los dos capitanes eligieron* (si alguno cambia después, avisa el cambio).

## Scouting (análisis de jugadores)

Sección pública **Scouting**: tabla de todos los jugadores con filtros (nombre, rol, equipo, partidos) y orden por cualquier columna. Cada jugador tiene un **Rating ONYX** de 0 a 100: combina ACS, K/D, kills y asistencias por ronda, supervivencia, victorias y asistencia a fechas, comparado con toda la liga.

- **Análisis de cada jugador** (tocando su fila, su ficha o "Ver análisis" en el mercado): perfil escrito ("Cómo es el jugador": estilo de juego, comparación con su rol, regularidad, si viene en alza o en baja, asistencia y evaluación del staff), etiquetas (Fragger, Seguro, Juega para el equipo, Figura, Regular, En alza…), barras de percentil contra la liga, gráfico partido a partido (ACS, K/D, kills, asistencias) contra el promedio, kills/muertes/asistencias por partido y la tabla de todos sus partidos.
- **Comparar**: hasta 3 jugadores lado a lado (tabla con el mejor de cada fila y barras de percentil).
- **Para fichar** (capitanes y staff): si es buena compra, precio justo o caro según lo que rinde, cláusula, y botón para ofertar.
- **ONYX Scout** (capitanes; el staff lo puede ver por equipo): diagnóstico de cómo está jugando su equipo (roles que faltan, en qué están flojos contra los demás equipos) y los jugadores recomendados con su compatibilidad y el porqué. El primero es la **Pieza clave**. Filtros: solo agentes libres y que alcancen los coins.

## Coaches y sueldos

- **Los coaches son personas aparte**: no juegan ni aparecen en la tabla o las estadísticas. Los carga el staff en Panel → *Coaches*.
- **Fichaje**: el capitán lo pide desde su panel (tarjeta *Coach*) o desde el Mercado, y el staff lo aprueba en *Solicitudes*. El staff también puede ficharlo o darlo de baja directo desde *Coaches*. Un coach puede estar en varios equipos.
- **Sueldo**: cada equipo le paga **150 ONYX Coins por semana** a cada coach que tiene. Se cobra solo **cada lunes a las 00:00 (hora de Argentina)** desde la revisión automática de Netlify (la misma del bot; no hace falta tener Discord configurado). Un coach fichado antes del lunes cobra ese lunes.
- **Sin coins**: si al equipo no le alcanza, el sueldo queda pendiente (aparece en Panel → *Coaches* y en el panel del capitán). El equipo paga **US$ 5** y el staff toca *Pagó US$ 5: renovar a 6.000*: el equipo queda con 6.000 coins menos lo que debía y el coach cobra lo pendiente. Si antes de eso el equipo junta coins, el pendiente se paga solo el lunes siguiente.
- **Saldo del coach**: lo que cobra de sueldo es su saldo para **canjear premios** (1 coin = 1 punto). El canje lo pide el capitán de un equipo donde está el coach, igual que para un jugador.
- Los montos (sueldo, dólares y coins de la recarga) los cambia ultra staff en Panel → *Coaches*.

## Canjes de premios

Sección pública **Canjes**: muestra los premios con foto, costo en pts y/o precio en USD, y el saldo de cada jugador.

- **Ultra staff** (Panel → *Canjes*): agrega premios con foto (se achica sola), costo en pts, precio en USD, stock y descripción; los edita, oculta o borra.
- **Capitanes**: son los únicos que canjean. Tocan *Canjear*, eligen el jugador de su equipo y si pagan con puntos o en dólares.
- **Staff**: aprueba o rechaza cada pedido (con nota) y marca cuando se entregó.
- **Saldo** = puntos individuales del jugador − canjes con puntos pedidos o aprobados. Los puntos del ranking y de los premios individuales no cambian.

## ONYX Bot (Discord)

El bot vive en Netlify: no hace falta tener una compu prendida. Lee todo de la web en vivo.

**Comandos para todos:** `/tabla`, `/proximos`, `/resultados`, `/jugador`, `/equipo`, `/ranking`, `/mapas`, `/mercado`, `/premios`, `/ayuda`.
**Comandos para admins del servidor:** `/anuncio` (necesita *Gestionar servidor*) y `/rol` (necesita *Gestionar roles*).

**Avisos automáticos de cada fecha** (a los dos equipos que juegan, en la categoría de cada equipo; **uno por cruce**, con la ida y la vuelta en el mismo mensaje):

| Canal | Qué manda | Cuándo (por defecto) |
|---|---|---|
| `equipo-chat` | Aviso de la ida y vuelta con días, horas y posiciones | 24 h y 1 h antes de la ida |
| `equipo-info` | Menciona al rol del equipo y pide roles, y que el capitán elija en la web la ida o la vuelta (mapa y lado) | 24 h antes de la ida |
| `equipo-strats` | Pide estrategias y clips, con datos del rival | 24 h antes de la ida |
| `equipo-partidos` | Recuerda subir la captura con las stats de la ida y de la vuelta | Al empezar la ida |

Además: el resultado (ida y vuelta en un mensaje, cuando se cargaron los dos) con las stats del equipo va al canal *partidos* de cada equipo; el mapa sorteado va al *info* de los dos equipos; y en los canales generales salen recordatorios, resultados, sorteos y fichajes. Todos los horarios se cambian desde el panel.

**El panel** (pestaña *ONYX Bot*, solo `ultra1` y `ultra2`): detectar canales y roles, elegir horarios, activar o pausar avisos, mandar avisos a mano, publicar anuncios con vista previa, publicar tabla, próximos o resultados, y dar o quitar roles. Todo queda en el registro de auditoría.

### Instalación (una sola vez)

1. https://discord.com/developers/applications → **New Application** → `ONYX Bot`.
2. **General Information**: copiá *Application ID* y *Public Key*.
3. **Bot**: *Reset Token* y copiá el token. Activá **Server Members Intent**. Subí la foto `onyx-bot-avatar.png`.
4. **Installation** (o el link del panel): invitá el bot con permiso de **Administrador**. En *Ajustes del servidor → Roles*, arrastrá el rol **ONYX Bot** arriba de los roles de los equipos.
5. En Discord activá *Ajustes → Avanzado → Modo desarrollador*, clic derecho en el servidor → **Copiar ID del servidor**.
6. Netlify → *Environment variables*: `DISCORD_APP_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`. Opcional: `BOT_ADMINS` (por defecto `ultra1,ultra2`). Después **Trigger deploy**.
7. Portal de Discord → **General Information → Interactions Endpoint URL**: `https://onyxt1.netlify.app/api/discord` → Save.
8. Web → Panel → **ONYX Bot** → *Registrar comandos* → *Detectar automáticamente* → *Guardar* → *Activar avisos automáticos*.

No hace falta cambiar las reglas de Firebase: la configuración del bot solo la toca el servidor.

## Resumen público (menos lecturas de Firebase)

El plan gratis de Firebase permite unas 50.000 lecturas por día. Antes, cada visita leía todos los documentos de la liga (cientos). Ahora:

- Los **visitantes y jugadores** leen **un solo documento** (`public/meta`) y bajan el resumen de la liga por `/api/snapshot`, que queda en la caché de Netlify. La página además guarda el último resumen en el navegador y se pinta al instante.
- El **staff y los capitanes** siguen viendo todo al instante (escuchan cada colección).
- Cuando el staff o un capitán guarda algo público, la página le avisa al servidor (`/api/publish`) y se actualiza solo eso. Si el servidor no responde, queda anotado y lo procesa la revisión de cada 10 minutos. Una vez por hora se controlan partidos y equipos, y todas las noches se rearma todo.
- ONYX Bot también lee el resumen en la revisión automática y en los comandos (el panel del bot sigue leyendo lo último cargado).
- Si algo se ve desactualizado: Panel → Seguridad → *Rearmar ahora*.

Hasta que se arme el primer resumen (lo hace la revisión de cada noche, o el botón *Rearmar ahora*), la página funciona como antes.

## Copias de seguridad

- **Todas las noches** (03:17) se guarda una copia completa de la base en Netlify Blobs (fuera de Firebase). Quedan las últimas 30.
- **Antes de borrar** resultados, jugadores u ofertas, de cerrar la temporada o de restaurar, se hace otra copia automática.
- Panel → **Seguridad** (ultra): lista de copias, *Hacer una copia ahora*, *Descargar* (guardala en tu compu de vez en cuando) y *Restaurar* (también desde un archivo descargado).
- Restaurar no toca las cuentas, la auditoría ni ONYX Bot. Los borrados grandes piden escribir una palabra para confirmar.

## Resultados por captura

- Después de jugar, cada **capitán** abre su panel → *Resultados* → *Cargar resultado*, sube la captura del marcador y toca **Leer la captura**: la página completa el marcador, el mapa y las estadísticas (K / D / A y ACS) de los 10 jugadores. Revisa y manda.
- Si los **dos capitanes mandan lo mismo**, el partido se carga solo en la tabla (se puede apagar en Panel → Resultados). Si no coinciden, el staff los compara con las dos capturas.
- El **staff** tiene *Carga rápida* (Panel → Resultados): un partido entero de una vez, con captura, texto pegado (`Nombre 20/10/5 250`) o a mano.
- La lectura con IA usa Gemini de Google, gratis: creá una clave en <https://aistudio.google.com/apikey> y cargala como `GEMINI_API_KEY` en Netlify. El cupo gratis se renueva cada día; si se agota, se carga a mano. (Opcional, pago: `ANTHROPIC_API_KEY` para usar Claude.) Cada persona tiene un máximo de lecturas por día (Panel → Resultados). Sin la clave, todo lo demás funciona igual (texto pegado o a mano).
- Para que reconozca mejor a cada jugador, cargá su **Riot ID** en Panel → Jugadores → *Nombre en el juego y Discord*.

## Playoffs

Panel → **Playoffs**: elegís cuántos clasifican (2, 4, 6 u 8), al mejor de cuántos se juega cada ronda y si hay tercer puesto, y se arma el cuadro con la tabla. Cargás cada partido y el ganador pasa solo. La sección pública *Playoffs* muestra el cuadro (con pantalla completa para transmitir) y el inicio muestra al campeón. Los playoffs no suman a la tabla.

## Temporadas e Historia

Panel → General → **Temporada** → *Cerrar la temporada* (ultra):

1. Se guarda una copia de seguridad completa.
2. La temporada queda archivada: campeón, tabla final, premios, playoffs y estadísticas de cada jugador.
3. La liga arranca de cero (partidos, sorteos, fichajes, mapas usados, asistencia, pronósticos, votaciones y playoffs). Fair play vuelve a 100, las coins arrancan en el valor que elijas y el saldo de canjes de cada jugador pasa a la temporada nueva. Jugadores, equipos, logos, premios, coaches y sueldos quedan igual.

La sección **Historia** muestra los campeones de cada temporada, los títulos por equipo y los récords de todos los tiempos. La ficha de cada jugador muestra su carrera.

## Jugadores con Discord

Los jugadores entran con su cuenta de Discord (sin contraseñas) y vinculan su cuenta con su jugador (lo aprueba su capitán o el staff). Con eso:

- **Mi perfil**: sus números de la temporada y de toda su carrera.
- **Confirmar asistencia** a la próxima fecha (el capitán lo ve en su panel).
- **Pronósticos**: eligen quién gana cada partido antes de que empiece; 1 punto por acierto y ranking de la comunidad.
- **Votación de capitán real**: moción con 2 firmas, 48 horas para votar, voto secreto y 2/3 del plantel. Si se aprueba, el capitán del equipo cambia solo (la cuenta de capitán la reasigna un ultra).

Para activarlo (una sola vez):

1. <https://discord.com/developers/applications> → la aplicación de ONYX Bot → **OAuth2**.
2. Copiá el **Client Secret** y cargalo en Netlify como `DISCORD_CLIENT_SECRET` (el `DISCORD_APP_ID` ya está por el bot).
3. En *Redirects* agregá `https://TU-SITIO.netlify.app/api/auth/discord/callback` y guardá.
4. Volvé a publicar el sitio en Netlify.

Si cargás el usuario de Discord de cada jugador (Panel → Jugadores), la cuenta se vincula sola cuando entra.

## Cuentas con mail y coaches

- **Crear cuenta**: en *Entrar → Creala acá*, jugadores y coaches se registran con nick, mail y contraseña (10 caracteres o más). La cuenta la crea el servidor (`/api/register`), queda marcada como jugador/coach y nunca puede pasar por staff ni capitán. Máximo 5 cuentas nuevas por conexión y por día. Para cortar los registros: `signupOff: true` en `league/config`.
- **Entrar**: con el mail y la contraseña en el mismo formulario del staff. *Me olvidé la contraseña* manda un correo de Firebase para elegir una nueva.
- **Jugadores**: igual que con Discord, buscan su nombre y tocan "Soy yo" (lo aprueba el capitán o el staff).
- **Coaches**: al registrarse (o desde Mi perfil) piden el equipo. Lo aprueba el **capitán de ese equipo** (en su panel) o el **staff** (en Solicitudes). Al aprobarlo, la cuenta se une al coach de la liga con el mismo nombre (o se crea uno) y el equipo empieza a pagarle el sueldo semanal.
- **Seguimiento** (menú Jugadores): para coaches aprobados (sus equipos), capitanes (su equipo) y staff (todos). Tiene ACS por partido contra el promedio de la liga, K/D y diferencia de rondas, los mejores del equipo, tabla de jugadores con tendencia de los últimos 3 partidos y, por jugador, comparación con el promedio de su rol, fortalezas y qué puede mejorar.
- **Notas** (solo el coach): generales para el equipo o para cada jugador, de tipo *A mejorar*, *Bien hecho* o *Nota*, y visibles para todo el equipo, solo para ese jugador o solo para el coach (privadas). Las guarda el servidor (`/api/coach`, colección `coachnotes`): cada jugador ve en Mi perfil solo las de su equipo y las suyas.

## Economía y dólares

- Panel → **Economía**: cómo están repartidas las ONYX Coins (con avisos si un equipo tiene mucho más o mucho menos que el promedio), registro de los dólares que entran y salen (las recargas y los canjes pagados en dólares se anotan solos) y exportación a CSV.
- *Link de pago* (Mercado Pago, PayPal, etc.): los capitanes lo ven en su panel cuando deben sueldos.
- *Recargas por temporada*: límite de recargas por equipo, para que nadie compre ventaja en el mercado.
- *Qué compran los dólares*: texto que sale en el **Reglamento** público, junto con las reglas de la liga, la economía y el aviso legal de Riot.

## Seguridad de las cuentas

- Cada persona cambia su contraseña desde el botón de su cuenta (abajo en la barra lateral). Pide la actual y al menos 10 caracteres.
- Panel → Seguridad → *Sesiones*: un ultra puede cerrar las sesiones de cualquier cuenta. Para cortar el acceso al instante, desactivá la cuenta en Cuentas y auditoría.
- ONYX Bot sigue siendo solo para `ultra1` y `ultra2` (variable `BOT_ADMINS`). Cualquier otro ultra (por ejemplo `ultra3`) maneja todo lo demás.

## Pruebas automáticas

`npm test` corre las pruebas del servidor (resumen público, copias, resultados, pronósticos, votación, avisos del bot, mapas y sueldos). En GitHub corren solas en cada cambio (`.github/workflows/pruebas.yml`): si algo se rompe, aparece una cruz roja.

## Probar en tu compu (opcional)

```bash
npm install
npm test
npx netlify-cli dev
```

Para probar la función en tu compu, cargá las mismas variables de entorno en un archivo `.env`, que no se sube.
