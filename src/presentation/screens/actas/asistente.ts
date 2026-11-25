import { resumenSuma } from '@/domain/entities/Acta';

/**
 * Lógica de PRESENTACIÓN del asistente de registro de actas (Fase 4). No contiene reglas de
 * negocio: la validación bloqueante sigue siendo el esquema Zod del dominio
 * (`crearFormularioActaSchema` → `validarResultados`) y el servidor (S-03). Aquí solo se decide
 * qué mostrar: el balance en vivo y a qué paso llevar al usuario cuando un campo tiene un error.
 */

/** Pasos del asistente. Una secuencia real (RF-09 a RF-12), por eso van numerados. */
export const PASOS_ACTA = ['Sufragantes', 'Votos', 'Evidencia', 'Revisar'] as const;
export const PASO = { SUFRAGANTES: 0, VOTOS: 1, EVIDENCIA: 2, REVISAR: 3 } as const;

/** Mismo criterio que `resumenSuma` del dominio: solo un entero ≥ 0 cuenta; lo demás es 0. */
const entero = (s?: string) => (s && /^\d+$/.test(s.trim()) ? Number(s) : null);

export type EstadoBalance = 'sin_total' | 'faltan' | 'sobran' | 'cuadra';

export type Balance = {
  /** Total de sufragantes escrito en el paso 1 (null si aún no es un número válido). */
  declarado: number | null;
  validos: number;
  blancos: number;
  nulos: number;
  /** válidos + blancos + nulos. */
  suma: number;
  /** |declarado − suma| (0 si cuadra o si no hay total). */
  diferencia: number;
  estado: EstadoBalance;
};

/** Balance en vivo para la barra del paso 2 y el resumen. `cuadra` coincide con `resumenSuma().cuadra`. */
export function calcularBalance(v: Parameters<typeof resumenSuma>[0]): Balance {
  const r = resumenSuma(v);
  const declarado = entero(v.totalSufragantes);
  const base = { declarado, validos: r.validos, blancos: r.blancos, nulos: r.nulos, suma: r.total };
  if (declarado === null) return { ...base, diferencia: 0, estado: 'sin_total' };
  if (r.cuadra) return { ...base, diferencia: 0, estado: 'cuadra' };
  return { ...base, diferencia: Math.abs(declarado - r.total), estado: r.total < declarado ? 'faltan' : 'sobran' };
}

/**
 * Paso al que llevar al usuario por un error de un campo al intentar sellar.
 * El dominio asigna «La suma no cuadra» a `totalSufragantes`; si ese total ya es un número
 * válido, lo que hay que revisar son los votos (paso 2, donde está el balance).
 */
export function pasoDeCampo(campo: string, totalEsNumero = false): number {
  if (campo === 'totalSufragantes') return totalEsNumero ? PASO.VOTOS : PASO.SUFRAGANTES;
  return PASO.VOTOS;
}

/** ¿Hay un entero válido escrito? (para marcar «Falta este dato» sin adelantarse a Zod). */
export const tieneNumero = (s?: string) => entero(s) !== null;
