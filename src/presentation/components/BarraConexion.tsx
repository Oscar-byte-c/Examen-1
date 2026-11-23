import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { contarPendientes, useSyncStore } from '@/presentation/store/syncStore';
import { colors, radius, spacing } from '@/presentation/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

/** RF-14 / RF-16: indica si hay señal y cuántas actas esperan ser enviadas. */
export function BarraConexion() {
  const conectado = useSyncStore((s) => s.conectado);
  const sincronizando = useSyncStore((s) => s.sincronizando);
  const pendientes = useSyncStore((s) => contarPendientes(s.actas));

  if (conectado && !sincronizando && pendientes === 0) return null;

  const texto = !conectado
    ? `Sin conexión. ${pendientes > 0 ? `${pendientes} acta(s) guardada(s) en el celular; se enviarán solas al volver la señal.` : 'Puedes seguir registrando actas.'}`
    : sincronizando
      ? 'Enviando actas…'
      : `${pendientes} acta(s) por enviar.`;

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} accessibilityLiveRegion="polite">
      <View style={[styles.barra, { backgroundColor: conectado ? colors.infoSoft : colors.warningSoft }]}>
        <AppIcon name={conectado ? 'sync' : 'cloud_off'} color={conectado ? 'info' : 'warning'} />
        <AppText variant="bodySmall" style={styles.texto}>
          {texto}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md },
  texto: { flex: 1 },
});
