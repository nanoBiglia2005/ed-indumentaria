// Ambiente de PRUEBA del flujo de venta (/api/venta-prueba).
//
// Convive con routes/venta.js, que sigue atendiendo la pagina en uso sin
// cambios: aca solo viven los endpoints NUEVOS del flujo que se esta armando.
// Los pasos cliente -> grupo -> articulos del modal de busqueda se siguen
// pidiendo a /api/venta, que no se toco.
//
// Todo el router es solo para ROLES_PRUEBA (superadmin): mientras la
// funcionalidad esta a medio hacer no tiene que ser alcanzable por el resto,
// ni siquiera llamando a la API a mano.
const express = require('express');
const prisma = require('../db');
const { HttpError, asyncHandler } = require('../lib/http');
const { requireRol } = require('../lib/roles');
const { parseId } = require('../lib/validaciones');
const { ROLES_PRUEBA } = require('../constants/roles');
const { BARCODE_HEADER_MAX, BARCODE_TAIL_MAX } = require('../constants/barcode');
const { ESTADO_CONFIRMADO } = require('../constants/ventas');
const { buscarArticuloPorCodigo } = require('../services/busquedaPorBarcode');
const {
  parsearDatosCliente,
  buscarPorDni,
  buscarClientes,
  obtenerCliente,
} = require('../services/clientesFinales');
const { remitosInclude, resolverItemsVenta } = require('../services/remitos');
const { construirPayloadTicket, enviarTrabajoDeImpresion } = require('../services/impresion');

const router = express.Router();

router.use(requireRol(...ROLES_PRUEBA));

// Un codigo completo es, como mucho, un header lleno mas un tail lleno.
const BARCODE_MAX = BARCODE_HEADER_MAX + BARCODE_TAIL_MAX;

// El frontend ya deja tipear solo numeros, pero el limite real es este: la
// query llega tal cual desde el navegador.
const parseCodigo = (valor) => {
  const codigo = typeof valor === 'string' ? valor.trim() : '';

  if (!/^\d+$/.test(codigo) || codigo.length > BARCODE_MAX) {
    throw new HttpError(400, {
      message: `El código de barras debe ser un número de hasta ${BARCODE_MAX} dígitos.`,
    });
  }

  return codigo;
};

// Articulo con ese codigo de barra completo, para agregarlo a la venta con el
// lector. El 404 es un caso ESPERADO (se escaneo algo que no esta): el modal lo
// muestra como un aviso, no como un error.
router.get(
  '/articulo-por-codigo',
  asyncHandler(async (req, res) => {
    const codigo = parseCodigo(req.query.codigo);
    const articulo = await buscarArticuloPorCodigo(codigo);

    if (!articulo) {
      throw new HttpError(404, {
        message: `No existe ningún artículo con el código ${codigo}.`,
      });
    }

    // Los articulos no vigentes no se venden (tampoco aparecen en el modal de
    // busqueda), pero conviene decir POR QUE no se puede agregar en vez de
    // hacerlo pasar por inexistente.
    if (articulo.vigente !== true) {
      throw new HttpError(404, {
        message: `El artículo "${articulo.descripcion ?? 'Sin Nombre'}" (código ${codigo}) no está vigente.`,
      });
    }

    res.status(200).json(articulo);
  }, 'Error al buscar el artículo por código de barras.')
);

// ============================================================
//  CLIENTE FINAL DE LA VENTA (tabla CLIENTES, la minorista)
// ============================================================

// El selector muestra unos pocos resultados: es para reconocer al cliente que
// esta en el mostrador, no para listar la tabla.
const MAX_RESULTADOS = 8;

// Busqueda del selector: un solo termino contra nombre, apellido y DNI.
router.get(
  '/clientes',
  asyncHandler(async (req, res) => {
    const termino = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';

    // Sin termino no se devuelve "todo": el selector solo busca cuando se tipea.
    if (termino === '') {
      res.status(200).json([]);
      return;
    }

    res.status(200).json(await buscarClientes(termino, MAX_RESULTADOS));
  }, 'Error al buscar los clientes.')
);

/**
 * Alta de un cliente para asignarlo a la venta.
 *
 * El DNI repetido NO es un error: es una decision del usuario (asignar el que
 * ya existe, pisarle los datos, o cancelar), asi que se responde 200 con
 * `creado: false` y el cliente encontrado. Un 409 obligaria al frontend a
 * leer el cuerpo de un error para seguir el flujo normal.
 */
router.post(
  '/clientes',
  asyncHandler(async (req, res) => {
    const datos = parsearDatosCliente(req.body);

    const existente = await buscarPorDni(datos.dni);
    if (existente) {
      res.status(200).json({ creado: false, cliente: existente });
      return;
    }

    const cliente = await prisma.CLIENTES.create({ data: datos });
    res.status(201).json({ creado: true, cliente });
  }, 'Error al crear el cliente.')
);

// Pisa los datos del cliente (el "asignar y sobrescribir" del DNI repetido).
router.put(
  '/clientes/:id_cliente',
  asyncHandler(async (req, res) => {
    const id_cliente = parseId(req.params.id_cliente, 'El id del cliente debe ser un numero.');
    const datos = parsearDatosCliente(req.body);

    await obtenerCliente(id_cliente);

    res.status(200).json(await prisma.CLIENTES.update({ where: { id_cliente }, data: datos }));
  }, 'Error al actualizar el cliente.')
);

// ============================================================
//  ALTA DE LA VENTA
// ============================================================

// Espejo RUNTIME de remitosConClienteInclude de backend/types.ts (alla se
// declara a nivel de TIPOS, para el frontend). Si cambia uno, cambiar el otro.
const remitosConClienteInclude = { ...remitosInclude, CLIENTES: true };

/**
 * Registra la venta como CONFIRMADA (pendiente de cobro), igual que
 * POST /api/remitos, con dos diferencias del flujo nuevo:
 *
 *  - se asigna el cliente final (REMITOS.id_cliente) y, si sus datos se
 *    editaron en la pantalla, se actualizan en la MISMA transaccion: o queda
 *    todo o no queda nada;
 *  - solo se carga `fecha_de_creacion`. La de emision se llenara cuando el
 *    remito se emita de verdad.
 *
 * `cod_remito_final` no se toca: lo asigna el trigger trg_cod_remito_final de
 * la base a partir de remitos_contador.
 */
router.post(
  '/remitos',
  asyncHandler(async (req, res) => {
    const { error, items, recargoTarjeta } = await resolverItemsVenta(req.body.detalles);
    if (error) {
      throw new HttpError(error.status, { message: error.message });
    }

    // El cliente es opcional: una venta puede no tener a nadie asignado.
    const id_cliente =
      req.body.id_cliente === undefined || req.body.id_cliente === null
        ? null
        : parseId(req.body.id_cliente, 'El id del cliente debe ser un numero.');

    // Datos editados en pantalla del cliente ya asignado. Se validan ANTES de
    // abrir la transaccion para no crear el remito si el formulario esta mal.
    let datosCliente = null;
    if (id_cliente !== null) {
      await obtenerCliente(id_cliente);
      if (req.body.cliente) datosCliente = parsearDatosCliente(req.body.cliente);
    }

    const detallesData = items.map((item) => ({
      id_articulo: item.id_articulo,
      precio: item.precio_efectivo,
      cantidad: item.cantidad,
    }));

    const totalVenta = detallesData.reduce((acumulado, d) => acumulado + d.precio * d.cantidad, 0);

    const nuevoRemito = await prisma.$transaction(async (tx) => {
      if (datosCliente) {
        await tx.CLIENTES.update({ where: { id_cliente }, data: datosCliente });
      }

      return tx.REMITOS.create({
        data: {
          fecha_de_creacion: new Date(),
          id_estado: ESTADO_CONFIRMADO,
          id_cliente,
          total_inicial: totalVenta,
          DETALLES_REMITO: { create: detallesData },
        },
        include: remitosConClienteInclude,
      });
    });

    // La venta ya quedo guardada: si falla la impresion no se revierte, se
    // avisa en la respuesta.
    let impresion = { status: 'omitida' };
    if (req.body.imprimir !== false) {
      impresion = { status: 'ok' };
      try {
        const { respuesta, resultado } = await enviarTrabajoDeImpresion(
          construirPayloadTicket(items, recargoTarjeta, {
            id_remito: nuevoRemito.id_remito,
            fecha: nuevoRemito.fecha_de_creacion,
          })
        );

        if (!respuesta.ok || resultado.status === 'error') {
          throw new Error(resultado.message ?? resultado.detail ?? 'No se pudo imprimir el remito.');
        }
      } catch (errorImpresion) {
        console.error('Error al imprimir el remito:', errorImpresion);
        impresion = { status: 'error', message: errorImpresion.message };
      }
    }

    res.status(201).json({ ...nuevoRemito, impresion });
  }, 'Error al crear la venta.')
);

module.exports = router;
