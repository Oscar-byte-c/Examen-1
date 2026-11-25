import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { GEO_ALERT_THRESHOLD_METERS } from '@/domain/constants';
import type { EvaluacionUbicacion } from '@/domain/entities/geo';
import { colors, radius, spacing } from '@/presentation/theme';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { MapaOSM, type MarcadorMapa } from './MapaOSM';
import { StatusBadge } from './StatusBadge';

type Props = {
  /** Resultado de `evaluarUbicacionEvidencia` (dominio): aquí solo se presenta. */
  evaluacion: EvaluacionUbicacion;
  recintoNombre?: string | null;
  /** Sin internet no se intenta dibujar el mapa: se muestran los datos en texto. */
  conectado: boolean;
};

const fmtCoord = (n: number) => n.toFixed(6);
const fmtDistancia = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
const fmtFecha = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'fecha desconocida' : d.toLocaleString('es-EC');
};

/**
 * RF-12 / S-06: dónde se capturó la evidencia, comparado con el recinto.
 *  - Muestra SOLO las coordenadas guardadas con la foto; nunca la ubicación actual del celular.
 *  - Sin coordenadas → "Sin ubicación registrada". Sin red → datos en texto en lugar de un mapa vacío.
 *  - Más de 300 m → advertencia (alerta, no bloqueo). El estado no depende solo del color.
 */
export function UbicacionEvidencia({ evaluacion, recintoNombre, conectado }: Props) {
  const [mapaFallo, setMapaFallo] = useState(false);

  if (evaluacion.estado === 'sin_ubicacion') {
    return (
      <View style={[styles.aviso, { backgroundColor: colors.warningSoft }]} accessibilityLiveRegion="polite">
        <AppIcon name="location_off" color="warning" />
        <AppText variant="bodySmall" style={styles.flex}>
          Sin ubicación registrada para esta foto.
        </AppText>
      </View>
    );
  }

  const { captura } = evaluacion;
  const evaluada = evaluacion.estado === 'evaluada' ? evaluacion : null;
  const marcadores: MarcadorMapa[] = [
    {
      latitud: captura.latitud,
      longitud: captura.longitud,
      titulo: 'Lugar de la foto',
      tipo: evaluada?.fueraDeRango ? 'alerta' : 'acta',
      precisionM: captura.precisionM,
    },
  ];
  if (evaluada) {
    marcadores.push({
      latitud: evaluada.recinto.latitud,
      longitud: evaluada.recinto.longitud,
      titulo: recintoNombre ? `Recinto: ${recintoNombre}` : 'Recinto',
      tipo: 'recinto',
    });
  }
  const mostrarMapa = conectado && !mapaFallo;

  return (
    <View style={styles.contenedor}>
      {mostrarMapa ? (
        <>
          <MapaOSM
            marcadores={marcadores}
            alto={240}
            unirPrimeros={!!evaluada}
            onFallo={() => setMapaFallo(true)}
            descripcion="Mapa con el lugar donde se tomó la foto y el recinto"
          />
          <View style={styles.leyenda}>
            <Punto color={evaluada?.fueraDeRango ? colors.error : colors.success} texto="Foto" />
            {evaluada ? <Punto color={colors.primary} texto="Recinto" /> : null}
          </View>
        </>
      ) : (
        <View style={[styles.aviso, { backgroundColor: colors.surfaceMuted }]}>
          <AppIcon name="map" color="textSecondary" />
          <AppText variant="bodySmall" color="textSecondary" style={styles.flex}>
            {conectado ? 'No se pudo cargar el mapa.' : 'Mapa no disponible sin conexión.'} Estos son los datos guardados con la foto:
          </AppText>
        </View>
      )}

      <View style={styles.datos}>
        <Dato etiqueta="Coordenadas" valor={`${fmtCoord(captura.latitud)}, ${fmtCoord(captura.longitud)}`} />
        <Dato etiqueta="Precisión del GPS" valor={`± ${Math.round(captura.precisionM)} m`} />
        <Dato etiqueta="Capturada" valor={fmtFecha(captura.capturadaEn)} />
        {evaluada ? (
          <>
            <Dato
              etiqueta={evaluada.origen === 'servidor' ? 'Distancia al recinto' : 'Distancia al recinto (estimada)'}
              valor={fmtDistancia(evaluada.distanciaM)}
            />
            <StatusBadge
              status={evaluada.fueraDeRango ? 'warning' : 'success'}
              label={
                evaluada.fueraDeRango
                  ? `Fuera del rango de ${GEO_ALERT_THRESHOLD_METERS} m`
                  : `Dentro de ${GEO_ALERT_THRESHOLD_METERS} m del recinto`
              }
            />
            {evaluada.fueraDeRango ? (
              <AppText variant="caption" color="textSecondary">
                Se registrará con una alerta para el coordinador. Puedes guardar el acta igualmente.
              </AppText>
            ) : null}
            {evaluada.origen === 'dispositivo' ? (
              <AppText variant="caption" color="textSecondary">
                El servidor confirma la distancia oficial al recibir el acta.
              </AppText>
            ) : null}
          </>
        ) : (
          <AppText variant="caption" color="textSecondary">
            No se conocen las coordenadas del recinto{conectado ? '' : ' sin conexión'}: no se puede calcular la distancia.
          </AppText>
        )}
      </View>
    </View>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.dato}>
      <AppText variant="caption" color="textSecondary" style={styles.etiqueta}>
        {etiqueta}
      </AppText>
      <AppText variant="bodySmall" style={styles.valor}>
        {valor}
      </AppText>
    </View>
  );
}

function Punto({ color, texto }: { color: string; texto: string }) {
  return (
    <View style={styles.punto}>
      <View style={[styles.circulo, { backgroundColor: color }]} />
      <AppText variant="caption" color="textSecondary">
        {texto}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.sm },
  flex: { flex: 1 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md },
  leyenda: { flexDirection: 'row', gap: spacing.md },
  punto: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  circulo: { width: spacing.sm, height: spacing.sm, borderRadius: radius.pill },
  datos: { gap: spacing.xs, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  // Etiqueta y valor en la misma línea si caben; si no (fuente grande, pantalla angosta), el valor baja.
  dato: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: spacing.sm },
  etiqueta: { flexShrink: 1 },
  valor: { flexGrow: 1, flexShrink: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
