import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Role } from '@/domain/entities/Role';
import { SessionPreviewProvider, useSession } from '@/presentation/navigation/SessionPreviewContext';

/**
 * Navegador raíz. Expo Router está construido sobre React Navigation: `Stack` es el
 * native-stack de React Navigation, por eso NO se declara un NavigationContainer adicional.
 *
 * Cada rol tiene su propio grupo de pantallas protegido con `Stack.Protected`.
 * Un usuario no puede navegar a pantallas de otro rol porque no están habilitadas
 * para él. (La autorización real se aplica en el servidor con RLS.)
 */
function RootNavigator() {
  const { role } = useSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />

      <Stack.Protected guard={role === null}>
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected guard={role === Role.VEEDOR}>
        <Stack.Screen name="veedor" />
      </Stack.Protected>

      <Stack.Protected guard={role === Role.COORDINADOR_RECINTO}>
        <Stack.Screen name="coordinador-recinto" />
      </Stack.Protected>

      <Stack.Protected guard={role === Role.COORDINADOR_PROVINCIAL}>
        <Stack.Screen name="coordinador-provincial" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionPreviewProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SessionPreviewProvider>
  );
}
