# ONYX Leagues · Perfiles, colecciones y Discord

## Billeteras y recompensas

Desde Inicio o el menú lateral, **Mi billetera y recompensas** muestra los OC disponibles, créditos, reservas, canjes e historial del jugador vinculado. En la misma pantalla se pueden pedir premios con puntos, canjear música, rol y canal de Discord, o membresías Premium. La tienda de cosméticos tiene accesos por categoría.

En el panel de staff, **Billeteras** permite elegir un jugador, revisar sus movimientos y acreditar o descontar OC con motivo. **Recompensas** reúne los pedidos de canje, su aprobación y entrega, y un formulario para premiar a los participantes de un partido con acta oficial. El staff decide el importe antes de confirmar. Cada partido admite una acreditación grupal por temporada. Ultra Admin puede agregar premios, editar precios y gestionar el catálogo cosmético. Las cuentas existentes conservan sus créditos y gastos al instalar esta actualización.

Se aprobaron 84 pruebas de regresión, incluidas las nuevas de permisos, reservas, acreditación por partido y revisión de pedidos. Las pantallas de billetera, catálogo y formularios administrativos se recorrieron con Chrome local y datos de prueba.

## Publicación

1. Descomprimí el ZIP en el repositorio que compila Netlify. `netlify.toml`, `public` y `netlify` deben quedar en la raíz del repositorio. El proyecto necesita un despliegue que compile las Functions.
2. Publicá el archivo completo `firestore.rules` incluido en Firebase Console → Firestore Database → Reglas. Los canjes de puntos de jugadores que pide un capitán ahora se reservan en el servidor. Las cuentas de coaches mantienen el flujo anterior.
3. En Netlify, mantené las variables de Firebase y Discord que ya utiliza la liga. Para el beneficio de Discord Premium, agregá `DISCORD_ROLE_PREMIUM_ID` con el ID del rol Premium de tu servidor. Asigná a ese rol permiso de ver el canal Premium y poné el rol del bot por encima en la jerarquía. El bot necesita gestionar ese rol. El cron revisa vencimientos cada diez minutos.
4. Para estadísticas externas, la integración existente usa `HENRIKDEV_API_KEY`. Tracker se abre con el Riot ID del jugador. El panel también permite registrar una métrica comprobada, su fecha y el enlace al perfil correspondiente.
5. Tras desplegar, abrí Mercado → Perfiles de jugadores. Desde una cuenta vinculada probá un artículo gratuito. En Ultra Admin → Perfiles y tienda podés revisar precios, inventario y errores de roles.

## Qué encuentra cada persona

El visitante puede abrir y compartir el perfil, consultar los datos de scouting, usar la vista competitiva y comparar hasta tres jugadores. El perfil organiza el resumen, las estadísticas de la liga, las rankeds, las partidas, la trayectoria, los trofeos oficiales, la parte social y la colección. En las fichas se distingue el rango declarado del obtenido por el proveedor. Las clasificaciones antiguas con premios archivados aparecen en la trayectoria competitiva del jugador.

El jugador vinculado puede editar su biografía, cargar una foto estática y declarar agentes secundarios. Puede filtrar la tienda por precio, búsqueda, categoría, colección, rareza, novedades, destacados, gratuidad y acceso Premium. Puede probar un diseño en cabecera, guardar deseos, equipar artículos y consultar sus últimos 30 canjes. Un descuento de colección se calcula sobre los artículos disponibles que todavía puede comprar. La compra permanente y el acceso temporal de Premium se evalúan por separado en el servidor.

Los capitanes siguen usando el mercado existente para comprar. El equipo de origen conserva como mínimo cinco jugadores y el comprador puede llegar hasta siete. La corrección de avisos de la versión anterior está incluida. El destino de los agentes libres es el canal `1575217513476657162`. El destino de los fichajes y traspasos confirmados es `1575215567391039498`. El bot debe poder ver esos canales, leer su historial, enviar mensajes e insertar enlaces. Un Ultra Admin puede revisar los errores y reintentar desde Operaciones de Discord.

## Catálogo inicial

| Tipo | Artículos | Gratuitos |
|---|---:|---:|
| Banners | 60 | 10 |
| Marcos | 40 | 5 |
| Insignias | 80 | 10 |
| Títulos | 60 | 10 |
| Etiquetas | 30 | 5 |
| Temas | 20 | 3 |
| Efectos | 25 | 0 |
| Avatares | 30 | 10 |
| Estrellas | 15 | 0 |
| **Total** | **360** | **53** |

Cada una de las 20 colecciones incluye tres banners, dos marcos, cuatro insignias y tres títulos. El catálogo usa identificadores estables y se genera sin crear 360 documentos de Firestore. Cada vista previa base produce una imagen SVG distinta. La tienda carga doce artículos por página. Ultra Admin puede crear artículos y colecciones, elegir motivos, cargar arte raster, fijar períodos de venta, precios promocionales, fechas, paquetes y descuentos. Las decoraciones usan diseños y animaciones compartidos por familia.

| Beneficio | Precio inicial |
|---|---:|
| Premium por 30 días | 350 OC |
| Premium por 90 días | 850 OC |
| Premium por 365 días | 2.500 OC |
| Música permanente | 200 OC |
| Rol personal y canal exclusivo de Discord | 250 OC |
| Editor permanente de banner, título y etiqueta | 175 OC |

El editor permanente tiene un precio inicial elegido para esta versión. El descuento inicial de colección es del 15 %. Ambos son editables. El rol y canal personalizados generan un canje pagado para que el staff acuerde el nombre y realice la entrega. El rol Premium sí se sincroniza automáticamente para miembros vinculados a Discord. Los canjes usan los puntos individuales disponibles e incluyen reservas previas. El presupuesto del equipo sigue destinado al mercado.

El editor admite imágenes estáticas optimizadas y GIF de avatar Premium de hasta 80 KB. Los textos se escapan, se limitan en longitud y se comprueba que no simulen cargos oficiales habituales. Ultra Admin puede retirar contenido, conceder artículos y administrar días Premium. Al expirar la membresía, los ajustes quedan guardados para una renovación. El reproductor acepta enlaces de audio compatibles de Wikimedia Commons, usa un volumen inicial del 20 % y permite activar reproducción automática. Cada navegador puede exigir una interacción manual. La vista competitiva desactiva la música y las decoraciones.

## Datos y gráficos

Las estadísticas ONYX toman sus datos de las actas oficiales. El perfil muestra resultados, K/D/A, ACS, MVP, evolución, mejor actuación y comparaciones por temporada según los registros disponibles. El radar compara percentiles de la liga. Las vistas incluyen filtros de 5, 10 y 20 registros, curvas, barras, distribución por grupo y evolución de los puntos de rendimiento. El archivo de temporadas anteriores conserva totales. El detalle por mapa o por ronda depende de lo que guardó cada acta.

Las rankeds usan el proveedor HenrikDev que ya integraba la liga. Los datos diarios de rango y RR comienzan a acumularse con la primera actualización exitosa de esta versión. Las series extensas se piden al abrir el perfil para mantener liviano el resumen público de la liga. Las verificaciones manuales de Ultra Admin aparecen con una etiqueta y fecha propias. Una cuenta sin datos conserva el acceso al resto de su ficha y al enlace de Tracker si declaró un Riot ID.

La conexión directa con Riot Sign On requiere configuración y aprobación propias. Este ZIP no incluye una aplicación RSO aprobada ni credenciales de Tracker Network. Consultar los requisitos vigentes del proveedor antes de habilitarlo para la liga. Referencia de Riot: https://developer.riotgames.com/docs/valorant

## Archivos de esta actualización sobre la versión Avisos

| Archivo | Cambio |
|---|---|
| public/index.html, public/js/app.js | Accesos en Mi perfil, Mercado, Premios, scouting y Ultra Admin. Puente con los datos reales, comparación y reservas de canjes. |
| public/js/catalogo.mjs | Colecciones, precios iniciales, vistas previas SVG, derechos temporales y paquetes. |
| public/js/perfiles.mjs, public/css/perfiles.css | Perfiles, pestañas, filtros, gráficos, equipo, tienda, editor, reproductor y administración. |
| netlify/functions/social.mjs | Proyección pública, validaciones de cuenta, transacciones de compra, reservas, moderación, verificación y administración. |
| netlify/lib/premium-sync.mjs, netlify/functions/bot-cron.mjs | Sincronización y reintento del rol Premium. |
| netlify/lib/valstats.mjs, netlify/lib/publish.mjs | Historial de rankeds y RR, fecha del último éxito y resumen liviano. |
| netlify/lib/applications.mjs | Fecha de incorporación para las nuevas fichas creadas desde inscripciones. |
| firestore.rules | Reserva de canjes de puntos de jugadores a través del backend. |
| tests/social.test.mjs | Pruebas del catálogo, canjes, autorización, vencimiento, verificación, moderación y sincronización de roles. |

## Pruebas y alcance

80 pruebas automáticas aprobadas en Node, incluidas las regresiones de mercado, inscripción, resultados y avisos. Se probaron en memoria las reservas de saldo, los reintentos, los artículos previamente comprados, el cambio de precio, la caducidad y la asignación y retirada del rol Premium. En Chrome se recorrieron las ocho pestañas y el panel de administración con datos de prueba, la tienda de doce artículos por página, los filtros, la vista previa y el selector de temporadas. Se comprobó el ancho en 390 y 1366 píxeles.

La prueba de integración final con las credenciales, canales, permisos, saldos y datos reales de ONYX requiere el despliegue en tu entorno. Los perfiles históricos pueden carecer de fecha de ingreso. KAST, ADR, agentes, aces, clutches y first bloods requieren datos reales que las capturas existentes pueden omitir. Los valores que falten quedan sin publicar. Las canciones se reproducen desde su fuente y el responsable del perfil debe elegir material que pueda compartir.
