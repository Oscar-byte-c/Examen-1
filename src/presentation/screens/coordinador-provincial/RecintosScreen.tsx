import { router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  LoadingIndicator,
  Retroalimentacion,
  ScreenContainer,
  StatusBadge,
} from '@/presentation/components';
import { mensajeDeError, useCoordinadores, useRecintos } from '@/presentation/hooks/consultas';
import { spacing } from '@/presentation/theme';

/**
 * RF-06 / RF-07: recintos de la jurisdicción y su coordinador responsable (uno por recinto,
 * garantizado por un índice único en la base de datos). Desde cada recinto se abren sus mesas
 * y el historial de sus actas (S-04 / ADR-11).
 */
export default function RecintosScreen() {
  const recintos = useRecintos();
  const coordinadores = useCoordinadores();

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Recintos' }} />
      <AppButton label="Registrar recinto" icon="add_business" onPress={() => router.push('/coordinador-provincial/nuevo-recinto')} />
      {recintos.isPending ? (
        <LoadingIndicator />
      ) : recintos.isError ? (
        <Retroalimentacion tipo="error" titulo="No se cargaron los recintos" mensaje={mensajeDeError(recintos.error)} />
      ) : recintos.data.length === 0 ? (
        <EmptyState title="No hay recintos registrados" />
      ) : (
        recintos.data.map((r) => {
          const coord = coordinadores.data?.find((c) => c.recintoId === r.id && c.activo);
          return (
            <AppCard key={r.id} title={r.nombre} subtitle={`${r.parroquia} · ${r.direccion}`} icon="apartment">
              <View style={styles.cuerpo}>
                {coord ? (
                  <View style={styles.fila}>
                    <StatusBadge status="success" label="Con coordinador" />
                    <AppText variant="bodySmall" style={styles.flex}>
                      {coord.nombres} {coord.apellidos} · {coord.telefono}
                    </AppText>
                  </View>
                ) : (
                  <>
                    <StatusBadge status="warning" label="Sin coordinador" />
                    <AppButton
                      label="Crear coordinador"
                      icon="person_add"
                      variant="outline"
                      size="md"
                      onPress={() =>
                        router.push({ pathname: '/coordinador-provincial/nueva-cuenta', params: { recintoId: r.id, recintoNombre: r.nombre } })
                      }
                    />
                  </>
                )}
                {/* S-04 / ADR-11: auditoría de las actas del recinto (solo lectura). */}
                <AppButton
                  label="Mesas e historial"
                  icon="history"
                  variant="ghost"
                  size="md"
                  fullWidth={false}
                  onPress={() => router.push({ pathname: '/coordinador-provincial/mesas', params: { recintoId: r.id, nombre: r.nombre } })}
                />
              </View>
            </AppCard>
          );
        })
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: spacing.sm, alignItems: 'flex-start' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
