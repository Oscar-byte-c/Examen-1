/**
 * Acceso centralizado a variables de entorno.
 * Expo solo expone al cliente las variables con prefijo EXPO_PUBLIC_ (definidas en .env).
 * Nunca colocar aquí claves privadas (p. ej. service_role de Supabase): esas viven solo en Edge Functions.
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
} as const;
