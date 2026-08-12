// Logica de negocio de remitos (ventas): precios, validacion de items y
// busqueda de remitos pendientes. Las rutas (routes/remitos.js) solo orquestan.
const prisma = require('../db');
const { ESTADO_CONFIRMADO, METODOS_DE_PAGO } = require('../constants/ventas');

// Relaciones que se incluyen al consultar REMITOS en TODAS las rutas.
// OJO: backend/types.ts declara este mismo shape a nivel de tipos para el
// frontend (RemitoConDetalles); si cambia aca hay que actualizarlo alla.
const remitosInclude = {
  DETALLES_REMITO: {
    include: { ARTICULOS: true },
  },
};

const redondearPrecio = (valor) => Math.round(Math.round(valor) / 10) * 10;

// El recargo sale de TIPOS_DE_PAGO (configurable desde la app).
const obtenerRecargoTarjeta = async () => {
  const tiposDePago = await prisma.TIPOS_DE_PAGO.findMany();
  const tarjeta = tiposDePago.find((tipo) =>
    (tipo.nombre_tipo_de_pago ?? '').toLowerCase().includes('tarjeta')
  );

  if (!tarjeta) {
    console.warn('No se encontro un tipo de pago "Tarjeta": la venta se calcula sin recargo.');
  }

  return tarjeta?.recargo ?? 0;
};

const resolverItemsVenta = async (detalles) => {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    return { error: { status: 400, message: 'La venta debe tener al menos un articulo.' } };
  }

  const cantidadesPorArticulo = new Map();
  const metodosPorArticulo = new Map();

  for (const detalle of detalles) {
    const id_articulo = parseInt(detalle.id_articulo, 10);
    const cantidad = parseInt(detalle.cantidad, 10);

    if (Number.isNaN(id_articulo)) {
      return { error: { status: 400, message: 'Los articulos de la venta son invalidos.' } };
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return {
        error: { status: 400, message: 'Las cantidades de la venta deben ser numeros enteros mayores a 0.' },
      };
    }

    const metodo = detalle.metodo_pago ?? 'efectivo';
    if (!METODOS_DE_PAGO.includes(metodo)) {
      return { error: { status: 400, message: `Metodo de pago invalido: "${metodo}".` } };
    }

    cantidadesPorArticulo.set(id_articulo, cantidad);
    metodosPorArticulo.set(id_articulo, metodo);
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

  const recargoTarjeta = await obtenerRecargoTarjeta();
  const multiplicador = 1 + recargoTarjeta / 100;

  const items = articulos.map((articulo) => {
    const precioEfectivo = redondearPrecio(articulo.precio);

    return {
      id_articulo: articulo.id_articulo,
      descripcion: articulo.descripcion ?? `Articulo ${articulo.id_articulo}`,
      cantidad: cantidadesPorArticulo.get(articulo.id_articulo),
      metodo_pago: metodosPorArticulo.get(articulo.id_articulo),
      precio_efectivo: precioEfectivo,
      precio_tarjeta: redondearPrecio(precioEfectivo * multiplicador),
    };
  });

  return { items, recargoTarjeta };
};

// Busca un remito y valida que siga pendiente de cobro.
const buscarRemitoPendiente = async (idParam) => {
  const id_remito = parseInt(idParam, 10);
  if (Number.isNaN(id_remito)) {
    return { error: { status: 400, message: 'El id del remito debe ser un numero.' } };
  }

  const remito = await prisma.REMITOS.findUnique({
    where: { id_remito },
    include: remitosInclude,
  });

  if (!remito) {
    return { error: { status: 404, message: 'El remito no existe.' } };
  }
  if (remito.id_estado !== ESTADO_CONFIRMADO) {
    return {
      error: { status: 409, message: 'El remito ya no esta pendiente: no se puede modificar.' },
    };
  }

  return { remito };
};

// Precios en efectivo (los guardados) y en tarjeta para cada linea del remito.
// La base es el precio YA GUARDADO, no el del catalogo: el remito se confirmo a
// ese precio aunque el articulo haya cambiado despues.
const opcionesDePagoDeRemito = async (remito) => {
  const recargoTarjeta = await obtenerRecargoTarjeta();
  const multiplicador = 1 + recargoTarjeta / 100;

  const items = remito.DETALLES_REMITO.map((detalle) => {
    const precioEfectivo = detalle.precio ?? 0;

    return {
      id_detalle: detalle.id_detalle,
      descripcion: detalle.ARTICULOS?.descripcion ?? `Articulo ${detalle.id_articulo}`,
      cantidad: detalle.cantidad ?? 0,
      precio_efectivo: precioEfectivo,
      precio_tarjeta: redondearPrecio(precioEfectivo * multiplicador),
    };
  });

  return { items, recargo_tarjeta: recargoTarjeta };
};

module.exports = {
  remitosInclude,
  redondearPrecio,
  obtenerRecargoTarjeta,
  resolverItemsVenta,
  buscarRemitoPendiente,
  opcionesDePagoDeRemito,
};
