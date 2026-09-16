import { request } from './cliente';
import type { PresupuestoCreado } from '@backend/types';
import type { DatosClienteAPI } from './venta';

/**
 * Arma e imprime un presupuesto. A diferencia de `crearRemito`, NO persiste
 * nada: no hay remito, no hay codigo y no aparece en Ventas Pendientes ni en el
 * Historial. Por eso imprimir no es opcional (no hay nada guardado que salvar
 * si la impresion falla).
 *
 * El body es el mismo de `POST /api/remitos` menos `imprimir`.
 */
export const crearPresupuesto = (cuerpo: {
  detalles: { id_articulo: number; cantidad: number }[];
  id_cliente: number | null;
  cliente?: DatosClienteAPI;
  /** A que impresora va el ticket. El backend lo ignora si el rol no puede elegir. */
  id_impresora?: number | null;
}) => request<PresupuestoCreado>('/api/presupuestos', { metodo: 'POST', cuerpo });
