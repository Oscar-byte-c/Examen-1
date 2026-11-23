import type { MonitoreoRepository } from '../repositories/MonitoreoRepository';

/** Etiqueta `tarea` con la que se reconoce el evento de prueba en la herramienta de monitoreo. */
export const TAREA_PRUEBA_MONITOREO = 'prueba_monitoreo';

/**
 * ADR-05 / RF-17: envía un error de prueba controlado para demostrar que los fallos llegan al
 * monitoreo. No cierra la app ni toca datos del escrutinio.
 * Devuelve el identificador del evento, o `null` si el monitoreo no está configurado.
 */
export class ProbarMonitoreo {
  constructor(private readonly monitoreo: MonitoreoRepository) {}

  execute(): string | null {
    return this.monitoreo.reportarError(new Error('Error de prueba de monitoreo'), TAREA_PRUEBA_MONITOREO);
  }
}
