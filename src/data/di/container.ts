/**
 * Contenedor de dependencias (composition root), ubicado en la capa `data`.
 *
 * ¿Por qué aquí? Su trabajo es instanciar las implementaciones concretas de `data`
 * (repositorios, datasources) e inyectarlas en los casos de uso de `domain`. `data` ya
 * conoce ambas cosas, así que la dirección de dependencias no se rompe.
 *
 * Regla: `presentation` solo puede importar de `data` ESTE archivo (para obtener casos
 * de uso ya construidos); nunca repositorios, datasources ni Supabase directamente.
 *
 * Fase actual: sin dependencias registradas todavía.
 */
export const container = {} as const;
