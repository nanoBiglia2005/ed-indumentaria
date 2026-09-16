// Presupuestos: mismo wizard de seleccion que una venta, pero NADA se
// persiste. No hay REMITOS.create, no hay transaccion: solo se valida, se
// arma el ticket y se imprime. Ver backend/services/remitos.js
// (resolverItemsVenta) y routes/remitos.js (POST /) como referencia de estilo.
const express = require('express');
const { asyncHandler, HttpError } = require('../lib/http');
const { parseId } = require('../lib/validaciones');
const { resolverItemsVenta } = require('../services/remitos');
const { listarMetodosDePago } = require('../services/preciosPorMetodo');
const { obtenerCliente } = require('../services/clientesFinales');
const { construirPayloadTicket, enviarTrabajoDeImpresion } = require('../services/impresion');
const { resolverDestinoParaSesion } = require('../services/impresoras');

const router = express.Router();

/**
 * Arma el ticket de presupuesto y lo manda a imprimir. A diferencia de la
 * venta, imprimir NO es best-effort: no hay nada guardado que salvar, asi
 * que si falla la impresion, falla la request entera.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    // Los presupuestos no limitan por stock: sin `exigirStock`, mismo camino
    // que hoy.
    const { error, items } = await resolverItemsVenta(req.body.detalles);
    if (error) {
      throw new HttpError(error.status, { message: error.message });
    }

    // El cliente es opcional. Si viene, solo se LEE para armar el texto del
    // ticket: nunca se hace update/create de CLIENTES ni de REMITOS aca (el
    // alta/edicion de cliente la maneja routes/venta.js aparte).
    let clienteCompleto = null;
    if (req.body.id_cliente !== undefined && req.body.id_cliente !== null) {
      const id_cliente = parseId(req.body.id_cliente, 'El id del cliente debe ser un numero.');
      const cliente = await obtenerCliente(id_cliente);
      clienteCompleto = `${cliente.nombre} ${cliente.apellido}`.trim();
    }

    const metodos = await listarMetodosDePago();
    const { id_impresora } = await resolverDestinoParaSesion(
      res.locals.session,
      req.body.id_impresora ?? null
    );

    const payload = construirPayloadTicket(items, metodos, {
      fecha: new Date(),
      cliente: clienteCompleto,
      esPresupuesto: true,
    });

    let respuesta;
    let resultado;
    try {
      ({ respuesta, resultado } = await enviarTrabajoDeImpresion(payload, { id_impresora }));
    } catch (errorImpresion) {
      throw new HttpError(502, {
        message: errorImpresion.message ?? 'No se pudo imprimir el presupuesto.',
      });
    }

    if (!respuesta.ok || resultado.status === 'error') {
      throw new HttpError(respuesta.status && respuesta.status >= 400 ? respuesta.status : 502, {
        message: resultado.message ?? resultado.detail ?? 'No se pudo imprimir el presupuesto.',
      });
    }

    res.status(201).json({ impresion: { status: 'ok' } });
  }, 'Error al crear el presupuesto.')
);

module.exports = router;
