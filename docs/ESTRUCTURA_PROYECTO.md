# Estructura del proyecto y decisiones de configuración

**Fase:** 1 – Preparación del proyecto (sin autenticación, base de datos, actas, sincronización ni dashboards).
**Base:** Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript (modo estricto).

---

## 1. Estructura de carpetas (Clean Architecture)

```
exam1/
├── app.json              # Configuración Expo (nombre, paquete Android, plugins)
├── eas.json              # Perfiles de compilación EAS (development / preview APK / production)
├── .env.example          # Plantilla de variables de entorno públicas
├── docs/                 # Documentación del proyecto
├── assets/images/        # Íconos y splash
└── src/
    ├── app/              # RUTAS (Expo Router). Solo archivos delgados que conectan URL → pantalla
    ├── domain/           # Núcleo de negocio, TypeScript puro, sin dependencias de frameworks
    │   ├── entities/     #   Entidades y tipos (Role, Acta, Mesa, Recinto…)
    │   ├── repositories/ #   Interfaces (contratos) de repositorios
    │   ├── usecases/     #   Casos de uso (RegistrarActa, AsignarVeedor…)
    │   └── errors/       #   Errores de dominio
    ├── data/             # Implementaciones concretas de los contratos del dominio
    │   ├── datasources/
    │   │   ├── local/    #   SQLite, File System, Secure Store
    │   │   └── remote/   #   Supabase (Auth, PostgreSQL, Storage, Realtime)
    │   ├── repositories/ #   Implementan las interfaces de domain/repositories
    │   └── mappers/      #   Conversión DTO (BD/API) ↔ entidad de dominio
    ├── presentation/     # Interfaz de usuario
    │   ├── screens/      #   Pantallas agrupadas por rol (auth, veedor, coordinador-recinto, coordinador-provincial)
    │   ├── components/   #   Componentes reutilizables
    │   ├── navigation/   #   Sesión de navegación, rutas por rol
    │   ├── hooks/        #   Hooks de UI
    │   ├── store/        #   Stores de Zustand (fase siguiente)
    │   └── theme/        #   Colores, tipografía y espaciado de la organización
    ├── di/               # Composition root: instancia repositorios y los inyecta en casos de uso
    ├── config/           # Variables de entorno y constantes de negocio acordadas
    └── utils/            # Utilidades puras y transversales (formatos, validadores genéricos)
```

### Regla de dependencias

```
presentation  ──►  domain  ◄──  data
       │                          ▲
       └────────►  di  ───────────┘
```

- `domain` **no importa** nada de `data`, `presentation`, Expo ni Supabase.
- `data` implementa las interfaces de `domain`.
- `presentation` usa casos de uso obtenidos desde `di`. **Nunca** importa Supabase ni SQLite directamente.
- `src/app` solo contiene rutas: cada archivo re‑exporta una pantalla de `presentation/screens`.

Las carpetas vacías tienen un `.gitkeep` para que Git las conserve. Se eliminan cuando la carpeta recibe su primer archivo.

---

## 2. Navegación: Expo Router sobre React Navigation (sin duplicar)

El acuerdo del equipo es usar **React Navigation**. Expo Router **está construido sobre React Navigation**: su `Stack` es el native‑stack de React Navigation y su `Tabs` es el bottom‑tabs. Por eso:

- Se usa **un solo sistema de navegación**: Expo Router, que ya venía con la plantilla y es la solución recomendada por Expo.
- **No** se declara un `NavigationContainer` propio ni se instalan paquetes `@react-navigation/*` adicionales: eso duplicaría el sistema.
- Las opciones de pantalla, los headers y los temas siguen siendo los de React Navigation.

Para respetar Clean Architecture, `src/app` contiene solo archivos de ruta de una línea. Las pantallas reales viven en `src/presentation/screens`.

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
| `.gitignore` | Se agregó `.env` | Las claves de Supabase y Sentry no se versionan; solo `.env.example`. |
| `src/config/env.ts` | Lectura centralizada de `EXPO_PUBLIC_*` | Un único punto de acceso a la configuración. La clave `service_role` nunca va en la app, solo en Edge Functions. |
| `src/config/constants.ts` | `GEO_ALERT_THRESHOLD_METERS = 500`, dignidades y número de organizaciones | Acuerdos del consenso: alerta a 500 m sin bloquear el registro. |
| `src/presentation/theme/colors.ts` | Paleta provisional y tipografía ampliada | Colores de la organización (pendientes de definir) y RNF-03 (usabilidad para adultos mayores). |

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
| Mapas | Visualización con OpenStreetMap (librería a verificar por compatibilidad con SDK 58 antes de instalarla) |
| Monitoreo | `@sentry/react-native` (con su plugin de Expo) |
| Animaciones | `lottie-react-native` |

---

## 5. Verificaciones realizadas

- `npx tsc --noEmit` → sin errores.
- `npx expo-doctor` → 20/20 verificaciones superadas.
- `npx expo export --platform android` → bundle de Android generado sin errores (las rutas resuelven bien).
