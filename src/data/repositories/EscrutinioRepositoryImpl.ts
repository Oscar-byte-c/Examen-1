import { randomUUID } from 'expo-crypto';

import type { Dignidad, ResultadosActa } from '@/domain/entities/Acta';
import type { AvanceRecinto, ConflictoActa, ConteoCandidato, UbicacionActa } from '@/domain/entities/Escrutinio';
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
