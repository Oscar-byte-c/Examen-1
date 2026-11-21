import { ROLE_LABELS, Role } from '@/domain/entities/Role';
import { AppCard, AppHeader, AppText, ScreenContainer, StatusBadge } from '@/presentation/components';
import { useSession } from '@/presentation/navigation/SessionPreviewContext';

/** Inicio del Coordinador de Recinto — DEMOSTRACIÓN VISUAL, sin datos electorales. */
export default function CoordinadorRecintoHomeScreen() {
  const { signOut } = useSession();

  return (
    <ScreenContainer
      header={
        <AppHeader
          eyebrow={ROLE_LABELS[Role.COORDINADOR_RECINTO]}
          title="Mi recinto"
          subtitle="Gestiona veedores, mesas y actas"
          icon="apartment"
          action={{ icon: 'logout', label: 'Salir', onPress: signOut }}
        />
      }>
      <AppText variant="label" color="textSecondary">
        ¿Qué deseas hacer?
      </AppText>

      <AppCard
        title="Veedores"
        subtitle="Crea las cuentas de tus veedores"
        icon="person_add"
        trailing={<StatusBadge status="neutral" />}
      />
      <AppCard
        title="Asignación de mesas"
        subtitle="Asigna o reemplaza al veedor de cada mesa"
        icon="supervisor_account"
        trailing={<StatusBadge status="neutral" />}
      />
      <AppCard
        title="Actas del recinto"
        subtitle="Revisa y corrige las actas registradas"
        icon="assignment"
        trailing={<StatusBadge status="neutral" />}
      />
    </ScreenContainer>
  );
}
