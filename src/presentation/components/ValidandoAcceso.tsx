import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, shadows, sizes, spacing } from '@/presentation/theme';

import { AnimacionLottie } from './AnimacionLottie';
import { AppText } from './AppText';

type Props = {
  /** true mientras se validan las credenciales (p. ej. `formState.isSubmitting`). */
  visible: boolean;
  titulo?: string;
  mensaje?: string;
};

/** Si la validación termina antes de esto, el panel no llega a mostrarse (evita un parpadeo). */
const RETARDO_MS = 200;
/** Ancho del tramo que recorre la barra, como fracción de la pista. */
const TRAMO = 0.38;

/**
 * Estado «validando acceso» del inicio de sesión (RNF-06): panel con la paleta CNE (acento
 * amarillo, halo celeste con la animación `sincronizando` y barra de progreso indeterminada).
 *  - Solo PRESENTACIÓN: no envía nada ni decide nada; lo enciende y apaga quien lo usa.
 *  - Aparece tras 200 ms y desaparece en cuanto `visible` es false (éxito o error).
 *  - «Reducir movimiento»: la barra queda quieta y la animación Lottie en su primer cuadro.
 *  - El lector de pantalla anuncia el estado (barra de progreso ocupada).
 */
export function ValidandoAcceso({
  visible,
  titulo = 'Verificando tus credenciales',
  mensaje = 'Estamos preparando tu acceso',
}: Props) {
  // `listo` se activa tras el retardo; el panel se ve solo si además sigue `visible`. Al terminar
  // (éxito o error) `visible` pasa a false y el panel se oculta en ese mismo render.
  const [listo, setListo] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setListo(true), RETARDO_MS);
    return () => {
      clearTimeout(t);
      setListo(false);
    };
  }, [visible]);

  if (!visible || !listo) return null;
  return (
    <Animated.View
      entering={FadeInUp.duration(220)}
      exiting={FadeOut.duration(150)}
      style={styles.panel}
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessibilityLabel={`${titulo}. ${mensaje}`}
      accessibilityLiveRegion="polite">
      <View style={styles.acento} />
      <View style={styles.fila}>
        <View style={styles.halo}>
          <AnimacionLottie nombre="sincronizando" tamano={sizes.lottieSm + spacing.sm} bucle />
        </View>
        <View style={styles.textos}>
          <AppText variant="bodyStrong" color="primary">
            {titulo}
          </AppText>
          <AppText variant="bodySmall" color="textSecondary">
            {mensaje}
          </AppText>
        </View>
      </View>
      <BarraIndeterminada />
    </Animated.View>
  );
}

/** Tramo azul que recorre la pista una y otra vez (Reanimated, hilo de UI). */
function BarraIndeterminada() {
  const reducir = useReducedMotion();
  const ancho = useSharedValue(0);
  const avance = useSharedValue(0);

  useEffect(() => {
    if (reducir) return;
    avance.set(withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }), -1, false));
    return () => cancelAnimation(avance);
  }, [avance, reducir]);

  const estilo = useAnimatedStyle(() => {
    const w = ancho.get();
    const tramo = w * TRAMO;
    return {
      width: tramo,
      transform: [{ translateX: reducir ? 0 : -tramo + avance.get() * (w + tramo) }],
    };
  });

  return (
    <View style={styles.pista} onLayout={(e) => ancho.set(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.tramo, estilo]} />
    </View>
  );
}

const HALO = sizes.lottieSm + spacing.sm + spacing.md;

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md + spacing.xxs,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...shadows.hoja,
  },
  /** Franja amarilla CNE: decorativa (el estado lo dicen el texto y la barra). */
  acento: { position: 'absolute', left: 0, top: 0, bottom: 0, width: spacing.xxs, backgroundColor: colors.oro },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  halo: {
    width: HALO,
    height: HALO,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  pista: { height: spacing.xs - 2, borderRadius: radius.pill, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  tramo: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.secondary },
});
