import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, sizes, type ColorToken } from '@/presentation/theme';

export type IconName = AndroidSymbol;

type Props = {
  /** Nombre del ícono de Material Symbols (https://fonts.google.com/icons). */
  name: IconName;
  size?: number;
  color?: ColorToken;
  style?: StyleProp<ViewStyle>;
};

/**
 * Ícono único de la app. Usa `expo-symbols` (ya incluido en el proyecto), que en Android
 * renderiza Material Symbols: iconografía consistente y nativa de la plataforma objetivo.
 * Los íconos son decorativos para lectores de pantalla; el significado lo da el texto que acompañan.
 */
export function AppIcon({ name, size = sizes.iconMd, color = 'text', style }: Props) {
  return (
    <SymbolView
      name={{ android: name, web: name }}
      size={size}
      tintColor={colors[color]}
      style={style}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
