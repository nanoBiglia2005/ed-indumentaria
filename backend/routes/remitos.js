const express = require('express');
const prisma = require('../db');
const { asyncHandler, HttpError } = require('../lib/http');
const { ESTADO_CONFIRMADO, ESTADO_FACTURADO, ESTADO_ANULADO, METODOS_DE_PAGO } = require('../constants/ventas');
const {
  remitosInclude,
  resolverItemsVenta,
  buscarRemitoPendiente,
  opcionesDePagoDeRemito,
} = require('../services/remitos');
const { construirPayloadTicket, enviarTrabajoDeImpresion } = require('../services/impresion');

const router = express.Router();

// Historial: todo MENOS los pendientes de cobro, que viven en la pagina de Ventas.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const remitos = await prisma.REMITOS.findMany({
      where: { NOT: { id_estado: ESTADO_CONFIRMADO } },
      include: remitosInclude,
      orderBy: { id_remito: 'desc' },
    });
    res.status(200).json(remitos);
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
    res.status(200).json(remitos);
  }, 'Error al obtener los remitos pendientes.')
);

// Registra la venta como CONFIRMADA (pendiente de cobro) con los precios en
// efectivo, e imprime el ticket salvo que se pida `imprimir: false`.
// El metodo de pago se elige despues, al facturar.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { error, items, recargoTarjeta } = await resolverItemsVenta(req.body.detalles);
    if (error) {
      throw new HttpError(error.status, { message: error.message });
    }

    const detallesData = items.map((item) => ({
      id_articulo: item.id_articulo,
      precio: item.precio_efectivo,
      cantidad: item.cantidad,
    }));

    const totalVenta = detallesData.reduce((acumulado, d) => acumulado + d.precio * d.cantidad, 0);
    const ahora = new Date();

    const nuevoRemito = await prisma.REMITOS.create({
      data: {
        fecha_de_emision: ahora,
        fecha_de_creacion: ahora,
        id_estado: ESTADO_CONFIRMADO,
        total_bruto: totalVenta,
        total_neto: totalVenta,
        DETALLES_REMITO: {
          create: detallesData,
        },
      },
      include: remitosInclude,
    });

    // La venta ya quedo guardada: si falla la impresion no se revierte, se avisa
    // en la respuesta. Ahora el ticket si lleva el numero de remito.
    let impresion = { status: 'omitida' };
    if (req.body.imprimir !== false) {
      impresion = { status: 'ok' };
      try {
        const { respuesta, resultado } = await enviarTrabajoDeImpresion(
          construirPayloadTicket(items, recargoTarjeta, {
            id_remito: nuevoRemito.id_remito,
            fecha: nuevoRemito.fecha_de_emision,
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

// Opciones de pago de un remito pendiente, para poblar el modal de cobro.
router.get(
  '/:id_remito/opciones-pago',
  asyncHandler(async (req, res) => {
    const { error, remito } = await buscarRemitoPendiente(req.params.id_remito);
    if (error) {
      throw new HttpError(error.status, { message: error.message });
    }

    res.status(200).json(await opcionesDePagoDeRemito(remito));
  }, 'Error al obtener las opciones de pago.')
);

// Cobra un remito pendiente: fija el precio de cada linea segun su metodo de
// pago, recalcula el total y lo pasa a FACTURADO.
router.put(
  '/:id_remito/facturar',
  asyncHandler(async (req, res) => {
    const { error, remito } = await buscarRemitoPendiente(req.params.id_remito);
    if (error) {
      throw new HttpError(error.status, { message: error.message });
    }

    const { pagos } = req.body;
    if (!Array.isArray(pagos)) {
      throw new HttpError(400, { message: 'Falta el detalle de como se paga cada articulo.' });
    }

    const metodosPorDetalle = new Map();
    for (const pago of pagos) {
      const id_detalle = parseInt(pago.id_detalle, 10);
      const metodo = pago.metodo_pago ?? 'efectivo';

      if (Number.isNaN(id_detalle)) {
        throw new HttpError(400, { message: 'Los detalles del pago son invalidos.' });
      }
      if (!METODOS_DE_PAGO.includes(metodo)) {
        throw new HttpError(400, { message: `Metodo de pago invalido: "${metodo}".` });
      }

      metodosPorDetalle.set(id_detalle, metodo);
    }

    const { items } = await opcionesDePagoDeRemito(remito);

    const preciosFinales = items.map((item) => ({
      id_detalle: item.id_detalle,
      precio:
        metodosPorDetalle.get(item.id_detalle) === 'tarjeta'
          ? item.precio_tarjeta
          : item.precio_efectivo,
      cantidad: item.cantidad,
    }));

    const totalVenta = preciosFinales.reduce(
      (acumulado, linea) => acumulado + linea.precio * linea.cantidad,
      0
    );

    // Todo junto: si algo falla no queda un remito a medio cobrar.
    const remitoFacturado = await prisma.$transaction(async (tx) => {
      await Promise.all(
        preciosFinales.map((linea) =>
          tx.DETALLES_REMITO.update({
            where: { id_detalle: linea.id_detalle },
            data: { precio: linea.precio },
          })
        )
      );

      return tx.REMITOS.update({
        where: { id_remito: remito.id_remito },
        data: {
          id_estado: ESTADO_FACTURADO,
          total_bruto: totalVenta,
          total_neto: totalVenta,
        },
        include: remitosInclude,
      });
    });

    res.status(200).json(remitoFacturado);
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

    res.status(200).json(remitoAnulado);
  }, 'Error al anular el remito.')
);

module.exports = router;
