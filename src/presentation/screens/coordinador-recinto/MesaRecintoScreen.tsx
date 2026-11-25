import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DIGNIDAD_LABELS } from '@/domain/entities/Acta';
import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  LoadingIndicator,
  OpcionLista,
  Retroalimentacion,
  ScreenContainer,
} from '@/presentation/components';
import { mensajeDeError, useAsignarMesa, useMesasRecinto, useVeedores } from '@/presentation/hooks/consultas';
import { useSession } from '@/presentation/navigation/useSession';
import { DIGNIDADES_LISTA } from '@/presentation/screens/actas/etiquetas';
import { spacing } from '@/presentation/theme';

/**
 * Detalle de una mesa para el coordinador de recinto:
 *  - RF-08 / RF-20 / S-05: asignar o reasignar AL INSTANTE la mesa a otro veedor
 *    (el servidor revoca la asignación anterior) o crear un veedor sustituto.
 *  - RF-13: corregir las actas de la mesa.
 *  - S-04 / ADR-11: consultar el historial de versiones de cada acta registrada.
 */
export default function MesaRecintoScreen() {
  const { mesaId, mesaNumero } = useLocalSearchParams<{ mesaId: string; mesaNumero: string }>();
  const { usuario } = useSession();
  const mesas = useMesasRecinto(usuario?.recintoId ?? null);
  const veedores = useVeedores();
  const asignar = useAsignarMesa(usuario?.recintoId ?? null);
  const mesa = mesas.data?.find((m) => m.id === mesaId);

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: `Mesa ${mesaNumero}` }} />

      <AppCard title="Actas de la mesa" icon="description">
        <View style={styles.lista}>
          {DIGNIDADES_LISTA.map((d) => (
            <View key={d} style={styles.acta}>
              <AppButton
                label={`${mesa?.dignidadesRecibidas.includes(d) ? 'Corregir' : 'Registrar'} acta de ${DIGNIDAD_LABELS[d]}`}
                icon="edit_note"
                variant="outline"
                onPress={() => router.push({ pathname: '/coordinador-recinto/acta', params: { mesaId, dignidad: d, mesaNumero } })}
              />
              {mesa?.dignidadesRecibidas.includes(d) ? (
                // S-04 / ADR-11: auditoría de las versiones de esta acta.
                <AppButton
                  label={`Historial de ${DIGNIDAD_LABELS[d].toLowerCase()}`}
                  icon="history"
                  variant="ghost"
                  size="md"
                  fullWidth={false}
                  onPress={() => router.push({ pathname: '/coordinador-recinto/historial', params: { mesaId, dignidad: d, mesaNumero } })}
                />
              ) : null}
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard
        title="Veedor responsable"
        subtitle={mesa?.veedorNombre ? `Actual: ${mesa.veedorNombre}` : 'Esta mesa no tiene veedor.'}
        icon="person_pin">
        <View style={styles.lista}>
          {asignar.isPending ? <Retroalimentacion tipo="proceso" titulo="Asignando…" /> : null}
          {asignar.isSuccess ? (
            <Retroalimentacion tipo="exito" titulo="Mesa asignada" mensaje="El veedor anterior ya no tiene acceso a esta mesa." />
          ) : null}
          {asignar.isError ? <Retroalimentacion tipo="error" titulo="No se asignó" mensaje={mensajeDeError(asignar.error)} /> : null}

          {veedores.isPending ? (
            <LoadingIndicator message="Cargando veedores…" />
          ) : veedores.isError ? (
            <Retroalimentacion tipo="error" titulo="No se cargaron los veedores" mensaje={mensajeDeError(veedores.error)} />
          ) : veedores.data.filter((v) => v.activo).length === 0 ? (
            <EmptyState title="Aún no hay veedores en tu recinto" />
          ) : (
            veedores.data
              .filter((v) => v.activo)
              .map((v) => (
                <OpcionLista
                  key={v.id}
                  titulo={`${v.nombres} ${v.apellidos}`}
                  detalle={`Cel. ${v.telefono}`}
                  icono="radio_button_unchecked"
                  seleccionada={mesa?.veedorId === v.id}
                  onPress={() => mesa?.veedorId !== v.id && asignar.mutate({ mesaId, veedorId: v.id })}
                />
              ))
          )}
          <AppText variant="bodySmall" color="textSecondary">
            ¿El veedor no llegó y no hay otro disponible?
          </AppText>
          <AppButton
            label="Crear veedor sustituto para esta mesa"
            icon="person_add"
            variant="secondary"
            onPress={() => router.push({ pathname: '/coordinador-recinto/nueva-cuenta', params: { mesaId, mesaNumero } })}
          />
        </View>
      </AppCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ lista: { gap: spacing.sm }, acta: { gap: spacing.xxs } });
