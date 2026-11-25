/**
 * IDENTIDAD VISUAL (RNF-06): COLORES INSTITUCIONALES DEL CNE COMO REFERENCIA VISUAL.
 * Decisión del estudiante (25/11/2026): la app toma como referencia los colores institucionales
 * del Consejo Nacional Electoral de Ecuador. Es solo una referencia cromática: la app NO usa el
 * logotipo del CNE ni es un producto oficial del CNE (la usa una organización política ficticia).
 *
 * Fuentes (valores exactos, no aproximados; no se encontró un manual de marca público con HEX):
 *  - Colores globales del tema del sitio oficial https://www.cne.gob.ec (Elementor, 25/11/2026):
 *    azul marino #153E5C · azul #0061AB · celeste #61A1CE · celeste claro #D3EDFF · amarillo #FDD206.
 *  - Logotipo oficial publicado en ese sitio (píxeles exactos): azul #0D68B1 · amarillo #FECC17 ·
 *    rojo #E62F23. Confirman la familia azul + amarillo; en la app se usan los valores del tema.
 *  - Derivado (NO oficial, solo para el estado «presionado»): #0F2E45 = azul marino al 75 %.
 *
 * Reglas: el AMARILLO solo va sobre fondos oscuros o como franja decorativa (sobre blanco da 1.5:1,
 * ilegible). Éxito, aviso, error e información conservan sus colores de estado (no son identidad).
 * Los colores de las 5 listas de la papeleta (supabase/seed.sql) son datos, no la identidad.
 *
 * Para cambiar la identidad visual basta con modificar `palette`: los componentes solo usan
 * los colores semánticos de `colors`, nunca valores hexadecimales directos. Las animaciones
 * Lottie usan los mismos valores (scripts/lottie/generar.js): si cambian, se regeneran.
 *
 * Contraste WCAG 2.1 calculado el 25/11 (texto normal AA ≥ 4.5:1; componentes de UI ≥ 3:1):
 *  - onPrimary / primary 11.2 · onSecondary / secondary 6.4 · onPrimary / primaryPressed 14.0
 *  - accent / surface 6.4 · accent / background 5.8 · accent / accentSoft 5.3 · primary / primarySoft 9.2
 *  - oro / noche 7.7 · onNocheMuted / noche 9.2 · onPrimary / indigo 6.4 · indigo / tonal 5.3
 *  - text / surface 15.7 · textSecondary / surface 7.6 · textMuted / background 5.2 (sin cambios)
 *  - success 4.6 · warning 4.5 · error 5.3 · info 5.5 (cada uno sobre su fondo suave, sin cambios)
 *  - primaryBorder (celeste) / surface 2.8: solo bordes DECORATIVOS (tarjeta presionada, estado vacío).
 */
const palette = {
  // CNE (tema oficial de cne.gob.ec)
  azulMarino: '#153E5C',
  azul: '#0061AB',
  celeste: '#61A1CE',
  celesteClaro: '#D3EDFF',
  amarillo: '#FDD206',
  // Derivado no oficial (estado presionado)
  azulMarinoProfundo: '#0F2E45',

  grafito: '#1C2333',
  pizarra: '#4A5468',
  tenue: '#5D677A',
  apagado: '#9AA2B1',
  lineaFuerte: '#7C8597',
  linea: '#D3D9E2',
  divisor: '#E3E7ED',
  papelGris: '#E8ECF2',
  papel: '#F2F4F7',
  hoja: '#FFFFFF',

  green700: '#15803D',
  green50: '#DCFCE7',
  amber700: '#B45309',
  amber50: '#FEF3C7',
  red800: '#991B1B',
  red700: '#B91C1C',
  red50: '#FEE2E2',
  blue700: '#1D4ED8',
  blue50: '#DBEAFE',
  grisDeshabilitado: '#525C6E',

  // Estados del asistente (sin cambios)
  ambar: '#A85A00',
  ambarSuave: '#FFF1D6',
} as const;

export const colors = {
  // Marca
  primary: palette.azulMarino,
  primaryPressed: palette.azulMarinoProfundo,
  primarySoft: palette.celesteClaro,
  primaryBorder: palette.celeste,
  onPrimary: palette.hoja,
  secondary: palette.azul,
  secondaryPressed: palette.azulMarino,
  secondarySoft: palette.celesteClaro,
  onSecondary: palette.hoja,
  /** Azul CNE: acento legible sobre fondos claros (paso actual, sello «Guardada»). */
  accent: palette.azul,
  accentSoft: palette.celesteClaro,

  // Superficies
  background: palette.papel,
  surface: palette.hoja,
  surfaceMuted: palette.papelGris,

  // Texto
  text: palette.grafito,
  textSecondary: palette.pizarra,
  textMuted: palette.tenue,
  textDisabled: palette.apagado,

  // Bordes
  border: palette.linea,
  borderStrong: palette.lineaFuerte,
  divider: palette.divisor,

  // Estados
  success: palette.green700,
  successSoft: palette.green50,
  warning: palette.amber700,
  warningSoft: palette.amber50,
  error: palette.red700,
  errorPressed: palette.red800,
  errorSoft: palette.red50,
  info: palette.blue700,
  infoSoft: palette.blue50,

  // Controles deshabilitados
  disabledBackground: palette.divisor,
  disabledText: palette.grisDeshabilitado,

  // Cabeceras oscuras del asistente del acta y acentos, con la paleta CNE.
  // Contraste: onNoche/noche 11.2 · onNocheMuted/noche 9.2 · oro/noche 7.7 · onPrimary/indigo 6.4
  // · indigo/tonal 5.3 · ambar/surface 5.1. El amarillo (oro) nunca va sobre fondo claro.
  noche: palette.azulMarino,
  nocheMedia: palette.azul,
  onNoche: palette.hoja,
  onNocheMuted: palette.celesteClaro,
  /** Amarillo CNE: SOLO sobre fondos oscuros o como franja decorativa. */
  oro: palette.amarillo,
  indigo: palette.azul,
  tonal: palette.celesteClaro,
  ambar: palette.ambar,
  ambarSoft: palette.ambarSuave,

  overlay: 'rgba(15, 46, 69, 0.55)', // azul marino profundo
  /** Velo claro sobre la tinta (íconos y acciones del encabezado). */
  onPrimaryVeil: 'rgba(255, 255, 255, 0.14)',
  onPrimaryVeilPressed: 'rgba(255, 255, 255, 0.28)',
} as const;

export type ColorToken = keyof typeof colors;
