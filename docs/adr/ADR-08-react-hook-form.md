# ADR-08: Usar React Hook Form para los formularios de usuarios, territorio y actas

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha 4.8, numerada «ADR-008»).

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-02:** alta de usuarios con datos válidos.
- **RF-06:** registro de recintos.
- **RF-08 y RF-20:** asignación y reemplazo de veedores.
- **RF-09 y RF-13:** registro y corrección de actas.
- **RNF-04:** sin envíos duplicados.
- **RNF-07:** flujos tolerantes a errores.
- **S-03:** validación que bloquea.

## Contexto
El formulario más exigente es el del acta. Por cada dignidad (alcaldía y prefectura) hay que escribir los votos de cinco organizaciones, los votos en blanco, los nulos y el total de sufragantes. Los veedores tienen poca experiencia con el celular y se equivocan al digitar.

En la app, el acta se registra en un asistente de cuatro pasos: sufragantes, votos, evidencia y revisión. El veedor debe poder ir y volver entre pasos sin perder lo que escribió, ver el error junto al campo que lo tiene y no poder enviar dos veces mientras se guarda. Al corregir un acta, los datos anteriores deben aparecer cargados. Hay además formularios de creación de cuentas, recintos y reemplazo de veedores.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **React Hook Form** (propuesta por Kevin Amagua) | Según la decisión y las consecuencias del documento grupal: mejora la fluidez en Android de gama media y baja, estandariza los errores por campo y bloquea el envío mientras se procesa. *Nota: en la tabla del `.docx`, las ventajas y desventajas de esta fila copian por error el texto del ADR-07.* | Suma una dependencia externa y obliga a envolver los campos personalizados con `Controller`. |
| TanStack Form (propuesta por Oscar Vázquez) | Tipado estricto y seguimiento campo por campo, útil en formularios complejos. | Pide más código para definir cada campo y tiene menos ejemplos para móviles; para el alcance de la entrega, el costo no compensa. |
| Estado local con `useState` por campo (propuesta por Jairo Maigua) | Sin dependencias; directo para formularios de dos o tres campos. | Con ocho campos numéricos por dignidad, validaciones y modo de edición, el código se repite y la pantalla se redibuja en cada pulsación. |

## Decisión
Se usa **React Hook Form** para los formularios de creación de usuarios y recintos, reemplazo de veedores y registro o corrección de actas. Se eligió porque mantiene la fluidez con muchos campos, deja cada error junto a su campo y bloquea los envíos repetidos. `useState` por campo se descartó por los redibujados y el código repetido; TanStack Form, porque su costo no compensaba en el plazo.

## Consecuencias
- **Un solo formulario para los cuatro pasos** (`src/presentation/screens/actas/ActaScreen.tsx`): cambiar de paso solo cambia lo que se muestra. Como `shouldUnregister` queda en su valor por defecto (`false`), los votos ingresados se conservan aunque el campo deje de verse.
- **Doble envío bloqueado:** «Sellar y guardar acta» se desactiva mientras `formState.isSubmitting` es verdadero.
- **Campos propios con `Controller`:** `CampoNumero.tsx` (los números del acta) y `CampoTexto.tsx`. También usan React Hook Form `NuevaCuentaScreen.tsx`, `NuevoRecintoScreen.tsx` y `LoginScreen.tsx`.
- **Las reglas no viven aquí:** las pone Zod (ADR-09), unido mediante `@hookform/resolvers` (dependencia auxiliar, ADR_LINEA_BASE §4.9).
- **Campos vacíos:** se guardan como texto. Uno vacío (`''`) no cuenta como 0: se marca «Falta este dato» y Zod lo convierte a número solo al validar.
- **Al corregir un acta**, el formulario arranca con los valores existentes y abre directamente el paso «Revisar».

## Verificación
- **Automática:** `asistente.test.ts` (8 pruebas) comprueba:
  - el balance de votos (faltan, sobran, cuadra);
  - a qué paso lleva cada campo con error;
  - qué cuenta como número válido.
- **Pendiente:**
  - avanzar y retroceder entre los pasos en el teléfono sin perder los votos;
  - tocar dos veces «Sellar» y comprobar que se guarda una sola vez.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, después del consenso del 22/11.
- **ChatGPT** estuvo de acuerdo, pero pidió completar la comparación: detectó que la tabla del documento consolidado estaba incompleta. Recomendó documentar `shouldUnregister`, los *resolvers* y el comportamiento al navegar entre pasos.
- **Gemini** la aprobó, con deuda documental. Pidió documentar `shouldUnregister: false` para no perder votos al retroceder y el manejo de los campos numéricos vacíos (`""`, 0 o `NaN`).
- **Claude**, que participó en la redacción (no es un revisor independiente), verificó que es un solo formulario con `shouldUnregister` en `false` y que el campo vacío se trata como «falta». También precisó que el problema real de la tabla del `.docx` no es que esté truncada, sino que **copia** el texto del ADR-07.

Las tres coinciden con la decisión.
- **Se aceptaron:** documentar el comportamiento entre pasos y el de los campos vacíos (en «Consecuencias»). La fila de React Hook Form se completó solo con lo que el propio `.docx` dice en su decisión y sus consecuencias.
- **No se agregó:** la comparación ampliada con TanStack Form que sugería ChatGPT, porque el equipo no registró más criterios.
