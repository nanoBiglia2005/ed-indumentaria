// Seleccion escalonada de articulos para una venta: cliente -> grupo -> articulos.
import { request } from './cliente';
import type { GRUPOS_DE_VENTA } from '@backend/types';
import type { Agrupacion, RespuestaArticulosVenta } from '@/types/ventas';

export const obtenerAgrupaciones = () => request<Agrupacion[]>('/api/venta/agrupaciones');

export const obtenerGruposDeCliente = (idCliente: number) =>
  request<GRUPOS_DE_VENTA[]>(`/api/venta/grupos?id_cliente=${idCliente}`);

export const obtenerArticulosDeVenta = (idCliente: number, idGrupo: number) =>
  request<RespuestaArticulosVenta>(
    `/api/venta/articulos?id_cliente=${idCliente}&id_grupo=${idGrupo}`
  );
