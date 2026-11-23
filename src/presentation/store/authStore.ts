import { create } from 'zustand';

import type { Usuario } from '@/domain/entities/Usuario';
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
  inicializar: () => Promise<void>;
  iniciarSesion: (correo: string, clave: string) => Promise<void>;
  cambiarClave: (clave: string, confirmacion: string) => Promise<void>;
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
    set({ estado: 'autenticado', usuario, verificada: true });
  },

  cambiarClave: async (clave, confirmacion) => {
    const usuario = await container.cambiarClave.execute(clave, confirmacion);
    set({ estado: 'autenticado', usuario, verificada: true });
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
