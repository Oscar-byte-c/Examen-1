import { AppState } from 'react-native';
import { create } from 'zustand';

import type { Acta } from '@/domain/entities/Acta';
import { container } from '@/data/di/container';

/**
 * Estado de la conexión y de la cola offline (ADR-07 + ADR-10).
 * Dispara la sincronización automática (RF-16):
 *  - al recuperar la conexión (NetInfo),
 *  - al volver la app a primer plano,
 *  - después de guardar un acta,
 *  - cada 60 s mientras haya actas pendientes.
 */
type SyncState = {
  conectado: boolean;
  sincronizando: boolean;
  actas: Acta[];
  iniciar: () => () => void;
  sincronizar: () => Promise<void>;
  recargarActas: () => Promise<void>;
};

const pendientes = (actas: Acta[]) => actas.filter((a) => a.estado !== 'enviada' && a.estado !== 'conflicto').length;

export const useSyncStore = create<SyncState>((set, get) => ({
  conectado: true,
  sincronizando: false,
  actas: [],

  recargarActas: async () => {
    set({ actas: await container.listarActasLocales.execute() });
  },

  sincronizar: async () => {
    if (!get().conectado) return;
    set({ sincronizando: true });
    try {
      await container.sincronizarActas.execute(); // la capa data evita envíos simultáneos
    } catch (e) {
      container.monitoreo.reportarError(e, 'sincronizacion_automatica');
    } finally {
      set({ sincronizando: false });
      await get().recargarActas();
    }
  },

  /** Devuelve la función que detiene todos los disparadores (se llama al cerrar sesión). */
  iniciar: () => {
    const quitarRed = container.observarConectividad.execute((conectado) => {
      const antes = get().conectado;
      set({ conectado });
      if (conectado && !antes) void get().sincronizar();
    });
    const quitarActas = container.observarActas.execute(() => void get().recargarActas());
    const app = AppState.addEventListener('change', (e) => {
      if (e === 'active') void get().sincronizar();
    });
    const intervalo = setInterval(() => {
      if (pendientes(get().actas) > 0) void get().sincronizar();
    }, 60_000);

    void get().recargarActas().then(() => get().sincronizar());

    return () => {
      quitarRed();
      quitarActas();
      app.remove();
      clearInterval(intervalo);
    };
  },
}));

export const contarPendientes = pendientes;
