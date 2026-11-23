import * as SQLite from 'expo-sqlite';

/**
 * Base de datos local (ADR-03): fuente de verdad de las actas en el dispositivo.
 * Sobrevive al cierre de la app y al reinicio del teléfono (RNF-04).
 *
 * Tablas:
 *  - actas_locales: última versión de cada acta registrada en este celular.
 *  - outbox: operaciones pendientes de enviar (una por acta; su UUID es la clave de idempotencia).
 *  - cache: copias de datos del servidor para trabajar sin red (mesas asignadas, candidatos).
 *
 * `autor_id` separa los datos por usuario: si otra persona inicia sesión en el mismo
 * celular, no envía ni ve las actas del anterior.
 */
const ESQUEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS actas_locales (
  id              TEXT PRIMARY KEY NOT NULL,
  autor_id        TEXT NOT NULL,
  mesa_id         TEXT NOT NULL,
  dignidad        TEXT NOT NULL,
  resultados      TEXT NOT NULL,
  foto_uri        TEXT NOT NULL,
  latitud         REAL NOT NULL,
  longitud        REAL NOT NULL,
  precision_m     REAL NOT NULL,
  capturada_en    TEXT NOT NULL,
  version_base    INTEGER NOT NULL,
  estado          TEXT NOT NULL,
  error           TEXT,
  actualizada_en  TEXT NOT NULL,
  UNIQUE (autor_id, mesa_id, dignidad)
);
CREATE TABLE IF NOT EXISTS outbox (
  operacion_id  TEXT PRIMARY KEY NOT NULL,
  acta_id       TEXT NOT NULL UNIQUE,
  autor_id      TEXT NOT NULL,
  intentos      INTEGER NOT NULL DEFAULT 0,
  creada_en     TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cache (
  clave           TEXT PRIMARY KEY NOT NULL,
  valor           TEXT NOT NULL,
  actualizado_en  TEXT NOT NULL
);
`;

let abierta: Promise<SQLite.SQLiteDatabase> | null = null;

/** Abre la base una sola vez y aplica el esquema (idempotente). */
export function baseDatos(): Promise<SQLite.SQLiteDatabase> {
  abierta ??= SQLite.openDatabaseAsync('control-electoral.db').then(async (db) => {
    await db.execAsync(ESQUEMA);
    return db;
  });
  return abierta;
}

/** Caché clave-valor (JSON) para datos del servidor que se necesitan sin red. */
export const cacheLocal = {
  async leer<T>(clave: string): Promise<T | null> {
    const db = await baseDatos();
    const fila = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM cache WHERE clave = ?', clave);
    return fila ? (JSON.parse(fila.valor) as T) : null;
  },
  async guardar(clave: string, valor: unknown): Promise<void> {
    const db = await baseDatos();
    await db.runAsync(
      'INSERT OR REPLACE INTO cache (clave, valor, actualizado_en) VALUES (?, ?, ?)',
      clave,
      JSON.stringify(valor),
      new Date().toISOString(),
    );
  },
};
