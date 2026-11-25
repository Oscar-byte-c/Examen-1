# ADR-09: Zod para validar cédulas, correos y la coherencia numérica de las actas

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha 4.9 (numerada **ADR-009** en el documento) |
| Requerimientos relacionados | RF-02, RF-10, RF-12, RNF-02, S-02 (tal como figuran en el documento grupal) |
| Minuto del video | No registrado en el documento grupal |

## 1. Contexto y problema

En elecciones anteriores:
- se registraron **cédulas mal digitadas** que impidieron identificar quién reportó ciertas actas;
- se enviaron actas con **cifras imposibles**, como un candidato con más votos que el total de sufragantes o sumas inconsistentes.

La app debe detectar estos errores **en el momento** en que se ingresan o corrigen los datos, tanto en las pantallas como al validar las entidades bajo Clean Architecture.

## 2. Decisión

Se elige **Zod** para **centralizar** los esquemas de validación de usuarios y actas, que se ejecutan **antes de guardar o enviar** cualquier registro.

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **Zod** ✅ | Milka Borja | Esquemas reutilizables con reglas cruzadas: valida el dígito verificador, votos, nulos, blancos y total de sufragantes | Una dependencia más; hay que mantener sincronizados los mensajes de error con la interfaz |
| Yup | Jairo Maigua | Valida esquemas y condiciones entre campos; API conocida | Infiere tipos de TypeScript con menos precisión y expresa con más dificultad las validaciones cruzadas del escrutinio |
| Validaciones manuales con `if` y `else` | Oscar Vázquez | Sin librerías; cada regla visible en el código | Las reglas se repetirían en usuarios, en actas de alcaldía y prefectura y en las correcciones; cada repetición aumenta el riesgo de olvidar una regla |

## 4. Justificación

- Una **sola definición** de cada regla se reutiliza al crear y al corregir actas, evitando el riesgo de las validaciones manuales repetidas.
- Expresa mejor que Yup las **reglas cruzadas** (válidos + blancos + nulos = sufragantes).

## 5. Consecuencias

**Positivas**
- Se bloquean en tiempo real las cédulas inválidas y las actas matemáticamente imposibles, con las mismas reglas al crear y al corregir.

**Negativas / obligaciones**
- Se incorpora una librería externa.
- Los esquemas deben mantenerse **desacoplados de la UI** para no mezclar interfaz con reglas de validación.

## 6. Relación con el examen

- **Rúbrica:** «Acceso de los usuarios» (cédula y correo) y «Registro de resultados» (validación numérica).
- **S-03:** la validación matemática **bloquea** el guardado.
- **RF-19:** sin negativos, ningún candidato por encima del total, suma igual al total.

## 7. Evidencia de implementación

| Qué | Dónde |
|---|---|
| Esquema del acta con reglas cruzadas | `src/domain/entities/Acta.ts` (`crearFormularioActaSchema`) |
| Cédula ecuatoriana | `src/domain/entities/cedula.ts` |
| Esquemas de usuario (correo, teléfono, nombres) | `src/domain/entities/Usuario.ts` |
| Pruebas | `src/domain/__tests__/reglas.test.ts` |
| La misma regla en el servidor | `privado.validar_acta` dentro de `public.sincronizar_acta`; Edge Function `crear-usuario` |

**Aclaración registrada:** los esquemas viven en `domain/entities` porque son reglas de negocio y Zod es TypeScript puro, así que el dominio sigue sin depender de React ni de Supabase (`ADR-C02` §7). Sin diferencias con lo acordado.
