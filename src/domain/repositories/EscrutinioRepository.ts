import type { Dignidad } from '../entities/Acta';
import type { AvanceRecinto, ConflictoActa, ConteoCandidato, UbicacionActa, VotosActaRecinto } from '../entities/Escrutinio';
import type { HistorialActa } from '../entities/Historial';

/** Seguimiento del escrutinio en vivo (RF-15, ADR-07), conflictos (S-04) e historial (ADR-11). */
export interface EscrutinioRepository {
  avancePorRecinto(): Promise<AvanceRecinto[]>;
  conteoPorCandidato(): Promise<ConteoCandidato[]>;
  /** RF-15: actas del servidor con su recinto, votos y totales (la RLS limita a lo que el rol puede ver). */
  votosPorActa(): Promise<VotosActaRecinto[]>;
  /** S-04 / ADR-11: versiones de un acta (solo coordinadores; la RLS lo impone). null si no existe. */
  historialActa(mesaId: string, dignidad: Dignidad): Promise<HistorialActa | null>;
  ubicacionesActas(): Promise<UbicacionActa[]>;
  conflictosPendientes(): Promise<ConflictoActa[]>;
  resolverConflicto(conflictoId: string, eleccion: 'servidor' | 'dispositivo'): Promise<void>;
  /** Supabase Realtime: avisa cuando llegan o cambian actas/conflictos. Devuelve la función para cerrar el canal. */
  suscribirCambios(callback: () => void): () => void;
}
