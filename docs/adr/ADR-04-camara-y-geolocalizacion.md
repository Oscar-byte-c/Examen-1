# ADR-04: Usar expo-camera y expo-location para la foto del acta y su ubicación

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha ADR-04).

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-11:** la foto se ve antes de confirmar y se advierte si no es legible.
- **RF-12:** se registra la ubicación de la captura.
- **RF-15:** el provincial ve desde dónde se registró cada acta.
- **S-06:** GPS obligatorio y alerta si está a más de 300 m, sin bloquear.

## Contexto
En la elección pasada casi la mitad de las fotos de actas llegaron borrosas o ilegibles y no sirvieron para impugnar resultados. Además, se acusó a la organización de que algunas fotos se tomaron fuera del recinto, y no había cómo demostrar lo contrario.

La app necesita dos cosas a la vez: que la foto sea del acta en el momento del registro, y no una imagen cualquiera de la galería, y que lleve la ubicación del instante del disparo. Si la foto y la ubicación se obtienen por separado, ninguna respalda a la otra.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Cámara en vivo con expo-camera y expo-location** (propuesta por Jairo Maigua y Oscar Vázquez) | Obliga a tomar la foto dentro de la app, sin elegirla de la galería. Permite medir la nitidez antes de continuar y registrar la ubicación del mismo momento. | Requiere permisos de cámara y ubicación. El umbral de nitidez debe validarse con fotos reales para no rechazar imágenes legibles. |
| Selector de imágenes con expo-image-picker (propuesta por Kevin Amagua y Milka Borja) | Más simple; permite elegir una foto ya tomada y sirve de respaldo si la cámara falla. | No garantiza que la foto sea del acta del recinto ni captura la ubicación del momento en que se tomó. |

## Decisión
Se usa **expo-camera** junto con **expo-location**. La foto se toma con la cámara de la app y, antes de guardarla, se mide su nitidez: si está borrosa, la app lo advierte y no deja continuar. La ubicación se captura en el momento del disparo; para reducir el error del GPS se toman varias lecturas y se conserva la más precisa. El selector de galería se descartó porque no resolvía ninguno de los dos problemas.

## Consecuencias
- **Cámara:** `src/presentation/components/CamaraActa.tsx`, sin acceso a la galería.
- **Nitidez** (`src/domain/entities/nitidez.ts`): es la varianza del laplaciano, medida por ejes y por bloques sobre la foto reducida a 1000 px. El umbral es `NITIDEZ_MINIMA = 200` (`constants.ts`). La foto se reduce con `expo-image-manipulator` y se decodifica con `jpeg-js`, una dependencia auxiliar (ADR_LINEA_BASE §4.9; método en ADR-C02 §5).
- **Qué mide la nitidez:** cuán marcados son los bordes, no si los números se leen; no es OCR. La validación final del contenido la hace una persona.
- **GPS** (`dispositivo.ts`, ADR-C02 §5.1):
  - el receptor se enciende al abrir la pantalla del acta;
  - después de la foto solo valen las lecturas posteriores al disparo: 3 lecturas, con un límite total de 60 s, y se guarda la más precisa;
  - sin señal en ese tiempo, el acta no se guarda (S-06).
- **Distancia al recinto:** el teléfono la estima con `src/domain/entities/geo.ts` antes de enviar, y la oficial la calcula el servidor (`privado.distancia_m`, dentro de `sincronizar_acta`) y marca `fuera_de_rango` a más de 300 m.
- **Qué se guarda con el acta:** coordenadas, `precision_gps_m` y `capturada_en`. La precisión es una estimación del teléfono, no una garantía.
- **Mapa:** `MapaOSM.tsx` y `UbicacionEvidencia.tsx` usan WebView + Leaflet con OpenStreetMap (ADR_LINEA_BASE §4.4, ADR-C02 §6).
- **Riesgos y limitaciones:**
  - el umbral se calibró solo por simulación el 24/11;
  - una foto con buen contraste pero con un reflejo sobre los números podría pasar;
  - un teléfono con «ubicación simulada» (*mock location*) no se detecta;
  - sin internet, el primer fix del GPS tarda.

## Verificación
- **Automática:**
  - `nitidez.test.ts` (17 pruebas): fotos nítidas, desenfocadas y movidas.
  - `gps.test.ts` (12) y `gpsCaptura.test.ts` (7): lecturas válidas solo después de la foto, la más precisa y el límite de tiempo.
  - `ubicacionEvidencia.test.ts` (5): estimación de la distancia y alerta.
  - `reglas.test.ts`: alerta de 300 m.
- **Pendiente:**
  - calibrar el umbral con fotos reales (10 legibles y 10 borrosas);
  - probar en el teléfono en modo avión que se obtiene la ubicación.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, después del consenso del 22/11.
- **ChatGPT** estuvo de acuerdo, pero pidió validar con datos reales. Advirtió que la mejor precisión no garantiza la ubicación verdadera y que la nitidez no equivale a legibilidad. Recomendó guardar la precisión, la hora y la fuente de la ubicación, y documentar el algoritmo y el umbral.
- **Gemini** la dejó «observada técnicamente». Explicó que el laplaciano mide contraste, por lo que una pared rugosa podría pasar y un reflejo sobre los números también. Señaló las ubicaciones simuladas en Android y pidió guardar las coordenadas con su precisión y su hora.
- **Claude**, que participó en la redacción (no es un revisor independiente), comprobó que la precisión (`precision_gps_m`) y la hora (`capturada_en`) **ya se guardan** con el acta. Coincidió en que falta la calibración con fotos reales.

Las tres coincidieron con la decisión.
- **Se aceptaron:** los límites de la nitidez y del GPS, documentados en «Consecuencias».
- **Ya estaba implementado:** guardar la precisión y la hora.
- **Alternativas mencionadas por las IA, no evaluadas por el equipo:** librerías nativas independientes (ChatGPT) y `react-native-vision-camera` (Gemini). Ambas las consideran innecesarias aquí.
