# Fase 3 – Autenticación con Supabase: diseño y plan

**Estado:** propuesta, pendiente de aprobación. **No hay código implementado.**
**ADR aplicables:** Supabase Auth + RLS, Expo Secure Store, Zustand, Expo Router (ADR-C01), cuentas administradas sin registro público, funcionamiento offline.

---

## 1. Diagnóstico del estado actual

| Área | Estado | Implicación |
|---|---|---|
| Supabase Auth | **Registro público ACTIVADO** (`disable_signup: false`) | 🔴 Cualquiera con la publishable key (que va dentro del APK) puede crearse una cuenta con `signUp()`. Hay que desactivarlo **antes** de nada. |
| Verificación de correo | Activa (`mailer_autoconfirm: false`) | ✅ Coherente con RF-05 |
| Base de datos | Sin tablas (`perfiles` no existe) | El rol no tiene todavía una fuente confiable |
| `supabase/` | Solo `.temp/` (proyecto vinculado), sin `config.toml` ni `migrations/` | Hay que inicializar las migraciones versionadas |
| `@supabase/supabase-js` | 2.119.2 instalado | `lock: processLock` (de tutoriales antiguos) **está obsoleto**: no se usa |
| `expo-secure-store`, `zustand` | No instalados | Se instalan en esta fase (están en el ADR) |
| Polyfill de URL | No instalado | RN 0.86 (SDK 57) ya implementa `URL`/`URLSearchParams` (verificado): **no se instala** salvo que falle en ejecución |
| Secure Store (SDK 57) | Expo no impone límite; en Android cifra con Keystore. **Incluido en Expo Go** | Adaptador simple, sin dividir la sesión en fragmentos; se puede probar en Expo Go |
| Navegación | `Stack.Protected` + `SessionPreviewContext` (`__DEV__`) | Se reemplaza la sesión provisional por la real (deuda 3.3) |
| Login | Solo UI, con botones de vista previa de roles | Se conecta al caso de uso y se quitan los botones de rol |
| Development build | **Nunca compilado** | Secure Store es nativo: sin un development build no se puede probar en el celular |

---

## 2. Arquitectura propuesta

### 2.1 Flujo de un inicio de sesión

```
LoginScreen ──► useLoginForm ──► authStore.iniciarSesion()          (presentation)
                                      │  container.iniciarSesion
                                      ▼
                         IniciarSesion.execute(correo, clave)       (domain: valida y normaliza)
                                      │  AuthRepository (interfaz)
                                      ▼
                         AuthRepositoryImpl                          (data)
                           ├─ AuthRemoteDataSource ─► supabase.auth.signInWithPassword
                           │                        └► select perfiles where id = auth.uid()  (RLS)
                           ├─ usuarioMapper (PerfilDTO → Usuario)
                           └─ perfilCache (Secure Store) ← para arrancar sin red
                                      │  Usuario
                                      ▼
authStore.estado = 'autenticado' ──► Stack.Protected guard ──► /veedor | /coordinador-recinto | /coordinador-provincial
```

### 2.2 Distribución por capas

**domain** (TypeScript puro: no importa Supabase, Expo ni `process.env`)

| Archivo | Responsabilidad |
|---|---|
| `entities/Usuario.ts` | `Usuario { id, correo, nombres, apellidos, rol: Role, recintoId \| null, debeCambiarClave }` |
| `entities/AuthErrors.ts` | `CredencialesInvalidasError`, `CorreoNoVerificadoError`, `CuentaInactivaError`, `PerfilNoEncontradoError`, `SinConexionError`, `DemasiadosIntentosError`, `ErrorAutenticacionDesconocido` |
| `entities/credenciales.ts` | `validarCredenciales(correo, clave)`: reglas puras (formato de correo, clave no vacía). La usan el caso de uso **y** el formulario, sin duplicar código |
| `repositories/AuthRepository.ts` | Interfaz: `iniciarSesion`, `cerrarSesion`, `obtenerUsuarioActual`, `observarCambios(cb) → desuscribir` |
| `use-cases/IniciarSesion.ts` | Valida, normaliza el correo (`trim` y minúsculas) y delega al repositorio |
| `use-cases/CerrarSesion.ts` | Cierra la sesión (local aunque no haya red) |
| `use-cases/RestaurarSesion.ts` | Obtiene el usuario al abrir la app (online u offline) |
| `use-cases/ObservarSesion.ts` | Se suscribe a los cambios: expiración, cierre de sesión o refresh |

**data**

| Archivo | Responsabilidad |
|---|---|
| `datasources/local/secureStoreAdapter.ts` | Adaptador `{ getItem, setItem, removeItem }` sobre `expo-secure-store` con el formato que exige Supabase (`SupportedStorage`). Normaliza las claves a los caracteres permitidos (`A-Z a-z 0-9 . - _`) |
| `datasources/local/perfilCache.ts` | Guarda o borra el último perfil validado (JSON pequeño) en Secure Store, para arrancar sin conexión |
| `datasources/remote/supabaseClient.ts` | Cliente **único** (`createClient`) con `storage: secureStoreAdapter`, `autoRefreshToken: true`, `persistSession: true` y `detectSessionInUrl: false`. Escucha `AppState`: activa el auto-refresh en primer plano y lo pausa en segundo plano |
| `datasources/remote/AuthRemoteDataSource.ts` | Llamadas a `supabase.auth.*` y lectura de `perfiles`. Devuelve DTOs, no entidades |
| `mappers/usuarioMapper.ts` | `PerfilDTO` (snake_case) → `Usuario`. **Rechaza roles desconocidos** |
| `repositories/AuthRepositoryImpl.ts` | `implements AuthRepository`. Traduce los errores de Supabase a errores de dominio, verifica `activo`, gestiona el modo offline y la caché |
| `di/container.ts` | Instancia el datasource, el repositorio y los 4 casos de uso |

**presentation**

| Archivo | Responsabilidad |
|---|---|
| `store/authStore.ts` | Zustand: `estado: 'inicializando' \| 'autenticado' \| 'no_autenticado'`, `usuario`, y las acciones `inicializar()`, `iniciarSesion()` y `cerrarSesion()`. Se suscribe a `ObservarSesion` |
| `navigation/useSession.ts` | Selector `useSession()` con la misma interfaz que usan hoy las pantallas (`role`, `cerrarSesion`). Reemplaza a `SessionPreviewContext.tsx`, que se elimina |
| `hooks/useLoginForm.ts` | Estado del formulario, validación por campo (con `validarCredenciales` del dominio), envío y traducción de errores de dominio a mensajes claros |
| `screens/auth/LoginScreen.tsx` | Misma UI. Errores en línea (`AppInput.errorText` + `StatusBadge`) y carga en `AppButton`. Sin `Alert` y **sin selector de rol** |
| `app/_layout.tsx` | Llama a `inicializar()`. Mantiene el splash mientras `estado === 'inicializando'`. Los guards usan el rol **del perfil** |
| `app/index.tsx` | Redirige según `estado` y rol |

### 2.3 Decisiones técnicas (formato docente)

**D1 – ¿De dónde sale el rol?**
- *Problema:* el rol decide qué ve cada usuario y, más adelante, qué datos puede tocar.
- *Alternativas:*
  - `user_metadata`: ❌ **el propio usuario puede editarlo** desde el cliente.
  - `app_metadata` en el JWT: solo lo escribe el servidor, pero duplica el dato.
  - Tabla `perfiles` con RLS: fuente única, que además necesitaremos para cédula, recinto y jerarquía.
  - Custom Access Token Hook: más complejo.
- *Decisión:* tabla `public.perfiles` como **única fuente de verdad**. El cliente solo puede **leer su propia fila** y no tiene política de `UPDATE` ni de `INSERT`, así que **nadie puede cambiarse el rol**.
- *Ventaja:* seguro y simple. *Desventaja:* una consulta extra después del login (mitigada con la caché local).

**D2 – Persistencia de la sesión.**
- *Problema:* la sesión debe sobrevivir al cierre de la app y estar protegida.
- *Alternativas:*
  - AsyncStorage (lo usa la guía de Supabase): no está cifrado y no está en el ADR.
  - Secure Store dividiendo la sesión en fragmentos.
  - Secure Store directo.
- *Decisión:* **Secure Store directo**. En SDK 57 Expo no limita el tamaño y en Android cifra con el Keystore. El límite de unos 2 KB era un problema histórico de iOS.
- *Riesgo:* si al probar en el dispositivo `setItemAsync` fallara por tamaño, se agrega la división en fragmentos (cerca de 30 líneas) sin cambiar ninguna otra capa.

**D3 – Arranque sin conexión (requisito offline).**
- *Problema:* sin red y con el token vencido, `getSession()` devuelve un error de red y ninguna sesión, aunque esta **sigue guardada**.
- *Decisión:* si el error es de red (`AuthRetryableFetchError`) y existe una sesión guardada **y** un perfil en caché, el usuario entra en modo **"autenticado sin verificar"** con su perfil cacheado. Al volver la red, supabase-js refresca el token. Si el servidor rechaza el refresh, se cierra la sesión.
- *Por qué es seguro:* sin un token válido no se puede leer ni escribir nada en el servidor (RLS). La caché solo decide qué pantallas mostrar.

**D4 – Estado global: Zustand, no Context.** Así lo define el ADR (Milka, ADR-05) y permite leer el estado fuera de React, por ejemplo desde el listener de Supabase. TanStack Query **no se instala todavía**: la autenticación no necesita caché de consultas. Entrará con los datos del servidor.

**D5 – Cierre de sesión robusto.** Si `signOut()` falla por red, supabase-js **no** borra la sesión local. Por eso el repositorio, ante un error de red, borra también la sesión del almacenamiento y la caché del perfil. Es un cierre local garantizado.

### 2.4 Tabla de errores (dominio → mensaje)

| Situación (Supabase) | Error de dominio | Mensaje al usuario |
|---|---|---|
| `invalid_credentials` | `CredencialesInvalidasError` | "Correo o clave incorrectos." *(no se revela cuál de los dos falló)* |
| `email_not_confirmed` | `CorreoNoVerificadoError` | "Debes verificar tu correo antes de ingresar." |
| Perfil con `activo = false` / `user_banned` | `CuentaInactivaError` | "Tu cuenta está deshabilitada. Contacta a tu coordinador." |
| Sin fila en `perfiles` | `PerfilNoEncontradoError` | "Tu cuenta no tiene un perfil asignado. Contacta a tu coordinador." (y se cierra la sesión) |
| `AuthRetryableFetchError` | `SinConexionError` | "Sin conexión. Para el primer ingreso necesitas internet." |
| `over_request_rate_limit` (429) | `DemasiadosIntentosError` | "Demasiados intentos. Espera unos minutos." |

### 2.5 Seguridad

- **Registro público desactivado** en el panel de Supabase (Authentication → Sign In / Providers → *Allow new users to sign up* = OFF). Se verifica con un script: `signUp()` debe fallar.
- **Solo la publishable key** en la app; `service_role` y `sb_secret_` nunca.
- **RLS en `perfiles`:** `SELECT` solo de la propia fila (`id = (select auth.uid())`) y ninguna política de `INSERT`, `UPDATE` ni `DELETE` para `authenticated` ni `anon`.
- **La navegación no autoriza nada:** `Stack.Protected` solo decide qué pantallas se muestran. Toda tabla futura llevará RLS que consulte el rol en `perfiles` (mediante una función `SECURITY DEFINER` con `search_path` fijo, que se crea cuando se necesite).
- **Se eliminan la sesión provisional y los botones de rol** (deuda 3.3). En la app real no existe ninguna forma de elegir el rol.
- No se registran en consola ni correo, ni token, ni cédula.

### 2.6 Modelo de datos (migración)

```sql
create table public.perfiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  cedula             text not null unique check (cedula ~ '^[0-9]{10}$'),
  nombres            text not null,
  apellidos          text not null,
  telefono           text not null,
  rol                text not null check (rol in ('coordinador_provincial','coordinador_recinto','veedor')),
  recinto_id         uuid null,            -- la FK a recintos se agrega en la fase de territorio
  creado_por         uuid null references public.perfiles(id),
  debe_cambiar_clave boolean not null default true,
  activo             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
alter table public.perfiles enable row level security;
create policy "perfil_propio_lectura" on public.perfiles
  for select to authenticated using (id = (select auth.uid()));
```

El correo **no se duplica**: se toma de `auth.users`, a través de la sesión.

---

## 3. Plan de implementación

> Cada tarea termina con `tsc`. Las que tocan el backend incluyen pruebas de seguridad con script. Las pruebas en dispositivo requieren el development build (T1).

### T0 – Preparar el backend *(con acciones tuyas en el panel)*
- **Objetivo:** cerrar el registro público y crear `perfiles` con RLS y los usuarios de prueba.
- **Archivos:** `supabase/config.toml` (`npx supabase init`), `supabase/migrations/<fecha>_perfiles.sql` y `supabase/seed_usuarios_prueba.sql` (solo inserta perfiles para los 3 usuarios de prueba).
- **Acciones tuyas:**
  1. Desactivar "Allow new users to sign up".
  2. Crear 3 usuarios en Authentication → Users → *Add user* (con *Auto Confirm*), uno por rol.
  3. Aplicar la migración: `! npx supabase db push` (pide la contraseña de la base de datos) **o** pegar el SQL en el SQL Editor.
- **Pruebas (script de Node que puedo ejecutar yo):**
  - `signUp()` falla.
  - Un usuario anónimo no lee `perfiles`.
  - Cada usuario lee **solo** su fila.
  - Un usuario **no puede** cambiar su `rol` (el `update` no afecta ninguna fila).
- **Problemas posibles:** `db push` sin contraseña falla → usar el SQL Editor. Olvidar el seed → aparece `PerfilNoEncontradoError` (y está bien que falle así).

### T1 – Dependencias y development build
- **Objetivo:** instalar `expo-secure-store` y `zustand` con `npx expo install` y compilar el development build.
- **Archivos:** `package.json`, `app.json` (plugin de Secure Store si lo requiere en SDK 57; se verificará).
- **Pruebas:** `expo-doctor`, `tsc` y bundle. Después, `npm run build:dev` (requiere `npx eas-cli login`) e instalación del APK de desarrollo.
- **Problemas posibles:** cada dependencia nativa nueva obliga a **recompilar** el build (10–20 min en EAS). Ver la decisión pendiente P4.

### T2 – Domain
- **Objetivo:** `Usuario`, `AuthErrors`, `credenciales.ts`, `AuthRepository` y los 4 casos de uso.
- **Dependencias:** ninguna.
- **Pruebas:** `tsc`, y el revisor de arquitectura confirma 0 imports externos. Tests unitarios si se aprueba P3.
- **Problemas posibles:** la tentación de importar tipos de Supabase en el dominio. Prohibido: el dominio define sus propios tipos.

### T3 – Data: infraestructura
- **Objetivo:** `secureStoreAdapter`, `perfilCache` y `supabaseClient` (con AppState).
- **Pruebas:** `tsc` y bundle (comprobar que la URL de Supabase quedó insertada en el bundle).
- **Problemas posibles:**
  - Claves de Secure Store con caracteres no permitidos (el adaptador las normaliza).
  - Dos clientes de Supabase creados por error: el singleton vive en un único módulo.

### T4 – Data: repositorio y DI
- **Objetivo:** `AuthRemoteDataSource`, `usuarioMapper`, `AuthRepositoryImpl` (con la tabla de errores, D3 y D5) y `container`.
- **Pruebas:** tests del mapper (P3). La integración real se prueba en el dispositivo (T7), porque Secure Store no corre en Node.
- **Problemas posibles:**
  - **No** llamar a `refreshSession()` dentro del handler de `TOKEN_REFRESHED`, porque provoca un bloqueo según el changelog de supabase-js.
  - Login correcto pero con el perfil inactivo: hay que cerrar la sesión antes de devolver el error.

### T5 – Presentation: estado global
- **Objetivo:** `authStore`, `useSession` y eliminar `SessionPreviewContext.tsx`.
- **Pruebas:** `tsc` y verificar con Grep que no quede ningún uso de `SessionPreviewProvider` ni de `signInAs`.
- **Problemas posibles:** suscribirse dos veces a `onAuthStateChange` (en modo Strict o por un remount). `inicializar()` debe ser idempotente.

### T6 – Navegación
- **Objetivo:**
  - `app/_layout.tsx`: inicializa, mantiene el splash mientras carga y aplica guards con el rol real.
  - `app/index.tsx`: redirige según el estado.
- **Pruebas:** bundle con las 9 rutas. En el dispositivo: que no aparezca el login un instante al abrir con sesión.
- **Problemas posibles:** bucle de redirección si los guards se evalúan durante `inicializando`. Por eso no se renderiza el `Stack` hasta conocer el estado.

### T7 – Pantalla de login
- **Objetivo:** `useLoginForm` y conectar `LoginScreen`. "¿Olvidaste tu clave?" queda informativo hasta la Fase 3B.
- **Pruebas en el dispositivo** (checklist):
  1. Login correcto con cada rol → llega a su panel.
  2. Clave incorrecta → mensaje genérico.
  3. Correo con formato inválido → error en el campo, sin llamar a la red.
  4. Modo avión → mensaje "Sin conexión".
  5. Cerrar y reabrir la app → sigue con la sesión, sin parpadeo del login.
  6. Reabrir sin red con la sesión guardada → entra con el perfil en caché.
  7. "Salir" con y sin red → vuelve al login.
  8. Desactivar el perfil (`activo = false`) → no puede entrar.
- **Problemas posibles:** el teclado tapa el botón (`KeyboardAvoidingView` ya existe) o el usuario toca dos veces el botón (deshabilitado mientras `loading`).

### T8 – Cierre de fase
- Skill `verificar`, agentes `architecture-reviewer` y `security-reviewer`, actualizar `docs/` (resolver la deuda 3.3) y proponer el commit.

### Fase 3B (siguiente, fuera de este plan)
Edge Function `crear-usuario` (verifica el rol de quien la llama y valida la cédula con módulo 10), guard de **cambio obligatorio de clave** (`debe_cambiar_clave`), verificación de correo y recuperación de clave por **código OTP**. El modelo de datos de T0 ya lo contempla (`debe_cambiar_clave`, `creado_por`).

---

## 4. Decisiones pendientes de aprobación

| # | Pregunta | Recomendación |
|---|---|---|
| P1 | ¿Aplicamos las migraciones con la CLI (`supabase db push`, versionadas en Git) o con el SQL Editor? | **CLI**: deja trazabilidad en el repositorio, algo valioso para la defensa |
| P2 | ¿Dividimos la fase en 3A (login, sesión, roles) y 3B (alta de cuentas, cambio de clave, OTP)? | **Sí**: entregables más pequeños y verificables |
| P3 | ¿Agregamos `jest-expo` (devDependency) para testear el dominio y el mapper? | **Sí, mínimo**: dominio y mapper, sin tests de UI |
| P4 | ¿Instalamos ya **todas** las dependencias nativas del ADR (SQLite, Camera, Location, Image Manipulator, NetInfo, Sentry, Lottie) para compilar **un solo** development build? | **Sí**, por el plazo: cada recompilación cuesta entre 10 y 20 minutos. Solo se instalan, no se usan todavía |
| P5 | ¿Eliminamos los botones de vista previa de roles? | **Sí**: es una deuda de seguridad registrada (3.3) y con usuarios de prueba reales ya no hacen falta |
