/**
 * Configuración de conexión a Supabase (capa `data`, datasource remoto).
 *
 * Los valores vienen del archivo `.env` de la RAÍZ del proyecto. Expo los inserta en el
 * bundle al compilar, y solo expone al cliente las variables con prefijo `EXPO_PUBLIC_`.
 *
 * ⚠️ Expo solo reemplaza el acceso LITERAL `process.env.EXPO_PUBLIC_...`.
 *    No uses desestructuración (`const { X } = process.env`) ni acceso dinámico
 *    (`process.env[nombre]`): en el celular llegarían como `undefined`.
 *
 * Seguridad: la publishable key es pública por diseño (va dentro del APK); lo que protege
 * los datos son las políticas RLS. La `service_role` / secret key NUNCA va aquí ni en `.env`:
 * solo en Edge Functions.
 */
export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      'Faltan variables de Supabase. Define EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
        'en el archivo .env de la raíz y reinicia Metro con `npx expo start --clear`.',
    );
  }

  return { url, publishableKey };
}
