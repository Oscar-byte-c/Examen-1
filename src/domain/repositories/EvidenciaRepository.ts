import type { Ubicacion } from '../entities/geo';

/** Acceso al hardware para la evidencia del acta (ADR-04). */
export interface EvidenciaRepository {
  /** Reduce la foto y calcula la varianza del laplaciano (nitidez). */
  medirNitidez(fotoUri: string): Promise<number>;
  /**
   * Reúne hasta `lecturas` posiciones de GPS tomadas DESDE `desde` (las anteriores se ignoran),
   * esperando como máximo `limiteMs` en total. Lanza PermisoUbicacionError, UbicacionAproximadaError,
   * GpsDesactivadoError o SinSenalGpsError (con diagnóstico) si no obtiene ninguna. Todas son
   * UbicacionRequeridaError.
   */
  leerUbicaciones(lecturas: number, desde: Date, limiteMs: number): Promise<Ubicacion[]>;
  /**
   * Enciende el GPS en segundo plano (sin pedir permiso) para que tenga señal cuando se tome la
   * foto. NO entrega ubicaciones como evidencia. Devuelve la función que lo apaga.
   */
  prepararUbicacion(): () => void;
}
