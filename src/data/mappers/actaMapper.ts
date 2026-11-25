import type { Acta, Dignidad } from '@/domain/entities/Acta';

/** Fila de `public.actas` con sus votos embebidos (PostgREST). */
export type ActaRemotaDTO = {
  id: string;
  mesa_id: string;
  dignidad: string;
  total_sufragantes: number;
  votos_blancos: number;
  votos_nulos: number;
  latitud: number;
  longitud: number;
  precision_gps_m: number;
  capturada_en: string;
  foto_path: string;
  distancia_recinto_m: number;
  fuera_de_rango: boolean;
  version: number;
  updated_at: string;
  votos_acta: { candidato_id: string; votos: number }[];
};

/**
 * Acta del servidor → entidad. `fotoUri` vacío: la foto original se ve con `evidenciaServidor`
 * (Storage privado) y, para corregir el acta, hay que tomar una foto nueva.
 */
export function deActaRemota(d: ActaRemotaDTO): Acta {
  return {
    id: d.id,
    mesaId: d.mesa_id,
    dignidad: d.dignidad as Dignidad,
    totalSufragantes: d.total_sufragantes,
    votosBlancos: d.votos_blancos,
    votosNulos: d.votos_nulos,
    votos: d.votos_acta.map((v) => ({ candidatoId: v.candidato_id, votos: v.votos })),
    fotoUri: '',
    ubicacion: { latitud: d.latitud, longitud: d.longitud, precisionM: d.precision_gps_m, capturadaEn: d.capturada_en },
    evidenciaServidor: { fotoPath: d.foto_path, distanciaM: d.distancia_recinto_m, fueraDeRango: d.fuera_de_rango },
    versionBase: d.version,
    estado: 'enviada',
    error: null,
    actualizadaEn: d.updated_at,
  };
}

/** Entidad → JSON que espera la RPC `sincronizar_acta` (snake_case). */
export function aPayloadSincronizacion(a: Acta, fotoPath: string) {
  return {
    id: a.id,
    mesa_id: a.mesaId,
    dignidad: a.dignidad,
    version_base: a.versionBase,
    total_sufragantes: a.totalSufragantes,
    votos_blancos: a.votosBlancos,
    votos_nulos: a.votosNulos,
    votos: a.votos.map((v) => ({ candidato_id: v.candidatoId, votos: v.votos })),
    foto_path: fotoPath,
    latitud: a.ubicacion.latitud,
    longitud: a.ubicacion.longitud,
    precision_gps_m: a.ubicacion.precisionM,
    capturada_en: a.ubicacion.capturadaEn,
  };
}
