# ADR-07: Usar Zustand, TanStack Query y Supabase Realtime para el estado y el conteo en vivo

## Estado
Aceptado por consenso del equipo (Documento_Consolidado_ADR.docx, ficha ADR-07).

## Fecha
22/11/2026.

## Requisitos relacionados
- **RF-14:** estado de cada acta.
- **RF-15:** el provincial sigue el avance y los votos por candidato, por recinto y en total, en tiempo real.
- **RF-16:** cola sin conexión.
- **RNF-05:** arquitectura mantenible.

## Contexto
La app maneja dos tipos de información muy distintos. Uno es el estado del propio teléfono: la sesión, el rol, si hay conexión y cuántas actas esperan en la cola. El otro son los datos del servidor: mesas, recintos, avance y conteo de votos, que cambian mientras llegan actas de otros veedores.

El coordinador provincial necesita ver el avance por recinto y el conteo por candidato a medida que llegan las actas, sin recargar la pantalla; el enunciado lo describe como un «exit poll» en tiempo real. Si cada cambio redibujara toda la pantalla, la app se volvería lenta en teléfonos de gama baja. Y sin un manejo ordenado de la caché, cada pantalla tendría que programar a mano los estados de carga, error y reintento.

## Alternativas consideradas
| Alternativa | Ventajas en este proyecto | Desventajas en este proyecto |
|---|---|---|
| **Zustand + TanStack Query + Supabase Realtime** (propuesta por Milka Borja) | Poco código y fácil de mantener. TanStack Query ya maneja carga, éxito y error en las pantallas. Cuando llega un evento de Realtime solo se refrescan las consultas del conteo, sin trabar la interfaz. | Hay que tener clara la división entre lo que va en Zustand y lo que maneja TanStack Query. |
| Redux Toolkit con RTK Query (propuesta por Oscar Vázquez) | Muy estructurado y conocido. | Demasiado código repetitivo para el tiempo de desarrollo individual. |
| Solo React Context (propuesta por Kevin Amagua) | No requiere librerías extra. | Provoca redibujados innecesarios en listas y gráficos en vivo, y obliga a programar a mano la caché y los reintentos. |

## Decisión
Se usa **Zustand** para la sesión, el rol, la conexión y el estado de la cola sin conexión; **TanStack Query** para los datos del servidor, conectado a los casos de uso del dominio; y **Supabase Realtime** para refrescar en vivo el avance y el conteo. Redux se descartó por la cantidad de código repetitivo y Context, por los redibujados y la falta de caché.

## Consecuencias
- **Qué estado vive dónde:**
  - Zustand: sesión, rol, conexión y cola (`authStore.ts`, `syncStore.ts`).
  - TanStack Query: todo lo que viene del servidor, con caché (`hooks/consultas.ts`, `store/queryClient.ts`).
  - SQLite: actas pendientes del teléfono (ADR-03).
  - Realtime: solo avisos para invalidar consultas.
- **Realtime encapsulado en el repositorio:** el caso de uso `SuscribirseEscrutinio` llama a `EscrutinioRepositoryImpl.suscribirCambios`, que abre un canal sobre `actas` y `actas_conflictos`. El hook `useEscrutinioEnVivo` agrupa los eventos, invalida las consultas y cierra el canal con `removeChannel` al salir de la pantalla.
- **Tablero:** usa las RPC `public.avance_por_recinto` y `public.conteo_por_candidato` (lectura filtrada por la RLS), en `CoordinadorProvincialHomeScreen.tsx`.
- **RF-15 completo** (implementado el 25/11):
  - «Resultados por recinto» y su detalle muestran los votos por candidato de cada recinto y los totales generales, por dignidad (`ResultadosRecintosScreen.tsx` y `ResultadoRecintoScreen.tsx`);
  - el caso de uso `ObtenerResultadosPorRecinto` lee `actas` + `votos_acta` + `mesas.recinto_id` con `EscrutinioRepositoryImpl.votosPorActa`;
  - la regla pura `consolidarResultados` (`Escrutinio.ts`) suma por recinto y compara el total con `conteo_por_candidato`;
  - solo cuentan las actas aceptadas por el servidor mediante `sincronizar_acta` (versión vigente); las pendientes del teléfono y las versiones en conflicto no se suman.
- **Limitación:** Realtime solo avisa. Si un aviso se pierde (por ejemplo, con la app en segundo plano), la pantalla se actualiza al deslizar hacia abajo. No hay prueba de reconexión del canal.

## Verificación
- **Automática:**
  - `resultadosRecinto.test.ts` (8 pruebas): votos por recinto, totales generales, separación por dignidad, sin duplicados y recinto vacío.
  - `EscrutinioRepositoryImpl.votosPorActa.test.ts` (2 pruebas): solo se lee la tabla `actas` del servidor y la paginación no repite filas.
- **Pendiente:**
  - `npm run test:rls` (`supabase/tests/verificar-rls.mjs`), con 2 comprobaciones nuevas de votos por recinto todavía sin ejecutar;
  - probar el tablero en vivo con dos teléfonos;
  - probar la reconexión del canal.

## Uso de IA
La revisión con IA se hizo el 25/11/2026, después del consenso del 22/11.
- **ChatGPT** estuvo de acuerdo, con límites claros entre responsabilidades. Zustand no debe guardar copias de los datos del servidor y Realtime debe ser una señal, no una segunda base de datos. Pidió una tabla de «qué estado vive dónde» y pruebas de reconexión y aislamiento.
- **Gemini** la aprobó, advirtiendo el riesgo de duplicar estado. Señaló que las suscripciones WebSocket deben cerrarse en el *cleanup* para evitar fugas y pidió probar la reconexión tras el segundo plano.
- **Claude**, que participó en la redacción (no es un revisor independiente), comprobó que el canal se cierra en el *cleanup* y que Realtime solo invalida consultas, así que las dos advertencias ya se cumplen. RF-15 está implementado y probado de forma automática.

Las tres coinciden con la decisión.
- **Se aceptaron:** la tabla de responsabilidades (en «Consecuencias») y la prueba de reconexión (pendiente).
- No hubo recomendaciones descartadas.
