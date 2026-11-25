import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { nuevaClaveSchema } from '@/domain/entities/Usuario';
import { AppButton, AppText, CampoTexto, Retroalimentacion } from '@/presentation/components';
import { PantallaAuth } from '@/presentation/components/PantallaAuth';
import { mensajeDeError } from '@/presentation/hooks/consultas';
import { useAuthStore } from '@/presentation/store/authStore';

type Entrada = { clave: string; confirmacion: string };

/** Tiempo para leer el mensaje de éxito antes de entrar al panel. */
const PAUSA_EXITO_MS = 1500;

/**
 * RF-02 / ADR-01: cambio OBLIGATORIO de la clave temporal (primer ingreso) y definición de
 * una clave nueva tras abrir el enlace de recuperación (`modo="recuperacion"`).
 * El servidor borra la bandera `debe_cambiar_clave`; mientras exista, la RLS no entrega datos.
 */
export default function CambiarClaveScreen({ modo = 'primer_ingreso' }: { modo?: 'primer_ingreso' | 'recuperacion' }) {
  const cambiarClave = useAuthStore((s) => s.cambiarClave);
  const completarCambioClave = useAuthStore((s) => s.completarCambioClave);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const { control, handleSubmit, formState } = useForm<Entrada>({
    resolver: zodResolver(nuevaClaveSchema),
    defaultValues: { clave: '', confirmacion: '' },
  });

  const enviar = handleSubmit(async ({ clave, confirmacion }) => {
    setError(null);
    let resultado;
    try {
      resultado = await cambiarClave(clave, confirmacion);
    } catch (e) {
      setError(mensajeDeError(e)); // error real: la clave NO cambió
      return;
    }
    // La clave cambió. Si hubo que reingresar a mano, el store ya llevó al login con un aviso.
    if (resultado.tipo === 'sesion_iniciada') {
      setExito(true);
      await new Promise((r) => setTimeout(r, PAUSA_EXITO_MS));
      completarCambioClave(resultado.usuario);
    }
  });
  const ocupado = formState.isSubmitting || exito;

  return (
    <PantallaAuth titulo={modo === 'recuperacion' ? 'Crea tu nueva clave' : 'Cambia tu clave temporal'}>
      <AppText variant="bodySmall" color="textSecondary">
        {modo === 'recuperacion'
          ? 'Escribe una clave nueva que solo tú conozcas.'
          : 'Por seguridad, la clave que te entregó tu coordinador solo sirve una vez. Crea una clave que solo tú conozcas.'}
      </AppText>
      <CampoTexto control={control} name="clave" label="Nueva clave" icon="lock" isPassword autoCapitalize="none" helperText="Mínimo 8 caracteres, con letras y números." />
      <CampoTexto control={control} name="confirmacion" label="Repite la clave" icon="lock" isPassword autoCapitalize="none" />
      {error ? <Retroalimentacion tipo="error" titulo="No se pudo cambiar la clave" mensaje={error} /> : null}
      {exito ? <Retroalimentacion tipo="exito" titulo="Clave actualizada" mensaje="Entrando a tu cuenta…" /> : null}
      <AppButton label="Guardar clave" icon="check" onPress={enviar} loading={ocupado} disabled={ocupado} />
      <AppButton label="Salir" variant="ghost" size="md" onPress={() => void cerrarSesion()} disabled={ocupado} />
    </PantallaAuth>
  );
}
