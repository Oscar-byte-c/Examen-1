import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DIGNIDAD_LABELS, type Acta, type Dignidad } from '@/domain/entities/Acta';
import { ROLE_LABELS, Role } from '@/domain/entities/Role';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppText,
  BarraConexion,
  EmptyState,
  LoadingIndicator,
  Retroalimentacion,
  ScreenContainer,
  StatusBadge,
} from '@/presentation/components';
import { mensajeDeError, useMisMesas } from '@/presentation/hooks/consultas';
import { useSession } from '@/presentation/navigation/useSession';
import { useSyncStore } from '@/presentation/store/syncStore';
import { spacing } from '@/presentation/theme';
import { DIGNIDADES_LISTA, ESTADO_ENVIO_BADGE } from '@/presentation/screens/actas/etiquetas';

/**
 * Inicio del veedor (RF-09, RF-14, RF-16): sus mesas asignadas, el botón de cada acta
 * y el estado de envío de cada una. Funciona sin red con la última copia de sus mesas.
 */
export default function VeedorHomeScreen() {
  const { usuario, verificada, cerrarSesion } = useSession();
  const mesas = useMisMesas();
  const actas = useSyncStore((s) => s.actas);
  const sincronizar = useSyncStore((s) => s.sincronizar);
  const sincronizando = useSyncStore((s) => s.sincronizando);

  const actaDe = (mesaId: string, d: Dignidad): Acta | undefined => actas.find((a) => a.mesaId === mesaId && a.dignidad === d);

  return (
    <ScreenContainer
      header={
        <AppHeader
          eyebrow={ROLE_LABELS[Role.VEEDOR]}
          title={`Hola, ${usuario?.nombres ?? ''}`}
          subtitle="Registra las actas de alcaldía y prefectura"
          icon="how_to_vote"
          action={{ icon: 'logout', label: 'Salir', onPress: () => void cerrarSesion() }}
        />
      }>
      <BarraConexion />
      {!verificada ? (
        <StatusBadge status="warning" label="Modo sin conexión: datos guardados en el celular" />
      ) : null}

      <AppCard title="Mis mesas" icon="assignment">
        {mesas.isPending ? (
          <LoadingIndicator message="Cargando tus mesas…" />
        ) : mesas.isError ? (
          <Retroalimentacion tipo="error" titulo="No se pudieron cargar tus mesas" mensaje={mensajeDeError(mesas.error)} />
        ) : mesas.data.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Aún no tienes mesas asignadas"
            description="Cuando tu coordinador de recinto te asigne una mesa, aparecerá aquí."
            actionLabel="Actualizar"
            onAction={() => void mesas.refetch()}
          />
        ) : (
          <View style={styles.lista}>
            {mesas.data.map((m) => (
              <View key={m.id} style={styles.mesa}>
                <AppText variant="subtitle">Mesa {m.numero}</AppText>
                <AppText variant="bodySmall" color="textSecondary">
                  {m.recinto.nombre}
                </AppText>
                {DIGNIDADES_LISTA.map((d) => {
                  const acta = actaDe(m.id, d);
                  return (
                    <View key={d} style={styles.dignidad}>
                      <View style={styles.dignidadTexto}>
                        <AppText variant="bodyStrong">{DIGNIDAD_LABELS[d]}</AppText>
                        <StatusBadge
                          status={acta ? ESTADO_ENVIO_BADGE[acta.estado].status : 'neutral'}
                          label={acta ? ESTADO_ENVIO_BADGE[acta.estado].label : 'Sin registrar'}
                        />
                        {acta?.estado === 'fallida' && acta.error ? (
                          <AppText variant="caption" color="error">
                            {acta.error}
                          </AppText>
                        ) : null}
                      </View>
                      <AppButton
                        label={acta ? 'Corregir' : 'Registrar'}
                        icon={acta ? 'edit' : 'add'}
                        size="md"
                        variant={acta ? 'outline' : 'primary'}
                        onPress={() =>
                          router.push({
                            pathname: '/veedor/acta',
                            params: { mesaId: m.id, dignidad: d, mesaNumero: String(m.numero) },
                          })
                        }
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </AppCard>

      <AppButton label="Enviar ahora" icon="sync" variant="outline" onPress={() => void sincronizar()} loading={sincronizando} />
      <AppButton label="Actualizar mis mesas" icon="refresh" variant="ghost" onPress={() => void mesas.refetch()} loading={mesas.isRefetching} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  lista: { gap: spacing.lg },
  mesa: { gap: spacing.sm },
  dignidad: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dignidadTexto: { flex: 1, gap: spacing.xxs, alignItems: 'flex-start' },
});
