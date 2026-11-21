import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, sizes, spacing, type ColorToken } from '@/presentation/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

export type AppCardProps = {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: ColorToken;
  /** Elemento a la derecha del encabezado (p. ej. un StatusBadge). */
  trailing?: ReactNode;
  /** Si se define, la tarjeta completa es pulsable y muestra un indicador ">". */
  onPress?: () => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Contenedor de información con encabezado opcional (ícono, título, subtítulo). */
export function AppCard({ title, subtitle, icon, iconColor = 'primary', trailing, onPress, children, style }: AppCardProps) {
  const hasHeader = Boolean(title || icon || trailing);

  const content = (
    <>
      {hasHeader ? (
        <View style={styles.header}>
          {icon ? (
            <View style={styles.iconWrap}>
              <AppIcon name={icon} size={sizes.iconMd} color={iconColor} />
            </View>
          ) : null}
          <View style={styles.headerText}>
            {title ? <AppText variant="subtitle">{title}</AppText> : null}
            {subtitle ? (
              <AppText variant="bodySmall" color="textSecondary">
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {trailing}
          {onPress ? <AppIcon name="chevron_right" color="textMuted" /> : null}
        </View>
      ) : null}
      {children ? <View style={hasHeader && styles.body}>{children}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[title, subtitle].filter(Boolean).join('. ')}
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.md,
    ...shadows.card,
  },
  pressed: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  body: { marginTop: spacing.md },
});
