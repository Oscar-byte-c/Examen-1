/**
 * GPS en el dispositivo (ADR-04 / RF-12): precalentamiento y lectura con límite total.
 * `expo-location` se simula; los temporizadores son falsos para probar los 10 s y los 60 s sin esperar.
 * Ejecutar: npm test
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  GpsDesactivadoError,
  PermisoUbicacionError,
  SinSenalGpsError,
  UbicacionAproximadaError,
} from '@/domain/entities/errores';

import { leerUbicaciones, prepararGps } from '../datasources/local/dispositivo';

type Posicion = { coords: { latitude: number; longitude: number; accuracy: number }; timestamp: number };
type Arranque = 'ok' | 'colgado' | 'error';

const mockGps = {
  permisoConcedido: true,
  precision: 'fine' as 'fine' | 'coarse',
  serviciosActivos: true,
  arranque: 'ok' as Arranque,
  /** Para el caso "colgado": permite que la suscripción llegue tarde. */
  resolverTarde: null as (() => void) | null,
  emitir: null as ((p: Posicion) => void) | null,
  opciones: null as Record<string, unknown> | null,
  remove: jest.fn(),
  watch: jest.fn(),
  pedirPermiso: jest.fn(),
};

const permiso = () => ({
  status: mockGps.permisoConcedido ? 'granted' : 'denied',
  android: { accuracy: mockGps.permisoConcedido ? mockGps.precision : 'none' },
});

jest.mock('expo-location', () => ({
  Accuracy: { Highest: 6 },
  getForegroundPermissionsAsync: async () => permiso(),
  requestForegroundPermissionsAsync: async () => {
    mockGps.pedirPermiso();
    return permiso();
  },
  hasServicesEnabledAsync: async () => mockGps.serviciosActivos,
  getProviderStatusAsync: async () => ({ locationServicesEnabled: true, gpsAvailable: true, networkAvailable: false }),
  watchPositionAsync: (opciones: Record<string, unknown>, cb: (p: Posicion) => void) => {
    mockGps.watch();
    mockGps.opciones = opciones;
    mockGps.emitir = cb;
    if (mockGps.arranque === 'error') return Promise.reject(new Error('LocationRequestRejected'));
    if (mockGps.arranque === 'colgado') {
      return new Promise((resolver) => {
        mockGps.resolverTarde = () => resolver({ remove: mockGps.remove });
      });
    }
    return Promise.resolve({ remove: mockGps.remove });
  },
}));
// Módulos nativos del mismo archivo que estas pruebas no usan.
jest.mock('expo-file-system', () => ({}));
jest.mock('expo-image-manipulator', () => ({}));
jest.mock('@react-native-community/netinfo', () => ({}));

const posicion = (timestamp: number, accuracy: number): Posicion => ({
  coords: { latitude: -0.18, longitude: -78.47, accuracy },
  timestamp,
});

/** Deja correr las promesas pendientes (permisos, arranque del seguimiento). */
const vaciar = () => jest.advanceTimersByTimeAsync(0);

describe('GPS del dispositivo', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-24T15:00:00.000Z'));
    Object.assign(mockGps, {
      permisoConcedido: true,
      precision: 'fine',
      serviciosActivos: true,
      arranque: 'ok',
      resolverTarde: null,
      emitir: null,
      opciones: null,
    });
    mockGps.remove.mockClear();
    mockGps.watch.mockClear();
    mockGps.pedirPermiso.mockClear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('sin permiso → PermisoUbicacionError (no es "sin señal")', async () => {
    mockGps.permisoConcedido = false;
    await expect(leerUbicaciones(3, new Date(), 60_000)).rejects.toBeInstanceOf(PermisoUbicacionError);
    expect(mockGps.watch).not.toHaveBeenCalled();
  });

  it('permiso APROXIMADO real (android.accuracy = coarse) → mensaje específico y no enciende el GPS', async () => {
    mockGps.precision = 'coarse';
    const promesa = leerUbicaciones(3, new Date(), 60_000);
    await expect(promesa).rejects.toBeInstanceOf(UbicacionAproximadaError);
    await expect(promesa).rejects.toThrow(/Usar ubicación precisa/);
    expect(mockGps.watch).not.toHaveBeenCalled();
  });

  it('ubicación apagada → GpsDesactivadoError', async () => {
    mockGps.serviciosActivos = false;
    await expect(leerUbicaciones(3, new Date(), 60_000)).rejects.toBeInstanceOf(GpsDesactivadoError);
  });

  it('pide el seguimiento sin depender del diálogo de ajustes, en alta precisión y cada 1 s', async () => {
    const promesa = leerUbicaciones(1, new Date(), 60_000);
    await vaciar();
    expect(mockGps.opciones).toMatchObject({ mayShowUserSettingsDialog: false, accuracy: 6, timeInterval: 1000, distanceInterval: 0 });
    mockGps.emitir!(posicion(Date.now() + 500, 5));
    await expect(promesa).resolves.toHaveLength(1);
  });

  it('modo avión sin fix: espera los 60 s TOTALES y falla con diagnóstico sin coordenadas', async () => {
    const promesa = leerUbicaciones(3, new Date(), 60_000);
    const resultado = promesa.catch((e: unknown) => e);
    await vaciar();
    await jest.advanceTimersByTimeAsync(45_000);
    let terminada = false;
    void resultado.then(() => (terminada = true));
    await vaciar();
    expect(terminada).toBe(false); // con el código original ya habría fallado aquí
    await jest.advanceTimersByTimeAsync(15_000);
    const error = (await resultado) as Error;
    expect(error).toBeInstanceOf(SinSenalGpsError);
    expect(error.message).toMatch(/lecturas recibidas: 0/);
    expect(error.message).toMatch(/permiso: preciso/);
    expect(error.message).toMatch(/proveedor GPS disponible: sí/);
    expect(error.message).not.toMatch(/-0\.18|-78\.47/); // nunca coordenadas
    expect(mockGps.remove).toHaveBeenCalledTimes(1);
  });

  it('ignora posiciones anteriores a la foto y termina al reunir 3 lecturas', async () => {
    const desde = new Date();
    const promesa = leerUbicaciones(3, desde, 60_000);
    await vaciar();
    const t = desde.getTime();
    mockGps.emitir!(posicion(t - 30_000, 4)); // última conocida, anterior a la foto
    mockGps.emitir!(posicion(t + 1000, 20));
    mockGps.emitir!(posicion(t + 2000, 7));
    mockGps.emitir!(posicion(t + 3000, 11));
    const lecturas = await promesa;
    expect(lecturas.map((l) => l.precisionM)).toEqual([20, 7, 11]);
    expect(lecturas.every((l) => Date.parse(l.capturadaEn) >= t)).toBe(true);
    expect(mockGps.remove).toHaveBeenCalledTimes(1);
  });

  it('si TODAS las lecturas son anteriores a la foto, el diagnóstico lo dice (hora del celular)', async () => {
    const desde = new Date();
    const promesa = leerUbicaciones(3, desde, 60_000);
    const resultado = promesa.catch((e: unknown) => e);
    await vaciar();
    for (let i = 0; i < 5; i++) mockGps.emitir!(posicion(desde.getTime() - 90_000 + i * 1000, 6));
    await jest.advanceTimersByTimeAsync(60_000);
    const error = (await resultado) as Error;
    expect(error).toBeInstanceOf(SinSenalGpsError);
    expect(error.message).toMatch(/lecturas recibidas: 5/);
    expect(error.message).toMatch(/descartadas por ser anteriores a la foto: 5 \(la última, 86 s antes/);
  });

  it('arranque colgado: a los 10 s se rinde, informa y limpia (la suscripción tardía se elimina)', async () => {
    mockGps.arranque = 'colgado';
    const promesa = leerUbicaciones(3, new Date(), 60_000);
    const resultado = promesa.catch((e: unknown) => e);
    await vaciar();
    await jest.advanceTimersByTimeAsync(10_000);
    const error = (await resultado) as Error;
    expect(error).toBeInstanceOf(SinSenalGpsError);
    expect(error.message).toMatch(/seguimiento: no arrancó en 10 s/);

    // La suscripción llega tarde: se elimina para no dejar el GPS encendido.
    mockGps.resolverTarde!();
    await vaciar();
    expect(mockGps.remove).toHaveBeenCalledTimes(1);

    // El siguiente intento empieza de cero (no reutiliza la promesa colgada).
    mockGps.arranque = 'ok';
    const otra = leerUbicaciones(1, new Date(), 60_000);
    await vaciar();
    expect(mockGps.watch).toHaveBeenCalledTimes(2);
    mockGps.emitir!(posicion(Date.now() + 500, 5));
    await expect(otra).resolves.toHaveLength(1);
  });

  it('arranque con error: termina de inmediato con el diagnóstico y permite reintentar', async () => {
    mockGps.arranque = 'error';
    const error = (await leerUbicaciones(3, new Date(), 60_000).catch((e: unknown) => e)) as Error;
    expect(error).toBeInstanceOf(SinSenalGpsError);
    expect(error.message).toMatch(/seguimiento: error al arrancar/);
  });

  it('precalentamiento: no pide permiso, comparte un único seguimiento y se apaga al salir', async () => {
    const apagar = prepararGps();
    await vaciar();
    expect(mockGps.pedirPermiso).not.toHaveBeenCalled();
    expect(mockGps.watch).toHaveBeenCalledTimes(1);

    // La foto se toma con el GPS ya encendido: reutiliza el mismo seguimiento.
    const desde = new Date();
    const promesa = leerUbicaciones(1, desde, 60_000);
    await vaciar();
    mockGps.emitir!(posicion(desde.getTime() + 500, 5));
    await expect(promesa).resolves.toHaveLength(1);
    expect(mockGps.watch).toHaveBeenCalledTimes(1);
    expect(mockGps.remove).not.toHaveBeenCalled(); // sigue encendido mientras la pantalla está abierta

    apagar();
    expect(mockGps.remove).toHaveBeenCalledTimes(1);
  });

  it('precalentamiento sin permiso o con permiso aproximado: no enciende el GPS', async () => {
    mockGps.permisoConcedido = false;
    let apagar = prepararGps();
    await vaciar();
    apagar();
    mockGps.permisoConcedido = true;
    mockGps.precision = 'coarse';
    apagar = prepararGps();
    await vaciar();
    apagar();
    expect(mockGps.watch).not.toHaveBeenCalled();
  });

  it('si sale de la pantalla mientras el GPS arranca, la suscripción se elimina al llegar', async () => {
    mockGps.arranque = 'colgado';
    const apagar = prepararGps();
    await vaciar();
    apagar();
    mockGps.resolverTarde!();
    await vaciar();
    expect(mockGps.remove).toHaveBeenCalledTimes(1);
  });
});
