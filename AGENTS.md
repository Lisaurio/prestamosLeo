# Instrucciones para el agente
Habla siempre en español

Desarrollo de aplicaciones web con Google Apps Script, Google Sheets, PHP, MySQL, HTML, CSS y JavaScript. Especialización en soluciones Mobile-First, aplicaciones PWA instalables, automatización de procesos, integración de servicios y gestión de bases de datos. Adaptación constante a nuevas tecnologías, frameworks y herramientas de desarrollo.**

Instructions & Rules:

1. Arquitectura y Persistencia (Regla de Oro)
Prohibido el Hardcoding: Ningún dato editable (precios, nombres, teléfonos, mensajes de WhatsApp, colores de marca, opciones de listas) debe estar en el código.

Origen de Datos: Todo debe leerse y escribirse en Google Sheets o PropertiesService.

Configuración: Si la app tiene parámetros variables, crear una sección o pestaña de "Configuración" accesible desde la interfaz.

2. UI/UX: Mobile-First e Instalabilidad
Viewport: <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">.

PWA Ready: Toda app debe incluir un manifest.json (vía Blob o inline) con display: standalone y start_url para ser instalable.

Favicon: Intentar forzar el logo como favicon mediante vinculación externa o Base64, asegurando que se vea al "Agregar a pantalla de inicio".

Inputs Inteligentes: Usar inputmode="numeric", inputmode="decimal", type="tel" y type="email" según corresponda para desplegar el teclado correcto.

Cero Scroll: Evitar desbordes horizontales y minimizar el vertical. Botones grandes y espaciados para uso táctil.

Modo Oscuro: Toda app debe incluir un toggle o detección automática del sistema para cambiar entre modo claro y oscuro, usando variables CSS (--bg, --text, etc.) y `prefers-color-scheme`.

3. Formato de Moneda (Localización)
Default: Peso Argentino ($).

Lógica de Decimales:

Si termina en ,00, eliminarlos (Ej: $ 15.000).

Si tiene decimales reales, mostrarlos (Ej: $ 15.000,25).

USD: Solo si se solicita explícitamente (Ej: USD 150).

FECHAS: En el formato tradicional de Argentina (Ej: 25/09/2025)

4. Protocolo de Modificación Segura
Cambio Atómico: Realizar únicamente la modificación solicitada.

Integridad: No refactorizar, no cambiar estilos no mencionados, no renombrar variables y no optimizar código ajeno al pedido específico para evitar romper funcionalidades existentes.

5. Rendimiento y Backend
Apps Script: Uso eficiente de google.script.run.

Feedback: Siempre incluir indicadores de carga (spinners) para acciones de lectura/escritura.

Vainilla: Priorizar JS y CSS puro para evitar librerías pesadas y asegurar velocidad de carga en móviles.
- Al finalizar cada cambio, indicar EXACTAMENTE qué archivo(s) se modificaron (ruta completa y nombre) para que el usuario sepa cuál subir a Apps Script.
- Si se modifican varios archivos, listarlos todos.
- No cambiar nada que no sea estrictamente necesario para la tarea solicitada.

6. Documentación de Instalación
Toda aplicación debe incluir un archivo README.md con instrucciones paso a paso de instalación, configuración y despliegue, incluyendo: requisitos previos, servicios externos necesarios (Firebase, API keys, etc.), cómo configurarlos, y cómo desplegar la app.

7. Anti-Doble Click (Regla Obligatoria)
Protección contra envíos duplicados: Todo formulario que ejecute una operación de escritura (guardar, editar, eliminar, login) debe deshabilitar el botón de envío inmediatamente después del primer click.

Implementación: Usar una flag btn._enviando = true al inicio del handler y verificar if (btn._enviando) return;.

Restauración: Re-establecer btn._enviando = false tanto en el éxito como en el error.

Regla general: Cualquier evento click que dispare una operación asíncrona debe incluir esta protección para evitar duplicados.

8. Instrucciones de Instalación en la App (Regla Obligatoria)
Toda app PWA debe incluir instrucciones de instalación visibles dentro de la interfaz, con detección automática de plataforma (Android, iOS, PC).

Implementación: Botón 📲 en el header que abre un modal con el texto específico para la plataforma detectada via navigator.userAgent.

Android: menú ⋮ → "Agregar a pantalla de inicio"
iOS: icono 📤 → "Agregar a pantalla de inicio"
PC: icono de instalación en la barra de direcciones o favoritos

El modal debe tener un botón "Entendido" para cerrarlo.

9. Soporte Offline (Regla Obligatoria)
Toda app que use Firebase/Firestore debe habilitar persistencia offline con `db.enablePersistence({synchronizeTabs:true})` para que las escrituras funcionen sin conexión.

Implementación:
- Agregar un banner visible (amarillo/advertencia) cuando `navigator.onLine === false`
- Escuchar eventos `online`/`offline` del window para mostrar/ocultar el banner
- En cada operación de escritura (guardar, editar, eliminar, pagar), mostrar un mensaje distinto según conectividad:
  - Online: "Operación exitosa ✅"
  - Offline: "📦 Cambio guardado — se sincronizará cuando haya conexión" (tipo warning)
- Al reconectarse, refrescar automáticamente la página actual para reflejar datos sincronizados
- Usar `Promise.all` para agrupar escrituras relacionadas (ej: pagar préstamo = update + add)
