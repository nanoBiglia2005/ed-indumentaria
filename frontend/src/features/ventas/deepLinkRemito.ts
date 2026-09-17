/**
 * Deep-link a una venta puntual: `?remito=<id_remito>` sobre Ventas o sobre
 * Historial (ver RemitoDestacado). Lo emite la ficha de un cliente, pero es una
 * URL como cualquier otra: puede llegar escrita a mano o pegada de un chat.
 *
 * De ahi que el id se valide en vez de confiar en el `Number(...)`: un
 * `?remito=abc` daria NaN y se iria a pedir `/api/remitos/NaN`.
 *
 * Vive en su propio archivo (y no dentro de RemitoDestacado) porque un modulo
 * que exporta un componente no puede exportar ademas funciones sueltas
 * (react-refresh/only-export-components).
 */
export const PARAM_REMITO = 'remito';

/** Id valido del query param, o null si no hay ninguno o no es un entero. */
export const idRemitoDeQuery = (params: URLSearchParams): number | null => {
  const crudo = params.get(PARAM_REMITO);
  if (crudo === null || !/^\d+$/.test(crudo)) return null;

  const id = Number(crudo);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};
