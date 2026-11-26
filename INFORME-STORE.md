# ONYX Store · Entrega del 26 de noviembre de 2026

La base utilizada fue ONYX-Billeteras.zip. Este paquete contiene el proyecto de Netlify, sus funciones, recursos locales y pruebas. La actualización está preparada en código. No se aplicaron escrituras al sitio publicado, a la base de datos de la liga ni al servidor de Discord.

## Qué cambia para los jugadores

Desde Premios se abre un catálogo con 380 personalizaciones distribuidas en 20 colecciones. Incluye 60 banners, 40 marcos, 80 insignias, 60 títulos, 30 etiquetas, 20 temas, 25 efectos, 30 avatares, 15 grupos de estrellas y 20 adornos de avatar independientes. Hay 55 objetos gratuitos en la configuración inicial. Los identificadores existentes se conservan. El catálogo genera 380 representaciones SVG distintas a partir de motivos compartidos. Esta actualización incorpora 20 diseños de adorno, revisa el dibujo de los 40 marcos y añade 20 portadas SVG locales. La colección original aportaba los otros artículos.

ONYX Studio permite combinar capas sobre el perfil, comparar con la apariencia real, buscar por texto, filtrar, guardar tres borradores o diez con Premium y canjear una combinación en una transacción. La vista de capitán mantiene visibles los datos competitivos. El mercado puede alternar apariencia social y scouting. El componente del perfil se comparte con la tienda, las tarjetas de mercado, el plantel y las alineaciones previas. El cambio local de equipamiento actualiza las tarjetas visibles. La consulta de datos necesita conexión.

El catálogo base usa 0, 25, 55, 95, 160, 275 y 425 OC según rareza y complejidad. Las excepciones configuradas por la administración tienen prioridad. Música cuesta 200 OC y el rol con canal de Discord, 250 OC. Premium cuesta 350 OC por 30 días, 850 OC por 90 días y 2.500 OC por 365 días. La compra comprueba el saldo personal, las condiciones vigentes y el precio esperado. Los fichajes conservan la moneda del equipo. El stock y las condiciones de premios externos dependen de lo que publique la organización.

## Discord y administración

Se identificaron tres defectos en el código base. El proceso de publicación salía antes de enviar las bajas y podía marcarlas como completadas. Los jugadores históricos liberados sin una postulación vinculada también quedaban fuera de la cola de agentes libres. El cron subordinaba toda la cola del mercado a la configuración de comandos interactivos. Se corrigieron los tres casos. Un fallo al refrescar el resumen público tras un fichaje tampoco impide procesar la cola confirmada. La causa concreta de un incidente de producción requiere consultar los registros del evento y del despliegue.

Los intercambios oficiales actualizan las dos plantillas en una transacción y generan un anuncio conjunto. Los destinos previstos son 1575215567391039498 para movimientos y 1575217513476657162 para libres. Ultra Admin dispone de verificación del bot y acceso al canal, prueba de envío identificada, consulta de eventos, enlace al anuncio y reintentos. El envío de una prueba es lo que permite confirmar permisos efectivos de escritura. La sección ONYX Store incluye destacados ordenados, catálogo, paquetes, precios, transacciones y reembolsos con motivo para canjes cosméticos nuevos trazables. Los recibos históricos sin relación con un débito concreto quedan fuera de este reembolso.

## Datos y puesta en marcha

1. Extraé el ZIP y subí el contenido al repositorio conectado al sitio de Netlify. netlify.toml debe quedar en la raíz, junto a public y netlify. Desplegá el proyecto completo con sus Functions.
2. Conservá FIREBASE_SERVICE_ACCOUNT, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_APP_ID, DISCORD_PUBLIC_KEY y los ajustes existentes para login, pagos y roles. El servidor indicado es 1550607388267122788. SITE_URL debe apuntar al dominio público correcto. DISCORD_ROLE_PREMIUM_ID corresponde al rol de la membresía cuando se usa esa integración.
3. El cron crea el catálogo base en storebase y registra su versión en socialconfig/storeSeed. La configuración manual permanece en socialconfig/catalog. Las configuraciones del vestidor se guardan en socialprofiles. socialreceipts incorpora los artículos adquiridos y la referencia al débito. playernotices y noticeprefs conservan los avisos individuales y su última lectura. Estos datos se escriben mediante Functions. Esta entrega conserva el archivo de reglas de la base recibida.
4. En Ultra Admin abrí Automatizaciones y Discord. Verificá el acceso y probá ambos canales. Confirmá la publicación de un movimiento real y revisá su ID. Una consulta correcta del canal por sí sola no acredita capacidad de publicar embeds.

## Música

Se integró la API de búsqueda de Wikimedia Commons, con selección verificada por ID en el servidor y resultados limitados a grabaciones identificadas como CC0 o dominio público. El reproductor usa el archivo remoto. Conserva la preferencia individual de volumen y comienza al 20 % si el visitante no tiene una guardada. Las grabaciones comerciales, sus álbumes y sus portadas pueden faltar. El proveedor no necesita clave. El filtro se probó con respuestas controladas. Falta verificar búsqueda y reproducción desde el dominio publicado.

Referencias técnicas consultadas para evaluar alternativas: https://www.mediawiki.org/wiki/API:Search · https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia · https://developer.spotify.com/policy · https://developers.google.com/youtube/terms/developer-policies · https://performance-partners.apple.com/resources/documentation/itunes-store-web-service-search-api

## Verificación y alcance pendiente

Pasaron 89 pruebas de Node con la configuración del proyecto. Se comprobó la sintaxis de los módulos de frontend y backend. Entre los escenarios verificados con dependencias simuladas se incluyen las ofertas pendientes, fichajes, bajas, reintentos sin duplicación, intercambio, conservación del inventario, permisos, saldo, compra combinada idempotente, reembolso, semilla y filtro musical. El entorno de empaquetado no contiene un ejecutable operativo de Chromium. Queda pendiente repetir la prueba visual de extremo a extremo de este ZIP en escritorio y en un dispositivo móvil real.

La actualización cubre parte de las 47 etapas. Quedan pendientes la unificación de identidad en todas las clasificaciones, seguidores y comparadores, el conjunto completo de filtros y favoritos de scouting, las métricas de vistas y pruebas por producto, el editor visual integral de portadas, la gestión granular de entregas externas, los avisos de vencimiento, logros y lanzamientos, las preferencias completas de notificación, los controles globales completos de movimiento y audio, y la auditoría pantalla por pantalla. La integración actual registra movimientos confirmados y canjes en el centro de avisos. No se certificaron los 25 escenarios contra Netlify, Firestore y Discord reales ni la entrega de roles, pagos o premios externos en producción.

## Archivos nuevos y modificados frente al ZIP base

- INFORME-STORE.md
- netlify/functions/bot-cron.mjs
- netlify/functions/market.mjs
- netlify/functions/recruitment.mjs
- netlify/functions/social.mjs
- netlify/lib/community-sync.mjs
- netlify/lib/music-search.mjs
- netlify/lib/notices.mjs
- netlify/lib/store-init.mjs
- public/assets/colecciones/0.svg
- public/assets/colecciones/1.svg
- public/assets/colecciones/10.svg
- public/assets/colecciones/11.svg
- public/assets/colecciones/12.svg
- public/assets/colecciones/13.svg
- public/assets/colecciones/14.svg
- public/assets/colecciones/15.svg
- public/assets/colecciones/16.svg
- public/assets/colecciones/17.svg
- public/assets/colecciones/18.svg
- public/assets/colecciones/19.svg
- public/assets/colecciones/2.svg
- public/assets/colecciones/3.svg
- public/assets/colecciones/4.svg
- public/assets/colecciones/5.svg
- public/assets/colecciones/6.svg
- public/assets/colecciones/7.svg
- public/assets/colecciones/8.svg
- public/assets/colecciones/9.svg
- public/css/store.css
- public/index.html
- public/js/app.js
- public/js/catalogo.mjs
- public/js/perfiles.mjs
- public/js/profile-card.mjs
- public/js/store.mjs
- tests/community-workflow.test.mjs
- tests/social.test.mjs
