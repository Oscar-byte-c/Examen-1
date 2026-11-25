import { create } from 'zustand';

import type { ResultadoCambioClave, Usuario } from '@/domain/entities/Usuario';
import { container } from '@/data/di/container';

import { queryClient } from './queryClient';

/**
 * Estado de la sesión (ADR-07: Zustand para sesión y rol).
 *  - inicializando: se está restaurando la sesión (se mantiene el splash).
 *  - no_autenticado / autenticado.
 *  - recuperacion: entró con un enlace de recuperación y debe definir una clave nueva.
 *
 * Importante: este estado SOLO decide qué pantallas se muestran. La autorización real
 * está en el servidor (RLS y Edge Functions).
 */
type EstadoSesion = 'inicializando' | 'no_autenticado' | 'autenticado' | 'recuperacion';

type AuthState = {
  estado: EstadoSesion;
  usuario: Usuario | null;
  /** false cuando se arrancó sin red con el perfil en caché (RF-16). */
  verificada: boolean;
  /** Mensaje informativo (no de error) que el login muestra una vez, p. ej. tras cambiar la clave. */
  avisoLogin: string | null;
  inicializar: () => Promise<void>;
  iniciarSesion: (correo: string, clave: string) => Promise<void>;
  /** Lanza error solo si la clave NO cambió. Con `sesion_iniciada`, la pantalla llama a `completarCambioClave`. */
  cambiarClave: (clave: string, confirmacion: string) => Promise<ResultadoCambioClave>;
  completarCambioClave: (usuario: Usuario) => void;
  entrarRecuperacion: (url: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

let desuscribir: (() => void) | null = null;

function limpiarDatosDeSesion() {
  // Ningún dato del usuario anterior queda en memoria (la outbox local se conserva por autor).
  queryClient.clear();
  container.monitoreo.identificarUsuario(null);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  estado: 'inicializando',
  usuario: null,
  verificada: false,
  avisoLogin: null,

  /** Idempotente: aunque se llame dos veces (modo estricto), solo hay un listener. */
  inicializar: async () => {
    if (!desuscribir) {
      desuscribir = container.observarCierreSesion.execute(() => {
        limpiarDatosDeSesion();
        set({ estado: 'no_autenticado', usuario: null, verificada: false });
      });
    }
    try {
      const sesion = await container.restaurarSesion.execute();
      if (sesion) {
        container.monitoreo.identificarUsuario(sesion.usuario.id);
        set({ estado: 'autenticado', usuario: sesion.usuario, verificada: sesion.verificada });
      } else if (get().estado === 'inicializando') {
        set({ estado: 'no_autenticado' });
      }
    } catch (e) {
      container.monitoreo.reportarError(e, 'restaurar_sesion');
      set({ estado: 'no_autenticado', usuario: null });
    }
  },

  iniciarSesion: async (correo, clave) => {
    const usuario = await container.iniciarSesion.execute(correo, clave);
    container.monitoreo.identificarUsuario(usuario.id);
    set({ estado: 'autenticado', usuario, verificada: true, avisoLogin: null });
  },

  cambiarClave: async (clave, confirmacion) => {
    const resultado = await container.cambiarClave.execute(clave, confirmacion);
    if (resultado.tipo === 'reingreso_requerido') {
      // La clave cambió, pero no se pudo reingresar solo: se va al login con un aviso claro.
      limpiarDatosDeSesion();
      set({
        estado: 'no_autenticado',
        usuario: null,
        verificada: false,
        avisoLogin: 'Tu clave se actualizó correctamente. Ingresa con tu nueva clave.',
      });
    }
    // Con `sesion_iniciada` no se cambia de pantalla aún: la pantalla muestra primero el éxito.
    return resultado;
  },

  completarCambioClave: (usuario) => {
    container.monitoreo.identificarUsuario(usuario.id);
    set({ estado: 'autenticado', usuario, verificada: true, avisoLogin: null });
  },

  entrarRecuperacion: async (url) => {
    await container.abrirSesionRecuperacion.execute(url);
    set({ estado: 'recuperacion', usuario: null });
  },

  cerrarSesion: async () => {
    await container.cerrarSesion.execute();
    limpiarDatosDeSesion();
    set({ estado: 'no_autenticado', usuario: null, verificada: false });
  },
}));
