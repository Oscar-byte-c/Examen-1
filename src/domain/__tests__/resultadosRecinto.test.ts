/**
 * RF-15: votos de cada candidato por recinto y en total, separados por dignidad.
 * Ejecutar: npm test
 */
import { describe, expect, it } from '@jest/globals';

import { consolidarResultados, type AvanceRecinto, type ConteoCandidato, type VotosActaRecinto } from '../entities/Escrutinio';
import type { EscrutinioRepository } from '../repositories/EscrutinioRepository';
import { ObtenerResultadosPorRecinto } from '../use-cases/escrutinio';

const cand = (candidatoId: string, dignidad: 'alcaldia' | 'prefectura', lista: number, votos = 0): ConteoCandidato => ({
  candidatoId,
  dignidad,
  candidato: `Candidato ${candidatoId}`,
  organizacion: `Org ${lista}`,
  lista,
  color: '#000000',
  votos,
});

const recinto = (recintoId: string, nombre: string, mesasTotal = 4, mesasReportadas = 0): AvanceRecinto => ({
  recintoId,
  nombre,
  latitud: 0,
  longitud: 0,
  mesasTotal,
  mesasReportadas,
  mesasParciales: 0,
});

/** Acta coherente (RF-19): sufragantes = válidos + blancos + nulos. */
const acta = (actaId: string, recintoId: string, dignidad: 'alcaldia' | 'prefectura', votos: Record<string, number>, blancos = 0, nulos = 0): VotosActaRecinto => {
  const validos = Object.values(votos).reduce((s, v) => s + v, 0);
  return {
    actaId,
    recintoId,
    dignidad,
    totalSufragantes: validos + blancos + nulos,
    votosBlancos: blancos,
    votosNulos: nulos,
    votos: Object.entries(votos).map(([candidatoId, v]) => ({ candidatoId, votos: v })),
  };
};

const avance = [recinto('R1', 'Mejía'), recinto('R2', 'Montúfar'), recinto('R3', 'Sin actas')];
const actas = [
  acta('A1', 'R1', 'alcaldia', { a1: 40, a2: 10 }, 3, 2),
  acta('A2', 'R1', 'alcaldia', { a1: 5, a2: 25 }, 1, 0),
  acta('A3', 'R2', 'alcaldia', { a1: 12, a2: 30 }, 0, 4),
  acta('P1', 'R1', 'prefectura', { p1: 7, p2: 3 }, 2, 1),
];
// Lo que devuelve el servidor (conteo_por_candidato) para esas mismas actas.
const conteo = [cand('a1', 'alcaldia', 1, 57), cand('a2', 'alcaldia', 2, 65), cand('p1', 'prefectura', 1, 7), cand('p2', 'prefectura', 2, 3)];

const r = consolidarResultados(actas, conteo, avance);
const de = (id: string) => r.recintos.find((x) => x.recintoId === id)!;
const votosDe = (filas: { candidatoId: string; votos: number }[]) => Object.fromEntries(filas.map((c) => [c.candidatoId, c.votos]));

describe('RF-15 · consolidarResultados', () => {
  it('1. suma los votos de cada candidato dentro de cada recinto', () => {
    expect(votosDe(de('R1').dignidades.alcaldia.candidatos)).toEqual({ a1: 45, a2: 35 });
    expect(votosDe(de('R2').dignidades.alcaldia.candidatos)).toEqual({ a1: 12, a2: 30 });
    const mejia = de('R1').dignidades.alcaldia;
    expect([mejia.validos, mejia.blancos, mejia.nulos, mejia.sufragantes, mejia.actas]).toEqual([80, 4, 2, 86, 2]);
  });

  it('2. calcula los totales generales por candidato', () => {
    expect(votosDe(r.general.alcaldia.candidatos)).toEqual({ a1: 57, a2: 65 });
    expect(r.general.alcaldia.candidatos.map((c) => c.candidatoId)).toEqual(['a2', 'a1']); // de mayor a menor
    expect([r.general.alcaldia.validos, r.general.alcaldia.blancos, r.general.alcaldia.nulos, r.general.alcaldia.sufragantes]).toEqual([122, 4, 6, 132]);
  });

  it('3. separa alcaldía y prefectura', () => {
    expect(votosDe(de('R1').dignidades.prefectura.candidatos)).toEqual({ p1: 7, p2: 3 });
    expect(de('R1').dignidades.alcaldia.candidatos.some((c) => c.candidatoId.startsWith('p'))).toBe(false);
    expect(r.general.prefectura.actas).toBe(1);
    // Un voto de un candidato de OTRA dignidad no se cuenta.
    const mezclada = consolidarResultados([acta('X', 'R1', 'alcaldia', { a1: 1, p1: 99 })], conteo, avance);
    expect(mezclada.general.alcaldia.validos).toBe(1);
    expect(mezclada.general.prefectura.validos).toBe(0);
  });

  it('4. la suma de los recintos es igual al total general y al conteo del servidor', () => {
    for (const d of ['alcaldia', 'prefectura'] as const) {
      for (const c of r.general[d].candidatos) {
        const suma = r.recintos.reduce((s, x) => s + (x.dignidades[d].candidatos.find((y) => y.candidatoId === c.candidatoId)?.votos ?? 0), 0);
        expect(c.votos).toBe(suma);
      }
      expect(r.general[d].sufragantes).toBe(r.recintos.reduce((s, x) => s + x.dignidades[d].sufragantes, 0));
    }
    expect(r.coincideConConteoServidor).toBe(true);
    // Si el servidor tiene otra cifra (p. ej. llegó un acta entre consultas), se avisa.
    expect(consolidarResultados(actas, conteo.map((c) => (c.candidatoId === 'a1' ? { ...c, votos: 60 } : c)), avance).coincideConConteoServidor).toBe(false);
  });

  it('5. no duplica votos si la misma acta llega dos veces', () => {
    const repetida = consolidarResultados([...actas, actas[0], actas[0]], conteo, avance);
    expect(votosDe(repetida.recintos.find((x) => x.recintoId === 'R1')!.dignidades.alcaldia.candidatos)).toEqual({ a1: 45, a2: 35 });
    expect(repetida.general.alcaldia.actas).toBe(3);
    expect(repetida.coincideConConteoServidor).toBe(true);
  });

  it('7. un recinto sin actas queda en cero (la pantalla muestra el estado vacío)', () => {
    const vacio = de('R3').dignidades.alcaldia;
    expect([vacio.actas, vacio.validos, vacio.sufragantes]).toEqual([0, 0, 0]);
    expect(vacio.candidatos.every((c) => c.votos === 0 && c.porcentaje === 0)).toBe(true);
  });

  it('no pierde los votos de un recinto ausente del avance y calcula porcentajes sobre válidos', () => {
    const huerfana = consolidarResultados([acta('Z', 'R9', 'alcaldia', { a1: 3 })], [cand('a1', 'alcaldia', 1, 3)], avance);
    expect(huerfana.recintos.some((x) => x.recintoId === 'R9')).toBe(true);
    expect(huerfana.general.alcaldia.validos).toBe(3);
    expect(de('R1').dignidades.alcaldia.candidatos[0].porcentaje).toBeCloseTo(56.25);
  });
});

describe('RF-15 · ObtenerResultadosPorRecinto', () => {
  it('6. solo usa las actas que entrega el repositorio del SERVIDOR (estado válido) y las consolida', async () => {
    const llamadas: string[] = [];
    const repo = {
      votosPorActa: async () => (llamadas.push('votosPorActa'), actas),
      conteoPorCandidato: async () => (llamadas.push('conteo'), conteo),
      avancePorRecinto: async () => (llamadas.push('avance'), avance),
    } as unknown as EscrutinioRepository;
    const resultado = await new ObtenerResultadosPorRecinto(repo).execute();
    expect(llamadas.sort()).toEqual(['avance', 'conteo', 'votosPorActa']);
    expect(votosDe(resultado.general.alcaldia.candidatos)).toEqual({ a1: 57, a2: 65 });
  });
});
