import type { Dignidad } from '../entities/Acta';
import {
  consolidarResultados,
  type AvanceRecinto,
  type ConflictoActa,
  type ConteoCandidato,
  type ResultadosEscrutinio,
  type UbicacionActa,
} from '../entities/Escrutinio';
import type { HistorialActa } from '../entities/Historial';
import type { ConectividadRepository } from '../repositories/ConectividadRepository';
import type { EscrutinioRepository } from '../repositories/EscrutinioRepository';

export class ObtenerAvance {
  constructor(private readonly escrutinio: EscrutinioRepository) {}
  execute(): Promise<AvanceRecinto[]> {
    return this.escrutinio.avancePorRecinto();
  }
}

export class ObtenerConteo {
  constructor(private readonly escrutinio: EscrutinioRepository) {}
  execute(): Promise<ConteoCandidato[]> {
    return this.escrutinio.conteoPorCandidato();
  }
}

/**
 * RF-15: votos por candidato en cada recinto y totales generales, por dignidad. Las tres
 * consultas van en paralelo; la agrupación y la verificación son reglas del dominio
 * (`consolidarResultados`).
 */
export class ObtenerResultadosPorRecinto {
  constructor(private readonly escrutinio: EscrutinioRepository) {}
  async execute(): Promise<ResultadosEscrutinio> {
    const [actas, conteo, avance] = await Promise.all([
      this.escrutinio.votosPorActa(),
      this.escrutinio.conteoPorCandidato(),
      this.escrutinio.avancePorRecinto(),
    ]);
    return consolidarResultados(actas, conteo, avance);
  }
}

/** S-04 / ADR-11: auditoría de un acta (versiones, autores y fechas). */
export class ConsultarHistorialActa {
  constructor(private readonly escrutinio: EscrutinioRepository) {}
  execute(mesaId: string, dignidad: Dignidad): Promise<HistorialActa | null> {
    return this.escrutinio.historialActa(mesaId, dignidad);
  }
}

export class ObtenerUbicacionesActas {
  constructor(private readonly escrutinio: EscrutinioRepository) {}
  execute(): Promise<UbicacionActa[]> {
    return this.escrutinio.ubicacionesActas();
  }
}

export class ListarConflictos {
  constructor(private readonly escrutinio: EscrutinioRepository) {}
  execute(): Promise<ConflictoActa[]> {
    return this.escrutinio.conflictosPendientes();
  }
}

/** S-04: el coordinador de recinto decide qué versión prevalece. */
export class ResolverConflicto {
  constructor(private readonly escrutinio: EscrutinioRepository) {}
  execute(conflictoId: string, eleccion: 'servidor' | 'dispositivo'): Promise<void> {
    return this.escrutinio.resolverConflicto(conflictoId, eleccion);
  }
}

/** ADR-07: actualización en vivo (Supabase Realtime). */
export class SuscribirseEscrutinio {
  constructor(private readonly escrutinio: EscrutinioRepository) {}
  execute(callback: () => void): () => void {
    return this.escrutinio.suscribirCambios(callback);
  }
}

/** ADR-10: cambios de conectividad (disparan la sincronización automática). */
export class ObservarConectividad {
  constructor(private readonly conectividad: ConectividadRepository) {}
  execute(callback: (conectado: boolean) => void): () => void {
    return this.conectividad.observar(callback);
  }
}
