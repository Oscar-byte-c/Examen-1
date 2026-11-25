/**
 * Cambio de clave (RF-02 / RF-04): la app NO debe mostrar un error si la clave ya cambió.
 * Supabase Auth cierra todas las sesiones al cambiar la clave con la API de administración,
 * así que el repositorio vuelve a ingresar con la clave nueva en lugar de renovar la sesión.
 * Supabase y Secure Store se simulan: aquí se prueba la lógica del repositorio, no la red.
 * Ejecutar: npm test
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { DatoInvalidoError } from '@/domain/entities/errores';

import { AuthRepositoryImpl } from '../repositories/AuthRepositoryImpl';

const mockAuth = {
  getSession: jest.fn<() => Promise<unknown>>(),
  signInWithPassword: jest.fn<() => Promise<unknown>>(),
  refreshSession: jest.fn<() => Promise<unknown>>(),
  signOut: jest.fn<() => Promise<unknown>>(),
};
const mockFunctions = { invoke: jest.fn<() => Promise<unknown>>() };
const mockPerfil = {
  id: 'u1',
  cedula: '1710034065',
  nombres: 'Ana',
  apellidos: 'Pérez',
  telefono: '0991234567',
  rol: 'veedor',
  recinto_id: 'r1',
  activo: true,
};

jest.mock('../datasources/remote/supabaseClient', () => ({
  CLAVE_SESION: 'sesion',
  // Getters: el módulo se importa ANTES de que existan las constantes de arriba (hoisting de Jest).
  supabase: {
    get auth() {
      return mockAuth;
    },
    get functions() {
      return mockFunctions;
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockPerfil, error: null }) }) }) }),
  },
}));
jest.mock('../datasources/local/secureStoreAdapter', () => ({
  secureStoreAdapter: { getItem: async () => null, setItem: async () => undefined, removeItem: async () => undefined },
}));
jest.mock('../datasources/local/perfilCache', () => ({
  perfilCache: { guardar: async () => undefined, leer: async () => null, borrar: async () => undefined },
}));

const usuarioAuth = { id: 'u1', email: 'ana@example.com', app_metadata: { debe_cambiar_clave: false } };

describe('AuthRepositoryImpl.cambiarClave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({ data: { session: { user: usuarioAuth } }, error: null });
    mockAuth.signOut.mockResolvedValue({ error: null });
    // Lo que responde Supabase tras el cambio: la sesión anterior fue revocada.
    mockAuth.refreshSession.mockResolvedValue({ data: { user: null, session: null }, error: new Error('Invalid Refresh Token') });
  });

  it('si la clave cambió, vuelve a ingresar con la clave nueva y NO usa refreshSession', async () => {
    mockFunctions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    mockAuth.signInWithPassword.mockResolvedValue({ data: { user: usuarioAuth }, error: null });

    const r = await new AuthRepositoryImpl().cambiarClave('NuevaClave123');

    expect(r.tipo).toBe('sesion_iniciada');
    expect(r.tipo === 'sesion_iniciada' && r.usuario.debeCambiarClave).toBe(false);
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'NuevaClave123' });
    expect(mockAuth.refreshSession).not.toHaveBeenCalled();
  });

  it('si la clave cambió pero el reingreso falla, pide ingresar de nuevo (no lanza error)', async () => {
    mockFunctions.invoke.mockResolvedValue({ data: { ok: true }, error: null });
    mockAuth.signInWithPassword.mockRejectedValue(new TypeError('Network request failed'));

    const r = await new AuthRepositoryImpl().cambiarClave('NuevaClave123');

    expect(r).toEqual({ tipo: 'reingreso_requerido' });
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' }); // la sesión revocada se borra del dispositivo
  });

  it('si el servidor rechaza la clave, conserva el error real', async () => {
    const respuesta = new Response(JSON.stringify({ error: 'clave_repetida' }), { status: 400 });
    mockFunctions.invoke.mockResolvedValue({ data: null, error: new FunctionsHttpError(respuesta) });

    const promesa = new AuthRepositoryImpl().cambiarClave('NuevaClave123');

    await expect(promesa).rejects.toBeInstanceOf(DatoInvalidoError);
    await expect(promesa).rejects.toThrow('La nueva clave debe ser distinta de la anterior.');
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
  });
});
