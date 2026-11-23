import { QueryClient } from '@tanstack/react-query';

import { SinConexionError } from '@/domain/entities/errores';

/**
 * ADR-07: TanStack Query maneja los datos del SERVIDOR (caché, carga, error, reintentos).
 * Zustand se reserva para el estado local (sesión, conexión, cola offline).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Sin red no tiene sentido reintentar: el usuario ve el mensaje y puede reintentar después.
      retry: (intentos, error) => !(error instanceof SinConexionError) && intentos < 2,
    },
    mutations: { retry: false },
  },
});
