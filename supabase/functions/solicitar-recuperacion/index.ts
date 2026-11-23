// =============================================================================
// Edge Function: solicitar-recuperacion (RF-04 · ADR-02)
//
// Envía el enlace de recuperación SOLO si el correo existe y está verificado.
// Siempre responde lo mismo, para no revelar qué correos están registrados.
// El límite de envíos lo aplica Supabase Auth (rate limit de correos).
// =============================================================================
import { ErrorControlado, clienteAdmin, json, manejar, redireccionPermitida } from '../_shared/comun.ts';

const TIEMPO_RESPUESTA_MS = 1500;

Deno.serve((req) =>
  manejar(async () => {
    if (req.method !== 'POST') throw new ErrorControlado('metodo_no_permitido', 405);
    const { correo, redirectTo } = (await req.json().catch(() => ({}))) as { correo?: unknown; redirectTo?: unknown };
    if (typeof correo !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo.trim())) {
      throw new ErrorControlado('correo_invalido');
    }
    const inicio = Date.now();
    const admin = clienteAdmin();
    const { data: verificado } = await admin.rpc('correo_verificado', { p_correo: correo });
    if (verificado === true) {
      await admin.auth.resetPasswordForEmail(correo.trim().toLowerCase(), {
        redirectTo: redireccionPermitida(redirectTo),
      });
    }
    // Tiempo de respuesta constante: medir cuánto tarda no revela si el correo existe.
    const espera = TIEMPO_RESPUESTA_MS - (Date.now() - inicio);
    if (espera > 0) await new Promise((r) => setTimeout(r, espera));
    return json({ ok: true });
  }),
);
