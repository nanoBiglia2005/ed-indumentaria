import { request } from './cliente';
import type { ARTICULOS, ARTICULOS_X_GRUPO_VENTA, ARTICULOS_X_CLIENTE } from '@backend/types';

export const listarArticulos = () => request<ARTICULOS[]>('/api/articulos');

export const crearArticulo = (datos: Partial<ARTICULOS>) =>
  request<ARTICULOS>('/api/articulos', { metodo: 'POST', cuerpo: datos });

export const actualizarArticulo = (idArticulo: number, datos: Partial<ARTICULOS>) =>
  request<ARTICULOS>(`/api/articulos/${idArticulo}`, { metodo: 'PUT', cuerpo: datos });

export const eliminarArticulo = (idArticulo: number) =>
  request<void>(`/api/articulos/${idArticulo}`, { metodo: 'DELETE' });

// --- Asociaciones del articulo (grupos / clientes / subgrupos) ---

export const asignarGrupo = (idArticulo: number, idGrupo: number) =>
  request<ARTICULOS_X_GRUPO_VENTA>(`/api/articulos/${idArticulo}/grupos`, {
    metodo: 'POST',
    cuerpo: { id_grupo: idGrupo },
  });

export const quitarGrupo = (idArticulo: number, idGrupo: number) =>
  request<void>(`/api/articulos/${idArticulo}/grupos/${idGrupo}`, { metodo: 'DELETE' });

export const asignarCliente = (idArticulo: number, idCliente: number) =>
  request<ARTICULOS_X_CLIENTE>(`/api/articulos/${idArticulo}/clientes`, {
    metodo: 'POST',
    cuerpo: { id_cliente: idCliente },
  });

export const quitarCliente = (idArticulo: number, idCliente: number) =>
  request<void>(`/api/articulos/${idArticulo}/clientes/${idCliente}`, { metodo: 'DELETE' });

export const asignarSubgrupo = (idArticulo: number, idSubgrupo: number) =>
  request<{ id_articulo: number; id_subgrupo: number }>(`/api/articulos/${idArticulo}/subgrupos`, {
    metodo: 'POST',
    cuerpo: { id_subgrupo: idSubgrupo },
  });

export const quitarSubgrupo = (idArticulo: number, idSubgrupo: number) =>
  request<void>(`/api/articulos/${idArticulo}/subgrupos/${idSubgrupo}`, { metodo: 'DELETE' });

// --- Dumps de las tablas de asociacion ---

export const listarArticulosXGrupo = () =>
  request<ARTICULOS_X_GRUPO_VENTA[]>('/api/articulos-x-grupo');

export const listarArticulosXCliente = () =>
  request<ARTICULOS_X_CLIENTE[]>('/api/articulos-x-cliente');

// --- Impresion de etiquetas ---

export const imprimirBarcode = (idArticulo: number, cantidad: number) =>
  request<unknown>('/api/print', {
    metodo: 'POST',
    cuerpo: { id_articulo: idArticulo, cantidad },
  });
