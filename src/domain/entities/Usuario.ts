import { z } from 'zod';

import { validarCedula } from './cedula';
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

/** RF-02: datos de una cuenta nueva. */
export const nuevoUsuarioSchema = z.object({
  cedula: z
    .string()
    .trim()
    .refine(validarCedula, 'Cédula no válida: revisa los 10 dígitos.'),
  nombres: nombreSchema,
  apellidos: nombreSchema,
  telefono: z.string().trim().regex(/^09\d{8}$/, 'Celular de 10 dígitos que empiece con 09.'),
  correo: correoSchema,
});
export type NuevoUsuarioDatos = z.output<typeof nuevoUsuarioSchema>;

/** Resultado de crear una cuenta: la clave temporal se muestra una sola vez. */
export type CuentaCreada = { id: string; claveTemporal: string };
