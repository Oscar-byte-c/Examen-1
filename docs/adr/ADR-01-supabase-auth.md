# ADR-01: Usar Supabase Auth para la autenticación y la gestión de credenciales

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha ADR-01).

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-01:** solo entran las cuentas creadas por la organización, en orden jerárquico.
- **RF-02:** datos válidos (cédula con dígito verificador) y cambio obligatorio de la clave en el primer ingreso.
- **RF-03 y RF-04:** verificación del correo y recuperación de la clave.
- **RNF-02:** credenciales protegidas.
- **S-01:** el coordinador provincial viene precargado.

## Contexto
La app tiene tres roles: coordinador provincial, coordinador de recinto y veedor. Según el enunciado, nadie se registra por su cuenta: el provincial crea a los coordinadores de recinto y estos crean a sus veedores. Como otra persona crea la cuenta, esa persona conoce la clave inicial; por eso el titular debe cambiarla al entrar por primera vez, y desde entonces solo él la conoce. Cada usuario también debe poder recuperar su acceso sin llamar al coordinador provincial, que en la elección anterior pasó horas resolviendo claves olvidadas.

Además, la decisión condiciona la confidencialidad del sistema completo: lo que vea cada usuario depende de saber quién es y qué rol tiene. Sin un proveedor de identidad confiable habría que programar desde cero el almacenamiento de contraseñas, las sesiones y los enlaces de recuperación, que es justo el código donde un error expone cuentas.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Supabase Auth** (propuesta por Jairo Maigua) | Maneja contraseñas, sesiones con tokens, confirmación de correo y recuperación con enlaces únicos. Está en el mismo servicio que la base PostgreSQL, así que el usuario autenticado se puede usar directamente en las políticas RLS para aislar los datos por rol y recinto. | Depende de un proveedor externo. Las reglas de negocio (quién puede crear a quién) no las resuelve el servicio: hay que implementarlas aparte. |
| Firebase Authentication (propuesta por Oscar Vázquez) | SDK compatible con React Native; verificación de correo y recuperación de clave integradas. | No tiene RLS: el aislamiento por recinto habría que resolverlo con reglas propias. Crear cuentas para otras personas requiere el SDK de administración en un servidor. |
| Appwrite (propuesta por Kevin Amagua y Milka Borja) | Reúne autenticación, base de datos y almacenamiento en una plataforma *self-hosted* que funciona como backend propio. | Hay que administrar la plataforma (el texto del documento grupal quedó incompleto en este punto). Tiene menor soporte para React Native y es menos práctica para las consultas relacionales que necesita el sistema. |

## Decisión
Se usa **Supabase Auth**. Las cuentas se crean mediante una API del servidor, de modo que nadie puede registrarse solo. La clave temporal se controla con una bandera en los metadatos que la app revisa en el primer ingreso. Supabase se eligió porque su manejo de contraseñas y tokens permitía terminar a tiempo sin escribir código propio de seguridad, y porque su integración con RLS permite que el servidor, y no la pantalla, decida qué datos ve cada rol.

## Consecuencias
- **Separación de responsabilidades:** Supabase Auth **autentica** (quién es el usuario); la **autorización** (qué puede ver o hacer) la imponen las políticas RLS y las Edge Functions (ADR-11).
- **La bandera vive en `app_metadata`:** el `.docx` dice «metadatos». Supabase tiene dos: `user_metadata`, que el propio usuario puede cambiar desde la app, y `app_metadata`, que solo escribe el servidor. Se usa `app_metadata.debe_cambiar_clave` (ADR-C02 §1; ADR_LINEA_BASE §4.8).
- **Alta de cuentas en el servidor:** la Edge Function `crear-usuario` verifica el rol de quien llama, valida cédula, nombres, teléfono y correo, crea la cuenta con la bandera activa e inserta el perfil. La `service_role` solo existe en las Edge Functions, nunca en la app ni en el repositorio.
- **Cambio de clave:** la Edge Function `cambiar-clave` cambia la clave con privilegios de servidor y borra la bandera.
- **La bandera también bloquea datos** (migración `20261122120000_territorio_actas.sql`): `privado.clave_definitiva()` lee la bandera y, mientras está activa, `privado.mi_rol()` devuelve nulo y la RLS no entrega información, aunque alguien use la API sin la app. Como la bandera se lee del token, después de cambiar la clave la app vuelve a iniciar sesión para obtener un token nuevo.
- **Desactivar un usuario es inmediato para los datos:** `privado.mi_rol()` revisa en cada consulta que el perfil esté activo y que el correo esté confirmado.
- **Responsabilidades derivadas:** el correo de verificación y recuperación necesita un SMTP propio (ADR-02); la sesión se guarda cifrada en Secure Store (`secureStoreAdapter.ts`), no en AsyncStorage; la validación de la cédula es una regla de dominio (`src/domain/entities/cedula.ts`, ADR-09).
- **Riesgo:** si se filtrara la `service_role`, se saltaría la RLS. Por eso solo vive en el entorno de las Edge Functions.

## Verificación
- **Automática:**
  - `reglas.test.ts`: cédula ecuatoriana y esquemas de usuario.
  - `sesionLocal.test.ts` (7 pruebas): identidad de la sesión guardada sin red.
  - `AuthRepositoryImpl.cambiarClave.test.ts` (3 pruebas): la app no muestra un error falso cuando la clave sí cambió.
- **Servidor:** `supabase/tests/verificar-rls.mjs` comprueba que el registro público está deshabilitado y que ningún rol puede cambiar su propio rol. Dio 27/27 el 22/11, según `CONTEXTO_PROYECTO.md`, sin log adjunto.
- **Pendiente:**
  - iniciar sesión con los 3 roles en el teléfono;
  - consultar la API directamente con un usuario que aún tiene la clave temporal y comprobar que no recibe datos.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, **después** del consenso del 22/11, y no formó parte de la decisión.
- **ChatGPT** estuvo de acuerdo con precisiones. Recomendó separar autenticación de autorización, completar la desventaja de Appwrite, documentar la validación del JWT en las Edge Functions y agregar pruebas negativas con la clave temporal.
- **Gemini** la aprobó con reservas. Advirtió que un JWT dura una hora y que un usuario desactivado podría seguir entrando si solo se confía en el token. Pidió un diagrama de secuencia del alta y pruebas negativas contra la API.
- **Claude**, que participó en la redacción de estos ADR y conoció las dos evaluaciones anteriores (no es un revisor independiente), revisó el código:
  - `crear-usuario` sí valida el rol de quien llama.
  - El riesgo del JWT que señala Gemini no aplica a los datos, porque la RLS consulta `perfiles.activo` en cada petición.

Las tres coincidieron con la decisión del equipo.
- **Se aceptaron:** separar autenticación y autorización, que quedó en «Consecuencias», y la prueba negativa con la clave temporal, que quedó como pendiente.
- **No se incorporó:** el diagrama de secuencia, por falta de tiempo; queda como mejora.
- **Se descartó:** ampliar la vigencia del token como problema, porque el código ya lo mitiga para los datos.
