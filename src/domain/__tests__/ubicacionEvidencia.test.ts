/**
 * Ubicación de la evidencia (RF-12 / S-06): solo se usan las coordenadas guardadas con la foto.
 * Ejecutar: npm test
 */
import { describe, expect, it } from '@jest/globals';

import { evaluarUbicacionEvidencia, type Ubicacion } from '../entities/geo';

const recinto = { latitud: -0.2201, longitud: -78.5123 };
const captura = (latitud: number, longitud: number): Ubicacion => ({
  latitud,
  longitud,
  precisionM: 8,
  capturadaEn: '2026-11-24T15:00:00.000Z',
});

describe('evaluarUbicacionEvidencia', () => {
  it('sin coordenadas → sin_ubicacion (no se inventa ninguna)', () => {
    expect(evaluarUbicacionEvidencia(null, recinto).estado).toBe('sin_ubicacion');
    expect(evaluarUbicacionEvidencia(captura(Number.NaN, -78.5), recinto).estado).toBe('sin_ubicacion');
    expect(evaluarUbicacionEvidencia(captura(95, -78.5), recinto).estado).toBe('sin_ubicacion');
  });

  it('sin coordenadas del recinto → conserva la captura pero no calcula distancia', () => {
    const r = evaluarUbicacionEvidencia(captura(-0.22, -78.51), null);
    expect(r).toEqual({ estado: 'sin_recinto', captura: captura(-0.22, -78.51) });
  });

  it('antes de sincronizar estima la distancia en el dispositivo (dentro de 300 m)', () => {
    const r = evaluarUbicacionEvidencia(captura(-0.2205, -78.5125), recinto); // ~50 m
    expect(r.estado).toBe('evaluada');
    if (r.estado !== 'evaluada') return;
    expect(r.origen).toBe('dispositivo');
    expect(r.distanciaM).toBeGreaterThan(30);
    expect(r.distanciaM).toBeLessThan(80);
    expect(r.fueraDeRango).toBe(false);
  });

  it('a más de 300 m marca fuera de rango (alerta, S-06)', () => {
    const r = evaluarUbicacionEvidencia(captura(-0.2301, -78.5123), recinto); // ~1,1 km
    expect(r.estado === 'evaluada' && r.fueraDeRango).toBe(true);
  });

  it('si el servidor ya calculó la distancia, se usa la oficial', () => {
    const r = evaluarUbicacionEvidencia(captura(-0.2205, -78.5125), recinto, { distanciaM: 412, fueraDeRango: true });
    expect(r).toMatchObject({ estado: 'evaluada', origen: 'servidor', distanciaM: 412, fueraDeRango: true });
  });
});
