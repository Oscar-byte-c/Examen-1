import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing, type ColorToken } from '@/presentation/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

/** Tonos del sello. Genéricos: la pantalla decide qué estado de negocio corresponde a cada uno. */
export type TonoSello = 'vacio' | 'sello' | 'proceso' | 'exito' | 'error' | 'aviso';

const TONOS: Record<TonoSello, { borde: ColorToken; fondo: ColorToken; texto: ColorToken }> = {
  vacio: { borde: 'borderStrong', fondo: 'surface', texto: 'textSecondary' },
  sello: { borde: 'accent', fondo: 'accentSoft', texto: 'accent' },
  proceso: { borde: 'info', fondo: 'infoSoft', texto: 'info' },
  exito: { borde: 'success', fondo: 'successSoft', texto: 'success' },
  error: { borde: 'error', fondo: 'errorSoft', texto: 'error' },
  aviso: { borde: 'warning', fondo: 'warningSoft', texto: 'warning' },
};

type Props = {
  tono: TonoSello;
  icono: IconName;
  /** Texto del estado: SIEMPRE visible (el estado no depende solo del color ni del ícono). */
  etiqueta: string;
  /** Texto secundario bajo la etiqueta (p. ej. el detalle de un error). */
  detalle?: string | null;
};

/**
 * Sello de estado «Acta y sello» (elemento distintivo de la Fase 4): un sello circular de
 * doble borde, como el que certifica un acta impresa, con su ícono y el estado escrito al lado.
 * La etiqueta y el detalle ocupan las líneas que necesiten; nunca se cortan.
 */
export function SelloEstado({ tono, icono, etiqueta, detalle }: Props) {
  const t = TONOS[tono];
  return (
    <View style={styles.fila} accessible accessibilityLabel={detalle ? `Estado: ${etiqueta}. ${detalle}` : `Estado: ${etiqueta}`}>
      <View style={[styles.aro, { borderColor: colors[t.borde], backgroundColor: colors[t.fondo] }]}>
        <View style={[styles.aroInterior, { borderColor: colors[t.borde] }]}>
          <AppIcon name={icono} size={sizes.iconMd} color={t.texto} />
        </View>
      </View>
      <View style={styles.textos}>
        <AppText variant="label" color={t.texto}>
          {etiqueta}
        </AppText>
        {detalle ? (
          <AppText variant="caption" color={tono === 'error' ? 'error' : 'textSecondary'}>
            {detalle}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minWidth: 0 },
  aro: {
    width: sizes.sello,
    height: sizes.sello,
    borderRadius: radius.pill,
    borderWidth: 2.5,
    padding: 3,
  },
  aroInterior: {
    flex: 1,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 2 },
});
