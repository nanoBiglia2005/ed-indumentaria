// Precios por metodo de pago.
//
// El precio de un articulo se guarda UNA sola vez (ARTICULOS.precio, y en la
// venta DETALLES_REMITO.precio): es el precio base. Lo que cada metodo cobra se
// DERIVA de ese precio con su recargo, y no se guarda en ningun lado, asi que
// cambiar un recargo en Configuracion se refleja solo en toda la aplicacion.
//
// Regla de redondeo (la misma en todo el sistema): se redondea LINEA POR LINEA
// y despues se suma. Es lo que hace que el ticket impreso cierre cuando el
// cliente suma los renglones a mano, y por eso el total de un metodo NO es
// `total * (1 + recargo/100)` sino la suma de sus lineas ya redondeadas.
const prisma = require('../db');

/** Redondeo comercial: a multiplos de 10. */
const redondearPrecio = (valor) => Math.round(Math.round(valor) / 10) * 10;

/** Precio base con el recargo de un metodo aplicado. */
const precioConRecargo = (precio, recargo) => redondearPrecio(precio * (1 + recargo / 100));

/** Los metodos de pago configurados, siempre en el mismo orden. */
const listarMetodosDePago = () =>
  prisma.TIPOS_DE_PAGO.findMany({ orderBy: { id_tipos_de_pago: 'asc' } });

/**
 * Precio unitario de un articulo con cada metodo: { [id_tipo_de_pago]: precio }.
 * Se parte del precio YA redondeado porque es el que se va a cobrar (el mismo
 * que congela la venta en DETALLES_REMITO.precio).
 */
const preciosDeArticulo = (precio, metodos) =>
  Object.fromEntries(
    metodos.map((metodo) => [
      metodo.id_tipos_de_pago,
      precioConRecargo(redondearPrecio(precio ?? 0), metodo.recargo),
    ])
  );

/**
 * Total de un conjunto de lineas ({ precio, cantidad }) con cada metodo:
 * { [id_tipo_de_pago]: total }. Sirve igual para las lineas de un remito ya
 * guardado y para los articulos que se estan cargando en una venta nueva.
 */
const totalesPorMetodo = (lineas, metodos) =>
  Object.fromEntries(
    metodos.map((metodo) => [
      metodo.id_tipos_de_pago,
      lineas.reduce(
        (total, linea) =>
          total + precioConRecargo(linea.precio ?? 0, metodo.recargo) * (linea.cantidad ?? 0),
        0
      ),
    ])
  );

/** Las lineas de un remito en la forma que espera totalesPorMetodo(). */
const lineasDeRemito = (remito) =>
  (remito.DETALLES_REMITO ?? []).map((detalle) => ({
    precio: detalle.precio ?? 0,
    cantidad: detalle.cantidad ?? 0,
  }));

/** Remito + sus totales por metodo, listo para responder al frontend. */
const remitoConTotales = (remito, metodos) => ({
  ...remito,
  totales_por_metodo: totalesPorMetodo(lineasDeRemito(remito), metodos),
});

module.exports = {
  redondearPrecio,
  precioConRecargo,
  listarMetodosDePago,
  preciosDeArticulo,
  totalesPorMetodo,
  lineasDeRemito,
  remitoConTotales,
};
