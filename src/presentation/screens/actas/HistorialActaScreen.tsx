import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DIGNIDAD_LABELS, type Candidato, type Dignidad } from '@/domain/entities/Acta';
import { cambiosEntreVersiones, type CambioVersion, type VersionActa } from '@/domain/entities/Historial';
import { ROLE_LABELS } from '@/domain/entities/Role';
import {
  AppCard,
  AppIcon,
  AppText,
  CifraClave,
  EmptyState,
  LoadingIndicator,
  Retroalimentacion,
  ScreenContainer,
  StatusBadge,
} from '@/presentation/components';
import { mensajeDeError, useCandidatos, useEscrutinioEnVivo, useHistorialActa } from '@/presentation/hooks/consultas';
import { colors, radius, sizes, spacing } from '@/presentation/theme';

type Params = { mesaId: string; dignidad: Dignidad; mesaNumero?: string };

const fecha = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'fecha desconocida' : d.toLocaleString('es-EC');
};

/**
 * Historial y auditoría de un acta (S-04, ADR-11). Lo usan el coordinador de recinto y el
 * provincial; la RLS de `actas_historial` solo entrega datos a coordinadores con acceso a esa
 * mesa (un veedor recibe una lista vacía). Es de SOLO LECTURA: las versiones las escribe el
 * servidor al aplicar cada cambio, así que nadie puede alterarlas desde la app.
 */
export default function HistorialActaScreen() {
  const { mesaId, dignidad, mesaNumero } = useLocalSearchParams<Params>();
  const historial = useHistorialActa(mesaId, dignidad);
  const candidatos = useCandidatos(dignidad);
  useEscrutinioEnVivo();
  const titulo = `Historial · Mesa ${mesaNumero ?? ''}`;

  return (
    <ScreenContainer onRefresh={() => void historial.refetch()} refreshing={historial.isRefetching}>
      <Stack.Screen options={{ title: titulo }} />
      {historial.isPending ? (
        <LoadingIndicator message="Cargando el historial…" />
      ) : historial.isError ? (
        <Retroalimentacion tipo="error" titulo="No se pudo cargar el historial" mensaje={mensajeDeError(historial.error)} />
      ) : !historial.data ? (
        <EmptyState icon="history" title="Esta acta aún no llegó al servidor" description="El historial empieza cuando se sincroniza la primera versión." />
      ) : historial.data.versiones.length === 0 ? (
        <Retroalimentacion tipo="error" titulo="Sin permiso para ver el historial" mensaje="Solo los coordinadores con acceso a esta mesa pueden consultarlo." />
      ) : (
        <>
          <AppCard title={DIGNIDAD_LABELS[dignidad]} subtitle={`Mesa ${mesaNumero ?? ''}`} icon="history">
            <View style={styles.cifras}>
              <CifraClave valor={`v${historial.data.versionActual}`} etiqueta="Versión vigente" />
              <CifraClave valor={historial.data.versiones.length} etiqueta="Versiones" color="text" />
            </View>
            <AppText variant="bodySmall" color="textSecondary">
              Cada versión la registra el servidor con su autor y su fecha. No se pueden editar ni borrar.
            </AppText>
          </AppCard>

          {historial.data.versiones.map((v, i) => (
            <Version
              key={v.version}
              version={v}
              anterior={historial.data!.versiones[i + 1]}
              vigente={v.version === historial.data!.versionActual}
              candidatos={candidatos.data ?? []}
            />
          ))}
        </>
      )}
    </ScreenContainer>
  );
}

function Version({ version: v, anterior, vigente, candidatos }: { version: VersionActa; anterior?: VersionActa; vigente: boolean; candidatos: Candidato[] }) {
  const nombre = (id: string) => {
    const c = candidatos.find((x) => x.id === id);
    return c ? `Lista ${c.lista} · ${c.siglas}` : 'Candidato';
  };
  const validos = v.resultados.votos.reduce((s, x) => s + x.votos, 0);
  const cambios = anterior ? cambiosEntreVersiones(anterior, v) : null;

  return (
    <AppCard
      title={`Versión ${v.version}`}
      subtitle={fecha(v.modificadoEn)}
      icon={vigente ? 'verified' : 'history'}
      trailing={<StatusBadge status={vigente ? 'success' : 'neutral'} label={vigente ? 'Vigente' : 'Anterior'} />}>
      <View style={styles.contenido}>
        <Dato icono="person" texto={v.autor ? `${v.autor.nombre} · ${ROLE_LABELS[v.autor.rol] ?? v.autor.rol}` : 'Autor no visible para tu rol (queda registrado en el servidor)'} />
        <Dato
          icono="location_on"
          texto={`GPS ± ${Math.round(v.ubicacion.precisionM)} m · a ${Math.round(v.ubicacion.distanciaM)} m del recinto${v.ubicacion.fueraDeRango ? ' (más de 300 m)' : ''}`}
          tono={v.ubicacion.fueraDeRango ? 'ambar' : undefined}
        />
        <Dato icono="photo_camera" texto={`Foto tomada el ${fecha(v.ubicacion.capturadaEn)}`} />

        <View style={styles.cifras}>
          <CifraClave valor={v.resultados.totalSufragantes} etiqueta="Sufragantes" color="indigo" />
          <CifraClave valor={validos} etiqueta="Válidos" color="text" />
          <CifraClave valor={v.resultados.votosBlancos} etiqueta="Blancos" color="text" />
          <CifraClave valor={v.resultados.votosNulos} etiqueta="Nulos" color="text" />
        </View>

        <View style={styles.votos}>
          {[...v.resultados.votos]
            .sort((a, b) => nombre(a.candidatoId).localeCompare(nombre(b.candidatoId)))
            .map((x) => (
              <View key={x.candidatoId} style={styles.voto}>
                <AppText variant="bodySmall" style={styles.flex}>
                  {nombre(x.candidatoId)}
                </AppText>
                <AppText variant="numeralSmall">{x.votos}</AppText>
              </View>
            ))}
        </View>

        <View style={styles.cambios} accessible accessibilityLabel={cambios === null ? 'Registro inicial' : `Cambios: ${cambios.length}`}>
          <AppText variant="label" color="primary">
            {cambios === null ? 'Registro inicial del acta' : cambios.length === 0 ? 'Sin cambios en las cifras respecto de la versión anterior' : 'Cambios respecto de la versión anterior'}
          </AppText>
          {cambios?.map((c, i) => (
            <AppText key={i} variant="bodySmall">
              • {describirCambio(c, nombre)}
            </AppText>
          ))}
        </View>

        <AppText variant="caption" color="textSecondary">
          Operación {v.operacionId.slice(0, 8)} · autor {v.autorId.slice(0, 8)}
        </AppText>
      </View>
    </AppCard>
  );
}

const ETIQUETA_CAMPO = { totalSufragantes: 'Total de sufragantes', votosBlancos: 'Votos en blanco', votosNulos: 'Votos nulos' } as const;

function describirCambio(c: CambioVersion, nombre: (id: string) => string): string {
  switch (c.campo) {
    case 'candidato':
      return `${nombre(c.candidatoId)}: ${c.antes} → ${c.despues}`;
    case 'foto':
      return 'Se tomó una foto nueva (la anterior se conserva como evidencia)';
    case 'ubicacion':
      return `Nuevo lugar de captura: a ${Math.round(c.distanciaDespuesM)} m del recinto (antes ${Math.round(c.distanciaAntesM)} m)`;
    default:
      return `${ETIQUETA_CAMPO[c.campo]}: ${c.antes} → ${c.despues}`;
  }
}

function Dato({ icono, texto, tono }: { icono: 'person' | 'location_on' | 'photo_camera'; texto: string; tono?: 'ambar' }) {
  return (
    <View style={styles.dato}>
      <AppIcon name={icono} size={sizes.iconSm} color={tono ?? 'textSecondary'} />
      <AppText variant="bodySmall" color={tono ?? 'text'} style={styles.flex}>
        {texto}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: { gap: spacing.sm },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  votos: { gap: 2 },
  voto: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  cambios: { gap: 2, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.tonal },
  dato: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  flex: { flex: 1, minWidth: 0 },
});
