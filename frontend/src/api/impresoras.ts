import { request } from './cliente';
import type { EstadoImpresoras, Impresora } from '@/types/impresoras';

/**
 * Registro de impresoras + estado de conexion de cada una + que corresponde
 * preseleccionar para el usuario logueado.
 */
export const listarImpresoras = () => request<EstadoImpresoras>('/api/impresoras');

/**
 * Alta. El `token` de la respuesta es la UNICA vez que se puede ver: la base
 * guarda solo su hash. Va al .env del printer-client de esa PC.
 */
export const crearImpresora = (cuerpo: { nombre: string; es_predeterminada?: boolean }) =>
  request<{ impresora: Impresora; token: string }>('/api/impresoras', {
    metodo: 'POST',
    cuerpo,
  });

export const actualizarImpresora = (
  idImpresora: number,
  cuerpo: { nombre?: string; activa?: boolean; es_predeterminada?: boolean }
) => request<Impresora>(`/api/impresoras/${idImpresora}`, { metodo: 'PUT', cuerpo });

/**
 * Genera un token nuevo e invalida el anterior. El printer-client de esa PC
 * deja de conectar hasta que se actualice su .env.
 */
export const regenerarToken = (idImpresora: number) =>
  request<{ token: string }>(`/api/impresoras/${idImpresora}/token`, { metodo: 'POST' });

/**
 * Impresora preseleccionada del usuario logueado (la del servidor, no del
 * navegador: sigue al usuario aunque cambie de PC). `null` la limpia y vuelve a
 * la predeterminada global.
 */
export const asignarMiImpresora = (idImpresora: number | null) =>
  request<{ id_impresora: number | null }>('/api/impresoras/asignacion', {
    metodo: 'PUT',
    cuerpo: { id_impresora: idImpresora },
  });
