import { z } from 'zod';

import { errorCedula, type ErrorCedula } from './cedula';
import type { Role } from './Role';

/** Usuario autenticado. El rol sale de la tabla `perfiles` (RLS), nunca de user_metadata. */
export type Usuario = {
  id: string;
  correo: string;
  nombres: string;
  apellidos: string;
  rol: Role;
  recintoId: string | null;
  /** ADR-01: bandera de clave temporal (app_metadata). Mientras sea true, solo puede cambiar su clave. */
  debeCambiarClave: boolean;
};

/** Sesión restaurada. `verificada = false` cuando se arrancó sin red con el perfil en caché. */
export type SesionRestaurada = { usuario: Usuario; verificada: boolean };

/**
 * Resultado de cambiar la clave (RF-02 / RF-04). En ambos casos la clave YA cambió en el servidor:
 *  - sesion_iniciada: se volvió a ingresar con la clave nueva y se continúa en la app.
 *  - reingreso_requerido: el reingreso automático no fue posible (p. ej. sin red); el usuario
 *    debe ingresar manualmente con su clave nueva. No es un error.
 */
export type ResultadoCambioClave =
  | { tipo: 'sesion_iniciada'; usuario: Usuario }
  | { tipo: 'reingreso_requerido' };

/** Persona supervisada (veedor o coordinador) tal como la ven sus superiores. */
export type PersonaEquipo = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  rol: Role;
  recintoId: string | null;
  activo: boolean;
};

// ---------------------------------------------------------------------------
// Esquemas de validación (ADR-09). Los usan los formularios (RHF, ADR-08) y los casos de uso.
// ---------------------------------------------------------------------------

export const correoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Escribe tu correo.')
  .pipe(z.email('Revisa el correo: debe tener la forma nombre@correo.com.'));

export const loginSchema = z.object({
  correo: correoSchema,
  clave: z.string().min(1, 'Escribe tu clave.'),
});
export type LoginDatos = z.output<typeof loginSchema>;

/** Política de claves: 8 a 72 caracteres, con al menos una letra y un número. */
export const CLAVE_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export const nuevaClaveSchema = z
  .object({
    clave: z.string().regex(CLAVE_REGEX, 'Usa al menos 8 caracteres, con letras y números.'),
    confirmacion: z.string().min(1, 'Repite la clave.'),
  })
  .refine((d) => d.clave === d.confirmacion, { message: 'Las claves no coinciden.', path: ['confirmacion'] });
export type NuevaClaveDatos = z.output<typeof nuevaClaveSchema>;

export const recuperacionSchema = z.object({ correo: correoSchema });

const nombreSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/\s+/g, ' '))
  .pipe(z.string().regex(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]{2,60}$/, 'Solo letras (mínimo 2).'));

/** Mensaje para la persona según la regla de la cédula que no se cumple (RF-02). */
export const MENSAJES_CEDULA: Record<ErrorCedula, string> = {
  longitud: 'La cédula debe tener exactamente 10 dígitos.',
  provincia: 'El código de provincia no es válido.',
  tercer_digito: 'El tercer dígito de la cédula no es válido.',
  verificador: 'El dígito verificador no coincide.',
};

/** RF-02: datos de una cuenta nueva. */
export const nuevoUsuarioSchema = z.object({
  cedula: z
    .string()
    .trim()
    // superRefine (en vez de refine) permite elegir el mensaje según la causa del error.
    .superRefine((cedula, ctx) => {
      const error = errorCedula(cedula);
      if (error) ctx.addIssue({ code: 'custom', message: MENSAJES_CEDULA[error] });
    }),
  nombres: nombreSchema,
  apellidos: nombreSchema,
  telefono: z.string().trim().regex(/^09\d{8}$/, 'Celular de 10 dígitos que empiece con 09.'),
  correo: correoSchema,
});
export type NuevoUsuarioDatos = z.output<typeof nuevoUsuarioSchema>;

/** Resultado de crear una cuenta: la clave temporal se muestra una sola vez. */
export type CuentaCreada = { id: string; claveTemporal: string };
