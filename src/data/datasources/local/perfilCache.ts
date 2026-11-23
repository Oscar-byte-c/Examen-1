import type { Usuario } from '@/domain/entities/Usuario';

import { secureStoreAdapter } from './secureStoreAdapter';

/**
 * Último perfil validado con el servidor, para poder ARRANCAR SIN RED (RF-16).
 * Solo decide qué pantallas se muestran: sin un token válido no se puede leer ni escribir
 * nada en el servidor (RLS), así que alterar esta caché no da acceso a datos.
 */
const CLAVE = 'control-electoral.perfil';

export const perfilCache = {
  async leer(): Promise<Usuario | null> {
    const json = await secureStoreAdapter.getItem(CLAVE);
    if (!json) return null;
    try {
      return JSON.parse(json) as Usuario;
    } catch {
      return null;
    }
  },
  guardar: (usuario: Usuario) => secureStoreAdapter.setItem(CLAVE, JSON.stringify(usuario)),
  borrar: () => secureStoreAdapter.removeItem(CLAVE),
};
