import { useAuthStore } from '@/presentation/store/authStore';

/**
 * Selector de sesión para pantallas y layouts. Reemplaza al antiguo `SessionPreviewContext`
 * (deuda 4.3 resuelta): el rol sale del perfil validado por el servidor, no de un botón.
 */
export function useSession() {
  const estado = useAuthStore((s) => s.estado);
  const usuario = useAuthStore((s) => s.usuario);
  const verificada = useAuthStore((s) => s.verificada);
  const cerrarSesion = useAuthStore((s) => s.cerrarSesion);
  return {
    estado,
    usuario,
    verificada,
    role: estado === 'autenticado' ? (usuario?.rol ?? null) : null,
    debeCambiarClave: estado === 'autenticado' && usuario?.debeCambiarClave === true,
    cerrarSesion,
  };
}
