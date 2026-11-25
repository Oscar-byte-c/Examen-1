import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/presentation/theme';

type Props = {
  /** Cuántos bloques mostrar (p. ej. cuántas mesas se esperan). */
  bloques?: number;
  /** Mensaje que dice qué se está cargando (lectores de pantalla). */
  mensaje: string;
};

/**
 * Esqueleto de contenido mientras se carga una lista: reserva el espacio y evita saltos.
 * Pulso de opacidad con Reanimated (hilo de la interfaz); con «reducir movimiento», quieto.
 */
export function Esqueleto({ bloques = 2, mensaje }: Props) {
  const reducirMovimiento = useReducedMotion();
  const opacidad = useSharedValue(1);
  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.get() }));

  useEffect(() => {
    if (reducirMovimiento) return;
    opacidad.set(withRepeat(withTiming(0.45, { duration: 750 }), -1, true));
  }, [reducirMovimiento, opacidad]);

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={mensaje} accessibilityLiveRegion="polite" style={styles.lista}>
      {Array.from({ length: bloques }, (_, i) => (
        <Animated.View key={i} style={[styles.bloque, estilo]}>
          <View style={[styles.linea, styles.titulo]} />
          <View style={[styles.linea, styles.corta]} />
          <View style={styles.fila}>
            <View style={styles.circulo} />
            <View style={[styles.linea, styles.media]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: spacing.sm },
  bloque: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  linea: { height: spacing.sm, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  titulo: { width: '45%', height: spacing.md },
  corta: { width: '70%' },
  media: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  circulo: { width: spacing.xl + spacing.xs, height: spacing.xl + spacing.xs, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
});
