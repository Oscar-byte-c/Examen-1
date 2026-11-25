# ADR-07: Zustand + TanStack Query + Supabase Realtime para el estado y el conteo en vivo

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-14, RF-15, RF-16, RNF-05 | `Documento_Consolidado_ADR.docx`, ficha ADR-07 |

## 1. Problema y contexto
La app maneja la sesión, el rol, la conexión, la cola sin red y un tablero que cambia mientras llegan las actas. En teléfonos de gama baja no puede redibujarse toda la pantalla con cada cambio.

## 2. Objetivo
Separar el estado local del estado del servidor y actualizar el conteo en vivo sin recargar la pantalla.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **Zustand + TanStack Query + Realtime** ✅ | Milka Borja | Poco código; carga, éxito y error ya resueltos; Realtime refresca solo lo necesario | Hay que dividir bien qué va en cada uno | — (elegida) |
| Redux Toolkit (RTK + RTK Query) | Oscar Vázquez | Muy estructurado y conocido | Demasiado código repetitivo | No cabía en el tiempo de desarrollo individual |
| Solo React Context | Kevin Amagua | Sin librerías | Redibujados innecesarios; caché y reintentos a mano | Lento en listas y gráficos en vivo |

## 4. Decisión y justificación
Zustand para la sesión, el rol, la conexión y la cola sin red; TanStack Query para los datos del servidor, conectado a los casos de uso del dominio; Realtime para refrescar en vivo el avance y el conteo.
> **Nota de implementación (25/11/2026):** RF-15 quedó completo con «Resultados por recinto»: votos por candidato de cada recinto y totales generales, comparados con el conteo del servidor.

## 5. Implementación real
- **Zustand:** `src/presentation/store/syncStore.ts` (conexión y cola) y `authStore.ts` (sesión).
- **TanStack Query:** `src/presentation/hooks/consultas.ts` y `store/queryClient.ts`.
- **Realtime:** `EscrutinioRepositoryImpl.suscribirCambios`, un canal sobre `actas` y `actas_conflictos` que se cierra con `removeChannel`; `useEscrutinioEnVivo` agrupa los eventos y **solo invalida consultas**.
- **RF-15:** regla pura `consolidarResultados` (`src/domain/entities/Escrutinio.ts`), caso de uso `ObtenerResultadosPorRecinto` y pantallas `ResultadosRecintosScreen.tsx` y `ResultadoRecintoScreen.tsx`.

## 6. Consecuencias
✔ Interfaz fluida y estados claros de carga y error.
✘ Tres herramientas que coordinar.

## 7. Riesgos y limitaciones
- Realtime solo avisa: los datos se vuelven a pedir pasando por la RLS. Si el aviso se pierde (por ejemplo, con la app en segundo plano), la pantalla se actualiza al deslizar hacia abajo.
- No hay prueba de reconexión del canal.

## 8. Pruebas y evidencias
- ✅ Automatizadas: `resultadosRecinto.test.ts` (8) · `EscrutinioRepositoryImpl.votosPorActa.test.ts` (2).
- ⏳ `npm run test:rls`: 2 comprobaciones nuevas de votos por recinto, sin ejecutar.
- ⏳ Manual: tablero en vivo con 2 teléfonos.

## 9. Evaluación de las IA (revisión posterior del 25/11)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | De acuerdo, con límites claros | Una tabla de «qué estado vive dónde»; probar reconexión y aislamiento |
| Gemini | Aprobado con riesgo de duplicidad | Realtime solo como disparador de invalidación; cerrar los canales en el *cleanup* |
| Claude* | De acuerdo | Verificó que el canal se cierra en el *cleanup* del hook y que Realtime solo invalida consultas: las dos advertencias ya se cumplen |

- **Acuerdo:** mantener; Zustand no debe guardar copias de los datos del servidor.
- **Qué vive dónde:** Zustand → sesión, rol, conexión y cola · TanStack Query → todo lo que viene del servidor · SQLite → actas pendientes (ADR-03).
- **Pendiente:** la prueba de reconexión.

\* Claude no es independiente: redactó los ADR y conoció las otras dos evaluaciones.

## 10. Conclusión y preguntas de defensa
**Conclusión:** se mantiene; la división de responsabilidades ya se respeta en el código.
- **¿Qué guarda Zustand y qué TanStack Query?** Zustand, la sesión, el rol, la conexión y la cola; TanStack Query, todo lo que viene del servidor, con caché.
- **¿Cómo se actualiza el tablero solo?** Realtime avisa que cambió un acta y TanStack Query vuelve a pedir solo esas consultas.
- **¿Cómo calculan los votos por recinto?** Se leen las actas del servidor con sus votos, se suman por recinto y candidato, y el total general es la suma de los recintos, comparada con el conteo del servidor.
