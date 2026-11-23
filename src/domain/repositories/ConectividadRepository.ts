/** Estado de la red (ADR-10, NetInfo). */
export interface ConectividadRepository {
  hayConexion(): Promise<boolean>;
  /** Llama al callback con el nuevo estado cada vez que cambia. Devuelve la función para desuscribirse. */
  observar(callback: (conectado: boolean) => void): () => void;
}
