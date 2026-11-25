# ADR-05: Sentry para el monitoreo de fallos y el reporte de errores

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha ADR-05 |
| Requerimientos relacionados | RF-17, RNF-02, RNF-03 |
| Minuto del video | No registrado en el documento grupal |

## 1. Contexto y problema

En la elección pasada la aplicación se cerraba sola en algunos celulares y nadie supo por qué. Los veedores escribían por WhatsApp «se cerró solo» o «no me deja registrar», sin indicar la pantalla, el modelo ni la versión de Android.

Se necesita que la aplicación **reporte los fallos por sí misma** al personal técnico, indicando:
- a cuántas personas les ocurre;
- en qué versión de la app, qué modelo de dispositivo y qué versión de Android;
- también los errores que **no cierran la app** pero impiden terminar una tarea;
- y, si el fallo ocurre **sin conexión**, guardar el reporte y enviarlo al recuperar la señal.

## 2. Decisión

Se elige **Sentry** (SDK de React Native) porque es la única opción que reúne:
- captura de **cierres nativos**;
- registro de errores que **no cierran la app**;
- **rastro de las pantallas** previas al error;
- control de la información que viaja, para **eliminar cédulas, nombres, teléfonos y correos** de los reportes;
- almacenamiento de eventos **sin señal** para enviarlos después.

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **Sentry (SDK de React Native)** ✅ | Jairo Maigua | Captura errores nativos y de JavaScript; guarda acciones y pantallas previas; reporta modelo y versión de Android; almacena eventos sin conexión | Los cierres nativos requieren un build de desarrollo o el APK. Plan gratuito con cupo limitado de eventos |
| Firebase Crashlytics | Kevin Amagua | Muy usado en Android; agrupa los fallos y cuenta a cuántos usuarios afectan | Requiere un proyecto de Firebase configurado de forma nativa con Expo. Según el documento, menos detalle que Sentry en cierres inesperados |
| Tabla propia en Supabase | Oscar Vázquez | No depende de terceros; datos consultables con SQL y un panel propio | No captura cierres nativos: si la app se cierra antes de registrar el error, se pierde. Hay que construir una cola de envíos sin señal |
| BugSnag | Milka Borja | Monitoreo móvil con reportes de fallos y seguimiento de versiones | Plan gratuito más limitado que el de Sentry para la jornada de prueba |

## 4. Justificación

- El enunciado pide no depender de que la persona avise ni sepa explicar el problema. Sentry cubre los tres casos (cierre nativo, error que bloquea una tarea y fallo sin conexión).
- Permite **filtrar datos personales** antes del envío, coherente con la confidencialidad (RNF-02).

## 5. Consecuencias

**Positivas**
- El equipo sabe dónde empezar a buscar sin depender de la descripción del usuario.

**Negativas**
- Dependencia de un proveedor externo.
- Límites del plan gratuito: el documento indica que hay que establecer un plan para gestionar su uso.

## 6. Relación con el examen

- **Rúbrica:** «Detección y reporte de fallos» (1 pt): *el estudiante debe provocar un fallo y mostrar el reporte recibido en su herramienta de monitoreo*.
- **Enunciado, sección «Estabilidad de la aplicación».**

## 7. Evidencia de implementación

| Qué | Dónde |
|---|---|
| Inicialización única, `sendDefaultPii: false` y filtro de PII (correos, cédulas, teléfonos, tokens) | `src/data/repositories/MonitoreoSentry.ts` |
| Pantalla actual (tag `pantalla` + migas de navegación) | `MonitoreoSentry.registrarPantalla` |
| Provocar un fallo de prueba | Botón «Probar monitoreo» del tablero provincial → caso de uso `ProbarMonitoreo` (`src/domain/use-cases/monitoreo.ts`) |
| Contrato del dominio | `src/domain/repositories/MonitoreoRepository.ts` |

**Diferencias y pendientes**
- En **Expo Go** solo se observan errores de JavaScript. Los **cierres nativos** y el envío diferido sin red se comprueban con el **APK**, como advierte este ADR.
- El DSN del APK depende de las variables de entorno de EAS (pendiente según `CONTEXTO_PROYECTO.md`).
- El plan de gestión del cupo gratuito no está documentado en el repositorio.
- El usuario se identifica solo por su UUID; no se envían nombres (cumple el filtrado acordado).
