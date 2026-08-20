// Flujo de venta: seleccion escalonada de articulos (cliente -> grupo ->
// articulos), busqueda por codigo de barra y alta del cliente final.
import { request } from './cliente';
import type { CLIENTES, GRUPOS_DE_VENTA } from '@backend/types';
import type { Agrupacion, ArticuloDeVenta, RespuestaArticulosVenta } from '@/types/ventas';

export const obtenerAgrupaciones = () => request<Agrupacion[]>('/api/venta/agrupaciones');

export const obtenerGruposDeCliente = (idCliente: number) =>
  request<GRUPOS_DE_VENTA[]>(`/api/venta/grupos?id_cliente=${idCliente}`);

export const obtenerArticulosDeVenta = (idCliente: number, idGrupo: number) =>
  request<RespuestaArticulosVenta>(
    `/api/venta/articulos?id_cliente=${idCliente}&id_grupo=${idGrupo}`
  );

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
