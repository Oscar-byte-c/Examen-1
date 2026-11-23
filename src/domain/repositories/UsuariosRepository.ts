import type { CuentaCreada, NuevoUsuarioDatos, PersonaEquipo } from '../entities/Usuario';

/** Alta de cuentas por la jerarquía (RF-01, RF-20). La creación real ocurre en el servidor. */
export interface UsuariosRepository {
  crearCuenta(datos: NuevoUsuarioDatos & { recintoId?: string }, urlRetorno: string): Promise<CuentaCreada>;
  /** Veedores del recinto del coordinador que consulta (la RLS filtra). */
  listarVeedores(): Promise<PersonaEquipo[]>;
  /** Coordinadores de recinto (para el coordinador provincial). */
  listarCoordinadores(): Promise<PersonaEquipo[]>;
}
