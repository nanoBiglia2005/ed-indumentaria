/**
 * Opcion generica {id, nombre} para listas, dropdowns y filtros.
 * Reemplaza a los viejos Opcion / OpcionFiltro / OpcionSeleccionable /
 * OpcionCreada / ItemAgrupacion que eran el mismo shape con otros nombres.
 */
export type Opcion = {
  id: number;
  nombre: string;
};
