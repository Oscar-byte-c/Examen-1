import { LECTURAS_GPS } from '../constants';
import { validarResultados, type Acta, type Dignidad, type EvidenciaActa, type ResultadosActa } from '../entities/Acta';
import { DatoInvalidoError, FotoIlegibleError, UbicacionRequeridaError } from '../entities/errores';
import { mejorLectura } from '../entities/geo';
import { esFotoLegible } from '../entities/nitidez';
import type { ActaRepository, ResultadoSincronizacion } from '../repositories/ActaRepository';
import type { EvidenciaRepository } from '../repositories/EvidenciaRepository';

export type EvidenciaAnalizada = EvidenciaActa & { legible: boolean };

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
    const [lecturas, nitidez] = await Promise.all([
      this.evidencia.leerUbicaciones(LECTURAS_GPS),
      this.evidencia.medirNitidez(fotoTemporal),
    ]);
    const ubicacion = mejorLectura(lecturas);
    if (!ubicacion) throw new UbicacionRequeridaError();
    const fotoUri = await this.actas.conservarFoto(fotoTemporal, actaId);
    return { fotoUri, nitidez, ubicacion, legible: esFotoLegible(nitidez) };
  }
}

/** Ubicación actual (p. ej. para registrar las coordenadas de un recinto nuevo, RF-06). */
export class ObtenerUbicacionActual {
  constructor(private readonly evidencia: EvidenciaRepository) {}
  async execute() {
    const ubicacion = mejorLectura(await this.evidencia.leerUbicaciones(2));
    if (!ubicacion) throw new UbicacionRequeridaError();
    return ubicacion;
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
