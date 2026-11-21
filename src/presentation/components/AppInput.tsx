import { useState, type ComponentProps, type ComponentRef, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, MAX_FONT_SCALE, radius, sizes, spacing, typography } from '@/presentation/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

/**
 * `ref` se declara explícitamente: React 19 lo acepta como prop (sin forwardRef), pero
 * los tipos de TextInput en RN 0.86 (SDK 57) no lo incluyen en sus props.
 */
export type AppInputProps = Omit<ComponentProps<typeof TextInput>, 'style' | 'placeholderTextColor' | 'ref'> & {
  ref?: Ref<ComponentRef<typeof TextInput>>;
  label: string;
  icon?: IconName;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  /** Muestra un botón para ver/ocultar el texto (para claves). */
  isPassword?: boolean;
};

/**
 * Campo de texto con etiqueta visible siempre (no solo placeholder), mensaje de ayuda
 * y mensaje de error con ícono: el error no depende únicamente del color.
 */
export function AppInput({
  ref,
  label,
  icon,
  helperText,
  errorText,
  required,
  isPassword,
  secureTextEntry,
  editable = true,
  onFocus,
  onBlur,
  ...rest
}: AppInputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const hasError = Boolean(errorText);

  const borderColor = hasError ? colors.error : focused ? colors.primary : colors.border;

  return (
    <View style={styles.container}>
      <AppText variant="label" color="text">
        {label}
        {required ? <AppText variant="label" color="error"> *</AppText> : null}
      </AppText>

      <View
        style={[
          styles.field,
          { borderColor, borderWidth: focused || hasError ? 2 : 1 },
          !editable && styles.fieldDisabled,
        ]}>
        {icon ? <AppIcon name={icon} color={hasError ? 'error' : focused ? 'primary' : 'textMuted'} /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={errorText ?? helperText}
          editable={editable}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          placeholderTextColor={colors.textMuted}
          {...rest}
          secureTextEntry={isPassword ? hidden : secureTextEntry}
          style={styles.input}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar clave' : 'Ocultar clave'}
            hitSlop={8}
            onPress={() => setHidden((h) => !h)}
            style={styles.trailingButton}>
            <AppIcon name={hidden ? 'visibility' : 'visibility_off'} color="textSecondary" />
          </Pressable>
        ) : null}
      </View>

      {hasError ? (
        <View style={styles.messageRow} accessibilityLiveRegion="polite">
          <AppIcon name="error" size={sizes.iconSm} color="error" />
          <AppText variant="caption" color="error" style={styles.messageText}>
            {errorText}
          </AppText>
        </View>
      ) : helperText ? (
        <AppText variant="caption" color="textSecondary">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  field: {
    minHeight: sizes.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  fieldDisabled: { backgroundColor: colors.surfaceMuted },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  trailingButton: {
    width: sizes.touchMin,
    height: sizes.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.xs,
  },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  messageText: { flex: 1 },
});
