// Que dice y que hace cada accion destructiva sobre un remito. Vive aparte del
// modal porque son datos, no componentes (un archivo de componentes que exporta
// otra cosa rompe el fast refresh de Vite).
import type { RemitoConDetalles } from '@backend/types';
import { anularRemito, devolverRemito } from '@/api/remitos';

export interface AccionDeRemito {
  titulo: string;
  /** Frase que abre el cuerpo, antes del identificador del remito. */
  descripcion: string;
  /** Verbo del boton: "Anular" -> "Anular (5)" mientras corre la espera. */
  verbo: string;
  verboEnCurso: string;
  tituloError: string;
  mensajeError: string;
  /** Importe a mostrar: el cobrado si ya se cobro, si no el de la venta. */
  monto: (remito: RemitoConDetalles) => number;
  ejecutar: (idRemito: number) => Promise<RemitoConDetalles>;
}

export const ACCION_ANULAR: AccionDeRemito = {
  titulo: 'Anular Remito',
  descripcion: 'Vas a anular el remito',
  verbo: 'Anular',
  verboEnCurso: 'Anulando...',
  tituloError: 'Error al anular el remito',
  mensajeError: 'No se pudo anular el remito.',
  // Todavia no se cobro, asi que total_final no existe.
  monto: (remito) => remito.total_efectivo ?? 0,
  ejecutar: anularRemito,
};

export const ACCION_DEVOLVER: AccionDeRemito = {
  titulo: 'Devolver Venta',
  descripcion: 'Vas a devolver la venta del remito',
  verbo: 'Devolver',
  verboEnCurso: 'Devolviendo...',
  tituloError: 'Error al devolver la venta',
  mensajeError: 'No se pudo devolver la venta.',
  // Ya facturada: lo que importa es lo que efectivamente se cobro.
  monto: (remito) => remito.total_final ?? remito.total_efectivo ?? 0,
  ejecutar: devolverRemito,
};
