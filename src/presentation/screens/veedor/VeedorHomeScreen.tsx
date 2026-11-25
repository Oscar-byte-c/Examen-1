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
  Esqueleto,
  Retroalimentacion,
  ScreenContainer,
  SelloEstado,
} from '@/presentation/components';
import { mensajeDeError, useMisMesas } from '@/presentation/hooks/consultas';
import { useSession } from '@/presentation/navigation/useSession';
import { contarPendientes, useSyncStore } from '@/presentation/store/syncStore';
import { colors, spacing } from '@/presentation/theme';
import { DIGNIDADES_LISTA, SELLO_ESTADO_ENVIO, SELLO_SIN_REGISTRAR } from '@/presentation/screens/actas/etiquetas';

/**
 * Inicio del veedor (RF-09, RF-14, RF-16): sus mesas asignadas, el botón de cada acta
 * y el estado de envío de cada una. Funciona sin red con la última copia de sus mesas.
 *
 * Fase 4 («Acta y sello»): cada mesa es una hoja con sus dos actas; cada acta muestra su sello
 * de estado y UNA acción. La conexión y el envío se informan en un único aviso (BarraConexion).
 * Los nombres de mesa y recinto nunca se cortan.
 */
export default function VeedorHomeScreen() {
  const { usuario, cerrarSesion } = useSession();
  const mesas = useMisMesas();
  const actas = useSyncStore((s) => s.actas);
  const sincronizar = useSyncStore((s) => s.sincronizar);
  const sincronizando = useSyncStore((s) => s.sincronizando);
  const conectado = useSyncStore((s) => s.conectado);
  const pendientes = contarPendientes(actas);

  const actaDe = (mesaId: string, d: Dignidad): Acta | undefined => actas.find((a) => a.mesaId === mesaId && a.dignidad === d);
  const actualizar = () => void mesas.refetch();

  return (
    <ScreenContainer
      onRefresh={actualizar}
      refreshing={mesas.isRefetching}
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

      <AppCard
        variante="seccion"
        title="Mis mesas"
        subtitle={mesas.data && mesas.data.length > 0 ? `${mesas.data.length} mesa(s) asignada(s) · 2 actas por mesa` : undefined}
        icon="assignment"
      />

      {mesas.isPending ? (
        <Esqueleto bloques={2} mensaje="Cargando tus mesas…" />
      ) : mesas.isError ? (
        <Retroalimentacion tipo="error" titulo="No se pudieron cargar tus mesas" mensaje={mensajeDeError(mesas.error)} />
      ) : mesas.data.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Aún no tienes mesas asignadas"
          description="Cuando tu coordinador de recinto te asigne una mesa, aparecerá aquí."
          actionLabel="Actualizar"
          onAction={actualizar}
        />
      ) : (
        mesas.data.map((m) => (
          <AppCard key={m.id} title={`Mesa ${m.numero}`} subtitle={m.recinto.nombre} icon="ballot">
            <View style={styles.actas}>
              {DIGNIDADES_LISTA.map((d, i) => {
                const acta = actaDe(m.id, d);
                const sello = acta ? SELLO_ESTADO_ENVIO[acta.estado] : SELLO_SIN_REGISTRAR;
                return (
                  <View key={d} style={[styles.acta, i > 0 && styles.separada]}>
                    <AppText variant="bodyStrong">{DIGNIDAD_LABELS[d]}</AppText>
                    <SelloEstado
                      tono={sello.tono}
                      icono={sello.icono}
                      etiqueta={sello.etiqueta}
                      detalle={acta?.estado === 'fallida' ? acta.error : null}
                    />
                    <AppButton
                      label={acta ? `Corregir ${DIGNIDAD_LABELS[d].toLowerCase()}` : `Registrar ${DIGNIDAD_LABELS[d].toLowerCase()}`}
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
          </AppCard>
        ))
      )}

      {/* Envío manual: solo tiene sentido con señal y actas por enviar (el envío también es automático). */}
      {conectado && pendientes > 0 ? (
        <AppButton label="Enviar ahora" icon="sync" variant="outline" onPress={() => void sincronizar()} loading={sincronizando} />
      ) : null}
      <AppButton label="Actualizar mis mesas" icon="refresh" variant="ghost" onPress={actualizar} loading={mesas.isRefetching} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actas: { gap: spacing.md },
  acta: { gap: spacing.sm },
  separada: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
});
