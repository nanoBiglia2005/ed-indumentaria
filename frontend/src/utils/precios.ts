export const redondearPrecio = (valor: number) => Math.round(Math.round(valor) / 10) * 10;

/** Precio base con el recargo de un metodo aplicado. */
export const precioConRecargo = (precio: number, recargo: number) =>
  redondearPrecio(precio * (1 + recargo / 100));

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
