# ONYX League · Pagos, acceso a Discord y mercado

## Qué cambia para los jugadores

1. El jugador abre /postular, vincula Discord y envía su ficha. También puede usar /postular en el canal de encuestas.
2. Aceptar la solicitud habilita /pagar y la carga del comprobante para esa cuenta. El jugador elige Mercado Pago ($3.000 ARS, alias abril.pilla) o PayPal. El enlace de PayPal suministrado no especifica monto ni moneda.
3. El archivo aparece en el canal privado configurado con el medio elegido, el usuario y el Riot ID. El staff abre el comprobante desde Solicitudes y contrasta la acreditación en la cuenta receptora. Puede rechazarlo y permitir otro archivo. La revisión vincula la decisión con la huella del archivo que vio el administrador.
4. Verificar el pago crea la ficha de agente libre por 1.500 ONYX Coins y registra los trabajos de acceso y anuncio. Si el jugador ya está en Discord, se asignan los roles. Si está fuera, recibe una invitación dirigida a su ID con 24 horas de vigencia y un único uso. También puede abrirla desde su ficha personal.
5. El bot comprueba los ingresos nuevos en su tarea programada cada diez minutos. Registra cuándo observó al miembro en el servidor y los IDs de rol comprobados. Si el destinatario entró por otro medio, la presencia por sí sola no identifica qué invitación utilizó. Un enlace público de una plataforma de pago también puede abrirse fuera de ONYX. La validación administrativa sigue controlando el alta.

## Mercado y administración

En Panel → Mercado, una oferta puede pasar de pendiente a en revisión y aceptada antes de confirmarse. El staff puede confirmarla directamente, rechazarla o cancelarla. El capitán puede cancelar la suya. La confirmación escribe plantel, saldos, historial, estado de la oferta y tareas de Discord en la misma transacción. Los cambios de equipo manuales desde el panel utilizan el mismo servicio.

El canal 1575215567391039498 recibe el anuncio de fichaje o traspaso ejecutado. El canal 1575217513476657162 recibe los anuncios de disponibilidad con el jugador, rango y rol principal. Al ficharlo se edita el aviso anterior. Al liberarlo se puede emitir un nuevo aviso. El bot ajusta los roles de equipo configurados para las fichas verificadas y conserva los tres roles de acceso.

En Panel → Solicitudes se verifican comprobantes y se reintentan invitaciones vencidas. Panel → Mercado → Operaciones de Discord y pagos muestra el historial, los errores de entrega, el estado de las invitaciones, los IDs de los roles comprobados y los reintentos de sincronización y anuncios. Las operaciones quedan en Firestore aunque se reinicie el bot.

## Publicación

1. Publicar las reglas del archivo firestore.rules en Firebase y desplegar el proyecto completo con Netlify Functions. Coordinar ambos cambios: la versión anterior del frontend escribía ofertas directamente en Firestore.
2. En Netlify, conservar las credenciales de Firebase Admin y de Discord OAuth2 y las variables DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, DISCORD_APP_ID, DISCORD_CLIENT_SECRET y SITE_URL. Usar DISCORD_GUILD_ID = 1550607388267122788. Registrar el callback https://onyxoficial.netlify.app/api/auth/discord/callback en Discord.
3. Cargar los IDs numéricos reales del servidor en DISCORD_ROLE_PAID_ID (Pago Verificado), DISCORD_ROLE_PLAYER_ID (Player) y DISCORD_ROLE_VERIFIED_ID (Verificado). En ONYX Bot, conservar el mapeo entre equipos y roles. Poner el rol del bot por encima de todos los roles que debe administrar. Para trámites nuevos, una configuración incompleta queda registrada como error reintentable.
4. Registrar los comandos desde el panel. Desde el canal de postulaciones, ejecutar /encuesta canal_comprobantes:#comprobantes. También se admite DISCORD_RECEIPTS_CHANNEL_ID. Configurar DISCORD_INVITE_CHANNEL_ID para elegir el canal de bienvenida. Restringir el canal de comprobantes al staff y al bot, denegando Ver canal a @everyone.
5. El bot necesita Gestionar roles, Crear invitación y permisos de gestión de invitaciones para revocar enlaces antiguos. En los canales de anuncios necesita Ver canal, Enviar mensajes, Insertar enlaces y Leer el historial. En el de comprobantes también necesita Adjuntar archivos. Para la revisión de planteles, mantener Server Members Intent. Los enlaces de pago entregados están incorporados. MP_INSCRIPCION_URL y MP_ACCESS_TOKEN siguen siendo alternativas opcionales de Mercado Pago.
6. Después del despliegue, comprobar con una cuenta de prueba el mensaje privado, la aceptación de la invitación, los roles y ambos canales. No se hicieron cobros, mensajes ni cambios en el servidor de producción durante la preparación del ZIP.

## Datos y compatibilidad

| Datos | Uso |
|---|---|
| recruits, recruitjobs y receiptuploads | Estados de solicitud, pago e ingreso, entrega privada temporal y reintentos. |
| receipthashes y paymenthistory | Detección de archivos idénticos entre cuentas e historial de envío y decisiones del staff. Las imágenes recortadas o modificadas requieren revisión humana. |
| invitehistory | Creación, expiración y observación de ingreso. |
| communityjobs, communitylocks y marketposts | Tareas persistentes, exclusión por jugador y referencias a mensajes editables. |
| players, teams, offers, transfers, pubqueue y audit | Planteles, monedas, decisiones, publicación web y auditoría. |

La migración gradual conserva fichas, planteles y pagos ya verificados. Revisa las invitaciones anteriores de jugadores con pagos pendientes y revoca los enlaces vigentes que el bot conoce. Las inscripciones antiguas creadas solo con un nombre pueden vincularse desde Solicitudes con el ID numérico y la comprobación del usuario. Los nuevos anuncios se originan en el flujo actualizado; el historial anterior de transferencias no se republica. Los roles verificados no se otorgan a cuentas sin una inscripción aprobada y pagada.

## Archivos modificados o nuevos

- Reglas y documentación: firestore.rules, README.md, FODA.md e INFORME-ONYX.md.
- Web: public/postular.html, public/pagar.html, public/js/apply.js, public/js/pagar.js y public/js/app.js.
- Funciones: netlify/functions/recruitment.mjs, market.mjs, inscripcion-pago.mjs y bot-cron.mjs.
- Módulos del servidor, en netlify/lib: applications.mjs, recruit-delivery.mjs, recruit-upgrade.mjs, community-sync.mjs, recruitment.mjs, survey-fields.mjs, notify.mjs y backup.mjs.
- Pruebas, en tests: community-workflow.test.mjs, inscripcion-fixture.test.mjs y recruitment-tiebreak.test.mjs.

## Verificación

Pasaron las 63 pruebas de Node y la comprobación de sintaxis de los archivos JavaScript del frontend y de las funciones. En Chrome con una vista móvil de 390 × 844 y servicios simulados se probó el bloqueo del pago antes de la aceptación, su habilitación posterior, el selector de medio, la carga de un PDF y el enlace de PayPal.

Las pruebas de integración local cubren postulación y aprobación, comprobante enviado y rechazado, archivo repetido entre cuentas, publicación tras verificar el pago, acceso del titular, vencimiento y renovación de invitación, miembro preexistente, ingreso detectado después, roles y jerarquía, anuncios mínimos, cancelación y rechazo, confirmación concurrente con orden de commit simulado, edición del aviso anterior, liberación, recuperación tras error temporal y reintento tras publicación. Los servicios simulados comprueban el destinatario, los parámetros y el número de envíos. Quedan por validar las credenciales, permisos efectivos, recepción real y límites del entorno publicado.

Se corrigieron el envío de invitaciones antes de verificar el pago, la publicación prematura del agente libre y la actualización separada del equipo y las monedas. Los anuncios usan un identificador persistente, nonce y búsqueda de un envío anterior ante respuestas interrumpidas. La recuperación depende de que el bot conserve acceso al historial del canal. Las reglas ahora reservan las mutaciones de ofertas y de equipo al backend.

Referencias técnicas de Discord: https://docs.discord.com/developers/resources/channel y https://docs.discord.com/developers/topics/permissions.

