import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, sizes, spacing } from '@/presentation/theme';

import { AnimacionLottie } from './AnimacionLottie';
import { AppCard } from './AppCard';
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
            {/* Emblema «Acta y sello» (Lottie, una vez al entrar). Decorativo: el nombre lo dice el texto. */}
            <AnimacionLottie nombre="emblemaLogin" tamano={sizes.lottieLg} />
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
  form: { gap: spacing.md },
});
