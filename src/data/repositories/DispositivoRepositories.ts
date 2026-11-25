import type { Ubicacion } from '@/domain/entities/geo';
import type { ConectividadRepository } from '@/domain/repositories/ConectividadRepository';
import type { EvidenciaRepository } from '@/domain/repositories/EvidenciaRepository';

import { conectividad, leerUbicaciones, medirNitidez, prepararGps } from '../datasources/local/dispositivo';

/** Cámara/GPS: delega en el datasource del dispositivo (ADR-04). */
export class EvidenciaRepositoryImpl implements EvidenciaRepository {
  medirNitidez(fotoUri: string): Promise<number> {
    return medirNitidez(fotoUri);
  }
  leerUbicaciones(lecturas: number, desde: Date, limiteMs: number): Promise<Ubicacion[]> {
    return leerUbicaciones(lecturas, desde, limiteMs);
  }
  prepararUbicacion(): () => void {
    return prepararGps();
  }
}

/** Red: NetInfo (ADR-10). */
export class ConectividadRepositoryImpl implements ConectividadRepository {
  hayConexion(): Promise<boolean> {
    return conectividad.hayConexion();
  }
  observar(callback: (conectado: boolean) => void): () => void {
    return conectividad.observar(callback);
  }
}
