import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '@/presentation/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

type Props = {
  titulo: string;
  detalle?: string;
  icono?: IconName;
  seleccionada?: boolean;
  onPress: () => void;
  accesorio?: React.ReactNode;
};

/** Fila táctil grande (≥ 48 dp) para elegir opciones: veedores, recintos, mesas (RNF-07). */
export function OpcionLista({ titulo, detalle, icono = 'chevron_right', seleccionada, onPress, accesorio }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detalle ? `${titulo}. ${detalle}` : titulo}
      accessibilityState={{ selected: seleccionada }}
      style={({ pressed }) => [styles.fila, seleccionada && styles.seleccionada, pressed && styles.presionada]}>
      <View style={styles.textos}>
        <AppText variant="bodyStrong">{titulo}</AppText>
        {detalle ? (
          <AppText variant="bodySmall" color="textSecondary">
            {detalle}
          </AppText>
        ) : null}
      </View>
      {accesorio}
      <AppIcon name={seleccionada ? 'check_circle' : icono} color={seleccionada ? 'success' : 'textSecondary'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    minHeight: sizes.touchMin + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  seleccionada: { borderColor: colors.success, backgroundColor: colors.successSoft },
  presionada: { backgroundColor: colors.primarySoft },
  textos: { flex: 1, gap: 2 },
});
