import { Stack } from 'expo-router';

import { roleHomeOptions, roleStackOptions } from '@/presentation/navigation/roleStackOptions';

export default function CoordinadorProvincialLayout() {
  return (
    <Stack screenOptions={roleStackOptions}>
      <Stack.Screen name="index" options={roleHomeOptions} />
    </Stack>
  );
}
