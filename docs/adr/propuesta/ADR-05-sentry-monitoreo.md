# ADR-05: Sentry para el monitoreo de fallos y el reporte de errores

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-17, RNF-02, RNF-03 | `Documento_Consolidado_ADR.docx`, ficha ADR-05 |

## 1. Problema y contexto
La app anterior se cerraba sola y los veedores solo escribían «se cerró» por WhatsApp, sin decir la pantalla, el teléfono ni la versión de Android.

## 2. Objetivo
Enterarse de los fallos sin depender del usuario (también de los que no cierran la app) y recibirlos aunque ocurran sin conexión.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **Sentry (SDK React Native)** ✅ | Jairo Maigua | Errores nativos y de JS; pantallas previas; modelo y versión de Android; guarda eventos sin conexión | Cierres nativos solo con un build o APK; plan gratuito limitado | — (elegida) |
| Firebase Crashlytics | Kevin Amagua | Agrupa los fallos y cuenta los usuarios afectados | Configuración nativa de Firebase con Expo; menos detalle en cierres inesperados | Menos detalle para lo pedido |
| Tabla propia en Supabase | Oscar Vázquez | Sin terceros; consultas SQL; panel propio | No captura cierres nativos; habría que construir una cola sin señal | Perdería justo los cierres |
| BugSnag | Milka Borja | Monitoreo móvil y versiones | Plan gratuito más limitado | Cupo insuficiente para la jornada |

## 4. Decisión y justificación
Sentry, porque reúne cierres nativos, errores que no cierran la app, rastro de pantallas, control de los datos enviados (sin cédulas, nombres, teléfonos ni correos) y eventos guardados sin señal.
> **Nota de precisión (25/11/2026):** el `.docx` dice que Sentry es «la única» con ese conjunto. Es más exacto decir que es **la que mejor cubría el conjunto evaluado**: Crashlytics y BugSnag también reportan cierres nativos.

## 5. Implementación real
- `src/data/repositories/MonitoreoSentry.ts`: `Sentry.init` con `sendDefaultPii: false`; `beforeSend` y `beforeBreadcrumb` borran correos, cédulas o teléfonos de 9–10 dígitos y tokens; el usuario solo se identifica por su UUID; tag `pantalla`.
- `src/domain/repositories/MonitoreoRepository.ts` · caso de uso `ProbarMonitoreo` (`src/domain/use-cases/monitoreo.ts`) · botón «Probar monitoreo» en el tablero del provincial.
- `ActaRepositoryImpl.ts` reporta el fallo de `sincronizar_acta`; `authStore.ts` y `syncStore.ts` reportan otros fallos de tareas.
- `app/_layout.tsx`: inicia el monitoreo y registra la pantalla actual.

## 6. Consecuencias
✔ Se sabe dónde buscar el problema sin depender de la descripción del usuario.
✘ Proveedor externo y cupo gratuito limitado.

## 7. Riesgos y limitaciones
- En **Expo Go** solo se ven errores de JavaScript. Los cierres nativos y el reenvío sin red dependen del SDK nativo, es decir, del **APK**.
- El DSN del APK depende de las variables de entorno de EAS.
- El filtro usa expresiones regulares: un dato personal con un formato inesperado podría pasar.

## 8. Pruebas y evidencias
- ✅ Automatizadas: `reglas.test.ts`, «Prueba de monitoreo» (2): envía un error con la etiqueta `prueba_monitoreo` y devuelve su id; devuelve null sin DSN.
- 🟡 Manual: el evento de «Probar monitoreo» llegó a Sentry (comprobado por el estudiante).
- ⏳ Pendiente: cierre nativo y modo avión con el APK.

## 9. Evaluación de las IA (revisión posterior del 25/11)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | **Parcialmente de acuerdo** | «Única opción» es absoluto; el botón no prueba todos los tipos de fallo |
| Gemini | **Parcialmente de acuerdo** | Coincide con lo anterior y afirma que **falta `beforeSend`** para no filtrar cédulas |
| Claude* | De acuerdo con las correcciones | **Gemini se equivoca en `beforeSend`:** ya existe en `MonitoreoSentry.ts`, con filtro de datos personales |

- **Acuerdo (las tres):** mantener Sentry; matizar «la única»; probar el cierre nativo y el modo sin red por separado.
- **Error de una IA:** Gemini no tuvo el código y supuso que faltaba `beforeSend`.
- **Alternativas señaladas por las IA:** ninguna nueva.

\* Claude no es independiente: redactó los ADR y conoció las otras dos evaluaciones.

## 10. Conclusión y preguntas de defensa
**Conclusión:** se mantiene; se corrige la palabra «única» y se separan las pruebas por tipo de fallo.
- **¿Cómo provocan un fallo?** Con «Probar monitoreo»: envía un error con la etiqueta `prueba_monitoreo` y muestra su id para buscarlo en Sentry.
- **¿Era la única opción?** No; Crashlytics y BugSnag también reportan cierres. Sentry era la que mejor cubría todo junto.
- **¿Se envían datos personales?** No: `beforeSend` borra correos, cédulas, teléfonos y tokens, y el usuario va solo con su UUID.
- **¿Funciona sin internet?** El SDK nativo guarda el evento y lo envía después; eso se demuestra con el APK, no en Expo Go.
