import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing, type ColorToken } from '@/presentation/theme';

type Props = {
  /** Fracción completada, de 0 a 1 (se recorta a ese rango). */
  valor: number;
  /** Texto para el lector de pantalla, p. ej. «12 de 20 mesas reportadas». */
  descripcion: string;
  color?: ColorToken;
};

/** Barra de avance horizontal (p. ej. mesas reportadas). Sin animación: el número es lo que importa. */
export function BarraProgreso({ valor, descripcion, color = 'primary' }: Props) {
  const v = Number.isFinite(valor) ? Math.min(1, Math.max(0, valor)) : 0;
  return (
    <View
      style={styles.fondo}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={descripcion}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}>
      <View style={[styles.relleno, { width: `${v * 100}%`, backgroundColor: colors[color] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { height: spacing.xs + 2, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: radius.pill },
});
