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
  /** Elemento junto al título (p. ej. un StatusBadge). Si no cabe, baja a la línea siguiente. */
  trailing?: ReactNode;
  /** Si se define, la tarjeta completa es pulsable y muestra un indicador ">". */
  onPress?: () => void;
  /**
   * `tarjeta` (por defecto): hoja blanca con borde fino.
   * `seccion`: solo título y contenido, sin caja. Estructura la pantalla sin anidar tarjetas.
   */
  variante?: 'tarjeta' | 'seccion';
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Contenedor de información con encabezado opcional (ícono, título, subtítulo).
 * Ningún texto se corta: el título ocupa las líneas que necesite y el elemento de la derecha
 * pasa debajo cuando la pantalla es angosta o la fuente del sistema es grande.
 */
export function AppCard({
  title,
  subtitle,
  icon,
  iconColor = 'primary',
  trailing,
  onPress,
  variante = 'tarjeta',
  children,
  style,
}: AppCardProps) {
  const hasHeader = Boolean(title || icon || trailing);
  const seccion = variante === 'seccion';

  const content = (
    <>
      {hasHeader ? (
        <View style={styles.header}>
          {icon ? (
            <View style={[styles.iconWrap, seccion && styles.iconWrapSeccion]}>
              <AppIcon name={icon} size={sizes.iconMd} color={iconColor} />
            </View>
          ) : null}
          <View style={styles.headerMain}>
            <View style={styles.headerText}>
              {title ? <AppText variant="subtitle">{title}</AppText> : null}
              {subtitle ? (
                <AppText variant="bodySmall" color="textSecondary">
                  {subtitle}
                </AppText>
              ) : null}
            </View>
            {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
          </View>
          {onPress ? <AppIcon name="chevron_right" color="textMuted" style={styles.chevron} /> : null}
        </View>
      ) : null}
      {children ? <View style={hasHeader && styles.body}>{children}</View> : null}
    </>
  );

  const base = seccion ? styles.seccion : styles.card;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[title, subtitle].filter(Boolean).join('. ')}
        onPress={onPress}
        style={({ pressed }) => [base, pressed && styles.pressed, style]}>
        {content}
      </Pressable>
    );
  }

  return <View style={[base, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.card,
  },
  seccion: { paddingVertical: spacing.xs },
  pressed: { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  iconWrap: {
    width: sizes.touchMin - spacing.xs,
    height: sizes.touchMin - spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSeccion: { backgroundColor: 'transparent', width: sizes.iconLg, marginLeft: -spacing.xxs },
  // El título tiene un ancho base: si el elemento de la derecha no cabe a su lado, baja.
  headerMain: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.sm, rowGap: spacing.xs },
  headerText: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 0, gap: 2 },
  trailing: { flexShrink: 1, maxWidth: '100%' },
  chevron: { alignSelf: 'center' },
  body: { marginTop: spacing.md },
});
