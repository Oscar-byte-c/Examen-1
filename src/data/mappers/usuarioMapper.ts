import { Role } from '@/domain/entities/Role';
import type { PersonaEquipo, Usuario } from '@/domain/entities/Usuario';

/** Fila de `public.perfiles` (snake_case, tal como la devuelve PostgREST). */
export type PerfilDTO = {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  rol: string;
  recinto_id: string | null;
  activo: boolean;
};

const ROLES = new Set<string>(Object.values(Role));

/** Rechaza roles desconocidos: un valor inesperado nunca se convierte en un rol válido. */
export function aRol(valor: string): Role {
  if (!ROLES.has(valor)) throw new Error('rol_desconocido');
  return valor as Role;
}

export function aUsuario(
  perfil: PerfilDTO,
  auth: { email?: string | null; app_metadata?: Record<string, unknown> },
): Usuario {
  return {
    id: perfil.id,
    correo: auth.email ?? '',
    nombres: perfil.nombres,
    apellidos: perfil.apellidos,
    rol: aRol(perfil.rol),
    recintoId: perfil.recinto_id,
    // ADR-01: la bandera vive en app_metadata (solo la escribe el servidor).
    debeCambiarClave: auth.app_metadata?.debe_cambiar_clave === true,
  };
}

export function aPersonaEquipo(p: PerfilDTO): PersonaEquipo {
  return {
    id: p.id,
    nombres: p.nombres,
    apellidos: p.apellidos,
    cedula: p.cedula,
    telefono: p.telefono,
    rol: aRol(p.rol),
    recintoId: p.recinto_id,
    activo: p.activo,
  };
}
