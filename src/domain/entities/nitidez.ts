import { NITIDEZ_MINIMA } from '../constants';

/**
 * ADR-04 / RF-11: nitidez por VARIANZA DEL LAPLACIANO (segunda derivada del brillo).
 *
 * Idea: la segunda derivada resalta los bordes. Una foto nítida tiene bordes marcados → valores
 * muy dispersos → varianza alta. Una foto borrosa tiene transiciones suaves → varianza baja.
 *
 * Tres ajustes para que funcione con fotos REALES de un celular (calibrados por simulación,
 * ver ADR-C02 §5):
 *  1. Promedio 2×2 antes de derivar: el laplaciano amplifica el ruido del sensor, y ese ruido
 *     daba varianzas altas incluso en fotos muy borrosas (el umbral nunca se alcanzaba).
 *  2. Por ejes (∂²/∂x² y ∂²/∂y² por separado) y se toma el MENOR: si el celular se movió,
 *     se borronean los bordes en una dirección y los de la otra siguen nítidos; la suma
 *     (laplaciano clásico) escondía ese movimiento.
 *  3. Por bloques (cuadrícula de hasta 8×8) y se toma el percentil 75: el borde del papel
 *     contra la mesa no basta para aprobar una foto borrosa, y los márgenes en blanco no
 *     bastan para reprobar una nítida (basta con que 1/4 de la imagen tenga texto nítido).
 *
 * Recibe píxeles RGBA (como los entrega un decodificador JPEG). Función pura: se prueba con
 * imágenes sintéticas, sin cámara ni frameworks.
 */
const BLOQUES_POR_LADO = 8;
const LADO_MINIMO_BLOQUE = 8;
const PERCENTIL = 0.75;

export function nitidezImagen(rgba: Uint8Array, ancho: number, alto: number): number {
  // 1) Escala de grises + promedio de cada bloque de 2×2 píxeles (reduce el ruido del sensor).
  const w = Math.floor(ancho / 2);
  const h = Math.floor(alto / 2);
  if (w < 3 || h < 3) return 0;
  const gris = new Float32Array(w * h);
  const luz = (x: number, y: number) => {
    const p = (y * ancho + x) * 4;
    return 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      gris[y * w + x] = (luz(2 * x, 2 * y) + luz(2 * x + 1, 2 * y) + luz(2 * x, 2 * y + 1) + luz(2 * x + 1, 2 * y + 1)) / 4;
    }
  }

  // 2) y 3) Varianza de la segunda derivada en cada eje, por bloques.
  const n = Math.max(1, Math.min(BLOQUES_POR_LADO, Math.floor(Math.min(w, h) / LADO_MINIMO_BLOQUE)));
  const anchoBloque = Math.floor(w / n);
  const altoBloque = Math.floor(h / n);
  const puntajes: number[] = [];
  for (let by = 0; by < n; by++) {
    for (let bx = 0; bx < n; bx++) {
      let sx = 0, sx2 = 0, sy = 0, sy2 = 0, cuenta = 0;
      // Se omite la fila/columna del borde de la imagen (no tiene vecinos a ambos lados).
      for (let y = Math.max(1, by * altoBloque); y < Math.min(h - 1, (by + 1) * altoBloque); y++) {
        for (let x = Math.max(1, bx * anchoBloque); x < Math.min(w - 1, (bx + 1) * anchoBloque); x++) {
          const i = y * w + x;
          const dxx = gris[i - 1] + gris[i + 1] - 2 * gris[i]; // núcleo [1 -2 1] horizontal
          const dyy = gris[i - w] + gris[i + w] - 2 * gris[i]; // núcleo [1 -2 1] vertical
          sx += dxx; sx2 += dxx * dxx;
          sy += dyy; sy2 += dyy * dyy;
          cuenta++;
        }
      }
      if (cuenta === 0) continue;
      const varianza = (s: number, s2: number) => s2 / cuenta - (s / cuenta) ** 2; // E[x²] − E[x]²
      puntajes.push(Math.min(varianza(sx, sx2), varianza(sy, sy2)));
    }
  }
  if (puntajes.length === 0) return 0;
  puntajes.sort((a, b) => a - b);
  return puntajes[Math.min(puntajes.length - 1, Math.floor(PERCENTIL * puntajes.length))];
}

/** Regla bloqueante (S-03 / ADR-04). Un valor no numérico (medición fallida) nunca es legible. */
export function esFotoLegible(nitidez: number): boolean {
  return Number.isFinite(nitidez) && nitidez >= NITIDEZ_MINIMA;
}
