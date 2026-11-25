# ADR-07: Zustand + TanStack Query + Supabase Realtime para el estado y el conteo en vivo

| Dato | Detalle |
|---|---|
| Estado | **Aceptado** por consenso del equipo (reunión del 22/11/2026) |
| Fuente | `docs/Documento_Consolidado_ADR.docx`, ficha ADR-07 |
| Requerimientos relacionados | RF-14, RF-15, RF-16, RNF-05 |
| Minuto del video | No registrado en el documento grupal |

## 1. Contexto y problema

La app maneja la sesión, el rol, la conectividad, la cola sin conexión y el tablero de avance y conteo en tiempo real. El coordinador provincial necesita ver el avance por recinto y el conteo por candidato **mientras llegan las actas**, sin recargar la pantalla. Si cada cambio redibuja toda la pantalla, la app se vuelve lenta en celulares de gama baja.

## 2. Decisión

- **Zustand** para el estado local: sesión, rol, conexión y estado de la cola sin conexión.
- **TanStack Query** para los datos del servidor, conectado a los **casos de uso del dominio**.
- **Supabase Realtime** para refrescar en vivo el avance por recinto y el conteo.

## 3. Alternativas consideradas

| Alternativa | Propuesta por | Ventajas | Desventajas o limitaciones |
|---|---|---|---|
| **Zustand + TanStack Query + Supabase Realtime** ✅ | Milka Borja | Poco código y fácil de mantener. TanStack Query ya maneja carga, éxito y error. Un evento de Realtime solo refresca las consultas del conteo, sin trabar la UI | Hay que tener clara la división entre lo que va en Zustand y lo que maneja TanStack Query |
| Redux Toolkit (RTK + RTK Query) | Oscar Vázquez | Muy estructurado y conocido | Demasiado código repetitivo para el tiempo de desarrollo individual |
| Solo React Context API | Kevin Amagua | No requiere librerías extra | Muchos redibujados innecesarios en listas y gráficos en vivo; caché y reintentos manuales |

## 4. Justificación

- Separa dos tipos de estado distintos: el **local** (Zustand) y el **del servidor** (TanStack Query, con caché y estados de carga).
- Realtime cumple el «exit poll en tiempo real» del enunciado: el tablero se actualiza solo y **sin redibujar toda la pantalla**.

## 5. Consecuencias

**Positivas**
- Interfaz fluida y estados claros de carga y error.

**Negativas / obligaciones**
- Las suscripciones de Realtime deben **encapsularse detrás de los repositorios** para no romper Clean Architecture.
- Hay que **cerrar las conexiones** al cerrar sesión.

## 6. Relación con el examen

- **Rúbrica:** «Gestión del territorio y seguimiento del escrutinio» (1,6 pts) y «manejo del estado» dentro de «Organización del código» (1,2 pts).
- **Enunciado, sección «Seguimiento del escrutinio».**

## 7. Evidencia de implementación

| Qué | Dónde |
|---|---|
| Estado de conexión y cola (Zustand) | `src/presentation/store/syncStore.ts` |
| Consultas del servidor (TanStack Query) | `src/presentation/hooks/consultas.ts`, `src/presentation/store/queryClient.ts` |
| Suscripción Realtime encapsulada en un repositorio y cerrada con `removeChannel` | `src/data/repositories/EscrutinioRepositoryImpl.ts`, caso de uso `SuscribirseEscrutinio` |
| Agregados del tablero | RPC `public.avance_por_recinto` y `public.conteo_por_candidato` |
| Tablero en vivo | `src/presentation/screens/coordinador-provincial/CoordinadorProvincialHomeScreen.tsx` |
| Votos por candidato por recinto y en total (RF-15) | Caso de uso `ObtenerResultadosPorRecinto` → regla pura `consolidarResultados` (`src/domain/entities/Escrutinio.ts`); `EscrutinioRepositoryImpl.votosPorActa`; pantallas `ResultadosRecintosScreen.tsx` y `ResultadoRecintoScreen.tsx`; pruebas `resultadosRecinto.test.ts` y `EscrutinioRepositoryImpl.votosPorActa.test.ts` |

**RF-15 completo (25/11):** el enunciado pide los votos de cada candidato «por recinto y en total».
- **Entrada:** botón «Resultados por recinto» en el tablero provincial → resultados generales (con selector Alcaldía / Prefectura) y lista de recintos → detalle de cada recinto con las dos dignidades: votos por candidato, total de válidos y total del recinto (sufragantes = válidos + blancos + nulos). Desde el detalle se abren «Mesas e historial» (S-04).
- **Por recinto:** se leen las actas del servidor con sus votos (`actas` + `votos_acta` + `mesas.recinto_id`) y se suman por recinto, dignidad y candidato.
- **Totales generales:** suma de los recintos; se comparan con `conteo_por_candidato` y la pantalla indica si coinciden.
- **Estado válido:** solo las actas de la tabla `actas` del servidor, que son la versión vigente aceptada por `sincronizar_acta` (una por mesa y dignidad). Las pendientes del celular y las versiones en `actas_conflictos` no se cuentan. Cada acta se cuenta una sola vez y solo los votos de candidatos de su dignidad.
- **Permisos:** lectura con la sesión del usuario (RLS, ADR-11); dos comprobaciones nuevas en `verificar-rls.mjs` (recinto y veedor no reciben votos ajenos). Sin migraciones.
- Pendiente: `npm run test:rls` y prueba manual en teléfonos.
