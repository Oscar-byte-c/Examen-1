# ADR-02: Supabase + SMTP personalizado para la creación de cuentas, la verificación del correo y la recuperación de la clave

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha ADR-02 |
| Requerimientos relacionados | RF-01, RF-03, RF-04, RNF-02 |
| Minuto del video | No registrado en el documento grupal |

## 1. Contexto y problema

- Nadie se registra por su cuenta: el coordinador provincial crea las cuentas de los coordinadores de recinto y estos las de sus veedores.
- Como otra persona crea la cuenta, el titular todavía no demostró que el correo es suyo. El correo es el único medio confiable de comunicación, así que hay que confirmar que **existe y le pertenece** antes de permitir el ingreso.
- Los enlaces de verificación y recuperación deben ser **únicos, con expiración y de un solo uso**, para que terceros no cambien credenciales ajenas.
- La recuperación solo debe estar disponible para **correos ya verificados**; si no, cualquiera podría intentar tomar una cuenta ajena.
- Muchos veedores no dominan la tecnología: sin recuperación autónoma, el coordinador provincial pasa horas en llamadas.

## 2. Decisión

Se elige **Supabase con SMTP personalizado**:

- Supabase genera enlaces de **uso único** y con **tiempo de vida limitado**.
- La verificación se completa **antes** de permitir el ingreso.
- La recuperación solo se ofrece para un **correo ya verificado**.
- El SMTP propio envía los correos desde el dominio de la organización, con **plantillas en español**.
- Con el registro público deshabilitado (ADR-01), el correo de verificación solo se dispara al **crear la cuenta desde el servidor**.
- Las credenciales del SMTP se guardan en la configuración del servicio, **nunca en la app** (RNF-02).

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **Supabase + SMTP personalizado** ✅ | Jairo Maigua | Envía los correos de verificación y recuperación sin código extra; tokens de uso único con límite de vida | Plantilla poco personalizable. Hay que validar que el flujo del correo no entre en conflicto con la clave temporal |
| Firebase Authentication | Kevin Amagua | Autenticación y herramientas (Firestore, Cloud Storage) que funcionan bien con React Native | Al ser NoSQL, las consultas relacionales que requiere el sistema son más complejas e incómodas |

## 4. Justificación

- Los enlaces únicos y con expiración vienen **resueltos por el servicio**: no hay que programar tokens propios.
- Cumple la condición del enunciado de que cada persona **recupere su acceso sin depender de nadie**.
- La identidad del remitente y las plantillas en español generan confianza en usuarios con poca experiencia.

## 5. Consecuencias

**Positivas**
- Flujo de verificación y recuperación probado, sin código propio de tokens.
- La sesión del coordinador **no se interrumpe** al crear cuentas, porque la creación ocurre en el servidor.
- El flujo es fácil de explicar en la sustentación.

**Negativas**
- Requiere más código y, por tanto, más pruebas.
- El enlace puede fallar si el esquema del simulador (Expo Go) no es el mismo que el del APK.
- El correo puede caer en **SPAM**.
- Los correos **no se envían sin conexión**.

## 6. Relación con el examen

- **Rúbrica:** «Acceso de los usuarios» (1,6 pts).
- **Enunciado:** «necesitamos tener la certeza de que [el correo] es real y de que le pertenece» y «que cada persona pueda recuperar su acceso sin depender de nadie».

## 7. Evidencia de implementación

| Qué | Dónde |
|---|---|
| Alta y envío del enlace de verificación | `supabase/functions/crear-usuario` (crea la cuenta y **al final** invita; ver `ADR-C02` §2) |
| Recuperación solo para correos verificados, con respuesta genérica | `supabase/functions/solicitar-recuperacion` + RPC `public.correo_verificado` |
| Pantallas | `app/correo-verificado.tsx`, `app/recuperar-clave.tsx`, `app/restablecer-clave.tsx` |
| Esquema del enlace | `controlelectoral://` en el APK; `exp://` solo en pruebas con `PERMITIR_EXPO_GO` |

**Diferencias y pendientes respecto de lo acordado**
- **SMTP personalizado:** se configura en el panel de Supabase, no en el código. No hay registro en el repositorio de que esté configurado; debe comprobarse antes de la entrega.
- **Aclaración aceptada:** la línea base anterior usaba un código OTP; se cambió a **enlace** para cumplir este ADR (`ADR_LINEA_BASE.md` §4.8).
- La consecuencia negativa sobre el esquema del simulador se confirmó en las pruebas: fue necesario registrar la URL `exp://…` en Supabase (`CONTEXTO_PROYECTO.md`, 23/11).
