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
