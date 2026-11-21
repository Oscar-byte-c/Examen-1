/**
 * Roles del sistema (capa de dominio: sin dependencias de frameworks).
 * Los valores coinciden con los que se almacenarán en la base de datos.
 */
export const Role = {
  COORDINADOR_PROVINCIAL: 'coordinador_provincial',
  COORDINADOR_RECINTO: 'coordinador_recinto',
  VEEDOR: 'veedor',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_LABELS: Record<Role, string> = {
  [Role.COORDINADOR_PROVINCIAL]: 'Coordinador Provincial',
  [Role.COORDINADOR_RECINTO]: 'Coordinador de Recinto',
  [Role.VEEDOR]: 'Veedor',
};
