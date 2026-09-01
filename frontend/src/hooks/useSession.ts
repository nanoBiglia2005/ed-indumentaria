/**
 * Hooks de sesion. Separados de SessionContext.tsx porque ese modulo exporta un
 * componente (SessionProvider) y no puede exportar hooks sin romper Fast Refresh.
 */
import { useContext, useEffect, useState } from 'react';
import { SessionContext } from '@/context/sesionContexto';
import { obtenerCsrf } from '@/api/auth';

/** La sesion del usuario logueado, tal como la resolvio SessionProvider. */
export function useSession() {
  return useContext(SessionContext);
}

/** csrfToken requerido por Auth.js para los POST de /auth/signin y /auth/signout. */
export function useCsrfToken() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    obtenerCsrf()
      .then((data) => setCsrfToken(data?.csrfToken ?? null))
      .catch(() => setCsrfToken(null));
  }, []);

  return csrfToken;
}
