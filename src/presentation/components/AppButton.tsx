import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radius, sizes, spacing, type ColorToken } from '@/presentation/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export type AppButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  /** Estilo de colocación (p. ej. `flex: 1` en una fila de botones). */
  style?: StyleProp<ViewStyle>;
};

type VariantStyle = { bg: ColorToken | 'transparent'; bgPressed: ColorToken | 'transparent'; fg: ColorToken; border?: ColorToken };

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  primary: { bg: 'primary', bgPressed: 'primaryPressed', fg: 'onPrimary' },
  secondary: { bg: 'secondary', bgPressed: 'secondaryPressed', fg: 'onSecondary' },
  outline: { bg: 'surface', bgPressed: 'primarySoft', fg: 'primary', border: 'primary' },
  ghost: { bg: 'transparent', bgPressed: 'primarySoft', fg: 'primary' },
  danger: { bg: 'error', bgPressed: 'errorPressed', fg: 'onPrimary' },
};

const resolve = (token: ColorToken | 'transparent') => (token === 'transparent' ? 'transparent' : colors[token]);

/** Respuesta al dedo: se encoge al presionar y vuelve al soltar (skill expo-animation). */
const PRESION = { escala: 0.97, entradaMs: 100, salidaMs: 150 };

/**
 * Botón principal de la app. Grande (52–60 dp), con texto claro, ícono opcional
 * y estado de carga integrado para que el usuario sepa que la acción está en proceso.
 *  - La etiqueta NUNCA se corta: si no cabe, el botón crece en alto (RNF-07, fuente grande).
 *  - Reanimated escala el botón en el hilo de la interfaz al presionar; con «reducir
 *    movimiento» no se anima (queda el cambio de color).
 */
export function AppButton({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  accessibilityHint,
  style,
}: AppButtonProps) {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;
  const fg: ColorToken = isDisabled ? 'disabledText' : v.fg;
  const reducirMovimiento = useReducedMotion();
  const escala = useSharedValue(1);
  const estiloEscala = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }));

  const iconNode = icon ? <AppIcon name={icon} size={sizes.iconMd} color={fg} /> : null;

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, estiloEscala, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={() => {
          if (!reducirMovimiento) escala.set(withTiming(PRESION.escala, { duration: PRESION.entradaMs }));
        }}
        onPressOut={() => escala.set(withTiming(1, { duration: PRESION.salidaMs }))}
        pressRetentionOffset={spacing.md}
        style={({ pressed }) => [
          styles.base,
          { minHeight: size === 'lg' ? sizes.buttonLg : sizes.buttonMd },
          {
            backgroundColor: isDisabled && variant !== 'ghost' ? colors.disabledBackground : resolve(pressed ? v.bgPressed : v.bg),
            borderColor: v.border ? (isDisabled ? colors.border : colors[v.border]) : 'transparent',
          },
        ]}>
        {loading ? (
          <ActivityIndicator color={colors[fg]} />
        ) : (
          <View style={styles.content}>
            {iconPosition === 'left' && iconNode}
            <AppText variant="button" color={fg} align="center" style={styles.label}>
              {label}
            </AppText>
            {iconPosition === 'right' && iconNode}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, maxWidth: '100%' },
  label: { flexShrink: 1 },
});
