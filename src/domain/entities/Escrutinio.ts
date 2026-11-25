import { DIGNIDADES } from '../constants';
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

/**
 * RF-15: una acta del SERVIDOR con su recinto, sus votos por candidato y sus totales.
 * Estado válido para el cómputo: solo existen en el servidor las actas aceptadas por
 * `sincronizar_acta` (validadas, una por mesa y dignidad, en su versión vigente). Las pendientes
 * siguen en el celular y las versiones en conflicto esperan en `actas_conflictos` sin reemplazar
 * a la vigente: ninguna de ellas llega aquí.
 */
export type VotosActaRecinto = {
  actaId: string;
  recintoId: string;
  dignidad: Dignidad;
  totalSufragantes: number;
  votosBlancos: number;
  votosNulos: number;
  votos: { candidatoId: string; votos: number }[];
};

export type ResultadoCandidato = Omit<ConteoCandidato, 'votos'> & { votos: number; porcentaje: number };

export type ResultadoDignidad = {
  /** Actas que aportan a este resultado. */
  actas: number;
  /** Votos válidos (suma de los candidatos). */
  validos: number;
  blancos: number;
  nulos: number;
  /** Total del recinto o de la jurisdicción = válidos + blancos + nulos (= sufragantes, RF-19). */
  sufragantes: number;
  /** De mayor a menor votación (empate: por número de lista). */
  candidatos: ResultadoCandidato[];
};

export type ResultadosRecinto = {
  recintoId: string;
  nombre: string;
  mesasTotal: number;
  mesasReportadas: number;
  mesasParciales: number;
  dignidades: Record<Dignidad, ResultadoDignidad>;
};

export type ResultadosEscrutinio = {
  recintos: ResultadosRecinto[];
  /** Totales generales de la jurisdicción = suma de los recintos. */
  general: Record<Dignidad, ResultadoDignidad>;
  /** true si el total general coincide, candidato por candidato, con el conteo del servidor. */
  coincideConConteoServidor: boolean;
};

type Acumulado = { votos: Map<string, number>; actas: number; blancos: number; nulos: number; sufragantes: number };
const acumuladoVacio = (): Acumulado => ({ votos: new Map(), actas: 0, blancos: 0, nulos: 0, sufragantes: 0 });

function aResultado(candidatos: ConteoCandidato[], a: Acumulado): ResultadoDignidad {
  const filas = candidatos.map((c) => ({ ...c, votos: a.votos.get(c.candidatoId) ?? 0 }));
  const validos = filas.reduce((s, c) => s + c.votos, 0);
  return {
    actas: a.actas,
    validos,
    blancos: a.blancos,
    nulos: a.nulos,
    sufragantes: a.sufragantes,
    candidatos: filas
      .map((c) => ({ ...c, porcentaje: validos > 0 ? (c.votos / validos) * 100 : 0 }))
      .sort((x, y) => y.votos - x.votos || x.lista - y.lista),
  };
}

/**
 * RF-15: votos de cada candidato POR RECINTO y TOTALES GENERALES, separados por dignidad.
 *  - Cada acta se cuenta una sola vez (ids repetidos se descartan).
 *  - Un voto solo cuenta si el candidato pertenece a la dignidad del acta.
 *  - Los recintos sin actas aparecen con cero (estado vacío en la pantalla).
 *  - El total general es la SUMA DE LOS RECINTOS y se compara con el conteo del servidor
 *    (`conteoServidor`, RPC `conteo_por_candidato`) para detectar cualquier diferencia.
 * Función pura: se prueba sin servidor.
 */
export function consolidarResultados(
  actas: VotosActaRecinto[],
  conteoServidor: ConteoCandidato[],
  avance: AvanceRecinto[],
): ResultadosEscrutinio {
  const candidatosDe = (d: Dignidad) => conteoServidor.filter((c) => c.dignidad === d);
  const dignidadDe = new Map(conteoServidor.map((c) => [c.candidatoId, c.dignidad]));
  const nuevoRecinto = (): Record<Dignidad, Acumulado> => ({ alcaldia: acumuladoVacio(), prefectura: acumuladoVacio() });

  const porRecinto = new Map<string, Record<Dignidad, Acumulado>>();
  const vistas = new Set<string>();
  for (const acta of actas) {
    if (vistas.has(acta.actaId)) continue;
    vistas.add(acta.actaId);
    const recinto = porRecinto.get(acta.recintoId) ?? nuevoRecinto();
    porRecinto.set(acta.recintoId, recinto);
    const a = recinto[acta.dignidad];
    a.actas += 1;
    a.blancos += acta.votosBlancos;
    a.nulos += acta.votosNulos;
    a.sufragantes += acta.totalSufragantes;
    for (const v of acta.votos) {
      if (dignidadDe.get(v.candidatoId) !== acta.dignidad) continue;
      a.votos.set(v.candidatoId, (a.votos.get(v.candidatoId) ?? 0) + v.votos);
    }
  }

  const armar = (recintoId: string, nombre: string, avanceR?: AvanceRecinto): ResultadosRecinto => {
    const a = porRecinto.get(recintoId) ?? nuevoRecinto();
    return {
      recintoId,
      nombre,
      mesasTotal: avanceR?.mesasTotal ?? 0,
      mesasReportadas: avanceR?.mesasReportadas ?? 0,
      mesasParciales: avanceR?.mesasParciales ?? 0,
      dignidades: { alcaldia: aResultado(candidatosDe('alcaldia'), a.alcaldia), prefectura: aResultado(candidatosDe('prefectura'), a.prefectura) },
    };
  };
  const recintos = avance.map((r) => armar(r.recintoId, r.nombre, r));
  // Un acta de un recinto ausente del avance no se pierde: se muestra aparte.
  for (const id of porRecinto.keys()) {
    if (!avance.some((r) => r.recintoId === id)) recintos.push(armar(id, 'Recinto sin datos de avance'));
  }

  const general = {} as Record<Dignidad, ResultadoDignidad>;
  for (const d of DIGNIDADES) {
    const suma = acumuladoVacio();
    for (const r of recintos) {
      const x = r.dignidades[d];
      suma.actas += x.actas;
      suma.blancos += x.blancos;
      suma.nulos += x.nulos;
      suma.sufragantes += x.sufragantes;
      for (const c of x.candidatos) suma.votos.set(c.candidatoId, (suma.votos.get(c.candidatoId) ?? 0) + c.votos);
    }
    general[d] = aResultado(candidatosDe(d), suma);
  }

  const coincideConConteoServidor = conteoServidor.every(
    (c) => (general[c.dignidad].candidatos.find((x) => x.candidatoId === c.candidatoId)?.votos ?? 0) === c.votos,
  );
  return { recintos, general, coincideConConteoServidor };
}

/** Totales de la jurisdicción a partir del avance por recinto. */
export function resumir(avance: AvanceRecinto[]): ResumenEscrutinio {
  const total = avance.reduce((s, r) => s + r.mesasTotal, 0);
  const reportadas = avance.reduce((s, r) => s + r.mesasReportadas, 0);
  const parciales = avance.reduce((s, r) => s + r.mesasParciales, 0);
  return { mesasTotal: total, mesasReportadas: reportadas, mesasParciales: parciales, mesasFaltantes: total - reportadas };
}
