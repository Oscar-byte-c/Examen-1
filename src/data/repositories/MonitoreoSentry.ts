import * as Sentry from '@sentry/react-native';
import type { ErrorEvent, Breadcrumb } from '@sentry/react-native';

import type { MonitoreoRepository } from '@/domain/repositories/MonitoreoRepository';

import { getSentryDsn } from '../datasources/remote/supabaseConfig';

/**
 * ADR-05 / RF-17 / RNF-03: monitoreo con Sentry.
 *  - Captura errores de JavaScript y (en el APK) cierres nativos.
 *  - Adjunta modelo, versión de Android y pantalla actual (tag `pantalla` + migas de navegación).
 *  - El SDK guarda los eventos sin red y los envía al recuperarla.
 *  - PRIVACIDAD: sendDefaultPii = false y un filtro que borra correos, cédulas y teléfonos
 *    de cualquier texto antes de enviarlo. El usuario se identifica solo por su UUID.
 */
const PATRONES_PII: [RegExp, string][] = [
  [/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]'],
  [/(access_token|refresh_token|password|clave)=[^&\s"]+/gi, '$1=[oculto]'],
  [/[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}/gi, '[correo]'],
  [/\b\d{10}\b/g, '[cedula/telefono]'],
  [/\b\d{9}\b/g, '[telefono]'],
];

export function limpiarTexto(texto: string): string {
  return PATRONES_PII.reduce((t, [patron, reemplazo]) => t.replace(patron, reemplazo), texto);
}

/** Recorre recursivamente el evento y limpia todos los textos. */
function limpiar<T>(valor: T): T {
  if (typeof valor === 'string') return limpiarTexto(valor) as T;
  if (Array.isArray(valor)) return valor.map(limpiar) as T;
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, limpiar(v)])) as T;
  }
  return valor;
}

export class MonitoreoSentry implements MonitoreoRepository {
  private activo = false;

  iniciar(): void {
    const dsn = getSentryDsn();
    if (!dsn || this.activo) return; // sin DSN (desarrollo) no se envía nada
    Sentry.init({
      dsn,
      sendDefaultPii: false,
      environment: __DEV__ ? 'desarrollo' : 'produccion',
      beforeSend: (evento: ErrorEvent) => {
        const limpio = limpiar(evento);
        limpio.user = evento.user?.id ? { id: evento.user.id } : undefined;
        return limpio;
      },
      beforeBreadcrumb: (miga: Breadcrumb) => limpiar(miga),
    });
    this.activo = true;
  }

  registrarPantalla(ruta: string): void {
    if (!this.activo) return;
    Sentry.setTag('pantalla', ruta);
    Sentry.addBreadcrumb({ category: 'navegacion', message: ruta, level: 'info' });
  }

  reportarError(error: unknown, tarea: string): string | null {
    if (!this.activo) return null;
    return Sentry.captureException(error, { tags: { tarea } });
  }

  identificarUsuario(id: string | null): void {
    if (!this.activo) return;
    Sentry.setUser(id ? { id } : null);
  }
}
