# ADR-02: Supabase + SMTP personalizado para la verificación del correo y la recuperación de la clave

| Estado | Fecha de la decisión | Requisitos | Fuente |
|---|---|---|---|
| Aceptado por el grupo | 22/11/2026 | RF-01, RF-03, RF-04, RNF-02 | `Documento_Consolidado_ADR.docx`, ficha ADR-02 |

## 1. Problema y contexto
Como la cuenta la crea otra persona, hay que confirmar que el correo existe y es del titular. Los enlaces deben ser únicos, de un solo uso y con expiración, y la recuperación solo debe existir para correos verificados. Muchos veedores no saben recuperar su clave y llamaban al coordinador.

## 2. Objetivo
Verificación y recuperación autónomas y seguras, sin programar tokens propios.

## 3. Alternativas del grupo y motivos de descarte
| Alternativa | Propuesta por | Ventajas | Desventajas | Por qué se descartó |
|---|---|---|---|---|
| **Supabase + SMTP personalizado** ✅ | Jairo Maigua | Envía verificación y recuperación sin código extra; tokens de un solo uso con vida limitada | Plantilla poco personalizable; hay que validar el flujo con la clave temporal | — (elegida) |
| Firebase Authentication | Kevin Amagua | Auth, Firestore y Cloud Storage integrados con React Native | NoSQL: las consultas relacionales son complejas e incómodas | El sistema es relacional |

## 4. Decisión y justificación
Supabase con SMTP propio: enlaces únicos con expiración, verificación antes del ingreso y recuperación solo para correos verificados. Los correos salen del dominio de la organización con plantillas en español, y las credenciales SMTP están solo en la configuración del servicio (RNF-02).
> **Nota de precisión (25/11/2026):** el enlace reemplazó al código OTP de la línea base anterior (ADR_LINEA_BASE §4.8). La cuenta se crea primero y se invita al final, porque asignar la clave después de invitar invalidaba el enlace (ADR-C02 §2).

## 5. Implementación real
- **Código:** Edge Functions `crear-usuario` (crea e invita) y `solicitar-recuperacion` (envía el enlace solo si el correo está verificado; misma respuesta y tiempo constante de 1,5 s) · RPC `public.correo_verificado` (solo `service_role`) · pantallas `app/correo-verificado.tsx`, `recuperar-clave.tsx`, `restablecer-clave.tsx` · esquema `controlelectoral://`.
- **Configuración fuera del código:** SMTP (Gmail) y plantillas en el panel de Supabase; *Redirect URLs*.

## 6. Consecuencias
✔ Flujo probado por el proveedor; la sesión del coordinador no se interrumpe al crear cuentas.
✘ Más pruebas; dependencia del correo; sin internet no se envían correos.

## 7. Riesgos y limitaciones
- El correo puede llegar a spam; el SMTP gratuito tiene cuotas.
- Si el esquema o la *Redirect URL* están mal, el enlace abre el navegador en vez de la app (pasó en Expo Go con `exp://`). Antes de entregar se quitan `PERMITIR_EXPO_GO` y la URL `exp://`.

## 8. Pruebas y evidencias
- 🟡 Manual: SMTP (Gmail) y recuperación por enlace comprobados por el estudiante **en el APK**, sin registro adjunto.
- ⏳ Sin pruebas automáticas. Pendientes: enlace vencido o reutilizado, correo no verificado y correo inexistente con la misma respuesta.

## 9. Evaluación de las IA (revisión posterior del 25/11)
| IA | Postura | Aporte principal |
|---|---|---|
| ChatGPT | De acuerdo, condicionado a la configuración | Separar la configuración del panel del código versionado; probar enlaces vencidos y reutilizados |
| Gemini | Aprobado con alertas operativas | El punto de fallo en Android es que el enlace abra la app y no el navegador; documentar la expiración y las cuotas SMTP |
| Claude* | De acuerdo | Confirmó en `solicitar-recuperacion` la respuesta genérica y el tiempo constante |

- **Acuerdo:** mantener; generar tokens propios sería más riesgoso.
- **Se incorpora:** la separación código/configuración (sección 5) y el riesgo de los enlaces en Android (sección 7).
- **Alternativa señalada por las IA (no evaluada por el grupo):** tokens y correos propios. Ambas la desaconsejan por el riesgo y el plazo.

\* Claude no es independiente: redactó los ADR y conoció las otras dos evaluaciones.

## 10. Conclusión y preguntas de defensa
**Conclusión:** se mantiene. La parte crítica es la configuración (SMTP y URLs), que está fuera del código y se comprobó manualmente.
- **¿Por qué enlace y no OTP?** Supabase genera el enlace, que es de un solo uso y expira; no tuvimos que programar ni guardar códigos.
- **¿Por qué solo para correos verificados?** Si no, alguien podría pedir la recuperación de un correo que no es suyo.
- **¿Cómo no revelan si un correo existe?** La función responde siempre lo mismo y tarda lo mismo.
- **¿Dónde está la clave del SMTP?** En el panel de Supabase, nunca en la app ni en el repositorio.
