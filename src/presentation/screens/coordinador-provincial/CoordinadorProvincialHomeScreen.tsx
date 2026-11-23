import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DIGNIDAD_LABELS } from '@/domain/entities/Acta';
import { resumir } from '@/domain/entities/Escrutinio';
import { ROLE_LABELS, Role } from '@/domain/entities/Role';
import { container } from '@/data/di/container';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppText,
  LoadingIndicator,
  Retroalimentacion,
  ScreenContainer,
  StatusBadge,
} from '@/presentation/components';
import { mensajeDeError, useAvance, useConteo, useEscrutinioEnVivo } from '@/presentation/hooks/consultas';
import { useSession } from '@/presentation/navigation/useSession';
import { DIGNIDADES_LISTA } from '@/presentation/screens/actas/etiquetas';
import { colors, radius, spacing } from '@/presentation/theme';

/**
 * Tablero del coordinador provincial (RF-15, S-02, ADR-07): mesas reportadas, parciales y
 * faltantes, conteo acumulado por candidato y dignidad, avance por recinto.
 * Se actualiza en vivo con Supabase Realtime, sin recargar la pantalla.
 */
export default function CoordinadorProvincialHomeScreen() {
  const { cerrarSesion } = useSession();
  const avance = useAvance();
  const conteo = useConteo();
  useEscrutinioEnVivo();

  const resumen = avance.data ? resumir(avance.data) : null;

  return (
    <ScreenContainer
      header={
        <AppHeader
          eyebrow={ROLE_LABELS[Role.COORDINADOR_PROVINCIAL]}
          title="Conteo rápido"
          subtitle="Avance del escrutinio en tiempo real"
          icon="monitoring"
          action={{ icon: 'logout', label: 'Salir', onPress: () => void cerrarSesion() }}
        />
      }>
      <View style={styles.botones}>
        <AppButton label="Mapa de actas" icon="map" variant="outline" onPress={() => router.push('/coordinador-provincial/mapa')} style={styles.boton} />
        <AppButton label="Recintos" icon="apartment" variant="outline" onPress={() => router.push('/coordinador-provincial/recintos')} style={styles.boton} />
      </View>

      <AppCard title="Mesas" icon="table_restaurant" trailing={<StatusBadge status="info" label="En vivo" />}>
        {avance.isPending ? (
          <LoadingIndicator />
        ) : avance.isError ? (
          <Retroalimentacion tipo="error" titulo="No se pudo cargar el avance" mensaje={mensajeDeError(avance.error)} />
        ) : resumen ? (
          <View style={styles.cifras}>
            <Cifra valor={resumen.mesasReportadas} texto="Reportadas" />
            <Cifra valor={resumen.mesasParciales} texto="Parciales" />
            <Cifra valor={resumen.mesasFaltantes} texto="Faltan" />
            <Cifra valor={resumen.mesasTotal} texto="Total" />
          </View>
        ) : null}
      </AppCard>

      {DIGNIDADES_LISTA.map((d) => {
        const filas = (conteo.data ?? []).filter((c) => c.dignidad === d);
        const total = filas.reduce((s, c) => s + c.votos, 0);
        return (
          <AppCard key={d} title={DIGNIDAD_LABELS[d]} subtitle={`${total} votos válidos contados`} icon="how_to_vote">
            {conteo.isPending ? (
              <LoadingIndicator />
            ) : conteo.isError ? (
              <Retroalimentacion tipo="error" titulo="No se pudo cargar el conteo" mensaje={mensajeDeError(conteo.error)} />
            ) : (
              <View style={styles.barras}>
                {[...filas].sort((a, b) => b.votos - a.votos).map((c) => {
                  const pct = total > 0 ? (c.votos / total) * 100 : 0;
                  return (
                    <View key={c.candidatoId} style={styles.barraFila} accessible accessibilityLabel={`${c.candidato}, ${c.votos} votos, ${pct.toFixed(1)} por ciento`}>
                      <AppText variant="bodySmall">
                        Lista {c.lista} · {c.candidato} — <AppText variant="label">{c.votos}</AppText> ({pct.toFixed(1)} %)
                      </AppText>
                      <View style={styles.barraFondo}>
                        <View style={[styles.barra, { width: `${pct}%`, backgroundColor: c.color }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </AppCard>
        );
      })}

      <AppCard title="Avance por recinto" icon="apartment">
        <View style={styles.barras}>
          {(avance.data ?? []).map((r) => (
            <View key={r.recintoId} style={styles.recinto}>
              <AppText variant="bodyStrong" style={styles.flex}>
                {r.nombre}
              </AppText>
              <StatusBadge
                status={r.mesasReportadas === r.mesasTotal ? 'success' : r.mesasReportadas + r.mesasParciales > 0 ? 'pending' : 'neutral'}
                label={`${r.mesasReportadas}/${r.mesasTotal} mesas`}
              />
            </View>
          ))}
        </View>
      </AppCard>

      <PruebaMonitoreo />
    </ScreenContainer>
  );
}

/**
 * ADR-05 / RF-17: envía un error de prueba al monitoreo para demostrar que los fallos llegan.
 * Esta pantalla solo existe en el grupo de rutas del coordinador provincial (guard por rol).
 */
function PruebaMonitoreo() {
  const [eventoId, setEventoId] = useState<string | null | undefined>(undefined);

  return (
    <AppCard title="Monitoreo de fallos" subtitle="Envía un error de prueba a Sentry" icon="bug_report">
      <AppButton
        label="Probar monitoreo"
        icon="send"
        variant="outline"
        accessibilityHint="Envía un error de prueba a la herramienta de monitoreo"
        onPress={() => setEventoId(container.probarMonitoreo.execute())}
      />
      {eventoId === undefined ? null : eventoId ? (
        <Retroalimentacion tipo="exito" titulo="Error de prueba enviado" mensaje={`Búscalo en Sentry con el identificador ${eventoId}.`} />
      ) : (
        <Retroalimentacion tipo="error" titulo="El monitoreo no está configurado" mensaje="Falta el DSN de Sentry en la configuración de la app." />
      )}
    </AppCard>
  );
}

function Cifra({ valor, texto }: { valor: number; texto: string }) {
  return (
    <View style={styles.cifra}>
      <AppText variant="title" color="primary">
        {valor}
      </AppText>
      <AppText variant="caption" color="textSecondary">
        {texto}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  botones: { flexDirection: 'row', gap: spacing.sm },
  boton: { flex: 1 },
  cifras: { flexDirection: 'row', justifyContent: 'space-between' },
  cifra: { alignItems: 'center', flex: 1 },
  barras: { gap: spacing.sm },
  barraFila: { gap: spacing.xxs },
  barraFondo: { height: 12, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  barra: { height: '100%', borderRadius: radius.pill },
  recinto: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
