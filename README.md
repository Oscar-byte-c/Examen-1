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

## Documentación

- [docs/CONTEXTO_PROYECTO.md](docs/CONTEXTO_PROYECTO.md): estado, decisiones, pendientes y cómo configurar una computadora nueva.
- [docs/ADR_LINEA_BASE.md](docs/ADR_LINEA_BASE.md) y [docs/adr/](docs/adr/): decisiones de arquitectura.
- [docs/ESTRUCTURA_PROYECTO.md](docs/ESTRUCTURA_PROYECTO.md): estructura de carpetas, navegación y configuración.
- [docs/SISTEMA_DISENO.md](docs/SISTEMA_DISENO.md): colores, tipografía, espaciado y componentes base.
- [docs/plan/FASE3_AUTENTICACION.md](docs/plan/FASE3_AUTENTICACION.md): plan aprobado de la Fase 3.
