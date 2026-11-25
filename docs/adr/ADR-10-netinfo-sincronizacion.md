# ADR-10: NetInfo con cola local en SQLite para sincronizar automáticamente al recuperar la conexión

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha 4.10 (numerada **ADR-0010** en el documento) |
| Requerimientos relacionados | RF-14, RF-16, RNF-03, RNF-04, S-04 |
| Minuto del video | No registrado en el documento grupal |

## 1. Contexto y problema

Muchos veedores de recintos rurales no tienen señal al terminar el conteo. En procesos anteriores las actas se perdieron, o los usuarios reintentaron sin saber el estado y **duplicaron registros**.

La app debe:
- detectar los cambios de conectividad;
- guardar localmente cuando no hay red;
- sincronizar **automáticamente** actas, fotos y reportes pendientes al volver la señal;
- mostrar siempre el **estado exacto**.

## 2. Decisión

Se combina **@react-native-community/netinfo** con una **cola transaccional en expo-sqlite** e **identificadores UUID idempotentes** por acta u operación. Al detectar conexión se sincroniza automáticamente y el estado se refleja en tiempo real.

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **NetInfo + cola en SQLite + identificadores únicos por acta** ✅ | Kevin Amagua | Detecta la pérdida y la recuperación de la red y dispara el envío ordenado. Con un identificador por operación, el servidor acepta cada acta una sola vez aunque se reintente | Hay que programar la máquina de estados (guardado, en proceso, fallado) y los reintentos. Una dependencia más |
| Sincronización solo manual con botón de reintento | Jairo Maigua | Evita detectar cambios de red en segundo plano; lógica más simple | No cumple RF-16: depende de que el veedor vuelva a presionar el botón horas después de salir del recinto |

## 4. Justificación

- RF-16 exige envío **automático**; la opción manual no lo cumple.
- El identificador por operación hace que el reintento sea **seguro**: el servidor reconoce la operación ya aplicada y no duplica.

## 5. Consecuencias

**Positivas**
- Ningún acta se pierde por falta de señal y se eliminan los duplicados al reintentar.

**Negativas / obligaciones**
- Hay que **controlar la concurrencia** para que dos avisos de red simultáneos no procesen el mismo elemento de la cola a la vez.

## 6. Relación con el examen

- **Rúbrica:** «Registro de resultados… con garantías de confiabilidad» (3 pts) y «Retroalimentación visual… en proceso, exitosas, fallidas» (2 pts).
- **Enunciado:** «Cada persona tiene que saber en todo momento si lo que hizo está en proceso, se guardó o falló».

## 7. Evidencia de implementación

| Qué | Dónde |
|---|---|
| Detección de red | `src/data/datasources/local/dispositivo.ts` (NetInfo) y `src/data/repositories/DispositivoRepositories.ts` |
| Control de concurrencia (un solo procesamiento de la outbox a la vez) | `ActaRepositoryImpl.ts`: la promesa `enCurso` se reutiliza si ya hay una sincronización en marcha |
| Idempotencia en el servidor | `public.sincronizar_acta(p_operacion_id, …)`: si la operación ya se aplicó, responde lo mismo sin duplicar |
| UUID | `expo-crypto` (dependencia auxiliar, `ADR_LINEA_BASE.md` §4.9) |
| Estados visibles («Guardada, por enviar», «Enviando», «Enviada», «Falló el envío», «En revisión del coordinador») | `src/presentation/screens/actas/etiquetas.ts`, `src/presentation/store/syncStore.ts` |

**Alcance:** la cola sincroniza **actas y fotos**. Los reportes de fallos sin conexión no pasan por esta cola: los guarda y reenvía el propio SDK de Sentry (ADR-05). Sin otras diferencias con lo acordado.
