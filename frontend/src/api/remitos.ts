import { request } from './cliente';
import type { RemitoConDetalles, RemitoCreado, OpcionesDePago, MetodoPago } from '@backend/types';

/** Historial: todo menos los pendientes de cobro. */
export const listarRemitos = () => request<RemitoConDetalles[]>('/api/remitos');

/** Remitos confirmados que todavia no se cobraron. */
export const listarRemitosPendientes = () =>
  request<RemitoConDetalles[]>('/api/remitos/pendientes');

export const crearRemito = (
  detalles: { id_articulo: number; cantidad: number }[],
  imprimir: boolean
) => request<RemitoCreado>('/api/remitos', { metodo: 'POST', cuerpo: { detalles, imprimir } });

export const obtenerOpcionesPago = (idRemito: number) =>
  request<OpcionesDePago>(`/api/remitos/${idRemito}/opciones-pago`);

export const facturarRemito = (
  idRemito: number,
  pagos: { id_detalle: number; metodo_pago: MetodoPago }[]
) =>
  request<RemitoConDetalles>(`/api/remitos/${idRemito}/facturar`, {
    metodo: 'PUT',
    cuerpo: { pagos },
  });

export const anularRemito = (idRemito: number) =>
  request<RemitoConDetalles>(`/api/remitos/${idRemito}/anular`, { metodo: 'PUT' });
