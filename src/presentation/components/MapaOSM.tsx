import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, radius } from '@/presentation/theme';

export type MarcadorMapa = {
  latitud: number;
  longitud: number;
  titulo: string;
  tipo: 'recinto' | 'acta' | 'alerta';
  /** Radio de error del GPS en metros: se dibuja como un círculo alrededor del punto. */
  precisionM?: number;
};

type Props = {
  marcadores: MarcadorMapa[];
  alto?: number;
  /** Une los dos primeros marcadores con una línea discontinua (captura ↔ recinto). */
  unirPrimeros?: boolean;
  /** Se llama si el mapa no puede cargarse (p. ej. sin internet): la pantalla muestra una alternativa. */
  onFallo?: () => void;
  descripcion?: string;
};

/**
 * Mapa con OpenStreetMap (ADR-C02 §6): WebView + Leaflet, sin claves de Google.
 * Seguridad: los textos vienen de la base de datos; se serializan con JSON y se escapa `<`
 * para que un nombre como "</script>" no pueda inyectar código en la página, y el popup usa
 * `textContent`. Leaflet se carga con SRI (`integrity`): si el CDN entrega otro archivo, no se ejecuta.
 * Si Leaflet no llega (sin red o SRI fallido), la página avisa a la app con `postMessage`.
 */
export function MapaOSM({ marcadores, alto = 360, unirPrimeros = false, onFallo, descripcion }: Props) {
  const datos = JSON.stringify(marcadores).replace(/</g, '\\u003c');
  const color = { recinto: colors.primary, acta: colors.success, alerta: colors.error };
  const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<style>html,body,#m{height:100%;margin:0}</style></head><body><div id="m"></div><script>
if (typeof L === 'undefined') {
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage('sin_mapa');
} else {
var datos = ${datos};
var colores = ${JSON.stringify(color)};
var unir = ${unirPrimeros ? 'true' : 'false'};
var mapa = L.map('m');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
}).addTo(mapa);
var puntos = [];
datos.forEach(function (d) {
  if (d.precisionM > 0) {
    L.circle([d.latitud, d.longitud], {
      radius: d.precisionM, color: colores[d.tipo], weight: 1, fillOpacity: 0.12
    }).addTo(mapa);
  }
  var c = L.circleMarker([d.latitud, d.longitud], {
    radius: d.tipo === 'recinto' ? 10 : 7, color: colores[d.tipo], fillColor: colores[d.tipo], fillOpacity: 0.7
  }).addTo(mapa);
  var t = document.createElement('span'); t.textContent = d.titulo; c.bindPopup(t);
  puntos.push([d.latitud, d.longitud]);
});
if (unir && puntos.length >= 2) {
  L.polyline([puntos[0], puntos[1]], { color: '${colors.textSecondary}', weight: 2, dashArray: '6 6' }).addTo(mapa);
}
if (puntos.length) mapa.fitBounds(puntos, { padding: [32, 32], maxZoom: 17 }); else mapa.setView([-0.22, -78.51], 12);
}
</script></body></html>`;

  return (
    <View style={[styles.marco, { height: alto }]} accessibilityLabel={descripcion ?? 'Mapa de recintos y actas'}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        javaScriptEnabled
        setSupportMultipleWindows={false}
        onMessage={(e) => {
          if (e.nativeEvent.data === 'sin_mapa') onFallo?.();
        }}
        onError={() => onFallo?.()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  marco: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
});
