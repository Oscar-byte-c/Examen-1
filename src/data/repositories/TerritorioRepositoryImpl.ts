import type { Candidato, Dignidad } from '@/domain/entities/Acta';
import type { Mesa, MesaAsignada, NuevoRecintoDatos, Recinto } from '@/domain/entities/Territorio';
import type { TerritorioRepository } from '@/domain/repositories/TerritorioRepository';

import { cacheLocal } from '../datasources/local/baseDatos';
import { conectividad } from '../datasources/local/dispositivo';
import { supabase } from '../datasources/remote/supabaseClient';
import { esErrorDeRed, traducirErrorDatos } from '../mappers/errores';
import { aCandidato, aRecinto, type CandidatoDTO, type RecintoDTO } from '../mappers/territorioMapper';

/** Ejecuta una consulta de Supabase y traduce su error a un error de dominio. */
async function consultar<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw traducirErrorDatos(error);
  return data as T;
}

export class TerritorioRepositoryImpl implements TerritorioRepository {
  async listarRecintos(): Promise<Recinto[]> {
    const filas = await consultar<RecintoDTO[]>(
      supabase.from('recintos').select('id, nombre, direccion, parroquia, latitud, longitud').order('nombre'),
    );
    return filas.map(aRecinto);
  }

  async crearRecinto(d: NuevoRecintoDatos): Promise<string> {
    return consultar<string>(
      supabase.rpc('crear_recinto', {
        p: {
          nombre: d.nombre,
          direccion: d.direccion,
          parroquia: d.parroquia,
          latitud: d.latitud,
          longitud: d.longitud,
          numero_mesas: d.numeroMesas,
        },
      }),
    );
  }

  /** Se combinan 4 consultas simples (cada una filtrada por RLS) en lugar de un embed complejo. */
  async listarMesasDeRecinto(recintoId: string): Promise<Mesa[]> {
    const mesas = await consultar<{ id: string; numero: number; recinto_id: string }[]>(
      supabase.from('mesas').select('id, numero, recinto_id').eq('recinto_id', recintoId).order('numero'),
    );
    const ids = mesas.map((m) => m.id);
    const [asignaciones, veedores, actas] = await Promise.all([
      consultar<{ mesa_id: string; veedor_id: string }[]>(
        supabase.from('asignaciones_mesa').select('mesa_id, veedor_id').in('mesa_id', ids).is('revocado_en', null),
      ),
      consultar<{ id: string; nombres: string; apellidos: string }[]>(
        supabase.from('perfiles').select('id, nombres, apellidos').eq('rol', 'veedor').eq('recinto_id', recintoId),
      ),
      consultar<{ mesa_id: string; dignidad: Dignidad }[]>(
        supabase.from('actas').select('mesa_id, dignidad').in('mesa_id', ids),
      ),
    ]);
    return mesas.map((m) => {
      const veedorId = asignaciones.find((a) => a.mesa_id === m.id)?.veedor_id ?? null;
      const veedor = veedores.find((v) => v.id === veedorId);
      return {
        id: m.id,
        recintoId: m.recinto_id,
        numero: m.numero,
        veedorId,
        veedorNombre: veedor ? `${veedor.nombres} ${veedor.apellidos}` : null,
        dignidadesRecibidas: actas.filter((a) => a.mesa_id === m.id).map((a) => a.dignidad),
      };
    });
  }

  async asignarMesa(mesaId: string, veedorId: string): Promise<void> {
    await consultar(supabase.rpc('asignar_mesa', { p_mesa: mesaId, p_veedor: veedorId }));
  }

  /** Con red: consulta y guarda en caché. Sin red: devuelve la última copia (RF-16). */
  async listarMisMesas(): Promise<MesaAsignada[]> {
    const { data: sesion } = await supabase.auth.getSession();
    const uid = sesion.session?.user.id;
    if (!uid) return [];
    const clave = `mis_mesas:${uid}`;
    if (!(await conectividad.hayConexion())) return (await cacheLocal.leer<MesaAsignada[]>(clave)) ?? [];

    try {
      const asignaciones = await consultar<{ mesa_id: string }[]>(
        supabase.from('asignaciones_mesa').select('mesa_id').eq('veedor_id', uid).is('revocado_en', null),
      );
      const filas = await consultar<{ id: string; numero: number; recinto: RecintoDTO }[]>(
        supabase
          .from('mesas')
          .select('id, numero, recinto:recintos(id, nombre, direccion, parroquia, latitud, longitud)')
          .in('id', asignaciones.map((a) => a.mesa_id))
          .order('numero')
          .returns<{ id: string; numero: number; recinto: RecintoDTO }[]>(),
      );
      const mesas = filas.map((f) => ({ id: f.id, numero: f.numero, recinto: aRecinto(f.recinto) }));
      await cacheLocal.guardar(clave, mesas); // S-05: si le quitan una mesa, desaparece de la caché
      return mesas;
    } catch (e) {
      if (esErrorDeRed(e)) return (await cacheLocal.leer<MesaAsignada[]>(clave)) ?? [];
      throw e;
    }
  }

  async listarCandidatos(dignidad: Dignidad): Promise<Candidato[]> {
    const clave = 'candidatos';
    let todos = await cacheLocal.leer<Candidato[]>(clave);
    if (await conectividad.hayConexion()) {
      try {
        const filas = await consultar<CandidatoDTO[]>(
          supabase.from('candidatos').select('id, nombres, dignidad, organizacion:organizaciones(nombre, siglas, lista, color)'),
        );
        todos = filas.map(aCandidato);
        await cacheLocal.guardar(clave, todos);
      } catch (e) {
        if (!esErrorDeRed(e) || !todos) throw e;
      }
    }
    return (todos ?? []).filter((c) => c.dignidad === dignidad).sort((a, b) => a.lista - b.lista);
  }
}
