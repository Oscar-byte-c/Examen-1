# ADR-08: React Hook Form para los formularios

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-02, RF-06, RF-08, RF-09, RF-13, RF-20, RNF-04, RNF-07, S-03 | `Documento_Consolidado_ADR.docx`, ficha 4.8 (numerada «ADR-008») |

## 1. Problema y contexto
El acta tiene muchos campos numéricos por dignidad (cinco organizaciones, nulos, blancos y total) y los veedores se equivocan al digitar. Además hay formularios de usuarios, recintos y reemplazo de veedores.

## 2. Objetivo
Formularios fluidos que precarguen los datos al corregir y bloqueen envíos repetidos.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **React Hook Form** ✅ | Kevin Amagua | **Error del `.docx`:** la fila copia el texto del ADR-07. Según la decisión y las consecuencias del propio documento: fluidez en gama media y baja, errores por campo y bloqueo durante el envío | Una dependencia más; envolver las entradas propias con `Controller` | — (elegida) |
| TanStack Form | Oscar Vázquez | Tipado estricto y seguimiento campo por campo | Más código por campo; menos ejemplos para móviles | El costo no compensaba para el alcance |
| `useState` por campo | Jairo Maigua | Sin dependencias; directo para 2 o 3 campos | Con 8 campos por dignidad el código se repite y la pantalla se redibuja en cada pulsación | Lento y repetitivo |

## 4. Decisión y justificación
React Hook Form para la creación de usuarios y recintos, el reemplazo de veedores y el registro o corrección de actas: mejora la fluidez y estandariza los errores por campo y el bloqueo durante el envío.

## 5. Implementación real
- `src/presentation/screens/actas/ActaScreen.tsx`: **un solo formulario** para los 4 pasos; `shouldUnregister` queda en su valor por defecto (`false`), así que los votos se conservan al cambiar de paso; `isSubmitting` desactiva «Sellar».
- `CampoNumero.tsx` y `CampoTexto.tsx` con `Controller` · `NuevaCuentaScreen.tsx` · `NuevoRecintoScreen.tsx` · `LoginScreen.tsx`.
- `@hookform/resolvers` une el formulario con los esquemas Zod (ADR-09). Los campos se guardan como texto y Zod los convierte a número al validar.

## 6. Consecuencias
✔ Menos redibujados; errores uniformes; doble envío bloqueado.
✘ `Controller` en cada campo propio.

## 7. Riesgos y limitaciones
- Las reglas no viven aquí sino en Zod: si se cambia una, se cambia en el esquema.
- Un campo vacío es texto vacío (`''`), no 0: se marca «Falta este dato» y no cuenta como número.

## 8. Pruebas y evidencias
- ✅ Automatizadas: `asistente.test.ts` (8): balance de votos (faltan, sobran, cuadra), paso al que lleva cada campo y qué cuenta como número válido.
- ⏳ Manual: ir y volver entre pasos sin perder datos; doble toque en «Sellar».

## 9. Evaluación de las IA (revisión posterior del 25/11)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | De acuerdo; completar la comparación | Detectó la tabla del `.docx` incompleta; explicar la relación con Zod |
| Gemini | Aprobado con deuda documental | Documentar `shouldUnregister: false` y el manejo de campos numéricos vacíos |
| Claude* | De acuerdo | Verificó el valor por defecto `false` y que los campos vacíos se tratan como «falta» |

- **Acuerdo:** mantener; completar la fila de RHF dejando constancia del error del `.docx`.
- **Precisión:** el problema real del `.docx` es que la fila de RHF copia el texto del ADR-07 (ChatGPT y Gemini lo describen como «incompleto» o «truncado»).

\* Claude no es independiente: redactó los ADR y conoció las otras dos evaluaciones.

## 10. Conclusión y preguntas de defensa
**Conclusión:** se mantiene; la deuda era documental y queda corregida en este ADR.
- **¿Por qué no `useState`?** Con 8 campos por dignidad se repite el código y la pantalla se redibuja en cada tecla.
- **¿RHF valida?** No: maneja los valores y los errores; las reglas las pone Zod con `zodResolver`.
- **¿Cómo no se pierden los votos al cambiar de paso?** Es un solo formulario y React Hook Form conserva los valores de los campos que se ocultan.
- **¿Cómo evitan dos envíos?** «Sellar» se desactiva mientras `isSubmitting` es verdadero.
