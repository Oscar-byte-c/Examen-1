import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ROLE_LABELS, Role } from '@/domain/entities/Role';
import { useSession } from '@/presentation/navigation/SessionPreviewContext';
import { colors, spacing, typography } from '@/presentation/theme/colors';

/**
 * Pantalla de inicio de sesión (PROVISIONAL).
 * La autenticación con Supabase se implementa en la siguiente fase.
 * Los botones de vista previa solo existen en desarrollo (__DEV__) para probar la navegación por rol.
 */
export default function LoginScreen() {
  const { signInAs } = useSession();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Control Electoral</Text>
      <Text style={styles.subtitle}>Inicio de sesión — pendiente de implementar</Text>

      {__DEV__ ? (
        <View style={styles.devBox}>
          <Text style={styles.devTitle}>Vista previa de roles (solo desarrollo)</Text>
          {Object.values(Role).map((role) => (
            <Pressable
              key={role}
              accessibilityRole="button"
              onPress={() => signInAs(role)}
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
              <Text style={styles.buttonText}>{ROLE_LABELS[role]}</Text>
            </Pressable>
          ))}
        </View>
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
  subtitle: { fontSize: typography.body, color: colors.textMuted },
  devBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  devTitle: { fontSize: typography.caption, color: colors.textMuted },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonText: { color: colors.surface, fontSize: typography.body, fontWeight: '600' },
});
