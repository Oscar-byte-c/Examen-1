# Sistema de diseño – Control Electoral («Acta y sello»)

**Fase 4, primera etapa (24/11).** Ubicación: `src/presentation/theme` y `src/presentation/components`.

Concepto: la app es una **acta oficial**. Azul marino para la autoridad del documento, **azul CNE** como acento legible, **amarillo CNE** solo como detalle sobre fondos oscuros y fondos de papel (paleta con referencia CNE, §1.1). El elemento distintivo es el **sello de estado**; todo lo demás es sobrio. Pensado para personas mayores o con poca experiencia (RNF-07): textos grandes, botones de 52–60 dp, etiquetas siempre visibles y estados que combinan color, ícono y texto. Sin degradados, sin mayúsculas forzadas y sin animaciones decorativas.

---

## 1. Tokens (`src/presentation/theme`)

Siempre se importan desde `@/presentation/theme`. Ningún componente usa valores hexadecimales directos.

### 1.1 Identidad visual: colores institucionales del CNE como referencia (RNF-06)

**Decisión del estudiante (25/11/2026).** La app toma como **referencia visual** los colores institucionales del **Consejo Nacional Electoral (CNE) de Ecuador**. Es solo una referencia cromática: **no se usa el logotipo del CNE** ni ningún otro elemento de su marca, y la app **no es un producto oficial del CNE** (la usa una organización política ficticia, ADR-C02 §8). Reemplaza a la paleta propia «índigo y dorado» (24/11).

**Fuentes de los valores (exactos, no aproximados).** No se encontró un manual de marca del CNE publicado con códigos HEX, así que se tomaron de fuentes primarias oficiales:

| Fuente | Valores |
|---|---|
| Colores globales del tema del sitio oficial [cne.gob.ec](https://www.cne.gob.ec) (Elementor, consultado el 25/11/2026) | azul marino `#153E5C` · azul `#0061AB` · celeste `#61A1CE` · celeste claro `#D3EDFF` · amarillo `#FDD206` |
| Logotipo oficial publicado en ese sitio (píxeles exactos del PNG) | azul `#0D68B1` · amarillo `#FECC17` · rojo `#E62F23` |

El logo confirma la familia **azul + amarillo**; en la app se usan los valores del tema del sitio. El rojo del logo no se usa como identidad (el error conserva su rojo de estado).

| Elemento | Colores | Dónde se ve |
|---|---|---|
| **Institucional: azul marino** | `#153E5C` (presionado: `#0F2E45`, derivado NO oficial) | Encabezados, botón principal, banda de pasos del acta, cabeceras nativas |
| **Azul CNE** | `#0061AB` | Acento legible: paso en curso, «Paso N de 4», sello «Guardada», botón secundario, cifras destacadas, animaciones |
| **Celestes** | `#D3EDFF` (fondos suaves) · `#61A1CE` (solo bordes decorativos: 2.8:1) | Notas, tarjetas presionadas, fondos de sello |
| **Amarillo CNE** | `#FDD206` | **Solo sobre fondos oscuros o decorativo**: franja del encabezado, paso actual en la banda de pasos (sobre blanco da 1.5:1, ilegible) |
| Soporte: papel y neutros | `#F2F4F7` / `#FFFFFF` y grises | Sin cambios |
| Estados | éxito · aviso · error · información | Sin cambios (son colores funcionales, no identidad) |

Reglas: (1) todos los colores salen de `src/presentation/theme/colors.ts` (ningún hexadecimal en pantallas ni componentes); (2) las 6 animaciones Lottie usan los mismos valores (`scripts/lottie/generar.js`); (3) los colores de las **5 listas de la papeleta** (seed) son datos que solo identifican a cada lista.

### Colores (`colors.ts`) — paleta con referencia CNE

| Rol | Token | Valor | Uso |
|---|---|---|---|
| Azul marino | `primary` / `primaryPressed` / `primarySoft` / `primaryBorder` | #153E5C / #0F2E45 / #D3EDFF / #61A1CE | Encabezados, botón principal, paso completo |
| Azul CNE | `secondary` · `accent` · `indigo` | #0061AB | Acción secundaria, acento legible, cifras |
| Celeste claro | `accentSoft` · `tonal` · `secondarySoft` | #D3EDFF | Fondos suaves |
| Cabeceras oscuras | `noche` · `onNoche` · `onNocheMuted` · `oro` | #153E5C · #FFFFFF · #D3EDFF · #FDD206 | Banda de pasos del acta |
| Papel | `background` / `surface` / `surfaceMuted` | #F2F4F7 / #FFFFFF / #E8ECF2 | Fondo, hojas, campos (sin cambios) |
| Texto | `text` / `textSecondary` / `textMuted` | #1C2333 / #4A5468 / #5D677A | Jerarquía de texto (sin cambios) |
| Bordes | `border` / `borderStrong` / `divider` | #D3D9E2 / #7C8597 / #E3E7ED | Sin cambios |
| Estados | `success` · `warning` · `error` · `info` (+ `*Soft`) | #15803D · #B45309 · #B91C1C · #1D4ED8 | Sin cambios |

**Contraste WCAG 2.1, calculado el 25/11** (texto AA ≥ 4.5:1, UI ≥ 3:1): blanco/azul marino 11.2 · blanco/azul 6.4 · azul/blanco 6.4 · azul/papel 5.8 · azul/celeste claro 5.3 · azul marino/celeste claro 9.2 · amarillo/azul marino 7.7 · celeste claro/azul marino 9.2 · blanco/presionado 14.0. Textos y estados sin cambios (≥ 4.5). El celeste `#61A1CE` (2.8) solo se usa en bordes decorativos y el amarillo nunca como texto sobre fondo claro.
Si la referencia cambiara, se edita `palette` en `colors.ts`, se recalcula el contraste y se regeneran las animaciones (ver §4).

### Tipografía (`typography.ts`)

Roboto del sistema (sin fuentes descargadas). Tamaño mínimo 14, cuerpo 18. Variantes: `display 30` · `title 24` · `subtitle 20` · `body/bodyStrong 18` · `bodySmall/label 16` · `button 18` · `caption 14` · **`numeral 32`** y **`numeralSmall 18`** (cifras con `tabular-nums`: los números no «bailan» al cambiar).
El escalado de fuente del sistema se respeta hasta ×1.4 (`MAX_FONT_SCALE`). Única excepción: las etiquetas de `PasosActa` (×1.2), cada una con un tercio del ancho.

### Espaciado y tamaños (`layout.ts`)

Espaciado en múltiplos de 4 (`xxs 4` … `xxl 48`). Radios `sm 8 · md 12 · lg 16 · xl 24 · pill`. Táctil mínimo 48 dp, botones 52/60 dp, campos 56 dp. Tamaños de `sello 52` y de Lottie `40 / 72 / 112`. Sombra `card`: una sola elevación mínima, porque la separación la da el borde fino.

---

## 2. Componentes (`src/presentation/components`)

| Componente | Propósito |
|---|---|
| `AppHeader` | Encabezado compacto en azul marino con **franja amarilla** (CNE, decorativa); el rol como etiqueta en tipografía normal; título sin cortar; «Salir» con texto |
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
- Pantallas de inicio de cada rol: `AppHeader`. Pantallas internas: header nativo en azul marino, sin sombra (`roleStackOptions`).
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

## 5. Asistente de registro de actas «Noche de escrutinio» (Fase 4, 24/11)

Solo el registro de actas usa por ahora la dirección «Noche de escrutinio». El resto de la app sigue con «Acta y sello».
- **Tokens del asistente:** `noche`, `onNoche`, `onNocheMuted`, `oro` (solo sobre la noche), `indigo`, `tonal`, `ambar` / `ambarSoft`; sombra `shadows.hoja` (dos capas con `boxShadow` de RN 0.86). Desde el 25/11 toman los valores de la paleta CNE (§1.1): noche `#153E5C`, oro `#FDD206`, índigo `#0061AB`, tonal `#D3EDFF`.
- **Cabeceras oscuras, datos en hojas claras:** header nativo en noche + `PasosSegmentados`; formularios y cifras sobre blanco.
- **Pasos:** 1 Sufragantes (campo grande) · 2 Votos (`CampoNumero` por candidatura + `BalanceVotos` fijo al pie, en vivo) · 3 Evidencia (foto, nitidez, GPS y mapa de siempre; al corregir, primero la evidencia original) · 4 Revisar (cifras, resultados por candidatura, evidencia, advertencias con «Ir a corregir») → «Sellar y guardar acta» → animación `acta_sellada`.
- **Reglas intactas:** un solo `useForm` (los valores se conservan al cambiar de paso); «Siguiente» no guarda ni valida; sellar exige lo mismo que antes (Zod del dominio + foto legible + sin análisis en curso). Si Zod rechaza, `onInvalid` lleva al paso y al campo del primer error («La suma no cuadra» con un total válido → paso de votos). El balance y el mapeo de pasos (`screens/actas/asistente.ts`) son solo de presentación y tienen tests.
- **Teclado:** Atrás/Siguiente van en el pie dentro de `KeyboardAvoidingView`; la tecla «Siguiente» del teclado salta al próximo candidato.

## 6. Accesibilidad aplicada
- Roles y etiquetas accesibles en todo elemento interactivo; estados con texto, nunca solo color o movimiento.
- Errores y procesos anunciados (`accessibilityLiveRegion`); las animaciones se ocultan al lector de pantalla.
- «Reducir movimiento» respetado en Lottie, la sacudida, el botón y el esqueleto.
