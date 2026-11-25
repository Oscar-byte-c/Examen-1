/**
 * Identidad sin red (RF-16): con el token vencido y sin internet, supabase-js devuelve una
 * sesión nula aunque siga guardada. Se usa la sesión guardada SOLO si el perfil en caché es de
 * la misma cuenta; nunca el de otra. Secure Store se simula en memoria.
 * Ejecutar: npm test
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import type { Usuario } from '@/domain/entities/Usuario';

import { perfilCache } from '../datasources/local/perfilCache';
import { idDeSesionGuardada, perfilDeSesionGuardada } from '../datasources/local/sesionLocal';
import { ActaRepositoryImpl } from '../repositories/ActaRepositoryImpl';

const mockAlmacen = new Map<string, string>();
jest.mock('../datasources/local/secureStoreAdapter', () => ({
  secureStoreAdapter: {
    getItem: async (k: string) => mockAlmacen.get(k) ?? null,
    setItem: async (k: string, v: string) => void mockAlmacen.set(k, v),
    removeItem: async (k: string) => void mockAlmacen.delete(k),
  },
}));

// Repositorio de actas sin red: getSession() da null (token vencido) y SQLite se simula.
const mockLocal = { listar: jest.fn(async (_autor: string) => []), guardarConOperacion: jest.fn(async () => undefined) };
jest.mock('../datasources/remote/supabaseClient', () => ({
  CLAVE_SESION: 'control-electoral.sesion',
  supabase: { auth: { getSession: async () => ({ data: { session: null }, error: new Error('Network request failed') }) } },
}));
jest.mock('../datasources/local/ActaLocalDataSource', () => ({
  ActaLocalDataSource: class {
    listar = (autor: string) => mockLocal.listar(autor);
    guardarConOperacion = () => mockLocal.guardarConOperacion();
  },
}));
jest.mock('../datasources/local/dispositivo', () => ({ conectividad: { hayConexion: async () => false }, fotosLocales: {} }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'op-1' }));

const CLAVE = 'control-electoral.sesion';
const perfil = (id: string): Usuario => ({
  id,
  correo: `${id}@example.com`,
  nombres: 'Ana',
  apellidos: 'Pérez',
  rol: 'veedor',
  recintoId: 'r1',
  debeCambiarClave: false,
});
/** Sesión como la guarda supabase-js: tokens + usuario. Vencida (expires_at en el pasado). */
const guardarSesion = (userId: string) =>
  mockAlmacen.set(CLAVE, JSON.stringify({ access_token: 'x', refresh_token: 'y', expires_at: 1, user: { id: userId } }));

describe('sesión sin conexión', () => {
  beforeEach(() => mockAlmacen.clear());

  it('token vencido sin red: usa la sesión guardada si el perfil es de la misma cuenta', async () => {
    guardarSesion('u1');
    await perfilCache.guardar(perfil('u1'));
    expect(await idDeSesionGuardada(CLAVE)).toBe('u1');
    expect((await perfilDeSesionGuardada(CLAVE))?.id).toBe('u1');
  });

  it('NUNCA usa el perfil de otra cuenta (caché vieja de otra persona)', async () => {
    guardarSesion('u2');
    await perfilCache.guardar(perfil('u1'));
    expect(await perfilDeSesionGuardada(CLAVE)).toBeNull();
  });

  it('sin sesión guardada (cerró sesión) no hay identidad, aunque quede un perfil', async () => {
    await perfilCache.guardar(perfil('u1'));
    expect(await perfilDeSesionGuardada(CLAVE)).toBeNull();
  });

  it('sin perfil en caché (se borró al cerrar sesión) no hay identidad', async () => {
    guardarSesion('u1');
    expect(await perfilDeSesionGuardada(CLAVE)).toBeNull();
  });

  it('una sesión guardada corrupta o sin usuario se ignora', async () => {
    mockAlmacen.set(CLAVE, '{no es json');
    expect(await idDeSesionGuardada(CLAVE)).toBeNull();
    mockAlmacen.set(CLAVE, JSON.stringify({ access_token: 'x' }));
    expect(await idDeSesionGuardada(CLAVE)).toBeNull();
  });
});

describe('actas sin conexión con el token vencido', () => {
  const monitoreo = { reportarError: () => undefined } as never;
  const acta = { id: 'a1', mesaId: 'm1', dignidad: 'alcaldia' } as never;

  beforeEach(() => {
    mockAlmacen.clear();
    mockLocal.listar.mockClear();
    mockLocal.guardarConOperacion.mockClear();
  });

  it('lista y guarda las actas locales del usuario de la sesión guardada', async () => {
    guardarSesion('u1');
    await perfilCache.guardar(perfil('u1'));
    const repo = new ActaRepositoryImpl(monitoreo);
    await repo.listarLocales();
    expect(mockLocal.listar).toHaveBeenCalledWith('u1');
    await expect(repo.guardarLocal(acta)).resolves.toBeUndefined();
    expect(mockLocal.guardarConOperacion).toHaveBeenCalledTimes(1);
  });

  it('si el perfil en caché es de otra cuenta, no guarda ni muestra actas de nadie', async () => {
    guardarSesion('u2');
    await perfilCache.guardar(perfil('u1'));
    const repo = new ActaRepositoryImpl(monitoreo);
    expect(await repo.listarLocales()).toEqual([]);
    expect(mockLocal.listar).not.toHaveBeenCalled();
    await expect(repo.guardarLocal(acta)).rejects.toThrow(/sesión no está activa/);
  });
});
