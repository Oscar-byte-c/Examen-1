/**
 * Paleta de colores — PROVISIONAL (institucional y neutral) hasta que el equipo
 * defina los colores oficiales de la organización política (RNF-10).
 *
 * Para cambiar la identidad visual basta con modificar `palette`: los componentes
 * solo usan los colores semánticos de `colors`, nunca valores hexadecimales directos.
 *
 * Contraste WCAG 2.1 calculado (mínimo AA para texto normal: 4.5:1):
 *  - text / surface: 17.7   - textSecondary / surface: 7.6   - textMuted / surface: 4.8 (background: 4.5)
 *  - onPrimary / primary: 10.4   - onSecondary / secondary: 5.5   - onPrimary / error: 6.5
 *  - success 4.6 · warning 4.5 · error 5.3 · info 5.5 (cada uno sobre su fondo suave)
 *  - disabledText / disabledBackground: 6.1
 */
const palette = {
  navy900: '#102A54',
  navy700: '#1E3A8A',
  navy600: '#2546A8',
  navy100: '#E0E7FF',
  navy50: '#EEF2FF',

  teal700: '#0F766E',
  teal600: '#0D9488',
  teal50: '#E6F6F4',

  gray900: '#111827',
  gray700: '#374151',
  gray600: '#4B5563',
  gray500: '#6B7280',
  gray400: '#9CA3AF',
  gray300: '#D1D5DB',
  gray200: '#E5E7EB',
  gray100: '#F3F4F6',
  gray50: '#F5F7FA',
  white: '#FFFFFF',

  green700: '#15803D',
  green50: '#DCFCE7',
  amber700: '#B45309',
  amber50: '#FEF3C7',
  red800: '#991B1B',
  red700: '#B91C1C',
  red50: '#FEE2E2',
  blue700: '#1D4ED8',
  blue50: '#DBEAFE',
} as const;

export const colors = {
  // Marca
  primary: palette.navy700,
  primaryPressed: palette.navy900,
  primarySoft: palette.navy50,
  primaryBorder: palette.navy100,
  onPrimary: palette.white,
  secondary: palette.teal700,
  secondaryPressed: palette.teal600,
  secondarySoft: palette.teal50,
  onSecondary: palette.white,

  // Superficies
  background: palette.gray50,
  surface: palette.white,
  surfaceMuted: palette.gray100,

  // Texto
  text: palette.gray900,
  textSecondary: palette.gray600,
  textMuted: palette.gray500,
  textDisabled: palette.gray400,

  // Bordes
  border: palette.gray300,
  borderStrong: palette.gray500,
  divider: palette.gray200,

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
  disabledBackground: palette.gray200,
  disabledText: palette.gray600,

  overlay: 'rgba(17, 24, 39, 0.45)',
} as const;

export type ColorToken = keyof typeof colors;
