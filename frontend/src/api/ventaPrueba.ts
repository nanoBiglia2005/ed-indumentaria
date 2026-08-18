// Ambiente de PRUEBA del flujo de venta (/api/venta-prueba, solo ROLES_PRUEBA).
// Los pasos cliente -> grupo -> articulos siguen saliendo de api/venta.ts y los
// remitos ya registrados de api/remitos.ts, que no cambian: aca solo estan las
// llamadas NUEVAS del flujo que se esta armando.
import { request } from './cliente';
import type { ArticuloDeVenta } from '@/types/ventas';
import type { CLIENTES, RemitoCreadoConCliente } from '@backend/types';

/**
 * Articulo cuyo codigo de barra COMPLETO (header + tail, con el prefijo
 * generico si no tiene header propio) coincide con `codigo`.
 * Lanza ApiError 404 si no hay ninguno o si el que hay no esta vigente.
 */
export const buscarArticuloPorCodigo = (codigo: string) =>
  request<ArticuloDeVenta>(
    `/api/venta-prueba/articulo-por-codigo?codigo=${encodeURIComponent(codigo)}`
  );

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
  request<CLIENTES[]>(`/api/venta-prueba/clientes?busqueda=${encodeURIComponent(busqueda)}`);

export const crearCliente = (datos: DatosClienteAPI) =>
  request<RespuestaAltaCliente>('/api/venta-prueba/clientes', { metodo: 'POST', cuerpo: datos });

export const actualizarCliente = (idCliente: number, datos: DatosClienteAPI) =>
  request<CLIENTES>(`/api/venta-prueba/clientes/${idCliente}`, { metodo: 'PUT', cuerpo: datos });

/**
 * Registra la venta como pendiente de cobro con el cliente asignado.
 * `cliente` solo se manda si sus datos se editaron en pantalla: el backend los
 * actualiza en la misma transaccion en que crea el remito.
 */
export const crearRemitoPrueba = (cuerpo: {
  detalles: { id_articulo: number; cantidad: number }[];
  imprimir: boolean;
  id_cliente: number | null;
  cliente?: DatosClienteAPI;
}) => request<RemitoCreadoConCliente>('/api/venta-prueba/remitos', { metodo: 'POST', cuerpo });
