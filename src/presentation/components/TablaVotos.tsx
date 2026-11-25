import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/presentation/theme';

import { AppText } from './AppText';
import { StatusBadge } from './StatusBadge';

export type FilaVotos = {
  candidatoId: string;
  candidato: string;
  lista: number;
  /** Color de la lista (dato del servidor): solo pinta la barra, nunca el texto. */
  color: string;
  votos: number;
  porcentaje: number;
};

type Props = {
  filas: readonly FilaVotos[];
  /** Fila final de total (p. ej. «Total de votos válidos»). */
  total?: { etiqueta: string; votos: number };
};

/**
 * RF-15: tabla sencilla de votos por candidato (candidato · votos · %), con una barra
 * proporcional. Las filas llegan ordenadas de mayor a menor; la primera con votos se marca
 * «Lidera» (texto, no solo color). Cada fila se lee completa con el lector de pantalla.
 */
export function TablaVotos({ filas, total }: Props) {
  return (
    <View style={styles.tabla}>
      <View style={styles.encabezado} importantForAccessibility="no-hide-descendants">
        <AppText variant="caption" color="textSecondary" style={styles.columnaNombre}>
          Candidato
        </AppText>
        <AppText variant="caption" color="textSecondary" style={styles.columnaVotos}>
          Votos
        </AppText>
        <AppText variant="caption" color="textSecondary" style={styles.columnaPct}>
          %
        </AppText>
      </View>
      {filas.map((f, i) => {
        const lider = i === 0 && f.votos > 0 && f.votos > (filas[1]?.votos ?? -1);
        return (
          <View
            key={f.candidatoId}
            style={styles.fila}
            accessible
            accessibilityLabel={`Lista ${f.lista}, ${f.candidato}: ${f.votos} votos, ${f.porcentaje.toFixed(1)} por ciento${lider ? ', lidera' : ''}`}>
            <View style={styles.datos}>
              <View style={styles.columnaNombre}>
                <AppText variant="bodySmall">
                  Lista {f.lista} · {f.candidato}
                </AppText>
                {lider ? <StatusBadge status="success" label="Lidera" /> : null}
              </View>
              <AppText variant="numeralSmall" style={styles.columnaVotos}>
                {f.votos}
              </AppText>
              <AppText variant="caption" color="textSecondary" style={styles.columnaPct}>
                {f.porcentaje.toFixed(1)}
              </AppText>
            </View>
            <View style={styles.barraFondo}>
              <View style={[styles.barra, { width: `${f.porcentaje}%`, backgroundColor: f.color }]} />
            </View>
          </View>
        );
      })}
      {total ? (
        <View style={[styles.datos, styles.filaTotal]} accessible accessibilityLabel={`${total.etiqueta}: ${total.votos}`}>
          <AppText variant="label" style={styles.columnaNombre}>
            {total.etiqueta}
          </AppText>
          <AppText variant="numeralSmall" style={styles.columnaVotos}>
            {total.votos}
          </AppText>
          <View style={styles.columnaPct} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tabla: { gap: spacing.sm },
  encabezado: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.xxs, borderBottomWidth: 1, borderBottomColor: colors.divider },
  fila: { gap: spacing.xxs },
  datos: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  columnaNombre: { flex: 1, minWidth: 0, gap: 2, alignItems: 'flex-start' },
  columnaVotos: { minWidth: 56, textAlign: 'right' },
  columnaPct: { minWidth: 44, textAlign: 'right' },
  barraFondo: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: radius.pill },
  filaTotal: { paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.divider },
});
