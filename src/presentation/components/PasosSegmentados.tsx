import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing } from '@/presentation/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

type Props = {
  pasos: readonly string[];
  actual: number;
  completos: readonly boolean[];
  /** Ir a un paso. Solo se ofrece para pasos completos o anteriores al actual. */
  onIr?: (paso: number) => void;
};

/**
 * Banda oscura «Noche de escrutinio» con los pasos del asistente: segmento en oro = paso actual,
 * blanco = completo, tenue = pendiente. El estado también va en texto (visto en los completos) y
 * para el lector de pantalla. Cada paso alcanzable es un botón de ≥ 48 dp para volver a él.
 * Las etiquetas no se cortan: en pantallas angostas usan dos líneas.
 */
export function PasosSegmentados({ pasos, actual, completos, onIr }: Props) {
  return (
    <View style={styles.banda}>
      <View style={styles.fila}>
        {pasos.map((paso, i) => {
          const enCurso = i === actual;
          const completo = completos[i] && !enCurso;
          const alcanzable = !!onIr && !enCurso && (completo || i < actual);
          const estado = enCurso ? 'en curso' : completo ? 'completo' : 'pendiente';
          return (
            <Pressable
              key={paso}
              onPress={alcanzable ? () => onIr?.(i) : undefined}
              disabled={!alcanzable}
              accessibilityRole={alcanzable ? 'button' : 'text'}
              accessibilityLabel={`Paso ${i + 1} de ${pasos.length}, ${paso}: ${estado}${alcanzable ? '. Toca para ir' : ''}`}
              accessibilityState={{ selected: enCurso, disabled: !alcanzable }}
              style={({ pressed }) => [styles.paso, pressed && styles.presionado]}>
              <View style={[styles.segmento, enCurso ? styles.actual : completo ? styles.completo : styles.pendiente]} />
              <View style={styles.etiqueta}>
                {completo ? <AppIcon name="check" size={sizes.iconSm - 4} color="onNoche" /> : null}
                <AppText
                  variant="caption"
                  align="center"
                  // Cuatro pasos en ~80 dp cada uno: con fuente grande, «Sufragantes» se parte en sílabas
                  // (guion) en vez de en cualquier letra. El paso completo se repite a tamaño normal en
                  // el encabezado del contenido («Paso 1 de 4» + título), así que nada se pierde.
                  maxFontSizeMultiplier={1.1}
                  android_hyphenationFrequency="normal"
                  color={enCurso || completo ? 'onNoche' : 'onNocheMuted'}
                  style={[styles.texto, enCurso && styles.textoActual]}>
                  {paso}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: {
    backgroundColor: colors.noche,
    paddingHorizontal: spacing.xs,
    // Compacta: el relleno inferior vive dentro de cada paso, así cuenta como área táctil.
    paddingBottom: spacing.xxs,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  fila: { flexDirection: 'row', gap: 2 },
  paso: {
    flex: 1,
    minWidth: 0,
    minHeight: sizes.touchMin,
    gap: spacing.xxs,
    paddingTop: spacing.xxs,
    paddingBottom: spacing.xxs,
    paddingHorizontal: 2,
    borderRadius: radius.sm,
  },
  presionado: { backgroundColor: colors.onPrimaryVeil },
  segmento: { height: 6, borderRadius: radius.pill },
  actual: { backgroundColor: colors.oro },
  completo: { backgroundColor: colors.onNoche },
  pendiente: { backgroundColor: colors.onPrimaryVeilPressed },
  etiqueta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  texto: { flexShrink: 1 },
  textoActual: { fontWeight: '700' },
});
