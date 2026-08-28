// Flujo de venta: seleccion escalonada de articulos (cliente -> grupo ->
// articulos), busqueda por codigo de barra y alta del cliente final.
import { request } from './cliente';
import type { CLIENTES, GRUPOS_DE_VENTA, SUBGRUPOS_DE_VENTA } from '@backend/types';
import type { CriterioOrden, FiltroColumna, OpcionFiltro } from '@/components/tabla/tipos';
import type { Agrupacion, ArticuloDeVenta, RespuestaArticulosVenta } from '@/types/ventas';

// Cada paso del recorrido acota a los siguientes, pero todos se pueden saltear
// con la opcion "Todos": ahi el id viaja vacio y el backend no filtra por el.
const parametros = (ids: Record<string, number | null>) => {
  const query = new URLSearchParams();
  for (const [clave, id] of Object.entries(ids)) {
    if (id !== null) query.set(clave, String(id));
  }
  return query.toString();
};

export const obtenerAgrupaciones = (idLinea: number | null) =>
  request<Agrupacion[]>(`/api/venta/agrupaciones?${parametros({ id_linea: idLinea })}`);

/**
 * Grupos con algo para vender del paso 2. El alcance del cliente va de mas a
 * menos acotado: un colegio/club puntual (`idCliente`), una agrupacion entera
 * (`idAgrupacion`: "todos los colegios"), o los dos en null = todos.
 */
export const obtenerGruposDeCliente = (
  idCliente: number | null,
  idAgrupacion: number | null,
  idLinea: number | null
) =>
  request<GRUPOS_DE_VENTA[]>(
    `/api/venta/grupos?${parametros({
      id_cliente: idCliente,
      id_agrupacion: idAgrupacion,
      id_linea: idLinea,
    })}`
  );

export const obtenerSubgruposDeGrupo = (idGrupo: number) =>
  request<SUBGRUPOS_DE_VENTA[]>(`/api/venta/subgrupos?id_grupo=${idGrupo}`);

/**
 * Recorte de la tabla de articulos de la venta. Es el MISMO juego de parametros
 * que la pagina de Articulos (los filtros y el orden se resuelven en la base),
 * mas los tres pasos del recorrido y los articulos que ya estan en el carrito.
 */
export interface ParamsArticulosVenta {
  busqueda: string;
  idLinea: number | null;
  idCliente: number | null;
  /** Agrupacion entera del paso 2 ("todos los colegios"), si no hay uno puntual. */
  idAgrupacion: number | null;
  idGrupo: number | null;
  idSubgrupo: number | null;
  /** Ya agregados a la venta: no se vuelven a ofrecer. */
  excluir: number[];
  filtros: Record<string, FiltroColumna>;
  orden: CriterioOrden[];
}

const queryArticulos = (params: ParamsArticulosVenta) => {
  const query = new URLSearchParams(
    parametros({
      id_linea: params.idLinea,
      id_cliente: params.idCliente,
      id_agrupacion: params.idAgrupacion,
      id_grupo: params.idGrupo,
      id_subgrupo: params.idSubgrupo,
    })
  );

  if (params.busqueda.trim() !== '') query.set('busqueda', params.busqueda.trim());
  if (params.excluir.length > 0) query.set('excluir', params.excluir.join(','));
  if (Object.keys(params.filtros).length > 0) query.set('filtros', JSON.stringify(params.filtros));
  if (params.orden.length > 0) {
    query.set('orden', params.orden.map((c) => `${c.key}:${c.direccion}`).join(','));
  }

  return query;
};

export const listarArticulosVentaPagina = (
  params: ParamsArticulosVenta,
  pagina: number,
  tamano: number
) => {
  const query = queryArticulos(params);
  query.set('pagina', String(pagina));
  query.set('tamano', String(tamano));

  return request<RespuestaArticulosVenta>(`/api/venta/articulos?${query}`);
};

/** Valores disponibles para un filtro de seleccion, segun los demas filtros. */
export const listarOpcionesColumnaVenta = (params: ParamsArticulosVenta, columna: string) => {
  const query = queryArticulos(params);
  query.set('columna', columna);

  return request<{ opciones: OpcionFiltro[]; haySinAsignar: boolean }>(
    `/api/venta/articulos/opciones?${query}`
  );
};

/**
 * Articulo cuyo codigo de barra COMPLETO (header + tail, con el prefijo
 * generico si no tiene header propio) coincide con `codigo`.
 * Lanza ApiError 404 si no hay ninguno o si el que hay no esta vigente.
 */
export const buscarArticuloPorCodigo = (codigo: string) =>
  request<ArticuloDeVenta>(`/api/venta/articulo-por-codigo?codigo=${encodeURIComponent(codigo)}`);

/**
 * Datos de un cliente final tal como viajan a la API: los tres campos
 * numericos y la fecha ya normalizados (la fecha en 'AAAA-MM-DD', que es lo que
 * el backend convierte a la columna `date`). null = campo vacio.
 */
export interface DatosClienteAPI {
  nombre: string;
  apellido: string;
  dni: string;
  email: string | null;
  cod_pais: number | null;
  cod_area: number | null;
  telefono: number | null;
  fecha_nacimiento: string | null;
}

/**
 * Respuesta del alta: `creado: false` NO es un error, es que ya habia un
 * cliente con ese DNI y hay que preguntarle al usuario que hacer con el.
 */
export interface RespuestaAltaCliente {
  creado: boolean;
  cliente: CLIENTES;
}

/** Clientes que matchean el termino por nombre, apellido o DNI. */
export const buscarClientes = (busqueda: string) =>
  request<CLIENTES[]>(`/api/venta/clientes?busqueda=${encodeURIComponent(busqueda)}`);

export const crearCliente = (datos: DatosClienteAPI) =>
  request<RespuestaAltaCliente>('/api/venta/clientes', { metodo: 'POST', cuerpo: datos });

export const actualizarCliente = (idCliente: number, datos: DatosClienteAPI) =>
  request<CLIENTES>(`/api/venta/clientes/${idCliente}`, { metodo: 'PUT', cuerpo: datos });
