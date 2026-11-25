# ADR-01: Supabase Auth para la autenticación y la gestión de credenciales

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha ADR-01 |
| Requerimientos relacionados | RF-01, RF-02, RF-03, RF-04, RNF-02, S-01 |
| Minuto del video | No registrado en el documento grupal |

## 1. Contexto y problema

La aplicación tiene tres roles (coordinador provincial, coordinador de recinto y veedor). Según el enunciado, las cuentas se crean en orden jerárquico: nadie se registra por su cuenta. Cada usuario debe poder verificar su correo, restablecer su contraseña y recuperar el acceso sin depender de un coordinador ni de un técnico externo.

Además, en elecciones pasadas se ingresaron cédulas mal digitadas y no se pudo saber quién había reportado ciertas actas. Por eso es indispensable validar que la cédula tenga el formato ecuatoriano.

## 2. Decisión

Se elige **Supabase Auth** como servicio de autenticación:

- Las cuentas se crean **mediante una API**, de modo que ningún usuario puede registrarse solo.
- La **clave temporal** se controla con un indicador (bandera) en los **metadatos** del usuario, que la app verifica en el primer ingreso.
- Se aprovecha **RLS** (Row Level Security) para aislar los datos por rol y por recinto.

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **Supabase Auth** ✅ | Jairo Maigua | Maneja contraseñas de forma eficiente, sesiones con tokens, confirmación de correo y recuperación con enlaces únicos. Facilita implementar RLS. Incluye PostgreSQL | Dependencia de un proveedor externo. Las reglas de negocio deben implementarse fuera del servicio |
| Firebase Authentication | Oscar Vázquez | SDK compatible con React Native; verificación de correo y recuperación de contraseña integradas | No tiene RLS: la autorización por recinto debe resolverse con reglas aparte. Crear cuentas requiere un SDK de administración en un servidor |
| Appwrite | Kevin Amagua y Milka Borja | Integra autenticación, base de datos y almacenamiento en una plataforma *self-hosted* que funciona como backend propio | Exige administrar la plataforma (el texto del documento grupal está incompleto en este punto). Menor soporte con React Native. Menos práctico para consultas relacionales que Supabase |

## 4. Justificación

- Su cifrado y su manejo de tokens permiten desarrollar la app **sin riesgo de quedarse corto de tiempo**.
- La creación por API cumple la regla de que **nadie entra sin que la organización lo habilite** (RF-01).
- La bandera en los metadatos resuelve que **solo el titular conozca su clave definitiva** (RF-02).
- RLS permite el **aislamiento por rol y recinto** que piden los requerimientos de confidencialidad, algo que Firebase no ofrece de forma nativa.

## 5. Consecuencias

**Positivas**
- Gestión de contraseñas y tokens más robusta.
- Menos código propio expuesto a errores en la app.

**Negativas**
- El correo integrado de Supabase tiene límites, por lo que se requiere un **SMTP propio** (ver ADR-02).
- Hay que configurar correctamente las **URL de redirección**.

## 6. Relación con el examen

- **Rúbrica:** «Acceso de los usuarios» (1,6 pts) y la seguridad que exige la confidencialidad.
- **Enunciado, sección «Acceso de los usuarios»:** creación de accesos por otra persona, clave que solo conoce el titular y recuperación sin depender de nadie.

## 7. Evidencia de implementación

| Qué | Dónde |
|---|---|
| Alta de cuentas por API (sin registro público) | Edge Function `supabase/functions/crear-usuario` |
| Bandera de clave temporal | `app_metadata.debe_cambiar_clave`: la escribe `crear-usuario` y la borra `supabase/functions/cambiar-clave` |
| La bandera también bloquea datos en el servidor | `privado.mi_rol()` y `privado.clave_definitiva()` en `supabase/migrations/20261122120000_territorio_actas.sql` |
| Validación de la cédula ecuatoriana | `src/domain/entities/cedula.ts` (dígito verificador, módulo 10) |
| Sesión segura en el teléfono | `src/data/datasources/local/secureStoreAdapter.ts` (Secure Store) |
| Prueba en el servidor | `supabase/tests/verificar-rls.mjs`: «Registro público deshabilitado» |

**Aclaración registrada (no cambia la decisión):** el documento dice «metadatos» sin precisar cuáles. Se usa `app_metadata` porque el usuario no puede modificarla desde la app (`user_metadata` sí). Ver `ADR-C02` §1 y `ADR_LINEA_BASE.md` §4.8.
