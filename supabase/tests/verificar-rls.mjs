// =============================================================================
// Pruebas de seguridad (RLS, RPC y Storage) contra el proyecto Supabase REAL.
// Simula lo que podría hacer cualquiera que extraiga la publishable key del APK:
// usa la API directamente, sin pasar por la interfaz de la app (RF-18, ADR-11).
//
// Ejecutar:  npm run test:rls
// Requiere:  .env (URL + publishable key), .env.test.local (clave de los usuarios de prueba)
//            y el seed aplicado (npm run db:push).
// No imprime credenciales. Sale con código 1 si alguna verificación falla.
// =============================================================================
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const clave = process.env.PRUEBA_CLAVE_USUARIOS;

if (!url || !key || !clave) {
  console.error('Faltan variables: revisa .env y .env.test.local (ver .env.test.example).');
  process.exit(1);
}

const nuevoCliente = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let fallos = 0;
const check = (ok, descripcion, detalle = '') => {
  console.log(`${ok ? '✅ PASA' : '❌ FALLA'}  ${descripcion}${detalle ? `  (${detalle})` : ''}`);
  if (!ok) fallos++;
};

async function entrar(correo) {
  const sb = nuevoCliente();
  const { data, error } = await sb.auth.signInWithPassword({ email: correo, password: clave });
  if (error) throw new Error(`No se pudo iniciar sesión con ${correo.split('@')[0]}: ${error.message}`);
  return { sb, uid: data.user.id };
}

// ---- 1. Acceso anónimo -------------------------------------------------------
{
  const sb = nuevoCliente();
  const { data, error } = await sb.auth.signUp({ email: `intruso.${Date.now()}@example.com`, password: 'Intruso-123456' });
  check(Boolean(error) && !data.user, 'Registro público deshabilitado (signUp rechazado)', error?.message ?? 'se creó un usuario');
  for (const tabla of ['perfiles', 'recintos', 'mesas', 'actas', 'candidatos']) {
    const r = await sb.from(tabla).select('id').limit(1);
    check(Boolean(r.error) || r.data.length === 0, `Anónimo no lee ${tabla}`, r.error ? r.error.code : `${r.data.length} filas`);
  }
}

const provincial = await entrar('provincial.prueba@example.com');
const recinto = await entrar('recinto.prueba@example.com');
const veedor = await entrar('veedor.prueba@example.com');

// ---- 2. Perfiles ---------------------------------------------------------------
for (const [nombre, u] of Object.entries({ provincial, recinto, veedor })) {
  const { error: errUpd } = await u.sb.from('perfiles').update({ rol: 'coordinador_provincial' }).eq('id', u.uid);
  check(Boolean(errUpd), `[${nombre}] no puede cambiar su rol`, errUpd?.code ?? 'UPDATE permitido');
  const { error: errIns } = await u.sb.from('perfiles').insert({
    id: u.uid, cedula: '1710034065', nombres: 'x', apellidos: 'x', telefono: '0999999999', rol: 'veedor',
  });
  check(Boolean(errIns), `[${nombre}] no puede insertar perfiles`, errIns?.code ?? 'INSERT permitido');
}
{
  const v = await veedor.sb.from('perfiles').select('id');
  check(v.data?.length === 1 && v.data[0].id === veedor.uid, '[veedor] solo ve su propio perfil', `${v.data?.length} fila(s)`);
  const r = await recinto.sb.from('perfiles').select('id, rol');
  check(r.data?.every((p) => p.id === recinto.uid || p.rol === 'veedor'), '[recinto] solo ve su perfil y sus veedores');
  check(!r.data?.some((p) => p.rol === 'coordinador_provincial'), '[recinto] no ve al coordinador provincial');
}

// ---- 3. Territorio y aislamiento por ámbito (RF-18) ------------------------------
{
  const p = await provincial.sb.from('recintos').select('id');
  check((p.data?.length ?? 0) >= 5, '[provincial] ve todos los recintos de su jurisdicción', `${p.data?.length}`);
  const r = await recinto.sb.from('recintos').select('id');
  check(r.data?.length === 1, '[recinto] solo ve su recinto', `${r.data?.length}`);
  const rm = await recinto.sb.from('mesas').select('id, recinto_id');
  check(rm.data?.length > 0 && rm.data.every((m) => m.recinto_id === r.data[0].id), '[recinto] solo ve las mesas de su recinto', `${rm.data?.length}`);
  const vm = await veedor.sb.from('mesas').select('id');
  check(vm.data?.length === 2, '[veedor] solo ve sus 2 mesas asignadas', `${vm.data?.length}`);
}

// ---- 4. Escrituras solo por funciones del servidor -------------------------------
{
  const { data: mesas } = await veedor.sb.from('mesas').select('id');
  const mesaPropia = mesas?.[0]?.id;
  const ins = await veedor.sb.from('actas').insert({ id: crypto.randomUUID(), mesa_id: mesaPropia, dignidad: 'alcaldia' });
  check(Boolean(ins.error), '[veedor] no puede insertar actas directamente (solo por RPC)', ins.error?.code ?? 'INSERT permitido');

  const cr = await veedor.sb.rpc('crear_recinto', { p: { nombre: 'Intruso', direccion: 'x', parroquia: 'x', latitud: 0, longitud: 0, numero_mesas: 1 } });
  check(cr.error?.code === '42501', '[veedor] no puede crear recintos', cr.error?.code ?? 'permitido');

  const asg = await veedor.sb.rpc('asignar_mesa', { p_mesa: mesaPropia, p_veedor: veedor.uid });
  check(asg.error?.code === '42501', '[veedor] no puede asignar mesas', asg.error?.code ?? 'permitido');

  const sync = await provincial.sb.rpc('sincronizar_acta', {
    p_operacion_id: crypto.randomUUID(),
    p_acta: { id: crypto.randomUUID(), mesa_id: mesaPropia, dignidad: 'alcaldia' },
  });
  check(sync.error?.code === '42501', '[provincial] no puede modificar actas (ADR-11)', sync.error?.code ?? 'permitido');

  // Mesa de OTRO recinto: el veedor no puede escribir ni subir fotos ahí.
  const { data: ajena } = await provincial.sb.from('mesas').select('id, recinto_id').neq('id', mesaPropia).limit(50);
  const { data: recVeedor } = await veedor.sb.from('recintos').select('id');
  const mesaAjena = ajena?.find((m) => m.recinto_id !== recVeedor?.[0]?.id)?.id;
  const syncAjena = await veedor.sb.rpc('sincronizar_acta', {
    p_operacion_id: crypto.randomUUID(),
    p_acta: { id: crypto.randomUUID(), mesa_id: mesaAjena, dignidad: 'alcaldia' },
  });
  check(syncAjena.error?.code === '42501', '[veedor] no puede registrar actas de una mesa ajena', syncAjena.error?.code ?? 'permitido');

  const foto = await veedor.sb.storage
    .from('actas-fotos')
    .upload(`${mesaAjena}/${crypto.randomUUID()}/prueba.jpg`, new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { contentType: 'image/jpeg' });
  check(Boolean(foto.error), '[veedor] no puede subir fotos a una mesa ajena', foto.error?.message ?? 'subida permitida');

  // Validación matemática en el servidor (S-03): una suma imposible se rechaza aunque el cliente la envíe.
  const { data: cands } = await veedor.sb.from('candidatos').select('id').eq('dignidad', 'alcaldia');
  const mala = await veedor.sb.rpc('sincronizar_acta', {
    p_operacion_id: crypto.randomUUID(),
    p_acta: {
      id: crypto.randomUUID(), mesa_id: mesaPropia, dignidad: 'alcaldia', version_base: 0,
      total_sufragantes: 10, votos_blancos: 0, votos_nulos: 0,
      votos: (cands ?? []).map((c) => ({ candidato_id: c.id, votos: 50 })),
      foto_path: 'x', latitud: 0, longitud: 0, precision_gps_m: 5, capturada_en: new Date().toISOString(),
    },
  });
  check(mala.error?.code === '22023', 'El servidor rechaza un acta matemáticamente imposible', mala.error?.code ?? 'aceptada');

  const conf = await veedor.sb.from('actas_conflictos').select('id');
  check(Boolean(conf.error) || conf.data.length === 0, '[veedor] no ve conflictos (solo coordinadores)');
}

for (const u of [provincial, recinto, veedor]) await u.sb.auth.signOut();
console.log(fallos === 0 ? '\nResultado: TODAS las verificaciones pasaron.' : `\nResultado: ${fallos} verificación(es) FALLARON.`);
process.exit(fallos === 0 ? 0 : 1);
