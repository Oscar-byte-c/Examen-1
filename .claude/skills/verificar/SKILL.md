---
name: verificar
description: Puerta de calidad del proyecto Control Electoral. Ejecuta typecheck, expo-doctor, generación del bundle Android y, si están configurados, lint y tests, e informa honestamente qué se verificó y qué no. Úsala antes de dar por terminada una tarea o fase, antes de un commit importante, o cuando el usuario pida verificar, comprobar o validar el proyecto.
allowed-tools: PowerShell(npx tsc --noEmit*), PowerShell(npx expo-doctor*), PowerShell(npm run lint*), PowerShell(npm test*), PowerShell(git status*)
---

# Verificar (puerta de calidad)

Ejecuta los pasos en orden, desde la raíz del proyecto. En Windows PowerShell 5.1, si `node` o `npx` no están en el PATH, antepón primero `$env:Path = "C:\Program Files\nodejs;" + $env:Path;`.

1. **Typecheck:** `npx tsc --noEmit`. Debe terminar con código 0.
2. **Dependencias y configuración:** `$env:CI="1"; npx expo-doctor`. Deben pasar todos los checks.
3. **Lint:** si `package.json` tiene `eslint` o un archivo de configuración `eslint.config.*`, ejecuta `npm run lint`. Si no está configurado, **dilo** y no lo instales sin autorización (`npx expo lint` agrega dependencias).
4. **Tests:** si existe un script `test` en `package.json`, ejecuta `npm test`. Si no existe, indícalo como pendiente.
5. **Bundle Android:** `$env:CI="1"; npx expo export --platform android --output-dir <scratchpad>/export-check`. Usa el directorio scratchpad de la sesión, nunca la carpeta del proyecto (no debe quedar `dist/` en el repo).
6. **Git:** `git status --short` para listar los cambios pendientes de commit.

## Cómo reportar
Usa una tabla `Verificación | Resultado`, con ✅, ❌ o "no aplica / no configurado".
- Si algo falla: muestra el error relevante (no todo el log), explica su causa en lenguaje simple y propón la corrección. No lo ocultes ni lo des por bueno.
- Termina siempre con: **"No probado en dispositivo/emulador"**, salvo que el usuario haya confirmado una prueba real.
- Si hay cambios sin commit y la verificación pasó, recomienda un commit con un mensaje sugerido.
