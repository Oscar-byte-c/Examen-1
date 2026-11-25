/**
 * RF-15: de dónde salen los votos por recinto. Se simula Supabase: aquí se prueba qué consulta
 * hace el repositorio y cómo convierte las filas, no la red.
 *  - Solo lee la tabla `actas` del SERVIDOR (versión vigente aceptada por `sincronizar_acta`):
 *    las actas pendientes del celular (SQLite) y las versiones en conflicto (`actas_conflictos`)
 *    no se consultan, así que no pueden sumarse.
 *  - Es una lectura con la sesión del usuario: la RLS decide qué filas llegan (ADR-11).
 *  - Pagina hasta agotar las filas sin repetir ninguna.
 * Ejecutar: npm test
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { EscrutinioRepositoryImpl } from '../repositories/EscrutinioRepositoryImpl';

const mockTablas: string[] = [];
const mockRangos: [number, number][] = [];
let mockSelect = '';
let mockPaginas: unknown[][] = [];

jest.mock('../datasources/remote/supabaseClient', () => ({
  supabase: {
    from: (tabla: string) => {
      mockTablas.push(tabla);
      const consulta = {
        select: (columnas: string) => ((mockSelect = columnas), consulta),
        order: () => consulta,
        range: (desde: number, hasta: number) => {
          mockRangos.push([desde, hasta]);
          return consulta;
        },
        returns: async () => ({ data: mockPaginas.shift() ?? [], error: null }),
      };
      return consulta;
    },
  },
}));

const fila = (id: string, recinto: string) => ({
  id,
  dignidad: 'alcaldia',
  total_sufragantes: 10,
  votos_blancos: 1,
  votos_nulos: 1,
  mesa: { recinto_id: recinto },
  votos: [{ candidato_id: 'a1', votos: 8 }],
});

describe('EscrutinioRepositoryImpl.votosPorActa', () => {
  beforeEach(() => {
    mockTablas.length = 0;
    mockRangos.length = 0;
    mockSelect = '';
  });

  it('lee solo la tabla de actas del servidor con sus votos y su recinto', async () => {
    mockPaginas = [[fila('A1', 'R1'), fila('A2', 'R2')]];
    const actas = await new EscrutinioRepositoryImpl().votosPorActa();
    expect(mockTablas).toEqual(['actas']);
    expect(mockSelect).toContain('votos:votos_acta(candidato_id, votos)');
    expect(mockSelect).toContain('mesa:mesas!inner(recinto_id)');
    expect(actas[0]).toEqual({
      actaId: 'A1',
      recintoId: 'R1',
      dignidad: 'alcaldia',
      totalSufragantes: 10,
      votosBlancos: 1,
      votosNulos: 1,
      votos: [{ candidatoId: 'a1', votos: 8 }],
    });
  });

  it('pagina sin repetir filas hasta agotar los resultados', async () => {
    mockPaginas = [Array.from({ length: 500 }, (_, i) => fila(`A${i}`, 'R1')), [fila('A500', 'R2')]];
    const actas = await new EscrutinioRepositoryImpl().votosPorActa();
    expect(mockRangos).toEqual([
      [0, 499],
      [500, 999],
    ]);
    expect(actas).toHaveLength(501);
    expect(new Set(actas.map((a) => a.actaId)).size).toBe(501);
  });
});
