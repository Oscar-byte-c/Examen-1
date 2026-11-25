/**
 * Asistente del acta (presentación): el balance en vivo coincide con la regla del dominio
 * (`resumenSuma`) y cada error lleva al paso correcto. No prueba la validación (es del dominio).
 * Ejecutar: npm test
 */
import { describe, expect, it } from '@jest/globals';

import { resumenSuma } from '@/domain/entities/Acta';

import { calcularBalance, PASO, pasoDeCampo, tieneNumero } from '../asistente';

const votos = { a: '120', b: '98', c: '45', d: '', e: '15' };

describe('calcularBalance', () => {
  it('sin total de sufragantes válido → sin_total', () => {
    expect(calcularBalance({ totalSufragantes: '', votos }).estado).toBe('sin_total');
    expect(calcularBalance({ totalSufragantes: 'abc', votos }).estado).toBe('sin_total');
  });

  it('faltan votos: diferencia positiva y estado «faltan»', () => {
    const b = calcularBalance({ totalSufragantes: '312', votosBlancos: '12', votosNulos: '10', votos });
    expect(b).toMatchObject({ declarado: 312, validos: 278, suma: 300, diferencia: 12, estado: 'faltan' });
  });

  it('sobran votos: estado «sobran»', () => {
    const b = calcularBalance({ totalSufragantes: '290', votosBlancos: '12', votosNulos: '10', votos });
    expect(b).toMatchObject({ suma: 300, diferencia: 10, estado: 'sobran' });
  });

  it('cuadra exactamente cuando el dominio dice que cuadra', () => {
    const v = { totalSufragantes: '312', votosBlancos: '12', votosNulos: '10', votos: { ...votos, d: '12' } };
    expect(calcularBalance(v).estado).toBe('cuadra');
    expect(resumenSuma(v).cuadra).toBe(true);
  });

  it('total 0 con todo vacío no «cuadra» (igual que el dominio)', () => {
    const v = { totalSufragantes: '0', votosBlancos: '', votosNulos: '', votos: {} };
    expect(resumenSuma(v).cuadra).toBe(false);
    expect(calcularBalance(v).estado).not.toBe('cuadra');
  });
});

describe('pasoDeCampo y tieneNumero', () => {
  it('el total va al paso 1; votos, blancos y nulos al paso 2', () => {
    expect(pasoDeCampo('totalSufragantes')).toBe(PASO.SUFRAGANTES);
    expect(pasoDeCampo('votos')).toBe(PASO.VOTOS);
    expect(pasoDeCampo('votosBlancos')).toBe(PASO.VOTOS);
    expect(pasoDeCampo('votosNulos')).toBe(PASO.VOTOS);
  });
  it('«La suma no cuadra» (error del total con un total válido) lleva a los votos', () => {
    expect(pasoDeCampo('totalSufragantes', true)).toBe(PASO.VOTOS);
    expect(pasoDeCampo('totalSufragantes', false)).toBe(PASO.SUFRAGANTES);
  });
  it('solo cuenta un entero ≥ 0', () => {
    expect(tieneNumero('0')).toBe(true);
    expect(tieneNumero(' 7 ')).toBe(true);
    expect(tieneNumero('')).toBe(false);
    expect(tieneNumero('-3')).toBe(false);
    expect(tieneNumero('2.5')).toBe(false);
  });
});
