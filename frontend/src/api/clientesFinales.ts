/**
 * ABM de clientes finales (pagina Clientes). Es un contrato DISTINTO del que
 * expone api/venta.ts: alla el alta de un cliente es un paso del flujo de venta
 * (y por eso convive con el buscador y la asignacion), aca es el ABM suelto.
 *
 * Lo unico que se comparte con api/venta.ts son las FORMAS (`DatosClienteAPI` y
 * `RespuestaAltaCliente`): el cuerpo que viaja y la respuesta del alta son
 * literalmente los mismos, asi que duplicar la interfaz de campos solo
 * garantizaria que un dia diverjan de lo que valida el backend.
 *
 * Todas estas rutas estan gateadas a ROLES_HISTORIAL en el servidor; el
 * RolGuard y la Sidebar solo esconden la pagina (es cosmetico).
 */
import { ApiError, request } from './cliente';
import type { CLIENTES, RemitoConDetalles } from '@backend/types';
import type { CampoDuplicado, DatosClienteAPI, RespuestaAltaCliente } from './venta';

export interface RespuestaClientes {
  clientes: CLIENTES[];
  total: number;
}

export interface ParamsClientes {
  busqueda: string;
  pagina: number;
  tamano: number;
}

/** Pagina de clientes ordenada por apellido/nombre (lo resuelve el backend). */
export const listarClientesPagina = ({ busqueda, pagina, tamano }: ParamsClientes) => {
  const query = new URLSearchParams({ pagina: String(pagina), tamano: String(tamano) });
  if (busqueda.trim() !== '') query.set('busqueda', busqueda.trim());

  return request<RespuestaClientes>(`/api/clientes-finales?${query}`);
};

export const obtenerCliente = (idCliente: number) =>
  request<CLIENTES>(`/api/clientes-finales/${idCliente}`);

/**
 * Alta. Igual que en el flujo de venta, `creado: false` NO es un error: ya
 * habia un cliente con ese dni/telefono/email y viene en `cliente` (`campo`
 * dice cual) para que la pantalla ofrezca abrirlo en vez de crear un
 * duplicado.
 */
export const crearClienteFinal = (datos: DatosClienteAPI) =>
  request<RespuestaAltaCliente>('/api/clientes-finales', { metodo: 'POST', cuerpo: datos });

export const actualizarClienteFinal = (idCliente: number, datos: DatosClienteAPI) =>
  request<CLIENTES>(`/api/clientes-finales/${idCliente}`, { metodo: 'PUT', cuerpo: datos });

/** Lo que trae el 409 de `assertDatosDisponibles` en el backend. */
export interface ClienteDuplicado {
  cliente: CLIENTES;
  campo: CampoDuplicado;
}

/**
 * Si `err` es el 409 de dato repetido de `actualizarClienteFinal` (ver
 * `assertDatosDisponibles` en el backend), devuelve el cliente que ya tiene
 * ese dni/telefono/email para que la pantalla ofrezca abrirlo, igual que con
 * el `creado: false` del alta. Cualquier otro error (u otro 409, como el de
 * la baja con ventas asociadas) devuelve null: lo maneja el catch generico
 * de quien llamo.
 */
export const clienteDuplicadoDeError = (err: unknown): ClienteDuplicado | null => {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const cliente = err.datos?.cliente;
  const campo = err.datos?.campo;
  return cliente && campo ? { cliente: cliente as CLIENTES, campo: campo as CampoDuplicado } : null;
};

/**
 * Baja. Lanza ApiError 409 si el cliente tiene ventas asociadas: la FK es
 * restrictiva a proposito (borrarlo dejaria remitos sin titular).
 */
export const eliminarClienteFinal = (idCliente: number) =>
  request<void>(`/api/clientes-finales/${idCliente}`, { metodo: 'DELETE' });

export interface RespuestaVentasDeCliente {
  remitos: RemitoConDetalles[];
  total: number;
}

/** Ventas del cliente, con el MISMO shape que consume RemitoCard. */
export const ventasDeCliente = (idCliente: number, pagina: number, tamano: number) =>
  request<RespuestaVentasDeCliente>(
    `/api/clientes-finales/${idCliente}/ventas?pagina=${pagina}&tamano=${tamano}`
  );
