import type { Usuario } from '@/domain/entities/Usuario';

import { perfilCache } from './perfilCache';
import { secureStoreAdapter } from './secureStoreAdapter';

/**
 * Identidad SIN RED (RF-16). Con el token de acceso vencido y sin internet, supabase-js no
 * puede renovarlo y `getSession()` devuelve `null`, aunque la sesión siga guardada en el
 * dispositivo. Para seguir registrando actas en local se usa la sesión guardada, con dos reglas:
 *  1. El id sale de la sesión guardada por supabase-js (Secure Store, cifrada): es la cuenta
 *     cuyos tokens están en este celular. Al cerrar sesión supabase-js la borra.
 *  2. El perfil en caché solo se acepta si su id COINCIDE con el de esa sesión: nunca se usa
 *     el perfil de otra cuenta (p. ej. una caché vieja de quien usó antes el celular).
 * Esto solo decide qué datos LOCALES se ven y con qué autor se etiquetan. No da acceso al
 * servidor: al sincronizar, cada RPC usa su propio `auth.uid()` y la RLS revalida todo.
 */
export async function idDeSesionGuardada(claveSesion: string): Promise<string | null> {
  const json = await secureStoreAdapter.getItem(claveSesion);
  if (!json) return null;
  try {
    const sesion = JSON.parse(json) as { user?: { id?: unknown } } | null;
    const id = sesion?.user?.id;
    return typeof id === 'string' && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/** Perfil en caché SOLO si pertenece a la misma cuenta que la sesión guardada; si no, null. */
export async function perfilDeSesionGuardada(claveSesion: string): Promise<Usuario | null> {
  const [id, perfil] = await Promise.all([idDeSesionGuardada(claveSesion), perfilCache.leer()]);
  return id && perfil && perfil.id === id ? perfil : null;
}
