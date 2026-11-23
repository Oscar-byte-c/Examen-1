import type { AvanceRecinto, ConflictoActa, ConteoCandidato, UbicacionActa } from '../entities/Escrutinio';

/** Seguimiento del escrutinio en vivo (RF-15, ADR-07) y conflictos (S-04). */
export interface EscrutinioRepository {
  avancePorRecinto(): Promise<AvanceRecinto[]>;
  conteoPorCandidato(): Promise<ConteoCandidato[]>;
  ubicacionesActas(): Promise<UbicacionActa[]>;
  conflictosPendientes(): Promise<ConflictoActa[]>;
  resolverConflicto(conflictoId: string, eleccion: 'servidor' | 'dispositivo'): Promise<void>;
  /** Supabase Realtime: avisa cuando llegan o cambian actas/conflictos. Devuelve la función para cerrar el canal. */
  suscribirCambios(callback: () => void): () => void;
}
