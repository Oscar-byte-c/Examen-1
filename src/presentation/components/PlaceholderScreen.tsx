import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/presentation/theme/colors';

type Props = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Pantalla provisional reutilizable mientras se implementan los módulos de cada rol. */
export function PlaceholderScreen({ title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  title: { fontSize: typography.title, fontWeight: '700', color: colors.primaryDark },
  description: { fontSize: typography.body, color: colors.textMuted },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: colors.surface, fontSize: typography.body, fontWeight: '600' },
});
