import { useEffect, useState, type ReactNode } from 'react';
import { obtenerSesion } from '@/api/auth';
import { SessionContext, type SessionState } from '@/context/sesionContexto';

/**
 * Resuelve la sesion una vez al montar y la deja disponible para toda la app.
 *
 * Este modulo exporta SOLO el componente: el contexto y los tipos estan en
 * context/sesionContexto.ts y los hooks en hooks/useSession.ts, porque un modulo
 * que exporta componentes no puede exportar otra cosa sin romper Fast Refresh.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading', user: null });

  useEffect(() => {
    obtenerSesion()
      .then((data) => {
        if (data?.user) {
          setState({ status: 'authenticated', user: data.user });
        } else {
          setState({ status: 'unauthenticated', user: null });
        }
      })
      .catch(() => setState({ status: 'unauthenticated', user: null }));
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
