import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { recuperacionSchema } from '@/domain/entities/Usuario';
import { container } from '@/data/di/container';
import { AppButton, CampoTexto, Retroalimentacion } from '@/presentation/components';
import { PantallaAuth } from '@/presentation/components/PantallaAuth';
import { mensajeDeError } from '@/presentation/hooks/consultas';
import { RESTABLECER_CLAVE_ROUTE } from '@/presentation/navigation/routes';

/**
 * RF-04 / ADR-02: recuperación por ENLACE. El servidor solo lo envía si el correo está
 * verificado, y siempre responde lo mismo (no revela qué correos existen).
 */
export default function RecuperarClaveScreen() {
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const { control, handleSubmit, formState } = useForm<{ correo: string }>({
    resolver: zodResolver(recuperacionSchema),
    defaultValues: { correo: '' },
  });

  const enviar = handleSubmit(async ({ correo }) => {
    setResultado(null);
    try {
      await container.solicitarRecuperacion.execute(correo, Linking.createURL(RESTABLECER_CLAVE_ROUTE));
      setResultado({
        ok: true,
        mensaje: 'Si el correo está registrado y verificado, recibirás un enlace. Ábrelo desde este celular.',
      });
    } catch (e) {
      setResultado({ ok: false, mensaje: mensajeDeError(e) });
    }
  });

  return (
    <PantallaAuth titulo="Recuperar tu clave">
      <CampoTexto
        control={control}
        name="correo"
        label="Correo electrónico"
        icon="mail"
        placeholder="nombre@correo.com"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {resultado ? (
        <Retroalimentacion
          tipo={resultado.ok ? 'exito' : 'error'}
          titulo={resultado.ok ? 'Solicitud enviada' : 'No se pudo enviar'}
          mensaje={resultado.mensaje}
        />
      ) : null}
      <AppButton label="Enviar enlace" icon="send" onPress={enviar} loading={formState.isSubmitting} disabled={formState.isSubmitting} />
      <AppButton label="Volver al inicio de sesión" variant="ghost" size="md" onPress={() => router.back()} />
    </PantallaAuth>
  );
}
