import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { contarPendientes, useSyncStore } from '@/presentation/store/syncStore';
import { colors, radius, sizes, spacing } from '@/presentation/theme';

import { AnimacionLottie } from './AnimacionLottie';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

/**
 * RF-14 / RF-16: ÚNICO aviso de conexión y envío (no se repite en otras partes de la pantalla).
 * Sin conexión → cuántas actas esperan en el celular. Enviando → animación de sincronización
 * (Lottie, en bucle mientras dure). Con red y nada pendiente → no se muestra.
 */
export function BarraConexion() {
  const conectado = useSyncStore((s) => s.conectado);
  const sincronizando = useSyncStore((s) => s.sincronizando);
  const pendientes = useSyncStore((s) => contarPendientes(s.actas));

  if (conectado && !sincronizando && pendientes === 0) return null;

  const texto = !conectado
    ? `Sin conexión. ${pendientes > 0 ? `${pendientes} acta(s) guardada(s) en el celular; se enviarán solas al volver la señal.` : 'Puedes seguir registrando actas.'}`
    : sincronizando
      ? `Enviando actas al servidor${pendientes > 0 ? ` (${pendientes} por enviar)` : ''}…`
      : `${pendientes} acta(s) por enviar.`;

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} accessibilityLiveRegion="polite">
      <View style={[styles.barra, { backgroundColor: conectado ? colors.infoSoft : colors.warningSoft }]}>
        {conectado && sincronizando ? (
          <AnimacionLottie nombre="sincronizando" tamano={sizes.lottieSm} bucle />
        ) : (
          <AppIcon name={conectado ? 'sync' : 'cloud_off'} color={conectado ? 'info' : 'warning'} />
        )}
        <AppText variant="bodySmall" style={styles.texto}>
          {texto}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md },
  texto: { flex: 1, minWidth: 0 },
});
