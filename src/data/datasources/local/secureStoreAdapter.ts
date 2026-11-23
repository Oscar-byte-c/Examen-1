import * as SecureStore from 'expo-secure-store';

/**
 * Adaptador de almacenamiento para supabase-js sobre Expo Secure Store (RNF-02).
 * En Android, Secure Store cifra los valores con el Android Keystore: los tokens de la
 * sesión nunca quedan en texto plano (a diferencia de AsyncStorage).
 *
 * Secure Store solo admite claves con caracteres `A-Z a-z 0-9 . - _`; se normalizan.
 */
const claveSegura = (clave: string) => clave.replace(/[^A-Za-z0-9._-]/g, '_');

export const secureStoreAdapter = {
  getItem: (clave: string) => SecureStore.getItemAsync(claveSegura(clave)),
  setItem: (clave: string, valor: string) => SecureStore.setItemAsync(claveSegura(clave), valor),
  removeItem: (clave: string) => SecureStore.deleteItemAsync(claveSegura(clave)),
};
