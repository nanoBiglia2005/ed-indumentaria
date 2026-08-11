import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from './SessionContext';

function AuthGuard() {
  const { status } = useSession();

  if (status === 'loading') {
    return <div className='flex h-screen w-screen items-center justify-center text-gray-400'>Cargando...</div>;
  }

  if (status === 'unauthenticated') {
    return <Navigate to='/' replace />;
  }

  return <Outlet />;
}

export default AuthGuard;
