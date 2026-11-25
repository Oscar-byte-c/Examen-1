# Decisiones arquitectónicas del trabajo grupal (ADR consolidados)

> **Proyecto:** Control Electoral para Organización Política · Examen I · Desarrollo de Aplicaciones Móviles
> **Equipo:** Jairo Maigua, Oscar Vázquez, Milka Borja y Kevin Amagua · **Reunión de consenso:** 22/11/2026
> **Fuente oficial:** [`Documento_Consolidado_ADR.docx`](Documento_Consolidado_ADR.docx). Si hay diferencias, **prevalece el documento grupal**.

## 1. Introducción y objetivo

Este documento reúne, en un solo lugar y de forma ordenada, las **11 decisiones técnicas (ADR) que el equipo acordó por consenso**. Sirve para:

- entregar el proyecto con sus decisiones documentadas (RNF-08);
- estudiar y defender cada decisión ante el docente;
- comprobar que la implementación **respeta la línea base** (no hacerlo reduce la nota a la mitad).

No agrega ni cambia decisiones. Cada ADR tiene su ficha completa en `docs/adr/` (alternativas con autoría, consecuencias y evidencia en el código). Las aclaraciones de implementación aceptadas están en [`ADR_LINEA_BASE.md`](ADR_LINEA_BASE.md) §4 y en [`ADR-C02`](adr/ADR-C02-implementacion-adr-grupal.md).

## 2. Contexto general

Una organización política de Ecuador necesita una app Android para el día de las elecciones. Hay **tres roles**: el coordinador provincial dirige el proceso, un coordinador por recinto responde por su recinto y los veedores presencian el conteo en las mesas. Cada mesa genera **dos actas** (alcaldía y prefectura) con los votos de cinco organizaciones, los nulos, los blancos y el total de sufragantes.

Los problemas que la organización vivió en procesos anteriores guían todas las decisiones:

| Problema vivido | Decisiones que lo atacan |
|---|---|
| Usuarios incapaces de registrarse solos; cédulas mal digitadas; claves olvidadas | ADR-01, ADR-02, ADR-09 |
| Actas con números imposibles | ADR-08, ADR-09, ADR-11 |
| Fotos borrosas y acusaciones de fotos tomadas fuera del recinto | ADR-04 |
| Sin señal en recintos rurales: actas perdidas y registros duplicados | ADR-03, ADR-10 |
| Información de mesas que llegó a personas no autorizadas | ADR-01, ADR-11 |
| Seguimiento en vivo del escrutinio («exit poll») | ADR-07, ADR-11 |
| App que se cerraba sola sin que nadie supiera por qué | ADR-05 |
| Usuarios mayores o con poca experiencia | ADR-06, ADR-08 |

Supuestos del equipo que condicionan las decisiones: **S-01** provincial precargado · **S-02** mesa reportada con sus 2 actas · **S-03** validación matemática bloqueante · **S-04** conflictos: se conservan ambas versiones y decide el coordinador de recinto · **S-05** al reasignar, el veedor anterior pierde el acceso · **S-06** GPS obligatorio y alerta visual a más de 300 m, sin geocerca bloqueante.

## 3. Lista de ADR seleccionados

| ADR | Decisión | Propuesta elegida de | Ficha |
|---|---|---|---|
| ADR-01 | Supabase Auth para la autenticación y las credenciales | Jairo Maigua | [ADR-01](adr/ADR-01-supabase-auth.md) |
| ADR-02 | Supabase + SMTP personalizado para la verificación y la recuperación por enlace | Jairo Maigua | [ADR-02](adr/ADR-02-supabase-smtp-enlaces.md) |
| ADR-03 | SQLite (expo-sqlite) para la persistencia local con outbox | Jairo Maigua | [ADR-03](adr/ADR-03-sqlite-persistencia-offline.md) |
| ADR-04 | expo-camera + expo-location para la foto y la ubicación | Jairo Maigua y Oscar Vázquez | [ADR-04](adr/ADR-04-camara-y-geolocalizacion.md) |
| ADR-05 | Sentry para el monitoreo de fallos | Jairo Maigua | [ADR-05](adr/ADR-05-sentry-monitoreo.md) |
| ADR-06 | Expo Router con rutas por rol | Kevin Amagua | [ADR-06](adr/ADR-06-expo-router.md) |
| ADR-07 | Zustand + TanStack Query + Supabase Realtime | Milka Borja | [ADR-07](adr/ADR-07-estado-zustand-tanstack-realtime.md) |
| ADR-08 | React Hook Form para los formularios | Kevin Amagua | [ADR-08](adr/ADR-08-react-hook-form.md) |
| ADR-09 | Zod para validar cédulas, correos y actas | Milka Borja | [ADR-09](adr/ADR-09-zod-validacion.md) |
| ADR-10 | NetInfo + cola en SQLite + UUID idempotente | Kevin Amagua | [ADR-10](adr/ADR-10-netinfo-sincronizacion.md) |
| ADR-11 | PostgreSQL en Supabase con RLS y unicidad mesa + dignidad | Jairo Maigua y Milka Borja | [ADR-11](adr/ADR-11-modelo-datos-rls.md) |

> En el documento grupal, los ADR 8, 9 y 10 aparecen numerados como ADR-008, ADR-009 y ADR-0010. Aquí se usa la forma de dos dígitos de la línea base.

## 4. Las decisiones, agrupadas por necesidad

### 4.1 Acceso de los usuarios (ADR-01 y ADR-02)

**Decisión.** Supabase Auth crea las cuentas **por API**: nadie se registra solo. El provincial crea a los coordinadores de recinto y estos a sus veedores. La **clave temporal** se controla con una bandera en los metadatos, que obliga a cambiarla en el primer ingreso. Supabase, con un **SMTP propio** y plantillas en español, envía enlaces de **uso único y con expiración** para verificar el correo antes del ingreso y para recuperar la clave, solo si el correo ya está verificado.

**Por qué.** Supabase ofrece tokens, confirmación de correo y recuperación ya resueltos, y además **RLS**, que Firebase no tiene de forma nativa. Appwrite exigía administrar la plataforma y tenía menos soporte en React Native. Así se cumple que solo el titular conozca su clave y que cada persona recupere su acceso sin depender de nadie.

**Costo aceptado.** Se depende de un proveedor externo; hay que configurar el SMTP y las URL de redirección; los correos pueden caer en SPAM y no se envían sin conexión.

### 4.2 Registro confiable de las actas (ADR-08, ADR-09 y ADR-04)

**Decisión.** Los formularios usan **React Hook Form**: un formulario fluido que precarga los datos al corregir y bloquea los envíos repetidos. Las reglas viven en esquemas **Zod** reutilizables: cédula ecuatoriana, correo y coherencia numérica del acta (sin negativos, ningún candidato por encima del total, válidos + blancos + nulos = total). Las reglas **bloquean** el guardado (S-03). La foto se toma con **expo-camera dentro de la app**, se mide su **nitidez** y, si está borrosa, no se puede continuar. **expo-location** registra la ubicación del momento del disparo con varias lecturas, de las que se conserva la más precisa.

**Por qué.** Con `useState` por campo, la pantalla se redibujaba en cada pulsación y el código se repetía; TanStack Form costaba más de lo que aportaba. Zod expresa mejor que Yup las reglas cruzadas y evita repetir validaciones manuales. El selector de galería no resolvía ni la foto ilegible ni la prueba del lugar.

**Costo aceptado.** Dos dependencias más; los campos personalizados se envuelven con `Controller`; el umbral de nitidez debe calibrarse con actas reales; se necesitan permisos de cámara y ubicación.

### 4.3 Trabajo sin conexión y sincronización (ADR-03 y ADR-10)

**Decisión.** **SQLite** es la fuente de verdad local, con una **outbox** e identificador del cliente por acta. La foto se guarda como archivo y su ruta queda en la base; nada se borra hasta que el servidor confirma. **NetInfo** detecta el regreso de la red y dispara el envío automático. Un **UUID idempotente** por operación evita duplicados. Cada acta tiene versión: si dos celulares la modifican antes de sincronizar, el servidor conserva ambas versiones y decide el coordinador de recinto (S-04).

**Por qué.** SQLite tiene transacciones, de modo que un acta no queda a medias; AsyncStorage/MMKV no las tienen y WatermelonDB era demasiado complejo para el plazo. La sincronización manual no cumple RF-16.

**Costo aceptado.** SQLite no cifra sus datos; hay que diseñar el esquema, la máquina de estados y el **control de concurrencia** para que dos avisos de red no procesen lo mismo.

### 4.4 Confidencialidad y modelo de datos (ADR-11)

**Decisión.** **PostgreSQL en Supabase** con tablas relacionales y **RLS**. Un veedor solo ve y modifica sus mesas, un coordinador de recinto solo su recinto y el provincial **lee** su jurisdicción pero **no modifica actas**. La unicidad **mesa + dignidad** limita a dos actas por mesa. Reasignar revoca de inmediato la asignación anterior y conserva el historial.

**Por qué.** La restricción no puede depender de la pantalla: el servidor decide qué ve cada uno. Firestore no tiene relaciones nativas y un backend propio sin RLS dejaba huecos si la app consultaba la base directamente.

**Costo aceptado.** Las políticas son la parte más delicada y deben probarse con cada rol; hay que documentar el modelo y preparar datos de prueba.

### 4.5 Seguimiento en vivo y navegación (ADR-07 y ADR-06)

**Decisión.** **Zustand** guarda la sesión, el rol, la conexión y la cola; **TanStack Query** guarda los datos del servidor; **Supabase Realtime** refresca el avance y el conteo sin recargar la pantalla. **Expo Router** organiza las pantallas en grupos por rol y redirige según sesión, rol y cambio de la clave temporal.

**Por qué.** Redux exigía demasiado código repetitivo y Context provocaba redibujados innecesarios. Expo Router ya viene con Expo y hace la navegación predecible para usuarios mayores, a diferencia de configurar React Navigation a mano.

**Costo aceptado.** Las suscripciones de Realtime se encapsulan en repositorios y se cierran al salir; todo el código de capas debe vivir fuera de `app/`.

### 4.6 Estabilidad (ADR-05)

**Decisión.** **Sentry** captura cierres nativos y errores que no cierran la app, el rastro de pantallas, el modelo y la versión de Android, y guarda los eventos sin red. Se eliminan cédulas, nombres, teléfonos y correos de los reportes.

**Por qué.** Crashlytics requería configuración nativa de Firebase; una tabla propia no captura cierres nativos; el plan gratuito de BugSnag era más limitado.

**Costo aceptado.** Proveedor externo con cupo gratuito limitado; los cierres nativos solo se ven en el APK.

## 5. Relación entre decisiones y requisitos

| Requisito | ADR |
|---|---|
| RF-01 Cuentas jerárquicas | 01, 02, 06 |
| RF-02 Datos válidos y cambio de la clave temporal | 01, 06, 08, 09 |
| RF-03 Verificación del correo · RF-04 Recuperación | 01, 02 |
| RF-06 Recintos · RF-07 Un coordinador por recinto · RF-08 Asignación de veedores | 08, 11 |
| RF-09 Registro de actas · RF-13 Corrección | 08 |
| RF-10 / RF-19 Validación matemática | 09, 11 |
| RF-11 Foto legible · RF-12 Ubicación de la captura | 04 (RF-12 también en 09, según el documento) |
| RF-14 Estado del acta · RF-16 Sin conexión | 03, 07, 10 |
| RF-15 Seguimiento del provincial | 04, 07 |
| RF-17 Monitoreo de fallos | 05 |
| RF-18 Confidencialidad por rol | 06, 11 |
| RF-20 Reemplazo de veedores | 08, 11 |
| RNF-02 Credenciales protegidas | 01, 02, 05, 09 |
| RNF-03 / RNF-04 Persistencia y monitoreo | 03, 05, 10 |
| RNF-05 Clean Architecture · RNF-07 UX simple | 06, 07, 08 |

**Bloques de la rúbrica:** acceso de usuarios (01, 02, 09) · registro del veedor (03, 04, 08, 09, 10) · gestión del recinto (08, 11) · territorio y seguimiento (04, 07, 11) · fallos (05) · arquitectura y estado (06, 07) · navegación por rol (06).

**Requisitos sin un ADR propio** (también son parte de la línea base): RNF-01 (React Native y APK, cubierto por Expo SDK 57 + EAS), RNF-06 (colores, Lottie y Reanimated, cubierto por el sistema de diseño), RNF-08 (documentar las decisiones: este documento) y RF-05 (datos precargados: `supabase/seed.sql`).

## 6. Diferencias entre lo acordado y la implementación actual

Las decisiones del grupo **no se modificaron**. Estas son las diferencias o pendientes detectados al contrastarlas con el código (24/11/2026); el detalle está en cada ficha.

| ADR | Diferencia o pendiente |
|---|---|
| 01 | Aclaración aceptada: la bandera está en `app_metadata`, que el usuario no puede modificar (el documento dice solo «metadatos»). |
| 02 | El SMTP personalizado se configura en el panel de Supabase; el repositorio no registra que esté hecho. La recuperación por OTP de la línea base anterior se reemplazó por enlace, como dice este ADR. |
| 03 | No se encontró un mensaje específico para poco almacenamiento. ~~Historial sin pantalla~~ → **corregido (24/11)**: pantalla «Historial» (ver ADR-11). |
| 04 | El umbral de nitidez (200) se calibró por simulación; falta confirmarlo con fotos reales, como advierte el propio ADR. |
| 05 | Los cierres nativos y el envío diferido sin red solo pueden demostrarse con el APK. El plan de gestión del cupo gratuito no está documentado. |
| 07 | **Corregido (25/11):** «Resultados por recinto» con votos por candidato de cada recinto y totales generales, por dignidad, verificados contra el conteo del servidor (RF-15). Falta prueba manual. |
| 08 | El documento grupal repite por error, en la fila de React Hook Form, las ventajas y desventajas de la ficha ADR-07. |
| 11 | No hay totales precalculados (el conteo se calcula al consultar) ni un diagrama entidad-relación aparte; el modelo está documentado en la migración. El historial ya se consulta en pantalla (24/11). |
| Todos | El documento grupal no registra el minuto del video de cada decisión. |
| RNF-06 (sin ADR) | El documento grupal no fija colores. Decisión del estudiante (25/11): **colores institucionales del CNE como referencia visual** (valores del sitio oficial cne.gob.ec), sin logotipo ni afirmación de producto oficial. Ver `ADR_LINEA_BASE.md` §4.10 y `ADR-C02` §10. |

## 7. Conclusión

Las once decisiones forman un sistema coherente:
- **Supabase** (ADR-01, 02, 11) concentra la autenticación, los datos y la seguridad en el servidor mediante RLS, de modo que la interfaz no es la única barrera.
- **SQLite, NetInfo y los UUID idempotentes** (ADR-03, 10) garantizan que ningún acta se pierda ni se duplique sin señal.
- **La cámara, el GPS y la medición de nitidez** (ADR-04) convierten cada acta en evidencia verificable.
- **React Hook Form y Zod** (ADR-08, 09) bloquean los errores en el momento en que se escriben.
- **Expo Router y el estado separado** (ADR-06, 07) dan flujos simples por rol y un seguimiento en vivo.
- **Sentry** (ADR-05) da visibilidad de los fallos sin depender del usuario.

Cada elección nace de un problema concreto del enunciado y no de una preferencia personal, y sus costos quedaron aceptados y registrados.
