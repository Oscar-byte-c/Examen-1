# ADR-10: NetInfo con cola local en SQLite y UUID idempotente para sincronizar automáticamente

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-14, RF-16, RNF-03, RNF-04, S-04 | `Documento_Consolidado_ADR.docx`, ficha 4.10 (numerada «ADR-0010») |

## 1. Problema y contexto
Sin señal, las actas se perdían o, al reintentar sin saber el estado, se duplicaban.

## 2. Objetivo
Enviar automáticamente al volver la red, una sola vez, y mostrar siempre el estado exacto de cada acta.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **NetInfo + cola en SQLite + identificador único por acta** ✅ | Kevin Amagua | Detecta la pérdida y la vuelta de la red y envía en orden; el servidor acepta cada acta una sola vez | Hay que programar la máquina de estados y los reintentos; una dependencia más | — (elegida) |
| Sincronización solo manual con un botón | Jairo Maigua | Lógica simple | No cumple RF-16: depende de que el veedor lo presione horas después | No es automática |

## 4. Decisión y justificación
NetInfo + cola transaccional en expo-sqlite + UUID idempotente por acta u operación. Hay que controlar la concurrencia para que dos avisos de red no procesen lo mismo a la vez.
> **Nota de precisión (25/11/2026):** tener red no garantiza que el servidor responda: el acta solo queda «Enviada» cuando la RPC confirma.

## 5. Implementación real
- `src/data/datasources/local/dispositivo.ts`: conectado = `isConnected && isInternetReachable !== false`.
- `ActaRepositoryImpl.ts`:
  - la promesa `enCurso` impide dos procesamientos a la vez;
  - la foto se sube a `{mesa}/{acta}/{operacion}.jpg` y un «ya existe» se toma como éxito;
  - con un error de red, el acta vuelve a «pendiente» con el **mismo** UUID;
  - con otro error, queda «fallida» y se reporta a Sentry.
- **Servidor (`sincronizar_acta`):** `operacion_id` **único** en `actas_historial` y en `actas_conflictos`; `select … for update` sobre el acta antes de comparar versiones.
- `syncStore.ts`: dispara el envío al recuperar la red, al volver la app al primer plano, al iniciar sesión y **cada 60 s** mientras haya actas no enviadas · botón «Enviar ahora» · `etiquetas.ts` (estados visibles) · `expo-crypto` (UUID).

## 6. Consecuencias
✔ Ninguna acta se pierde por falta de señal y no hay duplicados al reintentar.
✘ Más lógica de estados.

## 7. Riesgos y limitaciones
- **Verificado:** no hay espera progresiva (*backoff*) entre reintentos; la cola solo cuenta los `intentos`.
- **Verificado:** un acta «fallida» por un error permanente (por ejemplo, sin permiso tras una reasignación) cuenta como pendiente: con conexión **se reintenta cada 60 s** indefinidamente y cada fallo se reporta a Sentry (ruido y consumo del cupo). No existe un estado «fallo definitivo».
- Dos primeros envíos simultáneos de la misma mesa: uno falla por `unique (mesa_id, dignidad)` y al reintentar queda como conflicto.

## 8. Pruebas y evidencias
- ✅ Indirecta: `sesionLocal.test.ts` (guardar sin red).
- ⏳ Sin prueba automática de idempotencia.
- ⏳ Manual: modo avión → reconectar → «Enviada» una sola vez; la misma operación enviada dos veces → una sola versión.

## 9. Evaluación de las IA (revisión posterior del 25/11)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | De acuerdo | Conectividad no es lo mismo que servidor disponible; estados, *backoff* y confirmación |
| Gemini | Aprobado con mejoras de resiliencia | Portales cautivos; operación compuesta (Storage + base); estados `PENDING / IN_FLIGHT / SYNCED / FAILED_PERMANENT`; *backoff* exponencial; no generar un UUID nuevo en cada reintento |
| Claude* | De acuerdo con matices | **Verificó:** el UUID se conserva en los reintentos; `operacion_id` es único; existe `for update`; `isInternetReachable` atenúa los portales cautivos; la foto se sube de forma idempotente. **Confirma** que faltan el *backoff* y el estado de fallo definitivo: con conexión, un acta fallida se reintenta cada 60 s |

- **Acuerdo:** mantener el patrón.
- **Ya implementado:** UUID estable, unicidad en el servidor, bloqueo `for update` y estados visibles.
- **Recomendaciones válidas aún no implementadas:** *backoff* y estado «fallo definitivo» (quedan como mejora; no cambian la decisión).

\* Claude no es independiente: redactó los ADR y conoció las otras dos evaluaciones.

## 10. Conclusión y preguntas de defensa
**Conclusión:** se mantiene; la idempotencia está bien resuelta en el servidor y la deuda está en la política de reintentos.
- **¿Qué evita duplicados?** Cada envío lleva un UUID guardado con restricción única en el servidor: si llega dos veces, responde lo mismo sin crear otra versión.
- **¿Tener Wi-Fi significa que se envió?** No; NetInfo solo dispara el intento. El acta es «Enviada» cuando el servidor responde.
- **¿Qué pasa si dos teléfonos envían a la vez?** La fila del acta se bloquea con `for update`: el segundo encuentra otra versión y su envío queda como conflicto para el coordinador.
