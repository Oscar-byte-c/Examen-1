import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/presentation/theme';

import { AppText } from './AppText';

export type LoadingIndicatorProps = {
  /** Mensaje que explica qué se está haciendo (p. ej. "Cargando tus mesas…"). */
  message?: string;
  /** Ocupa toda la pantalla y centra el contenido. */
  fullScreen?: boolean;
};

/** Indicador de carga con mensaje explícito: el usuario siempre sabe que algo está en proceso. */
export function LoadingIndicator({ message = 'Cargando…', fullScreen = false }: LoadingIndicatorProps) {
  return (
    <View
      style={[styles.container, fullScreen && styles.fullScreen]}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="bodySmall" color="textSecondary" align="center">
        {message}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  fullScreen: { flex: 1, backgroundColor: colors.background },
});
