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
} as const;

/** Bordes. */
export const borders = {
  thin: 1,
  thick: 2,
} as const;

/** Elevaciones sutiles (estilo institucional, sin sombras exageradas). */
export const shadows = {
  none: {},
  card: {
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  raised: {
    elevation: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
} as const satisfies Record<string, ViewStyle>;
