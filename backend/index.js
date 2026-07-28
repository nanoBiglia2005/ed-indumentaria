const express = require('express');
const cors = require('cors');
const prisma = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const PRINT_SERVICE_URL = process.env.PRINT_SERVICE_URL || 'http://localhost:8001';

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'OK',
      message: 'Conexión a la base de datos PostgreSQL exitosa'
    });
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'No se pudo conectar a la base de datos.',
      details: error.message
    });
  }
});



// ============================================================
//  ARTICULOS
// ============================================================

// Relaciones que se incluyen al consultar ARTICULOS.
// Fuente unica del lado del backend (debe reflejar el de backend/types.ts).
const articulosInclude = {
  COLORES: true,
  TALLES: true,
  TIPOS_DE_MEDIDA: true,
  PROVEEDORES: true,
};

// Obtener TODOS los articulos
app.get('/api/articulos', async (req, res) => {
  try {
    const articulos = await prisma.ARTICULOS.findMany({
      include: articulosInclude,
    });
    res.status(200).json(articulos);
  } catch (error) {
    console.error('Error al obtener los articulos:', error);
    res.status(500).json({ message: 'Error al obtener los articulos.', details: error.message });
  }
});

// Obtener articulos segun su GRUPO (via ARTICULOS_X_GRUPO_VENTA_alt)
app.get('/api/articulos/grupo/:id_grupo', async (req, res) => {
  try {
    const id_grupo = parseInt(req.params.id_grupo, 10);
    if (Number.isNaN(id_grupo)) {
      return res.status(400).json({ message: 'El id del grupo debe ser un numero.' });
    }

    const articulos = await prisma.ARTICULOS.findMany({
      where: {
        ARTICULOS_X_GRUPO_VENTA_alt: {
          some: { id_grupo_venta: id_grupo },
        },
      },
      include: {
        ...articulosInclude,
        ARTICULOS_X_GRUPO_VENTA_alt: {
          where: { id_grupo_venta: id_grupo },
          include: { GRUPOS_DE_VENTA: true },
        },
      },
    });
    res.status(200).json(articulos);
  } catch (error) {
    console.error('Error al obtener los articulos por grupo:', error);
    res.status(500).json({ message: 'Error al obtener los articulos por grupo.', details: error.message });
  }
});

// Obtener articulos segun su CLIENTE (via ARTICULOS_X_CLIENTES)
app.get('/api/articulos/cliente/:id_cliente', async (req, res) => {
  try {
    const id_cliente = parseInt(req.params.id_cliente, 10);
    if (Number.isNaN(id_cliente)) {
      return res.status(400).json({ message: 'El id del cliente debe ser un numero.' });
    }

    const articulos = await prisma.ARTICULOS.findMany({
      where: {
        ARTICULOS_X_CLIENTES: {
          some: { id_cliente },
        },
      },
      include: {
        ...articulosInclude,
        ARTICULOS_X_CLIENTES: {
          where: { id_cliente },
          include: { CLIENTES: true },
        },
      },
    });
    res.status(200).json(articulos);
  } catch (error) {
    console.error('Error al obtener los articulos por cliente:', error);
    res.status(500).json({ message: 'Error al obtener los articulos por cliente.', details: error.message });
  }
});

// Crear un nuevo articulo (tabla ARTICULOS)
app.post('/api/articulos', async (req, res) => {
  try {
    const {
      cant,
      precio,
      barcode,
      stock_minimo,
      vigente,
      id_medida,
      id_color,
      id_talle,
      cant_reservada,
    } = req.body;

    const nuevoArticulo = await prisma.ARTICULOS.create({
      data: {
        cant,
        precio,
        barcode,
        stock_minimo,
        vigente,
        id_medida,
        id_color,
        id_talle,
        cant_reservada,
      },
      include: articulosInclude,
    });
    res.status(201).json(nuevoArticulo);
  } catch (error) {
    console.error('Error al crear el articulo:', error);
    res.status(500).json({ message: 'Error al crear el articulo.', details: error.message });
  }
});

// Actualizar un articulo existente (tabla ARTICULOS)
app.put('/api/articulos/:id_articulo', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const {
      cant,
      precio,
      barcode,
      stock_minimo,
      id_color,
      id_talle,
      cant_reservada,
      descripcion,
    } = req.body;

    const articuloActualizado = await prisma.ARTICULOS.update({
      where: { id_articulo },
      data: {
        cant,
        precio,
        barcode,
        stock_minimo,
        id_color,
        id_talle,
        cant_reservada,
        descripcion,
      },
      include: articulosInclude,
    });
    res.status(200).json(articuloActualizado);
  } catch (error) {
    console.error('Error al actualizar el articulo:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe un articulo con ese codigo de barra.', details: error.message });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El articulo no existe.', details: error.message });
    }
    res.status(500).json({ message: 'Error al actualizar el articulo.', details: error.message });
  }
});

// Asignar un articulo a un GRUPO (tabla ARTICULOS_X_GRUPO_VENTA_alt)
app.post('/api/articulos/:id_articulo/grupos', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const { id_grupo } = req.body;

    const asignacion = await prisma.ARTICULOS_X_GRUPO_VENTA_alt.create({
      data: { id_articulo, id_grupo_venta: id_grupo },
    });
    res.status(201).json(asignacion);
  } catch (error) {
    console.error('Error al asignar el articulo al grupo:', error);
    res.status(500).json({ message: 'Error al asignar el articulo al grupo.', details: error.message });
  }
});

// Asignar un articulo a un CLIENTE (tabla ARTICULOS_X_CLIENTES)
app.post('/api/articulos/:id_articulo/clientes', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const { id_cliente, descripcion } = req.body;

    const asignacion = await prisma.ARTICULOS_X_CLIENTES.create({
      data: { id_articulo, id_cliente, descripcion },
    });
    res.status(201).json(asignacion);
  } catch (error) {
    console.error('Error al asignar el articulo al cliente:', error);
    res.status(500).json({ message: 'Error al asignar el articulo al cliente.', details: error.message });
  }
});

// Quitar un articulo de un GRUPO (tabla ARTICULOS_X_GRUPO_VENTA_alt)
app.delete('/api/articulos/:id_articulo/grupos/:id_grupo', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    const id_grupo = parseInt(req.params.id_grupo, 10);
    if (Number.isNaN(id_articulo) || Number.isNaN(id_grupo)) {
      return res.status(400).json({ message: 'El id del articulo y del grupo deben ser numeros.' });
    }

    await prisma.ARTICULOS_X_GRUPO_VENTA_alt.deleteMany({
      where: { id_articulo, id_grupo_venta: id_grupo },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error al quitar el articulo del grupo:', error);
    res.status(500).json({ message: 'Error al quitar el articulo del grupo.', details: error.message });
  }
});

// Quitar un articulo de un CLIENTE (tabla ARTICULOS_X_CLIENTES)
app.delete('/api/articulos/:id_articulo/clientes/:id_cliente', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    const id_cliente = parseInt(req.params.id_cliente, 10);
    if (Number.isNaN(id_articulo) || Number.isNaN(id_cliente)) {
      return res.status(400).json({ message: 'El id del articulo y del cliente deben ser numeros.' });
    }

    await prisma.ARTICULOS_X_CLIENTES.deleteMany({
      where: { id_articulo, id_cliente },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error al quitar el articulo del cliente:', error);
    res.status(500).json({ message: 'Error al quitar el articulo del cliente.', details: error.message });
  }
});

// Obtener TODOS los registros de ARTICULOS_X_GRUPO_VENTA_alt (para filtrar en el frontend)
app.get('/api/articulos-x-grupo', async (req, res) => {
  try {
    const registros = await prisma.ARTICULOS_X_GRUPO_VENTA_alt.findMany();
    res.status(200).json(registros);
  } catch (error) {
    console.error('Error al obtener ARTICULOS_X_GRUPO_VENTA_alt:', error);
    res.status(500).json({ message: 'Error al obtener ARTICULOS_X_GRUPO_VENTA_alt.', details: error.message });
  }
});

// Obtener TODOS los registros de ARTICULOS_X_CLIENTES (para filtrar en el frontend)
app.get('/api/articulos-x-clientes', async (req, res) => {
  try {
    const registros = await prisma.ARTICULOS_X_CLIENTES.findMany();
    res.status(200).json(registros);
  } catch (error) {
    console.error('Error al obtener ARTICULOS_X_CLIENTES:', error);
    res.status(500).json({ message: 'Error al obtener ARTICULOS_X_CLIENTES.', details: error.message });
  }
});

// ============================================================
//  GRUPOS DE VENTA
// ============================================================

// Obtener TODOS los grupos de venta (para poblar el dropdown)
app.get('/api/grupos', async (req, res) => {
  try {
    const grupos = await prisma.GRUPOS_DE_VENTA.findMany();
    res.status(200).json(grupos);
  } catch (error) {
    console.error('Error al obtener los grupos de articulos:', error);
    res.status(500).json({ message: 'Error al obtener los grupos de articulos.', details: error.message });
  }
});

// Crear un nuevo grupo de venta (tabla GRUPOS_DE_VENTA)
app.post('/api/grupos', async (req, res) => {
  try {
    const { nombre_grupo, tipo_grupo } = req.body;

    const nuevoGrupo = await prisma.GRUPOS_DE_VENTA.create({
      data: { nombre_grupo, tipo_grupo },
    });
    res.status(201).json(nuevoGrupo);
  } catch (error) {
    console.error('Error al crear el grupo de articulos:', error);
    res.status(500).json({ message: 'Error al crear el grupo de articulos.', details: error.message });
  }
});

// Obtener TODOS los subgrupos de venta (para filtrar en el frontend)
app.get('/api/subgrupos', async (req, res) => {
  try {
    const subgrupos = await prisma.SUBGRUPOS_DE_VENTA_alt.findMany();
    res.status(200).json(subgrupos);
  } catch (error) {
    console.error('Error al obtener los subgrupos de venta:', error);
    res.status(500).json({ message: 'Error al obtener los subgrupos de venta.', details: error.message });
  }
});

// ============================================================
//  TALLES
// ============================================================

// Obtener TODOS los talles (para poblar el dropdown)
app.get('/api/talles', async (req, res) => {
  try {
    const talles = await prisma.TALLES.findMany();
    res.status(200).json(talles);
  } catch (error) {
    console.error('Error al obtener los talles:', error);
    res.status(500).json({ message: 'Error al obtener los talles.', details: error.message });
  }
});

// ============================================================
//  COLORES
// ============================================================

// Obtener TODOS los colores (para poblar el dropdown)
app.get('/api/colores', async (req, res) => {
  try {
    const colores = await prisma.COLORES.findMany();
    res.status(200).json(colores);
  } catch (error) {
    console.error('Error al obtener los colores:', error);
    res.status(500).json({ message: 'Error al obtener los colores.', details: error.message });
  }
});

// ============================================================
//  CLIENTES
// ============================================================

// Obtener TODOS los clientes (para poblar el dropdown)
app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await prisma.CLIENTES.findMany();
    res.status(200).json(clientes);
  } catch (error) {
    console.error('Error al obtener los clientes:', error);
    res.status(500).json({ message: 'Error al obtener los clientes.', details: error.message });
  }
});

// Crear un nuevo cliente (tabla CLIENTES)
app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, id_grupo } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El campo "nombre" es obligatorio.' });
    }

    const nuevoCliente = await prisma.CLIENTES.create({
      data: { nombre, id_grupo },
    });
    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error('Error al crear el cliente:', error);
    res.status(500).json({ message: 'Error al crear el cliente.', details: error.message });
  }
});

// ============================================================
//  TIPOS DE PAGO
// ============================================================

// Obtener TODOS los tipos de pago
app.get('/api/tipos-de-pago', async (req, res) => {
  try {
    const tiposDePago = await prisma.TIPOS_DE_PAGO.findMany();
    res.status(200).json(tiposDePago);
  } catch (error) {
    console.error('Error al obtener los tipos de pago:', error);
    res.status(500).json({ message: 'Error al obtener los tipos de pago.', details: error.message });
  }
});

// Actualizar el recargo de un tipo de pago (tabla TIPOS_DE_PAGO)
app.put('/api/tipos-de-pago/:id_tipos_de_pago', async (req, res) => {
  try {
    const id_tipos_de_pago = parseInt(req.params.id_tipos_de_pago, 10);
    if (Number.isNaN(id_tipos_de_pago)) {
      return res.status(400).json({ message: 'El id del tipo de pago debe ser un numero.' });
    }

    const recargo = Number(req.body.recargo);
    if (!Number.isFinite(recargo) || recargo < 0) {
      return res.status(400).json({ message: 'El recargo debe ser un numero mayor o igual a 0.' });
    }

    const tipoDePagoActualizado = await prisma.TIPOS_DE_PAGO.update({
      where: { id_tipos_de_pago },
      data: { recargo },
    });
    res.status(200).json(tipoDePagoActualizado);
  } catch (error) {
    console.error('Error al actualizar el tipo de pago:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El tipo de pago no existe.', details: error.message });
    }
    res.status(500).json({ message: 'Error al actualizar el tipo de pago.', details: error.message });
  }
});

// ============================================================
//  REMITOS (VENTAS)
// ============================================================

// Relaciones que se incluyen al consultar REMITOS.
// Debe reflejar el de backend/types.ts.
const remitosInclude = {
  DETALLES_REMITO: {
    include: { ARTICULOS: true },
  },
};

// Redondeo comercial de la venta, en dos pasos:
//   1) se van los centavos  (>= .50 sube)
//   2) el precio queda "redondo" a la decena (ultimo digito >= 5 sube)
// Los dos pasos NO son lo mismo que redondear directo a la decena:
// 104.6 -> 105 -> 110, mientras que a la decena directa daria 100.
// Se aplica recien al confirmar la venta: el carrito muestra los precios originales.
const redondearPrecio = (valor) => Math.round(Math.round(valor) / 10) * 10;

// Las fechas de REMITOS son columnas @db.Date, o sea medianoche UTC. Hay que
// leerlas en UTC: con la hora local de Argentina (UTC-3) caerian el dia anterior.
const formatearFecha = (fecha) => {
  const valor = fecha ? new Date(fecha) : new Date();
  const dia = String(valor.getUTCDate()).padStart(2, '0');
  const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${valor.getUTCFullYear()}`;
};

const METODOS_DE_PAGO = ['efectivo', 'tarjeta'];

// Valida los articulos de una venta y les calcula los dos precios posibles.
// Los precios NUNCA se toman del cliente: se leen de ARTICULOS y el recargo de
// TIPOS_DE_PAGO. Devuelve { error: { status, message } } si algo no valida.
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

    // Al imprimir todavia no hay metodo elegido: se asume efectivo.
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

  const tiposDePago = await prisma.TIPOS_DE_PAGO.findMany();
  const tarjeta = tiposDePago.find((tipo) =>
    (tipo.nombre_tipo_de_pago ?? '').toLowerCase().includes('tarjeta')
  );

  if (!tarjeta) {
    console.warn('No se encontro un tipo de pago "Tarjeta": la venta se calcula sin recargo.');
  }

  const recargoTarjeta = tarjeta?.recargo ?? 0;
  const multiplicador = 1 + recargoTarjeta / 100;

  const items = articulos.map((articulo) => {
    const precioEfectivo = redondearPrecio(articulo.precio);

    return {
      id_articulo: articulo.id_articulo,
      descripcion: articulo.descripcion ?? `Articulo ${articulo.id_articulo}`,
      cantidad: cantidadesPorArticulo.get(articulo.id_articulo),
      metodo_pago: metodosPorArticulo.get(articulo.id_articulo),
      precio_efectivo: precioEfectivo,
      // El recargo tambien se redondea, asi todo queda en numeros redondos.
      precio_tarjeta: redondearPrecio(precioEfectivo * multiplicador),
    };
  });

  return { items, recargoTarjeta };
};

// Arma el payload del ticket, que muestra siempre los dos precios (el cliente
// elige como paga despues de verlo). `id_remito` va en null porque se imprime
// antes de registrar la venta.
const construirPayloadTicket = (items, recargoTarjeta, { id_remito = null, fecha = new Date() } = {}) => {
  const lineas = items.map((item) => ({
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_efectivo: item.precio_efectivo,
    precio_tarjeta: item.precio_tarjeta,
    // Los subtotales salen del unitario ya redondeado, para que las lineas
    // del ticket cierren con el total.
    subtotal_efectivo: item.precio_efectivo * item.cantidad,
    subtotal_tarjeta: item.precio_tarjeta * item.cantidad,
  }));

  return {
    tipo: 'remito',
    id_remito,
    fecha: formatearFecha(fecha),
    recargo_tarjeta: recargoTarjeta,
    total_efectivo: lineas.reduce((acumulado, linea) => acumulado + linea.subtotal_efectivo, 0),
    total_tarjeta: lineas.reduce((acumulado, linea) => acumulado + linea.subtotal_tarjeta, 0),
    items: lineas,
  };
};

// Obtener TODOS los remitos (ventas), con sus detalles y articulos
app.get('/api/remitos', async (req, res) => {
  try {
    const remitos = await prisma.REMITOS.findMany({
      include: remitosInclude,
      orderBy: { id_remito: 'desc' },
    });
    res.status(200).json(remitos);
  } catch (error) {
    console.error('Error al obtener los remitos:', error);
    res.status(500).json({ message: 'Error al obtener los remitos.', details: error.message });
  }
});

// Prepara una venta ANTES de registrarla: calcula los precios y (salvo que se
// pida `imprimir: false`) imprime el ticket con los dos precios, para que el
// cliente elija como paga recien despues de verlo. NO escribe nada en la base.
// Devuelve los items ya calculados para que el frontend muestre esos mismos
// precios sin tener que replicar el redondeo.
app.post('/api/remitos/preparar', async (req, res) => {
  try {
    const { error, items, recargoTarjeta } = await resolverItemsVenta(req.body.detalles);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    if (req.body.imprimir === false) {
      return res.status(200).json({
        items,
        recargo_tarjeta: recargoTarjeta,
        impresion: { status: 'omitida' },
      });
    }

    // Si falla la impresion no se corta el flujo: los precios estan en pantalla,
    // asi que la venta puede seguir y el frontend avisa del problema.
    let impresion = { status: 'ok' };
    try {
      const { respuesta, resultado } = await enviarTrabajoDeImpresion(
        construirPayloadTicket(items, recargoTarjeta)
      );

      if (!respuesta.ok || resultado.status === 'error') {
        throw new Error(resultado.message ?? resultado.detail ?? 'No se pudo imprimir el remito.');
      }
    } catch (errorImpresion) {
      console.error('Error al imprimir el remito:', errorImpresion);
      impresion = { status: 'error', message: errorImpresion.message };
    }

    res.status(200).json({ items, recargo_tarjeta: recargoTarjeta, impresion });
  } catch (error) {
    console.error('Error al preparar la venta:', error);
    res.status(500).json({ message: 'Error al preparar la venta.', details: error.message });
  }
});

// Crear un nuevo remito (venta) junto con sus detalles (tablas REMITOS y DETALLES_REMITO).
// Cada detalle trae su `metodo_pago`, que define cual de los dos precios se guarda.
// El ticket ya se imprimio en /api/remitos/imprimir, asi que aca no se imprime nada.
app.post('/api/remitos', async (req, res) => {
  try {
    const { error, items } = await resolverItemsVenta(req.body.detalles);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const detallesData = items.map((item) => ({
      id_articulo: item.id_articulo,
      precio: item.metodo_pago === 'tarjeta' ? item.precio_tarjeta : item.precio_efectivo,
      cantidad: item.cantidad,
    }));

    const totalVenta = detallesData.reduce((acumulado, d) => acumulado + d.precio * d.cantidad, 0);
    const ahora = new Date();

    const nuevoRemito = await prisma.REMITOS.create({
      data: {
        fecha_de_emision: ahora,
        fecha_de_creacion: ahora,
        total_bruto: totalVenta,
        total_neto: totalVenta,
        DETALLES_REMITO: {
          create: detallesData,
        },
      },
      include: remitosInclude,
    });

    res.status(201).json(nuevoRemito);
  } catch (error) {
    console.error('Error al crear la venta:', error);
    res.status(500).json({ message: 'Error al crear la venta.', details: error.message });
  }
});

// ============================================================
//  IMPRESION
// ============================================================

// Envia un trabajo al print-service, que lo reenvia por websocket a la impresora local.
// El `tipo` del payload decide que imprime el printer-client ('barcode' o 'remito').
const enviarTrabajoDeImpresion = async (payload) => {
  const respuesta = await fetch(`${PRINT_SERVICE_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });

  const resultado = await respuesta.json().catch(() => ({}));
  return { respuesta, resultado };
};

// Envia un articulo a imprimir en la impresora local del cliente (via print-service)
app.post('/api/print', async (req, res) => {
  try {
    const id_articulo = parseInt(req.body.id_articulo, 10);
    const cantidad = parseInt(req.body.cantidad, 10) || 1;
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const articulo = await prisma.ARTICULOS.findUnique({
      where: { id_articulo },
      include: articulosInclude,
    });
    if (!articulo) {
      return res.status(404).json({ message: 'El articulo no existe.' });
    }

    const { respuesta: printResponse, resultado: printResult } = await enviarTrabajoDeImpresion({
      tipo: 'barcode',
      id_articulo: articulo.id_articulo,
      barcode: articulo.barcode,
      descripcion: articulo.descripcion,
      precio: articulo.precio,
      talle: articulo.TALLES?.nombre_talle,
      color: articulo.COLORES?.nombre_color,
      cantidad,
    });

    if (!printResponse.ok) {
      return res.status(printResponse.status).json(printResult);
    }
    res.status(200).json(printResult);
  } catch (error) {
    console.error('Error al enviar el trabajo de impresion:', error);
    res.status(500).json({ message: 'Error al enviar el trabajo de impresion.', details: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Servidor Express corriendo correctamente.');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto http://localhost:${PORT}`);
});