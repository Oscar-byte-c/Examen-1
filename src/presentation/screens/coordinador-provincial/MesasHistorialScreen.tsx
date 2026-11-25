import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DIGNIDAD_LABELS } from '@/domain/entities/Acta';
import { estadoReporte } from '@/domain/entities/Territorio';
import {
  AppButton,
  AppText,
  EmptyState,
  LoadingIndicator,
  Retroalimentacion,
  ScreenContainer,
  StatusBadge,
} from '@/presentation/components';
import { mensajeDeError, useMesasRecinto } from '@/presentation/hooks/consultas';
import { DIGNIDADES_LISTA, ESTADO_REPORTE_BADGE } from '@/presentation/screens/actas/etiquetas';
import { colors, radius, spacing } from '@/presentation/theme';

/**
 * Coordinador provincial: mesas de un recinto con acceso al HISTORIAL de cada acta registrada
 * (S-04 / ADR-11). Solo lectura: el provincial no corrige actas (ADR-11). La RLS de `mesas`,
 * `actas` y `actas_historial` decide qué puede ver.
 */
export default function MesasHistorialScreen() {
  const { recintoId, nombre } = useLocalSearchParams<{ recintoId: string; nombre: string }>();
  const mesas = useMesasRecinto(recintoId);

  return (
    <ScreenContainer onRefresh={() => void mesas.refetch()} refreshing={mesas.isRefetching}>
      <Stack.Screen options={{ title: nombre ?? 'Mesas' }} />
      <AppText variant="bodySmall" color="textSecondary">
        Toca «Historial» para ver las versiones de un acta: quién la registró o corrigió, cuándo y qué cambió.
      </AppText>

      {mesas.isPending ? (
        <LoadingIndicator message="Cargando mesas…" />
      ) : mesas.isError ? (
        <Retroalimentacion tipo="error" titulo="No se cargaron las mesas" mensaje={mensajeDeError(mesas.error)} />
      ) : mesas.data.length === 0 ? (
        <EmptyState title="Este recinto no tiene mesas" />
      ) : (
        mesas.data.map((m) => (
          <View key={m.id} style={styles.mesa}>
            <View style={styles.cabecera}>
              <AppText variant="bodyStrong" style={styles.flex}>
                Mesa {m.numero}
              </AppText>
              <StatusBadge {...ESTADO_REPORTE_BADGE[estadoReporte(m.dignidadesRecibidas)]} />
            </View>
            <AppText variant="bodySmall" color="textSecondary">
              Veedor: {m.veedorNombre ?? 'sin asignar'}
            </AppText>
            {m.dignidadesRecibidas.length === 0 ? (
              <AppText variant="bodySmall" color="textSecondary">
                Aún no tiene actas registradas.
              </AppText>
            ) : (
              DIGNIDADES_LISTA.filter((d) => m.dignidadesRecibidas.includes(d)).map((d) => (
                <AppButton
                  key={d}
                  label={`Historial de ${DIGNIDAD_LABELS[d].toLowerCase()}`}
                  icon="history"
                  variant="ghost"
                  size="md"
                  fullWidth={false}
                  onPress={() =>
                    router.push({
                      pathname: '/coordinador-provincial/historial',
                      params: { mesaId: m.id, dignidad: d, mesaNumero: String(m.numero) },
                    })
                  }
                />
              ))
            )}
          </View>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  mesa: {
    gap: spacing.xxs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
});
