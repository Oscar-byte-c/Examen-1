import { Redirect } from 'expo-router';

import { useSession } from '@/presentation/navigation/SessionPreviewContext';
import { LOGIN_ROUTE, ROLE_HOME } from '@/presentation/navigation/routes';

/** Punto de entrada: redirige al inicio del rol actual o al login. */
export default function Index() {
  const { role } = useSession();
  return <Redirect href={role ? ROLE_HOME[role] : LOGIN_ROUTE} />;
}
