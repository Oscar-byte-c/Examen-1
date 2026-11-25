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
  /** Rol del usuario: se muestra como una etiqueta discreta sobre el título. */
  eyebrow?: string;
  icon?: IconName;
  action?: HeaderAction;
};

/**
 * Encabezado institucional «Acta y sello» de las pantallas de inicio: compacto, fondo tinta y
 * una franja ocre de sello. El rol va como etiqueta en tipografía normal (sin mayúsculas
 * forzadas). Ningún texto se corta: un nombre largo ocupa más líneas. La acción («Salir»)
 * conserva su texto visible y un área táctil ≥ 48 dp. Respeta el área segura superior.
 */
export function AppHeader({ title, subtitle, eyebrow, icon, action }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View accessibilityRole="header">
      <StatusBar style="light" />
      <View style={[styles.container, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.row}>
          {icon ? (
            <View style={styles.iconWrap}>
              <AppIcon name={icon} size={sizes.iconMd} color="onPrimary" />
            </View>
          ) : null}
          <View style={styles.texts}>
            {eyebrow ? (
              <View style={styles.chip}>
                <AppText variant="caption" color="onPrimary">
                  {eyebrow}
                </AppText>
              </View>
            ) : null}
            <AppText variant="title" color="onPrimary">
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
              hitSlop={spacing.xxs}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
              <AppIcon name={action.icon} color="onPrimary" />
              <AppText variant="caption" color="onPrimary">
                {action.label}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.franja} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconWrap: {
    width: sizes.touchMin - spacing.xs,
    height: sizes.touchMin - spacing.xs,
    marginTop: spacing.xxs,
    borderRadius: radius.md,
    backgroundColor: colors.onPrimaryVeil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, minWidth: 0, gap: spacing.xxs },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.onPrimaryVeil,
  },
  subtitle: { opacity: 0.92 },
  action: {
    minWidth: sizes.touchMin + spacing.sm,
    minHeight: sizes.touchMin + spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.onPrimaryVeil,
  },
  actionPressed: { backgroundColor: colors.onPrimaryVeilPressed },
  /** Franja ocre del «sello»: decorativa, no transmite información. */
  franja: { height: sizes.franja, backgroundColor: colors.accent },
});
