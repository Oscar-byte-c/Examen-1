---
paths:
  - "src/data/**"
  - "supabase/**"
---

# Capa data (incluye la DI) y backend Supabase

- Los repositorios implementan **exactamente** la interfaz de `domain/repositories` (`class SupabaseActaRepository implements ActaRepository`).
- Los datasources encapsulan una sola tecnología: `remote/` (Supabase) y `local/` (SQLite, File System, Secure Store). El repositorio decide cuál usar (por ejemplo, primero local y luego la outbox).
- Los **mappers** convierten DTO (snake_case de la BD) ↔ entidad (camelCase). Ninguna fila cruda de Supabase sale de `data`.
- Traduce los errores técnicos (de red, de Postgres o de RLS) a errores de dominio. No propagues mensajes internos a la UI.
- `data/di/container.ts` es el composition root y el único lugar donde se instancian implementaciones concretas. Expone casos de uso ya construidos, que es lo único que `presentation` puede importar de `data`.
- **Supabase:** cada tabla nueva lleva RLS habilitado y políticas por rol y ámbito en la **misma migración**. Las operaciones privilegiadas (crear usuarios) van en Edge Functions con `service_role`, nunca en la app.
- **Sincronización:** UUID generado en el cliente + upsert idempotente. Los conflictos conservan ambas versiones y se registran; no hay "last write wins" silencioso.
- **Local:** tokens en Secure Store, no en SQLite ni en AsyncStorage. Las fotos van en un directorio persistente de la app, no en caché.
