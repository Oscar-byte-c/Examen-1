# Control Electoral para Organización Política

Aplicación móvil (React Native + **Expo SDK 57**, Android) para gestionar el escrutinio el día de las elecciones.
Examen I – Desarrollo de Aplicaciones Móviles.

> **¿Vienes de otra computadora o de una sesión nueva?** Empieza por [docs/CONTEXTO_PROYECTO.md](docs/CONTEXTO_PROYECTO.md): estado actual, decisiones y pasos de instalación.

## Requisitos

- Node.js ≥ 22.13 y npm
- Git
- Expo Go **SDK 57** en el teléfono (ver el contexto del proyecto) o un development build
- Cuenta en Expo (para EAS Build)

## Comandos

```bash
npm ci                 # instalar dependencias exactas del lockfile
npm run start:go       # abrir en Expo Go
npm start              # abrir en el development build
npm run typecheck      # verificación de tipos
npm run db:push        # aplicar migraciones y seed en Supabase (CLI)
npm run test:rls       # prueba de seguridad de RLS contra Supabase
npm run build:dev      # APK de development build (EAS)
npm run build:apk      # APK instalable para entrega (EAS, perfil preview)
```

> Instalar dependencias siempre con `npx expo install <paquete>` para obtener versiones compatibles con el SDK 57.

## Configuración del entorno de desarrollo en una PC nueva

Pasos para dejar Examen-1 listo en otra computadora con **Windows 10/11**. Todos los comandos son para **PowerShell** y se ejecutan en orden. No se asume ninguna sesión ni credencial de la PC anterior.

> Si un comando no se reconoce justo después de instalar algo, **cierra y vuelve a abrir PowerShell** para que se recargue el `PATH`.

### Paso 1. Node.js y npm

- **Qué es:** el entorno que ejecuta Expo, Metro, las pruebas y las CLI (Supabase y EAS vía `npx`). npm viene incluido.
- **Versión:** **≥ 22.13**, exigida por el SDK 57. Usa la LTS.

```powershell
winget install OpenJS.NodeJS.LTS
```

Comprobar:

```powershell
node -v
npm -v
```

- **Si ya está instalado:** basta con que `node -v` muestre 22.13 o superior. Si es menor, actualiza con `winget upgrade OpenJS.NodeJS.LTS`.
- **Si `npm` da error de «ejecución de scripts deshabilitada»:** ejecuta una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### Paso 2. Git

- **Qué es:** control de versiones, para clonar el repositorio y subir los cambios. Claude Code también usa su Git Bash.

```powershell
winget install --id Git.Git -e
```

Comprobar y configurar el autor de los commits (una sola vez por PC):

```powershell
git --version
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

- **Si ya está instalado:** solo revisa con `git config --global --list` que el autor sea el correcto.
- **Iniciar sesión en GitHub:** no hace falta ningún comando. La primera vez que hagas `git push`, Git abre el navegador (Git Credential Manager) para autorizar tu cuenta.

### Paso 3. Clonar el proyecto e instalar dependencias

```powershell
cd $HOME\Downloads
git clone https://github.com/Oscar-byte-c/Examen-1.git
cd Examen-1
git checkout feature/alineacion-adr-grupal
npm ci
```

- `npm ci` instala **exactamente** las versiones de `package-lock.json` y así se mantiene el SDK 57.
- No uses `npm install <paquete>`: para agregar dependencias usa `npx expo install <paquete>`.
- **Nunca** ejecutes `npm audit fix --force`, porque cambiaría la versión de Expo.
- Cambia de rama solo si el trabajo aún no está fusionado en `main` (compruébalo con `git branch -a`).

### Paso 4. Variables de entorno (no están en Git)

```powershell
Copy-Item .env.example .env
notepad .env
```

Completa en `.env`:

| Variable | De dónde sale |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase → proyecto **Examen-1** → Project Settings → API → *Project URL* (`https://lhehzeccskdknwmvnvgo.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | El mismo panel → *Publishable key* (pública por diseño; la seguridad la da RLS) |
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry → proyecto `react-native` → Client Keys (DSN) |
| `SENTRY_AUTH_TOKEN` (opcional) | Sentry → Auth Tokens. **Es secreto:** nunca con prefijo `EXPO_PUBLIC_` |

Para las pruebas de RLS, crea también `.env.test.local` con la clave común de los 3 usuarios de prueba (`provincial.prueba@example.com`, `recinto.prueba@example.com` y `veedor.prueba@example.com`):

```powershell
Set-Content -Encoding utf8 .env.test.local "PRUEBA_CLAVE_USUARIOS=ESCRIBE_AQUI_LA_CLAVE"
notepad .env.test.local
```

- `.env` y `.env*.local` están en `.gitignore`: **nunca** los subas.
- **Nunca** pongas la `service_role` ni una clave `sb_secret_…` en estos archivos: solo existen en las Edge Functions.

### Paso 5. Supabase CLI

- **Qué es:** la herramienta de línea de comandos de Supabase. Con ella aplicamos las migraciones, el seed y los despliegues de Edge Functions, y consultamos la base remota.
- **Instalación:** en este proyecto se usa con **`npx supabase`**, que descarga la CLI en el momento y no requiere instalación global. Así están escritos los scripts `db:push` y `functions:deploy`. **No** uses `npm install -g supabase`: no está soportado.

Comprobar:

```powershell
npx supabase --version
```

Iniciar sesión (abre el navegador y guarda un token de acceso en tu usuario de Windows):

```powershell
npx supabase login
```

Ver tus proyectos y vincular **Examen-1** (Project Reference `lhehzeccskdknwmvnvgo`):

```powershell
npx supabase projects list
npx supabase link --project-ref lhehzeccskdknwmvnvgo
```

> `wjyyauyrnrpnubkijqnh` es el **ID de la organización**, no del proyecto: no lo uses en `link`. `supabase link` puede pedir la **contraseña de la base de datos** (Project Settings → Database). Si no la recuerdas, restablécela en ese mismo panel.

Comprobar que quedó vinculado (todos estos comandos **solo leen**):

```powershell
Get-Content supabase\.temp\project-ref
npx supabase migration list --remote
npx supabase functions list
npx supabase secrets list
```

- `Get-Content` debe mostrar `lhehzeccskdknwmvnvgo`.
- `migration list` compara las migraciones locales con las remotas; ambas columnas deben coincidir.
- `functions list` debe mostrar `crear-usuario`, `cambiar-clave` y `solicitar-recuperacion`.
- `secrets list` muestra solo los nombres y resúmenes de los secretos, nunca sus valores.

**Consultar sin modificar nada:**

```powershell
npx supabase db push --remote --dry-run
npx supabase db query --remote --read-only "select count(*) from public.mesas"
npx supabase inspect db table-stats --remote
```

> **Importante (CLI 3.x):** los comandos de base de datos apuntan por defecto al stack **local** (Docker). Para el proyecto vinculado hay que agregar **`--remote`**; sin él verás `ECONNREFUSED 127.0.0.1:54322`, que no es un error del proyecto. La primera línea de la salida indica el destino (`Target: project Examen-1 (lhehzeccskdknwmvnvgo)`).

- `db push --remote --dry-run` muestra qué migraciones se aplicarían, sin aplicarlas.
- `db query --remote --read-only` ejecuta una consulta en modo de solo lectura.

**Comandos que SÍ modifican el proyecto remoto.** Ejecútalos solo a propósito, después de revisar el `--dry-run`:

```powershell
npm run db:push
npm run functions:deploy
```

- `db:push` aplica las migraciones pendientes y registra el seed.
- `functions:deploy` despliega las 3 Edge Functions.
- Si el seed ya estaba registrado, `db push --include-seed` no lo vuelve a ejecutar. Para forzarlo (el seed es idempotente): `npx supabase db query --remote -f supabase/seed.sql`.
- **Si ya estaba instalado y vinculado:** `Get-Content supabase\.temp\project-ref` muestra el ref y no hay que repetir `login` ni `link`. La vinculación vive en `supabase\.temp\`, que no se sube a Git, así que en una PC nueva **siempre** hay que repetirla.
- **Docker no es necesario:** no usamos `supabase start` (stack local), solo el proyecto remoto.

### Paso 6. Expo Go en el celular Android (SDK 57)

- **Qué es:** la app que ejecuta el proyecto en el teléfono durante el desarrollo, sin generar un APK.
- **Ojo:** la Play Store instala la versión del SDK 58, que **no** abre este proyecto. Instala Expo Go **SDK 57** desde el enlace oficial (ábrelo en el celular) o con Expo Orbit: `https://expo.dev/go?sdkVersion=57&platform=android&device=true`.
- La PC y el celular deben estar en la **misma red Wi-Fi**.

```powershell
npm run start:go
```

- Escanea el QR con Expo Go. Usa `start:go`: como `expo-dev-client` está instalado, `npm start` genera un QR para un *development build*.
- Si la red bloquea la conexión: `npx expo start --go --tunnel`.
- Si cambias `.env` o algo raro queda en caché: `npm run start:go -- --clear`.
- **Android SDK / Android Studio no son necesarios:** Expo Go no los usa y el APK se compila en la nube con EAS. Solo harían falta para `npm run android:native`, que no usamos.
- **La versión web no está soportada** (ver ADR-C02 §9): valida siempre en Android.

### Paso 7. Pruebas y verificaciones

```powershell
npm run typecheck
npm test
npm run lint
npx expo-doctor
npm run test:rls
```

| Comando | Qué hace |
|---|---|
| `npm run typecheck` | TypeScript sin errores |
| `npm test` | Pruebas unitarias del dominio (Jest) |
| `npm run lint` | ESLint (`expo lint`) |
| `npx expo-doctor` | Dependencias compatibles con el SDK 57 |
| `npm run test:rls` | Seguridad RLS contra Supabase. Necesita `.env` y `.env.test.local`. Solo usa los usuarios de prueba |

### Paso 8. EAS CLI (solo para generar el APK al final)

- **Qué es:** la CLI de Expo Application Services, que compila el APK en la nube (perfiles en `eas.json`).

```powershell
npm install --global eas-cli
eas --version
eas login
eas whoami
```

- **Sin instalación global:** puedes usar `npx eas-cli@latest` en lugar de `eas`.
- **Antes del APK:** crea en EAS las variables `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `EXPO_PUBLIC_SENTRY_DSN`, más `SENTRY_AUTH_TOKEN` como **secreto**. EAS no lee tu `.env` local.
- Luego: `npm run build:apk`, con el perfil `preview` y un APK instalable.

### Paso 9. Claude Code (mentor del proyecto)

- **Qué es:** el asistente de IA en la terminal con el que se desarrolló el examen. Lee `CLAUDE.md`, `AGENTS.md` y `.claude/` (reglas, agentes y skills).
- **Requisitos:** Windows 10 1809 o superior, una cuenta de Claude con plan Pro, Max, Team o Enterprise (el plan gratuito no incluye Claude Code) y Git for Windows (recomendado; Claude Code usa su Git Bash).

```powershell
irm https://claude.ai/install.ps1 | iex
```

Comprobar:

```powershell
claude --version
claude doctor
```

Iniciar sesión y abrir el proyecto (la primera vez abre el navegador para autenticarte):

```powershell
cd $HOME\Downloads\Examen-1
claude
```

- Acepta la confianza de la carpeta. Si después necesitas cambiar de cuenta, usa `/login` dentro de Claude Code.
- **Alternativa de instalación:** `winget install Anthropic.ClaudeCode` (no se actualiza sola; usa `winget upgrade Anthropic.ClaudeCode`).
- **Si ya está instalado:** actualiza con `claude update`.
- Plugin oficial de Expo, opcional, dentro de Claude Code: `/plugin install expo@claude-plugins-official`.
- Primer mensaje sugerido: *«Lee docs/CONTEXTO_PROYECTO.md y continuemos desde la tarea pendiente.»*
- La memoria y el historial de conversaciones de Claude **no viajan** con el repositorio. La fuente de verdad es `docs/CONTEXTO_PROYECTO.md`.

### Lista de pendientes para una PC nueva

**Instalar:** Node.js LTS (≥ 22.13), Git, Claude Code, Expo Go SDK 57 en el celular y, solo para el APK, EAS CLI.

**Conseguir y configurar a mano (no viajan con el repositorio):**

- [ ] Autor de Git (`git config --global user.name` y `user.email`) y autorizar GitHub en el primer `git push`.
- [ ] `.env`: URL y Publishable key de Supabase, y DSN de Sentry. Opcional: `SENTRY_AUTH_TOKEN`.
- [ ] `.env.test.local`: clave de los usuarios de prueba.
- [ ] `npx supabase login` y `npx supabase link --project-ref lhehzeccskdknwmvnvgo`, con la contraseña de la base de datos.
- [ ] Iniciar sesión en Claude Code (cuenta con plan de pago).
- [ ] `eas login` con la cuenta de Expo y variables o secretos en EAS (solo para el APK).
- [ ] Acceso a los paneles de Supabase (SMTP, Redirect URLs, secretos de funciones) y de Sentry con tu cuenta.
- [ ] Skill `.claude/skills/examen-1/`: solo viaja si se sube al repositorio; mientras no esté en un commit, cópiala a mano.

**No hace falta instalar por separado:**

- **npm**, que viene con Node.js.
- **Supabase CLI y Expo CLI**, que se ejecutan con `npx` desde el proyecto.
- **TypeScript, Jest y ESLint**, que llegan con `npm ci`.
- **Git Bash**, que viene con Git for Windows.
- **Docker, Android Studio y el Android SDK**: no se usan en este flujo (Expo Go y EAS en la nube).

## Documentación

- [docs/CONTEXTO_PROYECTO.md](docs/CONTEXTO_PROYECTO.md): estado, decisiones, pendientes y cómo configurar una computadora nueva.
- [docs/ADR_LINEA_BASE.md](docs/ADR_LINEA_BASE.md) y [docs/adr/](docs/adr/): decisiones de arquitectura.
- [docs/ESTRUCTURA_PROYECTO.md](docs/ESTRUCTURA_PROYECTO.md): estructura de carpetas, navegación y configuración.
- [docs/SISTEMA_DISENO.md](docs/SISTEMA_DISENO.md): colores, tipografía, espaciado y componentes base.
- [docs/plan/FASE3_AUTENTICACION.md](docs/plan/FASE3_AUTENTICACION.md): plan aprobado de la Fase 3.
