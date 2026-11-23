/**
 * Contenedor de dependencias (composition root), ubicado en la capa `data`.
 *
 * ¿Por qué aquí? Su trabajo es instanciar las implementaciones concretas de `data`
 * (repositorios, datasources) e inyectarlas en los casos de uso de `domain`. `data` ya
 * conoce ambas cosas, así que la dirección de dependencias no se rompe.
 *
 * Regla: `presentation` solo puede importar de `data` ESTE archivo (para obtener casos
 * de uso ya construidos); nunca repositorios, datasources ni Supabase directamente.
 */
import { randomUUID } from 'expo-crypto';

import type { MonitoreoRepository } from '@/domain/repositories/MonitoreoRepository';
import {
  AnalizarEvidencia,
  GuardarActa,
  ListarActasLocales,
  ObservarActas,
  ObtenerActa,
  ObtenerUbicacionActual,
  SincronizarActas,
} from '@/domain/use-cases/actas';
import {
  AbrirSesionRecuperacion,
  CambiarClave,
  CerrarSesion,
  IniciarSesion,
  ObservarCierreSesion,
  RestaurarSesion,
  SolicitarRecuperacion,
} from '@/domain/use-cases/auth';
import {
  ListarConflictos,
  ObservarConectividad,
  ObtenerAvance,
  ObtenerConteo,
  ObtenerUbicacionesActas,
  ResolverConflicto,
  SuscribirseEscrutinio,
} from '@/domain/use-cases/escrutinio';
import {
  AsignarMesa,
  CrearRecinto,
  ListarCandidatos,
  ListarMesasDeRecinto,
  ListarMisMesas,
  ListarRecintos,
} from '@/domain/use-cases/territorio';
import { CrearCuenta, ListarCoordinadores, ListarVeedores } from '@/domain/use-cases/usuarios';

import { ActaRepositoryImpl } from '../repositories/ActaRepositoryImpl';
import { AuthRepositoryImpl } from '../repositories/AuthRepositoryImpl';
import { ConectividadRepositoryImpl, EvidenciaRepositoryImpl } from '../repositories/DispositivoRepositories';
import { EscrutinioRepositoryImpl } from '../repositories/EscrutinioRepositoryImpl';
import { MonitoreoSentry } from '../repositories/MonitoreoSentry';
import { TerritorioRepositoryImpl } from '../repositories/TerritorioRepositoryImpl';
import { UsuariosRepositoryImpl } from '../repositories/UsuariosRepositoryImpl';

// ---- Implementaciones (una instancia de cada una) ----
const monitoreo: MonitoreoRepository = new MonitoreoSentry();
const auth = new AuthRepositoryImpl();
const usuarios = new UsuariosRepositoryImpl();
const territorio = new TerritorioRepositoryImpl();
const actas = new ActaRepositoryImpl(monitoreo);
const evidencia = new EvidenciaRepositoryImpl();
const escrutinio = new EscrutinioRepositoryImpl();
const conectividad = new ConectividadRepositoryImpl();

// ---- Casos de uso listos para la UI ----
export const container = {
  // Autenticación (ADR-01, ADR-02)
  iniciarSesion: new IniciarSesion(auth),
  cerrarSesion: new CerrarSesion(auth),
  restaurarSesion: new RestaurarSesion(auth),
  observarCierreSesion: new ObservarCierreSesion(auth),
  cambiarClave: new CambiarClave(auth),
  solicitarRecuperacion: new SolicitarRecuperacion(auth),
  abrirSesionRecuperacion: new AbrirSesionRecuperacion(auth),

  // Cuentas y territorio (RF-01, RF-05 a RF-08, RF-20)
  crearCuenta: new CrearCuenta(usuarios),
  listarVeedores: new ListarVeedores(usuarios),
  listarCoordinadores: new ListarCoordinadores(usuarios),
  listarRecintos: new ListarRecintos(territorio),
  crearRecinto: new CrearRecinto(territorio),
  listarMesasDeRecinto: new ListarMesasDeRecinto(territorio),
  asignarMesa: new AsignarMesa(territorio),
  listarMisMesas: new ListarMisMesas(territorio),
  listarCandidatos: new ListarCandidatos(territorio),

  // Actas y sincronización (ADR-03, ADR-04, ADR-10)
  analizarEvidencia: new AnalizarEvidencia(evidencia, actas),
  guardarActa: new GuardarActa(actas),
  obtenerActa: new ObtenerActa(actas),
  listarActasLocales: new ListarActasLocales(actas),
  sincronizarActas: new SincronizarActas(actas),
  observarActas: new ObservarActas(actas),
  observarConectividad: new ObservarConectividad(conectividad),
  obtenerUbicacionActual: new ObtenerUbicacionActual(evidencia),

  // Seguimiento (RF-15, ADR-07, S-04)
  obtenerAvance: new ObtenerAvance(escrutinio),
  obtenerConteo: new ObtenerConteo(escrutinio),
  obtenerUbicacionesActas: new ObtenerUbicacionesActas(escrutinio),
  listarConflictos: new ListarConflictos(escrutinio),
  resolverConflicto: new ResolverConflicto(escrutinio),
  suscribirseEscrutinio: new SuscribirseEscrutinio(escrutinio),

  // Servicios transversales
  monitoreo,
  /** UUID v4 generado en el cliente (ADR-10). */
  nuevoId: (): string => randomUUID(),
} as const;
