import { FunctionsFetchError, FunctionsHttpError, isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';

import {
  CorreoNoVerificadoError,
  CredencialesInvalidasError,
  CuentaInactivaError,
  DatoInvalidoError,
  DemasiadosIntentosError,
  DuplicadoError,
  ErrorDesconocido,
  ErrorDominio,
  SinConexionError,
  SinPermisoError,
} from '@/domain/entities/errores';

/**
 * Traduce errores técnicos (Supabase Auth, PostgREST, Edge Functions, red) a errores de
 * dominio. Ningún mensaje interno llega a la UI (regla de la capa data).
 */
export function esErrorDeRed(e: unknown): boolean {
  if (e instanceof SinConexionError || isAuthRetryableFetchError(e) || e instanceof FunctionsFetchError) return true;
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : '';
  return /network request failed|failed to fetch|network error|timeout/i.test(msg);
}

export function traducirErrorAuth(e: unknown): ErrorDominio {
  if (e instanceof ErrorDominio) return e;
  if (esErrorDeRed(e)) return new SinConexionError('Sin conexión. Para ingresar por primera vez necesitas internet.');
  if (isAuthApiError(e)) {
    switch (e.code) {
      case 'invalid_credentials':
        return new CredencialesInvalidasError();
      case 'email_not_confirmed':
        return new CorreoNoVerificadoError();
      case 'user_banned':
        return new CuentaInactivaError();
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
        return new DemasiadosIntentosError();
    }
    if (e.status === 429) return new DemasiadosIntentosError();
  }
  return new ErrorDesconocido();
}

/** Errores de PostgREST/RPC: las funciones del servidor lanzan 'codigo: mensaje para el usuario'. */
export function traducirErrorDatos(e: unknown): ErrorDominio {
  if (e instanceof ErrorDominio) return e;
  if (esErrorDeRed(e)) return new SinConexionError();
  const err = (e ?? {}) as { code?: string; message?: string };
  const mensaje = err.message?.includes(':') ? err.message.split(':').slice(1).join(':').trim() : undefined;
  const capitalizado = mensaje ? mensaje.charAt(0).toUpperCase() + mensaje.slice(1) + '.' : undefined;
  switch (err.code) {
    case '42501':
      return new SinPermisoError(capitalizado);
    case '22023':
      return new DatoInvalidoError(capitalizado ?? 'Datos no válidos.');
    case '23505':
      return new DuplicadoError('Ese registro ya existe.');
    case 'P0002':
      return new DatoInvalidoError(capitalizado ?? 'El registro ya no existe.');
  }
  return new ErrorDesconocido();
}

const MENSAJES_FUNCIONES: Record<string, () => ErrorDominio> = {
  cedula_invalida: () => new DatoInvalidoError('La cédula no es válida.'),
  nombre_invalido: () => new DatoInvalidoError('Revisa nombres y apellidos: solo letras.'),
  telefono_invalido: () => new DatoInvalidoError('El celular debe tener 10 dígitos y empezar con 09.'),
  correo_invalido: () => new DatoInvalidoError('El correo no es válido.'),
  recinto_invalido: () => new DatoInvalidoError('Selecciona un recinto válido.'),
  recinto_con_coordinador: () => new DuplicadoError('Ese recinto ya tiene un coordinador asignado.'),
  cedula_duplicada: () => new DuplicadoError('Ya existe una cuenta con esa cédula.'),
  correo_duplicado: () => new DuplicadoError('Ya existe una cuenta con ese correo.'),
  dato_duplicado: () => new DuplicadoError('Ya existe una cuenta con esos datos.'),
  clave_debil: () => new DatoInvalidoError('Usa al menos 8 caracteres, con letras y números.'),
  clave_repetida: () => new DatoInvalidoError('La nueva clave debe ser distinta de la anterior.'),
  error_cambio_clave: () => new ErrorDominio('El servidor no pudo cambiar tu clave. Tu clave anterior sigue vigente; inténtalo de nuevo.'),
  correo_no_verificado: () => new SinPermisoError('Primero verifica tu correo con el enlace que te enviamos.'),
  sin_permiso: () => new SinPermisoError(),
  debe_cambiar_clave: () => new SinPermisoError('Primero cambia tu clave temporal.'),
  no_autenticado: () => new SinPermisoError('Tu sesión expiró. Vuelve a ingresar.'),
};

/** Errores de Edge Functions: el cuerpo trae `{ error: codigo }`. */
export async function traducirErrorFuncion(e: unknown): Promise<ErrorDominio> {
  if (esErrorDeRed(e)) return new SinConexionError();
  if (e instanceof FunctionsHttpError) {
    try {
      const cuerpo = (await (e.context as Response).json()) as { error?: string };
      const fabrica = cuerpo.error ? MENSAJES_FUNCIONES[cuerpo.error] : undefined;
      if (fabrica) return fabrica();
    } catch {
      // cuerpo no JSON: se trata como error desconocido
    }
  }
  return new ErrorDesconocido();
}
