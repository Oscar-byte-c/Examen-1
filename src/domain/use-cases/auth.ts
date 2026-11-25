import { DatoInvalidoError } from '../entities/errores';
import {
  loginSchema,
  nuevaClaveSchema,
  recuperacionSchema,
  type ResultadoCambioClave,
  type SesionRestaurada,
  type Usuario,
} from '../entities/Usuario';
import type { AuthRepository } from '../repositories/AuthRepository';

/** Primer mensaje de error de un safeParse de Zod, convertido en error de dominio. */
export function primerError(error: { issues: { message: string }[] }): DatoInvalidoError {
  return new DatoInvalidoError(error.issues[0]?.message ?? 'Datos no válidos.');
}

/** Valida y normaliza las credenciales (correo en minúsculas y sin espacios) antes de ir al servidor. */
export class IniciarSesion {
  constructor(private readonly auth: AuthRepository) {}
  async execute(correo: string, clave: string): Promise<Usuario> {
    const r = loginSchema.safeParse({ correo, clave });
    if (!r.success) throw primerError(r.error);
    return this.auth.iniciarSesion(r.data.correo, r.data.clave);
  }
}

export class CerrarSesion {
  constructor(private readonly auth: AuthRepository) {}
  execute(): Promise<void> {
    return this.auth.cerrarSesion();
  }
}

export class RestaurarSesion {
  constructor(private readonly auth: AuthRepository) {}
  execute(): Promise<SesionRestaurada | null> {
    return this.auth.restaurarSesion();
  }
}

export class ObservarCierreSesion {
  constructor(private readonly auth: AuthRepository) {}
  execute(callback: () => void): () => void {
    return this.auth.observarCierre(callback);
  }
}

/** RF-02 / ADR-01: cambio obligatorio de la clave temporal (y cambio tras una recuperación). */
export class CambiarClave {
  constructor(private readonly auth: AuthRepository) {}
  async execute(clave: string, confirmacion: string): Promise<ResultadoCambioClave> {
    const r = nuevaClaveSchema.safeParse({ clave, confirmacion });
    if (!r.success) throw primerError(r.error);
    return this.auth.cambiarClave(r.data.clave);
  }
}

/** RF-04: solicitar el enlace de recuperación. */
export class SolicitarRecuperacion {
  constructor(private readonly auth: AuthRepository) {}
  async execute(correo: string, urlRetorno: string): Promise<void> {
    const r = recuperacionSchema.safeParse({ correo });
    if (!r.success) throw primerError(r.error);
    await this.auth.solicitarRecuperacion(r.data.correo, urlRetorno);
  }
}

export class AbrirSesionRecuperacion {
  constructor(private readonly auth: AuthRepository) {}
  execute(url: string): Promise<void> {
    return this.auth.abrirSesionRecuperacion(url);
  }
}
