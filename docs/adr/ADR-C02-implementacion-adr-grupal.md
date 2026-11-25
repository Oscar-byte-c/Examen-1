# ADR-C02: Implementación del documento grupal de ADR

| Dato | Detalle |
|---|---|
| Tipo | ADR complementario: precisa **cómo** se implementan los ADR-01 a ADR-11 del documento grupal, sin cambiar ninguna tecnología acordada |
| Estado | Aceptado (alineación obligatoria con el documento grupal del 22/11/2026) |
| Fecha | 2026-11-22 |
| Reemplaza | La recuperación por OTP y el umbral de 500 m de la línea base anterior |

Cada punto sigue el formato **problema → alternativas → decisión → consecuencias**.

## 1. Bandera de clave temporal (ADR-01, RF-02)

- **Problema:** el documento indica que la clave temporal se controla con una bandera *"en los metadatos"*. Supabase tiene dos: `user_metadata`, que **el propio usuario puede modificar** desde la app con `updateUser({ data })`, y `app_metadata`, que solo escribe el servidor.
- **Decisión:** la bandera es `app_metadata.debe_cambiar_clave`. La escribe la Edge Function `crear-usuario` (`true`) y la borra la Edge Function `cambiar-clave` (`false`), que es la que cambia la clave con privilegios de servidor.
- **Defensa en profundidad:** las funciones de RLS (`privado.mi_rol()`) leen la bandera desde el JWT. Mientras sea `true`, el usuario **no ve datos electorales** aunque use la API directamente: la pantalla de cambio de clave no es la única barrera.
- **Consecuencia:** se elimina la columna `perfiles.debe_cambiar_clave` de la migración de la Fase 3A, para no tener dos fuentes de verdad.

## 2. Alta de cuentas y verificación por enlace (ADR-01, ADR-02, RF-01 a RF-03)

- **Flujo:** `crear-usuario` (Edge Function, con `service_role` solo en el servidor):
  1. Verifica el JWT de quien llama y su rol en `perfiles`: el provincial crea coordinadores de recinto (en un recinto sin coordinador) y el coordinador de recinto crea veedores de su propio recinto.
  2. Valida cédula (módulo 10), nombres, apellidos, teléfono y correo con las mismas reglas del dominio.
  3. Genera una **clave temporal aleatoria** y crea la cuenta con `auth.admin.createUser({ password, email_confirm: false, app_metadata: { debe_cambiar_clave: true } })`, que no envía correo. La clave se muestra **una sola vez** a quien crea la cuenta, que se la entrega al titular. No se guarda ni se registra en logs.
  4. Inserta el perfil.
  5. **Al final**, `auth.admin.inviteUserByEmail()`: para un usuario existente sin confirmar, Supabase envía el **enlace de verificación** (único y con expiración) sin modificar su clave ni su `app_metadata`. Sin verificar el correo no se puede iniciar sesión (`email_not_confirmed`). Si algo falla, borra el usuario de Auth (el perfil cae en cascada): no quedan cuentas a medias.
- **Por qué este orden (corrección del 22/11):** en Supabase Auth, asignar una clave (`UpdatePassword`) **borra el token de confirmación**. La versión anterior invitaba primero y asignaba la clave después, así que el enlace llegaba ya inválido (`otp_expired: Email link is invalid or has expired`).
- **Destino del enlace:** el `redirectTo` lo envía la app (`Linking.createURL('/correo-verificado')`) y la función solo lo acepta si es `controlelectoral://` o, durante las pruebas, `exp://` con `PERMITIR_EXPO_GO=true`. Además, debe estar en *Authentication → URL Configuration → Redirect URLs*; si no, Supabase usa el *Site URL* (por defecto `http://localhost:3000`). El patrón debe cubrir la ruta: en Expo Go la URL es `exp://<IP>:8081/--/<ruta>`, así que se registra `exp://<IP>:8081/--/**` (en los patrones de Supabase `*` no cruza `.` ni `/`; `**` sí). Se prefiere la IP concreta antes que `exp://**`, que aceptaría cualquier servidor de desarrollo. La verificación ocurre en el servidor **antes** de redirigir: aunque la redirección falle, el correo ya quedó verificado si el token era válido.
- **SMTP personalizado (ADR-02):** se configura en el panel de Supabase (Authentication → Emails → SMTP Settings), con las plantillas en español. Las credenciales SMTP nunca están en el repositorio ni en la app.

## 3. Recuperación de clave por enlace (ADR-02, RF-04)

- **Problema:** el plan anterior usaba un código OTP. El documento grupal decide **enlaces** y exige que la recuperación solo esté disponible para correos **ya verificados**.
- **Decisión:** la app llama a la Edge Function `solicitar-recuperacion`, que solo envía el enlace (`resetPasswordForEmail`) si el correo existe **y** está verificado. Siempre responde el mismo mensaje genérico, para no revelar qué correos existen.
- El enlace abre la app en `restablecer-clave` (esquema `controlelectoral://` en el APK; `exp://…` en Expo Go). Se usa el **flujo implícito**: el enlace trae `access_token` y `refresh_token` en el fragmento de la URL y la app abre la sesión con `setSession`. No se usa PKCE porque el enlace lo pide la Edge Function, así que el `code_verifier` no estaría en el celular. La nueva clave se guarda mediante `cambiar-clave`, que además borra la bandera de clave temporal.
- **Configuración necesaria:** agregar `controlelectoral://**` a *Authentication → URL Configuration → Redirect URLs*. Para probar en Expo Go se agrega **solo** la URL `exp://` del equipo de desarrollo y se define el secreto `PERMITIR_EXPO_GO=true` en las Edge Functions; ambos se retiran antes de entregar. Con un comodín `exp://**`, un atacante podría pedir un enlace para el correo de otra persona que entregue los tokens a su propio servidor.
- **Tiempo de respuesta constante (1,5 s)** en `solicitar-recuperacion`: medir cuánto tarda no revela si el correo existe. El límite de envíos lo aplica Supabase Auth.

## 2.1 Riesgo residual de la clave temporal (aceptado)

- **Riesgo:** quien crea la cuenta conoce la clave temporal. Podría ingresar antes que el titular.
- **Mitigaciones:** (1) *Confirm email* activado: no se puede iniciar sesión sin abrir el enlace que llega al correo del titular; (2) `privado.mi_rol()` exige correo confirmado y clave definitiva, así que antes de eso no se ven datos; (3) `cambiar-clave` rechaza a usuarios sin correo verificado; (4) toda acción queda firmada en `actas_historial` con el UUID de quien la hizo.
- **Riesgo que queda:** si quien crea la cuenta registra un correo que él mismo controla, la cuenta es suya desde el inicio. Esto lo permite el propio modelo jerárquico del enunciado (RF-01/RF-20) y se controla con la trazabilidad (`creado_por` en `perfiles`).

## 4. Escritura de actas: una sola puerta en el servidor (ADR-03, ADR-10, ADR-11, S-03, S-04)

- **Problema:** un acta son varias filas (acta + 5 votos + historial). Si la app las escribe una por una, una caída de red puede dejar un acta a medias, y la validación matemática dependería del cliente.
- **Alternativas:** (a) inserts/upserts directos con RLS; (b) una función RPC transaccional.
- **Decisión:** **(b)**. La app no tiene permisos de `INSERT`/`UPDATE` sobre actas. Todo pasa por `public.sincronizar_acta(operacion_id, acta)`, que en **una transacción**:
  1. revalida el permiso (`puede_editar_mesa`: veedor asignado o coordinador del recinto; el provincial no edita);
  2. revalida la matemática (RF-19), la dignidad de cada candidato, el GPS obligatorio (S-06) y que la foto exista en Storage;
  3. es **idempotente**: si la `operacion_id` ya se aplicó, responde lo mismo sin duplicar;
  4. aplica el cambio solo si la `version_base` coincide con la versión del servidor. Si no coincide, **no sobrescribe**: guarda ambas versiones en `actas_conflictos` para que el coordinador de recinto decida (`resolver_conflicto`);
  5. registra cada versión en `actas_historial` (autoría y trazabilidad).
- **Fotos:** bucket privado `actas-fotos`, ruta `{mesa_id}/{acta_id}/{operacion_id}.jpg`. Solo se permite subir (nunca actualizar ni borrar), así cada versión conserva su evidencia. `sincronizar_acta` exige que la foto esté en la carpeta de ESA acta y que la haya subido quien envía el acta (`owner_id`).
- **Resolver un conflicto** con la versión del otro celular solo se permite si el acta no cambió desde que se registró el conflicto; si cambió, el coordinador debe revisar de nuevo.
- **Datos locales al cerrar sesión:** las actas y fotos de la outbox se conservan en el celular (separadas por autor) para no perder información sin red (ADR-03). SQLite no está cifrado; es una limitación asumida en el ADR-03 del documento grupal.

## 5. Medición de nitidez de la foto (ADR-04, RF-11)

- **Problema:** el documento exige medir la nitidez antes de continuar. Ningún módulo de Expo da acceso a los píxeles.
- **Alternativas:** (a) usar el tamaño del JPEG como indicador (impreciso); (b) decodificar una versión reducida con `jpeg-js` (JavaScript puro, sin código nativo, funciona en Expo Go) y calcular la **varianza del laplaciano**, la medida clásica de desenfoque.
- **Decisión:** **(b)**. `expo-image-manipulator` reduce la foto a 480 px de ancho; `jpeg-js` la decodifica; el cálculo es una función pura del dominio (`entities/nitidez.ts`), con tests. Si la varianza está bajo el umbral (`NITIDEZ_MINIMA`), la app advierte y **no deja continuar** hasta repetir la foto.
- **Riesgo asumido (consecuencia del ADR-04):** el umbral debe calibrarse con fotos reales de actas.
- **Corrección (24/11): las fotos borrosas pasaban sin aviso.** Se simuló el proceso completo con un acta sintética a 3000 px (desenfoque, ruido de sensor σ≈4, JPEG y reducción bilineal como en Android). Con 480 px, laplaciano global y umbral 60, el ruido del sensor dejaba la varianza en **≥ 150 incluso con un desenfoque que impide leer los números**, así que el aviso casi nunca aparecía. Además, el desenfoque por movimiento no se detectaba, porque los bordes en la otra dirección seguían nítidos. Cambios (misma técnica y mismas dependencias, sin código nativo):
  1. Análisis a **1000 px** (`ANCHO_ANALISIS_FOTO`), más cerca de los 1600 px con que se guarda la foto.
  2. **Promedio 2×2** antes de derivar, para quitar el ruido. Así el resultado no depende del filtro de reducción del dispositivo: bilineal y por área dan valores casi iguales.
  3. Varianza de la segunda derivada **por eje** (x e y) y se toma la **menor**, para detectar el movimiento.
  4. Por **bloques** (cuadrícula de 8×8) y se toma el **percentil 75**. Así el borde del papel no aprueba una foto borrosa y los márgenes en blanco no reprueban una nítida.
  5. `NITIDEZ_MINIMA = 200`. En la simulación: foto nítida ≈ 4100 (≈ 1030 con poca luz); desenfoque σ = 2 px ≥ 395; σ = 6 px ≤ 127; σ = 8 px ≤ 47; movimiento de 30 px ≤ 112. Zona gris: σ ≈ 3–4 px con poca luz.
  - Además, una foto ilegible ya no se copia al almacenamiento persistente: solo se muestra desde la caché. `GuardarActa` sigue rechazándola con `FotoIlegibleError`.
  - **Pendiente:** confirmar el umbral con fotos reales. El procesamiento de la cámara (realce de bordes) puede subir los valores de una foto algo borrosa.

### 5.1 GPS de la captura sin internet (ADR-04, RF-12, RF-16, S-06) — 24/11
- **Problema:** en modo avión la foto se rechazaba con «Necesitamos tu ubicación…» aunque el GPS y los permisos estaban activos. Sin internet no hay A-GPS ni posicionamiento por Wi-Fi/antenas y el primer fix del GNSS tarda de 30 s a varios minutos; el código pedía 3 lecturas secuenciales de 15 s cada una y el mismo error cubría permiso, GPS apagado y falta de señal.
- **Decisión:**
  1. **Precalentamiento:** al abrir la pantalla del acta se enciende un seguimiento (`watchPositionAsync`, sin pedir permiso) que se apaga al salir. Mientras se llenan los votos, el receptor consigue señal.
  2. **Regla de la captura:** solo valen lecturas con fecha **≥ el instante de la foto** (`lecturasDesde`, dominio; el datasource también filtra). Se buscan `LECTURAS_GPS = 3` y se conserva la más precisa; `capturada_en` es la fecha de esa lectura. El precalentamiento nunca aporta la ubicación.
  3. **Límite total** `TIEMPO_MAX_GPS_MS = 60 s` (antes 3 × 15 s). Si vence sin lecturas → `SinSenalGpsError` y se repite la foto (S-06: el GPS sigue siendo obligatorio). Si llegan 1 o 2 lecturas, se usa la mejor (igual que antes).
  4. **Mensajes por causa:** `PermisoUbicacionError`, `GpsDesactivadoError` y `SinSenalGpsError` (todas heredan de `UbicacionRequeridaError`).
  5. **Identidad sin red:** con el token vencido y sin internet, `getSession()` devuelve `null` aunque la sesión siga guardada, y guardar fallaba tras ~1 h offline. `ActaRepositoryImpl.usuarioId()` y `restaurarSesion()` usan ahora `perfilDeSesionGuardada`: el id de la sesión guardada por supabase-js **y** el perfil en caché deben coincidir; si no, no hay identidad. Al recibir `SIGNED_OUT` se borra el perfil en caché. Solo afecta a datos locales: al sincronizar, la RPC usa `auth.uid()` y la RLS.
- **Segunda iteración (24/11):** con GPS Test el teléfono obtenía *3D Fix* en modo avión, pero la app seguía sin lecturas. Diferencia: GPS Test usa `LocationManager.GPS_PROVIDER`; `expo-location` en Android usa **solo** el proveedor *fused* de Google Play Services, con la granularidad del permiso. Cambios: (a) se lee el valor REAL `permiso.android.accuracy` y con `coarse` se lanza `UbicacionAproximadaError` (con la aproximada, fused no enciende el GNSS); (b) `watchPositionAsync` con `mayShowUserSettingsDialog: false` (si Android informa el proveedor «network» deshabilitado, expo-location dejaba el seguimiento esperando un diálogo de ajustes) y límite de 10 s para arrancar, limpiando la promesa y eliminando una suscripción tardía; (c) `SinSenalGpsError` incluye un diagnóstico **sin coordenadas**: precisión del permiso, proveedores GPS/red, estado del seguimiento, lecturas recibidas y descartadas por ser anteriores a la foto. La causa exacta en el teléfono de prueba se confirmará con ese diagnóstico. Descartado: un módulo nativo con `GPS_PROVIDER` (no funciona en Expo Go y exigiría una dependencia nativa).
- **Descartado:** `getLastKnownPositionAsync()` (puede ser una posición anterior o de otro lugar).
- **Riesgo aceptado:** la comparación usa el reloj del celular; si la hora está muy mal configurada a mano, las lecturas podrían descartarse (se vería «sin señal GPS»). Con hora automática no ocurre.

## 6. Mapas con OpenStreetMap (línea base 4.4, RF-15, S-06)

- **Alternativas:** `react-native-maps` (en Android depende del SDK de Google Maps y su API key, aunque se dibujen teselas de OSM) o `react-native-webview` + **Leaflet** con teselas de OpenStreetMap.
- **Decisión:** WebView + Leaflet. Es OpenStreetMap de punta a punta, no necesita claves y `react-native-webview` está incluido en Expo Go. El componente vive en `presentation/components/MapaOSM.tsx`.
- **Consecuencia:** el mapa necesita internet (el resto del dashboard también).
- **Mapa de la evidencia (24/11, RF-12 / S-06):** debajo de la foto del acta se dibuja el lugar de captura (con su círculo de precisión) y el recinto, unidos por una línea. Solo se usan las coordenadas **guardadas con la foto** (`actas_locales` antes del envío; `actas.latitud/longitud` después), nunca la ubicación actual. La distancia oficial es la del servidor (`distancia_recinto_m`, `fuera_de_rango`); antes de sincronizar se muestra una estimación con la misma fórmula (`evaluarUbicacionEvidencia`, dominio). Sin red, o si Leaflet no carga (la página avisa con `postMessage`), se muestran las coordenadas en texto. La foto de un acta que solo está en el servidor se ve con una URL firmada de 5 min (`createSignedUrl`, sujeta a la política `fotos_actas_lectura`) y sin caché en disco. Sin cambios de migraciones ni de RLS.

## 7. Zod en el dominio (ADR-09)

- **Decisión:** los esquemas de Zod viven en `domain/entities` porque **son reglas de negocio** (cédula, matemática del acta). Zod es TypeScript puro: no depende de React, Expo ni Supabase, así que el dominio sigue siendo independiente y testeable. Los formularios (React Hook Form, ADR-08) los usan con `@hookform/resolvers/zod`, y el servidor repite las mismas reglas.

## 8. Datos precargados (RF-05)

- El documento no indica la provincia ni el cantón. Se usan **Pichincha – Quito**, coherente con las cédulas de prueba (código de provincia 17). Las 5 organizaciones y sus candidatos son **ficticios**, para no usar nombres reales de partidos. Las coordenadas de los recintos son aproximadas.

## 9. Plataforma objetivo: Android. Web no soportada (RNF-02, ADR-01)

- **Problema:** `npx expo start --web` falla porque `expo-secure-store` **no tiene implementación web**: su módulo web está vacío (`getValueWithKeyAsync is not a function`). La sesión de Supabase guarda sus tokens en Secure Store (RNF-02), que en Android los cifra con el Keystore.
- **Alternativas:** (a) aceptar que la app no corre en navegador; (b) un adaptador solo web sobre `localStorage`.
- **Decisión (23/11/2026, del estudiante):** **(a)**. El enunciado exige un APK de Android y ni el documento grupal ni los requerimientos piden versión web. La opción (b) dejaría los tokens en texto plano en el navegador, lo que contradice RNF-02, así que se descarta.
- **Consecuencia:** la app **se valida en Android**: Expo Go durante el desarrollo y el APK (perfil `preview`) en la entrega. La web no forma parte del alcance.
- **`web.output: "single"` (24/11).** El primer build de EAS falló en *Bundle JavaScript* con `ExpoSecureStore.default.getValueWithKeyAsync is not a function`. La plantilla traía `web.output: "server"`, y con ese valor `expo export:embed` (el comando que ejecuta Gradle) también genera el servidor de *API routes*. Para eso evalúa todas las rutas en Node con `platform=web`. Al importar las pantallas se crea el cliente de Supabase, cuyo constructor intenta recuperar la sesión desde Secure Store, que en web/Node está vacío. El proyecto no tiene *API routes* y la web no está en el alcance, así que se usa `"single"`: no se evalúa ninguna ruta en Node y Android no cambia (sigue usando Secure Store). Se descartó proteger el adaptador con un almacenamiento alternativo para web, porque añadía código sin aportar nada al alcance. `expo export --platform android` **no** reproduce este paso; hay que comprobarlo con `expo export:embed`.
- `metro.config.js` solo añade lo que expo-sqlite exige en web: `wasm` en `assetExts` y las cabeceras COOP/COEP (docs SDK 57). Se conserva porque es inocuo: el bundle Android no incluye ningún `.wasm` ni wa-sqlite (comprobado con `expo export --platform android`).
