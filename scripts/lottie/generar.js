// Genera las animaciones Lottie de "Acta y sello" (diseñadas y revisadas en LottieFiles Creator).
// Uso (desde la raíz): node scripts/lottie/generar.js assets/animaciones
const fs = require('fs');
const path = require('path');

const FR = 30;
const f = (s) => Math.round(s * FR);
const col = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
// Paleta CNE (RNF-06, ver src/presentation/theme/colors.ts): azul marino #153E5C (antes tinta) y azul #0061AB
// como acento (antes ocre; el amarillo #FDD206 no se lee sobre las tarjetas claras donde se muestran).
const TINTA = col('#153E5C'), OCRE = col('#0061AB'), LINEA = col('#D3D9E2'), BLANCO = col('#FFFFFF'), VERDE = col('#15803D');

// ---- propiedades -----------------------------------------------------------
const E = {
  lineal: { o: [0, 0], i: [1, 1] },
  salida: { o: [0.22, 1], i: [0.36, 1] }, // ease-out (desacelera)
  entrada: { o: [0.55, 0], i: [1, 1] }, // ease-in (golpe)
  suave: { o: [0.42, 0], i: [0.58, 1] }, // ease-in-out
  cruce: { o: [0.65, 0], i: [0.35, 1] },
};
const estatico = (k) => ({ a: 0, k });
/** kfs: [[segundos, valor[], easing | 'hold']] — el easing describe el tramo hacia el siguiente. */
function anim(kfs) {
  return {
    a: 1,
    k: kfs.map(([t, s, e], idx) => {
      const kf = { t: f(t), s };
      if (idx === kfs.length - 1) return kf;
      if (e === 'hold') return { ...kf, h: 1 };
      const z = e ?? E.lineal;
      return { ...kf, o: { x: [z.o[0]], y: [z.o[1]] }, i: { x: [z.i[0]], y: [z.i[1]] } };
    }),
  };
}

// ---- formas -----------------------------------------------------------------
const tr = () => ({ ty: 'tr', p: estatico([0, 0]), a: estatico([0, 0]), s: estatico([100, 100]), r: estatico(0), o: estatico(100) });
const relleno = (c, op = 100) => ({ ty: 'fl', c: estatico([...c, 1]), o: estatico(op), r: 1 });
const trazo = (c, w, redondo = false) => ({ ty: 'st', c: estatico([...c, 1]), o: estatico(100), w: estatico(w), lc: redondo ? 2 : 1, lj: redondo ? 2 : 1, ml: 4 });
const rect = (x, y, w, h, r) => ({ ty: 'rc', p: estatico([x, y]), s: estatico([w, h]), r: estatico(r), d: 1 });
const elipse = (x, y, w, h) => ({ ty: 'el', p: estatico([x, y]), s: estatico([w, h]), d: 1 });
const grupo = (nm, items) => ({ ty: 'gr', nm, it: [...items, tr()] });
const recorte = (eKfs) => ({ ty: 'tm', s: estatico(0), e: anim(eKfs), o: estatico(0), m: 1 });

/** Polilínea abierta (lista de puntos [x,y]). */
function polilinea(pts, cerrada = false) {
  return { ty: 'sh', ks: estatico({ c: cerrada, v: pts, i: pts.map(() => [0, 0]), o: pts.map(() => [0, 0]) }) };
}
/** Trayecto con cúbicas: inicio + tramos [c1, c2, fin]. */
function bezier(inicio, tramos, cerrada) {
  const v = [inicio], i = [[0, 0]], o = [];
  let prev = inicio;
  tramos.forEach(([c1, c2, fin]) => {
    o.push([c1[0] - prev[0], c1[1] - prev[1]]);
    v.push(fin);
    i.push([c2[0] - fin[0], c2[1] - fin[1]]);
    prev = fin;
  });
  o.push([0, 0]);
  if (cerrada) {
    // el último vértice coincide con el primero: se fusionan
    i[0] = i[i.length - 1];
    v.pop(); i.pop(); o.pop();
  }
  return { ty: 'sh', ks: estatico({ c: !!cerrada, v, i, o }) };
}

// ---- capas -------------------------------------------------------------------
let ind = 0;
function capa(nm, op, { p, s, r, o }, shapes) {
  return {
    ddd: 0, ind: ++ind, ty: 4, nm, sr: 1,
    ks: { o: o ?? estatico(100), r: r ?? estatico(0), p: p ?? estatico([0, 0, 0]), a: estatico([0, 0, 0]), s: s ?? estatico([100, 100, 100]) },
    ao: 0, shapes, ip: 0, op, st: 0, bm: 0,
  };
}
const p3 = (x, y) => [x, y, 0];
const s3 = (v) => [v, v, 100];
const grados = (rad) => (-rad * 180) / Math.PI; // Creator: radianes antihorario · Lottie: grados horario

function animacion(nm, seg, capas) {
  ind = 0;
  const op = f(seg);
  return { v: '5.7.4', fr: FR, ip: 0, op, w: 200, h: 200, nm, ddd: 0, assets: [], layers: capas(op) };
}

// Hoja con renglones (reutilizada)
function hojaFormas(w, h, r, colorBorde, grosor, renglones) {
  return [
    ...renglones.map(([x, y, ancho, alto], k) => grupo(`renglon${k}`, [rect(x, y, ancho, alto, alto / 2), relleno(LINEA)])),
    grupo('papel', [rect(0, 0, w, h, r), trazo(colorBorde, grosor), relleno(BLANCO)]),
  ];
}
function visto(pts, color, grosor, kfs) {
  // Oculto hasta que empieza a dibujarse: un trazo redondo recortado a longitud 0 pinta un punto.
  const inicio = kfs[1][0];
  const t = { ...tr(), o: anim([[0, [0], 'hold'], [inicio + 1 / FR, [100]]]) };
  return { ty: 'gr', nm: 'visto', it: [polilinea(pts), trazo(color, grosor, true), recorte(kfs), t] };
}

// ---- 1. Acta sellada (1.8 s, una vez) ----------------------------------------
const actaSellada = animacion('acta_sellada', 1.8, (op) => [
  capa('sello', op, {
    p: estatico(p3(128, 132)),
    r: estatico(grados(0.22)),
    s: anim([[0, s3(170), 'hold'], [0.25, s3(170), E.entrada], [0.6, s3(92), E.salida], [0.7, s3(104), E.salida], [0.82, s3(100)]]),
    o: anim([[0, [0], 'hold'], [0.25, [0]], [0.55, [100]]]),
  }, [
    visto([[-14, 1], [-4, 11], [15, -10]], OCRE, 6, [[0, [0], 'hold'], [0.78, [0], E.salida], [1.15, [100]]]),
    grupo('aro_interior', [elipse(0, 0, 56, 56), trazo(OCRE, 2.5)]),
    grupo('aro', [elipse(0, 0, 72, 72), trazo(OCRE, 6)]),
  ]),
  capa('hoja', op, {
    p: estatico(p3(92, 96)),
    s: anim([[0, s3(100)], [0.62, s3(100)], [0.72, s3(96)], [0.9, s3(100)]]),
  }, hojaFormas(104, 132, 8, TINTA, 4, [[-3.6, -38, 64.8, 7], [-10.8, -22, 50.4, 7], [-7.2, -6, 57.6, 7], [-18, 10, 36, 7]])),
]);

// ---- 2. GPS buscando (bucle 2 s) ---------------------------------------------
const gota = () => bezier([0, 30], [
  [[-8, 20], [-20, 10], [-20, -4]],
  [[-20, -15], [-11, -24], [0, -24]],
  [[11, -24], [20, -15], [20, -4]],
  [[20, 10], [8, 20], [0, 30]],
], true);
const pinFormas = () => [grupo('ojo', [elipse(0, -4, 14, 14), relleno(BLANCO)]), grupo('gota', [gota(), relleno(TINTA)])];
const F1 = 1 / FR;
const gpsBuscando = animacion('gps_buscando', 2, (op) => [
  capa('pin', op, { p: estatico(p3(100, 96)), s: anim([[0, s3(100), E.suave], [1, s3(105), E.suave], [2, s3(100)]]) }, pinFormas()),
  capa('aro_b', op, {
    p: estatico(p3(100, 96)),
    s: anim([[0, s3(60)], [1, s3(100), 'hold'], [1 + F1, s3(20)], [2, s3(60)]]),
    o: anim([[0, [45]], [1, [0], 'hold'], [1 + F1, [90]], [2, [45]]]),
  }, [grupo('aro', [elipse(0, 0, 160, 160), trazo(OCRE, 3)])]),
  capa('aro_a', op, {
    p: estatico(p3(100, 96)),
    s: anim([[0, s3(20)], [2, s3(100)]]),
    o: anim([[0, [90]], [2, [0]]]),
  }, [grupo('aro', [elipse(0, 0, 160, 160), trazo(OCRE, 3)])]),
]);

// ---- 3. GPS ubicado (1.4 s, una vez) -----------------------------------------
const insignia = (diam, borde, pts, grosor, kfsTrim) => [
  visto(pts, BLANCO, grosor, kfsTrim),
  grupo('disco', [elipse(0, 0, diam, diam), trazo(BLANCO, borde), relleno(VERDE)]),
];
const gpsUbicado = animacion('gps_ubicado', 1.4, (op) => [
  capa('insignia', op, {
    p: estatico(p3(126, 70)),
    s: anim([[0, s3(90), 'hold'], [0.6, s3(90), E.salida], [0.8, s3(112), E.salida], [0.92, s3(100)]]),
    o: anim([[0, [0], 'hold'], [0.6, [0]], [0.75, [100]]]),
  }, insignia(34, 3, [[-8, 0], [-2, 6], [8, -6]], 4, [[0, [0], 'hold'], [0.85, [0], E.salida], [1.15, [100]]])),
  capa('pin', op, {
    p: anim([[0, p3(100, 56), E.entrada], [0.35, p3(100, 96), E.salida], [0.47, p3(100, 90), E.entrada], [0.58, p3(100, 96)]]),
    o: anim([[0, [0]], [0.15, [100]]]),
  }, pinFormas()),
  capa('sombra', op, {
    p: estatico(p3(100, 132)),
    s: anim([[0, s3(40)], [0.35, s3(40), E.salida], [0.5, s3(110), E.salida], [0.6, s3(100)]]),
  }, [grupo('sombra', [elipse(0, 0, 36, 10), relleno(TINTA, 18)])]),
]);

// ---- 4. Sincronizando (bucle 1.6 s) --------------------------------------------
const R = 62, K = (4 / 3) * Math.tan(Math.PI / 12);
const pt = (a) => [R * Math.cos((a * Math.PI) / 180), R * Math.sin((a * Math.PI) / 180)];
function arco(a0, a1) {
  const tramos = [];
  for (let a = a0; a < a1; a += 60) {
    const ra = (a * Math.PI) / 180, rb = ((a + 60) * Math.PI) / 180;
    tramos.push([
      [R * (Math.cos(ra) - K * Math.sin(ra)), R * (Math.sin(ra) + K * Math.cos(ra))],
      [R * (Math.cos(rb) + K * Math.sin(rb)), R * (Math.sin(rb) - K * Math.cos(rb))],
      pt(a + 60),
    ]);
  }
  return bezier(pt(a0), tramos, false);
}
function punta(aFin) {
  const t = ((aFin + 90) * Math.PI) / 180, n = (aFin * Math.PI) / 180;
  const [ex, ey] = pt(aFin);
  const L = 14, W = 11;
  return polilinea([[ex + Math.cos(t) * L, ey + Math.sin(t) * L], [ex + Math.cos(n) * W, ey + Math.sin(n) * W], [ex - Math.cos(n) * W, ey - Math.sin(n) * W]], true);
}
const flecha = (nm, a0, a1) => [
  grupo(nm + '_punta', [punta(a1), relleno(OCRE)]),
  grupo(nm, [arco(a0, a1), trazo(OCRE, 7, true)]),
];
const sincronizando = animacion('sincronizando', 1.6, (op) => [
  capa('giro', op, { p: estatico(p3(100, 100)), r: anim([[0, [0]], [1.6, [360]]]) }, [...flecha('flecha_a', -150, -30), ...flecha('flecha_b', 30, 150)]),
  capa('hoja', op, { p: estatico(p3(100, 100)) }, hojaFormas(46, 58, 5, TINTA, 3.5, [[0, -14, 28, 4.5], [0, -2, 28, 4.5], [-6, 10, 18, 4.5]])),
]);

// ---- 5. Conflicto resuelto (1.7 s, una vez) -------------------------------------
const hojaConflicto = (color) => hojaFormas(70, 90, 6, color, 3.5, [[0, -22, 46, 5], [0, -8, 46, 5], [-8, 6, 30, 5]]);
const conflictoResuelto = animacion('conflicto_resuelto', 1.7, (op) => [
  capa('insignia', op, {
    p: estatico(p3(128, 128)),
    s: anim([[0, s3(90), 'hold'], [0.95, s3(90), E.salida], [1.15, s3(112), E.salida], [1.3, s3(100)]]),
    o: anim([[0, [0], 'hold'], [0.95, [0]], [1.1, [100]]]),
  }, insignia(40, 3.5, [[-9, 0], [-2, 7], [10, -7]], 4.5, [[0, [0], 'hold'], [1.2, [0], E.salida], [1.5, [100]]])),
  capa('version_vigente', op, {
    p: anim([[0, p3(72, 100), 'hold'], [0.3, p3(72, 100), E.cruce], [0.9, p3(100, 100)]]),
    r: anim([[0, [grados(0.12)], 'hold'], [0.3, [grados(0.12)], E.cruce], [0.9, [0]]]),
  }, hojaConflicto(TINTA)),
  capa('version_recibida', op, {
    p: anim([[0, p3(128, 100), 'hold'], [0.3, p3(128, 100), E.cruce], [0.9, p3(100, 100)]]),
    r: anim([[0, [grados(-0.12)], 'hold'], [0.3, [grados(-0.12)], E.cruce], [0.9, [0]]]),
    o: anim([[0, [100], 'hold'], [0.7, [100]], [0.95, [0]]]),
  }, hojaConflicto(OCRE)),
]);

// ---- 6. Emblema del login (1.8 s, una vez) ------------------------------------
const punteado = (c, w, dash, gap) => ({ ...trazo(c, w, true), d: [
  { n: 'd', nm: 'dash', v: estatico(dash) }, { n: 'g', nm: 'gap', v: estatico(gap) }, { n: 'o', nm: 'offset', v: estatico(0) },
] });
const emblemaLogin = animacion('emblema_login', 1.8, (op) => [
  capa('papeleta', op, {
    p: anim([[0, p3(100, 118), 'hold'], [0.35, p3(100, 118), E.salida], [0.85, p3(100, 100)]]),
    o: anim([[0, [0], 'hold'], [0.35, [0]], [0.65, [100]]]),
  }, [
    { ...visto([[-7, 0], [-2, 6], [9, -8]], OCRE, 4.5, [[0, [0], 'hold'], [0.95, [0], E.salida], [1.3, [100]]]), nm: 'marca' },
    grupo('casilla', [rect(-15, -10, 22, 22, 4), trazo(TINTA, 3), relleno(BLANCO)]),
    ...hojaFormas(70, 90, 6, TINTA, 4, [[18, -16, 22, 5], [18, -4, 22, 5], [0, 22, 46, 5]]),
  ].map((g) => (g.nm === 'marca' ? { ...g, it: g.it.map((x) => (x.ty === 'tr' ? { ...x, p: estatico([-15, -10]) } : x)) } : g))),
  capa('giro_punteado', op, {
    p: estatico(p3(100, 100)),
    r: anim([[0, [grados(0.35)], E.salida], [1.8, [0]]]),
    o: anim([[0, [0], 'hold'], [0.3, [0]], [0.7, [100]]]),
  }, [grupo('punteado', [elipse(0, 0, 146, 146), punteado(OCRE, 2.5, 2, 9)])]),
  capa('aro', op, { p: estatico(p3(100, 100)) }, [
    grupo('aro', [elipse(0, 0, 168, 168), trazo(OCRE, 6, true), { ty: 'tm', s: estatico(0), e: anim([[0, [0], E.suave], [0.75, [100]]]), o: estatico(0), m: 1 }]),
  ]),
]);

const salida = process.argv[2] || '.';
fs.mkdirSync(salida, { recursive: true });
for (const a of [actaSellada, gpsBuscando, gpsUbicado, sincronizando, conflictoResuelto, emblemaLogin]) {
  const archivo = path.join(salida, a.nm + '.json');
  fs.writeFileSync(archivo, JSON.stringify(a));
  console.log(archivo, fs.statSync(archivo).size, 'bytes');
}
