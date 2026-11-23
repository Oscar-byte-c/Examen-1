import { Redirect } from 'expo-router';

import { CAMBIAR_CLAVE_ROUTE, LOGIN_ROUTE, RESTABLECER_CLAVE_ROUTE, ROLE_HOME } from './routes';
import { useSession } from './useSession';

/**
 * ADR-06: redirección inicial según tres datos — sesión, cambio de clave temporal y rol.
 * Si alguno falla, el usuario va a la pantalla que corresponde y nunca queda sin salida.
 */
export default function RedireccionInicial() {
  const { estado, role, debeCambiarClave } = useSession();
  if (estado === 'inicializando') return null;
  if (estado === 'recuperacion') return <Redirect href={RESTABLECER_CLAVE_ROUTE} />;
  if (!role) return <Redirect href={LOGIN_ROUTE} />;
  if (debeCambiarClave) return <Redirect href={CAMBIAR_CLAVE_ROUTE} />;
  return <Redirect href={ROLE_HOME[role]} />;
}
