import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/presentation/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

type Props = {
  declarado: number | null;
  validos: number;
  blancos: number;
  nulos: number;
  suma: number;
  diferencia: number;
  estado: 'sin_total' | 'faltan' | 'sobran' | 'cuadra';
};

const MENSAJE = {
  sin_total: { texto: 'Escribe primero el total de sufragantes', color: 'textSecondary', icono: 'info' },
  faltan: { texto: '', color: 'ambar', icono: 'pending' },
  sobran: { texto: '', color: 'error', icono: 'error' },
  cuadra: { texto: 'La suma cuadra', color: 'success', icono: 'check_circle' },
} as const;

/**
 * Balance en vivo de la mesa (RF-10 / RF-19), al pie del paso de votos: cuántos votos faltan o
 * sobran para llegar al total de sufragantes y una barra dividida en válidos, blancos y nulos.
 * Solo muestra el estado: guardar sigue bloqueado por la validación del dominio (S-03).
 * Cifras con dígitos de ancho fijo; el estado va en texto e ícono, no solo en color.
 */
export function BalanceVotos({ declarado, validos, blancos, nulos, suma, diferencia, estado }: Props) {
  const m = MENSAJE[estado];
  const texto =
    estado === 'faltan' ? `Faltan ${diferencia} voto(s)` : estado === 'sobran' ? `Sobran ${diferencia} voto(s)` : m.texto;
  // La barra se dibuja contra el mayor entre el total y la suma, para que «sobran» no se desborde.
  const escala = Math.max(declarado ?? 0, suma, 1);
  const pct = (n: number) => `${(n / escala) * 100}%` as const;

  return (
    <View
      style={styles.caja}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${suma} de ${declarado ?? 'sin total'} votos. ${texto}. Válidos ${validos}, blancos ${blancos}, nulos ${nulos}.`}>
      <View style={styles.cabecera}>
        <AppText variant="bodySmall" color="textSecondary" style={styles.flex}>
          <AppText variant="numeralSmall">{suma}</AppText> de{' '}
          <AppText variant="numeralSmall">{declarado ?? '—'}</AppText> votos
        </AppText>
        <View style={styles.estado}>
          <AppIcon name={m.icono} size={20} color={m.color} />
          <AppText variant="label" color={m.color}>
            {texto}
          </AppText>
        </View>
      </View>
      <View style={styles.barra}>
        <View style={[styles.tramo, { width: pct(validos), backgroundColor: colors.indigo }]} />
        <View style={[styles.tramo, { width: pct(blancos), backgroundColor: colors.borderStrong }]} />
        <View style={[styles.tramo, { width: pct(nulos), backgroundColor: colors.oro }]} />
      </View>
      <View style={styles.leyenda}>
        <Leyenda color={colors.indigo} texto={`Válidos ${validos}`} />
        <Leyenda color={colors.borderStrong} texto={`Blancos ${blancos}`} />
        <Leyenda color={colors.oro} texto={`Nulos ${nulos}`} />
      </View>
    </View>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <View style={styles.item}>
      <View style={[styles.punto, { backgroundColor: color }]} />
      <AppText variant="caption" color="textSecondary">
        {texto}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { gap: spacing.xxs },
  cabecera: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: spacing.sm, rowGap: 2 },
  flex: { flexShrink: 1 },
  estado: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexShrink: 1 },
  barra: { flexDirection: 'row', height: spacing.xs + 2, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.tonal },
  tramo: { height: '100%' },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  punto: { width: spacing.sm, height: spacing.sm, borderRadius: radius.pill },
});
