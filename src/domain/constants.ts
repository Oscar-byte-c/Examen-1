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
 * Tiempo TOTAL máximo para reunir esas lecturas tras la captura. Sin internet el GPS no tiene
 * asistencia (A-GPS, Wi-Fi) y el primer fix tarda más; por eso además se precalienta el GPS al
 * abrir la pantalla del acta. Si vence sin ninguna lectura, se repite la foto (S-06).
 */
export const TIEMPO_MAX_GPS_MS = 60_000;

/**
 * ADR-04: nitidez mínima (`nitidezImagen`, sobre la foto reducida a `ANCHO_ANALISIS_FOTO` px)
 * para considerar legible la foto. Calibrado por simulación (ADR-C02 §5): una foto nítida da
 * ≥ ~400 aun con poca luz, y una con desenfoque que impide leer los números (σ ≥ 6 px a 3000 px)
 * da ≤ ~130. Debe confirmarse con fotos reales de actas.
 * El valor anterior (60, sobre 480 px y sin promediar) nunca se alcanzaba: el ruido del sensor
 * mantenía la varianza por encima de 150 incluso en fotos muy borrosas.
 */
export const NITIDEZ_MINIMA = 200;
/** 1000 px: a 480 px el desenfoque que impide leer los números casi desaparecía al reducir. */
export const ANCHO_ANALISIS_FOTO = 1000;
