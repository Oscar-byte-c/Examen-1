# ADR-04: expo-camera + expo-location para la foto y la ubicación del acta

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-11, RF-12, RF-15, S-06 | `Documento_Consolidado_ADR.docx`, ficha ADR-04 |

## 1. Problema y contexto
Casi la mitad de las fotos de la elección anterior eran borrosas, y acusaron a la organización de tomarlas fuera del recinto.

## 2. Objetivo
Que cada acta tenga una foto legible tomada dentro de la app y la ubicación del momento del disparo.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **Cámara en vivo: expo-camera + expo-location** ✅ | Jairo Maigua y Oscar Vázquez | No permite fotos de la galería; mide nitidez; ubicación que respalda | Permisos de cámara y ubicación; el umbral debe validarse con fotos reales | — (elegida) |
| expo-image-picker | Kevin Amagua y Milka Borja | Más simple; sirve si falla la cámara | No garantiza que la foto sea del acta del recinto ni captura la ubicación del momento | No resolvía ninguno de los dos problemas |

## 4. Decisión y justificación
Foto con la cámara de la app; se mide la nitidez y, si está borrosa, no se puede continuar. La ubicación se captura al disparar: se toman varias lecturas y se conserva la más precisa. El GPS es obligatorio y se alerta (sin bloquear) si la foto está a más de 300 m del recinto (S-06).
> **Nota de precisión (25/11/2026):** la nitidez mide qué tan marcados son los bordes, no si los números se leen (no es OCR). La precisión del GPS es una estimación del teléfono.

## 5. Implementación real
- `src/presentation/components/CamaraActa.tsx` (cámara de la app, sin galería).
- `src/domain/entities/nitidez.ts`: varianza del laplaciano por ejes y bloques sobre la foto reducida a 1000 px; umbral `NITIDEZ_MINIMA = 200` (`constants.ts`).
- `src/data/datasources/local/dispositivo.ts`: GPS precalentado; 3 lecturas **posteriores** a la foto, límite de 60 s; se guarda la más precisa.
- `src/domain/entities/geo.ts` y `privado.distancia_m` (el servidor calcula la distancia; alerta a más de 300 m).
- Se guardan con el acta `precision_gps_m` y `capturada_en`; mapa en `MapaOSM.tsx` y `UbicacionEvidencia.tsx`.

## 6. Consecuencias
✔ Evidencia más difícil de cuestionar: foto, coordenadas, precisión y hora juntas.
✘ Requiere permisos; sin internet el primer fix del GPS tarda (hasta 60 s).

## 7. Riesgos y limitaciones
- Umbral calibrado **solo por simulación** (24/11), no con fotos reales.
- Una foto con buen contraste pero un reflejo sobre los números podría pasar; la validación final del contenido es humana.
- Un teléfono con «ubicación simulada» (*mock location*) podría engañar al GPS; no se detecta.

## 8. Pruebas y evidencias
- ✅ Automatizadas: `nitidez.test.ts` (17) · `gps.test.ts` (12) · `gpsCaptura.test.ts` (7) · `ubicacionEvidencia.test.ts` (5) · alerta de 300 m y lectura más precisa en `reglas.test.ts`.
- ⏳ Pendiente: calibración con fotos reales; prueba en el teléfono en modo avión.

## 9. Evaluación de las IA (revisión posterior del 25/11)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | De acuerdo; validar con datos reales | No presentar la nitidez como OCR ni la ubicación como infalible |
| Gemini | Observado técnicamente | El laplaciano mide contraste, no legibilidad; ubicaciones simuladas; pide guardar la precisión y la hora |
| Claude* | De acuerdo | Verificó que la precisión y la hora **ya se guardan** con el acta; coincide en que falta la calibración real |

- **Acuerdo:** mantener las librerías de Expo; reconocer los límites de la nitidez y del GPS.
- **Se incorpora:** los límites (sección 7).
- **Ya implementado:** guardar la precisión y la hora (lo pedía Gemini).
- **Alternativas señaladas por las IA (no evaluadas por el grupo):** librerías nativas independientes como `react-native-vision-camera`. Ambas IA las consideran innecesarias aquí.

\* Claude no es independiente: redactó los ADR y conoció las otras dos evaluaciones.

## 10. Conclusión y preguntas de defensa
**Conclusión:** se mantiene. La única deuda importante es calibrar el umbral con fotos reales.
- **¿Por qué no Image Picker?** Permitía subir una foto vieja de la galería y no captura la ubicación del momento.
- **¿Cómo detectan una foto borrosa?** Miden cuánto cambia el brillo en los bordes: si es borrosa, los bordes son suaves y el valor baja de 200, y no deja continuar.
- **¿La alerta de 300 m bloquea?** No; en aulas o zonas rurales el GPS varía, así que solo se avisa al coordinador (S-06).
- **¿El GPS es infalible?** No: guardamos la precisión en metros y la hora para que el coordinador valore cada caso.
