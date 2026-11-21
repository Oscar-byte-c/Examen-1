import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, sizes, spacing } from '@/presentation/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

export type HeaderAction = {
  icon: IconName;
  /** Texto visible bajo el ícono y etiqueta para lectores de pantalla. */
  label: string;
  onPress: () => void;
};

export type AppHeaderProps = {
  title: string;
  subtitle?: string;
  /** Texto pequeño sobre el título (p. ej. el rol del usuario). */
  eyebrow?: string;
  icon?: IconName;
  action?: HeaderAction;
};

/**
 * Encabezado institucional de las pantallas principales: banda de color primario,
 * rol del usuario, título y una acción visible con texto (no solo ícono).
 * Respeta el área segura superior (Android edge-to-edge).
 */
export function AppHeader({ title, subtitle, eyebrow, icon, action }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]} accessibilityRole="header">
      <StatusBar style="light" />
      <View style={styles.row}>
        {icon ? (
          <View style={styles.iconWrap}>
            <AppIcon name={icon} size={sizes.iconLg} color="onPrimary" />
          </View>
        ) : null}

        <View style={styles.texts}>
          {eyebrow ? (
            <AppText variant="caption" color="onPrimary" style={styles.eyebrow}>
              {eyebrow.toUpperCase()}
            </AppText>
          ) : null}
          <AppText variant="title" color="onPrimary" numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodySmall" color="onPrimary" style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={action.onPress}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
            <AppIcon name={action.icon} color="onPrimary" />
            <AppText variant="caption" color="onPrimary">
              {action.label}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  eyebrow: { letterSpacing: 1, opacity: 0.9 },
  subtitle: { opacity: 0.92 },
  action: {
    minWidth: 64,
    minHeight: 56,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  actionPressed: { backgroundColor: 'rgba(255,255,255,0.28)' },
});
