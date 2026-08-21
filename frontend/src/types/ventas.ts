// Tipos de dominio del flujo de venta (respuestas de /api/venta/*).
import type { ARTICULOS, ImportesPorMetodo } from '@backend/types';

/** Un cliente (colegio o club) tal como lo devuelve /api/venta/agrupaciones. */
export type ClienteVenta = { id_cliente: number; nombre: string };

export type Agrupacion = { id_grupo: number; nombre_grupo: string; clientes: ClienteVenta[] };

/**
 * Articulo con el nombre de su subgrupo ya resuelto por el backend y el precio
 * que tendria con cada metodo de pago.
 *
 * `precios_por_metodo` NO esta guardado en la base: lo calcula el backend con
 * el recargo vigente de cada metodo, asi que siempre esta al dia.
 */
export type ArticuloDeVenta = ARTICULOS & {
  nombre_subgrupo: string | null;
  precios_por_metodo: ImportesPorMetodo;
};

/**
 * Respuesta de GET /api/venta/articulos: la tabla se pagina en la base, asi que
 * `articulos` es SOLO la pagina pedida y `total` los que coinciden con los
 * filtros (para el paginador).
 */
export type RespuestaArticulosVenta = {
  articulos: ArticuloDeVenta[];
  total: number;
};

/** Articulo + cantidad que sale del modal de confirmacion hacia el carrito. */
export type ItemAConfirmar = { articulo: ArticuloDeVenta; cantidad: number };
