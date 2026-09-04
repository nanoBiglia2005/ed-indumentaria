/**
 * El contexto de sesion y sus tipos, sin JSX ni componentes.
 *
 * Vive aparte de SessionContext.tsx (que solo exporta el Provider) y de
 * hooks/useSession.ts (que solo exporta los hooks) porque un modulo que exporta
 * componentes no puede exportar otra cosa sin romper Fast Refresh
 * (react-refresh/only-export-components).
 */
import { createContext } from 'react';

export type Rol = 'empleado' | 'admin' | 'superadmin' | 'ventas';

export type SessionUser = {
  id_usuario: number;
  nombre: string | null;
  apellido: string | null;
  email: string;
  rol: Rol | null;
};

export type SessionState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: SessionUser }
  | { status: 'unauthenticated'; user: null };

export const SessionContext = createContext<SessionState>({ status: 'loading', user: null });
