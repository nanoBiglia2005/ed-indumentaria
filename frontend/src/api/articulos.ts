import { request } from './cliente';
import type { ARTICULOS, ARTICULOS_X_CLIENTE } from '@backend/types';

export const listarArticulos = () => request<ARTICULOS[]>('/api/articulos');

export const crearArticulo = (datos: Partial<ARTICULOS>) =>
  request<ARTICULOS>('/api/articulos', { metodo: 'POST', cuerpo: datos });

export const actualizarArticulo = (idArticulo: number, datos: Partial<ARTICULOS>) =>
  request<ARTICULOS>(`/api/articulos/${idArticulo}`, { metodo: 'PUT', cuerpo: datos });

export const eliminarArticulo = (idArticulo: number) =>
  request<void>(`/api/articulos/${idArticulo}`, { metodo: 'DELETE' });

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

// --- Dumps de las tablas de asociacion ---

export const listarArticulosXCliente = () =>
  request<ARTICULOS_X_CLIENTE[]>('/api/articulos-x-cliente');

// --- Impresion de etiquetas ---

export const imprimirBarcode = (idArticulo: number, cantidad: number) =>
  request<unknown>('/api/print', {
    metodo: 'POST',
    cuerpo: { id_articulo: idArticulo, cantidad },
  });
