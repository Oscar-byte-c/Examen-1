import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';

import { colors, radius, sizes, spacing } from '@/presentation/theme';

import { AnimacionLottie, type NombreAnimacion } from './AnimacionLottie';
import { AppText } from './AppText';
import { LoadingIndicator } from './LoadingIndicator';

export type TipoRetroalimentacion = 'proceso' | 'exito' | 'error';

type Props = {
  tipo: TipoRetroalimentacion;
  titulo: string;
  mensaje?: string;
  /**
   * Animación propia del momento (p. ej. `gpsBuscando` mientras se busca señal o `actaSellada`
   * al guardar). Sin ella: indicador de carga, visto o equis.
   */
  animacion?: NombreAnimacion;
};

const FONDOS = { proceso: 'infoSoft', exito: 'successSoft', error: 'errorSoft' } as const;
const TEXTO = { proceso: 'info', exito: 'success', error: 'error' } as const;

/**
 * RNF-06: retroalimentación visual SIN modales genéricos del sistema.
 *  - Lottie dibuja el estado (en bucle si es un proceso, una vez si es un resultado).
 *  - Reanimated hace entrar y salir el bloque con suavidad (corre en el hilo de UI).
 *  - accessibilityLiveRegion: el lector de pantalla anuncia el resultado.
 * El texto siempre acompaña a la animación: el estado no depende solo del color ni del movimiento.
 * Los mensajes largos ocupan varias líneas; nunca se cortan.
 */
export function Retroalimentacion({ tipo, titulo, mensaje, animacion }: Props) {
  const enProceso = tipo === 'proceso';
  return (
    <Animated.View
      entering={FadeInUp.duration(250)}
      exiting={FadeOut.duration(150)}
      style={[styles.caja, { backgroundColor: colors[FONDOS[tipo]] }]}
      accessibilityLiveRegion="polite"
      accessibilityRole={tipo === 'error' ? 'alert' : 'summary'}>
      {animacion ? (
        <AnimacionLottie nombre={animacion} tamano={sizes.lottieMd} bucle={enProceso} />
      ) : enProceso ? (
        <LoadingIndicator message="" />
      ) : (
        <AnimacionLottie nombre={tipo === 'exito' ? 'exito' : 'error'} tamano={sizes.lottieSm + spacing.md} />
      )}
      <View style={styles.textos}>
        <AppText variant="bodyStrong" color={TEXTO[tipo]}>
          {titulo}
        </AppText>
        {mensaje ? <AppText variant="bodySmall">{mensaje}</AppText> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md },
  textos: { flex: 1, minWidth: 0, gap: spacing.xxs },
});
