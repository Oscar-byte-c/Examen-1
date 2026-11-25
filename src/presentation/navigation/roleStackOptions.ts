import type { ComponentProps } from 'react';
import type { Stack } from 'expo-router';

import { colors } from '@/presentation/theme';

type StackScreenOptions = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;

/**
 * Opciones comunes de los navegadores de cada rol.
 * - Pantallas de inicio: sin header nativo (usan AppHeader institucional).
 * - Pantallas internas: header nativo en tinta, plano (sin sombra), coherente con AppHeader.
 * - Transición: las pantallas internas entran deslizándose desde la derecha (se entiende que
 *   «se avanza» y que «atrás» regresa). Animación nativa de react-native-screens, sin JS.
 */
export const roleStackOptions: StackScreenOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.onPrimary,
  headerTitleStyle: { fontWeight: '700' },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
  animation: 'slide_from_right',
};

export const roleHomeOptions = { headerShown: false } as const;
