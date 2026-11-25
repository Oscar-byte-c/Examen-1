import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, sizes, spacing } from '@/presentation/theme';

/**
 * Barra fija al pie de la pantalla (fuera del área que se desplaza): mantiene a la vista lo que
 * decide la acción principal, p. ej. la suma de votos junto al botón Guardar del acta.
 * Respeta el área segura inferior (barra de navegación de Android en modo borde a borde).
 */
export function PieFijo({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.pie, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xxs }]}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  pie: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  inner: { width: '100%', maxWidth: sizes.maxContentWidth, alignSelf: 'center', gap: spacing.sm },
});
