import { StyleSheet, View } from 'react-native';

import { colors, radius, sizes, spacing, type ColorToken } from '@/presentation/theme';

import { AppIcon, type IconName } from './AppIcon';
import { AppText } from './AppText';

/**
 * Estados visuales genéricos. Cubren la necesidad de que cada persona sepa si lo que hizo
 * está en proceso, se guardó o falló (RF-16). No contienen lógica de negocio.
 */
export type StatusKind = 'pending' | 'in_progress' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

type StatusStyle = { fg: ColorToken; bg: ColorToken; icon: IconName; label: string };

const STATUS: Record<StatusKind, StatusStyle> = {
  pending: { fg: 'warning', bg: 'warningSoft', icon: 'schedule', label: 'Pendiente' },
  in_progress: { fg: 'info', bg: 'infoSoft', icon: 'sync', label: 'En proceso' },
  success: { fg: 'success', bg: 'successSoft', icon: 'check_circle', label: 'Guardado' },
  warning: { fg: 'warning', bg: 'warningSoft', icon: 'warning', label: 'Atención' },
  error: { fg: 'error', bg: 'errorSoft', icon: 'error', label: 'Falló' },
  info: { fg: 'info', bg: 'infoSoft', icon: 'info', label: 'Información' },
  neutral: { fg: 'textSecondary', bg: 'surfaceMuted', icon: 'schedule', label: 'Próximamente' },
};

export type StatusBadgeProps = {
  status: StatusKind;
  /** Texto personalizado; por defecto se usa la etiqueta del estado. */
  label?: string;
};

/** Insignia de estado: combina color, ícono y texto (el estado no depende solo del color). */
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const s = STATUS[status];
  const text = label ?? s.label;

  return (
    <View style={[styles.badge, { backgroundColor: colors[s.bg] }]} accessibilityRole="text" accessibilityLabel={`Estado: ${text}`}>
      <AppIcon name={s.icon} size={sizes.iconSm - 2} color={s.fg} />
      <AppText variant="caption" color={s.fg}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
});
