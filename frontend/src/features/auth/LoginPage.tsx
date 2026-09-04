import { Navigate, useSearchParams } from 'react-router-dom';
import { useSession, useCsrfToken } from '@/hooks/useSession';

function LoginPage() {
  const { status } = useSession();
  const csrfToken = useCsrfToken();
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  if (status === 'authenticated') {
    // Ventas es la unica pagina que ven los cuatro roles (empleado, ventas,
    // admin, superadmin): es el unico destino valido sin saber el rol todavia.
    return <Navigate to='/gestion/ventas' replace />;
  }

  return (
    <div className='flex h-screen w-screen items-center justify-center bg-stone-50'>
      <div className='flex flex-col items-center gap-6 px-10 py-12 rounded-2xl bg-white shadow-xl border border-black/5'>
        {error && (
          <p className='max-w-xs text-center text-sm text-red-600'>
            No tenés autorización para acceder. Contactá al administrador.
          </p>
        )}

        <form method='POST' action='/auth/signin/google'>
          <input type='hidden' name='csrfToken' value={csrfToken ?? ''} />
          <input type='hidden' name='callbackUrl' value='/gestion/ventas' />
          <button
            type='submit'
            disabled={!csrfToken}
            className='flex items-center cursor-pointer text-xl gap-3 px-5 py-3 rounded-lg border border-black/10 font-semibold text-sm text-gray-700 transition-colors hover:bg-amber-100 hover:text-amber-600 disabled:opacity-50'
          >
            Iniciar sesión con Google
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
