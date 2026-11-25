# ADR-04: Expo Camera + Expo Location para la fotografía y la geolocalización de las actas

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha ADR-04 |
| Requerimientos relacionados | RF-11, RF-12, RF-15, S-06 |
| Minuto del video | No registrado en el documento grupal |

## 1. Contexto y problema

En la elección pasada muchas fotografías llegaron **borrosas o ilegibles** y no sirvieron para validar resultados. Además, se acusó a la organización de que las fotos se tomaron **fuera del recinto**, sin evidencia que respaldara el lugar de captura. Se necesita geolocalizar automáticamente cada foto.

## 2. Decisión

Se elige **expo-camera** junto con **expo-location**:

- La foto se toma con la **cámara dentro de la aplicación**.
- Antes de guardarla se **mide su nitidez**. Si está borrosa o tiene datos ilegibles, la app advierte e **impide continuar** con el registro.
- La ubicación se captura **en el momento del disparo**. Para reducir el error del GPS se toman **varias lecturas** y se conserva la de **mejor precisión**, guardando también los valores reportados.

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **Cámara en vivo con expo-camera y expo-location** ✅ | Jairo Maigua y Oscar Vázquez | Obliga a tomar la foto dentro de la app (no desde la galería). La medición de nitidez impide enviarla sin revisión y con ubicación que la respalde | Requiere permisos de cámara y ubicación. El umbral de nitidez debe validarse con fotos reales para no rechazar imágenes legibles |
| Selector de imágenes con expo-image-picker | Kevin Amagua y Milka Borja | Más simple; permite elegir fotos ya tomadas y sirve si la cámara falla | No garantiza que la foto sea del acta del recinto ni captura la ubicación del momento |

## 4. Justificación

- El selector de galería **no resuelve** ninguno de los dos problemas del enunciado: ni la foto ilegible ni la acusación de que se tomó en otro lugar.
- Tomar la foto dentro de la app permite asociar la imagen con la ubicación **del mismo instante**.

## 5. Consecuencias

**Positivas**
- Evidencia más difícil de cuestionar: cada acta llega con una ubicación precisa que el coordinador puede revisar.

**Negativas**
- Si el umbral se calibra mal, el sistema puede rechazar fotos legibles; hay que validarlo con actas reales.

## 6. Relación con el examen

- **Rúbrica:** «Registro de resultados… con las garantías de confiabilidad y evidencia» (3 pts) y «seguimiento del escrutinio» del provincial (ubicación de cada acta).
- **Enunciado:** «Necesitamos saber desde dónde se registró cada acta y poder consultarlo directamente al revisarla; un acta sin esa evidencia no nos sirve».
- **S-06:** GPS obligatorio para guardar; sin geocerca bloqueante; alerta visual si la distancia supera **300 m**.

## 7. Evidencia de implementación

| Qué | Dónde |
|---|---|
| Cámara de la app (sin galería) | `src/presentation/components/CamaraActa.tsx` |
| Nitidez (varianza del laplaciano, función pura) | `src/domain/entities/nitidez.ts` + `src/domain/__tests__/nitidez.test.ts` |
| Lecturas de GPS posteriores a la foto; se conserva la más precisa | `src/data/datasources/local/dispositivo.ts`, `src/domain/__tests__/gpsCaptura.test.ts` |
| Distancia y alerta de 300 m | `src/domain/entities/geo.ts`; en el servidor, `privado.distancia_m` dentro de `sincronizar_acta` |
| Mapa de la evidencia y del provincial | `src/presentation/components/MapaOSM.tsx`, `UbicacionEvidencia.tsx` |

**Aclaraciones y diferencias**
- **Umbral de nitidez:** `NITIDEZ_MINIMA = 200`, calibrado por **simulación** (24/11). Falta confirmarlo con fotos reales, tal como advierte este ADR (`ADR-C02` §5).
- **«Varias lecturas»:** se implementó como 3 lecturas posteriores al disparo con un límite total de 60 s (`ADR-C02` §5.1). No cambia la decisión, solo la precisa.
- **Biblioteca de medición:** `jpeg-js` (dependencia auxiliar registrada en `ADR_LINEA_BASE.md` §4.9) y `expo-image-manipulator`.
- **Mapa:** el documento no fija la librería; se eligió WebView + Leaflet con OpenStreetMap (`ADR_LINEA_BASE.md` §4.4, `ADR-C02` §6).
