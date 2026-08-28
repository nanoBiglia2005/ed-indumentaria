// ABM de las agrupaciones de Configuracion: grupos de venta, subgrupos,
// colegios/clubes (CLIENTES_MAYORISTAS) y lineas.
import { request } from './cliente';
import type {
  GRUPOS_DE_VENTA,
  SUBGRUPOS_DE_VENTA,
  CLIENTES_MAYORISTAS,
  LINEAS,
} from '@backend/types';

// --- Grupos de venta ---

export const listarGrupos = () => request<GRUPOS_DE_VENTA[]>('/api/grupos');

export const crearGrupo = (nombreGrupo: string) =>
  request<GRUPOS_DE_VENTA>('/api/grupos', { metodo: 'POST', cuerpo: { nombre_grupo: nombreGrupo } });

export const actualizarGrupo = (idGrupo: number, nombreGrupo: string) =>
  request<GRUPOS_DE_VENTA>(`/api/grupos/${idGrupo}`, {
    metodo: 'PUT',
    cuerpo: { nombre_grupo: nombreGrupo },
  });

export const eliminarGrupo = (idGrupo: number) =>
  request<void>(`/api/grupos/${idGrupo}`, { metodo: 'DELETE' });

// --- Subgrupos ---

export const listarSubgrupos = () => request<SUBGRUPOS_DE_VENTA[]>('/api/subgrupos');

export const crearSubgrupo = (nombreSubgrupo: string, idGrupo: number) =>
  request<SUBGRUPOS_DE_VENTA>('/api/subgrupos', {
    metodo: 'POST',
    cuerpo: { nombre_subgrupo: nombreSubgrupo, id_grupo: idGrupo },
  });

export const actualizarSubgrupo = (idSubgrupo: number, nombreSubgrupo: string, idGrupo: number) =>
  request<SUBGRUPOS_DE_VENTA>(`/api/subgrupos/${idSubgrupo}`, {
    metodo: 'PUT',
    cuerpo: { nombre_subgrupo: nombreSubgrupo, id_grupo: idGrupo },
  });

export const eliminarSubgrupo = (idSubgrupo: number) =>
  request<void>(`/api/subgrupos/${idSubgrupo}`, { metodo: 'DELETE' });

// --- Colegios/Clubes (CLIENTES_MAYORISTAS) ---

export const listarClientes = () => request<CLIENTES_MAYORISTAS[]>('/api/clientes');

export const crearCliente = (nombre: string, grupoVentaExclusivo: number) =>
  request<CLIENTES_MAYORISTAS>('/api/clientes', {
    metodo: 'POST',
    cuerpo: { nombre, grupo_venta_exclusivo: grupoVentaExclusivo },
  });

export const actualizarCliente = (idCliente: number, nombre: string, grupoVentaExclusivo: number) =>
  request<CLIENTES_MAYORISTAS>(`/api/clientes/${idCliente}`, {
    metodo: 'PUT',
    cuerpo: { nombre, grupo_venta_exclusivo: grupoVentaExclusivo },
  });

export const eliminarCliente = (idCliente: number) =>
  request<void>(`/api/clientes/${idCliente}`, { metodo: 'DELETE' });

// --- Lineas ---

export const listarLineas = () => request<LINEAS[]>('/api/lineas');

export const crearLinea = (nombreLinea: string) =>
  request<LINEAS>('/api/lineas', { metodo: 'POST', cuerpo: { nombre_linea: nombreLinea } });

export const actualizarLinea = (idLinea: number, nombreLinea: string) =>
  request<LINEAS>(`/api/lineas/${idLinea}`, {
    metodo: 'PUT',
    cuerpo: { nombre_linea: nombreLinea },
  });

export const eliminarLinea = (idLinea: number) =>
  request<void>(`/api/lineas/${idLinea}`, { metodo: 'DELETE' });
