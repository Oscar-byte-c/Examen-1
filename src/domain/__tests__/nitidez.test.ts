/**
 * Nitidez de la foto del acta (ADR-04, RF-11). Imágenes sintéticas a la resolución de análisis:
 * un "acta" con líneas impresas y números manuscritos, desenfocada y con ruido de sensor.
 * Ejecutar: npm test
 */
import { describe, expect, it } from '@jest/globals';

import { NITIDEZ_MINIMA } from '../constants';
import { FotoIlegibleError } from '../entities/errores';
import { esFotoLegible, nitidezImagen } from '../entities/nitidez';
import type { ActaRepository } from '../repositories/ActaRepository';
import type { EvidenciaRepository } from '../repositories/EvidenciaRepository';
import { AnalizarEvidencia, GuardarActa, type DatosGuardarActa } from '../use-cases/actas';

const ANCHO = 400;
const ALTO = 300;
type Gris = Float32Array;

/** Generador pseudoaleatorio determinista: los tests siempre dan el mismo resultado. */
function aleatorio(semilla: number) {
  let s = semilla >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** Papel claro con una tabla (líneas de 2 px) y números de trazo de 3 px en cada celda. */
function acta(): Gris {
  const g = new Float32Array(ANCHO * ALTO).fill(235);
  const r = aleatorio(7);
  const rect = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) g[y * ANCHO + x] = 30;
  };
  for (let y = 20; y < ALTO - 20; y += 40) rect(10, y, ANCHO - 10, y + 2);
  for (let x = 10; x < ANCHO - 10; x += 95) rect(x, 20, x + 2, ALTO - 20);
  for (let y = 28; y < ALTO - 50; y += 40)
    for (let x = 20; x < ANCHO - 90; x += 95)
      for (let d = 0; d < 3; d++) {
        const bx = x + 10 + d * 20;
        rect(bx, y, bx + 12, y + 3);
        rect(bx + 9, y, bx + 12, y + 22);
        if (r() > 0.4) rect(bx, y + 10, bx + 12, y + 13);
        if (r() > 0.4) rect(bx, y + 19, bx + 12, y + 22);
        if (r() > 0.5) rect(bx, y, bx + 3, y + 22);
      }
  return g;
}

/** Desenfoque de caja en un eje (radio r). Tres pasadas en ambos ejes ≈ desenfoque gaussiano. */
function caja(src: Gris, r: number, horizontal: boolean): Gris {
  const dst = new Float32Array(src.length);
  const leer = (x: number, y: number) =>
    src[Math.min(ALTO - 1, Math.max(0, y)) * ANCHO + Math.min(ANCHO - 1, Math.max(0, x))];
  for (let y = 0; y < ALTO; y++)
    for (let x = 0; x < ANCHO; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += horizontal ? leer(x + k, y) : leer(x, y + k);
      dst[y * ANCHO + x] = s / (2 * r + 1);
    }
  return dst;
}
const desenfocar = (g: Gris, r: number) => {
  let o = g;
  for (let i = 0; i < 3; i++) o = caja(caja(o, r, true), r, false);
  return o;
};
/** Celular movido en horizontal: solo se borronean los bordes verticales. */
const movido = (g: Gris, r: number) => caja(caja(g, r, true), r, true);

/** Ajusta el contraste (poca luz), suma ruido de sensor (σ≈4) y devuelve RGBA. */
function aRgba(g: Gris, { contraste = 1, ruido = true } = {}): Uint8Array {
  const r = aleatorio(11);
  const rgba = new Uint8Array(ANCHO * ALTO * 4);
  for (let i = 0; i < g.length; i++) {
    const n = ruido ? (r() + r() + r() - 1.5) * 8 : 0;
    const v = Math.max(0, Math.min(255, Math.round(128 + (g[i] - 128) * contraste + n)));
    rgba.set([v, v, v, 255], i * 4);
  }
  return rgba;
}
const medir = (rgba: Uint8Array) => nitidezImagen(rgba, ANCHO, ALTO);

describe('Nitidez de la foto (ADR-04, RF-11)', () => {
  const base = acta();
  const borrosa = desenfocar(base, 3); // se calcula una sola vez (tests más rápidos)

  describe('fotos nítidas: se aceptan (sin falsos avisos)', () => {
    it('acta nítida con ruido de sensor', () => {
      expect(esFotoLegible(medir(aRgba(base)))).toBe(true);
    });
    it('acta nítida con poca luz (la mitad del contraste)', () => {
      expect(esFotoLegible(medir(aRgba(base, { contraste: 0.5 })))).toBe(true);
    });
    it('desenfoque leve (r = 1) que no impide leer los números', () => {
      expect(esFotoLegible(medir(aRgba(desenfocar(base, 1))))).toBe(true);
    });
    it('con márgenes en blanco: basta con que una parte tenga texto nítido', () => {
      const g = new Float32Array(base);
      for (let y = 0; y < ALTO; y++) for (let x = 0; x < ANCHO / 2; x++) g[y * ANCHO + x] = 235;
      expect(esFotoLegible(medir(aRgba(g)))).toBe(true);
    });
  });

  describe('fotos borrosas: se rechazan', () => {
    it('desenfoque fuerte (r = 3)', () => {
      expect(esFotoLegible(medir(aRgba(borrosa)))).toBe(false);
    });
    it('el ruido del sensor no hace pasar una foto borrosa (causa del fallo con el umbral 60)', () => {
      const conRuido = medir(aRgba(borrosa));
      expect(conRuido).toBeLessThan(NITIDEZ_MINIMA);
      expect(conRuido).toBeLessThan(medir(aRgba(base)) / 10);
    });
    it('celular movido en una sola dirección', () => {
      expect(esFotoLegible(medir(aRgba(movido(base, 6))))).toBe(false);
    });
    it('el borde del papel contra la mesa no basta para aprobar una foto borrosa', () => {
      const g = new Float32Array(borrosa);
      for (let y = 0; y < ALTO; y++) for (let x = 0; x < 30; x++) g[y * ANCHO + x] = 20; // mesa oscura nítida
      expect(esFotoLegible(medir(aRgba(g)))).toBe(false);
    });
  });

  describe('casos límite', () => {
    it('imagen uniforme (lente tapado) → 0', () => {
      expect(medir(aRgba(new Float32Array(ANCHO * ALTO).fill(128), { ruido: false }))).toBe(0);
    });
    it('degradado suave sin bordes → no legible', () => {
      const g = new Float32Array(ANCHO * ALTO).map((_, i) => ((i % ANCHO) * 255) / ANCHO);
      expect(esFotoLegible(medir(aRgba(g, { ruido: false })))).toBe(false);
    });
    it('imagen demasiado pequeña para medir → 0', () => {
      expect(nitidezImagen(new Uint8Array(5 * 5 * 4).fill(255), 5, 5)).toBe(0);
    });
    it('imagen pequeña (un solo bloque) sigue midiendo', () => {
      const rgba = new Uint8Array(20 * 20 * 4);
      for (let i = 0; i < 400; i++) {
        const negro = (((i % 20) >> 1) + ((Math.floor(i / 20)) >> 1)) % 2 === 0; // tablero de 2×2 px
        rgba.set(negro ? [0, 0, 0, 255] : [255, 255, 255, 255], i * 4);
      }
      expect(nitidezImagen(rgba, 20, 20)).toBeGreaterThan(NITIDEZ_MINIMA);
    });
    it('el umbral es inclusivo y una medición fallida nunca es legible', () => {
      expect(esFotoLegible(NITIDEZ_MINIMA)).toBe(true);
      expect(esFotoLegible(NITIDEZ_MINIMA - 0.01)).toBe(false);
      expect(esFotoLegible(Number.NaN)).toBe(false);
      expect(esFotoLegible(Number.POSITIVE_INFINITY)).toBe(false);
    });
  });
});

describe('Casos de uso con la nitidez (ADR-04, S-03)', () => {
  const ubicacion = { latitud: -0.18, longitud: -78.47, precisionM: 8, capturadaEn: '2026-11-24T10:00:00Z' };
  const resultados = {
    totalSufragantes: 100,
    votosBlancos: 5,
    votosNulos: 5,
    votos: [30, 20, 20, 10, 10].map((votos, i) => ({ candidatoId: `c${i}`, votos })),
  };

  /** Dobles de prueba: solo los métodos que usan estos casos de uso. */
  function repos(nitidez: number) {
    const llamadas = { conservar: 0, guardar: 0 };
    const actas = {
      conservarFoto: async () => { llamadas.conservar++; return 'file:///documentos/actas/a1.jpg'; },
      guardarLocal: async () => { llamadas.guardar++; },
    } as unknown as ActaRepository;
    const evidencia: EvidenciaRepository = {
      medirNitidez: async () => nitidez,
      // RF-12: la lectura debe ser posterior a la captura (si no, se descarta).
      leerUbicaciones: async (_cantidad, desde) => [{ ...ubicacion, capturadaEn: desde.toISOString() }],
      prepararUbicacion: () => () => undefined,
    };
    return { actas, evidencia, llamadas };
  }
  const datos = (nitidez: number): DatosGuardarActa => ({
    id: 'a1', mesaId: 'm1', dignidad: 'alcaldia', resultados, versionBase: 0, candidatosEsperados: 5,
    evidencia: { fotoUri: 'file:///documentos/actas/a1.jpg', nitidez, ubicacion },
  });

  it('GuardarActa bloquea una foto ilegible y no guarda nada', async () => {
    const { actas, llamadas } = repos(0);
    await expect(new GuardarActa(actas).execute(datos(NITIDEZ_MINIMA - 1))).rejects.toBeInstanceOf(FotoIlegibleError);
    await expect(new GuardarActa(actas).execute(datos(Number.NaN))).rejects.toBeInstanceOf(FotoIlegibleError);
    expect(llamadas.guardar).toBe(0);
  });
  it('GuardarActa acepta una foto legible', async () => {
    const { actas, llamadas } = repos(0);
    await new GuardarActa(actas).execute(datos(NITIDEZ_MINIMA));
    expect(llamadas.guardar).toBe(1);
  });
  it('AnalizarEvidencia no conserva como evidencia una foto borrosa', async () => {
    const { actas, evidencia, llamadas } = repos(NITIDEZ_MINIMA - 1);
    const r = await new AnalizarEvidencia(evidencia, actas).execute('file:///cache/temporal.jpg', 'a1');
    expect(r.legible).toBe(false);
    expect(r.fotoUri).toBe('file:///cache/temporal.jpg');
    expect(llamadas.conservar).toBe(0);
  });
  it('AnalizarEvidencia conserva una foto legible en almacenamiento persistente', async () => {
    const { actas, evidencia, llamadas } = repos(NITIDEZ_MINIMA + 1);
    const r = await new AnalizarEvidencia(evidencia, actas).execute('file:///cache/temporal.jpg', 'a1');
    expect(r.legible).toBe(true);
    expect(r.fotoUri).toBe('file:///documentos/actas/a1.jpg');
    expect(llamadas.conservar).toBe(1);
  });
});
