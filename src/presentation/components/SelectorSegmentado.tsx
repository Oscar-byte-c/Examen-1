import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '@/presentation/theme';

import { AppText } from './AppText';

type Props<T extends string> = {
  opciones: readonly { valor: T; etiqueta: string }[];
  valor: T;
  onCambiar: (valor: T) => void;
  /** Lo que se elige (para el lector de pantalla), p. ej. «Dignidad». */
  accessibilityLabel: string;
};

/**
 * Selector de pocas opciones excluyentes (p. ej. Alcaldía / Prefectura). Cada opción es un
 * botón de ≥ 48 dp; la elegida se distingue por fondo y texto en negrita, no solo por color.
 */
export function SelectorSegmentado<T extends string>({ opciones, valor, onCambiar, accessibilityLabel }: Props<T>) {
  return (
    <View style={styles.grupo} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {opciones.map((o) => {
        const elegida = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onCambiar(o.valor)}
            accessibilityRole="radio"
            accessibilityState={{ checked: elegida }}
            accessibilityLabel={o.etiqueta}
            style={({ pressed }) => [styles.opcion, elegida && styles.elegida, pressed && !elegida && styles.presionada]}>
            <AppText variant="label" color={elegida ? 'onPrimary' : 'primary'} align="center" style={elegida && styles.textoElegido}>
              {o.etiqueta}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grupo: {
    flexDirection: 'row',
    padding: spacing.xxs,
    gap: spacing.xxs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  opcion: { flex: 1, minHeight: sizes.touchMin, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  elegida: { backgroundColor: colors.primary },
  presionada: { backgroundColor: colors.primarySoft },
  textoElegido: { fontWeight: '700' },
});
