# ONYX Leagues · Auditoría de entrega 5
26 de noviembre de 2026 · Base comparada: ONYX-Store-4.zip. El código incluido es una actualización del proyecto completo de Netlify. El entorno publicado y los datos de la liga no se modificaron durante la revisión.

## Discord y el mercado

El código heredado tenía tres caminos que explican anuncios perdidos. Las bajas podían marcarse como atendidas sin publicarse, los jugadores antiguos sin postulación vinculada podían quedar fuera del aviso de libres y el cron dependía de la configuración de los comandos interactivos para llegar a la cola. La versión 4 ya corregía esos tres casos. En esta revisión se guarda el destino al crear el trabajo, se respetan esperas prolongadas que pide Discord y se distingue un error definitivo de uno reintentable. Un evento cancelado queda fuera del procesamiento automático. Si falla la inicialización del backend, el cron informa un fallo en lugar de indicar éxito. También se corrigieron los enlaces al jugador y al equipo.

Destino de fichajes y traspasos: 1575215567391039498. Destino de jugadores libres: 1575217513476657162. Servidor: 1550607388267122788. La suite cubre ofertas pendientes, confirmaciones, bajas, intercambios, concurrencia, reintento y recuperación de un ID persistido. La causa exacta de un incidente anterior en el servidor depende del registro de esa operación, la versión desplegada y los permisos efectivos en ese momento. No se envió ningún anuncio al servidor real.

## Cobertura por etapa

| Etapa | Implementación y evidencia disponible |
|---|---|
|1 Identidad|Premios abre ONYX Store. Estilos oscuros, acentos dorados, portadas y controles compartidos. Falta validación visual en dispositivos físicos.|
|2 Navegación|Catálogo, categorías, deseos, inventario, billetera e historial. La compra usa saldo individual.|
|3 Portada|Colecciones, destacados, gratuitos, lanzamientos, paquetes y sugerencias según propiedad. Falta el editor visual integral de campañas de temporada.|
|4 Tarjetas|La representación depende de la categoría. Cada recurso se genera al mostrarlo. Queda revisión táctil y artística individual.|
|5 Detalle|Prueba sobre los datos del perfil, variantes cuando existen, precio y saldo. Se verificaron plantillas de las 380 fichas.|
|6 Perfil|Renderizador compartido por tienda, probador y distintas superficies competitivas. Cobertura completa en toda la plataforma aún pendiente.|
|7 Studio|Combinación por capas, borradores, comparación, precio de faltantes y compra validada. Las pruebas locales cubren vista conjunta y compra en lote.|
|8 Modos|Seis vistas con controles de efectos. Falta revisión visual en resoluciones y dispositivos reales.|
|9 Catálogo|380 personalizaciones en 20 colecciones. Los diseños se componen con motivos compartidos. La prueba de integridad no mide calidad artística.|
|10 Colecciones|Vista de conjunto, artículos, progreso, coste restante y ahorro cuando hay paquete. Se probaron los cálculos de progreso en las 20 colecciones.|
|11 Búsqueda|Texto normalizado, filtros combinables, chips, limpieza y ordenamientos. Falta prueba completa de navegación y desplazamiento con teclado y táctil.|
|12 Búsqueda musical|Apple para metadatos comerciales y enlace oficial. Commons para audio de licencia admitida. Resultados y selección se validan por proveedor.|
|13 Reproductor|Audio de Commons, preferencias de volumen, 20 % inicial y silencio global. Apple abre el destino oficial. Pendiente probar audio en móvil y con bloqueo de reproducción.|
|14 Desbloqueo|Música permanente por 200 OC o acceso temporal por Premium. La selección de canción se conserva independientemente del permiso de reproducción.|
|15 Canje|Backend valida precio, propiedad y saldo. Se ofrece equipar o conservar. La suite incluye compra simultánea, repetición y compra combinada.|
|16 Vestidor|Equipar, quitar, combinar y guardar configuraciones. Límite base de tres y diez con Premium.|
|17 Premium|30, 90 y 365 días por 350, 850 y 2.500 OC. El rol real requiere configuración de Discord y una prueba en el servidor.|
|18 Externos|Gestión de premios, disponibilidad, stock, región, condiciones y entrega. Los premios monetarios dependen de existencias reales.|
|19 Competición|Las estadísticas y el comparador siguen accesibles sin Premium. Los datos ausentes no se sustituyen por estadísticas inventadas.|
|20 Ultra Admin|Precios, destacados, paquetes, reembolsos trazables, premios externos y métricas. Pendientes editor integral de portadas, administración integral del proveedor y reembolsos históricos sin referencia de débito.|
|21 Rendimiento|Catálogo de carga progresiva, recursos locales y control de movimiento. Pendiente medición de red, memoria y fluidez en dispositivos reales.|
|22 Transacciones|Compras en backend, saldo individual, validación de propiedad y recibos. Se restringieron ajustes de saldo y escrituras económicas. Pendiente validación de reglas con emulador y auditoría integral de moderación de archivos.|
|23 Pruebas por fase|Hay pruebas de componentes y flujos. No se certificó una pasada integral de cada fase en el entorno desplegado.|
|24 Identidad compartida|Ampliada en mercado, plantillas, comparador y clasificaciones. Queda completar y auditar todas las vistas secundarias, incluidos seguidores, historial y administración.|
|25 Mercado|Modos social y scouting, perfiles ampliados, estadísticas y Tracker cuando hay datos. Falta inspección visual de todos los estados y gráficos.|
|26 Capitanes|Filtros avanzados de estadísticas, favoritos locales por usuario y comparador de tres. Se conservan mínimo de cinco al ceder, máximo de siete al incorporar y moneda de equipo.|
|27 Rediseño general|Sistema visual común aplicado a las páginas. No se completó un rediseño individual de cada dashboard, pantalla de cuenta y error.|
|28 Diseño|Tokens, preferencias y estilos comunes. Se conservan los recursos de marca y del equipo recibidos. No se certificó su representación en cada resolución.|
|29 Movimiento|Controles de movimiento y transiciones en la interfaz. Pendiente cubrir y probar todas las animaciones de logros, MVP y subidas de nivel.|
|30 Publicación inicial|Semilla automática para el catálogo y configuración separada para ajustes manuales. La primera ejecución real del cron queda pendiente de despliegue.|
|31 Decoraciones|20 siluetas ornamentales nuevas aplicables al catálogo de marcos y adornos. Pendiente inspección de recortes y contraste en todas las superficies.|
|32 Precios|Escala de precios determinista por rareza y complejidad. Se conservan valores configurados por la administración.|
|33 Administración|Catálogo base automático y gestión de premios externos. Existencias y condiciones requieren carga de la organización.|
|34 Staff|Inspección de elementos ocultos y prueba sobre copia de perfil. El acceso se comprueba en backend.|
|35 Permisos|Separación de inspección, gestión de externos y ajustes de saldo/precios. Queda pendiente verificar la matriz entera de permisos en producción.|
|36 Diagnóstico|Se identificaron fallos de código y se probaron correcciones. Sin registros autenticados del incidente real no se puede atribuir su causa histórica.|
|37 Canal oficial|Destino configurado y flujo de movimientos confirmados probado con Discord simulado. Falta envío real.|
|38 Embeds|Embeds por tipo de movimiento y enlaces corregidos. Falta verificar visualmente menciones, logos y enlaces desde el canal real.|
|39 Libres|Avisos de disponibilidad y actualización al fichar. Probados ciclos con dependencias simuladas.|
|40 Eventos|Cola persistente de movimientos y avisos personales desde el backend. Pendiente cubrir íntegramente todos los eventos sociales y de progresión.|
|41 Recuperación|Identificadores, estados, bloqueo de trabajo, reintentos progresivos y recuperación de ID. Se probaron cancelación y esperas largas de Discord.|
|42 Automatizaciones|Verificación de canales, pruebas identificadas, reintento, cancelación, sincronización y diagnóstico. Requiere validación con el bot instalado.|
|43 Sincronización|Confirmación conserva inventario y economía personal. Plantilla, historial y efectos externos tienen pruebas locales. Falta recorrido real con permisos de roles.|
|44 Notificaciones|Centro con lectura individual y masiva, preferencias, créditos, mercado, entregas y recordatorios Premium. Faltan flujos completos de logros, niveles y colecciones nuevas.|
|45 Auditoría|Revisión de código, permisos, rutas y componentes. Pendiente recorrido visual y operativo completo de todas las pantallas.|
|46 Escenarios|Ver matriz siguiente. Los resultados locales no acreditan recepción de mensajes por Discord ni funcionamiento en un móvil físico.|
|47 Entrega|ZIP completo, informe, lista de cambios y pruebas. La publicación y la aceptación en producción siguen pendientes.|

## Catálogo y economía

60 banners, 40 marcos, 80 insignias, 60 títulos, 30 etiquetas, 20 temas, 25 efectos, 30 avatares, 15 decoraciones de estrellas y 20 adornos de avatar. Son 380 objetos y 20 portadas existentes. Esta entrega agrega 20 motivos vectoriales por código, reutilizados por los marcos y adornos. No son 380 ilustraciones nuevas dibujadas individualmente. De los precios iniciales, 55 objetos son gratuitos y los escalones de pago son 25, 55, 95, 160, 275 y 425 OC. Música 200 OC. Rol y canal personalizado 250 OC. Los valores manuales aplicados en tu liga pueden diferir.

## Pruebas de aceptación

100 pruebas locales de Node aprobadas, cero fallidas. La suite usa dobles de Firestore y Discord para varios flujos y renderización de componentes con un entorno DOM mínimo. La comparación visual en Chromium estuvo bloqueada porque el entorno de ejecución carecía de un navegador local operativo. No se ejecutó una compra, pago, moderación o entrega con cuentas reales.

| Escenarios obligatorios | Evidencia y límite |
|---|---|
|1–2 Marco en mercado y banner en equipo|Renderizador y actualización local en código. Falta recorrido con dos sesiones y recarga contra Firestore real.|
|3 Datos para capitanes|Prueba del renderizador y disponibilidad competitiva en vista de capitán.|
|4–5 Prueba y combinación antes de comprar|Pruebas de capas y datos reales de perfil suministrados al componente de prueba.|
|6 Compra y equipamiento|Pruebas de backend y representación. Pendiente recorrido por navegador con sesión real.|
|7–9 Inspección, prueba gratuita y límites de Staff|Cobertura de catálogo privado, permisos y pruebas sin débito. Falta validar el panel con los roles desplegados.|
|10 Alta de premio externo|Probada mediante el backend con permisos y stock.|
|11–18 Libre, traspaso, intercambio, baja, silencio de solicitudes y anuncios|Flujos y publicaciones comprobados con servicios simulados. Pendiente confirmar los dos destinos reales.|
|19–21 Desconexión, recuperación, reinicio|Pruebas de fallo temporal, recuperación de ID de mensaje y reintentos. Falta ensayo de recuperación en el despliegue.|
|22 Conservación del inventario|Prueba de intercambio y economía personal.|
|23 Animaciones móviles|Pendiente prueba en dispositivo real.|
|24 Catálogo completo|380 fichas generan vista previa, con recursos compartidos por colección. Pendiente control visual de cada diseño.|
|25 Catálogo de punta a punta|Búsqueda, favoritos, filtros, plantillas y transacciones se probaron por componentes. Falta recorrer el flujo completo en navegador.|

## Despliegue y datos

1. Extraé el ZIP y desplegá desde el repositorio conectado a Netlify con netlify.toml en la raíz. El paquete incluye tanto public como netlify/functions.
2. **Publicá firestore.rules de esta versión** en el proyecto Firebase que usa la liga. Hay cambios de permisos respecto de la versión 4. Probá lectura y escritura con cuentas de jugador, Staff y Ultra Admin antes de abrir el mercado.
3. Conservá las variables existentes. Para Firebase y entregas de Discord verificá FIREBASE_SERVICE_ACCOUNT, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID y SITE_URL. Para comandos y login conservá DISCORD_APP_ID, DISCORD_PUBLIC_KEY y DISCORD_CLIENT_SECRET. DISCORD_ROLE_PREMIUM_ID vincula el rol de membresía. No se necesitan claves nuevas para los proveedores musicales seleccionados.
4. Los productos base se materializan en storebase por el cron, con versión en socialconfig/storeSeed. Los ajustes manuales siguen en socialconfig/catalog. Los recibos de tienda son personales. Los avisos se guardan en playernotices y noticeprefs. Los trabajos de Discord en communityjobs incorporan metadatos de destino y diagnóstico. Las métricas usan storemetrics y storemetricdays. Para limpiar los contadores diarios de deduplicación, configurá TTL en storemetricdays sobre expiresAt. La revisión no migró ni escribió datos de producción.
5. En Ultra Admin → Automatizaciones y Discord, verificá ambos canales y ejecutá las dos pruebas identificadas. Confirmá los IDs de mensaje y el permiso para publicar embeds. En el próximo fichaje real comprobá el anuncio y la actualización de la publicación de libre. Un resultado de acceso al canal por sí solo no demuestra entrega.

## Música

La búsqueda comercial consulta Apple iTunes Search para canción, artista, álbum, duración y portada cuando existen. Las pistas de Apple enlazan al proveedor. Para audio integrado se buscan grabaciones en Commons identificadas como CC0 o de dominio público. Eso limita el repertorio reproducible dentro del perfil. La autorización de audio y la cobertura real dependen del tema, región y proveedor. Selecciones y respuestas de proveedores se probaron con datos controlados.

Documentación consultada: https://performance-partners.apple.com/resources/documentation/itunes-store-web-service-search-api · https://developer.spotify.com/policy · https://developers.google.com/youtube/terms/developer-policies · https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia

## Archivos cambiados frente a ONYX-Store-4.zip

- AUDITORIA-ONYX-5.md
- firestore.rules
- netlify/functions/bot-cron.mjs
- netlify/functions/market.mjs
- netlify/functions/recruitment.mjs
- netlify/functions/social.mjs
- netlify/functions/staff.mjs
- netlify/lib/community-sync.mjs
- netlify/lib/discord.mjs
- netlify/lib/music-search.mjs
- netlify/lib/notices.mjs
- netlify/lib/player-wallet.mjs
- netlify/lib/store-commerce.mjs
- public/404.html
- public/css/league-system.css
- public/css/store.css
- public/index.html
- public/js/app.js
- public/js/billetera.mjs
- public/js/catalogo.mjs
- public/js/league-preferences.js
- public/js/ornamentos.mjs
- public/js/perfiles.mjs
- public/js/store-filters.mjs
- public/js/store.mjs
- public/pagar.html
- public/postular.html
- public/setup.html
- tests/community-workflow.test.mjs
- tests/social.test.mjs
- tests/store-screens.test.mjs
