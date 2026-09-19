// Regla de "stock bajo" de un articulo: la cantidad en stock quedo por debajo
// del minimo configurado. Vive aparte de columnas.tsx / ArticulosPage.tsx para
// poder testearse como funcion pura (y porque un modulo que define un
// componente no puede exportar ademas funciones sueltas: rompe Fast Refresh).

/** Lo minimo que hace falta de un articulo para decidir si esta bajo de stock. */
export interface StockArticulo {
  cant: number | null | undefined;
  stock_minimo: number | null | undefined;
}

/**
 * true si `cant < stock_minimo`, y SOLO si hay un minimo configurado (> 0).
 *
 * - `stock_minimo` 0, null o undefined significa "sin minimo": nunca hay alerta,
 *   aunque la cantidad sea 0. Un articulo que no se repone (o que no se controla)
 *   no tiene que aparecer en rojo.
 * - `cant` null o undefined se trata como 0: la base lo declara `Int @default(0)`,
 *   asi que nunca deberia llegar vacio, pero si llegara, "no hay stock cargado"
 *   con un minimo configurado ES una alerta (es el caso mas parecido a cant = 0).
 * - `cant === stock_minimo` NO es alerta: la regla es estricta ("por debajo").
 */
export function stockBajo({ cant, stock_minimo }: StockArticulo): boolean {
  if (stock_minimo === null || stock_minimo === undefined || stock_minimo <= 0) return false;
  return (cant ?? 0) < stock_minimo;
}

/**
 * Texto para el tooltip de la fila cuando hay stock bajo, o null si no lo hay.
 * Va con los dos numeros para que quien lo lea no tenga que buscar las columnas.
 */
export function descripcionStockBajo(articulo: StockArticulo): string | null {
  if (!stockBajo(articulo)) return null;
  return `Cantidad por debajo del mínimo (${articulo.cant ?? 0} < ${articulo.stock_minimo})`;
}
