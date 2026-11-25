import type { ViewStyle } from 'react-native';

/** Escala de espaciado en múltiplos de 4. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Radios de borde coherentes para todos los componentes. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/**
 * Tamaños de control. Los objetivos táctiles superan el mínimo de 48 dp de Android
 * para facilitar el uso a personas con poca destreza en pantallas táctiles.
 */
export const sizes = {
  touchMin: 48,
  buttonMd: 52,
  buttonLg: 60,
  input: 56,
  iconSm: 20,
  iconMd: 24,
  iconLg: 32,
  iconXl: 48,
  maxContentWidth: 560,
  /** Sello de estado del acta y animaciones Lottie. */
  sello: 52,
  lottieSm: 40,
  lottieMd: 72,
  lottieLg: 112,
  /** Franja ocre del encabezado institucional. */
  franja: 3,
} as const;

/** Bordes. */
export const borders = {
  thin: 1,
  thick: 2,
} as const;

/** Elevaciones sutiles (estilo institucional, sin sombras exageradas). */
export const shadows = {
  none: {},
  // Una sola elevación mínima: la separación principal la da el borde fino (estilo documento).
  card: {
    elevation: 1,
    shadowColor: '#0F2E45', // azul marino profundo (paleta CNE)
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  /** Hoja elevada del asistente del acta: dos capas suaves (RN 0.86 `boxShadow`, sin dependencias). */
  hoja: {
    boxShadow: '0px 1px 2px rgba(21, 62, 92, 0.06), 0px 8px 24px rgba(21, 62, 92, 0.08)',
  },
  raised: {
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
} as const satisfies Record<string, ViewStyle>;
