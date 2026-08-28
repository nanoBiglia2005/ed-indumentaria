// Actualizacion masiva de precios por talle (pagina Precios).
// Todo el recurso es admin/superadmin: el backend responde 403 al resto.
import { request } from './cliente';

/** Articulo de una linea, con lo justo para filtrar por grupo y subgrupo. */
export interface ArticuloDePrecios {
  id_articulo: number;
  id_grupo: number;
  id_subgrupo: number | null;
}

export interface SubgrupoDePrecios {
  id: number;
  nombre: string;
  /** Grupo al que pertenece: acota los subgrupos que se ofrecen. */
  id_grupo: number;
}

export interface RespuestaArticulosDeLinea {
  articulos: ArticuloDePrecios[];
  /** Solo los grupos presentes entre esos articulos, con su nombre. */
  grupos: { id: number; nombre: string }[];
  /** Solo los subgrupos presentes entre esos articulos, con su nombre. */
  subgrupos: SubgrupoDePrecios[];
}

/**
 * Un talle del recorte elegido con los ids de sus articulos. `talle` en null
 * son los articulos sin talle cargado.
 *
 * `precioMin` y `precioMax` son el precio actual mas bajo y mas alto del talle:
 * si coinciden, todos sus articulos valen lo mismo.
 */
export interface TalleDePrecios {
  talle: string | null;
  ids: number[];
  precioMin: number;
  precioMax: number;
}

/** Paso 1: los articulos de la linea + los grupos y subgrupos que aparecen. */
export const listarArticulosDeLinea = (idLinea: number) =>
  request<RespuestaArticulosDeLinea>(`/api/precios/articulos?id_linea=${idLinea}`);

/**
 * Paso 2: los talles distintos del recorte, con los ids de cada uno.
 * `idSubgrupo` en null pide los articulos SIN subgrupo (no "sin filtrar").
 */
export const listarTallesDePrecios = (
  idLinea: number,
  idGrupo: number,
  idSubgrupo: number | null
) => {
  const query = new URLSearchParams({ id_linea: String(idLinea), id_grupo: String(idGrupo) });
  if (idSubgrupo !== null) query.set('id_subgrupo', String(idSubgrupo));
  return request<{ talles: TalleDePrecios[] }>(`/api/precios/talles?${query}`);
};

/**
 * Aplica un precio a cada lista de articulos. Se manda por ID (no por talle) a
 * proposito: si a un articulo le cambian el talle mientras se cargan los
 * precios, igual recibe el que se vio en pantalla.
 */
export const actualizarPrecios = (actualizaciones: { precio: number; ids: number[] }[]) =>
  request<{ actualizados: number }>('/api/precios', {
    metodo: 'PUT',
    cuerpo: { actualizaciones },
  });
