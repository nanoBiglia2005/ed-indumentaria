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
 * Remito + sus lineas, cada una con el precio que tendria con cada metodo
 * (`precios_por_metodo`), + los totales por metodo.
 *
 * Los totales son la SUMA de esos mismos precios por linea, no una cuenta
 * aparte: es la unica forma de garantizar que el precio que se ve articulo por
 * articulo y el total de la venta coincidan SIEMPRE, sin importar cuando se
 * lean. Quien necesite el precio con recargo de un articulo de un remito ya
 * guardado tiene que leer `precios_por_metodo` de esa linea (la que devuelve
 * esta funcion), nunca volver a aplicar el recargo por su cuenta: si se
 * recalculara en otro lugar y en otro momento (por ejemplo con un recargo que
 * cambio mientras tanto en Configuracion) el precio del articulo podria dejar
 * de coincidir con el total ya congelado del remito.
 */
const remitoConTotales = (remito, metodos) => {
  const detalles = (remito.DETALLES_REMITO ?? []).map((detalle) => ({
    ...detalle,
    precios_por_metodo: preciosDeArticulo(detalle.precio ?? 0, metodos),
  }));

  const totales_por_metodo = Object.fromEntries(
    metodos.map((metodo) => [
      metodo.id_tipos_de_pago,
      detalles.reduce(
        (total, detalle) =>
          total + (detalle.precios_por_metodo[metodo.id_tipos_de_pago] ?? 0) * (detalle.cantidad ?? 0),
        0
      ),
    ])
  );

  return { ...remito, DETALLES_REMITO: detalles, totales_por_metodo };
};

module.exports = {
  redondearPrecio,
  precioConRecargo,
  listarMetodosDePago,
  preciosDeArticulo,
  remitoConTotales,
};
