/**
 * Diff entre la seleccion original y la actual de una asociacion: que filas
 * hay que crear y cuales borrar. Usado por los modales de relaciones
 * (colegios/clubes de un articulo).
 */
export function diferenciaPorId<T>(
  originales: T[],
  seleccionados: T[],
  idDe: (item: T) => number
): { aAgregar: T[]; aQuitar: T[] } {
  const idsOriginales = new Set(originales.map(idDe));
  const idsSeleccionados = new Set(seleccionados.map(idDe));

  return {
    aAgregar: seleccionados.filter((item) => !idsOriginales.has(idDe(item))),
    aQuitar: originales.filter((item) => !idsSeleccionados.has(idDe(item))),
  };
}
