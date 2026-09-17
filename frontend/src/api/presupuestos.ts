import { request } from './cliente';
import type { PresupuestoCreado } from '@backend/types';
import type { DatosClienteAPI } from './venta';

/**
 * Arma e imprime un presupuesto. A diferencia de `crearRemito`, NO persiste
 * nada: no hay remito, no hay codigo y no aparece en Ventas Pendientes ni en el
 * Historial. La UNICA excepcion es `cliente`: si vino editado, el backend lo
 * guarda de verdad (y puede rechazarlo con 409 si el dni/telefono/email ya es
 * de otro cliente, igual que crearRemito). El resto de lo guardado depende de
 * que la impresion salga bien (no hay nada mas guardado que salvar si falla).
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
