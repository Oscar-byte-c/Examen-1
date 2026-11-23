import { Role } from '@/domain/entities/Role';

/**
 * Rutas de la app. Única fuente de verdad para las redirecciones, así las pantallas no
 * conocen la estructura de carpetas de `app/` (Expo Router).
 */
export const ROLE_HOME = {
  [Role.COORDINADOR_PROVINCIAL]: '/coordinador-provincial',
  [Role.COORDINADOR_RECINTO]: '/coordinador-recinto',
  [Role.VEEDOR]: '/veedor',
} as const;

export const LOGIN_ROUTE = '/login' as const;
export const CAMBIAR_CLAVE_ROUTE = '/cambiar-clave' as const;
export const RESTABLECER_CLAVE_ROUTE = '/restablecer-clave' as const;
export const CORREO_VERIFICADO_ROUTE = '/correo-verificado' as const;
