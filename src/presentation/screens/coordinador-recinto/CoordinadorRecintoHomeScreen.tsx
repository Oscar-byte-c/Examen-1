import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ROLE_LABELS, Role } from '@/domain/entities/Role';
import { estadoReporte } from '@/domain/entities/Territorio';
import {
  AppButton,
  AppCard,
  AppHeader,
  BarraConexion,
  EmptyState,
  LoadingIndicator,
  OpcionLista,
  Retroalimentacion,
  ScreenContainer,
  StatusBadge,
} from '@/presentation/components';
import { mensajeDeError, useConflictos, useEscrutinioEnVivo, useMesasRecinto, useVeedores } from '@/presentation/hooks/consultas';
import { useSession } from '@/presentation/navigation/useSession';
import { ESTADO_REPORTE_BADGE } from '@/presentation/screens/actas/etiquetas';
import { spacing } from '@/presentation/theme';

/**
 * Inicio del coordinador de recinto (RF-08, RF-13, RF-20, S-04): mesas de su recinto con
 * su veedor y estado de reporte (S-02), conflictos por revisar y gestión de veedores.
 * Se actualiza en vivo con Supabase Realtime (ADR-07).
 */
export default function CoordinadorRecintoHomeScreen() {
  const { usuario, cerrarSesion } = useSession();
  const mesas = useMesasRecinto(usuario?.recintoId ?? null);
  const veedores = useVeedores();
  const conflictos = useConflictos();
  useEscrutinioEnVivo();

  const pendientes = conflictos.data?.length ?? 0;

  return (
    <ScreenContainer
      header={
        <AppHeader
          eyebrow={ROLE_LABELS[Role.COORDINADOR_RECINTO]}
          title="Mi recinto"
          subtitle="Mesas, veedores y actas"
          icon="apartment"
          action={{ icon: 'logout', label: 'Salir', onPress: () => void cerrarSesion() }}
        />
      }>
      <BarraConexion />

      <AppCard
        title="Actas en conflicto"
        subtitle="Versiones distintas de la misma acta que debes revisar."
        icon="rule"
        iconColor={pendientes > 0 ? 'warning' : 'success'}
        trailing={<StatusBadge status={pendientes > 0 ? 'warning' : 'success'} label={pendientes > 0 ? `${pendientes} por revisar` : 'Ninguno'} />}
        onPress={pendientes > 0 ? () => router.push('/coordinador-recinto/conflictos') : undefined}
      />

      <AppCard title="Veedores" subtitle={`${veedores.data?.length ?? 0} registrados en tu recinto`} icon="groups">
        <AppButton label="Crear cuenta de veedor" icon="person_add" variant="outline" onPress={() => router.push('/coordinador-recinto/nueva-cuenta')} />
      </AppCard>

      <AppCard title="Mesas" subtitle="Toca una mesa para asignar veedor o corregir sus actas." icon="table_restaurant">
        {mesas.isPending ? (
          <LoadingIndicator message="Cargando mesas…" />
        ) : mesas.isError ? (
          <Retroalimentacion tipo="error" titulo="No se pudieron cargar las mesas" mensaje={mensajeDeError(mesas.error)} />
        ) : mesas.data.length === 0 ? (
          <EmptyState title="Tu recinto no tiene mesas registradas" />
        ) : (
          <View style={styles.lista}>
            {mesas.data.map((m) => {
              const estado = ESTADO_REPORTE_BADGE[estadoReporte(m.dignidadesRecibidas)];
              return (
                <OpcionLista
                  key={m.id}
                  titulo={`Mesa ${m.numero}`}
                  detalle={m.veedorNombre ? `Veedor: ${m.veedorNombre}` : 'Sin veedor asignado'}
                  accesorio={<StatusBadge status={estado.status} label={estado.label} />}
                  onPress={() =>
                    router.push({ pathname: '/coordinador-recinto/mesa', params: { mesaId: m.id, mesaNumero: String(m.numero) } })
                  }
                />
              );
            })}
          </View>
        )}
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ lista: { gap: spacing.sm } });
