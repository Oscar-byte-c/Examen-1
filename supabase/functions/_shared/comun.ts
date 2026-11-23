// =============================================================================
// Código compartido por las Edge Functions (Deno). Se ejecuta SOLO en el servidor.
// La service_role llega como variable de entorno del runtime de Supabase: nunca está
// en la app, en .env ni en el repositorio.
// =============================================================================
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Error controlado: su `codigo` se devuelve a la app; nunca se exponen mensajes internos. */
export class ErrorControlado extends Error {
  constructor(public codigo: string, public status = 400) {
    super(codigo);
  }
}

export function clienteAdmin(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const clave = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !clave) throw new Error('Configuración del servidor incompleta');
  // flowType implicit: los enlaces de recuperación traen la sesión en la URL (no hay
  // code_verifier en el servidor que pueda intercambiarse después).
  return createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: 'implicit' },
  });
}

/** Verifica el JWT de quien llama. El gateway no lo verifica (verify_jwt = false): se hace aquí. */
export async function usuarioQueLlama(req: Request, admin: SupabaseClient): Promise<User> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new ErrorControlado('no_autenticado', 401);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new ErrorControlado('no_autenticado', 401);
  return data.user;
}

/**
 * Solo se aceptan redirecciones hacia la propia app. En producción, únicamente el esquema
 * del APK. `exp://` (Expo Go) solo se acepta si el secreto PERMITIR_EXPO_GO = 'true':
 * con un comodín `exp://`, un atacante podría pedir un enlace de recuperación que
 * redirija los tokens a SU servidor de desarrollo.
 */
export function redireccionPermitida(url: unknown): string | undefined {
  if (typeof url !== 'string') return undefined;
  if (/^controlelectoral:\/\//.test(url)) return url;
  if (Deno.env.get('PERMITIR_EXPO_GO') === 'true' && /^exp:\/\//.test(url)) return url;
  return undefined;
}

// ---- Reglas de validación: MISMAS reglas que src/domain/entities (ADR-09) ----------
// Deno no puede importar el dominio de la app sin un paso de build, por eso se repiten
// aquí; los tests del dominio documentan el comportamiento esperado de ambas copias.

/** Cédula ecuatoriana: 10 dígitos, provincia 01–24 o 30, tercer dígito < 6, módulo 10. */
export function cedulaValida(cedula: string): boolean {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;
  if (Number(cedula[2]) >= 6) return false;
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let producto = Number(cedula[i]) * (i % 2 === 0 ? 2 : 1);
    if (producto > 9) producto -= 9;
    suma += producto;
  }
  return (10 - (suma % 10)) % 10 === Number(cedula[9]);
}

export const CLAVE_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

export async function manejar(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErrorControlado) return json({ error: e.codigo }, e.status);
    console.error('Error interno', e instanceof Error ? e.name : 'desconocido');
    return json({ error: 'error_interno' }, 500);
  }
}
