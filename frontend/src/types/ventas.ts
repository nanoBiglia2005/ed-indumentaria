// Tipos de dominio del flujo de venta (respuestas de /api/venta/*).
import type { ARTICULOS, SUBGRUPOS_DE_VENTA } from '@backend/types';

/** Un cliente (colegio o club) tal como lo devuelve /api/venta/agrupaciones. */
export type ClienteVenta = { id_cliente: number; nombre: string };

export type Agrupacion = { id_grupo: number; nombre_grupo: string; clientes: ClienteVenta[] };

/** Articulo con el nombre de su subgrupo ya resuelto por el backend. */
export type ArticuloDeVenta = ARTICULOS & {
  nombre_subgrupo: string | null;
};

/** Respuesta de GET /api/venta/articulos. */
export type RespuestaArticulosVenta = {
  articulos: ArticuloDeVenta[];
  subgrupos: SUBGRUPOS_DE_VENTA[];
};

/** Articulo + cantidad que sale del modal de confirmacion hacia el carrito. */
export type ItemAConfirmar = { articulo: ArticuloDeVenta; cantidad: number };
