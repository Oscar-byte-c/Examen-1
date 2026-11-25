# ADR-06: Usar Expo Router para la navegación por roles

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha ADR-06). Complemento: ADR-C01.

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-01 y RF-02:** acceso solo con cuenta y cambio obligatorio de la clave antes de usar la app.
- **RF-18:** cada rol ve sus propias pantallas.
- **RNF-05:** Clean Architecture.
- **RNF-07:** navegación simple para personas mayores.

## Contexto
La app tiene tres perfiles con pantallas distintas: el provincial ve el tablero, los recintos y el mapa; el coordinador de recinto, sus mesas, los conflictos y el historial; el veedor, sus mesas y el registro de actas. Además, hay un flujo obligatorio de cambio de clave en el primer ingreso y pantallas de acceso: inicio de sesión, recuperar y restablecer la clave, y correo verificado.

Muchos usuarios son personas mayores o con poca experiencia, así que la navegación debe ser predecible y responder bien al botón atrás de Android. Al abrir la app, cada persona debe llegar directamente a su pantalla según su sesión, su rol y si ya cambió la clave, sin quedar atrapada en una pantalla sin salida.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Expo Router** (propuesta por Kevin Amagua) | Viene en la plantilla de Expo, sin dependencias externas. Organiza las pantallas en grupos de rutas (acceso, provincial, recinto, veedor) y facilita redirigir según el rol o el cambio de clave. | Impone una convención fija: todo archivo dentro de `app/` es una ruta, así que el dominio, los datos y los componentes deben vivir fuera. |
| React Navigation configurado manualmente (propuesta por Kevin Amagua) | Control explícito de cada *stack* o *tab* en TypeScript. | Hay que instalar y configurar varios paquetes que Expo ya resuelve, y las rutas son menos visibles en la estructura de carpetas. |

## Decisión
Se usa **Expo Router** con grupos de rutas separados por rol. La redirección inicial depende de tres datos: si existe una sesión, cuál es el rol activo y si el usuario ya cambió su clave temporal. Si alguno falla, la app lleva al usuario a la pantalla que corresponde. Se descartó configurar React Navigation a mano porque repetía, con más código, lo que Expo Router ya resuelve.

## Consecuencias
- **Un solo sistema de navegación:** Expo Router usa React Navigation por dentro; no se instaló un segundo sistema (ADR-C01; ADR_LINEA_BASE §4.1).
- **Implementación:**
  - `app/_layout.tsx` usa `Stack.Protected` en el orden sesión → clave temporal → rol;
  - los grupos son `app/coordinador-provincial/`, `app/coordinador-recinto/` y `app/veedor/`;
  - las rutas de acceso son `app/login.tsx`, `cambiar-clave.tsx`, `recuperar-clave.tsx`, `restablecer-clave.tsx` y `correo-verificado.tsx`;
  - `RedireccionInicial.tsx` decide el destino al abrir la app.
- **Clean Architecture:** cada archivo de `app/` re-exporta en una sola línea su pantalla de `src/presentation/screens`. La lógica vive en `src/` (domain, data y presentation), nunca en `app/`.
- **Los guards solo protegen la navegación, no los datos:** con un token válido alguien podría consultar la API directamente; quien lo impide es la RLS (ADR-11).
- **Rutas tipadas:** se regeneran con el servidor de desarrollo. Si se agrega una ruta y no se regeneran, TypeScript la marca como inválida.

## Verificación
- **Automática:** no hay pruebas automáticas de navegación.
- **Revisión del código:** `app/` solo contiene re-exportaciones de una línea y los `_layout.tsx`.
- **Pendiente:**
  - entrar con cada uno de los 3 roles y comprobar que llega a su inicio;
  - un usuario con la clave temporal solo ve «Cambiar clave»;
  - el botón atrás de Android no sale a pantallas de otro rol;
  - abrir la app con la sesión vencida lleva al inicio de sesión.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, después del consenso del 22/11.
- **ChatGPT** estuvo de acuerdo, con una precisión arquitectónica: tratar ADR-C01 como aclaración del ADR-06 y no como decisión contradictoria. Recordó que los guards no son seguridad y pidió una matriz rol–ruta con pruebas negativas.
- **Gemini** la aprobó, delimitando capas: `app/` no debe tener lógica de negocio. Pidió probar que entrar por URL directa o pulsar atrás después de cerrar sesión no expone pantallas. Mencionó grupos de rutas `(admin)`, `(veedor)` y `(auditor)`, **que no existen en este proyecto**.
- **Claude**, que participó en la redacción (no es un revisor independiente), verificó los guards en `app/_layout.tsx` y que los grupos reales son `coordinador-provincial`, `coordinador-recinto` y `veedor`. Además, ChatGPT y Gemini hablan de un «acuerdo inicial de React Navigation». Esa frase la tomaron del ADR-C01, que cita un acuerdo **anterior** al documento del 22/11; en el consenso grupal se eligió Expo Router.

Las tres coinciden con la decisión del equipo.
- **Se aceptaron:** la matriz rol–ruta y las pruebas negativas (pendientes) y la actualización de esa frase del ADR-C01 (pendiente).
- **Se descartó:** la referencia de Gemini a grupos de rutas inexistentes.
