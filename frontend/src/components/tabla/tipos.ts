import type { ReactNode } from 'react';

// --- Filtros de columna (el valor elegido por el usuario) ---
export type FiltroTexto = { tipo: 'texto'; valor: string };
export type FiltroRango = { tipo: 'rango'; desde: number | null; hasta: number | null };
export type FiltroSeleccion = { tipo: 'seleccion'; ids: number[] };
export type FiltroColumna = FiltroTexto | FiltroRango | FiltroSeleccion;

export type OpcionFiltro = { id: number; nombre: string };

/** Id ficticio para la opcion "Sin asignar" de los filtros de seleccion. */
export const SIN_ASIGNAR_ID = -1;

// --- Definicion de filtro de una columna (como se filtra) ---
export type FiltroDefTexto = { tipo: 'texto' };
export type FiltroDefRango<T> = { tipo: 'rango'; getValor: (item: T) => number | null };
export type FiltroDefSeleccion<T> = {
  tipo: 'seleccion';
  getValores: (item: T) => OpcionFiltro[];
  opcionesEstaticas?: OpcionFiltro[];
};
export type FiltroDef<T> = FiltroDefTexto | FiltroDefRango<T> | FiltroDefSeleccion<T>;

// --- Definicion de una columna del DataGrid ---
export type ColumnaTabla<T> = {
  header: string;
  /** Valor mostrado; tambien se usa (como string) para buscar y filtrar por texto. */
  render: (item: T) => ReactNode;
  /** Celda custom (chips, etc.); si falta se muestra render() con line-clamp. */
  renderCell?: (item: T) => ReactNode;
  extraClassName?: (item: T) => string;
  /** Click en la celda (p. ej. abrir el editor inline de ese campo). */
  onClick?: (item: T) => void;
  width: number;
  filtroKey: string;
  filtro: FiltroDef<T>;
  /**
   * Si se define, se usa para ordenar en lugar del criterio por defecto segun
   * el tipo de filtro (util cuando el texto mostrado no ordena bien, p. ej.
   * codigos numericos guardados como string).
   */
  ordenValor?: (item: T) => string | number | null;
};

export type CriterioOrden = { key: string; direccion: 'asc' | 'desc' };
