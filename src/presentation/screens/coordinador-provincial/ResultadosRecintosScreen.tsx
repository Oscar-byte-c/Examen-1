import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DIGNIDAD_LABELS, type Dignidad } from '@/domain/entities/Acta';
import {
  AppCard,
  AppText,
  CifraClave,
  EmptyState,
  LoadingIndicator,
  OpcionLista,
  Retroalimentacion,
  ScreenContainer,
  SelectorSegmentado,
  StatusBadge,
  TablaVotos,
} from '@/presentation/components';
import { mensajeDeError, useEscrutinioEnVivo, useResultadosPorRecinto } from '@/presentation/hooks/consultas';
import { DIGNIDADES_LISTA } from '@/presentation/screens/actas/etiquetas';
import { spacing } from '@/presentation/theme';

const OPCIONES_DIGNIDAD = DIGNIDADES_LISTA.map((d) => ({ valor: d, etiqueta: DIGNIDAD_LABELS[d] }));

/**
 * RF-15 (coordinador provincial): resultados GENERALES por candidato y la lista de recintos para
 * ver el detalle de cada uno. Solo cuentan las actas aceptadas por el servidor (versión vigente);
 * se actualiza en vivo con Realtime (ADR-07) y la RLS decide qué datos llegan (ADR-11).
 */
export default function ResultadosRecintosScreen() {
  const [dignidad, setDignidad] = useState<Dignidad>('alcaldia');
  const resultados = useResultadosPorRecinto();
  useEscrutinioEnVivo();
  const general = resultados.data?.general[dignidad];

  return (
    <ScreenContainer onRefresh={() => void resultados.refetch()} refreshing={resultados.isRefetching}>
      <Stack.Screen options={{ title: 'Resultados por recinto' }} />
      <SelectorSegmentado opciones={OPCIONES_DIGNIDAD} valor={dignidad} onCambiar={setDignidad} accessibilityLabel="Dignidad" />

      {resultados.isPending ? (
        <LoadingIndicator message="Calculando resultados…" />
      ) : resultados.isError ? (
        <Retroalimentacion tipo="error" titulo="No se pudieron cargar los resultados" mensaje={mensajeDeError(resultados.error)} />
      ) : (
        <>
          <AppCard
            title={`Resultados generales · ${DIGNIDAD_LABELS[dignidad]}`}
            subtitle={`${general!.actas} acta(s) de toda la jurisdicción`}
            icon="leaderboard"
            trailing={<StatusBadge status="info" label="En vivo" />}>
            {general!.actas === 0 ? (
              <EmptyState icon="how_to_vote" title="Aún no hay actas registradas" description="Los resultados aparecen cuando llega la primera acta." />
            ) : (
              <View style={styles.contenido}>
                <View style={styles.cifras}>
                  <CifraClave valor={general!.sufragantes} etiqueta="Sufragantes" color="indigo" />
                  <CifraClave valor={general!.validos} etiqueta="Válidos" color="text" />
                  <CifraClave valor={general!.blancos} etiqueta="Blancos" color="text" />
                  <CifraClave valor={general!.nulos} etiqueta="Nulos" color="text" />
                </View>
                <TablaVotos filas={general!.candidatos} total={{ etiqueta: 'Total de votos válidos', votos: general!.validos }} />
                {resultados.data.coincideConConteoServidor ? (
                  <StatusBadge status="success" label="La suma de los recintos coincide con el conteo del servidor" />
                ) : (
                  <StatusBadge status="warning" label="Llegaron actas nuevas: desliza hacia abajo para actualizar" />
                )}
              </View>
            )}
          </AppCard>

          <AppText variant="label" color="textSecondary">
            Recintos · toca uno para ver sus resultados
          </AppText>
          {resultados.data.recintos.length === 0 ? (
            <EmptyState title="No hay recintos en tu jurisdicción" />
          ) : (
            resultados.data.recintos.map((r) => {
              const d = r.dignidades[dignidad];
              return (
                <OpcionLista
                  key={r.recintoId}
                  titulo={r.nombre}
                  detalle={d.actas === 0 ? 'Sin actas de esta dignidad' : `${d.validos} votos válidos · ${d.actas} acta(s)`}
                  accesorio={<StatusBadge status={r.mesasReportadas === r.mesasTotal && r.mesasTotal > 0 ? 'success' : d.actas > 0 ? 'pending' : 'neutral'} label={`${r.mesasReportadas}/${r.mesasTotal} mesas`} />}
                  onPress={() =>
                    router.push({ pathname: '/coordinador-provincial/resultado-recinto', params: { recintoId: r.recintoId, nombre: r.nombre } })
                  }
                />
              );
            })
          )}
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: spacing.md },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
