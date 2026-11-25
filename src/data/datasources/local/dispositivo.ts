import NetInfo from '@react-native-community/netinfo';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
// Decodificador JPEG en JavaScript puro (funciona en Expo Go). useTArray evita depender de `Buffer`.
import { decode as decodificarJpeg } from 'jpeg-js';

import { ANCHO_ANALISIS_FOTO } from '@/domain/constants';
import {
  GpsDesactivadoError,
  PermisoUbicacionError,
  SinSenalGpsError,
  UbicacionAproximadaError,
} from '@/domain/entities/errores';
import type { Ubicacion } from '@/domain/entities/geo';
import { nitidezImagen } from '@/domain/entities/nitidez';

/** Fotos de actas: directorio PERSISTENTE de la app (la caché la puede vaciar el sistema). */
const directorioFotos = () => {
  const dir = new Directory(Paths.document, 'actas');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
};

export const fotosLocales = {
  /** Reduce la foto a 1600 px (legible y liviana para subir con mala señal) y la conserva. */
  async conservar(uriTemporal: string, actaId: string): Promise<string> {
    const imagen = await ImageManipulator.manipulate(uriTemporal).resize({ width: 1600 }).renderAsync();
    const resultado = await imagen.saveAsync({ format: SaveFormat.JPEG, compress: 0.75 });
    const destino = new File(directorioFotos(), `${actaId}-${Date.now()}.jpg`);
    new File(resultado.uri).moveSync(destino);
    return destino.uri;
  },

  async bytes(uri: string): Promise<Uint8Array> {
    return new File(uri).bytes();
  },

  existe: (uri: string) => new File(uri).exists,
};

/** ADR-04: nitidez (varianza del laplaciano por ejes y bloques) sobre una copia reducida de la foto. */
export async function medirNitidez(uri: string): Promise<number> {
  const reducida = await ImageManipulator.manipulate(uri).resize({ width: ANCHO_ANALISIS_FOTO }).renderAsync();
  const guardada = await reducida.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
  const archivo = new File(guardada.uri);
  try {
    const jpeg = decodificarJpeg(await archivo.bytes(), { useTArray: true, formatAsRGBA: true });
    return nitidezImagen(jpeg.data, jpeg.width, jpeg.height);
  } finally {
    if (archivo.exists) archivo.delete();
  }
}

// ---------------------------------------------------------------------------
// GPS (ADR-04 / RF-12 / S-06)
// Un único seguimiento (`watchPositionAsync`) compartido por:
//  - el PRECALENTAMIENTO, mientras la pantalla del acta está abierta: mantiene el receptor
//    encendido para que, sin internet (sin A-GPS ni Wi-Fi), ya tenga señal al tomar la foto;
//  - la LECTURA tras la captura: solo acepta posiciones con fecha >= la captura.
// El receptor se apaga cuando nadie lo usa (ahorro de batería).
//
// expo-location usa en Android SOLO el proveedor "fused" de Google Play Services (no habla
// directo con el chip GNSS como una app tipo GPS Test). Por eso:
//  - se exige permiso de ubicación PRECISA (con la aproximada, fused nunca enciende el GPS);
//  - `mayShowUserSettingsDialog: false`: si Android informa el proveedor "network" deshabilitado,
//    expo-location dejaría el seguimiento esperando un diálogo de ajustes; así se pide directo;
//  - el arranque tiene un límite de 10 s y, si falla, se limpia para poder reintentar.
// ---------------------------------------------------------------------------
type OyenteGps = (u: Ubicacion) => void;

/** Límite para que `watchPositionAsync` confirme el arranque (no incluye esperar el primer fix). */
export const ARRANQUE_GPS_MAX_MS = 10_000;

type EstadoArranque = 'sin intentar' | 'activo' | 'no arrancó en 10 s' | 'error al arrancar';

const gps = {
  oyentes: new Set<OyenteGps>(),
  usos: 0,
  suscripcion: null as Location.LocationSubscription | null,
  iniciando: null as Promise<void> | null,
  arranque: 'sin intentar' as EstadoArranque,
};

const aUbicacion = (p: Location.LocationObject): Ubicacion => ({
  latitud: p.coords.latitude,
  longitud: p.coords.longitude,
  precisionM: p.coords.accuracy ?? 9999,
  capturadaEn: new Date(p.timestamp).toISOString(),
});

class TiempoAgotado extends Error {}

/**
 * Enciende el seguimiento si aún no está encendido. Si no confirma en 10 s, o falla, se limpia
 * `iniciando` (el siguiente intento empieza de cero) y, si la suscripción llega tarde, se elimina.
 */
function encenderSeguimiento(): Promise<void> {
  if (gps.suscripcion) return Promise.resolve();
  if (gps.iniciando) return gps.iniciando;

  const intento = Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Highest, timeInterval: 1000, distanceInterval: 0, mayShowUserSettingsDialog: false },
    (p) => {
      const u = aUbicacion(p);
      gps.oyentes.forEach((cb) => cb(u));
    },
  );
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new TiempoAgotado()), ARRANQUE_GPS_MAX_MS);
  });

  gps.iniciando = Promise.race([intento, limite])
    .then((s) => {
      gps.arranque = 'activo';
      if (gps.usos > 0) gps.suscripcion = s;
      else s.remove(); // nadie lo necesita ya (salió de la pantalla mientras arrancaba)
    })
    .catch((e: unknown) => {
      gps.arranque = e instanceof TiempoAgotado ? 'no arrancó en 10 s' : 'error al arrancar';
      // Si la suscripción llega después del límite, se elimina: no queda un GPS encendido huérfano.
      void intento.then((s) => s.remove()).catch(() => undefined);
      throw e;
    })
    .finally(() => {
      clearTimeout(temporizador);
      gps.iniciando = null;
    });
  return gps.iniciando;
}

/** Registra un uso del GPS; la función devuelta lo libera (una sola vez) y apaga el receptor si era el último. */
function usarSeguimiento(): () => void {
  gps.usos++;
  let liberado = false;
  return () => {
    if (liberado) return;
    liberado = true;
    gps.usos--;
    if (gps.usos === 0 && gps.suscripcion) {
      gps.suscripcion.remove();
      gps.suscripcion = null;
    }
  };
}

/** Precisión REAL del permiso concedido. En Android: 'fine' (precisa) o 'coarse' (aproximada). */
const precisionPermiso = (p: Location.LocationPermissionResponse): string => p.android?.accuracy ?? 'no aplica';

/**
 * Precalienta el GPS. NO pide permiso (no interrumpe al abrir la pantalla): si aún no se concedió
 * la ubicación PRECISA o la ubicación está apagada, no hace nada; el problema se informa al tomar la foto.
 */
export function prepararGps(): () => void {
  const liberar = usarSeguimiento();
  void (async () => {
    const permiso = await Location.getForegroundPermissionsAsync();
    if (permiso.status !== 'granted' || precisionPermiso(permiso) === 'coarse') return;
    if (!(await Location.hasServicesEnabledAsync())) return;
    await encenderSeguimiento();
  })().catch(() => undefined);
  return liberar;
}

/** Diagnóstico de una lectura fallida. Solo contadores y estados: NUNCA coordenadas. */
type Diagnostico = {
  permiso: string;
  recibidas: number;
  descartadasPorHora: number;
  /** Cuántos segundos antes de la foto estaba fechada la última lectura descartada. */
  desfaseS: number | null;
};

async function describir(d: Diagnostico): Promise<string> {
  const estado = await Location.getProviderStatusAsync().catch(() => null);
  const si = (v: boolean | undefined) => (v === undefined ? 'desconocido' : v ? 'sí' : 'no');
  return [
    `permiso: ${d.permiso === 'fine' ? 'preciso' : d.permiso}`,
    `proveedor GPS disponible: ${si(estado?.gpsAvailable)}`,
    `proveedor de red: ${si(estado?.networkAvailable)}`,
    `seguimiento: ${gps.arranque}`,
    `lecturas recibidas: ${d.recibidas}`,
    `descartadas por ser anteriores a la foto: ${d.descartadasPorHora}` +
      (d.desfaseS !== null ? ` (la última, ${d.desfaseS} s antes; revisa la hora del celular)` : ''),
  ].join(' · ');
}

/**
 * Reúne hasta `cantidad` lecturas tomadas desde `desde`, con un tiempo TOTAL máximo de `limiteMs`.
 * Causas distintas, mensajes distintos: sin permiso → PermisoUbicacionError; permiso aproximado →
 * UbicacionAproximadaError; ubicación apagada → GpsDesactivadoError; ninguna lectura válida →
 * SinSenalGpsError con diagnóstico. Si llegan 1 o 2 lecturas, se devuelven (se usa la mejor).
 */
export async function leerUbicaciones(cantidad: number, desde: Date, limiteMs: number): Promise<Ubicacion[]> {
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (permiso.status !== 'granted') throw new PermisoUbicacionError();
  // Valor REAL del permiso (Android 12+ permite conceder solo la ubicación aproximada).
  if (precisionPermiso(permiso) === 'coarse') throw new UbicacionAproximadaError();
  if (!(await Location.hasServicesEnabledAsync())) throw new GpsDesactivadoError();

  const diagnostico: Diagnostico = { permiso: precisionPermiso(permiso), recibidas: 0, descartadasPorHora: 0, desfaseS: null };
  const liberar = usarSeguimiento();
  const lecturas: Ubicacion[] = [];
  try {
    await new Promise<void>((resolver) => {
      let temporizador: ReturnType<typeof setTimeout> | undefined;
      const terminar = () => {
        clearTimeout(temporizador);
        gps.oyentes.delete(oyente);
        resolver();
      };
      const oyente: OyenteGps = (u) => {
        diagnostico.recibidas++;
        const fecha = Date.parse(u.capturadaEn);
        // Una posición anterior a la foto (p. ej. la última conocida) no es la ubicación de la captura.
        if (fecha < desde.getTime()) {
          diagnostico.descartadasPorHora++;
          diagnostico.desfaseS = Math.round((desde.getTime() - fecha) / 1000);
          return;
        }
        lecturas.push(u);
        if (lecturas.length >= cantidad) terminar();
      };
      temporizador = setTimeout(terminar, limiteMs);
      gps.oyentes.add(oyente);
      // Si el seguimiento no arranca (10 s o error), no llegará nada: se termina ya con el diagnóstico.
      encenderSeguimiento().catch(terminar);
    });
  } finally {
    liberar();
  }
  if (lecturas.length === 0) throw new SinSenalGpsError(Math.round(limiteMs / 1000), await describir(diagnostico));
  return lecturas;
}

/** ADR-10: conectividad real (con acceso a internet, no solo Wi-Fi conectado). */
export const conectividad = {
  async hayConexion(): Promise<boolean> {
    const e = await NetInfo.fetch();
    return e.isConnected === true && e.isInternetReachable !== false;
  },
  observar(callback: (conectado: boolean) => void): () => void {
    return NetInfo.addEventListener((e) => callback(e.isConnected === true && e.isInternetReachable !== false));
  },
};
