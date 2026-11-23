# Línea base de ADR (resumen operativo)

> **Fuente oficial y obligatoria:** [`Documento_Consolidado_ADR.docx`](Documento_Consolidado_ADR.docx), el documento grupal del 22/11/2026 (Jairo Maigua, Oscar Vázquez, Milka Borja y Kevin Amagua). Este archivo lo resume para consultarlo durante el desarrollo; **si hay diferencias, prevalece el documento grupal**.
> **Rúbrica:** no respetar la línea base reduce la nota a la mitad. Toda aclaración o desviación se registra en la sección 4 **antes** de implementarla.

## 1. Requerimientos (resumen)

| Código | Resumen | Dónde se implementa |
|---|---|---|
| RF-01 | Cuentas jerárquicas: provincial → coordinadores de recinto → veedores. Nadie se registra solo | Edge Function `crear-usuario` + registro público desactivado |
| RF-02 | Cédula ecuatoriana (dígito verificador), nombres, apellidos, teléfono y correo válidos. Cambio de clave obligatorio en el primer ingreso | `domain/entities/cedula.ts`, esquemas Zod, Edge Function `cambiar-clave` |
| RF-03 | Verificación del correo con **enlace** de confirmación | Invitación de Supabase Auth (enlace único con expiración) |
| RF-04 | Recuperación de clave por **enlace**, solo para correos verificados | Edge Function `solicitar-recuperacion` + pantalla `restablecer-clave` |
| RF-05 | Datos precargados: recintos de la provincia y el cantón elegidos, 5 organizaciones y sus candidatos por dignidad | `supabase/seed.sql` |
| RF-06 | El coordinador provincial consulta y registra recintos de su jurisdicción | RPC `crear_recinto` |
| RF-07 | Un único coordinador por recinto | Índice único parcial en `perfiles` |
| RF-08 | Un veedor por mesa; un veedor puede cubrir varias mesas | `asignaciones_mesa` + índice único parcial |
| RF-09 | El veedor registra las actas de alcaldía y prefectura de sus mesas | Formulario de acta (RHF + Zod) |
| RF-10 / RF-19 | Validación matemática **bloqueante**: sin negativos, ningún candidato > sufragantes, válidos + blancos + nulos = sufragantes | `domain/entities/Acta.ts` (cliente) y RPC `sincronizar_acta` (servidor) |
| RF-11 | Foto del acta con vista previa y advertencia si no es legible | Expo Camera + análisis de nitidez |
| RF-12 | Ubicación GPS de la captura | Expo Location (varias lecturas, se conserva la más precisa) |
| RF-13 | El veedor edita las actas de sus mesas; el coordinador de recinto, cualquier acta de su recinto | `privado.puede_editar_mesa` (RLS/RPC) |
| RF-14 | Estado de cada acta: en proceso, enviada o fallida | Outbox en SQLite |
| RF-15 | Avance para el coordinador provincial: mesas reportadas/faltantes, conteo por candidato y ubicación de cada acta | Dashboard + Realtime + mapa OSM |
| RF-16 | Registro y edición sin conexión; envío automático al recuperar la red | SQLite + NetInfo + outbox |
| RF-17 | Registro automático de cierres y errores, con contexto del dispositivo; envío diferido sin red | Sentry |
| RF-18 | Visualización y edición restringidas por rol y ámbito | RLS |
| RF-20 | Reasignar al instante las mesas de un veedor ausente o crear un veedor sustituto | RPC `asignar_mesa` + `crear-usuario` |
| RNF-01 | React Native, APK Android | Expo SDK 57 + EAS Build |
| RNF-02 | Credenciales y datos protegidos con cifrado y autenticación segura | Supabase Auth (HTTPS) + Secure Store |
| RNF-03 | Registro/consulta offline; monitoreo con modelo, versión de Android y pantalla | SQLite + Sentry |
| RNF-04 | Persistencia local tras cerrar la app o reiniciar; sin duplicados | SQLite + UUID + upsert idempotente |
| RNF-05 | Clean Architecture y respeto de la línea base | 3 capas (ver sección 3) |
| RNF-06 | Colores de la organización y retroalimentación con Lottie y Reanimated, sin modales genéricos | Sistema de diseño |
| RNF-07 | Flujos simples y tolerantes a errores para personas mayores | Sistema de diseño |
| RNF-08 | Documentar las decisiones antes de instalar dependencias | Este archivo y `docs/adr/` |

### Supuestos adoptados

| Código | Supuesto |
|---|---|
| S-01 | Hay un único coordinador provincial, precargado (seed); es la raíz de la jerarquía |
| S-02 | Una mesa está **reportada** con sus 2 actas (alcaldía y prefectura); con una sola, **parcialmente reportada** |
| S-03 | La validación matemática **bloquea** el guardado |
| S-04 | Cada acta tiene versión e historial. Si dos dispositivos la modifican antes de sincronizar, se conservan ambas versiones y se notifica al **coordinador de recinto**, que decide cuál prevalece |
| S-05 | Al reasignar una mesa, el veedor anterior pierde el acceso de inmediato; las actas ya registradas se conservan con su historial |
| S-06 | El GPS es **obligatorio** para guardar el acta. No hay geocerca bloqueante: el coordinador ve el punto en el mapa y una **alerta visual si supera 300 m** del recinto |

## 2. Decisiones técnicas (ADR del documento grupal)

| ADR | Decisión |
|---|---|
| ADR-01 | **Supabase Auth.** Cuentas creadas por API (sin registro público). La **clave temporal se controla con una bandera en los metadatos** que la app verifica en el primer ingreso. Aislamiento por rol y recinto con RLS |
| ADR-02 | **Supabase + SMTP personalizado** para la verificación de correo y la recuperación de clave con **enlaces** de uso único y con expiración. Las credenciales SMTP solo están en la configuración del servicio |
| ADR-03 | **SQLite (expo-sqlite)** como fuente de verdad local de las actas, con outbox e identificador del cliente. La foto es un archivo local cuya ruta se guarda en la BD; el dato local no se borra hasta que el servidor confirma. Versión por acta; conflictos conservados |
| ADR-04 | **Expo Camera + Expo Location.** Foto tomada dentro de la app (no de la galería), con medición de nitidez que **impide continuar** si está borrosa. Varias lecturas de GPS y se conserva la más precisa |
| ADR-05 | **Sentry** (SDK de React Native): errores nativos y de JS, rastro de pantallas, modelo y versión de Android, eventos guardados sin red. Se eliminan cédulas, nombres, teléfonos y correos de los reportes |
| ADR-06 | **Expo Router.** Rutas separadas por rol y redirección inicial según sesión, rol y cambio de la clave temporal. El código de Clean Architecture vive fuera de `app/` |
| ADR-07 | **Zustand** (sesión, rol, conexión, cola offline) + **TanStack Query** (datos del servidor) + **Supabase Realtime** (avance y conteo en vivo). Las suscripciones se encapsulan detrás de repositorios y se cierran al cerrar la sesión |
| ADR-08 | **React Hook Form** para los formularios de usuarios, recintos, reemplazo de veedores y actas |
| ADR-09 | **Zod** para centralizar la validación de cédulas, correos y coherencia numérica de las actas, desacoplada de la UI |
| ADR-10 | **@react-native-community/netinfo** + cola transaccional en expo-sqlite + UUID idempotente por acta/operación. Control de concurrencia para que dos disparos no procesen el mismo elemento |
| ADR-11 | **PostgreSQL en Supabase** con tablas relacionales (recintos, mesas, usuarios, asignaciones, actas, organizaciones, candidatos, votos), **RLS** y unicidad mesa + dignidad. El provincial **lee** su jurisdicción pero **no modifica actas**. La reasignación revoca el acceso anterior y conserva el historial |

## 3. Stack resultante

| Área | Tecnología |
|---|---|
| Plataforma | React Native 0.86 + Expo **SDK 57** (requisito obligatorio, ver 4.7), APK Android con EAS Build |
| Arquitectura | Clean Architecture con tres capas: `domain`, `data` y `presentation`. Rutas en `app/` (raíz) |
| Backend | Supabase: PostgreSQL, Auth, Storage, Realtime y Edge Functions |
| Persistencia local | expo-sqlite (actas y outbox) + expo-file-system (fotos) + expo-secure-store (sesión) |
| Conectividad | @react-native-community/netinfo |
| Estado | Zustand + TanStack Query |
| Formularios y validación | React Hook Form + Zod |
| Evidencia | expo-camera + expo-image-manipulator + expo-location |
| Mapas | OpenStreetMap (ver ADR-C02) |
| Monitoreo | Sentry |
| Animaciones | Lottie + Reanimated |

## 4. Registro de aclaraciones y desviaciones

Los ADR complementarios (decisiones de implementación posteriores, que no cambian lo acordado) se guardan en `docs/adr/` con el prefijo `ADR-C`.

| # | Tema | Situación | Estado |
|---|---|---|---|
| 4.1 | Navegación | Expo Router incluye internamente React Navigation; no se instala un segundo sistema. Coincide con ADR-06 | ✅ [ADR-C01](adr/ADR-C01-navegacion-expo-router.md) |
| 4.2 | Iconografía | `expo-symbols` (incluido en el SDK) | Informativo |
| 4.3 | Sesión provisional | `SessionPreviewContext` (`__DEV__`) **eliminado** al implementar la autenticación real | ✅ Resuelto |
| 4.4 | Librería de mapas OSM | `react-native-webview` + Leaflet con teselas de OpenStreetMap | ✅ [ADR-C02](adr/ADR-C02-implementacion-adr-grupal.md) |
| 4.5 | Organización de capas | Solo tres capas. DI en `src/data/di/container.ts`; constantes en `src/domain/constants.ts` | ✅ Decisión del equipo |
| 4.6 | Variables de entorno | Un único `.env` en la raíz; lectura en `src/data/datasources/remote/` | ✅ Decisión del equipo |
| 4.7 | Versión de Expo | **SDK 57 obligatorio.** Costo conocido: 3 vulnerabilidades *high* (DoS en `decode-uri-component`), corregidas solo en SDK 58; impacto bajo | ✅ Requisito |
| 4.8 | Alineación con el documento grupal | Cambios respecto de la línea base anterior: umbral GPS **500 → 300 m** y GPS obligatorio (S-06); recuperación por **enlace** en vez de OTP (ADR-02); bandera de clave temporal en `app_metadata` en vez de una columna (ADR-01); se agregan React Hook Form y Zod (ADR-08/09); el provincial no edita actas (ADR-11) | ✅ [ADR-C02](adr/ADR-C02-implementacion-adr-grupal.md) |
| 4.9 | Dependencias auxiliares | `@hookform/resolvers` (une ADR-08 y ADR-09), `expo-crypto` (UUID, ADR-10) y `jpeg-js` (medición de nitidez, ADR-04). No reemplazan ninguna tecnología acordada | ✅ [ADR-C02](adr/ADR-C02-implementacion-adr-grupal.md) |
