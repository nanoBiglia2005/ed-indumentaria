/**
 * Redondeo comercial: a multiplos de 10. `final = true` se queda en el entero,
 * sin el paso a la decena: es para los MONTOS FINALES del cobro (calculoPago.ts),
 * que son una parte suelta de la venta y no el precio de ningun articulo. Los
 * precios de articulo van siempre a la decena.
 *
 * ESPEJO de backend/services/preciosPorMetodo.js: si divergen, la pantalla
 * muestra un importe y se cobra otro.
 */
export const redondearPrecio = (valor: number, final: boolean = false) =>
  final ? Math.round(valor) : Math.round(Math.round(valor) / 10) * 10;

/** Precio base con el recargo de un metodo aplicado. */
export const precioConRecargo = (precio: number, recargo: number, final: boolean = false) =>
  redondearPrecio(precio * (1 + recargo / 100), final);

/**
 * Precio de un articulo con cada metodo de pago, en el orden de `metodos`.
 *
 * Los metodos con recargo siguen la regla del sistema (se parte del precio ya
 * redondeado, que es el que se cobra: ver backend/services/preciosPorMetodo.js).
 * El metodo SIN recargo devuelve el precio tal cual: no cobra nada de mas, asi
 * que redondearlo solo mostraria un numero distinto al que se tipeo.
 */
export const preciosDeArticuloPorMetodo = <T extends { id_tipos_de_pago: number; recargo: number }>(
  precio: number,
  metodos: T[]
) =>
  metodos.map((metodo) => ({
    metodo,
    precio: metodo.recargo === 0 ? precio : precioConRecargo(redondearPrecio(precio), metodo.recargo),
  }));
