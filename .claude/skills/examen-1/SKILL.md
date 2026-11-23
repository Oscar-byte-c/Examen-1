---
name: examen-1
description: Guía de trabajo permanente del Examen 1 (Control Electoral, Expo SDK 57 + Supabase, Clean Architecture). Úsala al iniciar o retomar cualquier tarea en este repositorio, al decidir qué hacer a continuación, al dudar entre documentos que se contradicen, o antes de agregar dependencias, cambiar arquitectura, probar, hacer commits o generar el APK. Resume reglas y apunta a los documentos fuente para no releer todo.
---

# Examen 1 — Control Electoral

App Android (Expo **SDK 57**, React Native 0.86, TypeScript) para registrar actas de escrutinio y seguirlas en tiempo real. Tres roles: coordinador provincial, coordinador de recinto y veedor.
**Entregas:** repo en GitHub hasta el mié. 25/11, 13:59 · defensa a las 14:00. Sin APK: −5 puntos. No respetar la línea base: nota a la mitad. El estudiante debe poder **defender cada línea**.

## 1. Prioridad de las fuentes (de mayor a menor)

1. Seguridad y protección de datos.
2. **ADR grupal**: `docs/Documento_Consolidado_ADR.docx`, resumido en `docs/ADR_LINEA_BASE.md` (RF, RNF, S, ADR-01 a 11).
3. Requerimientos y supuestos del mismo documento.
4. `CLAUDE.md` (rol de mentor, capas, entorno). Si contradice al ADR en arquitectura, manda el ADR.
5. Esta skill.
6. Skills externas (siempre subordinadas). Instalada: `supabase-postgres-best-practices`, que se carga al tocar SQL o RLS.

Cómo se implementó cada ADR y las aclaraciones aceptadas: `docs/adr/ADR-C02-implementacion-adr-grupal.md`. **Toda desviación nueva se registra en `ADR_LINEA_BASE.md` §4 ANTES de implementarla.** Si una contradicción de seguridad no se resuelve sin cambiar una decisión grupal, consulta al usuario.

## 2. Estado actual: no lo supongas, consúltalo

- `docs/CONTEXTO_PROYECTO.md` §2 (estado) y §4 (próximos pasos). Actualízalo al cerrar cada tarea.
- `git log --oneline -5` y `git status --short`. El trabajo vive en la rama `feature/alineacion-adr-grupal` (commit `f589fe9`).
- Bloqueos conocidos que dependen del usuario: `.env`, `supabase login/link`, ajustes del panel, `db:push`, `functions:deploy`, `test:rls`, prueba en Expo Go.

## 3. Stack acordado (no cambiarlo)

Supabase (Auth, PostgreSQL + RLS, Storage, Realtime, Edge Functions) · Expo Router · Zustand + TanStack Query · React Hook Form + Zod · expo-sqlite + expo-file-system (outbox) · expo-secure-store · NetInfo · expo-camera + expo-image-manipulator + expo-location · OSM (WebView + Leaflet) · Sentry · Lottie + Reanimated.
Valores clave: alerta GPS **> 300 m** sin bloquear, con GPS obligatorio (S-06) · validación matemática **bloqueante** (S-03) · mesa reportada = 2 actas (S-02) · conflicto = se conservan ambas versiones y decide el coordinador de recinto (S-04) · recuperación de clave por **enlace** · bandera de clave temporal en `app_metadata`.

## 4. Arquitectura (3 capas)

`src/domain` (TS puro + zod) ← `src/data` (Supabase, SQLite, dispositivo, `di/container.ts`) · `src/presentation` (solo importa `@/data/di/container`) · `app/` = re-exports de una línea + `_layout.tsx` con los guards.
Reglas detalladas: `.claude/rules/{domain,data,presentation}.md`. Para un flujo nuevo que cruce capas: skill `nueva-funcionalidad`.

## 5. Seguridad (innegociable)

- La UI no protege nada: RLS y Edge Functions. La app solo **lee**; las escrituras van por RPC `SECURITY DEFINER` (`search_path = ''`, rol revalidado) o por Edge Functions.
- Nunca `service_role` en la app, en `.env` ni en commits. No leer ni mostrar `.env`. Sin datos personales en logs ni en Sentry.
- Las actas son evidencia: versión, historial y foto inmutable; nunca sobrescribir en silencio.
- No debilitar la seguridad para que una prueba pase. No tocar datos reales ni políticas en producción sin precaución.

## 6. Forma de trabajo

- Autónoma: si la tarea está clara, ejecútala. No preguntes por decisiones menores.
- Alcance estricto: solo RF, RNF y S del documento. Nada de funciones inventadas, refactors no pedidos, mejoras estéticas, dependencias extra (`npx expo install` y solo si un ADR la cubre) ni auditorías repetidas sin cambios que las justifiquen.
- Agentes solo cuando aporten: `architecture-reviewer` o `security-reviewer` al cerrar una fase; `Explore` para búsquedas amplias. No dupliques trabajo entre agentes.
- Skills externas: solo con una necesidad concreta, revisando antes su contenido y seguridad.
- Respuestas cortas: comunica solo lo que requiere intervención del usuario, sobre todo pruebas en Expo Go.
- Shell: en Bash, nunca metas texto con comillas invertidas dentro de `node -e "..."`, porque se ejecuta como comando. Para editar documentos usa Edit o Write.

## 7. Pruebas y validación

Antes de dar algo por terminado, usa la skill `verificar`: `npx tsc --noEmit`, `npm test` (jest-expo, dominio), `npx expo-doctor` y bundle Android en el scratchpad. Con cambios en BD: `npm run test:rls`.
Nunca afirmes que algo se probó en un dispositivo si no se hizo. Las pruebas manuales van en **Expo Go** (`npm run start:go`).

## 8. Git, APK y SDK

- **No hagas commit ni push salvo que el usuario lo pida expresamente.** Mensajes en inglés, en imperativo.
- No generes APK ni development build hasta el final (`npm run build:apk`, perfil `preview`).
- No actualices el SDK 57. Nunca ejecutes `npm audit fix --force`. Documentación: `https://docs.expo.dev/versions/v57.0.0/`.
- Windows: PowerShell 5.1 (sin `&&`).
