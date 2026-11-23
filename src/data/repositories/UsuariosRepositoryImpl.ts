import type { CuentaCreada, NuevoUsuarioDatos, PersonaEquipo } from '@/domain/entities/Usuario';
import type { UsuariosRepository } from '@/domain/repositories/UsuariosRepository';

import { supabase } from '../datasources/remote/supabaseClient';
import { traducirErrorDatos, traducirErrorFuncion } from '../mappers/errores';
import { aPersonaEquipo, type PerfilDTO } from '../mappers/usuarioMapper';

const COLUMNAS = 'id, cedula, nombres, apellidos, telefono, rol, recinto_id, activo';

export class UsuariosRepositoryImpl implements UsuariosRepository {
  /** La creación ocurre en la Edge Function `crear-usuario` (service_role solo en el servidor). */
  async crearCuenta(datos: NuevoUsuarioDatos & { recintoId?: string }, urlRetorno: string): Promise<CuentaCreada> {
    const { data, error } = await supabase.functions.invoke<{ id: string; claveTemporal: string }>('crear-usuario', {
      body: { ...datos, redirectTo: urlRetorno },
    });
    if (error || !data) throw await traducirErrorFuncion(error);
    return { id: data.id, claveTemporal: data.claveTemporal };
  }

  private async listarPorRol(rol: string): Promise<PersonaEquipo[]> {
    // La RLS decide qué filas devuelve: el coordinador de recinto solo recibe SUS veedores.
    const { data, error } = await supabase
      .from('perfiles')
      .select(COLUMNAS)
      .eq('rol', rol)
      .order('apellidos')
      .returns<PerfilDTO[]>();
    if (error) throw traducirErrorDatos(error);
    return data.map(aPersonaEquipo);
  }

  listarVeedores(): Promise<PersonaEquipo[]> {
    return this.listarPorRol('veedor');
  }

  listarCoordinadores(): Promise<PersonaEquipo[]> {
    return this.listarPorRol('coordinador_recinto');
  }
}
