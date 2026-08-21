// Cobro de un remito: como se reparte el precio de la venta entre los metodos
// de pago y cuanto se termina cobrando por cada uno.
//
//   monto inicial = parte del precio de la venta (REMITOS.total_efectivo) que
//                   se paga con ese metodo;
//   monto final   = lo que realmente se cobra por ese metodo.
//
// REGLA DEL METODO UNICO: cuando un solo metodo cubre TODA la venta, lo que se
// cobra es el total de la venta para ese metodo (la suma de sus lineas ya
// redondeadas), no el recargo aplicado sobre el total. Si no fuera asi, pagar
// todo con tarjeta desde el reparto daria distinto que pagarlo con el boton del
// metodo, porque redondear linea por linea y redondear el total no dan lo mismo.
// Repartido entre dos o mas metodos no hay con que comparar: cada parte no se
// corresponde con ningun articulo, asi que se le aplica el recargo al monto.
//
// Los montos finales se recalculan SIEMPRE aca, aunque el frontend ya los
// muestre: lo que llega del navegador no decide cuanta plata entra.
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const { aId } = require('../lib/validaciones');
const { ESTADO_FACTURADO } = require('../constants/ventas');
const { precioConRecargo } = require('./preciosPorMetodo');

const error400 = (message) => new HttpError(400, { message });

// La suma se compara con tolerancia de medio centavo: los totales son Float y
// sumar decimales puede dejar polvo binario (0.1 + 0.2 !== 0.3).
const TOLERANCIA = 0.009;

/**
 * Valida el reparto que llega del modal y devuelve solo los pagos reales.
 *
 * El frontend manda SIEMPRE todos los metodos de pago; los que vienen en 0 no
 * participan del cobro y no generan fila en PAGOS_REMITO.
 *
 * `totalesDelRemito` son los totales de la venta por metodo, para la regla del
 * metodo unico.
 */
const parsearPagos = (cuerpo, metodos, totalEfectivo, totalesDelRemito) => {
  const pagos = cuerpo?.pagos;
  if (!Array.isArray(pagos)) {
    throw error400('Falta el detalle de como se paga el remito.');
  }

  const porId = new Map(metodos.map((metodo) => [metodo.id_tipos_de_pago, metodo]));
  const vistos = new Set();
  const reales = [];

  for (const pago of pagos) {
    // Un id invalido cae en null, que no esta en el mapa: lo rechaza el mismo
    // "no existe" de abajo, con el valor crudo en el mensaje.
    const id_tipo_de_pago = aId(pago?.id_tipo_de_pago);
    const metodo = porId.get(id_tipo_de_pago);

    if (!metodo) {
      throw error400(`El metodo de pago "${pago?.id_tipo_de_pago}" no existe.`);
    }
    if (vistos.has(id_tipo_de_pago)) {
      throw error400(`El metodo "${metodo.nombre_tipo_de_pago}" viene repetido.`);
    }
    vistos.add(id_tipo_de_pago);

    const monto_inicial = Number(pago?.monto_inicial ?? 0);
    if (!Number.isFinite(monto_inicial) || monto_inicial < 0) {
      throw error400(
        `El monto de "${metodo.nombre_tipo_de_pago}" debe ser un numero mayor o igual a 0.`
      );
    }

    // Metodo en 0 = no se uso: ni el id ni el monto quedan guardados.
    if (monto_inicial === 0) continue;

    reales.push({ id_tipo_de_pago, monto_inicial, recargo: metodo.recargo });
  }

  // El reparto tiene que cubrir el precio de la venta EXACTO: ni de menos
  // (quedaria plata sin cobrar) ni de mas (se estaria cobrando de mas).
  const suma = reales.reduce((acumulado, pago) => acumulado + pago.monto_inicial, 0);
  if (Math.abs(suma - totalEfectivo) > TOLERANCIA) {
    throw error400(
      `Los montos iniciales deben sumar exactamente ${totalEfectivo} (suman ${suma}).`
    );
  }

  // Un solo metodo cubre toda la venta: vale el total de la venta para ese
  // metodo, que es el mismo numero que muestra el boton del metodo.
  const metodoUnico = reales.length === 1;

  return reales.map(({ id_tipo_de_pago, monto_inicial, recargo }) => ({
    id_tipo_de_pago,
    monto_inicial,
    monto_final: metodoUnico
      ? totalesDelRemito[id_tipo_de_pago] ?? precioConRecargo(monto_inicial, recargo)
      : precioConRecargo(monto_inicial, recargo),
  }));
};

/**
 * Guarda el cobro: las filas de PAGOS_REMITO, el total final y el pase a
 * FACTURADO, todo en una transaccion. No toca DETALLES_REMITO: los precios de
 * los articulos quedaron congelados al confirmar la venta.
 */
const registrarCobro = (remito, pagos, include) => {
  const total_final = pagos.reduce((acumulado, pago) => acumulado + pago.monto_final, 0);

  return prisma.$transaction(async (tx) => {
    // El remito esta CONFIRMADO (lo garantiza buscarRemitoPendiente), asi que
    // no deberia tener pagos; el borrado hace la operacion repetible igual.
    await tx.PAGOS_REMITO.deleteMany({ where: { id_remito: remito.id_remito } });

    if (pagos.length > 0) {
      await tx.PAGOS_REMITO.createMany({
        data: pagos.map((pago) => ({ id_remito: remito.id_remito, ...pago })),
      });
    }

    return tx.REMITOS.update({
      where: { id_remito: remito.id_remito },
      data: { id_estado: ESTADO_FACTURADO, total_final },
      include,
    });
  });
};

module.exports = { parsearPagos, registrarCobro };
