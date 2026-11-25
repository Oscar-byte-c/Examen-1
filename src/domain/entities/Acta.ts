import { z } from 'zod';

import type { DistanciaServidor, Ubicacion } from './geo';

export const Dignidad = { ALCALDIA: 'alcaldia', PREFECTURA: 'prefectura' } as const;
export type Dignidad = (typeof Dignidad)[keyof typeof Dignidad];

export const DIGNIDAD_LABELS: Record<Dignidad, string> = {
  alcaldia: 'Alcaldía',
  prefectura: 'Prefectura',
};

export type Candidato = {
  id: string;
  nombres: string;
  dignidad: Dignidad;
  organizacion: string;
  siglas: string;
  lista: number;
  color: string;
};

/**
 * RF-14: estado del envío de un acta guardada en el celular.
 *  pendiente → guardada, esperando señal · enviando → en proceso · enviada → confirmada por
 *  el servidor · fallida → se reintentará · conflicto → el coordinador decide (S-04).
 */
export const EstadoEnvio = {
  PENDIENTE: 'pendiente',
  ENVIANDO: 'enviando',
  ENVIADA: 'enviada',
  FALLIDA: 'fallida',
  CONFLICTO: 'conflicto',
} as const;
export type EstadoEnvio = (typeof EstadoEnvio)[keyof typeof EstadoEnvio];

export type VotoCandidato = { candidatoId: string; votos: number };

export type ResultadosActa = {
  totalSufragantes: number;
  votosBlancos: number;
  votosNulos: number;
  votos: VotoCandidato[];
};

/** Acta tal como vive en el dispositivo (fuente de verdad local, ADR-03). */
export type Acta = ResultadosActa & {
  /** UUID generado en el cliente (ADR-10). */
  id: string;
  mesaId: string;
  dignidad: Dignidad;
  /** Ruta del archivo de la foto en el almacenamiento persistente de la app ('' si solo está en el servidor). */
  fotoUri: string;
  /** Ubicación GPS tomada al capturar la foto (RF-12): es la ubicación ORIGINAL de la evidencia. */
  ubicacion: Ubicacion;
  /** Solo en actas leídas del servidor: ruta de la foto en Storage y la distancia oficial (S-06). */
  evidenciaServidor?: EvidenciaServidor | null;
  /** Versión del servidor sobre la que se hizo el cambio (0 = acta nueva). S-04. */
  versionBase: number;
  estado: EstadoEnvio;
  /** Mensaje del último error de envío, si lo hubo. */
  error: string | null;
  actualizadaEn: string;
};

// ---------------------------------------------------------------------------
// RF-10 / RF-19 / S-03: validación matemática BLOQUEANTE.
// ---------------------------------------------------------------------------

export type ErrorActa = { campo: string; mensaje: string };

/**
 * Regla de negocio pura. Devuelve la lista de errores (vacía = acta coherente):
 *  1. Ningún valor negativo ni decimal.
 *  2. Ningún candidato con más votos que el total de sufragantes.
 *  3. Votos válidos + blancos + nulos = total de sufragantes.
 *  4. Un valor por cada candidato de la dignidad.
 */
export function validarResultados(r: ResultadosActa, candidatosEsperados: number): ErrorActa[] {
  const errores: ErrorActa[] = [];
  const entero = (n: number) => Number.isInteger(n) && n >= 0;

  if (!entero(r.totalSufragantes)) errores.push({ campo: 'totalSufragantes', mensaje: 'Debe ser un número entero, sin signo negativo.' });
  if (!entero(r.votosBlancos)) errores.push({ campo: 'votosBlancos', mensaje: 'Debe ser un número entero, sin signo negativo.' });
  if (!entero(r.votosNulos)) errores.push({ campo: 'votosNulos', mensaje: 'Debe ser un número entero, sin signo negativo.' });
  if (r.votos.length !== candidatosEsperados) {
    errores.push({ campo: 'votos', mensaje: `Faltan votos: se esperan ${candidatosEsperados} candidatos.` });
  }

  for (const v of r.votos) {
    if (!entero(v.votos)) {
      errores.push({ campo: `votos.${v.candidatoId}`, mensaje: 'Debe ser un número entero, sin signo negativo.' });
    } else if (v.votos > r.totalSufragantes) {
      errores.push({ campo: `votos.${v.candidatoId}`, mensaje: 'No puede superar el total de sufragantes.' });
    }
  }
  if (errores.length > 0) return errores;

  const validos = r.votos.reduce((s, v) => s + v.votos, 0);
  const suma = validos + r.votosBlancos + r.votosNulos;
  if (suma !== r.totalSufragantes) {
    errores.push({
      campo: 'totalSufragantes',
      mensaje: `La suma no cuadra: válidos (${validos}) + blancos (${r.votosBlancos}) + nulos (${r.votosNulos}) = ${suma}, pero el total de sufragantes es ${r.totalSufragantes}.`,
    });
  }
  return errores;
}

/**
 * Resumen en vivo de la suma mientras se escribe (RF-19): la UI solo lo muestra, la regla
 * vive aquí. Los campos vacíos o no numéricos cuentan como 0.
 */
export function resumenSuma(v: {
  totalSufragantes?: string;
  votosBlancos?: string;
  votosNulos?: string;
  votos?: Record<string, string | undefined>;
}) {
  const n = (s?: string) => (s && /^\d+$/.test(s.trim()) ? Number(s) : 0);
  const validos = Object.values(v.votos ?? {}).reduce((s, x) => s + n(x), 0);
  const total = validos + n(v.votosBlancos) + n(v.votosNulos);
  return { validos, blancos: n(v.votosBlancos), nulos: n(v.votosNulos), total, cuadra: total > 0 && total === n(v.totalSufragantes) };
}

/** Campo numérico del formulario: el usuario escribe texto; se acepta solo un entero ≥ 0. */
const campoEntero = z
  .string()
  .trim()
  .min(1, 'Escribe un número (0 si no hay votos).')
  .regex(/^\d+$/, 'Solo números enteros, sin signos ni decimales.')
  .transform(Number);

/**
 * Esquema Zod del formulario de acta (ADR-08 + ADR-09). Las reglas cruzadas reutilizan
 * `validarResultados`, así la regla existe en un solo lugar del cliente.
 */
export function crearFormularioActaSchema(candidatoIds: string[]) {
  return z
    .object({
      totalSufragantes: campoEntero,
      votosBlancos: campoEntero,
      votosNulos: campoEntero,
      votos: z.object(Object.fromEntries(candidatoIds.map((id) => [id, campoEntero])) as Record<string, typeof campoEntero>),
    })
    .superRefine((d, ctx) => {
      const errores = validarResultados(aResultados(d), candidatoIds.length);
      for (const e of errores) ctx.addIssue({ code: 'custom', message: e.mensaje, path: e.campo.split('.') });
    });
}

export type FormularioActaEntrada = z.input<ReturnType<typeof crearFormularioActaSchema>>;
export type FormularioActaSalida = z.output<ReturnType<typeof crearFormularioActaSchema>>;

export function aResultados(d: {
  totalSufragantes: number;
  votosBlancos: number;
  votosNulos: number;
  votos: Record<string, number>;
}): ResultadosActa {
  return {
    totalSufragantes: d.totalSufragantes,
    votosBlancos: d.votosBlancos,
    votosNulos: d.votosNulos,
    votos: Object.entries(d.votos).map(([candidatoId, votos]) => ({ candidatoId, votos })),
  };
}

/** Evidencia tal como quedó registrada en el servidor (bucket privado; se lee con permiso RLS). */
export type EvidenciaServidor = DistanciaServidor & { fotoPath: string };

/** Evidencia lista para adjuntar: foto ya analizada y ubicación tomada al disparar. */
export type EvidenciaActa = { fotoUri: string; nitidez: number; ubicacion: Ubicacion };
