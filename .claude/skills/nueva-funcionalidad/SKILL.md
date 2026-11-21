---
name: nueva-funcionalidad
description: Guía paso a paso para implementar una funcionalidad que atraviesa las capas de Clean Architecture del proyecto Control Electoral (entidad, interfaz de repositorio, caso de uso, implementación en data, mapper, DI, hook, pantalla y ruta). Úsala cuando se vaya a crear un módulo o flujo nuevo (p. ej. login, asignación de mesas, registro de actas, dashboard) o se agregue un repositorio o caso de uso.
---

# Nueva funcionalidad (Clean Architecture)

Antes de escribir código:
1. Identifica los requerimientos (RF/RNF) y el ADR que aplican (`docs/ADR_LINEA_BASE.md`).
2. Revisa qué existe ya (entidades, repositorios, componentes) para no duplicar.
3. Explica al usuario el plan por capas en pocas líneas: qué archivo se crea, dónde y por qué.

## Orden de implementación (de adentro hacia afuera)

| # | Capa | Archivo | Contenido |
|---|---|---|---|
| 1 | domain | `src/domain/entities/Acta.ts` | Tipo o entidad y sus invariantes |
| 2 | domain | `src/domain/entities/ActaErrors.ts` | Errores de dominio con nombre |
| 3 | domain | `src/domain/repositories/ActaRepository.ts` | `export interface ActaRepository { ... }` |
| 4 | domain | `src/domain/use-cases/RegistrarActa.ts` | `class RegistrarActa { constructor(private repo: ActaRepository) {} execute(...) }` con las reglas de negocio |
| 5 | data | `src/data/mappers/actaMapper.ts` | DTO (snake_case) ↔ entidad |
| 6 | data | `src/data/datasources/remote|local/...` | Acceso a Supabase / SQLite |
| 7 | data | `src/data/repositories/ActaRepositoryImpl.ts` | `implements ActaRepository` |
| 8 | data | `src/data/di/container.ts` | Instancia la implementación e inyéctala en el caso de uso |
| 9 | presentation | `src/presentation/hooks/useRegistrarActa.ts` | TanStack Query (`useMutation`/`useQuery`) que llama al caso de uso desde `@/data/di/container` |
| 10 | presentation | `src/presentation/screens/<rol>/...Screen.tsx` | UI con componentes del sistema de diseño y estados visibles |
| 11 | ruta (no es capa) | `app/<rol>/<ruta>.tsx` (raíz) | `export { default } from '@/presentation/screens/...'` |

Si la funcionalidad toca Supabase, crea también la migración con **RLS y políticas en el mismo archivo** (`supabase/migrations/`).
No todas las funcionalidades necesitan las 11 piezas: omite las que no apliquen y explica por qué.

## Al terminar
- Si se agregaron reglas de dominio, agrega tests unitarios del caso de uso (cuando el entorno de tests esté configurado).
- Ejecuta la skill `verificar`.
- Si hubo cambios de capas o de seguridad, sugiere revisar con los agentes `architecture-reviewer` y/o `security-reviewer`.
- **Enseña:** resume para el estudiante el recorrido de una acción (pantalla → hook → caso de uso → repositorio → datasource → Supabase) y cómo explicarlo en la defensa.
- Actualiza la documentación de `docs/` si cambió la estructura o hubo una desviación de ADR.
