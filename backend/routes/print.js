// Impresion de etiquetas de codigo de barras de un articulo.
const express = require('express');
const prisma = require('../db');
const { asyncHandler, HttpError } = require('../lib/http');
const { parseId } = require('../lib/validaciones');
const { codigoBarcodeCompleto } = require('../lib/barcode');
const { enviarTrabajoDeImpresion } = require('../services/impresion');

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const id_articulo = parseId(req.body.id_articulo, 'El id del articulo debe ser un numero.');
    const cantidad = parseInt(req.body.cantidad, 10) || 1;

    const articulo = await prisma.ARTICULOS.findUnique({ where: { id_articulo } });
    if (!articulo) {
      throw new HttpError(404, { message: 'El articulo no existe.' });
    }

    // El codigo va ya armado: el printer-client corre en otra maquina y no
    // puede leer shared/barcode.json, asi que no debe conocer la regla del
    // prefijo generico (si la duplicara, se desincronizaria).
    const codigo = codigoBarcodeCompleto(articulo.barcode_header, articulo.barcode_tail);

    // Sin barcode_header ni barcode_tail no hay nada que imprimir: se corta aca
    // en vez de mandar un trabajo que la impresora no puede resolver.
    if (!codigo) {
      throw new HttpError(400, { message: 'El articulo no tiene codigo de barra para imprimir.' });
    }

    // barcode_header/barcode_tail siguen viajando para los printer-client
    // viejos, que arman el codigo por su cuenta.
    const { respuesta: printResponse, resultado: printResult } = await enviarTrabajoDeImpresion({
      tipo: 'barcode',
      id_articulo: articulo.id_articulo,
      codigo,
      barcode_header: articulo.barcode_header,
      barcode_tail: articulo.barcode_tail,
      descripcion: articulo.descripcion,
      precio: articulo.precio,
      talle: articulo.talle,
      cantidad,
    });

    if (!printResponse.ok) {
      return res.status(printResponse.status).json(printResult);
    }
    res.status(200).json(printResult);
  }, 'Error al enviar el trabajo de impresion.')
);

module.exports = router;
