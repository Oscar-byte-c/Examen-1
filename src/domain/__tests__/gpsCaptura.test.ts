/**
 * GPS de la captura (ADR-04 / RF-12 / S-06) sin depender de internet.
 *  - Solo valen lecturas tomadas DESDE la foto (el precalentamiento no aporta evidencia).
 *  - De las lecturas válidas se conserva la más precisa.
 *  - Sin ninguna lectura válida la evidencia se rechaza (la foto se repite) con un mensaje que
 *    distingue la causa: permiso, GPS apagado o falta de señal.
 * Ejecutar: npm test
 */
import { describe, expect, it } from '@jest/globals';

import { NITIDEZ_MINIMA, TIEMPO_MAX_GPS_MS } from '../constants';
import {
  GpsDesactivadoError,
  PermisoUbicacionError,
  SinSenalGpsError,
  UbicacionRequeridaError,
} from '../entities/errores';
import type { Ubicacion } from '../entities/geo';
import type { ActaRepository } from '../repositories/ActaRepository';
import type { EvidenciaRepository } from '../repositories/EvidenciaRepository';
import { AnalizarEvidencia, lecturasDesde, ObtenerUbicacionActual } from '../use-cases/actas';

const lectura = (fecha: Date, precisionM: number): Ubicacion => ({
  latitud: -0.18,
  longitud: -78.47,
  precisionM,
  capturadaEn: fecha.toISOString(),
});

function dobles(leer: EvidenciaRepository['leerUbicaciones']) {
  const llamadas = { conservar: 0, leer: [] as { cantidad: number; limiteMs: number }[] };
  const evidencia: EvidenciaRepository = {
    medirNitidez: async () => NITIDEZ_MINIMA + 100,
    leerUbicaciones: async (cantidad, desde, limiteMs) => {
      llamadas.leer.push({ cantidad, limiteMs });
      return leer(cantidad, desde, limiteMs);
    },
    prepararUbicacion: () => () => undefined,
  };
  const actas = {
    conservarFoto: async () => {
      llamadas.conservar++;
      return 'file:///documentos/actas/a1.jpg';
    },
  } as unknown as ActaRepository;
  return { evidencia, actas, llamadas };
}

describe('lecturasDesde (RF-12)', () => {
  it('descarta las lecturas anteriores al instante de la captura', () => {
    const captura = new Date('2026-11-24T15:00:00.000Z');
    const antes = lectura(new Date('2026-11-24T14:59:59.000Z'), 3);
    const igual = lectura(captura, 10);
    const despues = lectura(new Date('2026-11-24T15:00:02.000Z'), 8);
    expect(lecturasDesde([antes, igual, despues], captura)).toEqual([igual, despues]);
  });
});

describe('AnalizarEvidencia y el GPS', () => {
  it('pide 3 lecturas con un límite TOTAL de 60 s y conserva la más precisa', async () => {
    const { evidencia, actas, llamadas } = dobles(async (_c, desde) => [
      lectura(new Date(desde.getTime() + 1000), 25),
      lectura(new Date(desde.getTime() + 2000), 6),
      lectura(new Date(desde.getTime() + 3000), 12),
    ]);
    const r = await new AnalizarEvidencia(evidencia, actas).execute('file:///cache/f.jpg', 'a1');
    expect(llamadas.leer).toEqual([{ cantidad: 3, limiteMs: TIEMPO_MAX_GPS_MS }]);
    expect(TIEMPO_MAX_GPS_MS).toBe(60_000);
    expect(r.ubicacion.precisionM).toBe(6);
    expect(r.legible).toBe(true);
  });

  it('modo avión sin señal: ninguna lectura → SinSenalGpsError y la foto NO se conserva', async () => {
    const { evidencia, actas, llamadas } = dobles(async () => []);
    const promesa = new AnalizarEvidencia(evidencia, actas).execute('file:///cache/f.jpg', 'a1');
    await expect(promesa).rejects.toBeInstanceOf(SinSenalGpsError);
    await expect(promesa).rejects.toThrow(/señal GPS/);
    expect(llamadas.conservar).toBe(0);
  });

  it('una posición vieja (p. ej. del precalentamiento) no vale como ubicación de la captura', async () => {
    const { evidencia, actas } = dobles(async (_c, desde) => [lectura(new Date(desde.getTime() - 5000), 3)]);
    await expect(new AnalizarEvidencia(evidencia, actas).execute('file:///cache/f.jpg', 'a1')).rejects.toBeInstanceOf(
      SinSenalGpsError,
    );
  });

  it('el error de permiso y el de GPS apagado llegan con su causa (y siguen siendo UbicacionRequeridaError)', async () => {
    for (const ErrorEsperado of [PermisoUbicacionError, GpsDesactivadoError]) {
      const { evidencia, actas, llamadas } = dobles(async () => {
        throw new ErrorEsperado();
      });
      const promesa = new AnalizarEvidencia(evidencia, actas).execute('file:///cache/f.jpg', 'a1');
      await expect(promesa).rejects.toBeInstanceOf(ErrorEsperado);
      await expect(promesa).rejects.toBeInstanceOf(UbicacionRequeridaError);
      expect(llamadas.conservar).toBe(0);
    }
  });

  it('los tres mensajes son distintos', () => {
    const mensajes = new Set([new PermisoUbicacionError(), new GpsDesactivadoError(), new SinSenalGpsError()].map((e) => e.message));
    expect(mensajes.size).toBe(3);
  });

  it('ObtenerUbicacionActual (recintos) aplica las mismas reglas', async () => {
    const { evidencia } = dobles(async () => []);
    await expect(new ObtenerUbicacionActual(evidencia).execute()).rejects.toBeInstanceOf(SinSenalGpsError);
  });
});
