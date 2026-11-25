import { GEO_ALERT_THRESHOLD_METERS } from '../constants';

export type Coordenadas = { latitud: number; longitud: number };

/** Lectura de GPS con su precisión (radio de error en metros, según el dispositivo). */
export type Ubicacion = Coordenadas & { precisionM: number; capturadaEn: string };

const RADIO_TIERRA_M = 6_371_000;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distancia en metros entre dos puntos (fórmula de Haversine). El servidor usa la misma. */
export function distanciaMetros(a: Coordenadas, b: Coordenadas): number {
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/** S-06: alerta (no bloqueo) si la captura está a más de 300 m del recinto. */
export function fueraDeRango(distanciaM: number): boolean {
  return distanciaM > GEO_ALERT_THRESHOLD_METERS;
}

/** ADR-04: de varias lecturas, se conserva la de mejor precisión (menor radio de error). */
export function mejorLectura(lecturas: Ubicacion[]): Ubicacion | null {
  return lecturas.reduce<Ubicacion | null>((mejor, l) => (!mejor || l.precisionM < mejor.precisionM ? l : mejor), null);
}

/** Coordenadas utilizables: números finitos dentro de los rangos geográficos. */
export function coordenadasValidas(c: Partial<Coordenadas> | null | undefined): c is Coordenadas {
  return (
    !!c &&
    Number.isFinite(c.latitud) &&
    Number.isFinite(c.longitud) &&
    Math.abs(c.latitud as number) <= 90 &&
    Math.abs(c.longitud as number) <= 180
  );
}

/** Distancia y alerta ya calculadas por el SERVIDOR al recibir el acta (valores oficiales, S-06). */
export type DistanciaServidor = { distanciaM: number; fueraDeRango: boolean };

/**
 * Cómo se presenta la ubicación de una evidencia (RF-12 / S-06):
 *  - sin_ubicacion: no hay coordenadas válidas. NUNCA se sustituyen por otras (p. ej. la ubicación actual).
 *  - sin_recinto: hay captura, pero no se conocen las coordenadas del recinto para comparar.
 *  - evaluada: captura + recinto + distancia. `origen` dice quién la calculó: el servidor
 *    (oficial, tras sincronizar) o el dispositivo (estimación previa al envío, misma fórmula).
 */
export type EvaluacionUbicacion =
  | { estado: 'sin_ubicacion' }
  | { estado: 'sin_recinto'; captura: Ubicacion }
  | {
      estado: 'evaluada';
      captura: Ubicacion;
      recinto: Coordenadas;
      distanciaM: number;
      fueraDeRango: boolean;
      origen: 'servidor' | 'dispositivo';
    };

export function evaluarUbicacionEvidencia(
  captura: Ubicacion | null | undefined,
  recinto: Coordenadas | null | undefined,
  servidor?: DistanciaServidor | null,
): EvaluacionUbicacion {
  if (!captura || !coordenadasValidas(captura)) return { estado: 'sin_ubicacion' };
  if (!recinto || !coordenadasValidas(recinto)) return { estado: 'sin_recinto', captura };
  if (servidor && Number.isFinite(servidor.distanciaM)) {
    return { estado: 'evaluada', captura, recinto, ...servidor, origen: 'servidor' };
  }
  const distanciaM = distanciaMetros(captura, recinto);
  return { estado: 'evaluada', captura, recinto, distanciaM, fueraDeRango: fueraDeRango(distanciaM), origen: 'dispositivo' };
}
