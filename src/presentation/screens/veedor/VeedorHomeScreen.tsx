import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ROLE_LABELS, Role } from '@/domain/entities/Role';
import { AppCard, AppHeader, AppText, EmptyState, ScreenContainer, StatusBadge } from '@/presentation/components';
import { useSession } from '@/presentation/navigation/SessionPreviewContext';
import { spacing } from '@/presentation/theme';

/** Inicio del Veedor — DEMOSTRACIÓN VISUAL, sin datos electorales. */
export default function VeedorHomeScreen() {
  const { signOut } = useSession();

  return (
    <ScreenContainer
      header={
        <AppHeader
          eyebrow={ROLE_LABELS[Role.VEEDOR]}
          title="Mis mesas"
          subtitle="Registra las actas de alcaldía y prefectura"
          icon="how_to_vote"
          action={{ icon: 'logout', label: 'Salir', onPress: signOut }}
        />
      }>
      <AppCard title="Mesas asignadas" icon="assignment" trailing={<StatusBadge status="neutral" />}>
        <EmptyState
          icon="inbox"
          title="Aún no tienes mesas asignadas"
          description="Cuando tu coordinador de recinto te asigne una mesa, aparecerá aquí."
        />
      </AppCard>

      <AppCard title="Estado de tus envíos" subtitle="Así sabrás qué pasó con cada acta." icon="cloud_done">
        <View style={styles.legend}>
          <LegendRow badge={<StatusBadge status="pending" />} text="Guardada en el celular, esperando señal." />
          <LegendRow badge={<StatusBadge status="in_progress" label="Enviando" />} text="Se está enviando ahora." />
          <LegendRow badge={<StatusBadge status="success" label="Enviada" />} text="Llegó correctamente." />
          <LegendRow badge={<StatusBadge status="error" />} text="No se pudo enviar; se reintentará." />
        </View>
      </AppCard>
    </ScreenContainer>
  );
}

function LegendRow({ badge, text }: { badge: ReactNode; text: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={styles.legendBadge}>{badge}</View>
      <AppText variant="bodySmall" color="textSecondary" style={styles.legendText}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { gap: spacing.sm },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendBadge: { width: 124 },
  legendText: { flex: 1 },
});
