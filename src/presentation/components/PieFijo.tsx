import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTecladoVisible } from '@/presentation/hooks/useTecladoVisible';
import { colors, sizes, spacing } from '@/presentation/theme';

/**
 * Barra fija al pie de la pantalla (fuera del área que se desplaza): mantiene a la vista lo que
 * decide la acción principal, p. ej. la suma de votos junto al botón Guardar del acta.
 * Respeta el área segura inferior (barra de navegación de Android en modo borde a borde).
 *
 * `compacto` (asistente del acta): menos relleno y, con el teclado abierto, sin el margen del área
 * segura, porque el pie ya está apoyado sobre el teclado y la barra de gestos queda debajo de él.
 */
export function PieFijo({ children, compacto = false }: { children: ReactNode; compacto?: boolean }) {
  const insets = useSafeAreaInsets();
  const teclado = useTecladoVisible();
  const paddingBottom = !compacto
    ? Math.max(insets.bottom, spacing.sm) + spacing.xxs
    : teclado
      ? spacing.xs
      : Math.max(insets.bottom, spacing.xxs) + spacing.xxs;
  return (
    <View style={[styles.pie, compacto && styles.pieCompacto, { paddingBottom }]}>
      <View style={[styles.inner, compacto && styles.innerCompacto]}>{children}</View>
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
  pieCompacto: { paddingTop: spacing.xs },
  inner: { width: '100%', maxWidth: sizes.maxContentWidth, alignSelf: 'center', gap: spacing.sm },
  innerCompacto: { gap: spacing.xs },
});
