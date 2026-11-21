---
paths:
  - "src/domain/**"
---

# Capa domain

- Solo TypeScript puro. Prohibido importar `react`, `react-native`, `expo-*`, `@supabase/*`, `zustand`, `@tanstack/*`, `@/data`, `@/presentation` o cualquier cosa de `app/`. Tampoco lee `process.env`: si una regla necesita un valor configurable, lo recibe como parámetro desde `data`.
- **Entidades** (`entities/`): tipos o clases con invariantes. Enumeraciones como objetos `as const` + tipo derivado (ver `Role.ts`). Los errores de dominio con nombre (`ActaInvalidaError`) también viven aquí, sin mensajes técnicos de librerías.
- **Repositorios** (`repositories/`): solo **interfaces** (`XRepository`). Describen qué necesita el negocio, no cómo lo hace Supabase o SQLite.
- **Casos de uso** (`use-cases/`): una clase por acción (`RegistrarActa`) con dependencias inyectadas por constructor (interfaces) y un método `execute()`. Aquí viven las reglas de negocio, como la validación de un acta o la alerta de 500 m.
- **Constantes de negocio:** `constants.ts` (p. ej. `GEO_ALERT_THRESHOLD_METERS`).
- No crees subcarpetas nuevas (`utils/`, `helpers/`…) si una función cabe en la entidad o el caso de uso que la usa.
- Las reglas de dominio deben poder probarse con tests unitarios sin ningún mock de framework.
