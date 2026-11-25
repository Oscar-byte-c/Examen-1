# ADR-10: Usar NetInfo, una cola en SQLite y un UUID idempotente para sincronizar automáticamente

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha 4.10, numerada «ADR-0010»).

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-14:** el estado exacto de cada envío.
- **RF-16:** envío automático al recuperar la señal.
- **RNF-03 y RNF-04:** sin pérdidas ni duplicados.
- **S-04:** conflictos.

## Contexto
Muchos veedores de recintos rurales no tienen señal al terminar el conteo. En procesos anteriores las actas se perdieron o, como los usuarios no sabían si el envío había funcionado, lo repetían y duplicaban registros.

El ADR-03 decide **dónde** se guarda el acta sin señal. Este ADR decide **cuándo y cómo** se envía:
- detectar que volvió la red;
- enviar lo pendiente sin que el veedor tenga que acordarse;
- que un envío cortado a la mitad pueda repetirse sin crear una segunda acta;
- que dos avisos de red casi simultáneos no envíen lo mismo dos veces.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **@react-native-community/netinfo con cola en SQLite e identificadores únicos por acta** (propuesta por Kevin Amagua) | Detecta cuándo se pierde y cuándo vuelve la red, y dispara el envío ordenado de las actas pendientes. Con un identificador único por operación, el servidor acepta cada acta una sola vez aunque se reintente. | Hay que programar la máquina de estados (guardado, en proceso, fallado) y los reintentos; agrega una dependencia más. |
| Sincronización solo manual con un botón de reintento (propuesta por Jairo Maigua) | Evita detectar cambios de red en segundo plano; lógica más simple. | No cumple RF-16: depende de que el veedor vuelva a presionar el botón horas después de salir del recinto. |

## Decisión
Se usa **NetInfo** combinado con una **cola transaccional en expo-sqlite** y un **UUID idempotente** por acta u operación. El envío se dispara automáticamente al detectar conexión y el estado se refleja en tiempo real. Hay que controlar la concurrencia para que dos avisos de red no procesen el mismo elemento de la cola a la vez. La opción manual se descartó porque no cumple el envío automático.

## Consecuencias
- **Tener red no garantiza que el servidor responda** (precisión del 25/11): el acta solo queda «Enviada» cuando la RPC confirma.
- **Detección de red:** `dispositivo.ts` considera conectado `isConnected && isInternetReachable !== false`, y lo expone al dominio mediante `DispositivoRepositories.ts` (caso de uso `ObservarConectividad`).
- **Cuándo se intenta enviar** (`syncStore.ts`): al recuperar la red, al volver la app al primer plano, al iniciar sesión, **cada 60 s** mientras haya actas sin enviar y con el botón «Enviar ahora».
- **Proceso de envío** (`ActaRepositoryImpl.ts`):
  - la promesa `enCurso` impide dos procesamientos a la vez;
  - la foto se sube a la ruta `{mesa}/{acta}/{operacion}.jpg`, y si ya existía se considera correcta;
  - con un error de red el acta vuelve a «pendiente» con el **mismo** UUID;
  - con otro error queda «fallida» y se reporta a Sentry (ADR-05).
- **Idempotencia en el servidor** (`public.sincronizar_acta`): `operacion_id` es **único** en `actas_historial` y en `actas_conflictos`, así que un reintento recibe la misma respuesta sin crear otra versión. Antes de comparar versiones, la fila del acta se bloquea con `select … for update`.
- **Otros detalles:** los estados visibles están en `etiquetas.ts` y el UUID lo genera `expo-crypto` (dependencia auxiliar, ADR_LINEA_BASE §4.9).
- **Alcance:** la cola sincroniza actas y fotos. Los reportes de fallos sin conexión no pasan por ella, porque los guarda el SDK de Sentry (ADR-05).
- **Limitaciones comprobadas en el código:**
  - no hay espera progresiva (*backoff*) entre reintentos; la cola solo cuenta los `intentos`;
  - un acta «fallida» por un error permanente (por ejemplo, sin permiso tras una reasignación) se reintenta **cada 60 s** indefinidamente mientras haya conexión, y cada fallo genera un reporte en Sentry; no existe un estado de «fallo definitivo»;
  - si dos primeros envíos de la misma mesa coinciden, uno falla por `unique (mesa_id, dignidad)` y al reintentar queda como conflicto.

## Verificación
- **Automática, de forma indirecta:** `sesionLocal.test.ts`, que permite guardar sin red.
- **Automática:** no hay prueba de la idempotencia.
- **Pendiente:**
  - en modo avión, sellar un acta, reconectar y comprobar que pasa a «Enviada» una sola vez;
  - reenviar la misma operación y comprobar que existe una sola versión en el servidor.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, después del consenso del 22/11.
- **ChatGPT** estuvo de acuerdo, pero advirtió que conectividad no es lo mismo que backend disponible. Recomendó un diagrama de estados de la cola, *backoff*, separar errores recuperables de permanentes y que el UUID no cambie entre reintentos.
- **Gemini** la aprobó con mejoras de resiliencia. Mencionó los portales cautivos y la operación compuesta de Storage + base de datos. Advirtió de los bucles de reintento ante errores 4xx permanentes y propuso los estados `PENDING`, `IN_FLIGHT`, `SYNCED` y `FAILED_PERMANENT` con *backoff* exponencial.
- **Claude**, que participó en la redacción (no es un revisor independiente), verificó en el código que ya se cumple:
  - el UUID estable en los reintentos;
  - `operacion_id` único en el servidor;
  - el bloqueo `for update`;
  - `isInternetReachable`;
  - la subida idempotente de la foto.

  También **confirmó** la advertencia de Gemini: un acta fallida se reintenta cada 60 s y no existe un estado de fallo definitivo.

Las tres mantienen el patrón del equipo.
- **Recomendaciones válidas, no implementadas:** el *backoff* y el estado de fallo definitivo. Quedan como mejora y no cambian la decisión.
- **Alternativa mencionada por ChatGPT, no evaluada por el equipo:** enviar directamente al detectar red, sin cola. ChatGPT la considera insuficiente.
