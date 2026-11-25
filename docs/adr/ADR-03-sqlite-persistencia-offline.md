# ADR-03: SQLite para la persistencia local y la sincronización sin conexión

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha ADR-03 |
| Requerimientos relacionados | RF-14, RF-16, RNF-03, RNF-04, S-04 |
| Minuto del video | No registrado en el documento grupal |

## 1. Contexto y problema

En zonas rurales los veedores se quedan sin conexión justo durante el conteo. En el proceso anterior, los resultados se anotaron en papel y se dictaron por teléfono, y muchas actas se perdieron o llegaron con errores.

Por eso:
- toda acta debe guardarse en el dispositivo **sin señal**, sin perderse al cerrar la app o reiniciar el teléfono;
- el veedor debe poder **corregir** el acta mientras no se haya enviado;
- al volver la señal, el envío debe ser **automático**;
- si la conexión se corta a mitad de un envío o la app reintenta, **no puede crearse un registro duplicado**.

## 2. Decisión

Se usa **SQLite (expo-sqlite)** como fuente de verdad de las actas en el teléfono, con una tabla de salida (**outbox**) e **identificador del cliente** por acta:

- Cada cambio pendiente de envío queda registrado.
- La **fotografía** se guarda como archivo en el dispositivo y su **ruta** queda en la base local.
- El dato local **no se borra hasta que el servidor confirme** la recepción.
- La sincronización se dispara al recuperar la red y reintenta sin generar copias.
- Cada acta lleva un **número de versión**. Si dos dispositivos la modifican antes de sincronizar, el servidor **conserva ambas versiones** y notifica al **coordinador de recinto**, que decide cuál prevalece (S-04).

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **SQLite (expo-sqlite) con outbox e identificador de cliente** ✅ | Jairo Maigua | Datos relacionales y consultas por estado. Persiste al cerrar la app o reiniciar. Transacciones: un acta no queda a medias | Hay que diseñar el esquema y sus migraciones. No cifra sus datos |
| Cola en AsyncStorage o MMKV (JSON) | Milka Borja | Implementación rápida y con poco código; sin dependencias nativas; estructura clave-valor simple | Sin transacciones: un fallo puede dejar la cola inconsistente. Hay que recorrer todo el JSON. Escala mal con muchos datos |
| WatermelonDB | Oscar Vázquez | Pensada para trabajo sin conexión y con protocolo de sincronización | Configuración nativa compleja y curva de aprendizaje demasiado alta para el plazo |
| «React Database» (nombre usado en el documento grupal) | Kevin Amagua | Modelo orientado a objetos: cada acta es un objeto, lo que simplificaría la pantalla de corrección | Dependencias adicionales; su madurez con Expo debía verificarse. Sin experiencia previa del equipo, era una apuesta sin respaldo |

## 4. Justificación

- Las **transacciones** garantizan que un acta (con sus votos) no quede a medias, algo que AsyncStorage o MMKV no ofrecen.
- Permite consultar el **estado** de cada acta (en proceso, enviada, fallida), que es lo que exige RF-14.
- Es una tecnología conocida y sin la complejidad nativa de WatermelonDB, adecuada al plazo del examen.

## 5. Consecuencias

**Positivas**
- Las actas no se pierden.
- Control claro del estado de cada documento.

**Negativas**
- Hay que diseñar un esquema robusto, porque el almacenamiento local de datos y fotos **no está cifrado**.
- Si el teléfono tiene poco espacio, guardar la foto puede fallar; el documento indica que la app debe mostrar un mensaje en ese caso.

## 6. Relación con el examen

- **Rúbrica:** «Registro de resultados por parte del veedor, con las garantías de confiabilidad y evidencia» (3 pts).
- **Enunciado, sección «Conectividad el día de la elección»:** actas perdidas por falta de señal y registros duplicados al reintentar.

## 7. Evidencia de implementación

| Qué | Dónde |
|---|---|
| Base local (`actas_locales`, `outbox`, `cache`) | `src/data/datasources/local/baseDatos.ts`, `ActaLocalDataSource.ts` |
| Procesamiento de la outbox y subida de la foto | `src/data/repositories/ActaRepositoryImpl.ts` |
| Identificador por operación (UUID) e idempotencia en el servidor | RPC `public.sincronizar_acta` |
| Versión, historial y conflictos | Tablas `actas_historial` y `actas_conflictos`; RPC `public.resolver_conflicto`; pantalla `app/coordinador-recinto/conflictos.tsx` |

**Diferencias respecto de lo acordado**
- **Mensaje por poco almacenamiento:** no se encontró en el código un mensaje específico para ese caso. Un fallo al copiar la foto se muestra como error genérico.
- **Historial:** se guarda en el servidor con autor y versión y, desde el 24/11, se consulta en la pantalla «Historial» (ver ADR-11).
- La falta de cifrado de SQLite es una limitación **aceptada** en este mismo ADR. La sesión sí se guarda cifrada en Secure Store.
