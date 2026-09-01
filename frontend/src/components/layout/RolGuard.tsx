import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';

/**
 * Deja pasar solo a los roles indicados. Va DENTRO de AuthGuard (que ya
 * resolvio si hay sesion), asi que aca `loading` significa que la sesion
 * todavia no llego.
 *
 * Es solo cosmetico: esconde la pagina para que nadie entre por la URL, pero
 * quien decide de verdad es el backend (lib/roles.js), que responde 403 si el
 * rol no corresponde aunque se llame a la API a mano.
 */
export default function RolGuard({ roles }: { roles: readonly string[] }) {
  const { status, user } = useSession();

  if (status === 'loading') {
    return <div className='flex h-full w-full items-center justify-center text-gray-400'>Cargando...</div>;
  }

  if (!user?.rol || !roles.includes(user.rol)) {
    return <Navigate to='/gestion/articulos' replace />;
  }

  return <Outlet />;
}
