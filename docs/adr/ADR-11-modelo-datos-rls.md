# ADR-11: Modelo de datos, roles y aislamiento por recinto (PostgreSQL en Supabase + RLS)

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha 4.11 |
| Requerimientos relacionados | RF-06, RF-07, RF-08, RF-18, RF-19, RF-20, S-02, S-03, S-05 |
| Minuto del video | No registrado en el documento grupal |

## 1. Contexto y problema

El proceso electoral tiene una estructura muy relacionada: un recinto tiene varias mesas; cada mesa tiene un veedor y genera dos actas (alcaldía y prefectura); cada acta reporta votos por organización. Cada usuario tiene un rol y una jurisdicción. Si esto se guarda de forma desordenada, una mesa puede quedar asociada a dos veedores o un acta puede registrarse dos veces.

Además:
- en un proceso anterior, información de algunas mesas llegó a personas que no debían verla. La restricción **no puede depender de la pantalla**: el servidor debe impedir que un veedor lea o cambie mesas ajenas y que un coordinador acceda a otro recinto (RF-18);
- el modelo debe respetar las reglas matemáticas (RF-19);
- una mesa con una sola acta es **parcialmente reportada** (S-02);
- si se reemplaza a un veedor, el anterior **pierde el acceso** a esa mesa (S-05).

## 2. Decisión

Se elige **PostgreSQL en Supabase**:

- Tablas principales: recintos, mesas, usuarios, asignaciones de veedores, actas, organizaciones, candidatos y votos.
- Una **restricción única sobre mesa y dignidad** garantiza como máximo dos actas válidas por mesa.
- **Row Level Security**: un veedor solo consulta y modifica las actas de sus mesas; un coordinador de recinto, solo las de su recinto.
- El coordinador provincial tiene **lectura** sobre su jurisdicción, pero **no puede modificar actas**.
- Al reemplazar a un veedor, la asignación anterior se **revoca de inmediato** y el **historial** de las actas ya registradas se conserva para auditoría.

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Qué aporta | Limitaciones y por qué no se eligió |
|---|---|---|---|
| **PostgreSQL en Supabase con tablas relacionales, RLS y restricciones de unicidad** ✅ | Jairo Maigua y Milka Borja | Las tablas reflejan el proceso real; la unicidad mesa + dignidad impide duplicados; RLS filtra cada consulta por rol y recinto; Realtime permite el conteo en vivo | Hay que diseñar bien las políticas: una política mal escrita deja datos abiertos o bloquea consultas legítimas. Las consultas agregadas pueden ser lentas sin totales precalculados |
| Firestore con documentos anidados | Kevin Amagua | Escala bien en lecturas en tiempo real; reglas de acceso por documento | Sin relaciones nativas: hay que duplicar datos o hacer varias consultas; verificar que un veedor pertenece a un recinto exige reglas complejas; la validación de sumas es difícil de garantizar |
| Backend propio que valida en código, sin RLS | Oscar Vázquez | Cualquier regla de negocio en el lenguaje que el equipo domina | Si la app consulta la base directamente en algún punto, la seguridad queda incompleta; hay que mantener y desplegar un servidor adicional |

## 4. Justificación

- El modelo relacional refleja la estructura real (recinto → mesa → acta → votos) e impide duplicados **en la base**.
- RLS hace que **el servidor decida qué ve cada usuario**, que es la respuesta directa a la filtración de información del proceso anterior.

## 5. Consecuencias

**Positivas**
- Integridad y consistencia: la base impide duplicados y sumas imposibles.
- El servidor decide qué ve cada usuario.
- Conteo en vivo como referencia rápida mientras el CNE termina su proceso.

**Negativas / obligaciones**
- Las políticas de seguridad son la parte más delicada y deben **probarse con usuarios de cada rol** antes de la defensa.
- Los totales precalculados requieren recalcular al corregir un acta.
- Obliga a **documentar el modelo entidad-relación** y las políticas, y a preparar datos de prueba que demuestren que un veedor no ve otra mesa.

## 6. Relación con el examen

- **Rúbrica:** «Gestión del recinto» (1,6), «Gestión del territorio y seguimiento» (1,6) y la confidencialidad que exige el enunciado.
- **Enunciado, sección «Confidencialidad de la información».**

## 7. Evidencia de implementación

| Qué | Dónde (`supabase/migrations/20261122120000_territorio_actas.sql`) |
|---|---|
| Tablas | `recintos`, `mesas`, `asignaciones_mesa`, `organizaciones`, `candidatos`, `actas`, `votos_acta`, `actas_historial`, `actas_conflictos` (+ `perfiles` en `20261121213533_crear_perfiles.sql`) |
| Máximo 2 actas por mesa | `unique (mesa_id, dignidad)` en `actas` |
| Un coordinador por recinto (RF-07) | índice `perfiles_un_coordinador_por_recinto` |
| Una asignación activa por mesa (RF-08, S-05) | índice `asignaciones_una_activa_por_mesa` + RPC `public.asignar_mesa` |
| Permisos | `privado.puede_ver_mesa` y `privado.puede_editar_mesa` (el provincial no edita) |
| Escritura única y transaccional | RPC `public.sincronizar_acta` (la app no tiene `INSERT`/`UPDATE` directos) |
| Pruebas por rol | `supabase/tests/verificar-rls.mjs` (27/27 «PASA» el 22/11/2026, según `CONTEXTO_PROYECTO.md`) |
| Datos precargados | `supabase/seed.sql` (Pichincha – Quito, 5 recintos × 4 mesas, 5 organizaciones ficticias) |

**Aclaraciones y diferencias**
- **Totales:** no se crearon tablas de totales precalculados. El avance y el conteo se calculan al consultar (`public.avance_por_recinto`, `public.conteo_por_candidato`). El documento lo menciona como consecuencia, no como decisión; con 20 mesas el cálculo directo es suficiente.
- **Modelo entidad-relación:** el modelo y las políticas están documentados en la propia migración (comentarios SQL); no hay un diagrama entidad-relación aparte.
- **Historial (corregido el 24/11):** `actas_historial` ya se escribía en la misma transacción que cada versión. Ahora existe la pantalla **«Historial»** (`src/presentation/screens/actas/HistorialActaScreen.tsx`), de solo lectura, con cada versión: autor (nombre y rol), fecha, cifras, votos, lugar de captura y **qué cambió** respecto de la anterior (`cambiosEntreVersiones`, `src/domain/entities/Historial.ts`, con pruebas). Se distingue la versión **vigente**. La abren el coordinador de recinto (mesa → «Historial») y el provincial (Recintos → «Mesas e historial» → «Historial», `MesasHistorialScreen.tsx`, solo lectura y sin resultados de votos). La política `historial_lectura` ya limitaba la lectura a coordinadores con acceso a la mesa; del autor solo se piden nombre, apellidos y rol. Se agregaron 3 comprobaciones de solo lectura a `verificar-rls.mjs` (veedor sin historial, recinto solo el suyo y, como control de integridad, suma de votos de las actas = total general). Pendiente: ejecutar `npm run test:rls` y la prueba manual.
- **Decisión de implementación (`ADR-C02` §4):** todas las escrituras pasan por RPC `SECURITY DEFINER` que revalidan rol, ámbito y datos.
