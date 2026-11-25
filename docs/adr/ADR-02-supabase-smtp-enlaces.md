# ADR-02: Usar Supabase con SMTP personalizado para verificar el correo y recuperar la clave por enlace

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha ADR-02).

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-01:** las cuentas las crean terceros, no el titular.
- **RF-03:** el correo debe verificarse con un enlace.
- **RF-04:** la clave se recupera por enlace, solo para correos verificados.
- **RNF-02:** las credenciales del SMTP no pueden estar en la app.

## Contexto
Como la cuenta la crea otra persona, el titular todavía no demostró que el correo es suyo. Para la organización el correo es el único medio confiable de contacto, así que hay que confirmar que existe y le pertenece **antes** de permitir el ingreso.

Los enlaces de verificación y de recuperación deben ser únicos, de un solo uso y con fecha de vencimiento. Si no, un tercero podría reutilizarlos para cambiar una credencial ajena. Además, la recuperación solo debe ofrecerse a correos ya verificados; de lo contrario, alguien podría pedir el enlace de una cuenta que no es suya. Por último, muchos veedores no se manejan bien con la tecnología: si la recuperación no es autónoma, terminan llamando al coordinador provincial.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Supabase + SMTP personalizado** (propuesta por Jairo Maigua) | Supabase envía la verificación y la recuperación sin código extra. Sus tokens son de un solo uso y vencen solos. Con un SMTP propio los correos salen de la organización y en español. | La plantilla es poco personalizable. Hay que validar que el flujo del correo no choque con la clave temporal. |
| Firebase Authentication (propuesta por Kevin Amagua) | Autenticación, Firestore y Cloud Storage funcionan bien con React Native. | Al ser NoSQL, las consultas relacionales que necesita el sistema (recinto → mesa → acta) son más complejas e incómodas. |

## Decisión
Se usa **Supabase con SMTP personalizado**. Supabase genera enlaces de un solo uso con tiempo de vida limitado; la verificación se completa antes de permitir el ingreso y la recuperación solo se ofrece a correos verificados. Con el registro público deshabilitado (ADR-01), el correo de verificación solo se envía cuando la cuenta se crea desde el servidor. Las credenciales del SMTP se guardan en la configuración del servicio, nunca en la app.

## Consecuencias
- **Sin tokens propios:** no hubo que programar ni guardar códigos.
- **Enlace en lugar de OTP:** reemplazó al código OTP de la línea base anterior (ADR_LINEA_BASE §4.8).
- **Orden del alta:** la cuenta se crea primero (con la clave temporal) y la invitación se envía al final. Así lo hace `crear-usuario` (ADR-C02 §2) porque, en Supabase Auth, asignar una clave después de invitar invalida el enlace; ese error apareció en las pruebas del 22/11 (`otp_expired`).
- **Recuperación sin revelar cuentas:** la Edge Function `solicitar-recuperacion` solo envía el enlace si el correo existe y está verificado, consultado con la RPC `public.correo_verificado`, que solo puede ejecutar la `service_role`. Siempre responde el mismo mensaje y tarda 1,5 s, para no revelar qué correos existen.
- **Configuración fuera del código:** el SMTP (Gmail), las plantillas y las *Redirect URLs* se configuran en el panel de Supabase. El repositorio no lo demuestra; hay que comprobarlo en el servicio.
- **Pantallas:** la recuperación se pide en `app/recuperar-clave.tsx`.
- **El enlace abre la app:** el esquema `controlelectoral://` abre las pantallas `app/correo-verificado.tsx` y `app/restablecer-clave.tsx`. Si la *Redirect URL* está mal, el enlace termina en el navegador; pasó en Expo Go el 23/11 con `exp://`, registrado en `CONTEXTO_PROYECTO.md`. Antes de entregar hay que quitar el secreto `PERMITIR_EXPO_GO` y la URL `exp://` del panel.
- **Limitaciones:** el correo puede llegar a spam, el SMTP gratuito tiene cuotas y sin internet no se envían correos.

## Verificación
- **Manual:** el estudiante comprobó la recuperación por enlace y la llegada del correo SMTP (Gmail) **en el APK**. No hay registro adjunto.
- **Automática:** no hay pruebas automáticas de este flujo.
- **Pendiente:**
  - un enlace vencido o ya usado debe rechazarse;
  - un correo no verificado o inexistente debe recibir la misma respuesta genérica.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, después del consenso del 22/11.
- **ChatGPT** estuvo de acuerdo, condicionado a la configuración. Pidió separar lo que está en el panel de Supabase de lo versionado en el código y probar enlaces vencidos, reutilizados y de correos no verificados o inexistentes. Propuso como alternativa los tokens y correos propios, pero la desaconsejó.
- **Gemini** la aprobó con alertas operativas. Señaló que en Android el mayor riesgo es que el enlace abierto desde Gmail termine en el navegador y no en la app. Pidió documentar el vencimiento de los enlaces y las cuotas del SMTP.
- **Claude**, que participó en la redacción de estos ADR (no es un revisor independiente), confirmó en `solicitar-recuperacion` la respuesta genérica y el tiempo constante. También recordó que el problema de redirección de Gemini ya ocurrió en Expo Go.

Las tres coincidieron con la decisión.
- **Se aceptaron:** separar la configuración del código y el riesgo de los enlaces en Android, ambos en «Consecuencias», y las pruebas de enlaces vencidos o reutilizados, como pendiente.
- **Se descartó:** la alternativa de tokens propios, que ninguna recomendó.
