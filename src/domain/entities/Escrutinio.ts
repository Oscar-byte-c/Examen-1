import type { Dignidad, ResultadosActa } from './Acta';

/** RF-15 / S-02: avance de un recinto. */
export type AvanceRecinto = {
  recintoId: string;
  nombre: string;
  latitud: number;
  longitud: number;
  mesasTotal: number;
  mesasReportadas: number;
  mesasParciales: number;
};

export type ConteoCandidato = {
  dignidad: Dignidad;
  candidatoId: string;
  candidato: string;
  organizacion: string;
  lista: number;
  color: string;
  votos: number;
};

/** RF-15 / S-06: ubicación de cada acta registrada, con alerta de distancia (> 300 m). */
export type UbicacionActa = {
  actaId: string;
  mesaNumero: number;
  recintoId: string;
  recintoNombre: string;
  dignidad: Dignidad;
  latitud: number;
  longitud: number;
  distanciaM: number;
  fueraDeRango: boolean;
};

/** S-04: dos versiones de la misma acta que el coordinador de recinto debe revisar. */
export type ConflictoActa = {
  id: string;
  mesaNumero: number;
  dignidad: Dignidad;
  creadoEn: string;
  servidor: ResultadosActa & { version: number };
  dispositivo: ResultadosActa;
};

export type ResumenEscrutinio = {
  mesasTotal: number;
  mesasReportadas: number;
  mesasParciales: number;
  mesasFaltantes: number;
};

/** Totales de la jurisdicción a partir del avance por recinto. */
export function resumir(avance: AvanceRecinto[]): ResumenEscrutinio {
  const total = avance.reduce((s, r) => s + r.mesasTotal, 0);
  const reportadas = avance.reduce((s, r) => s + r.mesasReportadas, 0);
  const parciales = avance.reduce((s, r) => s + r.mesasParciales, 0);
  return { mesasTotal: total, mesasReportadas: reportadas, mesasParciales: parciales, mesasFaltantes: total - reportadas };
}
