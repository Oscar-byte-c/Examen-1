import { z } from 'zod';

import type { Dignidad } from './Acta';

export type Recinto = {
  id: string;
  nombre: string;
  direccion: string;
  parroquia: string;
  latitud: number;
  longitud: number;
};

/** S-02: estado de reporte de una mesa según cuántas de sus 2 actas llegaron al servidor. */
export const EstadoReporte = {
  SIN_REPORTE: 'sin_reporte',
  PARCIAL: 'parcial',
  REPORTADA: 'reportada',
} as const;
export type EstadoReporte = (typeof EstadoReporte)[keyof typeof EstadoReporte];

export function estadoReporte(dignidadesRecibidas: readonly Dignidad[]): EstadoReporte {
  const distintas = new Set(dignidadesRecibidas).size;
  if (distintas >= 2) return EstadoReporte.REPORTADA;
  return distintas === 1 ? EstadoReporte.PARCIAL : EstadoReporte.SIN_REPORTE;
}

export type Mesa = {
  id: string;
  recintoId: string;
  numero: number;
  /** Veedor con la asignación ACTIVA (null si la mesa no tiene veedor). */
  veedorId: string | null;
  veedorNombre: string | null;
  dignidadesRecibidas: Dignidad[];
};

/** Mesa vista por el veedor, con los datos del recinto que necesita para trabajar sin red. */
export type MesaAsignada = {
  id: string;
  numero: number;
  recinto: Recinto;
};

/** Texto → número, aceptando coma o punto decimal. */
const coordenada = (min: number, max: number, mensaje: string) =>
  z
    .string()
    .trim()
    .transform((s) => Number(s.replace(',', '.')))
    .pipe(z.number({ error: mensaje }).min(min, mensaje).max(max, mensaje));

/** RF-06: registro de un recinto por el coordinador provincial. */
export const nuevoRecintoSchema = z.object({
  nombre: z.string().trim().min(3, 'Escribe el nombre del recinto (mínimo 3 letras).').max(120),
  direccion: z.string().trim().min(3, 'Escribe la dirección.'),
  parroquia: z.string().trim().min(3, 'Escribe la parroquia.'),
  latitud: coordenada(-90, 90, 'Latitud no válida.'),
  longitud: coordenada(-180, 180, 'Longitud no válida.'),
  numeroMesas: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Escribe un número entero.')
    .transform(Number)
    .pipe(z.number().min(1, 'Debe tener al menos 1 mesa.').max(100, 'Máximo 100 mesas.')),
});
export type NuevoRecintoDatos = z.output<typeof nuevoRecintoSchema>;
