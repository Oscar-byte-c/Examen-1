# Línea base de ADR (resumen operativo)

> **Fuente oficial:** el *Documento Consolidado de ADR* del equipo (fase grupal). Este archivo es un resumen para consultar durante el desarrollo; si hay diferencias, prevalece el documento consolidado.
> **Importante (rúbrica):** no respetar completamente la línea base reduce la nota a la mitad. Cualquier desviación debe registrarse en la sección 3 y acordarse con el equipo **antes** de implementarse.

## 1. Stack acordado

| Área | Decisión |
|---|---|
| Plataforma | React Native 0.86 + Expo **SDK 57** (requisito obligatorio, ver 3.7), Development Build + EAS Build, entrega en APK Android |
| Arquitectura | Clean Architecture con **tres capas**: `domain`, `data`, `presentation`. Rutas de Expo Router en `app/` (raíz). La DI vive en `data/di`; variables de entorno en `.env` (raíz) (ver 3.5 y 3.6) |
| Backend | Supabase: PostgreSQL, Auth, Storage, Realtime, Edge Functions |
| Autorización | Supabase RLS (por rol y ámbito: provincia → recinto → mesa) |
| Persistencia local | Expo SQLite (datos) + Expo File System (fotos) |
| Almacenamiento seguro | Expo Secure Store (sesión/tokens) |
| Conectividad | NetInfo |
| Sincronización | Outbox + UUID generado en el cliente + upsert idempotente + reintentos |
| Estado | Zustand (estado local) + TanStack Query (datos de servidor y caché) |
| Navegación | React Navigation, implementado mediante **Expo Router**, que la incluye (ver [ADR-C01](adr/ADR-C01-navegacion-expo-router.md)) |
| Evidencia | Expo Camera + Expo Image Manipulator + Expo Location |
| Mapas | OpenStreetMap |
| Monitoreo | Sentry |
| Animaciones | Lottie + Reanimated (retroalimentación sin modales genéricos) |

## 2. Acuerdos específicos

1. **Conflictos de sincronización:** se conservan todas las versiones involucradas y el conflicto queda registrado para revisión. **Nunca se sobrescribe en silencio.**
2. **Geolocalización:** alerta si el acta se registra a más de **500 m** del recinto asignado (`GEO_ALERT_THRESHOLD_METERS`). **No bloquea** el registro.
3. **Mapas:** OpenStreetMap.
4. **Offline:** el sistema debe funcionar sin conexión.
5. **Cuentas administradas:** sin registro público. El provincial crea a los coordinadores de recinto y estos crean a sus veedores.
6. **Roles:** Coordinador Provincial, Coordinador de Recinto y Veedor.

## 3. Registro de desviaciones y aclaraciones

Los ADR complementarios (decisiones posteriores a la línea base, acordadas por el equipo) se guardan en `docs/adr/` con el prefijo `ADR-C`.

| # | Tema | Situación | Estado |
|---|---|---|---|
| 3.1 | Navegación | Se usa **Expo Router**, que (en SDK 57 y 58) incluye internamente React Navigation (native-stack, bottom-tabs). No se instala un segundo sistema. | ✅ Aceptado por el equipo: [ADR-C01](adr/ADR-C01-navegacion-expo-router.md) |
| 3.2 | Iconografía | `expo-symbols` (ya incluido en el SDK), que muestra Material Symbols en Android. No contradice ningún ADR. | Informativo |
| 3.3 | Sesión provisional | `SessionPreviewContext` permite entrar por rol sin autenticación **solo en `__DEV__`**. Se elimina en la fase de autenticación. | Deuda temporal |
| 3.4 | Librería de mapas OSM | Pendiente elegir una librería compatible con Expo SDK 57. | Por decidir |
| 3.5 | Organización de capas | Decisión del equipo: solo **tres capas** (`domain`, `data`, `presentation`). `app/` de Expo Router en la raíz. `di` → `src/data/di/container.ts`; constantes de negocio → `src/domain/constants.ts`; se eliminó `utils/`. No cambia ninguna tecnología. | ✅ Decisión del equipo |
| 3.6 | Variables de entorno | Decisión del equipo: un único `.env` en la raíz (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SENTRY_DSN`). Se eliminó `src/config/`; la lectura vive en `src/data/datasources/remote/supabaseConfig.ts`. Se usa la **publishable key** de Supabase (sucesora de la anon key), igualmente pública. | ✅ Decisión del equipo |
| 3.7 | Versión de Expo | **SDK 57 es requisito obligatorio del proyecto.** Migración 58 → 57: React Native 0.88.1 → 0.86.3, React 19.3 → 19.2.3, Reanimated 4.7 → 4.5, Gesture Handler 3.3 → 2.32. No cambia ninguna tecnología acordada. Costo conocido: 3 vulnerabilidades *high* (DoS en `decode-uri-component` vía `expo-router 57 → query-string`), corregidas solo en SDK 58; impacto bajo en la app (análisis de URLs/deep links). | ✅ Requisito del proyecto |
