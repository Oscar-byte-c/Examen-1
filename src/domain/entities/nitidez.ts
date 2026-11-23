import { NITIDEZ_MINIMA } from '../constants';

/**
 * ADR-04 / RF-11: medida de nitidez por VARIANZA DEL LAPLACIANO.
 *
 * Idea: el laplaciano resalta los bordes (cambios bruscos de brillo). Una foto nítida tiene
 * muchos bordes marcados → valores muy dispersos → varianza alta. Una foto borrosa tiene
 * transiciones suaves → valores cercanos a 0 → varianza baja.
 *
 * Recibe los píxeles RGBA (como los entrega un decodificador JPEG) y trabaja en escala de grises.
 * Es una función pura: se prueba con imágenes sintéticas, sin cámara ni frameworks.
 */
export function varianzaLaplaciano(rgba: Uint8Array, ancho: number, alto: number): number {
  if (ancho < 3 || alto < 3) return 0;
  const gris = new Float32Array(ancho * alto);
  for (let i = 0; i < ancho * alto; i++) {
    const p = i * 4;
    gris[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }

  let suma = 0;
  let sumaCuadrados = 0;
  let n = 0;
  for (let y = 1; y < alto - 1; y++) {
    for (let x = 1; x < ancho - 1; x++) {
      const i = y * ancho + x;
      // Núcleo 4-vecinos: [0 1 0; 1 -4 1; 0 1 0]
      const lap = gris[i - ancho] + gris[i + ancho] + gris[i - 1] + gris[i + 1] - 4 * gris[i];
      suma += lap;
      sumaCuadrados += lap * lap;
      n++;
    }
  }
  const media = suma / n;
  return sumaCuadrados / n - media * media;
}

export function esFotoLegible(varianza: number): boolean {
  return varianza >= NITIDEZ_MINIMA;
}
