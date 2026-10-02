import { CODIGO_LIMITE_REPORTES } from '@backend/types';
import { ApiError, request } from './cliente';
import type {
  CombinacionReporte,
  EstadoReportes,
  PaginaReportes,
  PedidoReporteArticulos,
  ReporteGuardado,
} from '@/types/reportes';

/** Las combinaciones grupo/subgrupo/Colegio-Club con articulos en la linea. */
export const listarOpcionesReporte = (idLinea: number) =>
  request<{ combinaciones: CombinacionReporte[] }>(`/api/reportes/opciones?id_linea=${idLinea}`);

/** Cuantos hay guardados, el tope y el mas antiguo. */
export const obtenerEstadoReportes = () => request<EstadoReportes>('/api/reportes/estado');

export const listarReportes = (pagina: number, tamano: number) =>
  request<PaginaReportes>(`/api/reportes?${new URLSearchParams({ pagina: String(pagina), tamano: String(tamano) })}`);

/** Genera y guarda el PDF. Responde su url; el PDF se abre aparte (window.open). */
export const generarReporteArticulos = (pedido: PedidoReporteArticulos) =>
  request<{ id_reporte: number; url: string }>('/api/reportes/articulos', { metodo: 'POST', cuerpo: pedido });

export const eliminarReporte = (idReporte: number) =>
  request<void>(`/api/reportes/${idReporte}`, { metodo: 'DELETE' });

/**
 * Si el error es el 409 de "tope de reportes alcanzado", el reporte mas antiguo
 * que trae el body (para ofrecer borrarlo); si es cualquier otro error, null.
 */
export const masAntiguoDelLimite = (err: unknown): ReporteGuardado | null => {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  if (err.datos?.codigo !== CODIGO_LIMITE_REPORTES) return null;
  return (err.datos.masAntiguo as ReporteGuardado | null | undefined) ?? null;
};
