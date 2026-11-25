# Contexto del proyecto — Control Electoral

> Documento para **retomar el trabajo desde otra computadora** (o en una sesión nueva de Claude Code).
> Última actualización: 2026-11-22.

## 1. Qué es y fechas límite

App Android (React Native + **Expo SDK 57**) para registrar y seguir el escrutinio de una organización política: tres roles (Coordinador Provincial, Coordinador de Recinto y Veedor), actas con foto y GPS, modo offline y resultados en tiempo real.

| Entrega | Fecha |
|---|---|
| Fase grupal (documento consolidado de ADR + video) | lun. 23/11, 23:59 |
| Enlace del repositorio de GitHub | mié. 25/11, 13:59 |
| Defensa presencial | mié. 25/11, 14:00 |

Penalizaciones a tener presentes: sin APK, −5 puntos; no respetar la línea base de ADR, nota a la mitad; compartir el repositorio con otros estudiantes, nota de cero.

## 2. Estado actual (qué está hecho)

> **Rama de trabajo:** `feature/alineacion-adr-grupal` (commit `f589fe9`, sin fusionar en `main` ni subir a GitHub). Guía compacta para cada sesión: skill `.claude/skills/examen-1`.
>
> **Línea base obligatoria:** el documento grupal `docs/Documento_Consolidado_ADR.docx` (22/11/2026), resumido en `docs/ADR_LINEA_BASE.md`. Cómo se implementó cada ADR: `docs/adr/ADR-C02-implementacion-adr-grupal.md`.

| Fase | Estado |
|---|---|
| Estructura, sistema de diseño, 3 capas, SDK 57 | ✅ |
| Alineación con el documento grupal (umbral 300 m, enlaces en vez de OTP, bandera en `app_metadata`, RHF + Zod) | ✅ Documentada (ADR_LINEA_BASE §4.8 y ADR-C02) |
| Backend: migración `20261122120000_territorio_actas.sql` (recintos, mesas, asignaciones, organizaciones, candidatos, actas, votos, historial, conflictos, RLS, RPC, Storage, Realtime) | ✅ Aplicada en Supabase (22/11), junto con `20261122110000_retirar_territorio_previo.sql` |
| Seed (Pichincha–Quito, 5 recintos × 4 mesas, 5 organizaciones ficticias, usuarios de prueba) | ✅ Aplicado (22/11): 5 recintos, 20 mesas, 5 organizaciones, 10 candidatos, 3 perfiles, 2 asignaciones |
| Edge Functions `crear-usuario`, `cambiar-clave`, `solicitar-recuperacion` | ✅ Desplegadas (22/11) |
| App: login, sesión offline, cambio obligatorio de clave, recuperación por enlace | ✅ Código · ⏳ sin probar en dispositivo |
| App: veedor (mesas, acta con RHF + Zod, cámara, nitidez, GPS, SQLite + outbox, sincronización automática) | ✅ Código · ⏳ sin probar en dispositivo |
| App: coordinador de recinto (mesas, asignar/reasignar, veedor sustituto, corregir actas, conflictos) | ✅ Código · ⏳ sin probar en dispositivo |
| App: coordinador provincial (dashboard en vivo, recintos, crear coordinador, mapa OSM con alertas > 300 m) | ✅ Código · ⏳ sin probar en dispositivo |
| Sentry con filtro de datos personales | ✅ Código · DSN y `SENTRY_AUTH_TOKEN` en `.env.local` (local) · una sola inicialización (`MonitoreoSentry`); se descartaron los añadidos del Wizard (Replay, Feedback, Logs, `sendDefaultPii`) · botón **«Probar monitoreo»** en el tablero del provincial (caso de uso `ProbarMonitoreo`, tag `tarea: prueba_monitoreo`) · ⏳ variables de EAS para el APK |
| Verificación local: `tsc` ✅ · 25 tests de dominio ✅ · expo-doctor 21/21 ✅ · bundle Android ✅ | ✅ |
| Colores oficiales de la organización (RNF-06) | ⏳ Pendiente del equipo (paleta provisional) |
| APK final (EAS, perfil `preview`) | ⏳ Al final |

## 3. Decisiones clave (resumen)

- **Seguridad:** la app solo LEE (filtrado por RLS). Toda escritura pasa por RPC `SECURITY DEFINER` que revalidan rol, ámbito y datos (`sincronizar_acta`, `resolver_conflicto`, `crear_recinto`, `asignar_mesa`) o por Edge Functions (alta de cuentas y claves). El provincial no edita actas.
- **Clave temporal (ADR-01):** `app_metadata.debe_cambiar_clave`. Mientras sea `true`, `privado.mi_rol()` devuelve `null` y la RLS no entrega datos.
- **Sincronización (ADR-03/10):** SQLite (`actas_locales`, `outbox`, `cache`) + UUID por operación + RPC idempotente. Versión base por acta: si no coincide, el servidor guarda ambas versiones en `actas_conflictos` (S-04).
- **Evidencia (ADR-04):** foto solo con la cámara de la app; nitidez por varianza del laplaciano a 1000 px, con promedio 2×2, por ejes y por bloques (`NITIDEZ_MINIMA = 200`, calibrado por simulación el 24/11 porque con 60 las fotos borrosas pasaban; **confirmar con fotos reales**, ver ADR-C02 §5); 3 lecturas de GPS y se guarda la más precisa. El GPS es obligatorio; la distancia la calcula el servidor; alerta > 300 m sin bloqueo.
- **Mapa:** WebView + Leaflet + teselas de OpenStreetMap.

## 4. Próximos pasos inmediatos (acciones del estudiante)

1. Crear `.env` (Project URL + publishable key; opcional el DSN de Sentry) y `.env.test.local`.
2. ✅ (22/11) CLI autenticada y vinculada al proyecto **`Examen-1` (ref `lhehzeccskdknwmvnvgo`)**. `wjyyauyrnrpnubkijqnh` es el ID de la **organización** "Examen1", no un proyecto (por eso fallaba `link`).
   - El remoto tenía aplicada una migración `20261121230000_territorio` de una iteración previa al ADR grupal que no estaba en el repo. Se recuperó con `migration fetch` y se añadió `20261122110000_retirar_territorio_previo.sql`, que la deshace (solo datos de prueba; las cuentas de Auth no se tocan y el seed recrea los perfiles). Ensayo con `BEGIN…ROLLBACK` y `db push` aplicados el 22/11.
   - **Ojo:** si el seed ya figura en el historial, `db push --include-seed` solo actualiza su hash y **no lo ejecuta**. Para reejecutarlo (es idempotente): `npx supabase db query --remote -f supabase/seed.sql`.
   - Advisors: el aviso *SECURITY DEFINER ejecutable por authenticated* en `sincronizar_acta`, `resolver_conflicto`, `crear_recinto` y `asignar_mesa` es intencional (las funciones revalidan rol y ámbito). Pendiente en el panel: *Leaked password protection*.
   - Estado remoto antes del push: 4 cuentas de Auth (`provincial`, `recinto`, `veedor` y `nuevo.prueba@example.com`), solo `cambiar-clave` desplegada (versión antigua), sin bucket `fotos-actas`.
3. Panel de Supabase: *Allow new users to sign up* = OFF; *Confirm email* = ON; crear los 3 usuarios de prueba con *Auto Confirm*; *URL Configuration → Redirect URLs*: `controlelectoral://**` (y, solo durante las pruebas en Expo Go, `exp://<IP-LAN>:8081/--/**`, p. ej. `exp://192.168.1.41:8081/--/**`; una entrada sin la ruta `/--/…` **no** coincide); (ADR-02) SMTP personalizado y plantillas en español.
4. `npm run db:push` (migraciones + seed) → `npm run functions:deploy` → `npm run test:rls` (todas deben PASAR). Solo para probar los enlaces de correo en Expo Go: `npx supabase secrets set PERMITIR_EXPO_GO=true` (quitarlo antes de entregar; ver ADR-C02 §3).
   - ✅ (22/11) `.env` y `.env.test.local` creados por el estudiante · `npm run test:rls`: **27/27 PASAN** · `tsc` ✅ · jest 26/26 ✅ · expo-doctor 21/21 ✅ · `expo lint` sin configurar (ESLint no instalado). Falta `EXPO_PUBLIC_SENTRY_DSN` (necesario para la demo de fallos de la rúbrica, 1 punto).
5. Probar en Expo Go (`npm run start:go`) con los 3 roles. ⏳ En curso (22/11).
   - Web (23/11, opcional; la entrega es el APK Android): `metro.config.js` añade `wasm` a `assetExts` y las cabeceras COOP/COEP que expo-sqlite exige en web (docs SDK 57). El bundle web compila, pero `expo-secure-store` no tiene implementación web. **Decisión (23/11): web NO soportada; la app se valida en Android** (Expo Go y APK). No se usa `localStorage` para tokens (RNF-02). Ver ADR-C02 §9.
   - 🐞 (22/11) Invitación con `otp_expired` y redirección a `localhost:3000`. Causa: `crear-usuario` asignaba la clave **después** de invitar y en Supabase Auth cambiar la clave borra el token de confirmación. Además faltaba `PERMITIR_EXPO_GO`, así que se usaba el *Site URL*. Corregido en el código (ver ADR-C02 §2). ⏳ Falta desplegar `crear-usuario`, activar el secreto, añadir la *Redirect URL* `exp://…` y reenviar la invitación al coordinador ya creado (su perfil y su recinto se conservan).
   - 🐞 (23/11) RF-04: el enlace de recuperación seguía abriendo `localhost:3000` con `PERMITIR_EXPO_GO=true`. Verificado: la función desplegada (v3) es idéntica al repo y el secreto vale `true`, así que la función **sí** envía la URL `exp://…`. La sustituía **Supabase Auth**: la *Redirect URLs* solo admite `controlelectoral://**`; cualquier `exp://` cae al *Site URL*. Prueba sin enviar correos (token falso; mira el `Location`): `curl -s -D - -o /dev/null "https://lhehzeccskdknwmvnvgo.supabase.co/auth/v1/verify?type=recovery&token=x&redirect_to=exp%3A%2F%2F192.168.1.41%3A8081%2F--%2Frestablecer-clave"`. Solución: añadir `exp://192.168.1.41:8081/--/**` en el panel (quitarla antes de entregar). Sin cambios de código.
   - 🐞 (24/11) **Falso error al cambiar o restablecer la clave** (la clave sí cambiaba). Causa: Supabase Auth, al cambiar la clave con la API de administración (`updateUserById` en `cambiar-clave`), ejecuta `Logout` de **todas** las sesiones del usuario (código de GoTrue: `UpdatePassword(tx, nil)` → `Logout`); la app luego llamaba a `refreshSession()` con un refresh token revocado y mostraba ese fallo como error. Corrección (sin tocar la Edge Function): `AuthRepositoryImpl.cambiarClave` vuelve a ingresar con `signInWithPassword(correo, claveNueva)` y devuelve `ResultadoCambioClave` (`sesion_iniciada` | `reingreso_requerido`); si el reingreso falla, se va al login con el aviso «Tu clave se actualizó correctamente…». Los errores reales de la función se conservan (se añadió `error_cambio_clave`). `RestablecerClaveScreen` ahora redirige al terminar. Test: `src/data/__tests__/AuthRepositoryImpl.cambiarClave.test.ts`. ⏳ Probar en Expo Go (primer ingreso y recuperación).
   - ✨ (24/11) **Foto y mapa de la evidencia** (Fase 3 del plan de mejoras; la Fase 2 de concurrencia se pospuso). Al registrar: foto → mapa con el lugar de captura, el recinto, la distancia, la precisión y la alerta de > 300 m. Al abrir un acta ya registrada: tarjeta «Evidencia registrada» con la foto original (local o URL firmada) y su ubicación original. Detalle en ADR-C02 §6. Test: `src/domain/__tests__/ubicacionEvidencia.test.ts`. ⏳ Probar en Expo Go.
   - 🐞 (24/11) **Sin internet la foto se rechazaba por «ubicación»** con GPS y permisos activos: el primer fix sin A-GPS tardaba más que 3 × 15 s. Corregido con precalentamiento del GPS, lecturas solo posteriores a la foto, límite total de 60 s y mensajes por causa; además, guardar sin red tras vencer el token (~1 h) ya no falla (identidad de la sesión guardada verificada contra el perfil en caché). Detalle en ADR-C02 §5.1. Tests: `gpsCaptura.test.ts`, `gps.test.ts`, `sesionLocal.test.ts`. 2.ª iteración: GPS Test obtenía fix en modo avión y la app no → se exige permiso preciso real, el seguimiento no depende del diálogo de ajustes y tiene un límite de arranque de 10 s, y el error muestra un diagnóstico técnico sin coordenadas. ⏳ Probar en Expo Go en modo avión (2 teléfonos) y anotar el «Detalle técnico» si vuelve a fallar.
   - 🎨 (24/11) **Fase 4, primera etapa: rediseño «Acta y sello».** Tema (paleta tinta/ocre/papel con contraste AA calculado, `numeral` con `tabular-nums`), componentes base y nuevos (`SelloEstado`, `PasosActa`, `PieFijo`, `Esqueleto`, `AnimacionLottie`, `CifraClave`, `BarraProgreso`), navegación (`slide_from_right`/`fade`), login (emblema Lottie + sacudida de la clave solo con `CredencialesInvalidasError`, mensaje «El correo o la clave son incorrectos.»), acta (pasos, pie fijo con suma + Guardar, teclado, Lottie GPS y acta sellada) e inicio del veedor (sello por acta, un solo aviso de conexión, esqueleto, deslizar para actualizar). 6 animaciones originales en `assets/animaciones` (generador `scripts/lottie/generar.js`). Sin dependencias nuevas; sin cambios en `domain`/`data`. Detalle: `docs/SISTEMA_DISENO.md`. ⏳ Probar en Expo Go (2 teléfonos). ⏳ Segunda etapa (recinto, conflictos, provincial) pendiente de autorización.
6. Al final: colores oficiales, calibrar la nitidez y generar el APK con `npm run build:apk`.
   - (24/11) Preparación del build. Perfil `preview` = APK de distribución interna con `environment: "preview"` y `SENTRY_DISABLE_AUTO_UPLOAD=true` (sin `SENTRY_AUTH_TOKEN`, la subida de source maps de Sentry hace fallar Gradle).
   - 🐞 (24/11) El primer build falló en *Bundle JavaScript* (`getValueWithKeyAsync is not a function`). Causa: `web.output: "server"` hacía que `export:embed` evaluara las rutas en Node. Corregido con `"single"` (ver ADR-C02 §9). Verificación local equivalente a Gradle: `npx expo export:embed --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output <scratchpad>/index.android.bundle --assets-dest <scratchpad>/res`.
   - ⏳ Falta: (1) `eas init` para vincular el proyecto de EAS (no hay `projectId`). (2) Crear en EAS, entorno **preview**, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `EXPO_PUBLIC_SENTRY_DSN`. El `.env` está en `.gitignore` y **no se sube a EAS**: sin estas variables, el APK falla al abrirse. (3) Antes de entregar, quitar `PERMITIR_EXPO_GO` y la *Redirect URL* `exp://…`.

## 5. Configurar una computadora nueva

### 5.1 Herramientas
| Herramienta | Versión | Notas |
|---|---|---|
| Node.js | **≥ 22.13** (LTS recomendado) | Exigido por SDK 57 |
| Git | Reciente | Configura tu autor: `git config --global user.name "…"` y `git config --global user.email "…"` |
| Expo Go **SDK 57** (en el teléfono) | 57.x | La Play Store trae la versión del SDK 58. Instálala desde fuente oficial: **Expo Orbit** o el enlace de `https://expo.dev/go?sdkVersion=57&platform=android&device=true` |
| Supabase CLI | Vía `npx supabase` | No requiere instalación global |
| Claude Code | Reciente | Opcional, para continuar con el mentor |

### 5.2 Clonar e instalar
```bash
git clone https://github.com/Oscar-byte-c/Examen-1.git
cd Examen-1
npm ci          # instala EXACTAMENTE las versiones del package-lock.json
```
> Usa `npm ci` en lugar de `npm install`: respeta el lockfile y garantiza el mismo SDK 57. **No ejecutes `npm audit fix --force`**, porque cambiaría la versión de Expo.

### 5.3 Variables de entorno (no están en Git)
```bash
copy .env.example .env               # Windows (en macOS/Linux: cp)
copy .env.test.example .env.test.local
```
- `.env`: Supabase Dashboard → Project Settings → API → **Project URL** y **Publishable key**. `EXPO_PUBLIC_SENTRY_DSN` puede quedar vacío por ahora.
- `.env.test.local`: la clave de los usuarios de prueba.
- **Nunca** pegues la `service_role` ni una `sb_secret_…` en estos archivos.

### 5.4 Conectar la CLI de Supabase
```bash
npx supabase login                               # abre el navegador
npx supabase link --project-ref <REF_DEL_PROYECTO>
```
La referencia es el subdominio de tu Project URL (`https://<REF>.supabase.co`). Comprueba la conexión con `npx supabase db push --remote --dry-run`.

### 5.5 Ejecutar la app (SDK 57)
```bash
npm run start:go        # Expo Go (expo-dev-client está instalado; sin --go el QR es para un development build)
npx expo start --go --tunnel   # si la red bloquea la conexión
```
Verificaciones rápidas: `npm run typecheck` · `npx expo-doctor`.

### 5.6 Continuar con Claude Code
1. Abre Claude Code **dentro de la carpeta del proyecto** (`cd Examen-1` y luego `claude`) y acepta la confianza de la carpeta.
2. Se cargan automáticamente `CLAUDE.md` (rol de mentor, arquitectura, seguridad), `AGENTS.md`, `.claude/rules`, los agentes (`architecture-reviewer`, `security-reviewer`) y las skills (`/verificar`, `/nueva-funcionalidad`).
3. Instala el plugin oficial de Expo: `/plugin install expo@claude-plugins-official`.
4. Primer mensaje sugerido: *"Lee docs/CONTEXTO_PROYECTO.md y continuemos con la Fase 3A desde la tarea pendiente."*

> La memoria personal de Claude y el historial de conversaciones **no viajan** con el repositorio. Por eso este documento, `docs/plan/` y los ADR son la fuente de verdad: actualízalos al cerrar cada fase.
