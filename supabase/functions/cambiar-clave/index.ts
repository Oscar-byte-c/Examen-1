// =============================================================================
// Edge Function: cambiar-clave (RF-02, RF-04 · ADR-01)
//
// Cambia la clave del usuario autenticado y BORRA la bandera debe_cambiar_clave de
// app_metadata. Solo el servidor puede escribir app_metadata; por eso este paso no se
// hace desde la app. Se usa en el primer ingreso y al restablecer la clave por enlace.
// =============================================================================
import { CLAVE_REGEX, ErrorControlado, clienteAdmin, json, manejar, usuarioQueLlama } from '../_shared/comun.ts';

Deno.serve((req) =>
  manejar(async () => {
    if (req.method !== 'POST') throw new ErrorControlado('metodo_no_permitido', 405);
    const admin = clienteAdmin();
    const usuario = await usuarioQueLlama(req, admin);
    // RF-03: sin correo verificado no se define la clave. Evita que quien creó la cuenta
    // (y conoce la clave temporal) la tome antes de que el titular confirme su correo.
    if (!usuario.email_confirmed_at) throw new ErrorControlado('correo_no_verificado', 403);

    const { clave } = (await req.json().catch(() => ({}))) as { clave?: unknown };
    if (typeof clave !== 'string' || !CLAVE_REGEX.test(clave)) throw new ErrorControlado('clave_debil');

    const { error } = await admin.auth.admin.updateUserById(usuario.id, {
      password: clave,
      app_metadata: { ...usuario.app_metadata, debe_cambiar_clave: false },
    });
    if (error) {
      const misma = /same|different/i.test(error.message);
      throw new ErrorControlado(misma ? 'clave_repetida' : 'error_cambio_clave', misma ? 400 : 502);
    }
    return json({ ok: true });
  }),
);
