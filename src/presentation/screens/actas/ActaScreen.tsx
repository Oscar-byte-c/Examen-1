import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import {
  aResultados,
  crearFormularioActaSchema,
  resumenSuma,
  DIGNIDAD_LABELS,
  type Acta,
  type Candidato,
  type Dignidad,
  type FormularioActaEntrada,
  type FormularioActaSalida,
} from '@/domain/entities/Acta';
import type { EvidenciaAnalizada } from '@/domain/use-cases/actas';
import { container } from '@/data/di/container';
import {
  AppButton,
  AppCard,
  AppText,
  BarraConexion,
  CampoTexto,
  LoadingIndicator,
  Retroalimentacion,
  ScreenContainer,
  StatusBadge,
} from '@/presentation/components';
import { CamaraActa } from '@/presentation/components/CamaraActa';
import { mensajeDeError, useActa, useCandidatos } from '@/presentation/hooks/consultas';
import { ESTADO_ENVIO_BADGE } from '@/presentation/screens/actas/etiquetas';
import { useSyncStore } from '@/presentation/store/syncStore';
import { colors, radius, spacing } from '@/presentation/theme';

type Params = { mesaId: string; dignidad: Dignidad; mesaNumero?: string };

/**
 * Registro y corrección de un acta (RF-09 a RF-13, RF-16, RF-19).
 * Pasos: 1) resultados con validación inmediata, 2) foto con vista previa, nitidez y GPS,
 * 3) guardar en el celular (funciona sin red) → la sincronización la envía sola.
 * La usan el veedor y, para corregir actas de su recinto, el coordinador de recinto.
 */
export default function ActaScreen() {
  const { mesaId, dignidad, mesaNumero } = useLocalSearchParams<Params>();
  const candidatos = useCandidatos(dignidad);
  const acta = useActa(mesaId, dignidad);

  const titulo = `Mesa ${mesaNumero ?? ''} · ${DIGNIDAD_LABELS[dignidad] ?? ''}`;
  if (candidatos.isPending || acta.isPending) return <LoadingIndicator fullScreen message="Cargando el acta…" />;
  if (candidatos.isError || acta.isError || !candidatos.data.length) {
    return (
      <ScreenContainer>
        <Stack.Screen options={{ title: titulo }} />
        <Retroalimentacion
          tipo="error"
          titulo="No se pudo abrir el acta"
          mensaje={candidatos.data?.length === 0 ? 'Conéctate a internet una vez para descargar la lista de candidatos.' : mensajeDeError(candidatos.error ?? acta.error)}
        />
      </ScreenContainer>
    );
  }
  return <FormularioActa titulo={titulo} mesaId={mesaId} dignidad={dignidad} candidatos={candidatos.data} existente={acta.data} />;
}

function valoresIniciales(candidatos: Candidato[], a: Acta | null): FormularioActaEntrada {
  const votos = Object.fromEntries(
    candidatos.map((c) => [c.id, a ? String(a.votos.find((v) => v.candidatoId === c.id)?.votos ?? '') : '']),
  );
  return {
    totalSufragantes: a ? String(a.totalSufragantes) : '',
    votosBlancos: a ? String(a.votosBlancos) : '',
    votosNulos: a ? String(a.votosNulos) : '',
    votos,
  };
}

const ESTADO_BADGE = ESTADO_ENVIO_BADGE;

function FormularioActa(props: {
  titulo: string;
  mesaId: string;
  dignidad: Dignidad;
  candidatos: Candidato[];
  existente: Acta | null;
}) {
  const { titulo, mesaId, dignidad, candidatos, existente } = props;
  const sincronizar = useSyncStore((s) => s.sincronizar);
  const actaId = useRef(existente?.id ?? container.nuevoId()).current;
  const schema = useMemo(() => crearFormularioActaSchema(candidatos.map((c) => c.id)), [candidatos]);

  const { control, handleSubmit, formState } = useForm<FormularioActaEntrada, unknown, FormularioActaSalida>({
    resolver: zodResolver(schema),
    defaultValues: valoresIniciales(candidatos, existente),
    mode: 'onChange', // RF-19: los números imposibles se detectan de inmediato
  });
  const valores = useWatch({ control });

  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [evidencia, setEvidencia] = useState<EvidenciaAnalizada | null>(null);
  const [errorEvidencia, setErrorEvidencia] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  const suma = resumenSuma(valores);

  const alCapturar = async (uri: string) => {
    setCamaraAbierta(false);
    setAnalizando(true);
    setErrorEvidencia(null);
    setEvidencia(null);
    try {
      setEvidencia(await container.analizarEvidencia.execute(uri, actaId));
    } catch (e) {
      setErrorEvidencia(mensajeDeError(e));
    } finally {
      setAnalizando(false);
    }
  };

  const guardar = handleSubmit(async (d) => {
    setResultado(null);
    try {
      await container.guardarActa.execute({
        id: actaId,
        mesaId,
        dignidad,
        resultados: aResultados(d),
        evidencia: evidencia?.legible ? evidencia : null,
        versionBase: existente?.versionBase ?? 0,
        candidatosEsperados: candidatos.length,
      });
      setResultado({ ok: true, mensaje: 'Quedó guardada en tu celular. Se enviará sola cuando haya señal.' });
      void sincronizar();
    } catch (e) {
      setResultado({ ok: false, mensaje: mensajeDeError(e) });
    }
  });

  if (camaraAbierta) return <CamaraActa onCaptura={alCapturar} onCancelar={() => setCamaraAbierta(false)} />;

  return (
    <ScreenContainer>
      <Stack.Screen options={{ title: titulo }} />
      <BarraConexion />
      {existente ? (
        <View style={styles.fila}>
          <AppText variant="bodySmall" color="textSecondary">
            Estás corrigiendo un acta ya registrada.
          </AppText>
          <StatusBadge status={ESTADO_BADGE[existente.estado].status} label={ESTADO_BADGE[existente.estado].label} />
        </View>
      ) : null}

      <AppCard title="1. Resultados" subtitle="Copia los números tal como están en el acta." icon="edit_note">
        <View style={styles.campos}>
          <CampoTexto control={control} name="totalSufragantes" label="Total de sufragantes" keyboardType="number-pad" />
          {candidatos.map((c) => (
            <View key={c.id} style={[styles.candidato, { borderLeftColor: c.color }]}>
              <CampoTexto
                control={control}
                name={`votos.${c.id}`}
                label={`Lista ${c.lista} · ${c.siglas} — ${c.nombres}`}
                keyboardType="number-pad"
              />
            </View>
          ))}
          <CampoTexto control={control} name="votosBlancos" label="Votos en blanco" keyboardType="number-pad" />
          <CampoTexto control={control} name="votosNulos" label="Votos nulos" keyboardType="number-pad" />
          <View style={styles.resumen} accessibilityLiveRegion="polite">
            <AppText variant="bodySmall">
              Válidos {suma.validos} + blancos {suma.blancos} + nulos {suma.nulos} ={' '}
              <AppText variant="bodyStrong">{suma.total}</AppText>
            </AppText>
            <StatusBadge status={suma.cuadra ? 'success' : 'warning'} label={suma.cuadra ? 'La suma cuadra' : 'Revisa la suma'} />
          </View>
        </View>
      </AppCard>

      <AppCard title="2. Foto del acta" subtitle="Se guarda con la ubicación del momento." icon="photo_camera">
        <View style={styles.campos}>
          {analizando ? <Retroalimentacion tipo="proceso" titulo="Revisando la foto y tu ubicación…" /> : null}
          {errorEvidencia ? <Retroalimentacion tipo="error" titulo="No se pudo usar la foto" mensaje={errorEvidencia} /> : null}
          {evidencia ? (
            <>
              <Image source={{ uri: evidencia.fotoUri }} style={styles.foto} contentFit="contain" accessibilityLabel="Vista previa de la foto del acta" />
              {evidencia.legible ? (
                <Retroalimentacion
                  tipo="exito"
                  titulo="La foto se ve legible"
                  mensaje={`Ubicación registrada (precisión ±${Math.round(evidencia.ubicacion.precisionM)} m).`}
                />
              ) : (
                <Retroalimentacion
                  tipo="error"
                  titulo="La foto está borrosa"
                  mensaje="No se leen bien los números. Tómala otra vez con más luz y el celular quieto."
                />
              )}
            </>
          ) : null}
          <AppButton
            label={evidencia ? 'Tomar otra foto' : 'Tomar foto del acta'}
            icon="photo_camera"
            variant={evidencia?.legible ? 'outline' : 'primary'}
            onPress={() => setCamaraAbierta(true)}
            disabled={analizando}
          />
        </View>
      </AppCard>

      {resultado ? (
        <Retroalimentacion tipo={resultado.ok ? 'exito' : 'error'} titulo={resultado.ok ? 'Acta guardada' : 'No se guardó el acta'} mensaje={resultado.mensaje} />
      ) : null}
      {resultado?.ok ? (
        <AppButton label="Volver a mis mesas" icon="arrow_back" variant="outline" onPress={() => router.back()} />
      ) : (
        <AppButton
          label="3. Guardar acta"
          icon="save"
          size="lg"
          onPress={guardar}
          loading={formState.isSubmitting}
          disabled={formState.isSubmitting || analizando || !evidencia?.legible}
          accessibilityHint="Se habilita cuando la foto es legible"
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  campos: { gap: spacing.md },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  candidato: { borderLeftWidth: 6, paddingLeft: spacing.sm, borderRadius: radius.sm },
  resumen: { gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  foto: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
});
