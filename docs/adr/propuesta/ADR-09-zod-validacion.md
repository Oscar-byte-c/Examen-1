# ADR-09: Zod para validar cédulas, correos y la coherencia numérica de las actas

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-02, RF-10, RF-12, RNF-02, S-02 (tal como en el `.docx`) | `Documento_Consolidado_ADR.docx`, ficha 4.9 (numerada «ADR-009») |

## 1. Problema y contexto
Hubo cédulas mal digitadas que impidieron saber quién reportó ciertas actas, y actas con cifras imposibles: un candidato con más votos que sufragantes o sumas que no cuadraban.

## 2. Objetivo
Detectar esos errores en el momento de escribir, con reglas únicas que se reutilicen al crear y al corregir.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **Zod** ✅ | Milka Borja | Esquemas reutilizables con reglas cruzadas | Una dependencia más; sincronizar los mensajes con la UI | — (elegida) |
| Yup | Jairo Maigua | API conocida; condiciones entre campos | Tipos de TypeScript menos precisos; reglas cruzadas más difíciles | Peor con TypeScript |
| Validaciones manuales con `if`/`else` | Oscar Vázquez | Sin librerías; cada regla visible | Reglas repetidas en usuarios, alcaldía, prefectura y correcciones | Riesgo de olvidar una regla en algún flujo |

## 4. Decisión y justificación
Zod centraliza los esquemas de usuarios y actas y se ejecuta antes de guardar o enviar cualquier registro.
> **Nota de precisión (25/11/2026):** Zod protege la experiencia del usuario; la frontera de seguridad es el servidor, que repite las reglas del acta en `privado.validar_acta` (dentro de la RPC) y las de usuario en `crear-usuario`.

## 5. Implementación real
- `src/domain/entities/Acta.ts` (`crearFormularioActaSchema`: sin negativos ni decimales, ningún candidato por encima del total, válidos + blancos + nulos = total).
- `cedula.ts` (dígito verificador, módulo 10) · `Usuario.ts` (correo, teléfono, nombres y clave).
- **En el servidor:** `privado.validar_acta` repite la suma, los negativos, el tope por candidato, la dignidad de cada candidato y el GPS obligatorio.

## 6. Consecuencias
✔ Las mismas reglas en el registro y en la corrección; se prueban sin React ni Supabase.
✘ Las reglas existen dos veces (cliente en Zod y servidor en SQL) y deben mantenerse iguales.

## 7. Riesgos y limitaciones
- Si se cambia una regla en Zod y no en `validar_acta` (o al revés), divergen sin aviso.
- La suma **no** es una restricción `CHECK` de la tabla: la impone la RPC (ver ADR-11).

## 8. Pruebas y evidencias
- ✅ Automatizadas: `reglas.test.ts`, bloques de cédula, validación matemática y esquemas de usuario (parte de sus 38 pruebas).
- ✅ Servidor: `verificar-rls.mjs` «el servidor rechaza un acta matemáticamente imposible», dentro de los 27/27 del 22/11 (sin log adjunto).

## 9. Evaluación de las IA (revisión posterior del 25/11)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | De acuerdo | Indicar qué reglas también impone el servidor |
| Gemini | Aprobado con advertencia de frontera | Mapear reglas de Zod frente a reglas del servidor; afirma que se replican en «CHECK o RPC» |
| Claude* | De acuerdo | Verificó que la suma se replica en la **RPC** (`validar_acta`), no en un `CHECK`; la tabla solo tiene `check (>= 0)` |

- **Acuerdo:** mantener; el cliente no es una barrera de seguridad.
- **Precisión:** la respuesta modelo de Gemini dice que «las restricciones SQL replican las invariantes». Es inexacto: lo hace la función RPC.

\* Claude no es independiente: redactó los ADR y conoció las otras dos evaluaciones.

## 10. Conclusión y preguntas de defensa
**Conclusión:** se mantiene; la validación existe en los dos lados.
- **¿Qué regla cruzada valida?** Que válidos + blancos + nulos sea igual al total de sufragantes y que ningún candidato supere ese total.
- **¿Zod protege la base de datos?** No; protege la pantalla. El servidor vuelve a validar en `validar_acta`.
- **¿Por qué está en el dominio?** Porque son reglas de negocio y Zod es TypeScript puro: se prueban sin React ni Supabase.
