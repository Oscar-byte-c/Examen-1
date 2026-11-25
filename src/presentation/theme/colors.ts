/**
 * Paleta «Acta y sello» (Fase 4). PROVISIONAL hasta que el equipo defina los colores
 * oficiales de la organización política (RNF-06).
 *
 * Idea: una acta oficial. Tinta para la autoridad del documento, ocre de sello como único
 * acento (con moderación) y fondos de papel. Sin degradados.
 *
 * Para cambiar la identidad visual basta con modificar `palette`: los componentes solo usan
 * los colores semánticos de `colors`, nunca valores hexadecimales directos. Las animaciones
 * Lottie usan los mismos valores (scripts/lottie/generar.js): si cambian, se regeneran.
 *
 * Contraste WCAG 2.1 calculado (texto normal AA ≥ 4.5:1; componentes de UI ≥ 3:1):
 *  - text / surface 15.7 · text / background 14.3 · textSecondary / surface 7.6 · textMuted / background 5.2
 *  - onPrimary / primary 13.9 · onSecondary / secondary 9.5 · onPrimary / error 6.5
 *  - accent / surface 5.9 · accent / accentSoft 5.0 · primary / primarySoft 11.6
 *  - success 4.6 · warning 4.5 · error 5.3 · info 5.5 (cada uno sobre su fondo suave)
 *  - disabledText / disabledBackground 5.4 · borderStrong / surface 3.7 (UI)
 *  - El ocre NO se usa como texto sobre tinta (2.4): allí solo es una franja decorativa.
 */
const palette = {
  tinta: '#1B2A57',
  tintaProfunda: '#111B3D',
  tintaMedia: '#34446F',
  tintaSuave: '#E8EBF4',
  tintaBorde: '#C5CCE0',

  ocre: '#8C5A0B',
  ocreSuave: '#F5EBDA',

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
} as const;

export const colors = {
  // Marca
  primary: palette.tinta,
  primaryPressed: palette.tintaProfunda,
  primarySoft: palette.tintaSuave,
  primaryBorder: palette.tintaBorde,
  onPrimary: palette.hoja,
  secondary: palette.tintaMedia,
  secondaryPressed: palette.tinta,
  secondarySoft: palette.tintaSuave,
  onSecondary: palette.hoja,
  /** Ocre de sello: acento escaso (paso actual, sello de estado, franja del encabezado). */
  accent: palette.ocre,
  accentSoft: palette.ocreSuave,

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

  overlay: 'rgba(17, 27, 61, 0.55)',
  /** Velo claro sobre la tinta (íconos y acciones del encabezado). */
  onPrimaryVeil: 'rgba(255, 255, 255, 0.14)',
  onPrimaryVeilPressed: 'rgba(255, 255, 255, 0.28)',
} as const;

export type ColorToken = keyof typeof colors;
