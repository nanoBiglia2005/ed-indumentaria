const express = require('express');
const prisma = require('../db');
const { asyncHandler, HttpError } = require('../lib/http');
const { parseId } = require('../lib/validaciones');
const { ESTADO_CONFIRMADO, ESTADO_ANULADO } = require('../constants/ventas');
const { remitosInclude, resolverItemsVenta, buscarRemitoPendiente } = require('../services/remitos');
const { listarMetodosDePago, remitoConTotales } = require('../services/preciosPorMetodo');
const { parsearPagos, registrarCobro } = require('../services/pagosRemito');
const { parsearDatosCliente, obtenerCliente } = require('../services/clientesFinales');
const { construirPayloadTicket, enviarTrabajoDeImpresion } = require('../services/impresion');

const router = express.Router();

// Todo remito viaja con `totales_por_metodo`: cuanto costaria cobrarlo con cada
// metodo de pago. NO esta guardado en la base, se calcula con el recargo
// vigente a partir de los precios congelados de sus lineas.
const responderRemitos = async (res, remitos) => {
  const metodos = await listarMetodosDePago();
  res.status(200).json(remitos.map((remito) => remitoConTotales(remito, metodos)));
};

// Historial: todo MENOS los pendientes de cobro, que viven en la pagina de Ventas.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const remitos = await prisma.REMITOS.findMany({
      where: { NOT: { id_estado: ESTADO_CONFIRMADO } },
      include: remitosInclude,
      orderBy: { id_remito: 'desc' },
    });
    await responderRemitos(res, remitos);
  }, 'Error al obtener los remitos.')
);

// Remitos confirmados que todavia no se cobraron.
router.get(
  '/pendientes',
  asyncHandler(async (req, res) => {
    const remitos = await prisma.REMITOS.findMany({
      where: { id_estado: ESTADO_CONFIRMADO },
      include: remitosInclude,
      orderBy: { id_remito: 'desc' },
    });
    await responderRemitos(res, remitos);
  }, 'Error al obtener los remitos pendientes.')
);

/**
 * Registra la venta como CONFIRMADA (pendiente de cobro) e imprime el ticket
 * salvo que se pida `imprimir: false`. El metodo de pago se elige despues, al
 * cobrar: aca solo se congela el precio base de cada articulo.
 *
 * Si viene un cliente asignado y sus datos se editaron en la pantalla, se
 * actualizan en la MISMA transaccion: o queda todo o no queda nada.
 *
 * Solo se carga `fecha_de_creacion`; la de emision se llenara cuando el remito
 * se emita de verdad. `cod_remito_final` lo asigna el trigger
 * trg_cod_remito_final de la base a partir de remitos_contador.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { error, items } = await resolverItemsVenta(req.body.detalles);
    if (error) {
      throw new HttpError(error.status, { message: error.message });
    }

    // El cliente es opcional: una venta puede no tener a nadie asignado.
    const id_cliente =
      req.body.id_cliente === undefined || req.body.id_cliente === null
        ? null
        : parseId(req.body.id_cliente, 'El id del cliente debe ser un numero.');

    // Se valida ANTES de abrir la transaccion para no crear el remito si el
    // formulario del cliente esta mal.
    let datosCliente = null;
    if (id_cliente !== null) {
      await obtenerCliente(id_cliente);
      if (req.body.cliente) datosCliente = parsearDatosCliente(req.body.cliente);
    }

    const detallesData = items.map((item) => ({
      id_articulo: item.id_articulo,
      precio: item.precio,
      cantidad: item.cantidad,
    }));

    const totalEfectivo = detallesData.reduce(
      (acumulado, detalle) => acumulado + detalle.precio * detalle.cantidad,
      0
    );

    const nuevoRemito = await prisma.$transaction(async (tx) => {
      if (datosCliente) {
        await tx.CLIENTES.update({ where: { id_cliente }, data: datosCliente });
      }

      return tx.REMITOS.create({
        data: {
          fecha_de_creacion: new Date(),
          id_estado: ESTADO_CONFIRMADO,
          id_cliente,
          total_efectivo: totalEfectivo,
          DETALLES_REMITO: { create: detallesData },
        },
        include: remitosInclude,
      });
    });

    const metodos = await listarMetodosDePago();

    // La venta ya quedo guardada: si falla la impresion no se revierte, se
    // avisa en la respuesta.
    let impresion = { status: 'omitida' };
    if (req.body.imprimir !== false) {
      impresion = { status: 'ok' };
      try {
        const { respuesta, resultado } = await enviarTrabajoDeImpresion(
          construirPayloadTicket(items, metodos, {
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

    res.status(201).json({ ...remitoConTotales(nuevoRemito, metodos), impresion });
  }, 'Error al crear la venta.')
);

/**
 * Cobra un remito pendiente. El metodo de pago es del REMITO, no de cada
 * articulo: los precios de DETALLES_REMITO no se tocan. El reparto entre
 * metodos se guarda en PAGOS_REMITO (una fila por metodo usado) y `total_final`
 * es la suma de lo que se cobra por cada uno.
 *
 * El cuerpo trae TODOS los metodos de pago; los que vengan en 0 se descartan.
 */
router.put(
  '/:id_remito/facturar',
  asyncHandler(async (req, res) => {
    const { error, remito } = await buscarRemitoPendiente(req.params.id_remito);
    if (error) {
      throw new HttpError(error.status, { message: error.message });
    }

    const metodos = await listarMetodosDePago();
    const { totales_por_metodo } = remitoConTotales(remito, metodos);
    const pagos = parsearPagos(req.body, metodos, remito.total_efectivo, totales_por_metodo);

    const facturado = await registrarCobro(remito, pagos, remitosInclude);
    res.status(200).json(remitoConTotales(facturado, metodos));
  }, 'Error al facturar el remito.')
);

// Anula un remito pendiente (no se borra: queda registrado como ANULADO).
router.put(
  '/:id_remito/anular',
  asyncHandler(async (req, res) => {
    const { error, remito } = await buscarRemitoPendiente(req.params.id_remito);
    if (error) {
      throw new HttpError(error.status, { message: error.message });
    }

    const remitoAnulado = await prisma.REMITOS.update({
      where: { id_remito: remito.id_remito },
      data: { id_estado: ESTADO_ANULADO },
      include: remitosInclude,
    });

    const metodos = await listarMetodosDePago();
    res.status(200).json(remitoConTotales(remitoAnulado, metodos));
  }, 'Error al anular el remito.')
);

module.exports = router;
