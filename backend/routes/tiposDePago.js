const express = require('express');
const prisma = require('../db');
const { HttpError, asyncHandler } = require('../lib/http');
const { parseId } = require('../lib/validaciones');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const tiposDePago = await prisma.TIPOS_DE_PAGO.findMany();
    res.status(200).json(tiposDePago);
  }, 'Error al obtener los tipos de pago.')
);

router.put(
  '/:id_tipos_de_pago',
  asyncHandler(async (req, res) => {
    const id_tipos_de_pago = parseId(req.params.id_tipos_de_pago, 'El id del tipo de pago debe ser un numero.');

    const recargo = Number(req.body.recargo);
    if (!Number.isFinite(recargo) || recargo < 0) {
      throw new HttpError(400, { message: 'El recargo debe ser un numero mayor o igual a 0.' });
    }

    const tipoDePagoActualizado = await prisma.TIPOS_DE_PAGO.update({
      where: { id_tipos_de_pago },
      data: { recargo },
    });
    res.status(200).json(tipoDePagoActualizado);
  }, 'Error al actualizar el tipo de pago.', {
    errores: { P2025: { status: 404, message: 'El tipo de pago no existe.' } },
  })
);

module.exports = router;
