# Sistema de diseño – Control Electoral («Acta y sello»)

**Fase 4, primera etapa (24/11).** Ubicación: `src/presentation/theme` y `src/presentation/components`.

Concepto: la app es una **acta oficial**. Tinta para la autoridad del documento, **ocre de sello** como único acento y fondos de papel. El elemento distintivo es el **sello de estado**; todo lo demás es sobrio. Pensado para personas mayores o con poca experiencia (RNF-07): textos grandes, botones de 52–60 dp, etiquetas siempre visibles y estados que combinan color, ícono y texto. Sin degradados, sin mayúsculas forzadas y sin animaciones decorativas.

---

## 1. Tokens (`src/presentation/theme`)

Siempre se importan desde `@/presentation/theme`. Ningún componente usa valores hexadecimales directos.

### Colores (`colors.ts`), paleta PROVISIONAL (RNF-06)

| Rol | Token | Valor | Uso |
|---|---|---|---|
| Tinta | `primary` / `primaryPressed` / `primarySoft` | #1B2A57 / #111B3D / #E8EBF4 | Encabezados, botón principal, paso completo |
| Tinta media | `secondary` | #34446F | Acción secundaria (p. ej. «Cancelar» en la cámara) |
| Ocre de sello | `accent` / `accentSoft` | #8C5A0B / #F5EBDA | **Escaso**: franja del encabezado, paso en curso, sello «Guardada» |
| Papel | `background` / `surface` / `surfaceMuted` | #F2F4F7 / #FFFFFF / #E8ECF2 | Fondo, hojas, campos de datos |
| Texto | `text` / `textSecondary` / `textMuted` | #1C2333 / #4A5468 / #5D677A | Jerarquía de texto |
| Bordes | `border` / `borderStrong` / `divider` | #D3D9E2 / #7C8597 / #E3E7ED | Hojas, campos, separadores |
| Estados | `success` · `warning` · `error` · `info` (+ `*Soft`) | #15803D · #B45309 · #B91C1C · #1D4ED8 | Enviado, pendiente/alerta, fallo, en proceso |

**Contraste WCAG 2.1, calculado** (script en la sesión del 24/11): todo texto ≥ 4.5:1. Por ejemplo, texto/superficie 15.7, blanco/tinta 13.9, ocre/superficie 5.9 y estados sobre su fondo suave 4.5–5.5. Borde fuerte/superficie 3.7 (≥ 3:1 para la UI). **El ocre no se usa como texto sobre la tinta (2.4)**: ahí solo es la franja decorativa.
Para aplicar los colores oficiales se edita `palette` en `colors.ts`, se recalcula el contraste y se regeneran las animaciones (ver §4).

### Tipografía (`typography.ts`)

Roboto del sistema (sin fuentes descargadas). Tamaño mínimo 14, cuerpo 18. Variantes: `display 30` · `title 24` · `subtitle 20` · `body/bodyStrong 18` · `bodySmall/label 16` · `button 18` · `caption 14` · **`numeral 32`** y **`numeralSmall 18`** (cifras con `tabular-nums`: los números no «bailan» al cambiar).
El escalado de fuente del sistema se respeta hasta ×1.4 (`MAX_FONT_SCALE`). Única excepción: las etiquetas de `PasosActa` (×1.2), cada una con un tercio del ancho.

### Espaciado y tamaños (`layout.ts`)

Espaciado en múltiplos de 4 (`xxs 4` … `xxl 48`). Radios `sm 8 · md 12 · lg 16 · xl 24 · pill`. Táctil mínimo 48 dp, botones 52/60 dp, campos 56 dp. Tamaños de `sello 52` y de Lottie `40 / 72 / 112`. Sombra `card`: una sola elevación mínima, porque la separación la da el borde fino.

---

## 2. Componentes (`src/presentation/components`)

| Componente | Propósito |
|---|---|
| `AppHeader` | Encabezado compacto en tinta con **franja ocre**; el rol como etiqueta en tipografía normal; título sin cortar; «Salir» con texto |
| `AppCard` | `variante="tarjeta"` (hoja con borde) o `"seccion"` (título sin caja, para no anidar tarjetas). El elemento de la derecha baja si no cabe |
| `AppButton` | 52–60 dp; **escala 0.97 al presionar** (Reanimated, hilo de UI); la etiqueta nunca se corta (el botón crece en alto) |
| `AppInput` / `CampoTexto` | Etiqueta visible, ayuda y error con ícono; **`sacudir`**: sacudida horizontal (Reanimated) cuando el servidor rechaza la clave |
| `SelloEstado` | **Sello de estado** de doble borde con ícono y texto (Sin registrar · Guardada · Enviando · Enviada · Falló · En revisión) |
| `PasosActa` | Pasos del acta: Resultados → Foto → Guardar (numerados porque es una secuencia) |
| `PieFijo` | Barra al pie, fuera del scroll (suma de votos junto a Guardar) |
| `ScreenContainer` | Fondo, encabezado, scroll, `pie`, **evitar el teclado** (`KeyboardAvoidingView` con la posición real del contenedor) y deslizar para actualizar |
| `Retroalimentacion` | Resultado o proceso en línea (sin modales), con animación Lottie opcional |
| `AnimacionLottie` | Reproduce las animaciones del proyecto: decorativas para el lector de pantalla, sin capturar toques, con «reducir movimiento» |
| `Esqueleto` | Carga de listas con pulso de opacidad (Reanimated); quieto con «reducir movimiento» |
| `CifraClave` · `BarraProgreso` | Cifras y avance del tablero (preparados para la segunda etapa) |
| `BarraConexion` | **Único** aviso de conexión y envío, con la animación de sincronización |
| `EmptyState` · `LoadingIndicator` · `StatusBadge` · `OpcionLista` · `UbicacionEvidencia` · `MapaOSM` · `CamaraActa` | Estados vacíos, carga, insignias, filas, evidencia, mapa y cámara |

**Iconografía:** `AppIcon` sobre `expo-symbols` (Material Symbols en Android). TypeScript valida los nombres.

### Textos y desbordamientos (regla)
- Nada se trunca: no hay `numberOfLines` ni `ellipsize` en la app. Nombres de recintos, mesas, candidatos y mensajes ocupan las líneas que necesiten.
- En filas horizontales, el texto lleva `flexShrink: 1` / `minWidth: 0`, y los elementos secundarios (insignias, valores) pasan a la línea siguiente con `flexWrap` y un `flexBasis` mínimo para el texto principal.
- Los botones crecen en alto y mantienen su mínimo táctil.

---

## 3. Navegación
- Pantallas de inicio de cada rol: `AppHeader`. Pantallas internas: header nativo en tinta, sin sombra (`roleStackOptions`).
- Transiciones nativas: `slide_from_right` en las pantallas internas y `fade` al pasar entre la autenticación y el panel del rol.

---

## 4. Animaciones Lottie (RNF-06)

Obra original del proyecto: diseñadas en **LottieFiles Creator** (motor de composición; la cuenta y el espacio de trabajo no estaban disponibles) y generadas con **`scripts/lottie/generar.js`** usando los colores de la paleta. Regenerar: `node scripts/lottie/generar.js assets/animaciones`. Se reproducen con `lottie-react-native ~7.3.8` (incluido en Expo Go SDK 57). Solo usan capas de forma, rectángulo, elipse, trazado, relleno, trazo (punteado), recorte de trazo y transformaciones.

| JSON | Dónde | Cuándo | Duración |
|---|---|---|---|
| `emblema_login.json` | Login, recuperación y cambio de clave | Al abrir la pantalla | 1.8 s · una vez |
| `gps_buscando.json` | Acta | Tras la foto, mientras se busca el GPS | 2.0 s · bucle |
| `gps_ubicado.json` | Acta | Foto legible y ubicación registrada | 1.4 s · una vez |
| `acta_sellada.json` | Acta | Acta guardada en el celular | 1.8 s · una vez |
| `sincronizando.json` | Aviso de conexión (inicio del veedor, acta) | Envío en curso | 1.6 s · bucle |
| `conflicto_resuelto.json` | Conflictos (**segunda etapa**) | Conflicto resuelto | 1.7 s · una vez |
| `exito.json` / `error.json` | `Retroalimentacion` | Resultados genéricos | 1.5 s · una vez |

Con **«reducir movimiento»** activado, las de una vez se muestran en su estado final y las de bucle, quietas. El estado siempre lo dice un texto al lado.

---

## 5. Accesibilidad aplicada
- Roles y etiquetas accesibles en todo elemento interactivo; estados con texto, nunca solo color o movimiento.
- Errores y procesos anunciados (`accessibilityLiveRegion`); las animaciones se ocultan al lector de pantalla.
- «Reducir movimiento» respetado en Lottie, la sacudida, el botón y el esqueleto.
