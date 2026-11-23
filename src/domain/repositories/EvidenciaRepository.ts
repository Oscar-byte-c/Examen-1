import type { Ubicacion } from '../entities/geo';

/** Acceso al hardware para la evidencia del acta (ADR-04). */
export interface EvidenciaRepository {
  /** Reduce la foto y calcula la varianza del laplaciano (nitidez). */
  medirNitidez(fotoUri: string): Promise<number>;
  /** Pide permiso y toma `lecturas` posiciones de GPS. Lanza UbicacionRequeridaError si no es posible. */
  leerUbicaciones(lecturas: number): Promise<Ubicacion[]>;
}
