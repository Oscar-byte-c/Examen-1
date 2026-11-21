import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, sizes, spacing } from '@/presentation/theme';

type Props = {
  /** Encabezado fijo opcional (p. ej. AppHeader), fuera del área desplazable. */
  header?: ReactNode;
  children: ReactNode;
};

/** Estructura común de pantalla: fondo, encabezado, contenido desplazable y área segura inferior. */
export function ScreenContainer({ header, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingTop: spacing.lg },
  inner: { width: '100%', maxWidth: sizes.maxContentWidth, alignSelf: 'center', gap: spacing.md },
});
