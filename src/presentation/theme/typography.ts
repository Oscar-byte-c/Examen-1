import type { TextStyle } from 'react-native';

/**
 * Escala tipográfica. Usa la fuente del sistema (Roboto en Android): máxima legibilidad
 * y sin dependencias adicionales.
 *
 * Tamaños ampliados respecto al estándar (cuerpo de 18 en lugar de 14–16) pensando en
 * usuarios adultos mayores o con poca experiencia (RNF-03). El tamaño mínimo es 14.
 */
export const typography = {
  display: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 18, lineHeight: 26, fontWeight: '400' },
  bodyStrong: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  bodySmall: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  button: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  /** Cifras y conteos: dígitos de ancho fijo para que los números no «bailen» al cambiar. */
  numeral: { fontSize: 32, lineHeight: 38, fontWeight: '700', fontVariant: ['tabular-nums'] },
  /** Números dentro de texto o filas (votos, sumas): mismo tamaño que el cuerpo, ancho fijo. */
  numeralSmall: { fontSize: 18, lineHeight: 26, fontWeight: '700', fontVariant: ['tabular-nums'] },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/**
 * Límite al escalado de fuente del sistema: respeta la preferencia del usuario
 * (accesibilidad) sin romper la maquetación.
 */
export const MAX_FONT_SCALE = 1.4;
