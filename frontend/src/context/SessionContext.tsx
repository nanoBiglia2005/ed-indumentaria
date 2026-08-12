import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { obtenerSesion, obtenerCsrf } from '@/api/auth';

export type Rol = 'empleado' | 'admin' | 'superadmin';

export type SessionUser = {
  id_usuario: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
  rol: Rol | null;
};

type SessionState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: SessionUser }
  | { status: 'unauthenticated'; user: null };

const SessionContext = createContext<SessionState>({ status: 'loading', user: null });

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
