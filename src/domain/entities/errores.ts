/**
 * Errores de dominio. La capa `data` traduce los errores técnicos (Supabase, red, SQLite)
 * a estas clases, y la UI muestra su `message`, que está redactado para el usuario final
 * (lenguaje simple, sin detalles internos: RNF-07).
 */
export class ErrorDominio extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class CredencialesInvalidasError extends ErrorDominio {
  // No se indica si falló el correo o la clave (evita enumerar cuentas).
  constructor() { super('Correo o clave incorrectos.'); }
}
export class CorreoNoVerificadoError extends ErrorDominio {
  constructor() { super('Debes verificar tu correo con el enlace que te enviamos antes de ingresar.'); }
}
export class CuentaInactivaError extends ErrorDominio {
  constructor() { super('Tu cuenta está deshabilitada. Comunícate con tu coordinador.'); }
}
export class PerfilNoEncontradoError extends ErrorDominio {
  constructor() { super('Tu cuenta no tiene un perfil asignado. Comunícate con tu coordinador.'); }
}
export class SinConexionError extends ErrorDominio {
  constructor(message = 'No hay conexión a internet. Inténtalo cuando tengas señal.') { super(message); }
}
export class DemasiadosIntentosError extends ErrorDominio {
  constructor() { super('Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'); }
}
export class SinPermisoError extends ErrorDominio {
  constructor(message = 'No tienes permiso para realizar esta acción.') { super(message); }
}
export class DatoInvalidoError extends ErrorDominio {}
export class DuplicadoError extends ErrorDominio {}
export class FotoIlegibleError extends ErrorDominio {
  constructor() { super('La foto está borrosa y no se leen bien los números. Tómala de nuevo con más luz y sin mover el celular.'); }
}
export class UbicacionRequeridaError extends ErrorDominio {
  constructor() { super('Necesitamos tu ubicación para guardar el acta. Activa el GPS y da permiso de ubicación.'); }
}
export class ErrorDesconocido extends ErrorDominio {
  constructor() { super('Ocurrió un problema inesperado. Inténtalo de nuevo.'); }
}
