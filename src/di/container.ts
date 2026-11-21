/**
 * Contenedor de dependencias (composition root).
 *
 * Aquí se instanciarán las implementaciones de la capa `data` (repositorios, datasources)
 * y se inyectarán en los casos de uso de `domain`. La capa `presentation` solo obtiene
 * casos de uso desde este contenedor; nunca importa Supabase ni SQLite directamente.
 *
 * Fase actual: sin dependencias registradas todavía.
 */
export const container = {} as const;
