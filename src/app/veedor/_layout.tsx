import { Stack } from 'expo-router';

import { colors } from '@/presentation/theme/colors';

export default function VeedorLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.surface,
      }}>
      <Stack.Screen name="index" options={{ title: 'Veedor' }} />
    </Stack>
  );
}
