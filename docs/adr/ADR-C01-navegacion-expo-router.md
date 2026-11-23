# ADR-C01: Navegación por rol con Expo Router (sobre React Navigation)

| Dato | Detalle |
|---|---|
| Tipo | ADR complementario a la línea base (aclara cómo se implementa el acuerdo "React Navigation") |
| Estado | **Aceptado por el equipo** |
| Fecha | 2026-11-21 |
| Reemplaza | Nada. Precisa la implementación del acuerdo de navegación de la línea base |

## Requerimientos relacionados

- **Oscar:** RF-03 (cambio obligatorio de clave en el primer ingreso), RNF-01 (confidencialidad por rol y ámbito en el servidor), RNF-03 (usabilidad para adultos mayores) y la rúbrica: *"Navegación coherente e intuitiva entre pantallas y flujos claramente diferenciados por rol"* (1,4 pts).
- **Milka:** RF-07 (al iniciar sesión, cargar exclusivamente las pantallas y permisos del rol asignado), RNF-05 (la confidencialidad se aplica en BD/servidor, no solo ocultando pantallas) y RNF-06 (interfaz clara y guiada).

## Contexto

El acuerdo tecnológico del equipo indica **React Navigation**. El ADR-09 de Oscar propuso React Navigation con un navegador independiente por rol y descartó Expo Router porque *"la carpeta `app/` impone su estructura y choca con las capas de Clean Architecture"*. Milka no presentó un ADR de navegación, pero su RF-07 exige que cada rol cargue solo sus pantallas.

El proyecto se creó con la plantilla oficial de Expo SDK 58, que ya trae **Expo Router**, y luego se migró al **SDK 57** por requisito del proyecto (ver línea base 3.7). En ambas versiones (verificado en el bundle del SDK 57: 165 módulos de React Navigation dentro de `expo-router`, ninguno de `@react-navigation/*` externo), `expo-router` **incluye internamente React Navigation**: el paquete contiene sus módulos `core`, `native`, `native-stack`, `bottom-tabs`, `drawer` y `elements` (`node_modules/expo-router/build/react-navigation/`) y los expone en el punto de entrada `expo-router/react-navigation`. Por eso no aparece ningún paquete `@react-navigation/*` como dependencia separada. La guía oficial de migración a SDK 58 indica: *"Let Expo Router or `ExpoRoot` own the navigation container"*.

## Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **A. Expo Router** (rutas por archivos, `Stack.Protected` por rol) | Equipo (Fase 1) | Ya viene en la plantilla. Es la solución recomendada por Expo. Usa internamente React Navigation (mismo `Stack`, `Tabs`, opciones y temas). Guards declarativos con `Stack.Protected`. Deep linking incluido. Rutas tipadas. Un solo contenedor de navegación. | Impone la carpeta `app/` (raíz). Su API cambia entre versiones del SDK (hay que consultar la documentación de SDK 57). Las rutas se definen por archivos, lo que exige disciplina para no meter lógica en `app/` (raíz). |
| B. React Navigation "manual" (`NavigationContainer` + `createNativeStackNavigator` por rol) | Oscar (ADR-09) | Control explícito. Los navegadores condicionales por rol son fáciles de leer. No impone estructura de carpetas. | Habría que **quitar Expo Router** de la plantilla (y su `main`, plugin y config) o convivir con dos sistemas. Más código de configuración. El deep linking es manual. |
| C. Ambos a la vez (Expo Router + `NavigationContainer` propio) | — | Ninguna real. | **Duplica el sistema de navegación**: dos contenedores, rutas en conflicto. Lo desaconseja la documentación oficial. Descartada. |

## Decisión

**Se mantiene Expo Router como única implementación de navegación**, usando la infraestructura de React Navigation que incluye. No se agrega `NavigationContainer` ni paquetes `@react-navigation/*` sueltos, y no se migra a navegadores manuales.

## Justificación

1. **Cumple el acuerdo "React Navigation".** Los navegadores que se ejecutan son los de React Navigation (native-stack, bottom-tabs), integrados en Expo Router. Se mantiene la tecnología acordada; solo cambia la forma de declarar las rutas: archivos en lugar de JSX con `createNativeStackNavigator`.
2. **Cumple la intención del ADR-09 de Oscar.** Hay un navegador separado por rol (`app/veedor/_layout.tsx`, `coordinador-recinto/_layout.tsx` y `coordinador-provincial/_layout.tsx`) y las pantallas de otros roles no están disponibles (`Stack.Protected`).
3. **Responde a la objeción de Clean Architecture.** `app/` (raíz) contiene **solo** archivos de ruta de una línea que re-exportan pantallas de `src/presentation/screens`, además de los layouts. Las pantallas, componentes y la lógica viven en `presentation`, así que la estructura de carpetas de Expo Router no invade las capas.
4. **Cumple el RF-07 de Milka.** Con `Stack.Protected guard={role === ...}`, cada rol solo tiene accesibles sus pantallas.
5. **Menor riesgo con el plazo.** Migrar a la alternativa B implicaría reconfigurar la plantilla sin ningún beneficio funcional.

## Consecuencias

- ✅ Un solo sistema de navegación y un solo contenedor (de Expo Router).
- ✅ Los guards por rol son declarativos y legibles en un único archivo (`app/_layout.tsx`).
- ⚠️ **`Stack.Protected` solo protege la interfaz.** La documentación lo dice explícitamente: *"Protection is evaluated on the client only."* La autorización real se implementa con **RLS** y Edge Functions (RNF-01 de Oscar y RNF-05 de Milka).
- ⚠️ Antes de usar cualquier API de Expo Router hay que consultar la documentación **versionada de SDK 57**. Diferencias con SDK 58 que nos afectan: `redirectTo` en `Protected` **no existe** en SDK 57 (no lo usamos), y en SDK 57 una ruta cuyo guard falla se **retira** del árbol de navegación (en SDK 58 se convierte en redirección). Nuestro diseño no depende de esa diferencia: `app/index.tsx` redirige explícitamente según el rol.
- 📌 Regla del proyecto: en `app/` (raíz) no se escribe lógica ni UI; solo re-exports y layouts.

## Implementación actual (verificada)

| Ruta | Archivo | Acceso |
|---|---|---|
| `/` | `app/index.tsx` | Libre: `<Redirect>` al inicio del rol o a `/login` |
| `/login` | `app/login.tsx` | `guard={role === null}` |
| `/veedor` | `app/veedor/` (`_layout.tsx` + `index.tsx`) | `guard={role === VEEDOR}` |
| `/coordinador-recinto` | `app/coordinador-recinto/` | `guard={role === COORDINADOR_RECINTO}` |
| `/coordinador-provincial` | `app/coordinador-provincial/` | `guard={role === COORDINADOR_PROVINCIAL}` |

Las rutas de inicio de cada rol están centralizadas en `src/presentation/navigation/routes.ts` (`ROLE_HOME`). La sesión actual es **provisional** (`SessionPreviewContext`, solo en `__DEV__`).

## Consideraciones para la autenticación real

1. **Estado de carga de la sesión.** Al abrir la app, la sesión se restaura de forma asíncrona (Secure Store y Supabase). Si los guards se evalúan con `role = null` mientras se carga, el usuario verá el login un instante o será redirigido mal. Hace falta un estado `isLoading` y mantener el splash (`SplashScreen.preventAutoHideAsync()` / `hideAsync()`) hasta conocer la sesión.
2. **El rol debe venir de una fuente confiable.** Debe leerse de la tabla `perfiles` protegida por RLS (o de `app_metadata`). **Nunca de `user_metadata`**, porque en Supabase el propio usuario puede modificarlo y podría cambiarse de rol desde el cliente.
3. **Nuevos guards de flujo**, que van antes que los de rol:
   - `guard={sesion && debeCambiarClave}` → pantalla de cambio obligatorio de clave (RF-03 de Oscar y ADR-03 de Milka).
   - Los grupos de rol solo se habilitan con `!debeCambiarClave` (y con el correo verificado, si se exige).
   - Recuperación de clave por **enlace** (ADR-02 del documento grupal; ver ADR-C02 §3).
4. **Cierre de sesión completo.** Además de que el guard pase a `false` (Expo Router elimina ese historial), hay que limpiar la caché de TanStack Query, los stores de Zustand y los tokens de Secure Store. Así ningún dato del usuario anterior queda en memoria.
5. **Sesión expirada o revocada.** Si el refresh del token falla, la sesión pasa a `null` y los guards llevan al login. Lo que esté en la outbox offline **no debe perderse** al cerrar sesión: se sincroniza o se conserva asociado a su autor.
6. **Deep links.** El esquema `controlelectoral://` existe. Un enlace a una ruta protegida que no corresponde al rol no la abre (la redirige), pero eso no reemplaza la verificación en el servidor.
7. **Eliminar la vista previa de roles.** `SessionPreviewContext` y los botones `__DEV__` se reemplazan por el store de sesión (Zustand). Como las pantallas solo dependen de `useSession()`, se cambia la implementación sin tocar las rutas.
