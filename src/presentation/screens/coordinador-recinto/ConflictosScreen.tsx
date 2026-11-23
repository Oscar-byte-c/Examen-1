import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DIGNIDAD_LABELS, type ResultadosActa } from '@/domain/entities/Acta';
import type { Candidato } from '@/domain/entities/Acta';
import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  LoadingIndicator,
  Retroalimentacion,
  ScreenContainer,
} from '@/presentation/components';
import { mensajeDeError, useCandidatos, useConflictos, useResolverConflicto } from '@/presentation/hooks/consultas';
import { colors, radius, spacing } from '@/presentation/theme';

/**
 * S-04: dos dispositivos modificaron la misma acta antes de sincronizar. El servidor
 * conservó AMBAS versiones; el coordinador de recinto decide cuál prevalece.
 * Nada se sobrescribe en silencio y todo queda en el historial.
 */
export default function ConflictosScreen() {
  const conflictos = useConflictos();
  const resolver = useResolverConflicto();
  const alcaldia = useCandidatos('alcaldia');
  const prefectura = useCandidatos('prefectura');
  const candidatos = [...(alcaldia.data ?? []), ...(prefectura.data ?? [])];

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Actas en conflicto' }} />
      {resolver.isError ? <Retroalimentacion tipo="error" titulo="No se resolvió" mensaje={mensajeDeError(resolver.error)} /> : null}
      {resolver.isSuccess ? <Retroalimentacion tipo="exito" titulo="Conflicto resuelto" /> : null}
      {conflictos.isPending ? (
        <LoadingIndicator />
      ) : conflictos.isError ? (
        <Retroalimentacion tipo="error" titulo="No se pudieron cargar" mensaje={mensajeDeError(conflictos.error)} />
      ) : conflictos.data.length === 0 ? (
        <EmptyState icon="task_alt" title="No hay conflictos pendientes" />
      ) : (
        conflictos.data.map((c) => (
          <AppCard key={c.id} title={`Mesa ${c.mesaNumero} · ${DIGNIDAD_LABELS[c.dignidad]}`} icon="rule" iconColor="warning">
            <View style={styles.comparacion}>
              <Version titulo={`En el servidor (v${c.servidor.version})`} r={c.servidor} candidatos={candidatos} />
              <Version titulo="Enviada desde otro celular" r={c.dispositivo} candidatos={candidatos} />
            </View>
            <View style={styles.acciones}>
              <AppButton
                label="Mantener la del servidor"
                variant="outline"
                onPress={() => resolver.mutate({ id: c.id, eleccion: 'servidor' })}
                disabled={resolver.isPending}
              />
              <AppButton
                label="Usar la del otro celular"
                onPress={() => resolver.mutate({ id: c.id, eleccion: 'dispositivo' })}
                disabled={resolver.isPending}
              />
            </View>
          </AppCard>
        ))
      )}
    </ScreenContainer>
  );
}

function Version({ titulo, r, candidatos }: { titulo: string; r: ResultadosActa; candidatos: Candidato[] }) {
  return (
    <View style={styles.version}>
      <AppText variant="label">{titulo}</AppText>
      <AppText variant="bodySmall">Sufragantes: {r.totalSufragantes}</AppText>
      {r.votos.map((v) => {
        const c = candidatos.find((x) => x.id === v.candidatoId);
        return (
          <AppText key={v.candidatoId} variant="bodySmall">
            {c ? `Lista ${c.lista} ${c.siglas}` : 'Candidato'}: {v.votos}
          </AppText>
        );
      })}
      <AppText variant="bodySmall">Blancos: {r.votosBlancos}</AppText>
      <AppText variant="bodySmall">Nulos: {r.votosNulos}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  comparacion: { flexDirection: 'row', gap: spacing.sm },
  version: { flex: 1, gap: spacing.xxs, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  acciones: { gap: spacing.sm, marginTop: spacing.md },
});
