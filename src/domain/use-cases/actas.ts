import { LECTURAS_GPS, TIEMPO_MAX_GPS_MS } from '../constants';
import { validarResultados, type Acta, type Dignidad, type EvidenciaActa, type ResultadosActa } from '../entities/Acta';
import { DatoInvalidoError, FotoIlegibleError, SinSenalGpsError, UbicacionRequeridaError } from '../entities/errores';
import { mejorLectura, type Ubicacion } from '../entities/geo';
import { esFotoLegible } from '../entities/nitidez';
import type { ActaRepository, ResultadoSincronizacion } from '../repositories/ActaRepository';
import type { EvidenciaRepository } from '../repositories/EvidenciaRepository';

export type EvidenciaAnalizada = EvidenciaActa & { legible: boolean };

/**
 * RF-12: solo vale como ubicación de la captura una lectura tomada DESDE ese instante.
 * Así, aunque el GPS esté precalentado, nunca se usa una posición anterior a la foto.
 */
export function lecturasDesde(lecturas: Ubicacion[], desde: Date): Ubicacion[] {
  return lecturas.filter((l) => Date.parse(l.capturadaEn) >= desde.getTime());
}

/** Lecturas de GPS con límite total; sin ninguna válida → SinSenalGpsError (S-06: el GPS es obligatorio). */
async function ubicacionDesde(evidencia: EvidenciaRepository, cantidad: number, desde: Date): Promise<Ubicacion> {
  const lecturas = await evidencia.leerUbicaciones(cantidad, desde, TIEMPO_MAX_GPS_MS);
  const ubicacion = mejorLectura(lecturasDesde(lecturas, desde));
  if (!ubicacion) throw new SinSenalGpsError(TIEMPO_MAX_GPS_MS / 1000);
  return ubicacion;
}

/** Precalienta el GPS mientras la pantalla del acta está abierta. Devuelve la función para apagarlo. */
export class PrepararUbicacion {
  constructor(private readonly evidencia: EvidenciaRepository) {}
  execute(): () => void {
    return this.evidencia.prepararUbicacion();
  }
}

/**
 * ADR-04 / RF-11 / RF-12: procesa la foto recién tomada.
 *  - La ubicación se lee en el momento del disparo (varias lecturas; se conserva la más precisa).
 *  - Se mide la nitidez; `legible` decide si se puede continuar.
 *  - La foto se copia a almacenamiento persistente (la caché la puede borrar el sistema).
 */
export class AnalizarEvidencia {
  constructor(
    private readonly evidencia: EvidenciaRepository,
    private readonly actas: ActaRepository,
  ) {}

  async execute(fotoTemporal: string, actaId: string): Promise<EvidenciaAnalizada> {
    const captura = new Date(); // la foto acaba de tomarse: las lecturas válidas son de aquí en adelante
    const [ubicacion, nitidez] = await Promise.all([
      ubicacionDesde(this.evidencia, LECTURAS_GPS, captura),
      this.evidencia.medirNitidez(fotoTemporal),
    ]);
    // Si no hubo ubicación, Promise.all ya lanzó el error: la foto no se conserva y se repite (S-06).
    const legible = esFotoLegible(nitidez);
    // Una foto ilegible NO se conserva como evidencia: solo se muestra (desde la caché) para repetirla.
    const fotoUri = legible ? await this.actas.conservarFoto(fotoTemporal, actaId) : fotoTemporal;
    return { fotoUri, nitidez, ubicacion, legible };
  }
}

/** Ubicación actual (p. ej. para registrar las coordenadas de un recinto nuevo, RF-06). */
export class ObtenerUbicacionActual {
  constructor(private readonly evidencia: EvidenciaRepository) {}
  execute() {
    return ubicacionDesde(this.evidencia, 2, new Date());
  }
}

export type DatosGuardarActa = {
  id: string;
  mesaId: string;
  dignidad: Dignidad;
  resultados: ResultadosActa;
  evidencia: EvidenciaActa | null;
  versionBase: number;
  candidatosEsperados: number;
};

/**
 * RF-09 / RF-13 / RF-16 / S-03 / S-06: guarda el acta en el celular, aunque no haya red.
 * Reglas BLOQUEANTES: matemática coherente, foto legible y ubicación GPS presente.
 * El envío lo hace después la sincronización (outbox).
 */
export class GuardarActa {
  constructor(private readonly actas: ActaRepository) {}

  async execute(d: DatosGuardarActa): Promise<void> {
    const errores = validarResultados(d.resultados, d.candidatosEsperados);
    if (errores.length > 0) throw new DatoInvalidoError(errores[0].mensaje);
    if (!d.evidencia) throw new DatoInvalidoError('Toma la foto del acta antes de guardar.');
    if (!esFotoLegible(d.evidencia.nitidez)) throw new FotoIlegibleError();
    if (!d.evidencia.ubicacion) throw new UbicacionRequeridaError();

    await this.actas.guardarLocal({
      id: d.id,
      mesaId: d.mesaId,
      dignidad: d.dignidad,
      ...d.resultados,
      fotoUri: d.evidencia.fotoUri,
      ubicacion: d.evidencia.ubicacion,
      versionBase: d.versionBase,
    });
  }
}

export class ObtenerActa {
  constructor(private readonly actas: ActaRepository) {}
  execute(mesaId: string, dignidad: Dignidad): Promise<Acta | null> {
    return this.actas.obtener(mesaId, dignidad);
  }
}

/**
 * RF-12: foto ORIGINAL de un acta ya registrada. Primero la copia del celular (funciona sin red);
 * si el acta solo existe en el servidor, una dirección temporal autorizada. Si no hay ninguna,
 * devuelve null: nunca se muestra otra imagen en su lugar.
 */
export class ObtenerFotoEvidencia {
  constructor(private readonly actas: ActaRepository) {}
  async execute(acta: Pick<Acta, 'fotoUri' | 'evidenciaServidor'>): Promise<string | null> {
    if (acta.fotoUri) return acta.fotoUri;
    if (acta.evidenciaServidor?.fotoPath) return this.actas.urlFotoServidor(acta.evidenciaServidor.fotoPath);
    return null;
  }
}

export class ListarActasLocales {
  constructor(private readonly actas: ActaRepository) {}
  execute(): Promise<Acta[]> {
    return this.actas.listarLocales();
  }
}

export class SincronizarActas {
  constructor(private readonly actas: ActaRepository) {}
  execute(): Promise<ResultadoSincronizacion> {
    return this.actas.sincronizar();
  }
}

export class ObservarActas {
  constructor(private readonly actas: ActaRepository) {}
  execute(callback: () => void): () => void {
    return this.actas.observarCambios(callback);
  }
}
