import type { tipo_reporte } from '@backend/types';

/**
 * Con que se genero un reporte. Los nombres son una COPIA del momento de
 * generarlo: el listado dice lo mismo que el PDF aunque despues se renombre la
 * linea o el Colegio/Club. `colegioClub` null = "Todos" (Stock por talle).
 */
export interface ParametrosReporte {
  id_linea: number;
  id_grupo: number;
  id_subgrupo: number;
  id_cliente: number | null;
  nombres: {
    linea: string;
    grupo: string;
    subgrupo: string;
    colegioClub: string | null;
  };
}

/** Un reporte guardado, como lo devuelve /api/reportes. */
export interface ReporteGuardado {
  id_reporte: number;
  tipo: tipo_reporte;
  fecha_generado: string;
  parametros: ParametrosReporte;
  /** Articulos que entraron al reporte. */
  cantidad_filas: number;
  generado_por: string | null;
  /** GET del PDF: se abre en otra pestaña, nunca pasa por request<T>. */
  url: string;
}

export interface EstadoReportes {
  total: number;
  maximo: number;
  masAntiguo: ReporteGuardado | null;
}

export interface PaginaReportes {
  reportes: ReporteGuardado[];
  total: number;
  maximo: number;
}

export interface PedidoReporteArticulos {
  id_linea: number;
  id_grupo: number;
  id_subgrupo: number;
  id_cliente: number | null;
  /** Solo con el tope alcanzado: el reporte que se borra al generar este. */
  id_reporte_a_reemplazar?: number;
}

/**
 * Una combinacion grupo/subgrupo/Colegio-Club con articulos en la linea elegida
 * (GET /api/reportes/opciones). `id_cliente` null = articulos sin Colegio/Club.
 */
export interface CombinacionReporte {
  id_grupo: number;
  grupo: string;
  id_subgrupo: number;
  subgrupo: string;
  id_cliente: number | null;
  colegio_club: string | null;
  articulos: number;
}
