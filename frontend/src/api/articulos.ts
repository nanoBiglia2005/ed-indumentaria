import { request } from './cliente';
import type { ARTICULOS, ARTICULOS_X_CLIENTE } from '@backend/types';
import type { CriterioOrden, FiltroColumna, OpcionFiltro } from '@/components/tabla/tipos';

// --- Listado paginado ---
// La tabla no se trae entera: el backend resuelve filtros, busqueda, orden y
// paginacion, y devuelve una pagina + el total que coincide.

/** Articulo del listado: viene con sus colegios/clubes ya resueltos. */
export type ArticuloListado = ARTICULOS & { clientes: OpcionFiltro[] };

/** Todo lo que define QUE filas pide la tabla (sin la pagina). */
export interface ParamsArticulos {
  busqueda: string;
  idGrupo: number | null;
  idSubgrupo: number | null;
  idCliente: number | null;
  filtros: Record<string, FiltroColumna>;
  orden: CriterioOrden[];
}

export interface RespuestaArticulos {
  articulos: ArticuloListado[];
  total: number;
}

export interface RespuestaOpciones {
  opciones: OpcionFiltro[];
  haySinAsignar: boolean;
}

/** Los filtros viajan como JSON y el orden como "codigo:asc,precio:desc". */
const querystring = (params: ParamsArticulos, extra: Record<string, number> = {}) => {
  const query = new URLSearchParams();

  if (params.busqueda !== '') query.set('busqueda', params.busqueda);
  if (params.idGrupo !== null) query.set('id_grupo', String(params.idGrupo));
  if (params.idSubgrupo !== null) query.set('id_subgrupo', String(params.idSubgrupo));
  if (params.idCliente !== null) query.set('id_cliente', String(params.idCliente));
  if (Object.keys(params.filtros).length > 0) query.set('filtros', JSON.stringify(params.filtros));
  if (params.orden.length > 0) {
    query.set('orden', params.orden.map((c) => `${c.key}:${c.direccion}`).join(','));
  }
  for (const [clave, valor] of Object.entries(extra)) query.set(clave, String(valor));

  return query.toString();
};

/** Una pagina de articulos + el total que coincide con los filtros. */
export const listarArticulosPagina = (params: ParamsArticulos, pagina: number, tamano: number) =>
  request<RespuestaArticulos>(`/api/articulos?${querystring(params, { pagina, tamano })}`);

/** Todos los ids que coinciden, para el "seleccionar los N que coinciden". */
export const listarIdsArticulos = (params: ParamsArticulos) =>
  request<{ ids: number[] }>(`/api/articulos/ids?${querystring(params)}`);

/**
 * Opciones de un filtro de seleccion. El backend las calcula sobre las filas
 * que pasan todos los DEMAS filtros, ignorando el de esta misma columna.
 */
export const listarOpcionesColumna = (params: ParamsArticulos, columna: string) =>
  request<RespuestaOpciones>(
    `/api/articulos/opciones?columna=${encodeURIComponent(columna)}&${querystring(params)}`
  );

// --- Alta / edicion / borrado ---

export const crearArticulo = (datos: Partial<ARTICULOS>) =>
  request<ARTICULOS>('/api/articulos', { metodo: 'POST', cuerpo: datos });

export const actualizarArticulo = (idArticulo: number, datos: Partial<ARTICULOS>) =>
  request<ARTICULOS>(`/api/articulos/${idArticulo}`, { metodo: 'PUT', cuerpo: datos });

// --- Asociaciones del articulo (clientes) ---
// El grupo y el subgrupo son campos propios del articulo: se editan con
// actualizarArticulo({ id_grupo, id_subgrupo }).

export const asignarCliente = (idArticulo: number, idCliente: number) =>
  request<ARTICULOS_X_CLIENTE>(`/api/articulos/${idArticulo}/clientes`, {
    metodo: 'POST',
    cuerpo: { id_cliente: idCliente },
  });

export const quitarCliente = (idArticulo: number, idCliente: number) =>
  request<void>(`/api/articulos/${idArticulo}/clientes/${idCliente}`, { metodo: 'DELETE' });

// --- Impresion de etiquetas ---

export const imprimirBarcode = (idArticulo: number, cantidad: number) =>
  request<unknown>('/api/print', {
    metodo: 'POST',
    cuerpo: { id_articulo: idArticulo, cantidad },
  });
