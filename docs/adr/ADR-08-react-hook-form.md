# ADR-08: React Hook Form para los formularios de usuarios, territorio y actas

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha 4.8 (numerada **ADR-008** en el documento) |
| Requerimientos relacionados | RF-02, RF-06, RF-08, RF-09, RF-13, RF-20, RNF-04, RNF-07, S-03 |
| Minuto del video | No registrado en el documento grupal |

## 1. Contexto y problema

La app tiene varios formularios; el más importante es la transcripción y edición de actas para dos dignidades (alcaldía y prefectura), cada una con los votos de cinco organizaciones, votos nulos, votos en blanco y total de sufragantes.

Muchos veedores tienen poca experiencia con el celular y cometen errores de digitación. Por eso el formulario debe:
- ser **fluido**;
- permitir **cargar los datos previos** al corregir un acta;
- **bloquear envíos repetidos** mientras se procesa.

## 2. Decisión

Se elige **React Hook Form** para los formularios de creación de usuarios y recintos, el reemplazo de veedores y el registro o corrección de actas.

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **React Hook Form** ✅ | Kevin Amagua | *Ver nota* | *Ver nota* |
| TanStack Form | Oscar Vázquez | Tipado estricto y seguimiento campo por campo, útil en formularios complejos | Más código por campo y menos ejemplos para móviles; para el alcance de la entrega, el costo no compensa |
| Estado local con `useState` por campo | Jairo Maigua | Sin dependencias; directo para formularios de dos o tres campos | Con ocho campos numéricos por dignidad, validaciones y modo de edición, el código se repite y la pantalla se redibuja en cada pulsación |

> **Nota sobre el documento grupal:** en la fila de React Hook Form, las columnas de ventajas y desventajas repiten por error el texto de la ficha ADR-07 (Zustand y TanStack Query). El documento no registra ventajas ni desventajas propias de esta alternativa en esa tabla. Lo que sí dice de React Hook Form está en la decisión y en las consecuencias (abajo).

## 4. Justificación

Según la decisión y las consecuencias registradas:
- mejora la **fluidez** en dispositivos Android de gama media y baja (frente a `useState` por campo, que redibuja en cada pulsación);
- **estandariza** el manejo de errores por campo y el **bloqueo durante el envío**;
- TanStack Form exigía más código del que justificaba el alcance.

## 5. Consecuencias

**Positivas**
- Formularios fluidos, errores por campo uniformes y bloqueo del envío mientras se procesa.

**Negativas**
- Suma una dependencia externa.
- Obliga a envolver los componentes de entrada personalizados con `Controller`.

## 6. Relación con el examen

- **Rúbrica:** «Registro de resultados» (3 pts) y «Retroalimentación visual… en validaciones» (2 pts).
- **RNF-07:** flujos simples y tolerantes a errores para personas mayores.

## 7. Evidencia de implementación

| Qué | Dónde |
|---|---|
| Formulario del acta (un solo formulario para los 4 pasos; precarga al corregir; `isSubmitting` bloquea el botón) | `src/presentation/screens/actas/ActaScreen.tsx` |
| Campos personalizados envueltos con `Controller` | `src/presentation/components/CampoNumero.tsx`, `CampoTexto.tsx` |
| Otros formularios | `NuevaCuentaScreen.tsx` (usuarios y veedor sustituto), `NuevoRecintoScreen.tsx` |
| Unión con Zod (ADR-09) | `@hookform/resolvers` (dependencia auxiliar, `ADR_LINEA_BASE.md` §4.9) |

Sin diferencias con lo acordado.
