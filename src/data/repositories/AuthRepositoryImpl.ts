import { isAuthRetryableFetchError, type User } from '@supabase/supabase-js';

import {
  CuentaInactivaError,
  DatoInvalidoError,
  PerfilNoEncontradoError,
  SinConexionError,
} from '@/domain/entities/errores';
import type { SesionRestaurada, Usuario } from '@/domain/entities/Usuario';
import type { AuthRepository } from '@/domain/repositories/AuthRepository';

import { perfilCache } from '../datasources/local/perfilCache';
import { secureStoreAdapter } from '../datasources/local/secureStoreAdapter';
import { CLAVE_SESION, supabase } from '../datasources/remote/supabaseClient';
import { esErrorDeRed, traducirErrorAuth, traducirErrorFuncion } from '../mappers/errores';
import { aUsuario, type PerfilDTO } from '../mappers/usuarioMapper';

export class AuthRepositoryImpl implements AuthRepository {
  /** Lee el perfil propio (RLS: cada usuario solo ve su fila) y lo convierte en Usuario. */
  private async cargarUsuario(user: User): Promise<Usuario> {
    const { data, error } = await supabase
      .from('perfiles')
      .select('id, cedula, nombres, apellidos, telefono, rol, recinto_id, activo')
      .eq('id', user.id)
      .maybeSingle<PerfilDTO>();
    if (error) throw esErrorDeRed(error) ? new SinConexionError() : traducirErrorAuth(error);
    if (!data) {
      await this.cerrarLocal();
      throw new PerfilNoEncontradoError();
    }
    if (!data.activo) {
      await this.cerrarLocal();
      throw new CuentaInactivaError();
    }
    const usuario = aUsuario(data, user);
    await perfilCache.guardar(usuario);
    return usuario;
  }

  /** Cierre local garantizado: borra tokens y caché aunque no haya red (D5 del plan). */
  private async cerrarLocal(): Promise<void> {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    await secureStoreAdapter.removeItem(CLAVE_SESION).catch(() => undefined);
    await perfilCache.borrar().catch(() => undefined);
  }

  async iniciarSesion(correo: string, clave: string): Promise<Usuario> {
    const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
    if (error || !data.user) throw traducirErrorAuth(error);
    return this.cargarUsuario(data.user);
  }

  async cerrarSesion(): Promise<void> {
    // Intenta revocar la sesión en el servidor; si no hay red, igual se limpia el dispositivo.
    await supabase.auth.signOut().catch(() => undefined);
    await this.cerrarLocal();
  }

  async restaurarSesion(): Promise<SesionRestaurada | null> {
    const { data, error } = await supabase.auth.getSession();
    if (data.session) {
      try {
        return { usuario: await this.cargarUsuario(data.session.user), verificada: true };
      } catch (e) {
        if (!(e instanceof SinConexionError)) throw e;
        // Sesión válida en el dispositivo, pero sin red para leer el perfil → caché.
      }
    } else if (error && !isAuthRetryableFetchError(error)) {
      await this.cerrarLocal();
      return null;
    }

    // D3: sin red. Si hay sesión guardada Y perfil en caché, se entra en modo "sin verificar".
    // Al volver la red supabase-js refresca el token; si el servidor lo rechaza, se cierra la sesión.
    const [guardada, cache] = await Promise.all([secureStoreAdapter.getItem(CLAVE_SESION), perfilCache.leer()]);
    if (guardada && cache) return { usuario: cache, verificada: false };
    return null;
  }

  observarCierre(callback: () => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      // No se llama a ningún método de supabase.auth dentro de este callback (puede bloquearse).
      if (evento === 'SIGNED_OUT') callback();
    });
    return () => data.subscription.unsubscribe();
  }

  async cambiarClave(clave: string): Promise<Usuario> {
    const { error } = await supabase.functions.invoke('cambiar-clave', { body: { clave } });
    if (error) throw await traducirErrorFuncion(error);
    // El JWT debe renovarse para que incluya app_metadata.debe_cambiar_clave = false (lo usa la RLS).
    const { data, error: errRefresh } = await supabase.auth.refreshSession();
    if (errRefresh || !data.user) throw traducirErrorAuth(errRefresh);
    return this.cargarUsuario(data.user);
  }

  async solicitarRecuperacion(correo: string, urlRetorno: string): Promise<void> {
    const { error } = await supabase.functions.invoke('solicitar-recuperacion', {
      body: { correo, redirectTo: urlRetorno },
    });
    if (error) throw await traducirErrorFuncion(error);
  }

  /** El enlace trae `#access_token=…&refresh_token=…&type=recovery` (flujo implícito). */
  async abrirSesionRecuperacion(url: string): Promise<void> {
    const fragmento = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
    const params = new URLSearchParams(fragmento);
    const errorEnlace = params.get('error_description');
    if (errorEnlace) throw new DatoInvalidoError('El enlace expiró o ya fue usado. Solicita uno nuevo.');
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) throw new DatoInvalidoError('El enlace no es válido. Solicita uno nuevo.');
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw traducirErrorAuth(error);
  }
}
