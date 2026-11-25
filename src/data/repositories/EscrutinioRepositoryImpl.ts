import { randomUUID } from 'expo-crypto';

import type { Dignidad, ResultadosActa } from '@/domain/entities/Acta';
import type { AvanceRecinto, ConflictoActa, ConteoCandidato, UbicacionActa, VotosActaRecinto } from '@/domain/entities/Escrutinio';
import type { HistorialActa } from '@/domain/entities/Historial';
import type { Role } from '@/domain/entities/Role';
import type { EscrutinioRepository } from '@/domain/repositories/EscrutinioRepository';

import { supabase } from '../datasources/remote/supabaseClient';
import { traducirErrorDatos } from '../mappers/errores';

type SnapshotActa = {
  total_sufragantes: number;
  votos_blancos: number;
  votos_nulos: number;
  version?: number;
  votos: { candidato_id: string; votos: number }[];
};

/** Fila del acta guardada por `privado.snapshot_acta` en `actas_historial.datos`. */
type SnapshotHistorial = SnapshotActa & {
  foto_path: string;
  latitud: number;
  longitud: number;
  precision_gps_m: number;
  distancia_recinto_m: number;
  fuera_de_rango: boolean;
  capturada_en: string;
};

const aResultados = (s: SnapshotActa): ResultadosActa => ({
  totalSufragantes: s.total_sufragantes,
  votosBlancos: s.votos_blancos,
  votosNulos: s.votos_nulos,
  votos: s.votos.map((v) => ({ candidatoId: v.candidato_id, votos: v.votos })),
});

export class EscrutinioRepositoryImpl implements EscrutinioRepository {
  async avancePorRecinto(): Promise<AvanceRecinto[]> {
    const { data, error } = await supabase.rpc('avance_por_recinto');
    if (error) throw traducirErrorDatos(error);
    return (data as Record<string, unknown>[]).map((r) => ({
      recintoId: String(r.recinto_id),
      nombre: String(r.nombre),
      latitud: Number(r.latitud),
      longitud: Number(r.longitud),
      mesasTotal: Number(r.mesas_total),
      mesasReportadas: Number(r.mesas_reportadas),
      mesasParciales: Number(r.mesas_parciales),
    }));
  }

  async conteoPorCandidato(): Promise<ConteoCandidato[]> {
    const { data, error } = await supabase.rpc('conteo_por_candidato');
    if (error) throw traducirErrorDatos(error);
    return (data as Record<string, unknown>[]).map((r) => ({
      dignidad: r.dignidad as Dignidad,
      candidatoId: String(r.candidato_id),
      candidato: String(r.candidato),
      organizacion: String(r.organizacion),
      lista: Number(r.lista),
      color: String(r.color),
      votos: Number(r.votos),
    }));
  }

  /**
   * RF-15: una fila por acta del servidor (versión vigente) con su recinto, sus votos y sus
   * totales. Solo LECTURA: la RLS de `actas`, `votos_acta` y `mesas` limita el resultado a lo que
   * el rol puede ver. Se pide por páginas para no depender del límite de filas de la API.
   */
  async votosPorActa(): Promise<VotosActaRecinto[]> {
    const PAGINA = 500;
    type Fila = {
      id: string;
      dignidad: Dignidad;
      total_sufragantes: number;
      votos_blancos: number;
      votos_nulos: number;
      mesa: { recinto_id: string };
      votos: { candidato_id: string; votos: number }[];
    };
    const filas: Fila[] = [];
    for (let desde = 0; ; desde += PAGINA) {
      const { data, error } = await supabase
        .from('actas')
        .select('id, dignidad, total_sufragantes, votos_blancos, votos_nulos, mesa:mesas!inner(recinto_id), votos:votos_acta(candidato_id, votos)')
        .order('id')
        .range(desde, desde + PAGINA - 1)
        .returns<Fila[]>();
      if (error) throw traducirErrorDatos(error);
      filas.push(...data);
      if (data.length < PAGINA) break;
    }
    return filas.map((a) => ({
      actaId: a.id,
      recintoId: a.mesa.recinto_id,
      dignidad: a.dignidad,
      totalSufragantes: a.total_sufragantes,
      votosBlancos: a.votos_blancos,
      votosNulos: a.votos_nulos,
      votos: a.votos.map((v) => ({ candidatoId: v.candidato_id, votos: v.votos })),
    }));
  }

  /**
   * S-04 / ADR-11: versiones de un acta desde `actas_historial`, con el perfil del autor.
   * La RLS solo entrega historial a coordinadores y de mesas que pueden ver; del autor se piden
   * solo nombre, apellidos y rol (nunca cédula, teléfono ni correo).
   */
  async historialActa(mesaId: string, dignidad: Dignidad): Promise<HistorialActa | null> {
    const acta = await supabase.from('actas').select('id, version').eq('mesa_id', mesaId).eq('dignidad', dignidad).maybeSingle();
    if (acta.error) throw traducirErrorDatos(acta.error);
    if (!acta.data) return null;

    const { data, error } = await supabase
      .from('actas_historial')
      .select('version, operacion_id, modificado_en, modificado_por, datos, autor:perfiles(nombres, apellidos, rol)')
      .eq('acta_id', acta.data.id)
      .order('version', { ascending: false })
      .returns<
        {
          version: number;
          operacion_id: string;
          modificado_en: string;
          modificado_por: string;
          datos: SnapshotHistorial;
          autor: { nombres: string; apellidos: string; rol: Role } | null;
        }[]
      >();
    if (error) throw traducirErrorDatos(error);
    return {
      actaId: acta.data.id,
      versionActual: acta.data.version,
      versiones: data.map((h) => ({
        version: h.version,
        operacionId: h.operacion_id,
        modificadoEn: h.modificado_en,
        autorId: h.modificado_por,
        autor: h.autor ? { nombre: `${h.autor.nombres} ${h.autor.apellidos}`, rol: h.autor.rol } : null,
        resultados: aResultados(h.datos),
        fotoPath: h.datos.foto_path,
        ubicacion: {
          latitud: h.datos.latitud,
          longitud: h.datos.longitud,
          precisionM: h.datos.precision_gps_m,
          distanciaM: h.datos.distancia_recinto_m,
          fueraDeRango: h.datos.fuera_de_rango,
          capturadaEn: h.datos.capturada_en,
        },
      })),
    };
  }

  async ubicacionesActas(): Promise<UbicacionActa[]> {
    const { data, error } = await supabase
      .from('actas')
      .select('id, dignidad, latitud, longitud, distancia_recinto_m, fuera_de_rango, mesa:mesas(numero, recinto_id, recinto:recintos(nombre))')
      .returns<
        {
          id: string;
          dignidad: Dignidad;
          latitud: number;
          longitud: number;
          distancia_recinto_m: number;
          fuera_de_rango: boolean;
          mesa: { numero: number; recinto_id: string; recinto: { nombre: string } };
        }[]
      >();
    if (error) throw traducirErrorDatos(error);
    return data.map((a) => ({
      actaId: a.id,
      dignidad: a.dignidad,
      latitud: a.latitud,
      longitud: a.longitud,
      distanciaM: a.distancia_recinto_m,
      fueraDeRango: a.fuera_de_rango,
      mesaNumero: a.mesa.numero,
      recintoId: a.mesa.recinto_id,
      recintoNombre: a.mesa.recinto.nombre,
    }));
  }

  async conflictosPendientes(): Promise<ConflictoActa[]> {
    const { data, error } = await supabase
      .from('actas_conflictos')
      .select('id, dignidad, creado_en, version_servidor, datos_servidor, datos_cliente, mesa:mesas(numero)')
      .eq('estado', 'pendiente')
      .order('creado_en')
      .returns<
        {
          id: string;
          dignidad: Dignidad;
          creado_en: string;
          version_servidor: number;
          datos_servidor: SnapshotActa;
          datos_cliente: SnapshotActa;
          mesa: { numero: number };
        }[]
      >();
    if (error) throw traducirErrorDatos(error);
    return data.map((c) => ({
      id: c.id,
      mesaNumero: c.mesa.numero,
      dignidad: c.dignidad,
      creadoEn: c.creado_en,
      servidor: { ...aResultados(c.datos_servidor), version: c.version_servidor },
      dispositivo: aResultados(c.datos_cliente),
    }));
  }

  async resolverConflicto(conflictoId: string, eleccion: 'servidor' | 'dispositivo'): Promise<void> {
    const { error } = await supabase.rpc('resolver_conflicto', {
      p_conflicto: conflictoId,
      p_eleccion: eleccion === 'dispositivo' ? 'cliente' : 'servidor',
    });
    if (error) throw traducirErrorDatos(error);
  }

  /** ADR-07: canal Realtime (respeta la RLS). Se cierra al desmontar la pantalla o cerrar sesión. */
  suscribirCambios(callback: () => void): () => void {
    const canal = supabase
      .channel(`escrutinio-${randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actas' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actas_conflictos' }, callback)
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }
}
