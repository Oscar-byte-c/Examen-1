# ADR-03: SQLite para la persistencia local y la sincronización sin conexión

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-14, RF-16, RNF-03, RNF-04, S-04 | `Documento_Consolidado_ADR.docx`, ficha ADR-03 |

## 1. Problema y contexto
En zonas rurales no hay señal al terminar el conteo; antes las actas se anotaban en papel y se perdían. El acta debe guardarse sin red, sobrevivir a cerrar la app o reiniciar el teléfono, poder corregirse y enviarse sola sin duplicarse.

## 2. Objetivo
Que ninguna acta se pierda ni se duplique por falta de señal.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **SQLite (expo-sqlite) + outbox + identificador de cliente** ✅ | Jairo Maigua | Datos relacionales; consultas por estado; persiste al cerrar o reiniciar; transacciones | Diseñar esquema y migraciones; no cifra | — (elegida) |
| AsyncStorage o MMKV (JSON) | Milka Borja | Rápido; poco código; sin dependencias nativas | Sin transacciones; hay que recorrer todo el JSON; escala mal | Un fallo podía dejar la cola inconsistente |
| WatermelonDB | Oscar Vázquez | Pensada para offline y sincronización | Configuración nativa compleja; curva alta | No cabía en el plazo |
| «React Database» (nombre del `.docx`) | Kevin Amagua | Modelo orientado a objetos | Dependencias extra; madurez con Expo sin verificar | Apuesta sin respaldo |

## 4. Decisión y justificación
SQLite con una tabla de salida (outbox); la foto se guarda como archivo local y su ruta queda en la base. Nada se borra de la cola hasta que el servidor confirma. Cada acta tiene versión, y si dos dispositivos la modifican, el servidor guarda ambas y decide el coordinador de recinto (S-04).
> **Nota de precisión (25/11/2026):** el `.docx` llama a SQLite «fuente de verdad». Es más exacto decir que es la fuente de verdad **de lo pendiente en el teléfono**; una vez enviada, la autoritativa es PostgreSQL (ADR-11).

## 5. Implementación real
- `src/data/datasources/local/baseDatos.ts`: tablas `actas_locales`, `outbox` (con `operacion_id`, `intentos`) y `cache` (mesas y candidatos).
- `ActaLocalDataSource.ts` (guardar, marcar estado, confirmar) · `ActaRepositoryImpl.ts` (envía la cola) · `dispositivo.ts` (`fotosLocales`: fotos en `Paths.document/actas`).
- En SQLite no hay claves ni tokens: la sesión y el perfil van en Secure Store.

## 6. Consecuencias
✔ Las actas no se pierden y cada una tiene un estado visible (por enviar, enviando, enviada, falló, en revisión).
✘ Esquema y migraciones propias.

## 7. Riesgos y limitaciones
- SQLite y las fotos **no están cifrados** (riesgo aceptado por el grupo): con un teléfono perdido y desbloqueado se podrían leer.
- **Verificado:** las fotos locales no se borran después del envío; se acumulan en el teléfono.
- **Verificado:** un acta «fallida» por un error no relacionado con la red sigue en la cola y, con conexión, se reintenta cada 60 s; no existe el estado «fallo definitivo» (ver ADR-10).
- No se encontró un mensaje específico de «poco almacenamiento», que el `.docx` menciona como necesario.

## 8. Pruebas y evidencias
- ✅ Indirectas: `reglas.test.ts` (validación antes de guardar) y `sesionLocal.test.ts` (7, identidad sin red).
- ⏳ Sin prueba automática de la outbox.
- ⏳ Manual pendiente: modo avión → sellar → cerrar y reabrir la app → reconectar → «Enviada».

## 9. Evaluación de las IA (revisión posterior del 25/11)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | De acuerdo; corregir «fuente de verdad» | Documentar estados, reintentos y confirmación del servidor |
| Gemini | Aprobado con corrección conceptual | Riesgo alto por fotos sin cifrar; limpiar archivos huérfanos |
| Claude* | De acuerdo | Confirmó que nada se borra antes de la confirmación y que no hay secretos en SQLite; **verificó** que las fotos no se limpian |

- **Acuerdo:** mantener SQLite; corregir el término «fuente de verdad».
- **Se incorpora:** las limitaciones verificadas (fotos sin cifrar, fotos que no se borran, reintentos sin estado definitivo).
- **Se rechaza por ahora:** cifrar con SQLCipher. Cambiaría una decisión aceptada por el grupo y no funciona en Expo Go; queda como mejora futura.

\* Claude no es independiente: redactó los ADR y conoció las otras dos evaluaciones.

## 10. Conclusión y preguntas de defensa
**Conclusión:** la elección es correcta para un acta estructurada sin señal; las debilidades son de limpieza y de cifrado local, no del motor.
- **¿Por qué no AsyncStorage?** No tiene transacciones: si falla a la mitad, la cola puede quedar a medias. SQLite guarda el acta y su envío pendiente juntos.
- **¿Cuándo se borra el acta del teléfono?** Sale de la cola solo cuando el servidor confirma. La foto queda en el teléfono.
- **¿Está cifrado?** La sesión sí (Secure Store). SQLite no: es una limitación aceptada por el grupo y no guarda claves.
