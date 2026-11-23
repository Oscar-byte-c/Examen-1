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

> **Línea base obligatoria:** el documento grupal `docs/Documento_Consolidado_ADR.docx` (22/11/2026), resumido en `docs/ADR_LINEA_BASE.md`. Cómo se implementó cada ADR: `docs/adr/ADR-C02-implementacion-adr-grupal.md`.

| Fase | Estado |
|---|---|
| Estructura, sistema de diseño, 3 capas, SDK 57 | ✅ |
| Alineación con el documento grupal (umbral 300 m, enlaces en vez de OTP, bandera en `app_metadata`, RHF + Zod) | ✅ Documentada (ADR_LINEA_BASE §4.8 y ADR-C02) |
| Backend: migración `20261122120000_territorio_actas.sql` (recintos, mesas, asignaciones, organizaciones, candidatos, actas, votos, historial, conflictos, RLS, RPC, Storage, Realtime) | ✅ Escrita · ⏳ **sin aplicar** en Supabase |
| Seed (Pichincha–Quito, 5 recintos × 4 mesas, 5 organizaciones ficticias, usuarios de prueba) | ✅ Escrito · ⏳ sin aplicar |
| Edge Functions `crear-usuario`, `cambiar-clave`, `solicitar-recuperacion` | ✅ Escritas · ⏳ **sin desplegar** |
| App: login, sesión offline, cambio obligatorio de clave, recuperación por enlace | ✅ Código · ⏳ sin probar en dispositivo |
| App: veedor (mesas, acta con RHF + Zod, cámara, nitidez, GPS, SQLite + outbox, sincronización automática) | ✅ Código · ⏳ sin probar en dispositivo |
| App: coordinador de recinto (mesas, asignar/reasignar, veedor sustituto, corregir actas, conflictos) | ✅ Código · ⏳ sin probar en dispositivo |
| App: coordinador provincial (dashboard en vivo, recintos, crear coordinador, mapa OSM con alertas > 300 m) | ✅ Código · ⏳ sin probar en dispositivo |
| Sentry con filtro de datos personales | ✅ Código · ⏳ falta el DSN en `.env` |
| Verificación local: `tsc` ✅ · 25 tests de dominio ✅ · expo-doctor 21/21 ✅ · bundle Android ✅ | ✅ |
| Colores oficiales de la organización (RNF-06) | ⏳ Pendiente del equipo (paleta provisional) |
| APK final (EAS, perfil `preview`) | ⏳ Al final |

## 3. Decisiones clave (resumen)

- **Seguridad:** la app solo LEE (filtrado por RLS). Toda escritura pasa por RPC `SECURITY DEFINER` que revalidan rol, ámbito y datos (`sincronizar_acta`, `resolver_conflicto`, `crear_recinto`, `asignar_mesa`) o por Edge Functions (alta de cuentas y claves). El provincial no edita actas.
- **Clave temporal (ADR-01):** `app_metadata.debe_cambiar_clave`. Mientras sea `true`, `privado.mi_rol()` devuelve `null` y la RLS no entrega datos.
- **Sincronización (ADR-03/10):** SQLite (`actas_locales`, `outbox`, `cache`) + UUID por operación + RPC idempotente. Versión base por acta: si no coincide, el servidor guarda ambas versiones en `actas_conflictos` (S-04).
- **Evidencia (ADR-04):** foto solo con la cámara de la app; nitidez por varianza del laplaciano (`NITIDEZ_MINIMA = 60`, **calibrar con fotos reales**); 3 lecturas de GPS y se guarda la más precisa. El GPS es obligatorio; la distancia la calcula el servidor; alerta > 300 m sin bloqueo.
- **Mapa:** WebView + Leaflet + teselas de OpenStreetMap.

## 4. Próximos pasos inmediatos (acciones del estudiante)

1. Crear `.env` (Project URL + publishable key; opcional el DSN de Sentry) y `.env.test.local`.
2. `npx supabase login` y `npx supabase link --project-ref <REF>`.
3. Panel de Supabase: *Allow new users to sign up* = OFF; *Confirm email* = ON; crear los 3 usuarios de prueba con *Auto Confirm*; *URL Configuration → Redirect URLs*: `controlelectoral://**` (y, solo durante las pruebas en Expo Go, la URL `exp://` de tu equipo); (ADR-02) SMTP personalizado y plantillas en español.
4. `npm run db:push` (migraciones + seed) → `npm run functions:deploy` → `npm run test:rls` (todas deben PASAR). Solo para probar los enlaces de correo en Expo Go: `npx supabase secrets set PERMITIR_EXPO_GO=true` (quitarlo antes de entregar; ver ADR-C02 §3).
5. Probar en Expo Go (`npm run start:go`) con los 3 roles.
6. Al final: colores oficiales, calibrar la nitidez y generar el APK con `npm run build:apk`.

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
