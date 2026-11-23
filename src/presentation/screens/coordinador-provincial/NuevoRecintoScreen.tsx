import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { nuevoRecintoSchema, type NuevoRecintoDatos } from '@/domain/entities/Territorio';
import { container } from '@/data/di/container';
import { AppButton, AppCard, CampoTexto, Retroalimentacion, ScreenContainer } from '@/presentation/components';
import { mensajeDeError, useCrearRecinto } from '@/presentation/hooks/consultas';
import { spacing } from '@/presentation/theme';

type Entrada = { nombre: string; direccion: string; parroquia: string; latitud: string; longitud: string; numeroMesas: string };

/** RF-06: el coordinador provincial registra un recinto nuevo dentro de su jurisdicción. */
export default function NuevoRecintoScreen() {
  const crear = useCrearRecinto();
  const [ubicando, setUbicando] = useState(false);
  const [errorGps, setErrorGps] = useState<string | null>(null);
  const { control, handleSubmit, setValue, formState } = useForm<Entrada, unknown, NuevoRecintoDatos>({
    resolver: zodResolver(nuevoRecintoSchema),
    defaultValues: { nombre: '', direccion: '', parroquia: '', latitud: '', longitud: '', numeroMesas: '' },
  });

  const usarMiUbicacion = async () => {
    setUbicando(true);
    setErrorGps(null);
    try {
      const u = await container.obtenerUbicacionActual.execute();
      setValue('latitud', u.latitud.toFixed(6), { shouldValidate: true });
      setValue('longitud', u.longitud.toFixed(6), { shouldValidate: true });
    } catch (e) {
      setErrorGps(mensajeDeError(e));
    } finally {
      setUbicando(false);
    }
  };

  const enviar = handleSubmit(async (d) => {
    try {
      await crear.mutateAsync(d);
    } catch {
      // se muestra con crear.error
    }
  });

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: 'Registrar recinto' }} />
      <AppCard>
        <View style={styles.campos}>
          <CampoTexto control={control} name="nombre" label="Nombre del recinto" icon="apartment" />
          <CampoTexto control={control} name="direccion" label="Dirección" icon="signpost" />
          <CampoTexto control={control} name="parroquia" label="Parroquia" icon="location_city" />
          <CampoTexto control={control} name="numeroMesas" label="Número de mesas" icon="table_restaurant" keyboardType="number-pad" />
          <CampoTexto control={control} name="latitud" label="Latitud" icon="my_location" keyboardType="numbers-and-punctuation" />
          <CampoTexto control={control} name="longitud" label="Longitud" icon="my_location" keyboardType="numbers-and-punctuation" />
          {errorGps ? <Retroalimentacion tipo="error" titulo="No se obtuvo la ubicación" mensaje={errorGps} /> : null}
          <AppButton label="Usar mi ubicación actual" icon="my_location" variant="outline" onPress={usarMiUbicacion} loading={ubicando} />
        </View>
      </AppCard>
      {crear.isError ? <Retroalimentacion tipo="error" titulo="No se registró el recinto" mensaje={mensajeDeError(crear.error)} /> : null}
      {crear.isSuccess ? (
        <>
          <Retroalimentacion tipo="exito" titulo="Recinto registrado" mensaje="Ya puedes crear su coordinador." />
          <AppButton label="Volver a recintos" icon="arrow_back" variant="outline" onPress={() => router.back()} />
        </>
      ) : (
        <AppButton label="Registrar recinto" icon="save" size="lg" onPress={enviar} loading={formState.isSubmitting} disabled={formState.isSubmitting} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ campos: { gap: spacing.md } });
