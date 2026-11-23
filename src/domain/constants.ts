/**
 * Constantes de negocio acordadas en el documento consolidado de ADR.
 * Viven en `domain` porque son reglas del negocio electoral, no configuración técnica.
 */

/**
 * S-06: distancia máxima (en metros) entre la captura del acta y su recinto antes de mostrar
 * una alerta al coordinador. NO bloquea el registro (el GPS varía en aulas y zonas rurales).
 * El servidor usa el mismo valor en `privado.escribir_acta`.
 */
export const GEO_ALERT_THRESHOLD_METERS = 300;

/** Dignidades en disputa: cada mesa genera un acta por dignidad (S-02: 2 actas = mesa reportada). */
export const DIGNIDADES = ['alcaldia', 'prefectura'] as const;

/** Número de organizaciones políticas que participan por dignidad (RF-05). */
export const ORGANIZACIONES_POR_DIGNIDAD = 5;

/** ADR-04: lecturas de GPS que se toman al capturar la foto; se conserva la de mejor precisión. */
export const LECTURAS_GPS = 3;

/**
 * ADR-04: varianza mínima del laplaciano (sobre la foto reducida a `ANCHO_ANALISIS_FOTO` px)
 * para considerar legible la foto. Debe calibrarse con fotos reales de actas.
 */
export const NITIDEZ_MINIMA = 60;
export const ANCHO_ANALISIS_FOTO = 480;
