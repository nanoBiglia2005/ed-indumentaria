// Logica de negocio de remitos (ventas): validacion de los articulos que entran
// a una venta y busqueda de remitos pendientes. Las rutas (routes/remitos.js)
// solo orquestan.
//
// Los precios por metodo de pago NO viven aca: se derivan del precio base en
// services/preciosPorMetodo.js, que es el unico lugar donde se aplica un
// recargo.
const prisma = require('../db');
const { aId } = require('../lib/validaciones');
const { ESTADO_CONFIRMADO } = require('../constants/ventas');
const { redondearPrecio } = require('./preciosPorMetodo');

// Relaciones que se incluyen al consultar REMITOS en TODAS las rutas.
// OJO: backend/types.ts declara este mismo shape a nivel de tipos para el
// frontend (RemitoConDetalles); si cambia aca hay que actualizarlo alla.
const remitosInclude = {
  DETALLES_REMITO: {
    include: { ARTICULOS: true },
  },
  CLIENTES: true,
  PAGOS_REMITO: true,
};

/**
 * Valida los articulos que llegan del modal de venta y los devuelve con su
 * precio base ya redondeado (el que se va a congelar en la venta).
 */
const resolverItemsVenta = async (detalles) => {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    return { error: { status: 400, message: 'La venta debe tener al menos un articulo.' } };
  }

  const cantidadesPorArticulo = new Map();

  for (const detalle of detalles) {
    const id_articulo = aId(detalle.id_articulo);
    const cantidad = parseInt(detalle.cantidad, 10);

    if (id_articulo === null) {
      return { error: { status: 400, message: 'Los articulos de la venta son invalidos.' } };
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return {
        error: {
          status: 400,
          message: 'Las cantidades de la venta deben ser numeros enteros mayores a 0.',
        },
      };
    }

    cantidadesPorArticulo.set(id_articulo, cantidad);
  }

  const articulos = await prisma.ARTICULOS.findMany({
    where: { id_articulo: { in: [...cantidadesPorArticulo.keys()] } },
  });

  if (articulos.length !== cantidadesPorArticulo.size) {
    return { error: { status: 404, message: 'Alguno de los articulos de la venta no existe.' } };
  }

  const articuloNoVigente = articulos.find((articulo) => !articulo.vigente);
  if (articuloNoVigente) {
    return {
      error: {
        status: 409,
        message: `El articulo "${articuloNoVigente.descripcion ?? articuloNoVigente.id_articulo}" ya no esta vigente.`,
      },
    };
  }

  const items = articulos.map((articulo) => ({
    id_articulo: articulo.id_articulo,
    descripcion: articulo.descripcion ?? `Articulo ${articulo.id_articulo}`,
    cantidad: cantidadesPorArticulo.get(articulo.id_articulo),
    // El precio de la venta se congela redondeado: es lo que se va a cobrar y
    // la base de la que salen los precios de todos los metodos de pago.
    precio: redondearPrecio(articulo.precio),
  }));

  return { items };
};

/**
 * Busca un remito y valida que este en el estado que la accion necesita.
 * `mensajeEstado` explica por que no se puede seguir (409).
 *
 * Devuelve { error } en vez de lanzar porque las rutas validan antes de abrir
 * su transaccion.
 */
const buscarRemitoEnEstado = async (idParam, estadoRequerido, mensajeEstado) => {
  const id_remito = aId(idParam);
  if (id_remito === null) {
    return { error: { status: 400, message: 'El id del remito debe ser un numero.' } };
  }

  const remito = await prisma.REMITOS.findUnique({
    where: { id_remito },
    include: remitosInclude,
  });

  if (!remito) {
    return { error: { status: 404, message: 'El remito no existe.' } };
  }
  if (remito.id_estado !== estadoRequerido) {
    return { error: { status: 409, message: mensajeEstado } };
  }

  return { remito };
};

// Pendiente de cobro: es lo que exigen facturar y anular.
const buscarRemitoPendiente = (idParam) =>
  buscarRemitoEnEstado(
    idParam,
    ESTADO_CONFIRMADO,
    'El remito ya no esta pendiente: no se puede modificar.'
  );

/**
 * Lineas de un remito YA guardado, con la forma que espera
 * construirPayloadTicket. Es lo que usa la reimpresion.
 *
 * Usa el precio CONGELADO del detalle, nunca el precio actual del articulo:
 * reimprimir un remito viejo tiene que dar el mismo ticket que se imprimio ese
 * dia. Si el articulo cambio de precio (o lo borraron) eso no puede alterar un
 * comprobante ya emitido.
 */
const itemsDeRemito = (remito) =>
  (remito.DETALLES_REMITO ?? []).map((detalle) => ({
    id_articulo: detalle.id_articulo,
    descripcion: detalle.ARTICULOS?.descripcion ?? `Articulo ${detalle.id_articulo}`,
    cantidad: detalle.cantidad,
    precio: detalle.precio,
  }));

module.exports = {
  remitosInclude,
  resolverItemsVenta,
  buscarRemitoEnEstado,
  buscarRemitoPendiente,
  itemsDeRemito,
};
