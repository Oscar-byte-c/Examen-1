import LottieView from 'lottie-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { sizes } from '@/presentation/theme';

/**
 * Animaciones «Acta y sello» (RNF-06). Obra original del proyecto: diseñadas en LottieFiles
 * Creator y generadas con `scripts/lottie/generar.js` con los colores de la paleta.
 */
const ANIMACIONES = {
  emblemaLogin: require('@/assets/animaciones/emblema_login.json'),
  actaSellada: require('@/assets/animaciones/acta_sellada.json'),
  gpsBuscando: require('@/assets/animaciones/gps_buscando.json'),
  gpsUbicado: require('@/assets/animaciones/gps_ubicado.json'),
  sincronizando: require('@/assets/animaciones/sincronizando.json'),
  conflictoResuelto: require('@/assets/animaciones/conflicto_resuelto.json'),
  exito: require('@/assets/animaciones/exito.json'),
  error: require('@/assets/animaciones/error.json'),
} as const;

export type NombreAnimacion = keyof typeof ANIMACIONES;

type Props = {
  nombre: NombreAnimacion;
  /** Lado en dp (las animaciones son cuadradas). */
  tamano?: number;
  /** Bucle (procesos en curso) o una sola reproducción (confirmaciones). */
  bucle?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Reproduce una animación Lottie de forma accesible:
 *  - Es decorativa: el lector de pantalla la ignora; el estado siempre lo dice un texto al lado.
 *  - No captura toques (`pointerEvents="none"`): nunca bloquea un formulario.
 *  - «Reducir movimiento» del sistema: no se anima; una confirmación se muestra en su estado
 *    final y un proceso en bucle, quieto.
 */
export function AnimacionLottie({ nombre, tamano = sizes.lottieMd, bucle = false, style }: Props) {
  const reducirMovimiento = useReducedMotion();
  return (
    <View
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[{ width: tamano, height: tamano }, style]}>
      <LottieView
        source={ANIMACIONES[nombre]}
        autoPlay={!reducirMovimiento}
        loop={bucle && !reducirMovimiento}
        progress={reducirMovimiento ? (bucle ? 0.25 : 1) : undefined}
        style={styles.lienzo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  lienzo: { width: '100%', height: '100%' },
});
