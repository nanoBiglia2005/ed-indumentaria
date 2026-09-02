import { request } from './cliente';
import type { RemitoConDetalles, RemitoCreado } from '@backend/types';
import type { DatosClienteAPI } from './venta';

/** Historial: todo menos los pendientes de cobro. */
export const listarRemitos = () => request<RemitoConDetalles[]>('/api/remitos');

/** Remitos confirmados que todavia no se cobraron. */
export const listarRemitosPendientes = () =>
  request<RemitoConDetalles[]>('/api/remitos/pendientes');

/**
 * Registra la venta como pendiente de cobro con el cliente asignado.
 * `cliente` solo se manda si sus datos se editaron en pantalla: el backend los
 * actualiza en la misma transaccion en que crea el remito.
 */
export const crearRemito = (cuerpo: {
  detalles: { id_articulo: number; cantidad: number }[];
  imprimir: boolean;
  id_cliente: number | null;
  cliente?: DatosClienteAPI;
  /** A que impresora va el ticket. El backend lo ignora si el rol no puede elegir. */
  id_impresora?: number | null;
}) => request<RemitoCreado>('/api/remitos', { metodo: 'POST', cuerpo });

/**
 * Vuelve a imprimir el ticket de un remito ya guardado. Existe porque la
 * impresion de la venta es best-effort: si la impresora estaba desconectada, o
 * si se eligio la equivocada, no habia forma de reemitirlo.
 *
 * A diferencia de crearRemito, aca imprimir ES la accion: si falla, lanza.
 */
export const reimprimirRemito = (idRemito: number, idImpresora?: number | null) =>
  request<{ status: 'ok' }>(`/api/remitos/${idRemito}/reimprimir`, {
    metodo: 'POST',
    cuerpo: { id_impresora: idImpresora ?? null },
  });

/** Un metodo de pago con lo que se le imputa del precio de la venta. */
export interface PagoDeRemito {
  id_tipo_de_pago: number;
  monto_inicial: number;
}

/**
 * Cobra un remito pendiente. Se mandan TODOS los metodos de pago: los que van
 * en 0 los descarta el backend, que ademas recalcula cuanto se cobra por cada
 * uno (la pantalla no decide la plata que entra).
 */
export const facturarRemito = (idRemito: number, pagos: PagoDeRemito[]) =>
  request<RemitoConDetalles>(`/api/remitos/${idRemito}/facturar`, {
    metodo: 'PUT',
    cuerpo: { pagos },
  });

export const anularRemito = (idRemito: number) =>
  request<RemitoConDetalles>(`/api/remitos/${idRemito}/anular`, { metodo: 'PUT' });

/** Devuelve una venta ya cobrada: pasa a DEVUELTO (el backend exige FACTURADO). */
export const devolverRemito = (idRemito: number) =>
  request<RemitoConDetalles>(`/api/remitos/${idRemito}/devolver`, { metodo: 'PUT' });
