import { zodResolver } from '@hookform/resolvers/zod';
import * as Linking from 'expo-linking';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Role } from '@/domain/entities/Role';
import { nuevoUsuarioSchema, type CuentaCreada } from '@/domain/entities/Usuario';
import { AppButton, AppCard, AppText, CampoTexto, Retroalimentacion, ScreenContainer } from '@/presentation/components';
import { mensajeDeError, useAsignarMesa, useCrearCuenta } from '@/presentation/hooks/consultas';
import { CORREO_VERIFICADO_ROUTE } from '@/presentation/navigation/routes';
import { useSession } from '@/presentation/navigation/useSession';
import { colors, radius, spacing } from '@/presentation/theme';

type Entrada = { cedula: string; nombres: string; apellidos: string; telefono: string; correo: string };
type Params = { recintoId?: string; recintoNombre?: string; mesaId?: string; mesaNumero?: string };

/**
 * RF-01 / RF-02 / RF-20: alta de cuentas por la jerarquía.
 *  - Coordinador provincial → coordinador de un recinto (recintoId).
 *  - Coordinador de recinto → veedor de su recinto; si viene desde una mesa (mesaId),
 *    el veedor sustituto queda asignado a esa mesa en el mismo paso.
 * El rol lo decide el SERVIDOR según quién llama; esta pantalla solo adapta los textos.
 */
export default function NuevaCuentaScreen() {
  const { recintoId, recintoNombre, mesaId, mesaNumero } = useLocalSearchParams<Params>();
  const { usuario } = useSession();
  const esProvincial = usuario?.rol === Role.COORDINADOR_PROVINCIAL;
  const crear = useCrearCuenta();
  const asignar = useAsignarMesa(usuario?.recintoId ?? null);
  const [creada, setCreada] = useState<CuentaCreada | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<Entrada>({
    resolver: zodResolver(nuevoUsuarioSchema),
    defaultValues: { cedula: '', nombres: '', apellidos: '', telefono: '', correo: '' },
  });

  const enviar = handleSubmit(async (datos) => {
    setAviso(null);
    try {
      const cuenta = await crear.mutateAsync({
        datos: { ...datos, recintoId: esProvincial ? recintoId : undefined },
        urlRetorno: Linking.createURL(CORREO_VERIFICADO_ROUTE),
      });
      setCreada(cuenta);
      if (mesaId) {
        try {
          await asignar.mutateAsync({ mesaId, veedorId: cuenta.id });
        } catch (e) {
          setAviso(`La cuenta se creó, pero no se asignó la mesa: ${mensajeDeError(e)}`);
        }
      }
    } catch {
      // el error se muestra con crear.error
    }
  });

  const titulo = esProvincial ? 'Nuevo coordinador de recinto' : 'Nuevo veedor';

  if (creada) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: titulo }} />
        <Retroalimentacion
          tipo="exito"
          titulo="Cuenta creada"
          mensaje={mesaId && !aviso ? `Quedó asignado a la mesa ${mesaNumero}.` : undefined}
        />
        {aviso ? <Retroalimentacion tipo="error" titulo="Atención" mensaje={aviso} /> : null}
        <AppCard title="Entrega estos datos a la persona" icon="key">
          <View style={styles.datos}>
            <AppText variant="body">1. Debe abrir el enlace que le llegó al correo para verificarlo.</AppText>
            <AppText variant="body">2. Luego ingresa con su correo y esta clave temporal:</AppText>
            <View style={styles.clave}>
              <AppText variant="title" selectable accessibilityLabel={`Clave temporal ${creada.claveTemporal.split('').join(' ')}`}>
                {creada.claveTemporal}
              </AppText>
            </View>
            <AppText variant="bodySmall" color="textSecondary">
              Se muestra solo esta vez. Al ingresar, la app le pedirá crear su propia clave.
            </AppText>
          </View>
        </AppCard>
        <AppButton label="Listo" icon="check" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: titulo }} />
      <AppText variant="body" color="textSecondary">
        {esProvincial
          ? `Coordinador responsable del recinto ${recintoNombre ?? ''}.`
          : mesaId
            ? `Veedor sustituto para la mesa ${mesaNumero}.`
            : 'Veedor de tu recinto.'}
      </AppText>
      <AppCard>
        <View style={styles.datos}>
          <CampoTexto control={control} name="cedula" label="Cédula" icon="badge" keyboardType="number-pad" maxLength={10} />
          <CampoTexto control={control} name="nombres" label="Nombres" icon="person" autoCapitalize="words" />
          <CampoTexto control={control} name="apellidos" label="Apellidos" icon="person" autoCapitalize="words" />
          <CampoTexto control={control} name="telefono" label="Celular" icon="call" keyboardType="phone-pad" maxLength={10} />
          <CampoTexto control={control} name="correo" label="Correo electrónico" icon="mail" keyboardType="email-address" autoCapitalize="none" />
        </View>
      </AppCard>
      {formState.isSubmitting ? <Retroalimentacion tipo="proceso" titulo="Creando la cuenta…" /> : null}
      {crear.isError ? <Retroalimentacion tipo="error" titulo="No se creó la cuenta" mensaje={mensajeDeError(crear.error)} /> : null}
      <AppButton label="Crear cuenta" icon="person_add" size="lg" onPress={enviar} loading={formState.isSubmitting} disabled={formState.isSubmitting} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  datos: { gap: spacing.md },
  clave: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center' },
});

