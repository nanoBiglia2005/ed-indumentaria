// Dumps de solo lectura de las tablas de asociacion. El frontend los usa para
// armar en memoria las relaciones articulo<->grupo/cliente y grupo<->linea.
// Se monta directo en /api porque cada dump tiene su propio path historico.
const express = require('express');
const prisma = require('../db');
const { asyncHandler } = require('../lib/http');

const router = express.Router();

router.get(
  '/articulos-x-grupo',
  asyncHandler(async (req, res) => {
    const registros = await prisma.ARTICULOS_X_GRUPO_VENTA.findMany();
    res.status(200).json(registros);
  }, 'Error al obtener ARTICULOS_X_GRUPO_VENTA.')
);

router.get(
  '/articulos-x-cliente',
  asyncHandler(async (req, res) => {
    const registros = await prisma.ARTICULOS_X_CLIENTE.findMany();
    res.status(200).json(registros);
  }, 'Error al obtener ARTICULOS_X_CLIENTE.')
);

router.get(
  '/grupos-x-lineas',
  asyncHandler(async (req, res) => {
    const registros = await prisma.GRUPOS_X_LINEAS.findMany();
    res.status(200).json(registros);
  }, 'Error al obtener GRUPOS_X_LINEAS.')
);

module.exports = router;
