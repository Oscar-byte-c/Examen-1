import NetInfo from '@react-native-community/netinfo';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
// Decodificador JPEG en JavaScript puro (funciona en Expo Go). useTArray evita depender de `Buffer`.
import { decode as decodificarJpeg } from 'jpeg-js';

import { ANCHO_ANALISIS_FOTO } from '@/domain/constants';
import { UbicacionRequeridaError } from '@/domain/entities/errores';
import type { Ubicacion } from '@/domain/entities/geo';
import { varianzaLaplaciano } from '@/domain/entities/nitidez';

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

/** ADR-04: nitidez = varianza del laplaciano sobre una copia pequeña de la foto. */
export async function medirNitidez(uri: string): Promise<number> {
  const reducida = await ImageManipulator.manipulate(uri).resize({ width: ANCHO_ANALISIS_FOTO }).renderAsync();
  const guardada = await reducida.saveAsync({ format: SaveFormat.JPEG, compress: 0.95 });
  const archivo = new File(guardada.uri);
  try {
    const jpeg = decodificarJpeg(await archivo.bytes(), { useTArray: true, formatAsRGBA: true });
    return varianzaLaplaciano(jpeg.data, jpeg.width, jpeg.height);
  } finally {
    if (archivo.exists) archivo.delete();
  }
}

const conLimite = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error('timeout')), ms))]);

/** ADR-04 / S-06: varias lecturas de GPS. El GPS es obligatorio: sin permiso o sin señal se lanza error. */
export async function leerUbicaciones(cantidad: number): Promise<Ubicacion[]> {
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (permiso.status !== 'granted' || !(await Location.hasServicesEnabledAsync())) {
    throw new UbicacionRequeridaError();
  }
  const lecturas: Ubicacion[] = [];
  for (let i = 0; i < cantidad; i++) {
    try {
      const p = await conLimite(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }), 15_000);
      lecturas.push({
        latitud: p.coords.latitude,
        longitud: p.coords.longitude,
        precisionM: p.coords.accuracy ?? 9999,
        capturadaEn: new Date(p.timestamp).toISOString(),
      });
    } catch {
      // Una lectura fallida no detiene el proceso; si fallan todas, el caso de uso lo detecta.
    }
  }
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
