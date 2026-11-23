import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Role } from '@/domain/entities/Role';
import { container } from '@/data/di/container';
import { useSession } from '@/presentation/navigation/useSession';
import { useAuthStore } from '@/presentation/store/authStore';
import { queryClient } from '@/presentation/store/queryClient';
import { useSyncStore } from '@/presentation/store/syncStore';

// ADR-05: el monitoreo se inicia antes que cualquier pantalla. El splash se mantiene
// hasta conocer la sesión (evita ver el login un instante si ya había sesión).
container.monitoreo.iniciar();
void SplashScreen.preventAutoHideAsync();

/**
 * Navegador raíz (Expo Router sobre React Navigation, ADR-06 / ADR-C01).
 * Los guards (`Stack.Protected`) se evalúan en este orden: sesión → clave temporal → rol.
 * Solo protegen la INTERFAZ: la autorización real está en RLS y Edge Functions.
 */
function RootNavigator() {
  const { estado, role, debeCambiarClave } = useSession();
  const habilitado = estado === 'autenticado' && !debeCambiarClave;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* Destinos de enlaces de correo: siempre accesibles. */}
      <Stack.Screen name="restablecer-clave" />
      <Stack.Screen name="correo-verificado" />

      <Stack.Protected guard={estado === 'no_autenticado'}>
        <Stack.Screen name="login" />
        <Stack.Screen name="recuperar-clave" />
      </Stack.Protected>

      <Stack.Protected guard={estado === 'autenticado' && debeCambiarClave}>
        <Stack.Screen name="cambiar-clave" />
      </Stack.Protected>

      <Stack.Protected guard={habilitado && role === Role.VEEDOR}>
        <Stack.Screen name="veedor" />
      </Stack.Protected>

      <Stack.Protected guard={habilitado && role === Role.COORDINADOR_RECINTO}>
        <Stack.Screen name="coordinador-recinto" />
      </Stack.Protected>

      <Stack.Protected guard={habilitado && role === Role.COORDINADOR_PROVINCIAL}>
        <Stack.Screen name="coordinador-provincial" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const estado = useAuthStore((s) => s.estado);
  const inicializar = useAuthStore((s) => s.inicializar);
  const iniciarSync = useSyncStore((s) => s.iniciar);
  const ruta = usePathname();

  useEffect(() => {
    void inicializar();
  }, [inicializar]);

  useEffect(() => {
    if (estado !== 'inicializando') void SplashScreen.hideAsync();
    // La sincronización automática solo corre con una sesión activa y se detiene al salir.
    if (estado === 'autenticado') return iniciarSync();
  }, [estado, iniciarSync]);

  useEffect(() => {
    container.monitoreo.registrarPantalla(ruta); // RF-17: "en qué pantalla ocurrió"
  }, [ruta]);

  if (estado === 'inicializando') return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <RootNavigator />
    </QueryClientProvider>
  );
}
