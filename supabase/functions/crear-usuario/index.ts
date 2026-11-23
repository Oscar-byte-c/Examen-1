// =============================================================================
// Edge Function: crear-usuario (RF-01, RF-02, RF-03, RF-07, RF-20 · ADR-01, ADR-02)
//
//   Coordinador provincial → crea coordinadores de recinto (un recinto sin coordinador).
//   Coordinador de recinto → crea veedores de SU recinto (incluso sustitutos externos).
//
// Flujo: valida quién llama → valida datos → invita por correo (enlace de verificación)
// → asigna clave temporal + bandera debe_cambiar_clave en app_metadata → crea el perfil.
// Si algo falla después de crear el usuario en Auth, se borra (no quedan cuentas a medias).
// =============================================================================
import {
  CLAVE_REGEX,
  ErrorControlado,
  cedulaValida,
  clienteAdmin,
  json,
  manejar,
  redireccionPermitida,
  usuarioQueLlama,
} from '../_shared/comun.ts';

type Cuerpo = {
  cedula?: string;
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  correo?: string;
  recintoId?: string;
  redirectTo?: string;
};

const NOMBRE_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' ]{2,60}$/;

/** Clave temporal aleatoria (criptográficamente segura) que cumple la política de claves. */
function generarClaveTemporal(): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digitos = '23456789';
  const todos = letras + digitos;
  const azar = crypto.getRandomValues(new Uint32Array(12));
  let clave = letras[azar[0] % letras.length] + digitos[azar[1] % digitos.length];
  for (let i = 2; i < azar.length; i++) clave += todos[azar[i] % todos.length];
  return clave;
}

Deno.serve((req) =>
  manejar(async () => {
    if (req.method !== 'POST') throw new ErrorControlado('metodo_no_permitido', 405);
    const admin = clienteAdmin();
    const llamante = await usuarioQueLlama(req, admin);
    if (llamante.app_metadata?.debe_cambiar_clave === true) throw new ErrorControlado('debe_cambiar_clave', 403);

    const { data: creador } = await admin
      .from('perfiles')
      .select('rol, recinto_id, activo')
      .eq('id', llamante.id)
      .maybeSingle();
    if (!creador?.activo) throw new ErrorControlado('sin_permiso', 403);

    const b = (await req.json().catch(() => ({}))) as Cuerpo;
    const cedula = String(b.cedula ?? '').trim();
    const nombres = String(b.nombres ?? '').trim().replace(/\s+/g, ' ');
    const apellidos = String(b.apellidos ?? '').trim().replace(/\s+/g, ' ');
    const telefono = String(b.telefono ?? '').trim();
    const correo = String(b.correo ?? '').trim().toLowerCase();

    if (!cedulaValida(cedula)) throw new ErrorControlado('cedula_invalida');
    if (!NOMBRE_REGEX.test(nombres) || !NOMBRE_REGEX.test(apellidos)) throw new ErrorControlado('nombre_invalido');
    if (!/^09\d{8}$/.test(telefono)) throw new ErrorControlado('telefono_invalido');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) throw new ErrorControlado('correo_invalido');

    // ---- Jerarquía (RF-01) y unicidad del coordinador (RF-07) ----
    let rolNuevo: 'coordinador_recinto' | 'veedor';
    let recintoId: string;
    if (creador.rol === 'coordinador_provincial') {
      rolNuevo = 'coordinador_recinto';
      recintoId = String(b.recintoId ?? '');
      const { data: recinto } = await admin.from('recintos').select('id').eq('id', recintoId).maybeSingle();
      if (!recinto) throw new ErrorControlado('recinto_invalido');
      const { count } = await admin
        .from('perfiles')
        .select('id', { count: 'exact', head: true })
        .eq('recinto_id', recintoId)
        .eq('rol', 'coordinador_recinto')
        .eq('activo', true);
      if ((count ?? 0) > 0) throw new ErrorControlado('recinto_con_coordinador', 409);
    } else if (creador.rol === 'coordinador_recinto') {
      rolNuevo = 'veedor';
      recintoId = creador.recinto_id; // siempre SU recinto: el cliente no lo decide
    } else {
      throw new ErrorControlado('sin_permiso', 403);
    }

    const { count: cedulasIguales } = await admin
      .from('perfiles')
      .select('id', { count: 'exact', head: true })
      .eq('cedula', cedula);
    if ((cedulasIguales ?? 0) > 0) throw new ErrorControlado('cedula_duplicada', 409);

    // ---- Alta en Auth: la invitación envía el ENLACE de verificación (RF-03) ----
    const { data: invitado, error: errInvitacion } = await admin.auth.admin.inviteUserByEmail(correo, {
      redirectTo: redireccionPermitida(b.redirectTo),
    });
    if (errInvitacion || !invitado.user) {
      const yaExiste = /already|registered|exists/i.test(errInvitacion?.message ?? '');
      throw new ErrorControlado(yaExiste ? 'correo_duplicado' : 'error_invitacion', yaExiste ? 409 : 502);
    }
    const nuevoId = invitado.user.id;

    try {
      const claveTemporal = generarClaveTemporal();
      if (!CLAVE_REGEX.test(claveTemporal)) throw new Error('clave temporal inválida');
      const { error: errClave } = await admin.auth.admin.updateUserById(nuevoId, {
        password: claveTemporal,
        app_metadata: { debe_cambiar_clave: true },
      });
      if (errClave) throw errClave;

      const { error: errPerfil } = await admin.from('perfiles').insert({
        id: nuevoId,
        cedula,
        nombres,
        apellidos,
        telefono,
        rol: rolNuevo,
        recinto_id: recintoId,
        creado_por: llamante.id,
      });
      if (errPerfil) throw new ErrorControlado(errPerfil.code === '23505' ? 'dato_duplicado' : 'error_perfil', 409);

      // La clave temporal se devuelve UNA vez a quien crea la cuenta. No se guarda ni se registra.
      return json({ id: nuevoId, rol: rolNuevo, claveTemporal }, 201);
    } catch (e) {
      await admin.auth.admin.deleteUser(nuevoId);
      throw e;
    }
  }),
);
