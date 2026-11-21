import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Role } from '@/domain/entities/Role';

/**
 * Sesión TEMPORAL solo para validar la navegación por rol en la fase de preparación.
 *
 * Se reemplazará en la fase de autenticación por un store de Zustand alimentado por
 * Supabase Auth (ADR de gestión de estado y de accesos). Las pantallas y layouts solo
 * dependen de `useSession()`, por lo que el reemplazo no afecta a las rutas.
 */
type SessionPreview = {
  role: Role | null;
  signInAs: (role: Role) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionPreview | null>(null);

export function SessionPreviewProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);

  const value = useMemo<SessionPreview>(
    () => ({ role, signInAs: setRole, signOut: () => setRole(null) }),
    [role],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionPreview {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de SessionPreviewProvider');
  return ctx;
}
