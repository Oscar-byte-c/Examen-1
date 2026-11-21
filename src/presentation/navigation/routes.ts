import { Role } from '@/domain/entities/Role';

/**
 * Ruta de inicio de cada rol. Única fuente de verdad para redirecciones,
 * así las pantallas no conocen la estructura de carpetas de `app/` (Expo Router).
 */
export const ROLE_HOME = {
  [Role.COORDINADOR_PROVINCIAL]: '/coordinador-provincial',
  [Role.COORDINADOR_RECINTO]: '/coordinador-recinto',
  [Role.VEEDOR]: '/veedor',
} as const;

export const LOGIN_ROUTE = '/login' as const;
