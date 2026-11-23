import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DIGNIDAD_LABELS } from '@/domain/entities/Acta';
import { GEO_ALERT_THRESHOLD_METERS } from '@/domain/constants';
import {
  AppCard,
  AppText,
  LoadingIndicator,
  MapaOSM,
  Retroalimentacion,
  ScreenContainer,
  StatusBadge,
  type MarcadorMapa,
} from '@/presentation/components';
import { mensajeDeError, useAvance, useEscrutinioEnVivo, useUbicaciones } from '@/presentation/hooks/consultas';
import { spacing } from '@/presentation/theme';

/**
 * RF-15 / S-06: ubicación desde donde se registró cada acta junto a su recinto (OpenStreetMap).
 * Las actas a más de 300 m se marcan en rojo y se listan como alerta (no se bloquearon).
 */
export default function MapaScreen() {
  const avance = useAvance();
  const ubicaciones = useUbicaciones();
  useEscrutinioEnVivo();

  if (avance.isPending || ubicaciones.isPending) return <LoadingIndicator fullScreen message="Cargando el mapa…" />;
  if (avance.isError || ubicaciones.isError) {
    return (
      <ScreenContainer>
        <Retroalimentacion tipo="error" titulo="No se pudo cargar el mapa" mensaje={mensajeDeError(avance.error ?? ubicaciones.error)} />
      </ScreenContainer>
    );
  }

  const marcadores: MarcadorMapa[] = [
    ...avance.data.map((r) => ({ latitud: r.latitud, longitud: r.longitud, titulo: `Recinto: ${r.nombre}`, tipo: 'recinto' as const })),
    ...ubicaciones.data.map((u) => ({
      latitud: u.latitud,
      longitud: u.longitud,
      titulo: `Mesa ${u.mesaNumero} (${DIGNIDAD_LABELS[u.dignidad]}) · ${Math.round(u.distanciaM)} m del recinto`,
      tipo: u.fueraDeRango ? ('alerta' as const) : ('acta' as const),
    })),
  ];
  const alertas = ubicaciones.data.filter((u) => u.fueraDeRango);

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Mapa de actas' }} />
      <MapaOSM marcadores={marcadores} />
      <View style={styles.leyenda}>
        <StatusBadge status="info" label="Recinto" />
        <StatusBadge status="success" label="Acta cerca" />
        <StatusBadge status="error" label={`Acta a más de ${GEO_ALERT_THRESHOLD_METERS} m`} />
      </View>
      <AppCard
        title="Alertas de ubicación"
        subtitle={alertas.length ? `${alertas.length} acta(s) registradas lejos de su recinto` : 'Todas las actas se registraron cerca de su recinto'}
        icon="warning"
        iconColor={alertas.length ? 'error' : 'success'}>
        <View style={styles.lista}>
          {alertas.map((a) => (
            <AppText key={a.actaId} variant="bodySmall">
              {a.recintoNombre} · Mesa {a.mesaNumero} · {DIGNIDAD_LABELS[a.dignidad]}: {Math.round(a.distanciaM)} m
            </AppText>
          ))}
        </View>
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  lista: { gap: spacing.xs },
});
