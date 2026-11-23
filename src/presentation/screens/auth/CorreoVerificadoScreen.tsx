import { router } from 'expo-router';

import { AppButton, AppText, Retroalimentacion } from '@/presentation/components';
import { PantallaAuth } from '@/presentation/components/PantallaAuth';

/** Destino del enlace de verificación (RF-03). La verificación ya ocurrió en el servidor. */
export default function CorreoVerificadoScreen() {
  return (
    <PantallaAuth titulo="Correo verificado">
      <Retroalimentacion tipo="exito" titulo="¡Listo! Tu correo quedó verificado." />
      <AppText variant="body">
        Ahora ingresa con tu correo y la clave temporal que te entregó tu coordinador. Te pediremos crear tu clave definitiva.
      </AppText>
      <AppButton label="Ir al inicio de sesión" icon="login" onPress={() => router.replace('/')} />
    </PantallaAuth>
  );
}
