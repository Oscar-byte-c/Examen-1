# ADR-06: Expo Router para la navegación por roles

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-01, RF-02, RF-18, RNF-05, RNF-07 | `Documento_Consolidado_ADR.docx`, ficha ADR-06 · complemento: ADR-C01 |

## 1. Problema y contexto
Tres perfiles con pantallas distintas, un cambio de clave obligatorio en el primer ingreso y usuarios mayores que necesitan una navegación predecible y un botón atrás confiable.

## 2. Objetivo
Que cada rol llegue solo a sus pantallas y que nadie quede atrapado en una pantalla sin salida.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **Expo Router** ✅ | Kevin Amagua | Incluido en Expo; grupos de rutas por rol; facilita redirigir según rol o cambio de clave | Todo lo que está en `app/` es una ruta: el código de las capas debe ir fuera | — (elegida) |
| React Navigation configurado a mano | Kevin Amagua | Control explícito de cada stack en TypeScript | Más paquetes y configuración; rutas menos visibles | Repite lo que Expo ya resuelve |

## 4. Decisión y justificación
Expo Router con rutas separadas por rol. La redirección inicial depende de tres datos: si hay sesión, cuál es el rol y si ya se cambió la clave temporal.
> **Nota de precisión (25/11/2026):** Expo Router usa React Navigation por dentro; no hay dos sistemas (ADR-C01). Los guards protegen la **navegación**, no los datos: los datos los protege la RLS (ADR-11).

## 5. Implementación real
- `app/_layout.tsx`: `Stack.Protected` en el orden sesión → clave temporal → rol.
- Grupos `app/coordinador-provincial/`, `app/coordinador-recinto/` y `app/veedor/`, más las rutas de acceso (`login`, `cambiar-clave`, `recuperar-clave`, `restablecer-clave`, `correo-verificado`).
- `src/presentation/navigation/RedireccionInicial.tsx` · cada ruta de `app/` re-exporta su pantalla de `src/presentation/screens` en una línea.

## 6. Consecuencias
✔ Navegación clara por rol, sin librerías extra.
✘ Exige disciplina para no poner lógica dentro de `app/`.

## 7. Riesgos y limitaciones
- Las rutas tipadas se regeneran con el servidor de desarrollo; si se olvida, TypeScript marca rutas nuevas como inválidas.
- Un guard solo oculta pantallas: si la RLS fallara, la API seguiría expuesta. Por eso la seguridad real está en el servidor.

## 8. Pruebas y evidencias
- ⏳ Sin pruebas automáticas.
- ⏳ Manual pendiente: entrar con los 3 roles, botón atrás, cambio de clave obligatorio y abrir la app con la sesión vencida.

## 9. Evaluación de las IA (revisión posterior del 25/11)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | De acuerdo | Tratar ADR-C01 como aclaración del ADR-06; una matriz rol–ruta |
| Gemini | Aprobado con delimitación de capas | `app/` sin lógica de negocio; pruebas de URL directa y de «atrás» tras cerrar sesión |
| Claude* | De acuerdo | Confirmó los guards en `app/_layout.tsx` y que `app/` solo re-exporta pantallas |

- **Acuerdo:** mantener; los guards no son seguridad.
- **Errores de las IA:**
  - Gemini menciona grupos `(admin)`, `(veedor)` y `(auditor)`, que **no existen**: los reales son `coordinador-provincial`, `coordinador-recinto` y `veedor`.
  - Ambas hablan de un «acuerdo inicial de React Navigation». Lo tomaron del ADR-C01, que cita un acuerdo **anterior** al documento grupal del 22/11; el `.docx` eligió Expo Router. Se recomienda actualizar esa frase en el ADR-C01.
- **Se incorpora:** la matriz rol–ruta como pendiente de documentar.

\* Claude no es independiente: redactó los ADR y conoció las otras dos evaluaciones.

## 10. Conclusión y preguntas de defensa
**Conclusión:** se mantiene; falta probar manualmente los tres roles.
- **¿Expo Router reemplaza a React Navigation?** No; lo usa por dentro. Solo cambia la forma de declarar las rutas: por archivos.
- **¿Los guards dan seguridad?** No; solo ordenan la navegación. Los datos los protege la RLS en el servidor.
- **¿Dónde está la lógica?** En `src/` (domain, data y presentation); `app/` solo tiene rutas de una línea y los layouts con los guards.
