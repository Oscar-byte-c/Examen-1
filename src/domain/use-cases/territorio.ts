import type { Candidato, Dignidad } from '../entities/Acta';
import type { Mesa, MesaAsignada, NuevoRecintoDatos, Recinto } from '../entities/Territorio';
import type { TerritorioRepository } from '../repositories/TerritorioRepository';

export class ListarRecintos {
  constructor(private readonly territorio: TerritorioRepository) {}
  execute(): Promise<Recinto[]> {
    return this.territorio.listarRecintos();
  }
}

/** RF-06: el coordinador provincial registra un recinto (y sus mesas) en su jurisdicción. */
export class CrearRecinto {
  constructor(private readonly territorio: TerritorioRepository) {}
  execute(datos: NuevoRecintoDatos): Promise<string> {
    return this.territorio.crearRecinto(datos);
  }
}

export class ListarMesasDeRecinto {
  constructor(private readonly territorio: TerritorioRepository) {}
  execute(recintoId: string): Promise<Mesa[]> {
    return this.territorio.listarMesasDeRecinto(recintoId);
  }
}

/** RF-08 / RF-20 / S-05: asignar o reasignar al instante una mesa a otro veedor. */
export class AsignarMesa {
  constructor(private readonly territorio: TerritorioRepository) {}
  execute(mesaId: string, veedorId: string): Promise<void> {
    return this.territorio.asignarMesa(mesaId, veedorId);
  }
}

export class ListarMisMesas {
  constructor(private readonly territorio: TerritorioRepository) {}
  execute(): Promise<MesaAsignada[]> {
    return this.territorio.listarMisMesas();
  }
}

export class ListarCandidatos {
  constructor(private readonly territorio: TerritorioRepository) {}
  execute(dignidad: Dignidad): Promise<Candidato[]> {
    return this.territorio.listarCandidatos(dignidad);
  }
}
