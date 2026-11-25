# ADR-09: Usar Zod para validar cédulas, correos y la coherencia numérica de las actas

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha 4.9, numerada «ADR-009»).

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-02:** cédula ecuatoriana y datos personales válidos.
- **RF-10 y RF-19:** detectar e impedir números imposibles.
- **S-03:** la validación matemática bloquea el guardado.
- **RNF-02.**
- El documento grupal también lista **RF-12** y **S-02**.

## Contexto
En la elección anterior se registraron cédulas mal digitadas y después no se pudo saber quién había reportado ciertas actas. También llegaron actas con cifras imposibles: una organización con más votos que el total de sufragantes, o sumas que no cuadraban.

Hay que detectar esos errores en el momento en que se escriben o se corrigen, no días después. Las mismas reglas aparecen en varios flujos: alta de usuarios, actas de alcaldía, actas de prefectura y corrección de actas. Si cada pantalla las programara por su cuenta, tarde o temprano alguna quedaría sin una regla.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Zod** (propuesta por Milka Borja) | Esquemas reutilizables con reglas cruzadas: valida el dígito verificador y la relación entre votos, blancos, nulos y total de sufragantes. | Una dependencia más, y obliga a mantener sincronizados los mensajes de error con la interfaz. |
| Yup (propuesta por Jairo Maigua) | Valida esquemas y condiciones entre campos, con una API conocida. | Infiere los tipos de TypeScript con menos precisión y expresa con más dificultad las validaciones cruzadas del escrutinio. |
| Validaciones manuales con `if` y `else` (propuesta por Oscar Vázquez) | Sin librerías; cada regla visible en el código. | Las reglas se repetirían en usuarios, en alcaldía, en prefectura y en las correcciones, y cada repetición aumenta el riesgo de olvidar una regla en algún flujo. |

## Decisión
Se usa **Zod** para centralizar los esquemas de validación de usuarios y actas, que se ejecutan antes de guardar o enviar cualquier registro. Yup se descartó porque las reglas cruzadas del acta se expresan peor y con tipos menos precisos, y las validaciones manuales, por el riesgo de olvidar una regla en alguno de los flujos.

## Consecuencias
- **Los esquemas viven en el dominio** (`src/domain/entities`), porque son reglas de negocio y Zod es TypeScript puro: se prueban sin React ni Supabase (ADR-C02 §7).
  - `Acta.ts` (`crearFormularioActaSchema`): sin negativos ni decimales, ningún candidato por encima del total y válidos + blancos + nulos = total.
  - `cedula.ts`: dígito verificador, módulo 10.
  - `Usuario.ts`: correo, teléfono, nombres y clave.
- **Unión con el formulario:** los esquemas se conectan a React Hook Form (ADR-08) con `@hookform/resolvers`.
- **S-03 / RF-19:** con una suma imposible, el acta no se puede sellar.
- **La frontera de seguridad es el servidor** (precisión del 25/11): Zod protege la experiencia del usuario, pero una petición manipulada podría saltarse la app.
  - `privado.validar_acta`, llamada dentro de la RPC `public.sincronizar_acta`, repite la suma, los negativos, el tope por candidato, la dignidad de cada candidato y el GPS obligatorio.
  - Las reglas de usuario se repiten en la Edge Function `crear-usuario`.
  - La suma **no** es una restricción `CHECK` de la tabla: la tabla solo tiene `check (>= 0)`.
- **Riesgo:** si una regla cambia en Zod y no en `validar_acta`, o al revés, divergen sin aviso. Hay que mantenerlas iguales.

## Verificación
- **Automática:** `reglas.test.ts` (parte de sus 38 pruebas) cubre:
  - la cédula ecuatoriana;
  - la validación matemática: acepta un acta coherente y rechaza negativos, candidatos por encima del total, sumas que no cuadran y candidatos faltantes;
  - los esquemas de usuario.
- **Servidor:** `verificar-rls.mjs` comprueba que el servidor rechaza un acta matemáticamente imposible. Dio 27/27 el 22/11, sin log adjunto.
- **Pendiente:** ninguna prueba específica adicional.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, después del consenso del 22/11.
- **ChatGPT** estuvo de acuerdo. Recordó que la validación en el cliente no es una frontera de seguridad y pidió documentar qué reglas viven en Zod y cuáles también en PostgreSQL o en la RPC.
- **Gemini** la aprobó con una advertencia de frontera. Destacó `.refine()` y `.superRefine()` para la coherencia aritmética, pidió mapear las reglas del cliente frente a las del servidor e incluir casos borde. Habló de replicar las reglas en restricciones `CHECK` o en la RPC.
- **Claude**, que participó en la redacción (no es un revisor independiente), comprobó que la réplica está en la RPC (`validar_acta`) y no en un `CHECK`. Por eso la afirmación de Gemini de que «las restricciones SQL replican las invariantes» es inexacta.

Las tres coinciden con la decisión.
- **Se aceptó:** documentar qué reglas tiene cada lado (en «Consecuencias»).
- **Se corrigió:** la suposición de que existen restricciones `CHECK` para la suma.
