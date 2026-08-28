// Endpoints de Auth.js (montados en /auth por el backend).
import { request } from './cliente';
import type { SessionUser } from '@/context/SessionContext';

export const obtenerSesion = () => request<{ user?: SessionUser } | null>('/auth/session');

export const obtenerCsrf = () => request<{ csrfToken?: string } | null>('/auth/csrf');
