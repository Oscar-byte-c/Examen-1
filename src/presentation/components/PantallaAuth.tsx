import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, sizes, spacing } from '@/presentation/theme';

import { AppCard } from './AppCard';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

/** Estructura común de las pantallas de acceso (login, recuperación, cambio de clave). */
export function PantallaAuth({ titulo, children, pie }: { titulo: string; children: ReactNode; pie?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
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
          <AppCard>
            <View style={styles.form}>
              <AppText variant="subtitle">{titulo}</AppText>
              {children}
            </View>
          </AppCard>
          {pie}
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
});
