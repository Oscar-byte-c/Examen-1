/** Reporte de fallos (ADR-05, RF-17). La implementación usa Sentry y elimina datos personales. */
export interface MonitoreoRepository {
  iniciar(): void;
  /** Pantalla actual: se adjunta a los reportes ("en qué pantalla ocurrió"). */
  registrarPantalla(ruta: string): void;
  /** Error que no cierra la app pero impidió terminar una tarea (RF-17). */
  reportarError(error: unknown, tarea: string): void;
  /** Identificador anónimo del usuario (solo su UUID, nunca cédula ni correo). */
  identificarUsuario(id: string | null): void;
}
