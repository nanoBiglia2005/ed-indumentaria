// Impresion de etiquetas de codigo de barras de un articulo.
const express = require('express');
const prisma = require('../db');
const { asyncHandler, HttpError } = require('../lib/http');
const { parseId } = require('../lib/validaciones');
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

    const { respuesta: printResponse, resultado: printResult } = await enviarTrabajoDeImpresion({
      tipo: 'barcode',
      id_articulo: articulo.id_articulo,
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
