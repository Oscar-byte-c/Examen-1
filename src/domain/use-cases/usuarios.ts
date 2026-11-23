import { nuevoUsuarioSchema, type CuentaCreada, type PersonaEquipo } from '../entities/Usuario';
import type { UsuariosRepository } from '../repositories/UsuariosRepository';
import { primerError } from './auth';

export type DatosCuenta = {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  correo: string;
  /** Solo cuando el provincial crea un coordinador de recinto. */
  recintoId?: string;
};

/**
 * RF-01 / RF-02 / RF-20: crear la cuenta de un subordinado.
 * Se valida aquí para responder de inmediato, pero la Edge Function repite TODAS las
 * validaciones y decide el rol según quién llama: el cliente no elige el rol.
 */
export class CrearCuenta {
  constructor(private readonly usuarios: UsuariosRepository) {}
  async execute(datos: DatosCuenta, urlRetorno: string): Promise<CuentaCreada> {
    const r = nuevoUsuarioSchema.safeParse(datos);
    if (!r.success) throw primerError(r.error);
    return this.usuarios.crearCuenta({ ...r.data, recintoId: datos.recintoId }, urlRetorno);
  }
}

export class ListarVeedores {
  constructor(private readonly usuarios: UsuariosRepository) {}
  execute(): Promise<PersonaEquipo[]> {
    return this.usuarios.listarVeedores();
  }
}

export class ListarCoordinadores {
  constructor(private readonly usuarios: UsuariosRepository) {}
  execute(): Promise<PersonaEquipo[]> {
    return this.usuarios.listarCoordinadores();
  }
}
