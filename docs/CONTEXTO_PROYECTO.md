# Contexto del proyecto — Control Electoral

> Documento para **retomar el trabajo desde otra computadora** (o en una sesión nueva de Claude Code).
> Última actualización: 2026-11-21.

## 1. Qué es y fechas límite

App Android (React Native + **Expo SDK 57**) para registrar y seguir el escrutinio de una organización política: tres roles (Coordinador Provincial, Coordinador de Recinto y Veedor), actas con foto y GPS, modo offline y resultados en tiempo real.

| Entrega | Fecha |
|---|---|
| Fase grupal (documento consolidado de ADR + video) | lun. 23/11, 23:59 |
| Enlace del repositorio de GitHub | mié. 25/11, 13:59 |
| Defensa presencial | mié. 25/11, 14:00 |

Penalizaciones a tener presentes: sin APK, −5 puntos; no respetar la línea base de ADR, nota a la mitad; compartir el repositorio con otros estudiantes, nota de cero.

## 2. Estado actual (qué está hecho)

| Fase | Estado |
|---|---|
| 1 – Estructura (Clean Architecture, Expo Router, Git) | ✅ |
| 2 – Sistema de diseño y componentes base | ✅ (colores provisionales) |
| Reestructura: 3 capas (`domain`, `data`, `presentation`), rutas en `app/` (raíz) | ✅ |
| Variables de entorno en `.env` (raíz) y lectura en `src/data/datasources/remote/supabaseConfig.ts` | ✅ |
| Migración a **Expo SDK 57** (requisito obligatorio) | ✅ |
| 3A – Autenticación: **T0** (backend) | 🟡 La migración `perfiles` + RLS ya está **aplicada** en Supabase; faltan los pasos manuales (ver §4) |
| 3A – T1 a T8 | ⏳ Pendiente (plan aprobado en `docs/plan/FASE3_AUTENTICACION.md`) |
| 3B – Alta de cuentas, cambio de clave, OTP | ⏳ Pendiente |
| Fases siguientes: territorio, actas (foto, GPS, offline, outbox), dashboard en tiempo real, Sentry, APK | ⏳ Pendiente |

## 3. Decisiones aprobadas (resumen)

La referencia completa está en `docs/ADR_LINEA_BASE.md` y `docs/adr/`.

- **Stack:** Expo SDK 57 · Expo Router (incluye React Navigation) · Supabase (Auth, PostgreSQL, RLS, Storage, Realtime, Edge Functions) · Secure Store · SQLite + File System · NetInfo · Zustand + TanStack Query · Camera, Image Manipulator, Location · OpenStreetMap · Sentry · Lottie + Reanimated.
- **Arquitectura:** solo tres capas en `src/`: `domain` (TypeScript puro), `data` (incluye `di/container.ts`) y `presentation`. Las rutas viven en `app/` (raíz) y solo re-exportan pantallas.
- **Seguridad:**
  - El rol sale solo de la tabla `perfiles` (con RLS), nunca de `user_metadata`.
  - Cada usuario solo lee su propia fila; nadie puede modificar su rol.
  - No hay registro público.
  - En la app solo va la publishable key; la `service_role` nunca.
- **Aprobado para la Fase 3:**
  - P1: migraciones con la CLI, versionadas.
  - P2: división en 3A/3B.
  - P3: `jest-expo` para tests de dominio.
  - P4: instalar de una vez las dependencias nativas del ADR.
  - P5: eliminar la vista previa de roles.
- **Condiciones del estudiante para la Fase 3:**
  - Roles asignados solo por mecanismos administrativos.
  - RLS que impida ver o modificar perfiles ajenos y cambiar los propios privilegios.
  - La caché del perfil solo sirve para la interfaz offline.
  - El servidor revalida todo lo que se sincroniza.
  - El cierre de sesión limpia la sesión local aunque no haya red.
- **Acuerdos de negocio:**
  - Alerta GPS a 500 m del recinto, sin bloquear el registro.
  - Los conflictos de sincronización se conservan y se registran.
  - Funcionamiento offline.

## 4. Próximos pasos inmediatos

1. **T0 – pasos manuales en el panel de Supabase:**
   1. Authentication → Sign In / Providers → **Allow new users to sign up = OFF**.
   2. Authentication → Users → *Add user* (con **Auto Confirm**), usando la misma clave para los tres:
      - `provincial.prueba@example.com`
      - `recinto.prueba@example.com`
      - `veedor.prueba@example.com`
   3. Crear `.env.test.local` con `PRUEBA_CLAVE_USUARIOS=<esa clave>`.
   4. Ejecutar `npm run db:push`, que aplica el seed con los roles, y luego `npm run test:rls`, que debe mostrar todas las verificaciones como PASA.
2. **T1 – Fase 3A:** instalar las dependencias nativas del ADR con `npx expo install`, configurar `jest-expo` y preparar el development build.
3. Continuar con T2–T8 según el plan.
4. Pendientes del equipo: colores oficiales de la organización y la librería de mapas OSM (línea base 3.4).

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
