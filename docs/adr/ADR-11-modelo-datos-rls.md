# ADR-11: Usar PostgreSQL en Supabase con RLS para el modelo de datos y el aislamiento por recinto

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha 4.11).

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-06 y RF-07:** recintos con un único coordinador.
- **RF-08 y RF-20:** un veedor por mesa y reemplazo inmediato.
- **RF-18:** cada rol ve y modifica solo lo suyo.
- **RF-19:** números imposibles.
- **S-02:** mesa reportada con sus 2 actas.
- **S-03:** validación que bloquea.
- **S-05:** el veedor reemplazado pierde el acceso.

## Contexto
La estructura del proceso electoral está muy relacionada: un recinto tiene varias mesas; cada mesa tiene un veedor y genera dos actas, alcaldía y prefectura; cada acta reporta los votos de cada organización. Cada usuario tiene además un rol y una jurisdicción. Si esta información se guarda de forma desordenada, es fácil que una mesa quede con dos veedores o que una misma acta se registre dos veces.

En un proceso anterior, información de algunas mesas llegó a personas que no debían verla. Por eso la restricción no puede depender de lo que muestra la pantalla: el servidor debe impedir que un veedor lea o cambie mesas que no son suyas y que un coordinador acceda a otro recinto. El coordinador provincial, en cambio, necesita ver el avance y el conteo de toda su jurisdicción casi en tiempo real.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **PostgreSQL en Supabase con tablas relacionales, Row Level Security y restricciones de unicidad** (propuesta por Jairo Maigua y Milka Borja) | Las tablas reflejan el proceso real. Una restricción única sobre mesa y dignidad impide duplicar un acta. La RLS obliga al servidor a filtrar cada consulta por rol y recinto, y Realtime permite el conteo en vivo. | Las políticas deben diseñarse bien: una política mal escrita deja datos abiertos o bloquea consultas legítimas. Las consultas agregadas pueden ser lentas sin totales precalculados. |
| Firestore con documentos anidados (propuesta por Kevin Amagua) | Escala bien en lecturas en tiempo real y tiene reglas por documento. | No tiene relaciones nativas: unir mesas, recintos y actas obliga a duplicar datos o a hacer varias consultas. Verificar que un veedor pertenece a un recinto requiere reglas complejas, y la validación de sumas es difícil de garantizar. |
| Backend propio que valida las reglas en código, sin RLS (propuesta por Oscar Vázquez) | Cualquier regla se escribe en el lenguaje que domina el equipo. | Si la app consulta la base directamente en algún punto, la seguridad queda incompleta. Hay que mantener y desplegar un servidor adicional. |

## Decisión
Se usa **PostgreSQL en Supabase**:
- Las tablas principales son recintos, mesas, usuarios, asignaciones de veedores, actas, organizaciones, candidatos y votos.
- La restricción única sobre mesa y dignidad garantiza como máximo dos actas válidas por mesa.
- La RLS aísla los datos: un veedor solo consulta y modifica las actas de sus mesas; un coordinador de recinto, solo las de su recinto; el provincial lee su jurisdicción pero **no modifica actas**.
- Al reemplazar a un veedor, la asignación anterior se revoca de inmediato y el historial de las actas ya registradas se conserva.

Firestore se descartó porque el dominio es relacional, y el backend propio, por el costo de mantener otro servidor y el riesgo de dejar la base expuesta.

## Consecuencias
- **Esquema** (`supabase/migrations/20261122120000_territorio_actas.sql`):
  - tablas `recintos`, `mesas`, `asignaciones_mesa`, `organizaciones`, `candidatos`, `actas`, `votos_acta`, `actas_historial` y `actas_conflictos`; la tabla `perfiles` está en `20261121213533_crear_perfiles.sql`;
  - restricciones `unique (mesa_id, dignidad)`, `perfiles_un_coordinador_por_recinto` y `asignaciones_una_activa_por_mesa`.
- **La app no escribe directo** (ADR-C02 §4):
  - no tiene permisos `INSERT` ni `UPDATE` sobre las actas; todo pasa por RPC `SECURITY DEFINER` con `search_path = ''`: `public.sincronizar_acta`, `public.asignar_mesa`, `public.resolver_conflicto` y `public.crear_recinto`;
  - esas funciones revalidan el rol y el ámbito con `auth.uid()` mediante `privado.puede_editar_mesa`;
  - un acta son varias filas (el acta, sus votos y el historial) y la RPC las escribe en una sola transacción. La RLS queda como segunda barrera.
- **Qué impone la base y qué la RPC** (precisión del 25/11): la base impone la **unicidad** y los valores no negativos. La **suma** de votos y la dignidad de cada candidato las valida la RPC (`privado.validar_acta`), no un `CHECK`. Así se precisa la frase del documento grupal «la base impide duplicados y sumas imposibles».
- **Revocación inmediata:** `privado.puede_ver_mesa` y `puede_editar_mesa` leen `perfiles` y `asignaciones_mesa` en cada consulta. Al reasignar una mesa, el veedor anterior la pierde al instante; solo la bandera de clave temporal sale del token (ADR-01).
- **Correcciones:** una corrección es un `UPDATE` de la misma fila con `version + 1` y una nueva fila en `actas_historial`, así que la unicidad no impide corregir.
- **Historial (S-04):**
  - la política `historial_lectura` solo deja leerlo a los coordinadores con acceso a la mesa;
  - se muestra en `src/presentation/screens/actas/HistorialActaScreen.tsx`, con los cambios entre versiones calculados por `cambiosEntreVersiones` (`src/domain/entities/Historial.ts`);
  - el coordinador de recinto lo abre desde la mesa; el provincial, desde Recintos → «Mesas e historial» (`MesasHistorialScreen.tsx`).
- **Fotos y lectura:**
  - Storage tiene su propia política, `fotos_actas_lectura`;
  - las RPC de lectura `public.avance_por_recinto` y `public.conteo_por_candidato` son `security invoker`: la RLS filtra lo que cada rol ve.
- **Datos iniciales:** `supabase/seed.sql` (Pichincha – Quito, 5 recintos × 4 mesas y 5 organizaciones ficticias).
- **Riesgos y limitaciones:**
  - no hay diagrama entidad-relación (el modelo está comentado en la migración) ni una matriz de permisos rol × acción × tabla;
  - la RLS no protege los datos que ya están en el teléfono (ADR-03);
  - si alguien escribiera con la `service_role`, la suma no la impediría la base;
  - no hay totales precalculados; con 20 mesas no se nota, pero no se midió.

## Verificación
- **Servidor:** `supabase/tests/verificar-rls.mjs` entra con los 3 roles y prueba accesos permitidos y negados: el veedor solo ve sus 2 mesas, el recinto solo su recinto, el provincial no puede modificar actas y el servidor rechaza un acta imposible. Dio **27/27 el 22/11** según `CONTEXTO_PROYECTO.md`, **sin log adjunto**.
- **Automática:** `historial.test.ts` (5 pruebas) cubre los cambios entre versiones.
- **Pendiente:**
  - ejecutar `npm run test:rls` con las 5 comprobaciones nuevas (historial y votos por recinto) y guardar la salida con fecha;
  - elaborar el diagrama entidad-relación y la matriz de permisos.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, después del consenso del 22/11.
- **ChatGPT** estuvo de acuerdo y la consideró una de las decisiones mejor justificadas. Pidió una matriz rol–acción–recurso, documentar qué funciones usan `SECURITY DEFINER` y con qué `search_path`, adjuntar los resultados de RLS con fecha y explicar cómo convive la unicidad con las correcciones.
- **Gemini** la aprobó como el pilar central. Advirtió que las funciones `SECURITY DEFINER` omiten la RLS y deben validar `auth.uid()`. Recomendó `SET search_path = public, privado`, una matriz SELECT/INSERT/UPDATE/DELETE por rol y evidencia con JWT reales.
- **Claude**, que participó en la redacción (no es un revisor independiente), verificó:
  - el `search_path = ''`;
  - la validación de `auth.uid()` dentro de las RPC;
  - la revocación inmediata;
  - que una corrección es un `UPDATE` con historial.

Las tres mantienen la decisión del equipo.
- **Se aceptaron:** la matriz de permisos y la evidencia reproducible (pendientes) y la precisión sobre qué impone la base y qué la RPC.
- **Se descartó:** la sugerencia de Gemini `search_path = public, privado`, porque el `''` actual es más estricto (obliga a escribir cada objeto con su esquema) y es lo que recomienda Supabase.
- **Ninguna IA propuso otra tecnología.**
