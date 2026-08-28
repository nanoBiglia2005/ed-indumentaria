import { request } from './cliente';
import type { TIPOS_DE_PAGO } from '@backend/types';

export const listarTiposDePago = () => request<TIPOS_DE_PAGO[]>('/api/tipos-de-pago');

export const actualizarRecargo = (idTipoDePago: number, recargo: number) =>
  request<TIPOS_DE_PAGO>(`/api/tipos-de-pago/${idTipoDePago}`, {
    metodo: 'PUT',
    cuerpo: { recargo },
  });
