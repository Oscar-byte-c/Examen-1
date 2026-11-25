# ADR-05: Usar Sentry para detectar y reportar los fallos de la aplicación

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha ADR-05).

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-17:** registrar cierres inesperados y errores que impiden terminar una tarea, con datos del dispositivo, y enviarlos al recuperar la red.
- **RNF-02:** no exponer datos personales.
- **RNF-03:** monitoreo con modelo, versión de Android y pantalla.

## Contexto
En la elección anterior otra app se cerraba sola en algunos celulares y nunca se supo por qué. Los veedores escribían por WhatsApp «se cerró» o «no me deja», sin decir en qué pantalla estaban, qué teléfono tenían ni qué versión de Android usaban, y el equipo técnico no pudo reproducir los errores.

La organización quiere enterarse por su cuenta, sin depender del usuario: a cuántas personas les pasa, en qué dispositivos y en qué parte de la app. También quiere conocer los errores que no cierran la app pero impiden terminar una tarea, como una foto que no se sube, y recibir los reportes de fallos ocurridos sin conexión cuando vuelva la señal. Un `console.log` o un mensaje en pantalla no llega a nadie.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Sentry, SDK de React Native** (propuesta por Jairo Maigua) | Captura errores nativos y de JavaScript. Guarda las acciones y pantallas previas al error, el modelo del teléfono y la versión de Android, y almacena eventos sin conexión. | Los cierres nativos solo se capturan en un *build* de desarrollo o en el APK. El plan gratuito tiene un cupo limitado de eventos. |
| Firebase Crashlytics (propuesta por Kevin Amagua) | Muy usado en Android; agrupa los fallos y cuenta cuántos usuarios los sufren. | Requiere un proyecto de Firebase configurado de forma nativa con Expo; según el documento grupal, da menos detalle en los cierres inesperados. |
| Tabla propia de errores en Supabase (propuesta por Oscar Vázquez) | No depende de terceros; los datos se consultan con SQL desde un panel propio. | No captura cierres nativos: si la app se cierra antes de registrar el error, se pierde. Habría que construir una cola de envío sin señal. |
| BugSnag (propuesta por Milka Borja) | Monitoreo móvil con reportes de fallos y seguimiento de versiones. | Su plan gratuito es más limitado para la jornada de prueba. |

## Decisión
Se usa **Sentry**. Según el equipo, reúne lo que pide el enunciado: cierres nativos, errores que no cierran la app y rastro de las pantallas previas. Además permite controlar qué información viaja, para eliminar cédulas, nombres, teléfonos y correos, y guarda los eventos sin señal para enviarlos después. La tabla propia se descartó porque pierde justo los cierres; Crashlytics y BugSnag, por la configuración nativa y por el cupo gratuito.

## Consecuencias
- **Precisión del 25/11:** el `.docx` dice que Sentry es «la única» opción con ese conjunto. Es más exacto decir que es **la que mejor cubría el conjunto evaluado**: Crashlytics y BugSnag también reportan cierres nativos.
- **Implementación** (`src/data/repositories/MonitoreoSentry.ts`):
  - `Sentry.init` con `sendDefaultPii: false`;
  - `beforeSend` y `beforeBreadcrumb` borran correos, cédulas o teléfonos de 9–10 dígitos y tokens;
  - el usuario se identifica solo por su UUID;
  - `registrarPantalla` agrega el tag `pantalla` y una miga de navegación.
- **Arquitectura:** el dominio solo conoce la interfaz `MonitoreoRepository`, y el monitoreo se inicia en `app/_layout.tsx`.
- **Errores que no cierran la app:** se reportan el fallo de `sincronizar_acta` (por ejemplo, la foto que no se sube) y los fallos al restaurar la sesión o al sincronizar automáticamente.
- **Demostración de RF-17:** el botón «Probar monitoreo» del tablero provincial (caso de uso `ProbarMonitoreo`, en `src/domain/use-cases/monitoreo.ts`) envía un error con la etiqueta `prueba_monitoreo` y muestra su identificador.
- **Limitaciones:**
  - en **Expo Go** solo se ven errores de JavaScript; los cierres nativos y el reenvío sin red dependen del SDK nativo, es decir, del **APK**;
  - el DSN del APK viene de las variables de entorno de EAS;
  - el filtro usa expresiones regulares: un dato personal con un formato inesperado podría pasar.

## Verificación
- **Automática:** «Prueba de monitoreo» en `reglas.test.ts` (2 pruebas): envía un error con su etiqueta y devuelve el identificador del evento; sin DSN, devuelve nulo.
- **Manual:** el estudiante comprobó que el evento de «Probar monitoreo» llegó a Sentry.
- **Pendiente:**
  - provocar un cierre nativo con el APK y verlo en Sentry;
  - provocar un error en modo avión y comprobar que llega al reconectar.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, después del consenso del 22/11.
- **ChatGPT** estuvo **parcialmente** de acuerdo. La elección es razonable, pero «la única opción» es una afirmación absoluta, y el botón de prueba no demuestra los cierres nativos ni el envío diferido. Recomendó pruebas separadas por tipo de fallo y documentar el filtro de datos.
- **Gemini** también estuvo **parcialmente** de acuerdo y coincidió en lo de «la única». Explicó por qué Sentry supera a una tabla propia: un cierre nativo aborta JavaScript antes de poder insertar nada, mientras que el SDK nativo guarda el evento en disco. Afirmó que **faltaba un `beforeSend`** para no filtrar cédulas o tokens.
- **Claude**, que participó en la redacción (no es un revisor independiente), comprobó que **Gemini se equivoca en ese punto**: `beforeSend` y `beforeBreadcrumb` ya existen en `MonitoreoSentry.ts`, con el filtro de datos personales.

Las tres mantienen Sentry, igual que el equipo.
- **Se aceptaron:** la precisión sobre «la única» y las pruebas separadas por tipo de fallo (pendientes).
- **Se descartó:** la observación de Gemini sobre `beforeSend`, porque el código ya lo tiene.
