import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { evaluarUbicacionEvidencia } from '@/domain/entities/geo';
import type { Recinto } from '@/domain/entities/Territorio';
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
  PasosActa,
  SelloEstado,
  StatusBadge,
  UbicacionEvidencia,
} from '@/presentation/components';
import { CamaraActa } from '@/presentation/components/CamaraActa';
import { mensajeDeError, useActa, useCandidatos, useFotoEvidencia, useRecintoDeMesa } from '@/presentation/hooks/consultas';
import { useSession } from '@/presentation/navigation/useSession';
import { SELLO_ESTADO_ENVIO } from '@/presentation/screens/actas/etiquetas';
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

/** Pasos del registro (RF-09 a RF-11): una secuencia real, por eso van numerados. */
const PASOS = ['Resultados', 'Foto', 'Guardar'] as const;

function FormularioActa(props: {
  titulo: string;
  mesaId: string;
  dignidad: Dignidad;
  candidatos: Candidato[];
  existente: Acta | null;
}) {
  const { titulo, mesaId, dignidad, candidatos, existente } = props;
  const sincronizar = useSyncStore((s) => s.sincronizar);
  const conectado = useSyncStore((s) => s.conectado);
  const { usuario } = useSession();
  // S-06: coordenadas del recinto para comparar con el lugar de la foto (caché del veedor sin red).
  const recinto = useRecintoDeMesa(mesaId, usuario?.rol ?? null, usuario?.recintoId ?? null);

  // ADR-04 / RF-12: el GPS se enciende al abrir la pantalla y se apaga al salir. Sin internet el
  // primer fix tarda; así ya hay señal al tomar la foto. Solo cuentan lecturas POSTERIORES a la foto.
  useEffect(() => container.prepararUbicacion.execute(), []);
  // Id estable del acta (idempotencia, ADR-03/10): el inicializador perezoso corre una sola vez.
  const [actaId] = useState(() => existente?.id ?? container.nuevoId());
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
        // Se pasa tal cual: si no es legible, el caso de uso la rechaza (FotoIlegibleError).
        evidencia,
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

  // Pasos (solo presentación): se calculan con el estado que ya existe en el formulario.
  const completos = [formState.isValid, !!evidencia?.legible, !!resultado?.ok];
  const actual = Math.max(0, completos.indexOf(false));

  // Pie fijo: la suma queda a la vista JUNTO al botón Guardar (RF-10 / RF-19).
  const pie = resultado?.ok ? (
    <AppButton label="Volver a mis mesas" icon="arrow_back" variant="outline" onPress={() => router.back()} />
  ) : (
    <>
      <View style={styles.suma} accessible accessibilityLiveRegion="polite"
        accessibilityLabel={`Válidos ${suma.validos} más blancos ${suma.blancos} más nulos ${suma.nulos} igual ${suma.total}. ${suma.cuadra ? 'La suma cuadra' : 'Revisa la suma'}`}>
        <AppText variant="bodySmall" style={styles.sumaTexto}>
          Válidos {suma.validos} + blancos {suma.blancos} + nulos {suma.nulos} ={' '}
          <AppText variant="numeralSmall">{suma.total}</AppText>
        </AppText>
        <StatusBadge status={suma.cuadra ? 'success' : 'warning'} label={suma.cuadra ? 'La suma cuadra' : 'Revisa la suma'} />
      </View>
      <AppButton
        label="Guardar acta"
        icon="save"
        size="lg"
        onPress={guardar}
        loading={formState.isSubmitting}
        disabled={formState.isSubmitting || analizando || !evidencia?.legible}
        accessibilityHint="Se habilita cuando la foto es legible"
      />
    </>
  );

  return (
    <ScreenContainer pie={pie}>
      <Stack.Screen options={{ title: titulo }} />
      <PasosActa pasos={PASOS} actual={actual} completos={completos} />
      <BarraConexion />
      {existente ? (
        <SelloEstado {...SELLO_ESTADO_ENVIO[existente.estado]} detalle="Estás corrigiendo un acta ya registrada." />
      ) : null}
      {existente ? <EvidenciaRegistrada acta={existente} recinto={recinto} conectado={conectado} /> : null}

      <AppCard title="Resultados" subtitle="Copia los números tal como están en el acta." icon="edit_note">
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
        </View>
      </AppCard>

      <AppCard title="Foto del acta" subtitle="Se guarda con la ubicación del momento." icon="photo_camera">
        <View style={styles.campos}>
          {analizando ? (
            <Retroalimentacion
              tipo="proceso"
              animacion="gpsBuscando"
              titulo="Revisando la foto y buscando señal GPS…"
              mensaje={conectado ? undefined : 'Sin internet el GPS puede tardar hasta un minuto. Mantén el celular quieto, cerca de una ventana o al aire libre.'}
            />
          ) : null}
          {errorEvidencia ? <Retroalimentacion tipo="error" titulo="No se pudo usar la foto" mensaje={errorEvidencia} /> : null}
          {evidencia ? (
            <>
              <Image source={{ uri: evidencia.fotoUri }} style={styles.foto} contentFit="contain" accessibilityLabel="Vista previa de la foto del acta" />
              {evidencia.legible ? (
                <>
                  <Retroalimentacion
                    tipo="exito"
                    animacion="gpsUbicado"
                    titulo="Foto legible y ubicación registrada"
                    mensaje="Abajo ves dónde se tomó."
                  />
                  {/* RF-12 / S-06: la ubicación leída AL DISPARAR, comparada con el recinto. */}
                  <UbicacionEvidencia
                    evaluacion={evaluarUbicacionEvidencia(evidencia.ubicacion, recinto)}
                    recintoNombre={recinto?.nombre}
                    conectado={conectado}
                  />
                </>
              ) : (
                <Retroalimentacion
                  tipo="error"
                  titulo="La foto está borrosa y no se leen bien los números"
                  mensaje="Tómala otra vez con más luz y el celular quieto. No podrás guardar hasta que sea legible."
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
        <Retroalimentacion
          tipo={resultado.ok ? 'exito' : 'error'}
          animacion={resultado.ok ? 'actaSellada' : undefined}
          titulo={resultado.ok ? 'Acta guardada' : 'No se guardó el acta'}
          mensaje={resultado.mensaje}
        />
      ) : null}
    </ScreenContainer>
  );
}

/**
 * RF-12: evidencia ORIGINAL de un acta ya registrada (foto y lugar de captura guardados con ella).
 * La foto viene del celular o, si el acta solo está en el servidor, de una dirección temporal
 * autorizada por la RLS de Storage. Nunca se usa la ubicación actual como sustituto.
 */
function EvidenciaRegistrada({ acta, recinto, conectado }: { acta: Acta; recinto: Recinto | null; conectado: boolean }) {
  const foto = useFotoEvidencia(acta);
  const [fotoFallo, setFotoFallo] = useState(false);
  const remota = !!foto.data && /^https?:/i.test(foto.data);

  return (
    <AppCard title="Evidencia registrada" subtitle="Foto y ubicación originales de esta acta." icon="verified">
      <View style={styles.campos}>
        {foto.isPending ? (
          <LoadingIndicator message="Cargando la foto…" />
        ) : foto.isError || fotoFallo || !foto.data ? (
          <Retroalimentacion
            tipo="error"
            titulo="No se pudo mostrar la foto"
            mensaje={foto.isError ? mensajeDeError(foto.error) : 'La foto no está disponible en este momento.'}
          />
        ) : (
          <Image
            source={{ uri: foto.data }}
            // La dirección del servidor es temporal y privada: no se guarda en la caché de disco.
            cachePolicy={remota ? 'memory' : 'memory-disk'}
            style={styles.foto}
            contentFit="contain"
            onError={() => setFotoFallo(true)}
            accessibilityLabel="Foto original del acta"
          />
        )}
        <UbicacionEvidencia
          evaluacion={evaluarUbicacionEvidencia(acta.ubicacion, recinto, acta.evidenciaServidor)}
          recintoNombre={recinto?.nombre}
          conectado={conectado}
        />
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  campos: { gap: spacing.md },
  candidato: { borderLeftWidth: 6, paddingLeft: spacing.sm, borderRadius: radius.sm },
  // La suma y su estado comparten fila si caben; si no (pantalla angosta o fuente grande), la insignia baja.
  suma: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.sm, rowGap: spacing.xxs },
  sumaTexto: { flexGrow: 1, flexShrink: 1, flexBasis: 200, minWidth: 0 },
  foto: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
});
