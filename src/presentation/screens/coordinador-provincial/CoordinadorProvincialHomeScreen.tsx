import { ROLE_LABELS, Role } from '@/domain/entities/Role';
import { AppCard, AppHeader, AppText, EmptyState, ScreenContainer, StatusBadge } from '@/presentation/components';
import { useSession } from '@/presentation/navigation/SessionPreviewContext';

/** Inicio del Coordinador Provincial — DEMOSTRACIÓN VISUAL, sin datos electorales. */
export default function CoordinadorProvincialHomeScreen() {
  const { signOut } = useSession();

  return (
    <ScreenContainer
      header={
        <AppHeader
          eyebrow={ROLE_LABELS[Role.COORDINADOR_PROVINCIAL]}
          title="Escrutinio provincial"
          subtitle="Seguimiento de la jornada electoral"
          icon="map"
          action={{ icon: 'logout', label: 'Salir', onPress: signOut }}
        />
      }>
      <AppCard title="Avance del escrutinio" icon="bar_chart" trailing={<StatusBadge status="neutral" />}>
        <EmptyState
          icon="bar_chart"
          title="Sin actas registradas"
          description="El avance por recinto y los resultados por candidato se mostrarán aquí en tiempo real."
        />
      </AppCard>

      <AppText variant="label" color="textSecondary">
        Gestión del territorio
      </AppText>

      <AppCard
        title="Recintos electorales"
        subtitle="Consulta y agrega recintos"
        icon="apartment"
        trailing={<StatusBadge status="neutral" />}
      />
      <AppCard
        title="Coordinadores de recinto"
        subtitle="Crea cuentas y asígnalas a cada recinto"
        icon="badge"
        trailing={<StatusBadge status="neutral" />}
      />
    </ScreenContainer>
  );
}
