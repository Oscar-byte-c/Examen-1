import type { Candidato, Dignidad } from '../entities/Acta';
import type { Mesa, MesaAsignada, NuevoRecintoDatos, Recinto } from '../entities/Territorio';

/** Recintos, mesas, asignaciones y catálogo electoral (RF-05 a RF-08, RF-20). */
export interface TerritorioRepository {
  listarRecintos(): Promise<Recinto[]>;
  crearRecinto(datos: NuevoRecintoDatos): Promise<string>;
  /** Mesas del recinto del coordinador, con su veedor activo y las actas recibidas. */
  listarMesasDeRecinto(recintoId: string): Promise<Mesa[]>;
  /** Asigna o reasigna una mesa; la asignación anterior se revoca en el servidor (S-05). */
  asignarMesa(mesaId: string, veedorId: string): Promise<void>;
  /** Mesas asignadas al veedor actual. Con red se actualiza la caché local; sin red se lee de ella. */
  listarMisMesas(): Promise<MesaAsignada[]>;
  /** Candidatos de una dignidad (catálogo precargado, también disponible sin red). */
  listarCandidatos(dignidad: Dignidad): Promise<Candidato[]>;
}
