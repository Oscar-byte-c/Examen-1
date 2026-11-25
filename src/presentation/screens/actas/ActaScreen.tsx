import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { Keyboard, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import {
  aResultados,
  crearFormularioActaSchema,
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
  AnimacionLottie,
  AppButton,
  AppCard,
  AppIcon,
  AppText,
  BalanceVotos,
  BarraConexion,
  CampoNumero,
  CifraClave,
  LoadingIndicator,
  PasosSegmentados,
  Retroalimentacion,
  ScreenContainer,
  SelloEstado,
  UbicacionEvidencia,
  type IconName,
} from '@/presentation/components';
import { CamaraActa } from '@/presentation/components/CamaraActa';
import { mensajeDeError, useActa, useCandidatos, useFotoEvidencia, useRecintoDeMesa } from '@/presentation/hooks/consultas';
import { useTecladoVisible } from '@/presentation/hooks/useTecladoVisible';
import { useSession } from '@/presentation/navigation/useSession';
import { calcularBalance, PASO, PASOS_ACTA, pasoDeCampo, tieneNumero } from '@/presentation/screens/actas/asistente';
import { SELLO_ESTADO_ENVIO } from '@/presentation/screens/actas/etiquetas';
import { useSyncStore } from '@/presentation/store/syncStore';
import { colors, radius, sizes, spacing, type ColorToken } from '@/presentation/theme';

type Params = { mesaId: string; dignidad: Dignidad; mesaNumero?: string };

/** Cabecera nativa en «noche» (Fase 4): continúa en la banda de pasos sin costura. */
const CABECERA = { headerStyle: { backgroundColor: colors.noche }, headerShadowVisible: false } as const;

/**
 * Registro y corrección de un acta (RF-09 a RF-13, RF-16, RF-19).
 * Asistente de 4 pasos (Fase 4, «Noche de escrutinio»): Sufragantes → Votos → Evidencia → Revisar.
 * Es UN solo formulario (React Hook Form): cambiar de paso solo cambia lo que se muestra; los
 * valores se conservan. La validación (Zod del dominio), la foto (nitidez), el GPS, el guardado
 * local y la sincronización son los mismos de antes. La usan el veedor y, para corregir actas
 * de su recinto, el coordinador de recinto.
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

/** Nombre de un campo del formulario del acta (para enfocarlo con `setFocus`). */
type CampoActa = 'totalSufragantes' | 'votosBlancos' | 'votosNulos' | `votos.${string}`;

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

  const { control, handleSubmit, formState, setFocus } = useForm<FormularioActaEntrada, unknown, FormularioActaSalida>({
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

  // ---- Asistente (solo presentación) ----
  // Corregir un acta existente empieza en «Revisar» con todo precargado; un acta nueva, en el paso 1.
  const [paso, setPaso] = useState<number>(existente ? PASO.REVISAR : PASO.SUFRAGANTES);
  // «Falta este dato» se marca después de que el usuario intente avanzar o sellar (no al entrar).
  const [mostrarFaltantes, setMostrarFaltantes] = useState(!!existente);
  const teclado = useTecladoVisible();
  const balance = calcularBalance(valores);
  // Orden de los campos de votos: la tecla «Siguiente» del teclado salta al próximo.
  const camposVotos: CampoActa[] = [...candidatos.map((c): CampoActa => `votos.${c.id}`), 'votosBlancos', 'votosNulos'];
  const enfocar = (campo: CampoActa | undefined) => {
    if (campo) setFocus(campo as Parameters<typeof setFocus>[0]);
  };

  const irA = (destino: number) => {
    Keyboard.dismiss();
    if (paso === PASO.VOTOS || destino > PASO.VOTOS) setMostrarFaltantes(true);
    setPaso(destino);
  };

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

  /** Si Zod rechaza al sellar: lleva al paso y al campo del primer error (la regla no cambia). */
  const alFallarValidacion = (errores: FieldErrors<FormularioActaEntrada>) => {
    const conError = (c: CampoActa) => {
      const [raiz, id] = c.split('.') as [keyof FormularioActaEntrada, string | undefined];
      const e = errores[raiz] as Record<string, unknown> | undefined;
      return !!(id ? e?.[id] : e);
    };
    const totalValido = tieneNumero(valores.totalSufragantes);
    const primero: CampoActa = (['totalSufragantes', ...camposVotos] as CampoActa[]).find(conError) ?? camposVotos[0];
    setMostrarFaltantes(true);
    setPaso(pasoDeCampo(primero, totalValido));
    // «La suma no cuadra» llega en el total: con un total válido se revisan los votos (primer candidato).
    const campo = primero === 'totalSufragantes' && totalValido ? camposVotos[0] : primero;
    // Tras pintar el paso, el cursor va al campo (el teclado se abre sobre él).
    setTimeout(() => enfocar(campo), 150);
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
  }, alFallarValidacion);

  if (camaraAbierta) return <CamaraActa onCaptura={alCapturar} onCancelar={() => setCamaraAbierta(false)} />;

  const errores = formState.errors;
  const votosCompletos =
    candidatos.every((c) => tieneNumero(valores.votos?.[c.id])) && tieneNumero(valores.votosBlancos) && tieneNumero(valores.votosNulos);
  const completos = [
    tieneNumero(valores.totalSufragantes),
    votosCompletos && balance.estado === 'cuadra' && !errores.votos && !errores.votosBlancos && !errores.votosNulos,
    !!evidencia?.legible,
    !!resultado?.ok,
  ];
  // Misma condición que antes: sin foto legible, analizando o guardando, no se puede sellar.
  const sellarDeshabilitado = formState.isSubmitting || analizando || !evidencia?.legible;

  // ---- Pie fijo: Atrás / Siguiente (o Sellar). Está dentro del área que evita el teclado. ----
  // En Votos, mientras se escribe, solo queda el balance: la tecla «Siguiente» del teclado ya
  // avanza de campo y los botones vuelven al cerrarlo. Así caben más campos sobre el teclado.
  const ocultarBotones = paso === PASO.VOTOS && teclado;
  const pie = resultado?.ok ? (
    <AppButton label="Volver a mis mesas" icon="arrow_back" variant="outline" size="md" onPress={() => router.back()} />
  ) : (
    <>
      {paso === PASO.VOTOS ? <BalanceVotos {...balance} /> : null}
      <View style={[styles.botones, ocultarBotones && styles.oculto]}>
        {paso > PASO.SUFRAGANTES ? (
          <AppButton label="Atrás" icon="arrow_back" variant="outline" size="md" onPress={() => irA(paso - 1)} style={styles.botonAtras} />
        ) : null}
        {paso < PASO.REVISAR ? (
          <AppButton
            label={paso === PASO.SUFRAGANTES ? 'Siguiente: votos' : paso === PASO.VOTOS ? 'Siguiente: evidencia' : 'Revisar'}
            icon="arrow_forward"
            iconPosition="right"
            size="md"
            onPress={() => irA(paso + 1)}
            style={styles.botonPrincipal}
          />
        ) : (
          <AppButton
            label="Sellar y guardar acta"
            icon="approval"
            size="md"
            onPress={guardar}
            loading={formState.isSubmitting}
            disabled={sellarDeshabilitado}
            accessibilityHint="Se habilita cuando la foto del acta es legible"
            style={styles.botonPrincipal}
          />
        )}
      </View>
    </>
  );

  const evaluacion = evidencia ? evaluarUbicacionEvidencia(evidencia.ubicacion, recinto) : null;
  const baseBarras = Math.max(balance.declarado ?? 0, balance.suma, 1);

  return (
    <ScreenContainer
      scrollKey={resultado?.ok ? 'sellada' : paso}
      compacto
      header={
        <>
          <StatusBar style="light" />
          <PasosSegmentados
            pasos={PASOS_ACTA}
            actual={resultado?.ok ? PASOS_ACTA.length : paso}
            completos={completos}
            onIr={resultado?.ok ? undefined : irA}
          />
        </>
      }
      pie={pie}>
      <Stack.Screen options={{ title: titulo, ...CABECERA }} />
      <BarraConexion />

      {resultado?.ok ? (
        <Animated.View entering={FadeIn.duration(250)} style={styles.sellada}>
          <AnimacionLottie nombre="actaSellada" tamano={sizes.lottieLg + spacing.xl} />
          <AppText variant="title" align="center">
            Acta sellada
          </AppText>
          <AppText variant="body" color="textSecondary" align="center">
            {titulo}. {resultado.mensaje}
          </AppText>
        </Animated.View>
      ) : (
        <Animated.View key={paso} entering={FadeIn.duration(200)} style={styles.paso}>
          {paso === PASO.SUFRAGANTES ? (
            <>
              <Encabezado paso={paso} titulo="¿Cuántas personas votaron en esta mesa?" ayuda="Es el «Total de sufragantes», en la parte superior del acta impresa." />
              <CampoNumero
                control={control}
                name="totalSufragantes"
                etiqueta="Total de sufragantes"
                grande
                mostrarFaltante={mostrarFaltantes}
                accessibilityLabel="Total de sufragantes"
                returnKeyType="done"
              />
              <Nota icono="info" texto="En el siguiente paso verás, mientras escribes, cuántos votos faltan o sobran para llegar a este número." />
            </>
          ) : null}

          {paso === PASO.VOTOS ? (
            <>
              <Encabezado paso={paso} titulo="Votos por candidatura" ayuda="Copia los números tal como están en el acta. La barra de abajo se actualiza al instante." />
              {candidatos.map((c, i) => (
                <CampoNumero
                  key={c.id}
                  control={control}
                  name={`votos.${c.id}`}
                  etiqueta={c.siglas}
                  detalle={`${c.nombres} · ${c.organizacion}`}
                  marca={{ texto: String(c.lista), color: c.color }}
                  mostrarFaltante={mostrarFaltantes}
                  accessibilityLabel={`Votos de la lista ${c.lista}, ${c.siglas}, ${c.nombres}`}
                  returnKeyType="next"
                  onSubmitEditing={() => enfocar(camposVotos[i + 1])}
                />
              ))}
              <CampoNumero
                control={control}
                name="votosBlancos"
                etiqueta="Votos en blanco"
                mostrarFaltante={mostrarFaltantes}
                accessibilityLabel="Votos en blanco"
                returnKeyType="next"
                onSubmitEditing={() => enfocar('votosNulos')}
              />
              <CampoNumero
                control={control}
                name="votosNulos"
                etiqueta="Votos nulos"
                mostrarFaltante={mostrarFaltantes}
                accessibilityLabel="Votos nulos"
                returnKeyType="done"
              />
            </>
          ) : null}

          {paso === PASO.EVIDENCIA ? (
            <>
              <Encabezado paso={paso} titulo="Foto del acta" ayuda="Se guarda con la ubicación del momento en que la tomas." />
              {existente ? (
                <>
                  <EvidenciaRegistrada acta={existente} recinto={recinto} conectado={conectado} />
                  <Nota icono="photo_camera" texto="Para guardar la corrección, toma una foto nueva del acta. La evidencia original se conserva." />
                </>
              ) : null}
              <AppCard title={existente ? 'Foto nueva' : 'Tu foto'} icon="photo_camera">
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
                      {evidencia.legible && evaluacion ? (
                        <>
                          <Retroalimentacion tipo="exito" animacion="gpsUbicado" titulo="Foto legible y ubicación registrada" mensaje="Abajo ves dónde se tomó." />
                          {/* RF-12 / S-06: la ubicación leída AL DISPARAR, comparada con el recinto. */}
                          <UbicacionEvidencia evaluacion={evaluacion} recintoNombre={recinto?.nombre} conectado={conectado} />
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
            </>
          ) : null}

          {paso === PASO.REVISAR ? (
            <>
              <Encabezado paso={paso} titulo="Revisa antes de sellar" ayuda="Comprueba los números y la evidencia. Puedes volver a cualquier paso para corregir." />
              {existente ? <SelloEstado {...SELLO_ESTADO_ENVIO[existente.estado]} detalle="Estás corrigiendo un acta ya registrada." /> : null}

              <AppCard
                title="Resultados"
                icon="ballot"
                trailing={<AppButton label="Editar" icon="edit" variant="ghost" size="md" fullWidth={false} onPress={() => irA(PASO.VOTOS)} />}>
                <View style={styles.campos}>
                  <View style={styles.cifras}>
                    <CifraClave valor={balance.declarado ?? '—'} etiqueta="Sufragantes" color="indigo" />
                    <CifraClave valor={balance.validos} etiqueta="Válidos" color="text" />
                    <CifraClave valor={balance.blancos} etiqueta="En blanco" color="text" />
                    <CifraClave valor={balance.nulos} etiqueta="Nulos" color="text" />
                  </View>
                  {candidatos.map((c) => {
                    const texto = valores.votos?.[c.id];
                    const votos = tieneNumero(texto) ? Number(texto) : null;
                    return (
                      <View
                        key={c.id}
                        style={styles.filaCandidato}
                        accessible
                        accessibilityLabel={`Lista ${c.lista}, ${c.siglas}, ${c.nombres}: ${votos ?? 'sin dato'} votos`}>
                        <View style={styles.filaTexto}>
                          <AppText variant="label" style={styles.flex}>
                            Lista {c.lista} · {c.siglas}
                          </AppText>
                          <AppText variant="numeralSmall" color={votos === null ? 'ambar' : 'text'}>
                            {votos ?? '—'}
                          </AppText>
                        </View>
                        <AppText variant="caption" color="textSecondary">
                          {c.nombres}
                        </AppText>
                        <View style={styles.barra}>
                          <View style={[styles.relleno, { width: `${((votos ?? 0) / baseBarras) * 100}%`, backgroundColor: c.color }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </AppCard>

              <AppCard
                title="Evidencia"
                icon="photo_camera"
                trailing={
                  <AppButton label={evidencia ? 'Cambiar' : 'Tomar'} icon="photo_camera" variant="ghost" size="md" fullWidth={false} onPress={() => irA(PASO.EVIDENCIA)} />
                }>
                {evidencia?.legible && evaluacion ? (
                  <View style={styles.evidencia}>
                    <Image source={{ uri: evidencia.fotoUri }} style={styles.miniatura} contentFit="cover" accessibilityLabel="Miniatura de la foto del acta" />
                    <View style={styles.flex}>
                      <AppText variant="bodyStrong">Foto legible</AppText>
                      {evaluacion.estado !== 'sin_ubicacion' ? (
                        <AppText variant="bodySmall" color="textSecondary">
                          GPS ± {Math.round(evaluacion.captura.precisionM)} m
                          {evaluacion.estado === 'evaluada' ? ` · a ${Math.round(evaluacion.distanciaM)} m del recinto (estimado)` : ''}
                        </AppText>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <AppText variant="bodySmall" color="textSecondary">
                    {existente ? 'Aún no tomaste la foto nueva para esta corrección.' : 'Aún no hay una foto legible del acta.'}
                  </AppText>
                )}
              </AppCard>

              <Advertencias
                irA={irA}
                items={[
                  !tieneNumero(valores.totalSufragantes)
                    ? { tono: 'error', icono: 'error', texto: 'Falta el total de sufragantes.', paso: PASO.SUFRAGANTES }
                    : null,
                  !votosCompletos
                    ? { tono: 'error', icono: 'error', texto: 'Faltan votos por escribir.', paso: PASO.VOTOS }
                    : balance.estado === 'faltan' || balance.estado === 'sobran'
                      ? {
                          tono: 'error',
                          icono: 'error',
                          texto: `La suma no cuadra: ${balance.estado} ${balance.diferencia} voto(s) para llegar a ${balance.declarado}.`,
                          paso: PASO.VOTOS,
                        }
                      : null,
                  analizando
                    ? { tono: 'info', icono: 'sync', texto: 'Se está revisando la foto y buscando señal GPS…' }
                    : !evidencia
                      ? {
                          tono: 'error',
                          icono: 'photo_camera',
                          texto: existente ? 'Toma la foto nueva del acta para guardar la corrección.' : 'Falta la foto del acta.',
                          paso: PASO.EVIDENCIA,
                        }
                      : !evidencia.legible
                        ? { tono: 'error', icono: 'error', texto: 'La foto está borrosa: tómala otra vez.', paso: PASO.EVIDENCIA }
                        : null,
                  evaluacion?.estado === 'evaluada' && evaluacion.fueraDeRango
                    ? {
                        tono: 'aviso',
                        icono: 'warning',
                        texto: `La foto se tomó a ${Math.round(evaluacion.distanciaM)} m del recinto (más de 300 m). Se guardará con una alerta para el coordinador.`,
                      }
                    : null,
                  !conectado
                    ? { tono: 'info', icono: 'cloud_off', texto: 'Sin conexión: el acta se guardará en el celular y se enviará sola al volver la señal.' }
                    : null,
                ]}
              />

              {resultado && !resultado.ok ? <Retroalimentacion tipo="error" titulo="No se guardó el acta" mensaje={resultado.mensaje} /> : null}
            </>
          ) : null}
        </Animated.View>
      )}
    </ScreenContainer>
  );
}

/** Título de cada paso: número en ocre, pregunta grande y una ayuda breve. */
function Encabezado({ paso, titulo, ayuda }: { paso: number; titulo: string; ayuda: string }) {
  return (
    <View style={styles.encabezado}>
      <AppText variant="label" color="accent">
        Paso {paso + 1} de {PASOS_ACTA.length}
      </AppText>
      <AppText variant="title" accessibilityRole="header">
        {titulo}
      </AppText>
      <AppText variant="bodySmall" color="textSecondary">
        {ayuda}
      </AppText>
    </View>
  );
}

function Nota({ icono, texto }: { icono: IconName; texto: string }) {
  return (
    <View style={styles.nota}>
      <AppIcon name={icono} size={sizes.iconSm} color="indigo" />
      <AppText variant="bodySmall" style={styles.flex}>
        {texto}
      </AppText>
    </View>
  );
}

type Advertencia = { tono: 'error' | 'aviso' | 'info'; icono: IconName; texto: string; paso?: number };
const TONO_ADVERTENCIA: Record<Advertencia['tono'], { fondo: ColorToken; texto: ColorToken }> = {
  error: { fondo: 'errorSoft', texto: 'error' },
  aviso: { fondo: 'ambarSoft', texto: 'ambar' },
  info: { fondo: 'tonal', texto: 'indigo' },
};

/** Lo que impide sellar (con atajo al paso) y avisos que NO bloquean (alerta de 300 m, sin red). */
function Advertencias({ items, irA }: { items: (Advertencia | null)[]; irA: (paso: number) => void }) {
  const lista = items.filter((x): x is Advertencia => x !== null);
  const bloqueantes = lista.filter((x) => x.tono === 'error').length;
  return (
    <View style={styles.advertencias} accessibilityLiveRegion="polite">
      {bloqueantes === 0 ? (
        <View style={[styles.advertencia, { backgroundColor: colors.successSoft }]}>
          <AppIcon name="check_circle" color="success" />
          <AppText variant="bodyStrong" color="success" style={styles.flex}>
            Todo listo para sellar.
          </AppText>
        </View>
      ) : null}
      {lista.map((a) => {
        const t = TONO_ADVERTENCIA[a.tono];
        const destino = a.paso;
        return (
          <View key={a.texto} style={[styles.advertencia, { backgroundColor: colors[t.fondo] }]}>
            <AppIcon name={a.icono} color={t.texto} />
            <AppText variant="bodySmall" color={a.tono === 'info' ? 'text' : t.texto} style={styles.textoAdvertencia}>
              {a.texto}
            </AppText>
            {destino !== undefined ? (
              <AppButton label="Ir a corregir" variant="ghost" size="md" fullWidth={false} onPress={() => irA(destino)} />
            ) : null}
          </View>
        );
      })}
    </View>
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
  flex: { flex: 1, minWidth: 0 },
  paso: { gap: spacing.sm },
  campos: { gap: spacing.md },
  encabezado: { gap: spacing.xxs },
  nota: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.tonal },
  botones: { flexDirection: 'row', gap: spacing.sm },
  oculto: { display: 'none' },
  // «Atrás» toma su ancho natural (nunca se parte); la acción principal ocupa el resto de la fila.
  botonAtras: { flexGrow: 0, flexShrink: 0 },
  botonPrincipal: { flex: 1, minWidth: 0 },
  foto: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  sellada: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filaCandidato: { gap: 2 },
  filaTexto: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  barra: { height: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.tonal, overflow: 'hidden', marginTop: 2 },
  relleno: { height: '100%', borderRadius: radius.pill },
  evidencia: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  miniatura: { width: sizes.lottieMd, height: sizes.lottieMd + spacing.lg, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  advertencias: { gap: spacing.xs },
  advertencia: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: spacing.xs, rowGap: 2, padding: spacing.sm, borderRadius: radius.md },
  textoAdvertencia: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 0 },
});
