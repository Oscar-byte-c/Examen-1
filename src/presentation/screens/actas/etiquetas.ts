import { DIGNIDADES } from '@/domain/constants';
import type { Dignidad, EstadoEnvio } from '@/domain/entities/Acta';
import type { EstadoReporte } from '@/domain/entities/Territorio';
import type { IconName, StatusKind, TonoSello } from '@/presentation/components';

/** Textos y estilos de estado para la UI (RF-14, S-02). El texto acompaña siempre al color. */
export const ESTADO_ENVIO_BADGE: Record<EstadoEnvio, { status: StatusKind; label: string }> = {
  pendiente: { status: 'pending', label: 'Guardada, por enviar' },
  enviando: { status: 'in_progress', label: 'Enviando' },
  enviada: { status: 'success', label: 'Enviada' },
  fallida: { status: 'error', label: 'Falló el envío' },
  conflicto: { status: 'warning', label: 'En revisión del coordinador' },
};

/**
 * Sello de estado de cada acta (Fase 4, «Acta y sello»). Mismos textos que ESTADO_ENVIO_BADGE:
 * «Guardada, por enviar» lleva el sello ocre (está sellada en el celular); «Enviada», el verde.
 */
export const SELLO_ESTADO_ENVIO: Record<EstadoEnvio, { tono: TonoSello; icono: IconName; etiqueta: string }> = {
  pendiente: { tono: 'sello', icono: 'approval', etiqueta: ESTADO_ENVIO_BADGE.pendiente.label },
  enviando: { tono: 'proceso', icono: 'sync', etiqueta: ESTADO_ENVIO_BADGE.enviando.label },
  enviada: { tono: 'exito', icono: 'verified', etiqueta: ESTADO_ENVIO_BADGE.enviada.label },
  fallida: { tono: 'error', icono: 'error', etiqueta: ESTADO_ENVIO_BADGE.fallida.label },
  conflicto: { tono: 'aviso', icono: 'rule', etiqueta: ESTADO_ENVIO_BADGE.conflicto.label },
};

export const SELLO_SIN_REGISTRAR = { tono: 'vacio', icono: 'edit_document', etiqueta: 'Sin registrar' } as const;

export const ESTADO_REPORTE_BADGE: Record<EstadoReporte, { status: StatusKind; label: string }> = {
  sin_reporte: { status: 'neutral', label: 'Sin reportar' },
  parcial: { status: 'pending', label: 'Parcial (1 de 2)' },
  reportada: { status: 'success', label: 'Reportada' },
};

export const DIGNIDADES_LISTA: readonly Dignidad[] = DIGNIDADES;
