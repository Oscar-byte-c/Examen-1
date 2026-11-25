# ADR-03: Usar SQLite como almacenamiento local de las actas pendientes

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha ADR-03).

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-14:** estado visible de cada acta.
- **RF-16:** registro y edición sin conexión, con envío automático.
- **RNF-03 y RNF-04:** persistencia tras cerrar la app o reiniciar el teléfono, sin duplicados.
- **S-04:** versión y conflictos.

## Contexto
En recintos rurales el veedor termina el conteo sin señal. En el proceso anterior los resultados se anotaron en papel y se dictaron por teléfono horas después, y varias actas se perdieron o llegaron con errores.

El acta, con sus votos, sus totales y la ruta de su foto, tiene que guardarse en el teléfono sin red y seguir allí aunque se cierre la app o se reinicie el teléfono. Además, el veedor debe poder corregirla mientras no se haya enviado. Al volver la señal tiene que enviarse sola y, si el envío se corta a la mitad, no puede aparecer duplicada. Guardar solo «en memoria» o en un archivo de texto no cumple ninguna de esas condiciones.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **SQLite (expo-sqlite) con tabla de salida (outbox) e identificador de cliente por acta** (propuesta por Jairo Maigua) | Guarda datos relacionales y permite consultar las actas por estado. Persiste al cerrar la app o reiniciar. Las transacciones evitan que un acta quede a medias. | Hay que diseñar el esquema y sus migraciones. No cifra los datos. |
| AsyncStorage o MMKV con JSON (propuesta por Milka Borja) | Implementación rápida, con poco código y sin dependencias nativas. | Sin transacciones: un fallo a mitad de escritura puede dejar la cola inconsistente. Para buscar un acta hay que leer todo el JSON, y escala mal. |
| WatermelonDB (propuesta por Oscar Vázquez) | Pensada para trabajar sin conexión y con un protocolo de sincronización. | Configuración nativa compleja y una curva de aprendizaje demasiado alta para el plazo. |
| «React Database», nombre usado en el documento grupal (propuesta por Kevin Amagua) | Modelo orientado a objetos: cada acta se trabajaría como un objeto. | Requiere dependencias extra y su madurez con Expo no estaba verificada; nadie del equipo la había usado. |

## Decisión
Se usa **SQLite** como fuente de verdad local de las actas, con una tabla de salida que registra cada cambio pendiente de envío. La foto se guarda como archivo en el teléfono y su ruta queda en la base. El dato local no se borra hasta que el servidor confirma que lo recibió. SQLite se eligió por sus transacciones: el acta y su operación pendiente se guardan juntas o no se guardan, algo que AsyncStorage no garantiza.

## Consecuencias
- **Qué significa «fuente de verdad» (precisión del 25/11):** SQLite lo es **solo para lo que aún está pendiente en el teléfono**. Una vez enviada, la versión autoritativa es la de PostgreSQL (ADR-11).
- **Esquema real** (`src/data/datasources/local/baseDatos.ts`):
  - `actas_locales`: el acta, la ruta de su foto, la ubicación, el estado y la versión base.
  - `outbox`: una operación por acta, con su `operacion_id` (UUID) y el contador de `intentos`.
  - `cache`: mesas asignadas y candidatos, para abrir la app sin red.
- **Acceso a los datos:** `ActaLocalDataSource.ts` guarda, cambia el estado y confirma; `ActaRepositoryImpl.ts` decide cuándo leer de la cola y enviar.
- **Estados visibles (RF-14):** «Guardada, por enviar», «Enviando», «Enviada», «Falló el envío» y «En revisión del coordinador», definidos en `etiquetas.ts`.
- **Conflictos (S-04), en el servidor:**
  - si la versión base no coincide, `public.sincronizar_acta` no sobrescribe: guarda las dos versiones en `actas_conflictos`;
  - el coordinador de recinto decide en `app/coordinador-recinto/conflictos.tsx`, mediante `public.resolver_conflicto`;
  - cada versión aplicada queda en `actas_historial`.
- **El envío y los reintentos** son una decisión aparte (ADR-10).
- **Riesgo aceptado por el grupo:** SQLite y las fotos **no están cifrados**; con un teléfono perdido y desbloqueado se podrían leer. En SQLite no se guardan claves ni tokens: la sesión y el perfil van cifrados en Secure Store.
- **Limitaciones comprobadas en el código:**
  - las fotos locales no se borran después del envío y se acumulan en el teléfono;
  - no existe el mensaje de «poco almacenamiento» que menciona el `.docx`.

## Verificación
- **Automática, de forma indirecta:**
  - `reglas.test.ts`: la validación previa al guardado rechaza un acta incoherente.
  - `sesionLocal.test.ts` (7 pruebas): la identidad del autor sin red.
- **Automática:** no hay una prueba propia de la outbox.
- **Pendiente:** activar el modo avión, sellar un acta, cerrar y reabrir la app (el acta debe seguir «Guardada, por enviar»), reconectar y comprobar que pasa a «Enviada» una sola vez.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, después del consenso del 22/11.
- **ChatGPT** estuvo de acuerdo, pero corrigió el término: SQLite no es la fuente de verdad global, sino la «fuente local de trabajo pendiente». Pidió documentar los estados, los reintentos, la confirmación del servidor y si hay cifrado.
- **Gemini** la aprobó con la misma corrección conceptual. Calificó como riesgo alto que las fotos estén sin cifrar (SQLCipher no está declarado) y advirtió sobre archivos de fotos huérfanos que llenan el almacenamiento.
- **Claude**, que participó en la redacción (no es un revisor independiente), comprobó en el código que no hay secretos en SQLite y que los datos no salen de la cola sin confirmación. También confirmó la sospecha de Gemini: las fotos no se borran.

Las tres coincidieron con la decisión.
- **Se aceptaron:** la corrección del término y las limitaciones comprobadas, ambas en «Consecuencias».
- **Se descartó por ahora:** cifrar con SQLCipher, porque cambiaría una decisión aceptada por el grupo (que asumió el riesgo) y no funciona en Expo Go. La limpieza de fotos queda como mejora.
