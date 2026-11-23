import type { Acta, Dignidad, EstadoEnvio, ResultadosActa } from '@/domain/entities/Acta';

import { baseDatos } from './baseDatos';

type FilaActa = {
  id: string;
  mesa_id: string;
  dignidad: string;
  resultados: string;
  foto_uri: string;
  latitud: number;
  longitud: number;
  precision_m: number;
  capturada_en: string;
  version_base: number;
  estado: string;
  error: string | null;
  actualizada_en: string;
};

export type OperacionPendiente = { operacionId: string; actaId: string; intentos: number };

function aActa(f: FilaActa): Acta {
  const r = JSON.parse(f.resultados) as ResultadosActa;
  return {
    id: f.id,
    mesaId: f.mesa_id,
    dignidad: f.dignidad as Dignidad,
    ...r,
    fotoUri: f.foto_uri,
    ubicacion: { latitud: f.latitud, longitud: f.longitud, precisionM: f.precision_m, capturadaEn: f.capturada_en },
    versionBase: f.version_base,
    estado: f.estado as EstadoEnvio,
    error: f.error,
    actualizadaEn: f.actualizada_en,
  };
}

/** Acceso a SQLite para actas y outbox (ADR-03, ADR-10). */
export class ActaLocalDataSource {
  /**
   * Guarda el acta y su operación de envío en UNA transacción: nunca queda un acta sin
   * operación ni una operación sin acta. Si el acta ya tenía una operación sin enviar,
   * se reemplaza (solo interesa enviar la última versión).
   */
  async guardarConOperacion(autorId: string, acta: Omit<Acta, 'estado' | 'error' | 'actualizadaEn'>, operacionId: string) {
    const db = await baseDatos();
    const ahora = new Date().toISOString();
    const resultados: ResultadosActa = {
      totalSufragantes: acta.totalSufragantes,
      votosBlancos: acta.votosBlancos,
      votosNulos: acta.votosNulos,
      votos: acta.votos,
    };
    await db.withExclusiveTransactionAsync(async (tx) => {
      // Si este usuario ya tenía otra acta local para la misma mesa y dignidad, se reemplaza.
      await tx.runAsync(
        'DELETE FROM outbox WHERE acta_id IN (SELECT id FROM actas_locales WHERE autor_id = ? AND mesa_id = ? AND dignidad = ? AND id <> ?)',
        autorId, acta.mesaId, acta.dignidad, acta.id,
      );
      await tx.runAsync(
        'DELETE FROM actas_locales WHERE autor_id = ? AND mesa_id = ? AND dignidad = ? AND id <> ?',
        autorId, acta.mesaId, acta.dignidad, acta.id,
      );
      await tx.runAsync(
        `INSERT OR REPLACE INTO actas_locales
           (id, autor_id, mesa_id, dignidad, resultados, foto_uri, latitud, longitud, precision_m,
            capturada_en, version_base, estado, error, actualizada_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', NULL, ?)`,
        acta.id, autorId, acta.mesaId, acta.dignidad, JSON.stringify(resultados), acta.fotoUri,
        acta.ubicacion.latitud, acta.ubicacion.longitud, acta.ubicacion.precisionM, acta.ubicacion.capturadaEn,
        acta.versionBase, ahora,
      );
      await tx.runAsync('DELETE FROM outbox WHERE acta_id = ?', acta.id);
      await tx.runAsync(
        'INSERT INTO outbox (operacion_id, acta_id, autor_id, intentos, creada_en) VALUES (?, ?, ?, 0, ?)',
        operacionId, acta.id, autorId, ahora,
      );
    });
  }

  async obtener(autorId: string, mesaId: string, dignidad: Dignidad): Promise<Acta | null> {
    const db = await baseDatos();
    const f = await db.getFirstAsync<FilaActa>(
      'SELECT * FROM actas_locales WHERE autor_id = ? AND mesa_id = ? AND dignidad = ?',
      autorId, mesaId, dignidad,
    );
    return f ? aActa(f) : null;
  }

  async obtenerPorId(actaId: string): Promise<Acta | null> {
    const db = await baseDatos();
    const f = await db.getFirstAsync<FilaActa>('SELECT * FROM actas_locales WHERE id = ?', actaId);
    return f ? aActa(f) : null;
  }

  async listar(autorId: string): Promise<Acta[]> {
    const db = await baseDatos();
    const filas = await db.getAllAsync<FilaActa>(
      'SELECT * FROM actas_locales WHERE autor_id = ? ORDER BY actualizada_en DESC',
      autorId,
    );
    return filas.map(aActa);
  }

  async pendientes(autorId: string): Promise<OperacionPendiente[]> {
    const db = await baseDatos();
    const filas = await db.getAllAsync<{ operacion_id: string; acta_id: string; intentos: number }>(
      'SELECT operacion_id, acta_id, intentos FROM outbox WHERE autor_id = ? ORDER BY creada_en',
      autorId,
    );
    return filas.map((f) => ({ operacionId: f.operacion_id, actaId: f.acta_id, intentos: f.intentos }));
  }

  async marcarEstado(actaId: string, estado: EstadoEnvio, error: string | null = null) {
    const db = await baseDatos();
    await db.runAsync('UPDATE actas_locales SET estado = ?, error = ? WHERE id = ?', estado, error, actaId);
  }

  /** El servidor confirmó la operación: se actualiza la versión base y se retira de la outbox. */
  async confirmar(operacionId: string, actaId: string, estado: EstadoEnvio, version: number | null) {
    const db = await baseDatos();
    await db.withExclusiveTransactionAsync(async (tx) => {
      if (version !== null) {
        await tx.runAsync('UPDATE actas_locales SET estado = ?, error = NULL, version_base = ? WHERE id = ?', estado, version, actaId);
      } else {
        await tx.runAsync('UPDATE actas_locales SET estado = ?, error = NULL WHERE id = ?', estado, actaId);
      }
      await tx.runAsync('DELETE FROM outbox WHERE operacion_id = ?', operacionId);
    });
  }

  async registrarIntento(operacionId: string) {
    const db = await baseDatos();
    await db.runAsync('UPDATE outbox SET intentos = intentos + 1 WHERE operacion_id = ?', operacionId);
  }
}
