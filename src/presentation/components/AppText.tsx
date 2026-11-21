import { Text, type TextProps } from 'react-native';

import { colors, MAX_FONT_SCALE, typography, type ColorToken, type TypographyVariant } from '@/presentation/theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
};

/** Texto base: aplica la escala tipográfica y los colores del sistema de diseño. */
export function AppText({ variant = 'body', color = 'text', align, style, ...rest }: AppTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[typography[variant], { color: colors[color] }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}
