---
paths:
  - "src/presentation/**"
  - "app/**"
---

# Capa presentation y rutas de Expo Router

- `app/**` (raíz del proyecto, **no** dentro de `src`) solo contiene rutas: un archivo de una línea que re-exporta la pantalla de `src/presentation/screens`, más los `_layout.tsx` con la navegación y los guards (`Stack.Protected`). Sin lógica ni UI. No uses `NavigationContainer`: Expo Router lo administra.
- Las pantallas no contienen reglas de negocio: llaman casos de uso mediante hooks, obtenidos desde `@/data/di/container`. Excepción aceptada: acciones puntuales sin caché de servidor (analizar la foto, pedir recuperación, ubicación actual) pueden llamar al caso de uso del `container` directamente. Datos de servidor con TanStack Query; estado local con Zustand en `presentation/store`.
- De `data` solo se importa `@/data/di/container`. Prohibido importar `@supabase/*`, `expo-sqlite`, repositorios o datasources.
- Usa siempre el sistema de diseño: tokens de `@/presentation/theme` y componentes de `@/presentation/components`. Nada de colores hexadecimales ni tamaños sueltos en las pantallas.
- Cada operación muestra su estado (en proceso, éxito, error o validación) con `StatusBadge`, `LoadingIndicator`, mensajes en línea o animaciones Lottie/Reanimated. **No uses `Alert.alert` ni modales genéricos** (lo exige la rúbrica).
- Accesibilidad: `accessibilityRole` y `accessibilityLabel` en elementos interactivos, objetivos táctiles de al menos 48 dp, y estados que no dependan solo del color.
- Ocultar un botón no es seguridad: la restricción real está en RLS.
