/**
 * Paleta de la organización política.
 * Valores provisionales: reemplazar por los colores oficiales de la organización (RNF-10).
 */
export const colors = {
  primary: '#1B4F9C',
  primaryDark: '#123A75',
  secondary: '#F2B705',
  background: '#F6F7FB',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textMuted: '#5B6070',
  success: '#2E7D32',
  warning: '#ED6C02',
  error: '#C62828',
  border: '#D9DCE3',
} as const;

/** Escala tipográfica ampliada pensando en usuarios adultos mayores (RNF-03). */
export const typography = {
  title: 26,
  subtitle: 20,
  body: 18,
  caption: 15,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
