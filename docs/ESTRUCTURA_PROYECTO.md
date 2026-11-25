# Estructura del proyecto y decisiones de configuración

**Fase:** 1 – Preparación del proyecto (sin autenticación, base de datos, actas, sincronización ni dashboards).
**Base:** Expo **SDK 57** (requisito obligatorio) · React Native 0.86.3 · React 19.2.3 · TypeScript (modo estricto).

---

## 1. Estructura de carpetas

**Decisión del equipo:** Clean Architecture con **exactamente tres capas**: `domain`, `data` y `presentation`. Las rutas de Expo Router están en `app/`, en la **raíz** del proyecto, y no forman una capa. `config`, la inyección de dependencias y las utilidades **no son capas**: cada una vive dentro de la capa a la que pertenece su responsabilidad o, si es configuración global, en una ubicación auxiliar.

```
exam1/
├── app/                      # RUTAS de Expo Router (raíz). No es capa: solo re-exports y layouts
│   ├── _layout.tsx           #   Navegador raíz + guards por rol (Stack.Protected)
│   ├── index.tsx             #   Redirección según el rol
│   ├── login.tsx
│   ├── veedor/               #   _layout.tsx + index.tsx
│   ├── coordinador-recinto/
│   └── coordinador-provincial/
├── src/
│   ├── domain/               # CAPA 1 — negocio, TypeScript puro
│   │   ├── entities/         #   Entidades, tipos y errores de dominio (Role, Acta…)
│   │   ├── repositories/     #   Interfaces (contratos) de repositorios
│   │   ├── use-cases/        #   Casos de uso (RegistrarActa, AsignarVeedor…)
│   │   └── constants.ts      #   Reglas de negocio acordadas (umbral de 300 m (S-06), dignidades)
│   ├── data/                 # CAPA 2 — implementaciones concretas
│   │   ├── datasources/
│   │   │   ├── local/        #   SQLite, File System, Secure Store
│   │   │   └── remote/       #   Supabase (supabaseConfig.ts lee las variables del .env)
│   │   ├── repositories/     #   Implementan las interfaces de domain/repositories
│   │   ├── mappers/          #   DTO (BD/API) ↔ entidad de dominio
│   │   └── di/container.ts   #   Composition root: instancia y entrega casos de uso
│   ├── presentation/         # CAPA 3 — interfaz de usuario
│   │   ├── screens/          #   Pantallas por rol (auth, veedor, coordinador-recinto, coordinador-provincial)
│   │   ├── components/       #   Componentes reutilizables del sistema de diseño
│   │   ├── hooks/            #   Hooks (TanStack Query → casos de uso)
│   │   ├── store/            #   Stores de Zustand
│   │   ├── navigation/       #   Sesión, rutas por rol y opciones de navegadores
│   │   └── theme/            #   Tokens de diseño (ver docs/SISTEMA_DISENO.md)
├── assets/  ·  docs/
├── supabase/                 # CLI de Supabase (proyecto vinculado). .temp/ ignorado por Git
├── .env                      # Variables EXPO_PUBLIC_* reales (NO se versiona)
├── .env.example              # Plantilla sin valores (sí se versiona)
├── app.json  ·  eas.json  ·  package.json  ·  tsconfig.json
```

### Regla de dependencias

```
presentation  ──►  domain  ◄──  data
      │                           │
      └──► data/di/container ─────┘   (único punto de entrada de presentation a data)
```

- `domain` **no importa** nada de `data`, `presentation`, Expo ni Supabase, y no lee variables de entorno.
- `data` implementa las interfaces de `domain`. Su `di/container.ts` instancia las implementaciones y expone casos de uso ya construidos.
- `presentation` obtiene los casos de uso de `@/data/di/container`. **Nunca** importa repositorios, datasources, Supabase ni SQLite.
- `app/` solo contiene rutas: cada archivo re‑exporta una pantalla de `src/presentation/screens`. Expo Router usa `app/` en la raíz automáticamente, sin configuración extra, y las rutas importan las pantallas con el alias `@/` → `src/`.

**¿Por qué la DI está en `data`?** El contenedor necesita conocer las clases concretas (de `data`) y los casos de uso (de `domain`). Si estuviera en `presentation`, la UI dependería de las implementaciones; si fuera una carpeta propia, sería una cuarta capa encubierta. En `data` no se rompe ninguna dependencia.

Las carpetas vacías tienen un `.gitkeep` para que Git las conserve. Se eliminan cuando la carpeta recibe su primer archivo.

---

## 2. Navegación: Expo Router sobre React Navigation (sin duplicar)

> Decisión formal: [ADR-C01](adr/ADR-C01-navegacion-expo-router.md) (aceptada por el equipo).

El acuerdo del equipo es usar **React Navigation**. En SDK 57 (y 58), Expo Router **incluye internamente React Navigation** (`expo-router/build/react-navigation`): su `Stack` es el native‑stack de React Navigation y su `Tabs` es el bottom‑tabs. Por eso:

- Se usa **un solo sistema de navegación**: Expo Router, que ya venía con la plantilla y es la solución recomendada por Expo.
- **No** se declara un `NavigationContainer` propio ni se instalan paquetes `@react-navigation/*` adicionales: eso duplicaría el sistema.
- Las opciones de pantalla, los headers y los temas siguen siendo los de React Navigation.

Para respetar Clean Architecture, `app/` (en la raíz) contiene solo archivos de ruta de una línea. Las pantallas reales viven en `src/presentation/screens`.

### Rutas por rol

| Ruta | Archivo de ruta | Pantalla | Acceso |
|---|---|---|---|
| `/` | `app/index.tsx` | Redirección | Todos (redirige al login o al inicio del rol) |
| `/login` | `app/login.tsx` | `screens/auth/LoginScreen` | Solo sin sesión |
| `/veedor` | `app/veedor/` | `screens/veedor/VeedorHomeScreen` | Rol Veedor |
| `/coordinador-recinto` | `app/coordinador-recinto/` | `screens/coordinador-recinto/…` | Rol Coordinador de Recinto |
| `/coordinador-provincial` | `app/coordinador-provincial/` | `screens/coordinador-provincial/…` | Rol Coordinador Provincial |

El layout raíz (`app/_layout.tsx`) protege cada grupo con `Stack.Protected guard={…}`. Si el rol no coincide, esas pantallas **no existen** para el usuario. Esta protección es solo de interfaz; la autorización real se aplicará en el servidor con **RLS de Supabase**.

Cada rol tiene su propio `_layout.tsx`, preparado para convertirse en pestañas (`Tabs`) cuando se agreguen sus módulos.

### Sesión provisional

`presentation/navigation/SessionPreviewContext.tsx` es una sesión **temporal** en memoria que solo sirve para probar la navegación por rol. En modo desarrollo (`__DEV__`), la pantalla de login muestra botones para entrar como cada rol; en el APK de producción esos botones no aparecen.
En la fase de autenticación se reemplazará por un store de Zustand alimentado por Supabase Auth. Las pantallas solo dependen de `useSession()`, por lo que el cambio no afecta a las rutas.

---

## 3. Decisiones de configuración

| Archivo | Cambio | Motivo |
|---|---|---|
| `app.json` | `name: "Control Electoral"`, `slug: "control-electoral"`, `scheme: "controlelectoral"` | Identidad de la app y esquema para enlaces profundos futuros. |
| `app.json` | `android.package: "ec.controlelectoral.app"` | Obligatorio para compilar el APK con EAS. **No cambiarlo después de la primera compilación.** |
| `app.json` | `userInterfaceStyle: "light"` | Identidad visual única con los colores de la organización (RNF-10) y legibilidad para adultos mayores. |
| `eas.json` | Perfiles `development` (development build, APK), `preview` (APK instalable para la entrega) y `production` | Acuerdo: Expo Development Build + EAS Build, con entrega en APK. |
| `package.json` | Scripts `typecheck`, `android:native`, `build:dev`, `build:apk`; se eliminó `reset-project` | Flujo de trabajo del equipo. Se eliminó el script de la plantilla porque ya no aplica. |
| `.gitignore` | Se agregaron `.env`, `.env.local` y `supabase/.temp/` | Las variables y los temporales de la CLI no se versionan; solo `.env.example`. |
| `.env` (raíz) | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SENTRY_DSN` | Archivo único de variables. Expo inserta las `EXPO_PUBLIC_*` en el bundle al compilar. Tras modificarlo hay que reiniciar Metro (`npx expo start --clear`). |
| `src/data/datasources/remote/supabaseConfig.ts` | `getSupabaseConfig()` lee y valida URL y publishable key | La conexión a Supabase es responsabilidad de `data`. Usa acceso literal `process.env.EXPO_PUBLIC_*`. La `service_role` nunca va en la app, solo en Edge Functions. |
| `src/domain/constants.ts` | `GEO_ALERT_THRESHOLD_METERS = 300`, dignidades y número de organizaciones | Acuerdos del consenso: alerta a más de 300 m sin bloquear el registro (S-06 del documento grupal). Son reglas de negocio, por eso viven en `domain`. |
| `src/presentation/theme/colors.ts` | Paleta con referencia en los colores institucionales del CNE (sin logotipo) y tipografía ampliada | RNF-06 (colores de la organización, ver `SISTEMA_DISENO.md` §1.1) y RNF-07 (usabilidad para adultos mayores). |

### Contenido de la plantilla eliminado

Se eliminó el demo de `create-expo-app`: `src/components`, `src/constants`, `src/hooks`, `src/global.css`, las pantallas `index` y `explore`, `scripts/reset-project.js` y las imágenes de ejemplo (logos de Expo/React, tabIcons). Se conservaron el ícono, el ícono adaptativo, el favicon y el splash.

---

## 4. Dependencias

### Instaladas en esta fase

| Paquete | Motivo |
|---|---|
| `expo-dev-client` | Acuerdo de usar **Expo Development Build**. Las librerías nativas de las siguientes fases (SQLite, cámara, Sentry…) requieren un development build y no funcionan en Expo Go. |

### Ya presentes en la plantilla y utilizadas

`expo`, `expo-router`, `react-native-screens`, `react-native-safe-area-context`, `react-native-gesture-handler` (navegación), `react-native-reanimated` + `react-native-worklets` (animaciones acordadas), `expo-status-bar`, `expo-splash-screen`, `expo-constants`, `expo-linking`.

### Pendientes por fase (siempre con `npx expo install`)

| Fase | Paquetes |
|---|---|
| Autenticación | `@supabase/supabase-js`, `expo-secure-store`, `zustand`, `@tanstack/react-query` |
| Offline y sincronización | `expo-sqlite`, `expo-file-system`, `@react-native-community/netinfo`, generación de UUID (`expo-crypto` → `randomUUID`) |
| Evidencia de actas | `expo-camera`, `expo-image-manipulator`, `expo-location` |
| Mapas | Visualización con OpenStreetMap (librería a verificar por compatibilidad con SDK 57 antes de instalarla) |
| Monitoreo | `@sentry/react-native` (con su plugin de Expo) |
| Animaciones | `lottie-react-native` |

---

## 5. Verificaciones realizadas

- `npx tsc --noEmit` → sin errores.
- `npx expo-doctor` → 20/20 verificaciones superadas.
- `npx expo export --platform android` → bundle de Android generado sin errores (las rutas resuelven bien).
