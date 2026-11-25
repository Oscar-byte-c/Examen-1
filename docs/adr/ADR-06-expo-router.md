# ADR-06: Expo Router para la navegación basada en archivos

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha ADR-06 |
| Requerimientos relacionados | RF-01, RF-02, RF-18, RNF-05, RNF-07 |
| Minuto del video | No registrado en el documento grupal |
| Complemento | `docs/adr/ADR-C01-navegacion-expo-router.md` |

## 1. Contexto y problema

La aplicación tiene tres perfiles con permisos y pantallas distintas, un flujo **obligatorio** de cambio de contraseña en el primer ingreso y pantallas de registro o corrección de actas por mesa. Muchos usuarios son personas mayores o con poca experiencia, por lo que la navegación debe ser **predecible** y responder bien al **botón atrás de Android**.

## 2. Decisión

Se elige **Expo Router**, con **grupos de rutas separados por rol**. La redirección inicial se controla con tres datos:

1. si existe una **sesión**;
2. cuál es el **rol activo**;
3. si el usuario ya **cambió su clave temporal**.

Si alguno falla, la app lleva al usuario a la pantalla correspondiente en lugar de dejarlo en una pantalla sin salida.

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **Expo Router** ✅ | Kevin Amagua | Incluido en la plantilla de Expo, sin dependencias externas. Estructura las pantallas por grupos (auth, provincial, recinto, veedor) y facilita redirigir según rol o cambio de clave | Obliga a una convención fija: todo archivo dentro de `app/` es una ruta, así que `domain/`, `data/` y los componentes deben vivir fuera |
| React Navigation configurado manualmente | Kevin Amagua | Control explícito de cada *stack* o *tab navigator* en TypeScript | Hay que instalar y configurar varios paquetes que Expo ya resuelve; las rutas son menos visibles en la estructura de carpetas |

## 4. Justificación

- Aprovecha la navegación incluida en Expo, sin librerías extra.
- La separación de rutas por rol hace que **cada usuario solo llegue a sus pantallas**, y la redirección por estado evita pantallas sin salida para usuarios inexpertos.

## 5. Consecuencias

**Positivas**
- Separación clara de pantallas por rol, sin dependencias adicionales.

**Negativas / obligaciones**
- Todo el código de Clean Architecture (`domain/`, `data/` y los componentes reutilizables) debe estar **fuera de `app/`** para que Expo Router no lo interprete como rutas.

## 6. Relación con el examen

- **Rúbrica:** «Navegación coherente e intuitiva entre pantallas y flujos claramente diferenciados por rol» (1,4 pts) y «Organización del código en capas» (1,2 pts).

## 7. Evidencia de implementación

| Qué | Dónde |
|---|---|
| Guards en el orden sesión → clave temporal → rol | `app/_layout.tsx` (`Stack.Protected`) |
| Grupos por rol | `app/coordinador-provincial/`, `app/coordinador-recinto/`, `app/veedor/` |
| Flujos de autenticación | `app/login.tsx`, `app/cambiar-clave.tsx`, `app/recuperar-clave.tsx`, `app/restablecer-clave.tsx`, `app/correo-verificado.tsx` |
| Código de capas fuera de `app/` | `src/domain`, `src/data`, `src/presentation`; cada ruta re-exporta su pantalla en una línea |

**Aclaración registrada:** Expo Router usa React Navigation internamente; no se instaló un segundo sistema (`ADR_LINEA_BASE.md` §4.1, `ADR-C01`). Sin diferencias con lo acordado.
