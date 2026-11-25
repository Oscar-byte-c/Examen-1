import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DIGNIDAD_LABELS } from '@/domain/entities/Acta';
import {
  AppButton,
  AppCard,
  CifraClave,
  EmptyState,
  LoadingIndicator,
  Retroalimentacion,
  ScreenContainer,
  StatusBadge,
  TablaVotos,
} from '@/presentation/components';
import { mensajeDeError, useEscrutinioEnVivo, useResultadosPorRecinto } from '@/presentation/hooks/consultas';
import { DIGNIDADES_LISTA } from '@/presentation/screens/actas/etiquetas';
import { spacing } from '@/presentation/theme';

/**
 * RF-15 (coordinador provincial): resultados de UN recinto, separados por dignidad: votos por
 * candidato, total de válidos y total general del recinto (sufragantes = válidos + blancos +
 * nulos). Desde aquí se abren sus mesas y el historial de cada acta (S-04 / ADR-11).
 */
export default function ResultadoRecintoScreen() {
  const { recintoId, nombre } = useLocalSearchParams<{ recintoId: string; nombre: string }>();
  const resultados = useResultadosPorRecinto();
  useEscrutinioEnVivo();
  const recinto = resultados.data?.recintos.find((r) => r.recintoId === recintoId);

  return (
    <ScreenContainer onRefresh={() => void resultados.refetch()} refreshing={resultados.isRefetching}>
      <Stack.Screen options={{ title: nombre ?? 'Recinto' }} />

      {resultados.isPending ? (
        <LoadingIndicator message="Calculando resultados…" />
      ) : resultados.isError ? (
        <Retroalimentacion tipo="error" titulo="No se pudieron cargar los resultados" mensaje={mensajeDeError(resultados.error)} />
      ) : !recinto ? (
        <EmptyState title="No se encontró el recinto" description="Puede que no pertenezca a tu jurisdicción." />
      ) : (
        <>
          <View style={styles.resumen}>
            <StatusBadge
              status={recinto.mesasReportadas === recinto.mesasTotal && recinto.mesasTotal > 0 ? 'success' : 'pending'}
              label={`${recinto.mesasReportadas}/${recinto.mesasTotal} mesas reportadas`}
            />
            {recinto.mesasParciales > 0 ? <StatusBadge status="pending" label={`${recinto.mesasParciales} parcial(es)`} /> : null}
          </View>

          {DIGNIDADES_LISTA.map((dg) => {
            const d = recinto.dignidades[dg];
            return (
              <AppCard key={dg} title={DIGNIDAD_LABELS[dg]} subtitle={`${d.actas} acta(s) en este recinto`} icon="how_to_vote">
                {d.actas === 0 ? (
                  <EmptyState
                    icon="how_to_vote"
                    title="Sin resultados todavía"
                    description={`Aún no llega ninguna acta de ${DIGNIDAD_LABELS[dg].toLowerCase()} de este recinto.`}
                  />
                ) : (
                  <View style={styles.contenido}>
                    <View style={styles.cifras}>
                      <CifraClave valor={d.sufragantes} etiqueta="Total del recinto" color="indigo" />
                      <CifraClave valor={d.validos} etiqueta="Válidos" color="text" />
                      <CifraClave valor={d.blancos} etiqueta="Blancos" color="text" />
                      <CifraClave valor={d.nulos} etiqueta="Nulos" color="text" />
                    </View>
                    <TablaVotos filas={d.candidatos} total={{ etiqueta: 'Total de votos válidos', votos: d.validos }} />
                  </View>
                )}
              </AppCard>
            );
          })}

          <AppButton
            label="Mesas e historial de actas"
            icon="history"
            variant="outline"
            onPress={() => router.push({ pathname: '/coordinador-provincial/mesas', params: { recintoId, nombre } })}
          />
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  resumen: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  contenido: { gap: spacing.md },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
