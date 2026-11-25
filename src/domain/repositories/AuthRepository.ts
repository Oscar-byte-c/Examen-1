import type { ResultadoCambioClave, SesionRestaurada, Usuario } from '../entities/Usuario';

/** Contrato de autenticación (ADR-01, ADR-02). La implementación usa Supabase Auth + Secure Store. */
export interface AuthRepository {
  iniciarSesion(correo: string, clave: string): Promise<Usuario>;
  /** Cierra la sesión; si no hay red, la borra igualmente del dispositivo. */
  cerrarSesion(): Promise<void>;
  /** Restaura la sesión al abrir la app (con red o, sin red, desde la caché del perfil). */
  restaurarSesion(): Promise<SesionRestaurada | null>;
  /** Notifica cuando la sesión termina (expiró, fue revocada o se cerró). Devuelve la función para desuscribirse. */
  observarCierre(callback: () => void): () => void;
  /**
   * Cambia la clave y borra la bandera de clave temporal (Edge Function). Lanza un error solo si
   * la clave NO cambió; si cambió, devuelve si se pudo volver a ingresar automáticamente.
   */
  cambiarClave(clave: string): Promise<ResultadoCambioClave>;
  /** Envía el enlace de recuperación (solo para correos verificados). */
  solicitarRecuperacion(correo: string, urlRetorno: string): Promise<void>;
  /** Abre la sesión de recuperación a partir del enlace recibido por correo. */
  abrirSesionRecuperacion(url: string): Promise<void>;
}
