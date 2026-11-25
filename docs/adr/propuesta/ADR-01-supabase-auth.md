# ADR-01: Supabase Auth para la autenticación y las credenciales

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-01, RF-02, RF-03, RF-04, RNF-02, S-01 | `Documento_Consolidado_ADR.docx`, ficha ADR-01 |

## 1. Problema y contexto
Hay tres roles y las cuentas se crean en orden jerárquico: el provincial crea coordinadores y estos crean veedores; nadie se registra solo. Cada persona debe verificar su correo y recuperar su clave sin ayuda. Además, en elecciones pasadas hubo cédulas mal digitadas.

## 2. Objetivo
Autenticación segura sin registro público, con clave temporal obligatoria en el primer ingreso y preparada para aislar los datos por rol y recinto.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **Supabase Auth** ✅ | Jairo Maigua | Contraseñas y sesiones con tokens; confirmación y recuperación con enlaces únicos; facilita RLS; incluye PostgreSQL | Proveedor externo; reglas de negocio fuera del servicio | — (elegida) |
| Firebase Authentication | Oscar Vázquez | SDK para React Native; verificación y recuperación integradas | Sin RLS: el aislamiento por recinto va aparte; crear cuentas requiere un SDK admin en un servidor | El aislamiento por recinto habría sido código propio |
| Appwrite | Kevin Amagua y Milka Borja | Auth, base y almacenamiento en una plataforma *self-hosted* | Exige administrarla (texto incompleto en el `.docx`); menos soporte en React Native; menos práctico para consultas relacionales | Más operación y menos apoyo para el plazo |

## 4. Decisión y justificación
Supabase Auth: las cuentas se crean por API, sin registro público; la clave temporal se controla con una bandera en los metadatos y la RLS aísla los datos por rol y recinto. Se eligió porque su manejo de tokens evita quedarse corto de tiempo y porque la RLS resuelve la confidencialidad en el servidor.
> **Nota de precisión (25/11/2026):** Auth **autentica** (quién eres); la **autorización** (qué puedes ver o hacer) la hacen la RLS y las Edge Functions. La bandera vive en `app_metadata`, que el usuario no puede modificar (ADR-C02 §1).

## 5. Implementación real
- Edge Function `supabase/functions/crear-usuario`: verifica el rol de quien llama, valida los datos, crea la cuenta con `debe_cambiar_clave: true` y al final envía la invitación.
- Edge Function `cambiar-clave`: cambia la clave y borra la bandera.
- Migración `20261122120000_territorio_actas.sql`: `privado.mi_rol()` lee `perfiles` (rol y `activo`) **en cada consulta**; `privado.clave_definitiva()` lee la bandera del JWT.
- Cliente: `src/domain/entities/cedula.ts` y `Usuario.ts` (validación); `secureStoreAdapter.ts` (sesión cifrada en Secure Store).

## 6. Consecuencias
✔ Menos código propio de seguridad; tokens y contraseñas gestionados por el proveedor.
✘ Dependencia de Supabase; hace falta un SMTP propio (ADR-02) y configurar las URL de redirección.

## 7. Riesgos y limitaciones
- La `service_role` solo debe existir en las Edge Functions; si se filtra, salta la RLS.
- La bandera de clave temporal sale del token: tras cambiar la clave, la app vuelve a iniciar sesión para obtener un token nuevo.
- Desactivar a un usuario corta sus datos **de inmediato**, porque `mi_rol()` revisa `perfiles.activo` en cada consulta, aunque su token siga vigente.

## 8. Pruebas y evidencias
- ✅ Automatizadas: `reglas.test.ts` (cédula y esquemas de usuario) · `sesionLocal.test.ts` (7) · `AuthRepositoryImpl.cambiarClave.test.ts` (3).
- ✅ Servidor: `verificar-rls.mjs` «registro público deshabilitado», dentro de los 27/27 del 22/11 (registrado en `CONTEXTO_PROYECTO.md`, sin log adjunto).
- ⏳ Pendiente: ingreso con los 3 roles en el teléfono; consulta directa a la API con un usuario que aún tiene la clave temporal.

## 9. Evaluación de las IA (revisión posterior del 25/11, no el debate original)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | De acuerdo con precisiones | Separar autenticación de autorización; completar la desventaja de Appwrite; documentar la validación del JWT en las Edge Functions |
| Gemini | Aprobado con reservas | El JWT dura 1 h: un usuario desactivado podría seguir entrando si solo se confía en el token; pide pruebas negativas con clave temporal |
| Claude* | De acuerdo | Verificó en el código que `mi_rol()` revisa `perfiles.activo` en cada consulta: el riesgo que señala Gemini **ya está mitigado** para los datos |

- **Acuerdo:** mantener Supabase Auth; la seguridad real está en el servidor.
- **Se incorpora:** separar autenticación y autorización; prueba negativa con clave temporal (pendiente).
- **Se matiza:** la advertencia de Gemini sobre el JWT no aplica a los datos, porque el rol y `activo` se consultan en cada petición.
- **Alternativas señaladas por las IA:** ninguna nueva.

\* Claude redactó estos ADR y conoció las evaluaciones de ChatGPT y Gemini antes de opinar: **no es una revisión independiente**. Su aporte es contrastar las afirmaciones con el código.

## 10. Conclusión y preguntas de defensa
**Conclusión:** la decisión del grupo se mantiene; las tres revisiones coinciden y no hay un argumento técnico para cambiarla.
- **¿Por qué no Firebase?** Porque no tiene RLS: el aislamiento por recinto habría sido código nuestro. Con Supabase lo hace la base de datos.
- **¿Qué impide que alguien se registre solo?** El registro público está desactivado; solo se crean cuentas con la Edge Function `crear-usuario`, que revisa el rol de quien crea.
- **¿Cómo obligan a cambiar la clave?** Con la bandera `debe_cambiar_clave` en `app_metadata`: mientras sea verdadera, la app solo deja cambiar la clave y la RLS no entrega datos.
- **Si desactivo a alguien, ¿sigue viendo datos con su token?** No: la RLS revisa en cada consulta si su perfil está activo.
