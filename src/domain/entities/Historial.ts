import type { ResultadosActa } from './Acta';
import type { Role } from './Role';

/**
 * S-04 / ADR-11: una versión aplicada de un acta, tal como quedó en `actas_historial`
 * (la escribe el servidor en la misma transacción que el acta: nadie la edita desde la app).
 */
export type VersionActa = {
  version: number;
  /** Operación del celular que produjo esta versión (idempotencia, ADR-10). */
  operacionId: string;
  modificadoEn: string;
  autorId: string;
  /** null si la RLS no permite ver el perfil del autor a quien consulta. */
  autor: { nombre: string; rol: Role } | null;
  resultados: ResultadosActa;
  /** Ruta de la foto en Storage: cada versión conserva su propia evidencia. */
  fotoPath: string;
  ubicacion: {
    latitud: number;
    longitud: number;
    precisionM: number;
    distanciaM: number;
    fueraDeRango: boolean;
    capturadaEn: string;
  };
};

export type HistorialActa = {
  actaId: string;
  /** Versión vigente del acta (la que cuenta en los resultados). */
  versionActual: number;
  /** De la más reciente a la más antigua. */
  versiones: VersionActa[];
};

export type CambioVersion =
  | { campo: 'totalSufragantes' | 'votosBlancos' | 'votosNulos'; antes: number; despues: number }
  | { campo: 'candidato'; candidatoId: string; antes: number; despues: number }
  | { campo: 'foto' }
  | { campo: 'ubicacion'; distanciaAntesM: number; distanciaDespuesM: number };

/**
 * Qué cambió de una versión a la siguiente (auditoría): cifras, votos por candidato, foto y
 * lugar de captura. Función pura; la usa la pantalla de historial.
 */
export function cambiosEntreVersiones(anterior: VersionActa, actual: VersionActa): CambioVersion[] {
  const cambios: CambioVersion[] = [];
  for (const campo of ['totalSufragantes', 'votosBlancos', 'votosNulos'] as const) {
    if (anterior.resultados[campo] !== actual.resultados[campo]) {
      cambios.push({ campo, antes: anterior.resultados[campo], despues: actual.resultados[campo] });
    }
  }
  const votosAntes = new Map(anterior.resultados.votos.map((v) => [v.candidatoId, v.votos]));
  const votosDespues = new Map(actual.resultados.votos.map((v) => [v.candidatoId, v.votos]));
  for (const candidatoId of new Set([...votosAntes.keys(), ...votosDespues.keys()])) {
    const antes = votosAntes.get(candidatoId) ?? 0;
    const despues = votosDespues.get(candidatoId) ?? 0;
    if (antes !== despues) cambios.push({ campo: 'candidato', candidatoId, antes, despues });
  }
  if (anterior.fotoPath !== actual.fotoPath) cambios.push({ campo: 'foto' });
  if (anterior.ubicacion.latitud !== actual.ubicacion.latitud || anterior.ubicacion.longitud !== actual.ubicacion.longitud) {
    cambios.push({
      campo: 'ubicacion',
      distanciaAntesM: anterior.ubicacion.distanciaM,
      distanciaDespuesM: actual.ubicacion.distanciaM,
    });
  }
  return cambios;
}
