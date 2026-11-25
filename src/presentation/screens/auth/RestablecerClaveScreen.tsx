import * as Linking from 'expo-linking';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { AppButton, Retroalimentacion } from '@/presentation/components';
import { PantallaAuth } from '@/presentation/components/PantallaAuth';
import { mensajeDeError } from '@/presentation/hooks/consultas';
import { LOGIN_ROUTE } from '@/presentation/navigation/routes';
import { useAuthStore } from '@/presentation/store/authStore';

import CambiarClaveScreen from './CambiarClaveScreen';

/**
 * Destino del enlace de recuperación (RF-04). El enlace trae la sesión de recuperación en
 * el fragmento de la URL; se abre una sola vez y luego se pide la clave nueva.
 */
export default function RestablecerClaveScreen() {
  const url = Linking.useLinkingURL();
  const estado = useAuthStore((s) => s.estado);
  const entrarRecuperacion = useAuthStore((s) => s.entrarRecuperacion);
  const avisoLogin = useAuthStore((s) => s.avisoLogin);
  const [error, setError] = useState<string | null>(null);
  const procesada = useRef<string | null>(null);

  useEffect(() => {
    if (!url || !url.includes('access_token') || procesada.current === url) return;
    procesada.current = url;
    entrarRecuperacion(url).catch((e) => setError(mensajeDeError(e)));
  }, [url, entrarRecuperacion]);

  if (estado === 'recuperacion') return <CambiarClaveScreen modo="recuperacion" />;
  // Esta ruta siempre está disponible (destino del enlace), así que al terminar se sale a mano:
  // con la clave nueva ya en uso → al panel del rol; si hay que reingresar → al login con el aviso.
  if (estado === 'autenticado') return <Redirect href="/" />;
  if (estado === 'no_autenticado' && avisoLogin) return <Redirect href={LOGIN_ROUTE} />;

  return (
    <PantallaAuth titulo="Restablecer clave">
      {error ? (
        <Retroalimentacion tipo="error" titulo="No se pudo abrir el enlace" mensaje={error} />
      ) : (
        <Retroalimentacion tipo="proceso" titulo="Abriendo el enlace…" mensaje="Si no avanza, solicita un enlace nuevo." />
      )}
      <AppButton label="Ir al inicio de sesión" variant="outline" onPress={() => router.replace(LOGIN_ROUTE)} />
    </PantallaAuth>
  );
}
