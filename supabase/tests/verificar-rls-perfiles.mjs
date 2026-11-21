// =============================================================================
// Prueba de seguridad de `public.perfiles` contra el proyecto Supabase REAL.
// Simula lo que podría hacer cualquiera que extraiga la publishable key del APK.
//
// Ejecutar:  npm run test:rls
// Requiere:  .env (URL + publishable key) y .env.test.local (clave de los usuarios de prueba).
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

const USUARIOS = [
  { correo: 'provincial.prueba@example.com', rol: 'coordinador_provincial' },
  { correo: 'recinto.prueba@example.com', rol: 'coordinador_recinto' },
  { correo: 'veedor.prueba@example.com', rol: 'veedor' },
];

const nuevoCliente = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let fallos = 0;
const check = (ok, descripcion, detalle = '') => {
  console.log(`${ok ? '✅ PASA' : '❌ FALLA'}  ${descripcion}${detalle ? `  (${detalle})` : ''}`);
  if (!ok) fallos++;
};

// 1. Registro público deshabilitado
{
  const sb = nuevoCliente();
  const { data, error } = await sb.auth.signUp({
    email: `intruso.${Date.now()}@example.com`,
    password: 'Intruso-123456',
  });
  check(Boolean(error) && !data.user, 'Registro público deshabilitado (signUp rechazado)', error?.message ?? 'se creó un usuario');
}

// 2. Usuario anónimo no puede leer perfiles
{
  const { data, error } = await nuevoCliente().from('perfiles').select('id');
  check(Boolean(error) || data.length === 0, 'Anónimo no lee perfiles', error ? error.code : `${data.length} filas`);
}

// 3. Cada usuario: lee solo su fila y no puede modificar privilegios
for (const u of USUARIOS) {
  const sb = nuevoCliente();
  const { data: login, error: errLogin } = await sb.auth.signInWithPassword({ email: u.correo, password: clave });
  if (errLogin) {
    check(false, `[${u.rol}] inicio de sesión`, errLogin.message);
    continue;
  }
  const uid = login.user.id;

  const { data: filas, error: errSel } = await sb.from('perfiles').select('id, rol, activo');
  check(!errSel && filas.length === 1 && filas[0].id === uid, `[${u.rol}] solo ve su propia fila`, errSel?.message ?? `${filas.length} fila(s)`);
  check(filas?.[0]?.rol === u.rol, `[${u.rol}] rol correcto en perfiles`, filas?.[0]?.rol ?? 'sin perfil');

  const { error: errUpd } = await sb.from('perfiles').update({ rol: 'coordinador_provincial', activo: true }).eq('id', uid);
  check(Boolean(errUpd), `[${u.rol}] no puede modificar su rol/estado`, errUpd ? `${errUpd.code} ${errUpd.message}` : 'UPDATE permitido');

  const { error: errIns } = await sb.from('perfiles').insert({
    id: uid, cedula: '0000000000', nombres: 'x', apellidos: 'x', telefono: '0999999999', rol: 'coordinador_provincial',
  });
  check(Boolean(errIns), `[${u.rol}] no puede insertar perfiles`, errIns ? errIns.code : 'INSERT permitido');

  const { error: errDel } = await sb.from('perfiles').delete().eq('id', uid);
  check(Boolean(errDel), `[${u.rol}] no puede borrar perfiles`, errDel ? errDel.code : 'DELETE permitido');

  const { data: despues } = await sb.from('perfiles').select('rol').eq('id', uid).single();
  check(despues?.rol === u.rol, `[${u.rol}] el rol sigue intacto tras los intentos`);

  await sb.auth.signOut();
}

console.log(fallos === 0 ? '\nResultado: TODAS las verificaciones pasaron.' : `\nResultado: ${fallos} verificación(es) FALLARON.`);
process.exit(fallos === 0 ? 0 : 1);
