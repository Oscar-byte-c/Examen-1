# Resumen comparativo de las tres revisiones con IA (25/11/2026)

> Revisión **posterior** a la decisión grupal del 22/11/2026; no es el debate que llevó a elegir las tecnologías.
> **ChatGPT** (PDF, 13 documentos, sin el código) · **Gemini** (PDF, 13 documentos y la revisión de ChatGPT, sin el código ni el `.docx`) · **Claude** (con el código; **no independiente**: redactó los ADR y conoció las dos evaluaciones anteriores). Revisión adicional: OpenCode con DeepSeek, solo ADR-11.

## 1. Veredicto por ADR

| ADR | ChatGPT | Gemini | Claude | ¿Se cambia la decisión? |
|---|---|---|---|---|
| 01 Supabase Auth | De acuerdo con precisiones | Aprobado con reservas (JWT de 1 h) | De acuerdo | No |
| 02 SMTP y enlaces | De acuerdo, condicionado | Aprobado con alertas (enlaces en Android) | De acuerdo | No |
| 03 SQLite | De acuerdo; corregir «fuente de verdad» | Aprobado con corrección conceptual | De acuerdo | No |
| 04 Cámara y GPS | De acuerdo; validar con datos reales | Observado técnicamente | De acuerdo | No |
| 05 Sentry | **Parcialmente** de acuerdo | **Parcialmente** de acuerdo | De acuerdo con correcciones | No; se matiza «la única» |
| 06 Expo Router | De acuerdo | Aprobado | De acuerdo | No |
| 07 Estado y Realtime | De acuerdo | Aprobado con riesgo de duplicidad | De acuerdo | No |
| 08 React Hook Form | De acuerdo; completar tabla | Aprobado con deuda documental | De acuerdo | No |
| 09 Zod | De acuerdo | Aprobado con advertencia de frontera | De acuerdo | No |
| 10 NetInfo + cola | De acuerdo | Aprobado con mejoras de resiliencia | De acuerdo con matices | No; hay mejoras pendientes |
| 11 PostgreSQL + RLS | De acuerdo (de las mejor justificadas) | Aprobado (pilar central) | De acuerdo | No |

**Ninguna de las tres IA propone cambiar una decisión del grupo.** Todas las observaciones son de precisión, de riesgos o de evidencia.

## 2. Acuerdos de las tres
1. La seguridad real está en el servidor (RLS, RPC y Edge Functions); los guards de navegación y Zod son controles de experiencia de usuario.
2. SQLite es la fuente **local** de lo pendiente; la autoritativa es PostgreSQL.
3. «Sentry es la única opción» es una afirmación absoluta: se matiza.
4. La nitidez no es OCR y la precisión del GPS es una estimación.
5. Tener red no significa que el servidor responda.
6. Falta evidencia reproducible: log de `test:rls`, pruebas en el teléfono y matriz rol–acción.

## 3. Desacuerdos y errores detectados (verificados contra el código)
| Tema | Quién | Qué dijo | Qué muestra el código | Resultado |
|---|---|---|---|---|
| `beforeSend` en Sentry | Gemini | Falta y se pueden filtrar cédulas | `MonitoreoSentry.ts` tiene `beforeSend` y `beforeBreadcrumb` con filtro | **Error de Gemini** |
| `search_path` de las RPC | Gemini | Usar `public, privado` | Se usa `''` (vacío), que es más estricto | **Se rechaza** la sugerencia |
| Grupos de rutas | Gemini | `(admin)`, `(veedor)`, `(auditor)` | `coordinador-provincial`, `coordinador-recinto`, `veedor` | **Error de Gemini** |
| Las invariantes se replican en `CHECK` | Gemini | «Restricciones SQL» | La suma la valida la RPC `validar_acta`; la tabla solo tiene `check (>= 0)` | **Inexacto** |
| JWT de 1 h y usuarios desactivados | Gemini | Riesgo de acceso | `mi_rol()` revisa `perfiles.activo` en cada consulta | **Ya mitigado** |
| Reintentos ante errores permanentes | Gemini | Posibles bucles | Un acta fallida se reintenta **cada 60 s** con conexión y cada fallo va a Sentry | **Válido: mejora pendiente** |
| Archivos de fotos huérfanos | Gemini | Limpiar | Las fotos no se borran tras el envío | **Válido: limitación** |
| «Acuerdo de React Navigation» | ChatGPT y Gemini | Contradicción con Expo Router | Viene del ADR-C01, que cita un acuerdo **anterior** al `.docx`; el grupo eligió Expo Router | El texto del ADR-C01 está **desactualizado** |
| Tabla de RHF en el `.docx` | ChatGPT y Gemini | «Incompleta» o «truncada» | La fila de RHF **copia** el texto del ADR-07 | Precisión menor |
| «La base impide sumas imposibles» | DeepSeek y ChatGPT | Exagera | La suma la valida la RPC | **Válido**: nota de precisión en ADR-11 |

## 4. Recomendaciones
**Se incorporan en los ADR (sin cambiar decisiones):** notas de precisión en ADR-01, 03, 04, 05, 06, 09, 10 y 11 · limitaciones verificadas (fotos sin cifrar y no borradas, reintentos cada 60 s, sin *backoff*, umbral sin calibrar, *mock location*) · separar la configuración del panel del código (ADR-02) · tabla de «qué estado vive dónde» (ADR-07).

**Se rechazan o se posponen, con motivo:**
- `search_path = public, privado`: el actual es más seguro.
- SQLCipher: cambiaría una decisión aceptada por el grupo y no funciona en Expo Go.
- Separar ADR-C02 en varios ADR: alto riesgo de inconsistencia antes de la defensa; basta con clasificar sus secciones.
- Agregar las alternativas de las IA a la tabla del grupo: se listan aparte como «no evaluadas por el grupo».

## 5. Lo que todavía necesita evidencia
| Pendiente | Cómo cerrarlo |
|---|---|
| Log reproducible de `npm run test:rls` (27 + 5 comprobaciones) | Ejecutarlo y guardar la salida con fecha |
| Ingreso, guards y cambio de clave con los 3 roles | Prueba manual en el teléfono |
| Outbox e idempotencia (modo avión, reenvío) | Prueba manual; prueba automática futura |
| Cierre nativo y reenvío sin red de Sentry | Prueba con el APK |
| Umbral de nitidez con fotos reales | 10 legibles y 10 borrosas |
| Enlaces vencidos o reutilizados (ADR-02) | Prueba manual |
| Diagrama ER y matriz rol × acción × tabla | Documentación |
| *Backoff* y estado «fallo definitivo» en la cola | Mejora de código (no aplicada) |
