import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { secureStoreAdapter } from '../local/secureStoreAdapter';
import { getSupabaseConfig } from './supabaseConfig';

/** Clave fija de la sesión en Secure Store (así sabemos si hay una sesión guardada sin red). */
export const CLAVE_SESION = 'control-electoral.sesion';

const { url, publishableKey } = getSupabaseConfig();

/**
 * Cliente ÚNICO de Supabase (singleton del módulo). Crear dos clientes duplicaría los
 * refrescos de token y los listeners de sesión.
 *  - storage: Secure Store (cifrado), no AsyncStorage.
 *  - detectSessionInUrl: false → en móvil los enlaces se procesan a mano (recuperación de clave).
 *  - flowType implicit: los enlaces de recuperación los genera el servidor (Edge Function).
 */
export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: secureStoreAdapter,
    storageKey: CLAVE_SESION,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});

// Recomendación de Supabase para React Native: refrescar el token solo con la app en primer
// plano (en segundo plano los temporizadores no son confiables).
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
