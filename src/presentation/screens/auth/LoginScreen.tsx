import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ROLE_LABELS, Role } from '@/domain/entities/Role';
import { AppButton, AppCard, AppIcon, AppInput, AppText, StatusBadge, type IconName } from '@/presentation/components';
import { useSession } from '@/presentation/navigation/SessionPreviewContext';
import { colors, radius, sizes, spacing } from '@/presentation/theme';

const ROLE_ICONS: Record<Role, IconName> = {
  [Role.COORDINADOR_PROVINCIAL]: 'map',
  [Role.COORDINADOR_RECINTO]: 'apartment',
  [Role.VEEDOR]: 'how_to_vote',
};

/**
 * Pantalla de inicio de sesión — DEMOSTRACIÓN VISUAL.
 * Los campos solo guardan estado local; la autenticación con Supabase se implementa en la fase siguiente.
 * La vista previa de roles solo existe en desarrollo (__DEV__) para probar la navegación por rol.
 */
export default function LoginScreen() {
  const { signInAs } = useSession();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showNotice, setShowNotice] = useState(false);

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          {/* Marca */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <AppIcon name="how_to_vote" size={44} color="onPrimary" />
            </View>
            <AppText variant="display" align="center" color="primary">
              Control Electoral
            </AppText>
            <AppText variant="body" align="center" color="textSecondary">
              Registro y seguimiento del escrutinio
            </AppText>
          </View>

          {/* Formulario */}
          <AppCard>
            <View style={styles.form}>
              <AppText variant="subtitle">Ingresa a tu cuenta</AppText>
              <AppInput
                label="Correo electrónico"
                icon="mail"
                placeholder="nombre@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
              <AppInput
                label="Clave"
                icon="lock"
                placeholder="Tu clave"
                isPassword
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />

              {showNotice ? (
                <StatusBadge status="info" label="El inicio de sesión se habilitará en la siguiente fase" />
              ) : null}

              <AppButton label="Ingresar" icon="arrow_forward" iconPosition="right" onPress={() => setShowNotice(true)} />
              <AppButton label="¿Olvidaste tu clave?" variant="ghost" size="md" onPress={() => setShowNotice(true)} />
            </View>
          </AppCard>

          <View style={styles.notice}>
            <AppIcon name="verified_user" size={sizes.iconSm} color="textSecondary" />
            <AppText variant="caption" color="textSecondary" style={styles.noticeText}>
              Tu cuenta la crea tu coordinador. Si no tienes acceso, comunícate con él.
            </AppText>
          </View>

          {__DEV__ ? (
            <AppCard
              title="Vista previa de roles"
              subtitle="Solo en desarrollo: entra sin autenticación para revisar cada flujo."
              icon="supervisor_account"
              iconColor="secondary">
              <View style={styles.devButtons}>
                {Object.values(Role).map((role) => (
                  <AppButton
                    key={role}
                    label={ROLE_LABELS[role]}
                    icon={ROLE_ICONS[role]}
                    variant="outline"
                    size="md"
                    onPress={() => signInAs(role)}
                  />
                ))}
              </View>
            </AppCard>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.md },
  inner: { width: '100%', maxWidth: sizes.maxContentWidth, alignSelf: 'center', gap: spacing.lg },
  brand: { alignItems: 'center', gap: spacing.xs },
  logo: {
    width: 84,
    height: 84,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  form: { gap: spacing.md },
  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs },
  noticeText: { flex: 1 },
  devButtons: { gap: spacing.sm },
});
