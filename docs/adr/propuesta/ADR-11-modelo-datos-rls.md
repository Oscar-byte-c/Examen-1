# ADR-11: Modelo de datos, roles y aislamiento por recinto (PostgreSQL en Supabase + RLS)

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-06, RF-07, RF-08, RF-18, RF-19, RF-20, S-02, S-03, S-05 | `Documento_Consolidado_ADR.docx`, ficha 4.11 |

## 1. Problema y contexto
La estructura es muy relacionada: un recinto tiene mesas, cada mesa genera 2 actas y cada acta tiene votos por organización; cada usuario tiene un rol y un ámbito. En un proceso anterior, datos de algunas mesas llegaron a quien no debía verlos.

## 2. Objetivo
Integridad (sin duplicados ni estados inválidos) y confidencialidad decidida por el servidor, no por la pantalla.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **PostgreSQL en Supabase con tablas relacionales, RLS y unicidad** ✅ | Jairo Maigua y Milka Borja | Las tablas reflejan el proceso; `unique (mesa, dignidad)` evita duplicados; la RLS filtra por rol y recinto; Realtime | Políticas delicadas; agregados lentos sin totales precalculados | — (elegida) |
| Firestore con documentos anidados | Kevin Amagua | Escala y tiempo real; reglas por documento | Sin relaciones: duplicar datos o hacer varias consultas; reglas complejas; sumas difíciles de garantizar | El dominio es relacional |
| Backend propio que valida en código, sin RLS | Oscar Vázquez | Reglas en el lenguaje que domina el equipo | Si la app consulta la base directo, la seguridad queda incompleta; un servidor más que mantener | Más infraestructura y riesgo |

## 4. Decisión y justificación
PostgreSQL en Supabase: un veedor solo consulta y modifica las actas de sus mesas, un coordinador de recinto las de su recinto, y el provincial **lee** su jurisdicción pero **no modifica actas**. Al reemplazar a un veedor se revoca su acceso de inmediato y se conserva el historial.
> **Notas de precisión (25/11/2026):**
> - La **unicidad** la impone la base: `unique (mesa_id, dignidad)`, un coordinador por recinto y una asignación activa por mesa. La **suma** y la dignidad de cada voto las valida la **RPC** (`privado.validar_acta`), no un `CHECK`. Así se precisa la frase grupal «la base impide sumas imposibles».
> - La app **no escribe directo**: todo pasa por RPC `SECURITY DEFINER` con `search_path = ''`, que revalidan el rol y el ámbito con `auth.uid()` (ADR-C02 §4). La RLS es la segunda barrera.
> - El rol y la mesa se consultan **en cada petición** desde `perfiles` y `asignaciones_mesa`, así que revocar es inmediato. Solo la bandera de clave temporal sale del token.

## 5. Implementación real
- **Migración `20261122120000_territorio_actas.sql`:**
  - tablas `recintos`, `mesas`, `asignaciones_mesa`, `organizaciones`, `candidatos`, `actas`, `votos_acta`, `actas_historial` y `actas_conflictos` (`perfiles` está en `20261121213533_crear_perfiles.sql`);
  - restricciones `unique (mesa_id, dignidad)`, `perfiles_un_coordinador_por_recinto` y `asignaciones_una_activa_por_mesa`;
  - `privado.puede_ver_mesa` / `puede_editar_mesa`, políticas RLS de lectura y Storage (`fotos_actas_lectura`);
  - RPC `sincronizar_acta`, `asignar_mesa`, `resolver_conflicto` y `crear_recinto`.
- Corrección de un acta = `UPDATE` de la misma fila con `version + 1` y una nueva fila en `actas_historial`. La unicidad no impide corregir.
- Historial visible en `HistorialActaScreen.tsx` (coordinadores) · datos iniciales en `supabase/seed.sql`.

## 6. Consecuencias
✔ Integridad y confidencialidad en el servidor; conteo en vivo.
✘ Las políticas RLS son la parte más delicada.

## 7. Riesgos y limitaciones
- No hay diagrama entidad-relación (el modelo está comentado en la migración) ni una matriz rol × acción × tabla.
- La RLS no protege lo que ya está en el teléfono (ADR-03).
- La suma solo la impone la RPC: si alguien escribiera con la `service_role`, la base no lo impediría.
- Sin totales precalculados: con 20 mesas no se nota, pero no se midió.

## 8. Pruebas y evidencias
- ✅ Servidor: `verificar-rls.mjs`, 27/27 el 22/11, con pruebas positivas y negativas por rol (registrado en `CONTEXTO_PROYECTO.md`, **sin log adjunto**).
- ✅ Automatizadas: `historial.test.ts` (5).
- ⏳ 5 comprobaciones nuevas (historial y votos por recinto) sin ejecutar: `npm run test:rls`.

## 9. Evaluación de las IA (revisión posterior del 25/11)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | De acuerdo («de las mejor justificadas») | Matriz rol–acción; documentar `SECURITY DEFINER`; resultados de RLS con fecha |
| Gemini | Aprobado (pilar central) | Auditar `SECURITY DEFINER`; recomienda `SET search_path = public, privado`; aclarar cómo convive la unicidad con las correcciones |
| Claude* | De acuerdo | Verificó: `search_path = ''`, validación de `auth.uid()` dentro de las RPC, revocación inmediata y corrección por `UPDATE` con historial |

- **Acuerdo (las tres):** mantener PostgreSQL + RLS + escritura solo por RPC; faltan la matriz rol–acción y evidencia reproducible.
- **Se rechaza:** la sugerencia de Gemini `search_path = public, privado`. El `search_path = ''` actual es **más estricto** y es lo que recomienda Supabase: obliga a escribir cada objeto con su esquema.
- **Se aclara:** la duda de Gemini sobre las correcciones. La unicidad no las bloquea, porque una corrección actualiza la misma fila.
- **Revisión adicional:** OpenCode con DeepSeek (25/11, solo este ADR, con un `.docx` de otro enunciado). Señaló que el ADR atribuía a la RLS lo que hace la RPC (se corrige en la sección 4) y la falta de un diagrama ER.
- **Alternativas señaladas por las IA (no evaluadas por el grupo):** backend con una sola API y autorización central; escrituras directas + RLS (rechazada en ADR-C02 §4); Appwrite como base de datos.

\* Claude no es independiente: redactó los ADR y conoció las otras evaluaciones.

## 10. Conclusión y preguntas de defensa
**Conclusión:** es la decisión central y la mejor respaldada; lo que falta es evidencia reproducible (log de `test:rls`) y un diagrama ER.
- **Si la RLS ya filtra filas, ¿por qué no insertar directo?** Un acta son varias filas (el acta, sus votos y el historial). La RPC las escribe en una sola transacción y revalida el permiso y la suma; la RLS queda como segunda barrera.
- **Si reemplazo a un veedor, ¿cuándo pierde el acceso?** Al instante: los permisos leen la tabla de asignaciones en cada consulta.
- **¿Cómo evitan dos actas de la misma mesa?** Con `unique (mesa_id, dignidad)` en la base; corregir es actualizar la misma fila con una versión nueva.
- **¿Cómo lo comprobaron?** Con `verificar-rls.mjs`, que entra con los 3 roles y prueba accesos permitidos y negados.
