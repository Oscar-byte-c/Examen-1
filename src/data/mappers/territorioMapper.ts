import type { Candidato, Dignidad } from '@/domain/entities/Acta';
import type { Recinto } from '@/domain/entities/Territorio';

export type RecintoDTO = {
  id: string;
  nombre: string;
  direccion: string;
  parroquia: string;
  latitud: number;
  longitud: number;
};

export type CandidatoDTO = {
  id: string;
  nombres: string;
  dignidad: string;
  organizacion: { nombre: string; siglas: string; lista: number; color: string };
};

export const aRecinto = (r: RecintoDTO): Recinto => ({
  id: r.id,
  nombre: r.nombre,
  direccion: r.direccion,
  parroquia: r.parroquia,
  latitud: r.latitud,
  longitud: r.longitud,
});

export const aCandidato = (c: CandidatoDTO): Candidato => ({
  id: c.id,
  nombres: c.nombres,
  dignidad: c.dignidad as Dignidad,
  organizacion: c.organizacion.nombre,
  siglas: c.organizacion.siglas,
  lista: c.organizacion.lista,
  color: c.organizacion.color,
});
