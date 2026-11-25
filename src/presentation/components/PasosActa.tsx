import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '@/presentation/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

type Props = {
  /** Nombres de los pasos, en orden (p. ej. Resultados, Foto, Guardar). */
  pasos: readonly string[];
  /** Índice del paso en curso (0 = el primero). */
  actual: number;
  /** Pasos ya completos (se marcan con un visto). */
  completos: readonly boolean[];
};

/**
 * Indicador de pasos del registro de un acta. Numerado porque el proceso ES una secuencia.
 * Paso actual en ocre (acento del sello), completos con visto y en tinta, pendientes en gris;
 * el estado se dice también en texto para el lector de pantalla. Las etiquetas pueden ocupar
 * dos líneas en pantallas angostas: no se cortan.
 */
export function PasosActa({ pasos, actual, completos }: Props) {
  const resumen = pasos
    .map((p, i) => `Paso ${i + 1}, ${p}: ${completos[i] ? 'completo' : i === actual ? 'en curso' : 'pendiente'}`)
    .join('. ');
  return (
    <View style={styles.fila} accessible accessibilityRole="progressbar" accessibilityLabel={resumen}>
      {pasos.map((paso, i) => {
        const completo = completos[i];
        const enCurso = !completo && i === actual;
        return (
          <View key={paso} style={styles.paso}>
            <View style={styles.marcaFila}>
              <View style={[styles.linea, i === 0 && styles.oculta, completos[i - 1] && styles.lineaHecha]} />
              <View style={[styles.circulo, completo && styles.circuloHecho, enCurso && styles.circuloActual]}>
                {completo ? (
                  <AppIcon name="check" size={sizes.iconSm} color="onPrimary" />
                ) : (
                  <AppText variant="label" color={enCurso ? 'accent' : 'textMuted'}>
                    {i + 1}
                  </AppText>
                )}
              </View>
              <View style={[styles.linea, i === pasos.length - 1 && styles.oculta, completo && styles.lineaHecha]} />
            </View>
            {/* Cada paso tiene un tercio del ancho: con fuente máxima una palabra larga («Resultados»)
                se partiría; se limita el escalado a ×1,2 SOLO en estas etiquetas (el lector las lee completas). */}
            <AppText
              variant="caption"
              align="center"
              maxFontSizeMultiplier={1.2}
              color={enCurso ? 'accent' : completo ? 'text' : 'textMuted'}>
              {paso}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const CIRCULO = sizes.iconLg;

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', paddingVertical: spacing.xs },
  paso: { flex: 1, minWidth: 0, alignItems: 'center', gap: spacing.xxs },
  marcaFila: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  linea: { flex: 1, height: 2, backgroundColor: colors.border },
  lineaHecha: { backgroundColor: colors.primary },
  oculta: { backgroundColor: 'transparent' },
  circulo: {
    width: CIRCULO,
    height: CIRCULO,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circuloActual: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  circuloHecho: { borderColor: colors.primary, backgroundColor: colors.primary },
});
