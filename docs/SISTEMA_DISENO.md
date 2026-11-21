# Sistema de diseño – Control Electoral

**Fase:** 2 – Diseño visual base. **Ubicación:** `src/presentation/theme` y `src/presentation/components`.

Principios: **institucional, sobrio y accesible**. Pensado para usuarios adultos mayores o con poca experiencia: textos grandes, botones amplios, etiquetas siempre visibles, y estados que combinan color, ícono y texto. Sin animaciones decorativas.

---

## 1. Tokens (`src/presentation/theme`)

Se importan siempre desde `@/presentation/theme`. Ningún componente usa valores hexadecimales directos.

### Colores (`colors.ts`), paleta PROVISIONAL

| Rol | Token | Valor | Uso |
|---|---|---|---|
| Primario | `primary` / `primaryPressed` / `primarySoft` | #1E3A8A / #102A54 / #EEF2FF | Marca, botones principales, encabezados |
| Secundario | `secondary` | #0F766E | Acciones secundarias, acentos |
| Fondo | `background` / `surface` / `surfaceMuted` | #F5F7FA / #FFFFFF / #F3F4F6 | Pantalla, tarjetas, campos deshabilitados |
| Texto | `text` / `textSecondary` / `textMuted` | #111827 / #4B5563 / #6B7280 | Jerarquía de texto |
| Bordes | `border` / `divider` | #D1D5DB / #E5E7EB | Campos, tarjetas |
| Éxito | `success` / `successSoft` | #15803D / #DCFCE7 | Guardado, enviado |
| Advertencia | `warning` / `warningSoft` | #B45309 / #FEF3C7 | Pendiente, atención (p. ej. alerta de 500 m) |
| Error | `error` / `errorSoft` | #B91C1C / #FEE2E2 | Fallos, validaciones |
| Información | `info` / `infoSoft` | #1D4ED8 / #DBEAFE | En proceso, avisos |

**Contraste WCAG 2.1, calculado:** todas las combinaciones de texto cumplen AA (≥ 4.5:1). Por ejemplo, texto sobre superficie 17.7:1, blanco sobre primario 10.4:1, y los estados sobre su fondo suave entre 4.5 y 5.5:1.
**Para aplicar los colores oficiales** de la organización basta con editar el objeto `palette` en `colors.ts` y volver a verificar el contraste.

### Tipografía (`typography.ts`)

Fuente del sistema (Roboto en Android). Tamaño mínimo 14; el cuerpo de texto usa 18.

| Variante | Tamaño / peso | Uso |
|---|---|---|
| `display` | 30 / 700 | Marca en el login |
| `title` | 24 / 700 | Título de pantalla |
| `subtitle` | 20 / 600 | Título de tarjeta |
| `body` / `bodyStrong` | 18 / 400–600 | Texto general, campos |
| `bodySmall` | 16 / 400 | Descripciones |
| `label` | 16 / 600 | Etiquetas de campos y secciones |
| `button` | 18 / 700 | Botones |
| `caption` | 14 / 500 | Insignias, ayudas |

El escalado de fuente del sistema se respeta hasta ×1.4 (`MAX_FONT_SCALE`) para no romper la maquetación.

### Espaciado, radios y tamaños (`layout.ts`)

- **Espaciado** en múltiplos de 4: `xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48`.
- **Radios:** `sm 8 · md 12` (botones, campos) · `lg 16` (tarjetas) · `xl 24` (encabezado) · `pill` (insignias).
- **Tamaños táctiles:** mínimo 48 dp; botones de 52 dp (`md`) o 60 dp (`lg`); campos de 56 dp.
- **Sombras:** `card` y `raised`, sutiles (elevación 2–4 en Android).

---

## 2. Componentes (`src/presentation/components`)

Todos se exportan desde `@/presentation/components`, están tipados y no tienen lógica de negocio.

| Componente | Propósito | Props clave |
|---|---|---|
| `AppButton` | Botón grande con estado de carga | `label`, `variant` (primary · secondary · outline · ghost · danger), `size` (md · lg), `icon`, `loading`, `disabled` |
| `AppCard` | Tarjeta con encabezado opcional; puede ser pulsable | `title`, `subtitle`, `icon`, `trailing`, `onPress` |
| `AppInput` | Campo con etiqueta visible, ayuda y error con ícono | `label`, `icon`, `helperText`, `errorText`, `required`, `isPassword` (botón ver/ocultar) |
| `AppHeader` | Encabezado institucional de pantallas principales | `eyebrow` (rol), `title`, `subtitle`, `icon`, `action` (ícono + texto) |
| `LoadingIndicator` | Carga con mensaje explícito | `message`, `fullScreen` |
| `EmptyState` | Explica la ausencia de contenido y qué hacer | `icon`, `title`, `description`, `actionLabel` |
| `StatusBadge` | Estado con color + ícono + texto | `status` (pending · in_progress · success · warning · error · info · neutral), `label` |
| `AppText` *(soporte)* | Texto con la escala tipográfica | `variant`, `color`, `align` |
| `AppIcon` *(soporte)* | Ícono único de la app | `name` (Material Symbols), `size`, `color` |
| `ScreenContainer` *(soporte)* | Estructura de pantalla con área segura y scroll | `header`, `children` |

### Iconografía

Se usa `AppIcon`, construido sobre `expo-symbols`, que **ya venía en la plantilla**. En Android muestra **Material Symbols**, la iconografía nativa de la plataforma, y la fuente se incluye en el bundle. Los nombres se consultan en https://fonts.google.com/icons y TypeScript valida que existan.
Limitación: en iOS se necesitaría además el nombre del SF Symbol. No aplica, porque la app es solo para Android.

### Accesibilidad aplicada

- Roles y etiquetas accesibles (`accessibilityRole`, `accessibilityLabel`, `accessibilityState`) en todos los elementos interactivos.
- Los errores y estados nunca dependen solo del color: siempre llevan ícono y texto.
- La acción del encabezado ("Salir") muestra texto, no solo un ícono.
- Los mensajes de error y de carga se anuncian a los lectores de pantalla (`accessibilityLiveRegion`).

---

## 3. Navegación y pantallas de demostración

- Las pantallas de inicio de cada rol ocultan el header nativo y usan `AppHeader`. Las pantallas internas futuras usarán el header nativo con los colores de la marca (`presentation/navigation/roleStackOptions.ts`).
- **Login:** marca, formulario de correo y clave (solo estado local, sin autenticación) y, solo en desarrollo, una tarjeta para entrar como cada rol.
- **Veedor:** estado vacío de mesas y una leyenda de los estados de envío (pendiente, enviando, enviada, falló).
- **Coordinador de Recinto:** accesos a Veedores, Asignación de mesas y Actas, marcados como "Próximamente".
- **Coordinador Provincial:** avance del escrutinio en estado vacío y gestión del territorio, marcada como "Próximamente".
