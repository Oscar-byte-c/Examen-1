import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import type { Dignidad } from '@/domain/entities/Acta';
import { ErrorDominio } from '@/domain/entities/errores';
import type { NuevoRecintoDatos } from '@/domain/entities/Territorio';
import type { DatosCuenta } from '@/domain/use-cases/usuarios';
import { container } from '@/data/di/container';

/**
 * Hooks de datos del servidor (ADR-07: TanStack Query → casos de uso del dominio).
 * Las pantallas solo llaman a estos hooks: no conocen Supabase ni SQLite.
 */
export const claves = {
  misMesas: ['mis-mesas'] as const,
  candidatos: (d: Dignidad) => ['candidatos', d] as const,
  acta: (mesaId: string, d: Dignidad) => ['acta', mesaId, d] as const,
  recintos: ['recintos'] as const,
  mesasRecinto: (id: string) => ['mesas-recinto', id] as const,
  veedores: ['veedores'] as const,
  coordinadores: ['coordinadores'] as const,
  avance: ['avance'] as const,
  conteo: ['conteo'] as const,
  ubicaciones: ['ubicaciones'] as const,
  conflictos: ['conflictos'] as const,
};

/** Mensaje para el usuario: los errores de dominio ya vienen redactados; el resto es genérico. */
export function mensajeDeError(e: unknown): string {
  return e instanceof ErrorDominio ? e.message : 'Ocurrió un problema inesperado. Inténtalo de nuevo.';
}

// ---- Veedor ----
export const useMisMesas = () => useQuery({ queryKey: claves.misMesas, queryFn: () => container.listarMisMesas.execute() });

export const useCandidatos = (d: Dignidad) =>
  useQuery({ queryKey: claves.candidatos(d), queryFn: () => container.listarCandidatos.execute(d), staleTime: Infinity });

export const useActa = (mesaId: string, d: Dignidad) =>
  useQuery({ queryKey: claves.acta(mesaId, d), queryFn: () => container.obtenerActa.execute(mesaId, d), gcTime: 0 });

// ---- Territorio y equipo ----
export const useRecintos = () => useQuery({ queryKey: claves.recintos, queryFn: () => container.listarRecintos.execute() });

export const useMesasRecinto = (recintoId: string | null) =>
  useQuery({
    queryKey: claves.mesasRecinto(recintoId ?? ''),
    queryFn: () => container.listarMesasDeRecinto.execute(recintoId!),
    enabled: !!recintoId,
  });

export const useVeedores = () => useQuery({ queryKey: claves.veedores, queryFn: () => container.listarVeedores.execute() });

export const useCoordinadores = () =>
  useQuery({ queryKey: claves.coordinadores, queryFn: () => container.listarCoordinadores.execute() });

export function useCrearRecinto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: NuevoRecintoDatos) => container.crearRecinto.execute(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.recintos }),
  });
}

export function useCrearCuenta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ datos, urlRetorno }: { datos: DatosCuenta; urlRetorno: string }) =>
      container.crearCuenta.execute(datos, urlRetorno),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: claves.veedores });
      void qc.invalidateQueries({ queryKey: claves.coordinadores });
    },
  });
}

export function useAsignarMesa(recintoId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mesaId, veedorId }: { mesaId: string; veedorId: string }) => container.asignarMesa.execute(mesaId, veedorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.mesasRecinto(recintoId ?? '') }),
  });
}

// ---- Seguimiento del escrutinio (RF-15) ----
export const useAvance = () => useQuery({ queryKey: claves.avance, queryFn: () => container.obtenerAvance.execute() });
export const useConteo = () => useQuery({ queryKey: claves.conteo, queryFn: () => container.obtenerConteo.execute() });
export const useUbicaciones = () =>
  useQuery({ queryKey: claves.ubicaciones, queryFn: () => container.obtenerUbicacionesActas.execute() });
export const useConflictos = () =>
  useQuery({ queryKey: claves.conflictos, queryFn: () => container.listarConflictos.execute() });

export function useResolverConflicto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, eleccion }: { id: string; eleccion: 'servidor' | 'dispositivo' }) =>
      container.resolverConflicto.execute(id, eleccion),
    onSuccess: () => qc.invalidateQueries({ queryKey: claves.conflictos }),
  });
}

/**
 * ADR-07: suscripción Realtime mientras la pantalla está montada. Cuando llega un cambio
 * solo se refrescan las consultas del escrutinio (no se redibuja toda la pantalla).
 * El canal se cierra al salir de la pantalla o al cerrar sesión.
 */
export function useEscrutinioEnVivo() {
  const qc = useQueryClient();
  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | null = null;
    const cerrar = container.suscribirseEscrutinio.execute(() => {
      // Agrupa ráfagas de eventos en una sola recarga.
      if (temporizador) clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        for (const k of [claves.avance, claves.conteo, claves.ubicaciones, claves.conflictos, ['mesas-recinto']]) {
          void qc.invalidateQueries({ queryKey: k });
        }
      }, 800);
    });
    return () => {
      if (temporizador) clearTimeout(temporizador);
      cerrar();
    };
  }, [qc]);
}
