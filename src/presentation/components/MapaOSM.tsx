import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, radius } from '@/presentation/theme';

export type MarcadorMapa = {
  latitud: number;
  longitud: number;
  titulo: string;
  tipo: 'recinto' | 'acta' | 'alerta';
};

/**
 * Mapa con OpenStreetMap (ADR-C02 §6): WebView + Leaflet, sin claves de Google.
 * Seguridad: los textos vienen de la base de datos; se serializan con JSON y se escapa `<`
 * para que un nombre como "</script>" no pueda inyectar código en la página, y el popup usa
 * `textContent`. Leaflet se carga con SRI (`integrity`): si el CDN entrega otro archivo, no se ejecuta.
 */
export function MapaOSM({ marcadores, alto = 360 }: { marcadores: MarcadorMapa[]; alto?: number }) {
  const datos = JSON.stringify(marcadores).replace(/</g, '\\u003c');
  const color = { recinto: colors.primary, acta: colors.success, alerta: colors.error };
  const html = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<style>html,body,#m{height:100%;margin:0}</style></head><body><div id="m"></div><script>
var datos = ${datos};
var colores = ${JSON.stringify(color)};
var mapa = L.map('m');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; OpenStreetMap'
}).addTo(mapa);
var puntos = [];
datos.forEach(function (d) {
  var c = L.circleMarker([d.latitud, d.longitud], {
    radius: d.tipo === 'recinto' ? 10 : 7, color: colores[d.tipo], fillColor: colores[d.tipo], fillOpacity: 0.7
  }).addTo(mapa);
  var t = document.createElement('span'); t.textContent = d.titulo; c.bindPopup(t);
  puntos.push([d.latitud, d.longitud]);
});
if (puntos.length) mapa.fitBounds(puntos, { padding: [24, 24], maxZoom: 16 }); else mapa.setView([-0.22, -78.51], 12);
</script></body></html>`;

  return (
    <View style={[styles.marco, { height: alto }]} accessibilityLabel="Mapa de recintos y actas">
      <WebView originWhitelist={['*']} source={{ html }} javaScriptEnabled setSupportMultipleWindows={false} />
    </View>
  );
}

const styles = StyleSheet.create({
  marco: { borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
});
