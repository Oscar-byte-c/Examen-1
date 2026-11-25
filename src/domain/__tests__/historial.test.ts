import { describe, expect, it } from '@jest/globals';

import { cambiosEntreVersiones, type VersionActa } from '../entities/Historial';

/** S-04 / ADR-11: qué cambió entre dos versiones de un acta (auditoría). */

const base: VersionActa = {
  version: 1,
  operacionId: 'op-1',
  modificadoEn: '2026-11-24T18:00:00Z',
  autorId: 'veedor-1',
  autor: { nombre: 'Ana Pérez', rol: 'veedor' },
  resultados: {
    totalSufragantes: 100,
    votosBlancos: 5,
    votosNulos: 5,
    votos: [
      { candidatoId: 'a1', votos: 60 },
      { candidatoId: 'a2', votos: 30 },
    ],
  },
  fotoPath: 'mesa/acta/op-1.jpg',
  ubicacion: { latitud: -0.2, longitud: -78.5, precisionM: 8, distanciaM: 40, fueraDeRango: false, capturadaEn: '2026-11-24T17:55:00Z' },
};

const version = (cambios: Partial<VersionActa>): VersionActa => ({ ...base, version: 2, operacionId: 'op-2', ...cambios });

describe('cambiosEntreVersiones', () => {
  it('sin cambios devuelve una lista vacía', () => {
    expect(cambiosEntreVersiones(base, version({}))).toEqual([]);
  });

  it('detecta cambios en totales, blancos y nulos', () => {
    const v2 = version({ resultados: { ...base.resultados, totalSufragantes: 101, votosNulos: 6 } });
    expect(cambiosEntreVersiones(base, v2)).toEqual([
      { campo: 'totalSufragantes', antes: 100, despues: 101 },
      { campo: 'votosNulos', antes: 5, despues: 6 },
    ]);
  });

  it('detecta el cambio de votos de un candidato', () => {
    const v2 = version({
      resultados: {
        ...base.resultados,
        votos: [
          { candidatoId: 'a1', votos: 55 },
          { candidatoId: 'a2', votos: 35 },
        ],
      },
    });
    expect(cambiosEntreVersiones(base, v2)).toEqual([
      { campo: 'candidato', candidatoId: 'a1', antes: 60, despues: 55 },
      { campo: 'candidato', candidatoId: 'a2', antes: 30, despues: 35 },
    ]);
  });

  it('un candidato que falta en una versión cuenta como 0', () => {
    const v2 = version({ resultados: { ...base.resultados, votos: [{ candidatoId: 'a1', votos: 60 }] } });
    expect(cambiosEntreVersiones(base, v2)).toEqual([{ campo: 'candidato', candidatoId: 'a2', antes: 30, despues: 0 }]);
  });

  it('registra la foto nueva y el nuevo lugar de captura', () => {
    const v2 = version({
      fotoPath: 'mesa/acta/op-2.jpg',
      ubicacion: { ...base.ubicacion, latitud: -0.21, distanciaM: 350, fueraDeRango: true },
    });
    expect(cambiosEntreVersiones(base, v2)).toEqual([
      { campo: 'foto' },
      { campo: 'ubicacion', distanciaAntesM: 40, distanciaDespuesM: 350 },
    ]);
  });
});
