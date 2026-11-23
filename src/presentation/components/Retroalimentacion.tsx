import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';

import { colors, radius, spacing } from '@/presentation/theme';

import { AppText } from './AppText';
import { LoadingIndicator } from './LoadingIndicator';

const ANIMACIONES = {
  exito: require('@/assets/animaciones/exito.json'),
  error: require('@/assets/animaciones/error.json'),
};

export type TipoRetroalimentacion = 'proceso' | 'exito' | 'error';

type Props = { tipo: TipoRetroalimentacion; titulo: string; mensaje?: string };

const FONDOS = { proceso: 'infoSoft', exito: 'successSoft', error: 'errorSoft' } as const;

/**
 * RNF-06: retroalimentación visual SIN modales genéricos del sistema.
 *  - Lottie dibuja el visto o la equis (animación vectorial ligera).
 *  - Reanimated hace entrar y salir el bloque con suavidad (corre en el hilo de UI).
 *  - accessibilityLiveRegion: el lector de pantalla anuncia el resultado.
 * El texto siempre acompaña a la animación: el estado no depende solo del color.
 */
export function Retroalimentacion({ tipo, titulo, mensaje }: Props) {
  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      exiting={FadeOut.duration(150)}
      style={[styles.caja, { backgroundColor: colors[FONDOS[tipo]] }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert">
      {tipo === 'proceso' ? (
        <LoadingIndicator message="" />
      ) : (
        <LottieView source={ANIMACIONES[tipo]} autoPlay loop={false} style={styles.animacion} />
      )}
      <View style={styles.textos}>
        <AppText variant="bodyStrong" color={tipo === 'error' ? 'error' : tipo === 'exito' ? 'success' : 'info'}>
          {titulo}
        </AppText>
        {mensaje ? <AppText variant="bodySmall">{mensaje}</AppText> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md },
  animacion: { width: 56, height: 56 },
  textos: { flex: 1, gap: spacing.xxs },
});
