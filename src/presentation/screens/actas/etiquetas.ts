import { DIGNIDADES } from '@/domain/constants';
import type { Dignidad, EstadoEnvio } from '@/domain/entities/Acta';
import type { EstadoReporte } from '@/domain/entities/Territorio';
import type { StatusKind } from '@/presentation/components';

/** Textos y estilos de estado para la UI (RF-14, S-02). El texto acompaña siempre al color. */
export const ESTADO_ENVIO_BADGE: Record<EstadoEnvio, { status: StatusKind; label: string }> = {
  pendiente: { status: 'pending', label: 'Guardada, por enviar' },
  enviando: { status: 'in_progress', label: 'Enviando' },
  enviada: { status: 'success', label: 'Enviada' },
  fallida: { status: 'error', label: 'Falló el envío' },
  conflicto: { status: 'warning', label: 'En revisión del coordinador' },
};

export const ESTADO_REPORTE_BADGE: Record<EstadoReporte, { status: StatusKind; label: string }> = {
  sin_reporte: { status: 'neutral', label: 'Sin reportar' },
  parcial: { status: 'pending', label: 'Parcial (1 de 2)' },
  reportada: { status: 'success', label: 'Reportada' },
};

export const DIGNIDADES_LISTA: readonly Dignidad[] = DIGNIDADES;
