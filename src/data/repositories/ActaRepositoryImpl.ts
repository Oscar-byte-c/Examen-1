import { randomUUID } from 'expo-crypto';

import type { Acta, Dignidad } from '@/domain/entities/Acta';
import { SinConexionError } from '@/domain/entities/errores';
import type { ActaRepository, ResultadoSincronizacion } from '@/domain/repositories/ActaRepository';
import type { MonitoreoRepository } from '@/domain/repositories/MonitoreoRepository';

import { ActaLocalDataSource } from '../datasources/local/ActaLocalDataSource';
import { conectividad, fotosLocales } from '../datasources/local/dispositivo';
import { perfilDeSesionGuardada } from '../datasources/local/sesionLocal';
import { CLAVE_SESION, supabase } from '../datasources/remote/supabaseClient';
import { aPayloadSincronizacion, deActaRemota, type ActaRemotaDTO } from '../mappers/actaMapper';
import { esErrorDeRed, traducirErrorDatos } from '../mappers/errores';

const BUCKET = 'actas-fotos';
/** Vida de la dirección temporal de una foto: suficiente para verla, corta si se filtra. */
const SEGUNDOS_URL_FOTO = 300;

/**
 * Actas: primero local (SQLite) y luego la outbox hacia Supabase (ADR-03, ADR-10).
 *
 * Sincronización:
 *  1. Sube la foto a Storage con una ruta única por operación (sin sobrescribir evidencia).
 *  2. Llama a la RPC `sincronizar_acta(operacion_id, acta)`: transaccional e idempotente.
 *  3. Según la respuesta marca el acta como `enviada` o `conflicto` y la retira de la outbox.
 *  Si se corta la red, la operación queda en la outbox y se reintenta con el MISMO UUID:
 *  el servidor la reconoce y no duplica nada.
 */
export class ActaRepositoryImpl implements ActaRepository {
  private readonly local = new ActaLocalDataSource();
  private readonly oyentes = new Set<() => void>();
  /** Control de concurrencia: si ya hay una sincronización en curso, se reutiliza su promesa. */
  private enCurso: Promise<ResultadoSincronizacion> | null = null;

  constructor(private readonly monitoreo: MonitoreoRepository) {}

  private notificar() {
    this.oyentes.forEach((cb) => cb());
  }

  /**
   * Autor de las actas locales. Con red, la sesión de supabase-js. Sin red y con el token
   * vencido, `getSession()` devuelve null aunque la sesión siga en el dispositivo: se usa la
   * sesión guardada, solo si coincide con el perfil validado en caché (ver sesionLocal.ts).
   */
  private async usuarioId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session.user.id;
    return (await perfilDeSesionGuardada(CLAVE_SESION))?.id ?? null;
  }

  async guardarLocal(acta: Omit<Acta, 'estado' | 'error' | 'actualizadaEn'>): Promise<void> {
    const autor = await this.usuarioId();
    if (!autor) throw new SinConexionError('Tu sesión no está activa. Vuelve a ingresar.');
    await this.local.guardarConOperacion(autor, acta, randomUUID());
    this.notificar();
  }

  async obtener(mesaId: string, dignidad: Dignidad): Promise<Acta | null> {
    const autor = await this.usuarioId();
    if (autor) {
      const local = await this.local.obtener(autor, mesaId, dignidad);
      if (local) return local;
    }
    if (!(await conectividad.hayConexion())) return null;
    // El coordinador de recinto puede corregir actas registradas por un veedor (RF-13).
    const { data, error } = await supabase
      .from('actas')
      .select('id, mesa_id, dignidad, total_sufragantes, votos_blancos, votos_nulos, latitud, longitud, precision_gps_m, capturada_en, foto_path, distancia_recinto_m, fuera_de_rango, version, updated_at, votos_acta(candidato_id, votos)')
      .eq('mesa_id', mesaId)
      .eq('dignidad', dignidad)
      .maybeSingle<ActaRemotaDTO>();
    if (error) throw traducirErrorDatos(error);
    return data ? deActaRemota(data) : null;
  }

  async listarLocales(): Promise<Acta[]> {
    const autor = await this.usuarioId();
    return autor ? this.local.listar(autor) : [];
  }

  observarCambios(callback: () => void): () => void {
    this.oyentes.add(callback);
    return () => this.oyentes.delete(callback);
  }

  async conservarFoto(uriTemporal: string, actaId: string): Promise<string> {
    return fotosLocales.conservar(uriTemporal, actaId);
  }

  /** El bucket es privado: Storage verifica la política `fotos_actas_lectura` antes de firmar. */
  async urlFotoServidor(fotoPath: string): Promise<string> {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(fotoPath, SEGUNDOS_URL_FOTO);
    if (error || !data?.signedUrl) throw traducirErrorDatos(error);
    return data.signedUrl;
  }

  sincronizar(): Promise<ResultadoSincronizacion> {
    this.enCurso ??= this.procesarOutbox().finally(() => {
      this.enCurso = null;
    });
    return this.enCurso;
  }

  private async procesarOutbox(): Promise<ResultadoSincronizacion> {
    const resultado: ResultadoSincronizacion = { enviadas: 0, conflictos: 0, fallidas: 0 };
    const autor = await this.usuarioId();
    if (!autor || !(await conectividad.hayConexion())) return resultado;

    for (const op of await this.local.pendientes(autor)) {
      const acta = await this.local.obtenerPorId(op.actaId);
      if (!acta) continue;
      await this.local.marcarEstado(acta.id, 'enviando');
      this.notificar();
      try {
        const fotoPath = `${acta.mesaId}/${acta.id}/${op.operacionId}.jpg`;
        await this.subirFoto(acta.fotoUri, fotoPath);

        const { data, error } = await supabase.rpc('sincronizar_acta', {
          p_operacion_id: op.operacionId,
          p_acta: aPayloadSincronizacion(acta, fotoPath),
        });
        if (error) throw error;
        const r = data as { estado: 'aplicada' | 'conflicto'; version?: number };
        if (r.estado === 'aplicada') {
          await this.local.confirmar(op.operacionId, acta.id, 'enviada', r.version ?? null);
          resultado.enviadas++;
        } else {
          await this.local.confirmar(op.operacionId, acta.id, 'conflicto', null);
          resultado.conflictos++;
        }
      } catch (e) {
        await this.local.registrarIntento(op.operacionId);
        if (esErrorDeRed(e)) {
          // Sin red a mitad del envío: queda pendiente y se reintenta con el mismo UUID.
          await this.local.marcarEstado(acta.id, 'pendiente');
          this.notificar();
          break;
        }
        const dominio = traducirErrorDatos(e);
        await this.local.marcarEstado(acta.id, 'fallida', dominio.message);
        this.monitoreo.reportarError(e, 'sincronizar_acta'); // RF-17: falló una tarea sin cerrar la app
        resultado.fallidas++;
      }
      this.notificar();
    }
    return resultado;
  }

  /** Sube la evidencia. Si ya se subió en un intento anterior (409), se considera correcto. */
  private async subirFoto(uri: string, ruta: string): Promise<void> {
    const bytes = await fotosLocales.bytes(uri);
    const { error } = await supabase.storage.from(BUCKET).upload(ruta, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error && !/already exists|duplicate/i.test(error.message)) throw error;
  }
}
