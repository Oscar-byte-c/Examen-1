import type { Acta, Dignidad } from '../entities/Acta';

export type ResultadoSincronizacion = { enviadas: number; conflictos: number; fallidas: number };

/**
 * Actas con almacenamiento local primero (ADR-03) y outbox (ADR-10).
 * Guardar NUNCA depende de la red: el envío ocurre después, en `sincronizar()`.
 */
export interface ActaRepository {
  /** Guarda (o reemplaza) el acta en SQLite y encola una operación de envío, en una transacción. */
  guardarLocal(acta: Omit<Acta, 'estado' | 'error' | 'actualizadaEn'>): Promise<void>;
  /** Acta local de una mesa y dignidad; si no existe localmente y hay red, la trae del servidor. */
  obtener(mesaId: string, dignidad: Dignidad): Promise<Acta | null>;
  /** Todas las actas locales (RF-14: estado de cada una). */
  listarLocales(): Promise<Acta[]>;
  /** Envía la outbox. Un solo proceso a la vez (control de concurrencia, ADR-10). */
  sincronizar(): Promise<ResultadoSincronizacion>;
  /** Notifica cada vez que cambia el estado de alguna acta local. */
  observarCambios(callback: () => void): () => void;
  /** Copia la foto temporal de la cámara a almacenamiento persistente y devuelve su nueva ruta. */
  conservarFoto(uriTemporal: string, actaId: string): Promise<string>;
}
