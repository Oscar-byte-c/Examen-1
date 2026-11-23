/**
 * Tests de las reglas de negocio del dominio (sin mocks de frameworks).
 * Ejecutar: npm test
 */
import { describe, expect, it } from '@jest/globals';

import { NITIDEZ_MINIMA } from '../constants';
import { crearFormularioActaSchema, resumenSuma, validarResultados } from '../entities/Acta';
import { errorCedula, validarCedula } from '../entities/cedula';
import { resumir } from '../entities/Escrutinio';
import { distanciaMetros, fueraDeRango, mejorLectura } from '../entities/geo';
import { esFotoLegible, varianzaLaplaciano } from '../entities/nitidez';
import { estadoReporte } from '../entities/Territorio';
import { ProbarMonitoreo, TAREA_PRUEBA_MONITOREO } from '../use-cases/monitoreo';
import { loginSchema, nuevaClaveSchema, nuevoUsuarioSchema } from '../entities/Usuario';

describe('Cédula ecuatoriana (RF-02)', () => {
  it.each(['1712345675', '1723456784', '1734567892', '1710034065'])(
    'acepta la cédula válida %s',
    (c) => expect(validarCedula(c)).toBe(true),
  );
  it.each([
    ['1712345676', 'dígito verificador incorrecto'],
    ['171234567', 'menos de 10 dígitos'],
    ['17123456AB', 'letras'],
    ['2512345678', 'provincia inexistente (25)'],
    ['1762345675', 'tercer dígito ≥ 6'],
  ])('rechaza %s (%s)', (c) => expect(validarCedula(c)).toBe(false));

  it.each([
    ['1712345676', 'verificador'],
    ['171234567', 'longitud'],
    ['17123456789', 'longitud'],
    ['17123456AB', 'longitud'],
    ['2512345678', 'provincia'],
    ['0012345678', 'provincia'],
    ['1762345675', 'tercer_digito'],
  ])('identifica la causa de %s: %s', (c, causa) => expect(errorCedula(c)).toBe(causa));

  it('no informa causa para una cédula válida', () => expect(errorCedula('1712345675')).toBeNull());
});

describe('Validación matemática del acta (RF-10, RF-19, S-03)', () => {
  const votos = (...v: number[]) => v.map((n, i) => ({ candidatoId: `c${i}`, votos: n }));

  it('acepta un acta coherente', () => {
    expect(validarResultados({ totalSufragantes: 100, votosBlancos: 5, votosNulos: 5, votos: votos(30, 20, 20, 10, 10) }, 5)).toEqual([]);
  });
  it('rechaza valores negativos', () => {
    expect(validarResultados({ totalSufragantes: 10, votosBlancos: -1, votosNulos: 0, votos: votos(5, 2, 2, 1, 1) }, 5)).not.toEqual([]);
  });
  it('rechaza un candidato con más votos que el total de sufragantes', () => {
    const e = validarResultados({ totalSufragantes: 10, votosBlancos: 0, votosNulos: 0, votos: votos(11, 0, 0, 0, 0) }, 5);
    expect(e[0].campo).toBe('votos.c0');
  });
  it('rechaza cuando válidos + blancos + nulos ≠ total', () => {
    const e = validarResultados({ totalSufragantes: 100, votosBlancos: 5, votosNulos: 5, votos: votos(30, 20, 20, 10, 9) }, 5);
    expect(e).toHaveLength(1);
    expect(e[0].mensaje).toContain('no cuadra');
  });
  it('rechaza si faltan candidatos', () => {
    expect(validarResultados({ totalSufragantes: 0, votosBlancos: 0, votosNulos: 0, votos: votos(0, 0) }, 5)).not.toEqual([]);
  });
  it('resume la suma en vivo e indica si cuadra', () => {
    expect(resumenSuma({ totalSufragantes: '10', votosBlancos: '1', votosNulos: '1', votos: { a: '4', b: '4' } })).toMatchObject({ total: 10, cuadra: true });
    expect(resumenSuma({ totalSufragantes: '10', votosBlancos: '', votosNulos: 'x', votos: { a: '4' } })).toMatchObject({ total: 4, cuadra: false });
  });
  it('el esquema del formulario bloquea texto, decimales y sumas incoherentes', () => {
    const schema = crearFormularioActaSchema(['a', 'b']);
    expect(schema.safeParse({ totalSufragantes: '10', votosBlancos: '1', votosNulos: '1', votos: { a: '4', b: '4' } }).success).toBe(true);
    expect(schema.safeParse({ totalSufragantes: '10', votosBlancos: '1', votosNulos: '1', votos: { a: '4', b: '3' } }).success).toBe(false);
    expect(schema.safeParse({ totalSufragantes: '10.5', votosBlancos: '1', votosNulos: '1', votos: { a: '4', b: '4' } }).success).toBe(false);
    expect(schema.safeParse({ totalSufragantes: '-10', votosBlancos: '1', votosNulos: '1', votos: { a: '4', b: '4' } }).success).toBe(false);
  });
});

describe('Geolocalización (S-06, ADR-04)', () => {
  const recinto = { latitud: -0.2141, longitud: -78.5033 };
  it('calcula ~0 m para el mismo punto', () => expect(distanciaMetros(recinto, recinto)).toBeCloseTo(0));
  it('alerta a más de 300 m y no a menos', () => {
    const cerca = { latitud: -0.2141, longitud: -78.5013 }; // ~222 m al este
    const lejos = { latitud: -0.2141, longitud: -78.4993 }; // ~445 m al este
    expect(fueraDeRango(distanciaMetros(recinto, cerca))).toBe(false);
    expect(fueraDeRango(distanciaMetros(recinto, lejos))).toBe(true);
  });
  it('conserva la lectura más precisa', () => {
    const l = (precisionM: number) => ({ ...recinto, precisionM, capturadaEn: '' });
    expect(mejorLectura([l(30), l(8), l(15)])?.precisionM).toBe(8);
    expect(mejorLectura([])).toBeNull();
  });
});

describe('Nitidez de la foto (ADR-04, RF-11)', () => {
  const imagen = (ancho: number, alto: number, valor: (x: number, y: number) => number) => {
    const rgba = new Uint8Array(ancho * alto * 4);
    for (let y = 0; y < alto; y++)
      for (let x = 0; x < ancho; x++) {
        const v = valor(x, y);
        rgba.set([v, v, v, 255], (y * ancho + x) * 4);
      }
    return rgba;
  };
  it('una imagen con bordes marcados (tablero) es legible', () => {
    const v = varianzaLaplaciano(imagen(40, 40, (x, y) => ((x >> 2) + (y >> 2)) % 2 ? 255 : 0), 40, 40);
    expect(esFotoLegible(v)).toBe(true);
  });
  it('una imagen plana o con degradado suave no es legible', () => {
    expect(varianzaLaplaciano(imagen(40, 40, () => 128), 40, 40)).toBe(0);
    const v = varianzaLaplaciano(imagen(40, 40, (x) => x * 6), 40, 40);
    expect(v).toBeLessThan(NITIDEZ_MINIMA);
  });
});

describe('Estado de reporte de una mesa (S-02)', () => {
  it('distingue sin reporte, parcial y reportada', () => {
    expect(estadoReporte([])).toBe('sin_reporte');
    expect(estadoReporte(['alcaldia'])).toBe('parcial');
    expect(estadoReporte(['alcaldia', 'prefectura'])).toBe('reportada');
  });
  it('resume el avance de la jurisdicción', () => {
    const r = resumir([
      { recintoId: '1', nombre: 'A', latitud: 0, longitud: 0, mesasTotal: 4, mesasReportadas: 2, mesasParciales: 1 },
      { recintoId: '2', nombre: 'B', latitud: 0, longitud: 0, mesasTotal: 4, mesasReportadas: 0, mesasParciales: 0 },
    ]);
    expect(r).toEqual({ mesasTotal: 8, mesasReportadas: 2, mesasParciales: 1, mesasFaltantes: 6 });
  });
});

describe('Esquemas de usuario (RF-02, ADR-09)', () => {
  it('normaliza el correo del login', () => {
    const r = loginSchema.parse({ correo: '  Veedor.Prueba@Example.COM ', clave: 'x' });
    expect(r.correo).toBe('veedor.prueba@example.com');
  });
  it('exige claves de 8 caracteres con letras y números, y que coincidan', () => {
    expect(nuevaClaveSchema.safeParse({ clave: 'abc12345', confirmacion: 'abc12345' }).success).toBe(true);
    expect(nuevaClaveSchema.safeParse({ clave: 'abcdefgh', confirmacion: 'abcdefgh' }).success).toBe(false);
    expect(nuevaClaveSchema.safeParse({ clave: 'abc12345', confirmacion: 'abc12346' }).success).toBe(false);
  });
  it('valida una cuenta nueva completa', () => {
    const base = { cedula: '1712345675', nombres: 'Ana  María', apellidos: 'Pérez', telefono: '0991234567', correo: 'ana@correo.com' };
    expect(nuevoUsuarioSchema.parse(base).nombres).toBe('Ana María');
    expect(nuevoUsuarioSchema.safeParse({ ...base, cedula: '1712345676' }).success).toBe(false);
    expect(nuevoUsuarioSchema.safeParse({ ...base, telefono: '2234567' }).success).toBe(false);
  });
  it.each([
    ['1712345676', 'El dígito verificador no coincide.'],
    ['171234567', 'La cédula debe tener exactamente 10 dígitos.'],
    ['2512345678', 'El código de provincia no es válido.'],
    ['1762345675', 'El tercer dígito de la cédula no es válido.'],
  ])('muestra un mensaje específico para la cédula %s', (cedula, mensaje) => {
    const base = { cedula, nombres: 'Ana', apellidos: 'Pérez', telefono: '0991234567', correo: 'ana@correo.com' };
    const r = nuevoUsuarioSchema.safeParse(base);
    expect(r.success).toBe(false);
    const errores = r.success ? [] : r.error.issues.filter((i) => i.path[0] === 'cedula');
    expect(errores.map((i) => i.message)).toEqual([mensaje]); // un solo mensaje, el de la causa
  });
});

describe('Prueba de monitoreo (ADR-05, RF-17)', () => {
  const monitoreoFalso = (id: string | null) => {
    const llamadas: { error: unknown; tarea: string }[] = [];
    const repo = {
      iniciar: () => {},
      registrarPantalla: () => {},
      identificarUsuario: () => {},
      reportarError: (error: unknown, tarea: string) => {
        llamadas.push({ error, tarea });
        return id;
      },
    };
    return { repo, llamadas };
  };

  it('envía un error identificable con la etiqueta de prueba y devuelve el id del evento', () => {
    const { repo, llamadas } = monitoreoFalso('evento-123');
    expect(new ProbarMonitoreo(repo).execute()).toBe('evento-123');
    expect(llamadas).toHaveLength(1);
    expect((llamadas[0].error as Error).message).toBe('Error de prueba de monitoreo');
    expect(llamadas[0].tarea).toBe(TAREA_PRUEBA_MONITOREO);
  });

  it('devuelve null si el monitoreo no está configurado', () => {
    expect(new ProbarMonitoreo(monitoreoFalso(null).repo).execute()).toBeNull();
  });
});
