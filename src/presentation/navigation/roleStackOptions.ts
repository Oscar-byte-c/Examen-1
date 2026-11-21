import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

import { colors } from '@/presentation/theme';

type StackScreenOptions = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;

/**
 * Opciones comunes de los navegadores de cada rol.
 * - Pantallas de inicio: sin header nativo (usan AppHeader institucional).
 * - Pantallas internas futuras: header nativo con colores de la organización.
 */
export const roleStackOptions: StackScreenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.onPrimary,
  headerTitleStyle: { fontWeight: '700' },
  contentStyle: { backgroundColor: colors.background },
};

export const roleHomeOptions = { headerShown: false } as const;
