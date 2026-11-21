/**
 * Constantes de negocio acordadas en el documento consolidado de ADR.
 * Viven en `domain` porque son reglas del negocio electoral, no configuración técnica.
 */

/** Distancia máxima (en metros) entre el acta y su recinto antes de generar una alerta. No bloquea el registro. */
export const GEO_ALERT_THRESHOLD_METERS = 500;

/** Dignidades en disputa: cada mesa genera un acta por dignidad. */
export const DIGNIDADES = ['alcaldia', 'prefectura'] as const;

/** Número de organizaciones políticas que participan por dignidad. */
export const ORGANIZACIONES_POR_DIGNIDAD = 5;
