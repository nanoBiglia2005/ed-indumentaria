// Nota: los mensajes HTTP de lineas usan "línea" con tilde pero los logs de
// consola historicos van sin tilde; por eso las rutas pasan `log` explicito.
const express = require('express');
const prisma = require('../db');
const { HttpError, asyncHandler } = require('../lib/http');
const { parseId, normalizarNombre, assertNombreUnico } = require('../lib/validaciones');
const { requireRol } = require('../lib/roles');
const { ROLES_ARTICULOS } = require('../constants/roles');

const router = express.Router();

// El listado NO se restringe: el modal de agregar producto en Ventas tambien
// lo usa para filtrar por linea (AgregarProductoModal, via /api/lineas).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const lineas = await prisma.LINEAS.findMany();
    res.status(200).json(lineas);
  }, 'Error al obtener las lineas.')
);

// Crear una nueva linea. El nombre no puede repetirse (sin distinguir
// mayusculas/minusculas ni espacios al principio/final).
// El ABM (crear/editar/eliminar) si es exclusivo de Articulos/Configuracion.
router.post(
  '/',
  requireRol(...ROLES_ARTICULOS),
  asyncHandler(async (req, res) => {
    const nombre_linea = normalizarNombre(req.body.nombre_linea);
    if (!nombre_linea) {
      throw new HttpError(400, { message: 'El nombre de la línea es obligatorio.' });
    }

    await assertNombreUnico(prisma.LINEAS, 'nombre_linea', nombre_linea, {
      mensaje: 'Ya existe una línea con ese nombre.',
    });

    const nuevaLinea = await prisma.LINEAS.create({ data: { nombre_linea } });
    res.status(201).json(nuevaLinea);
  }, 'Error al crear la línea.', { log: 'Error al crear la linea' })
);

// Editar el nombre de una linea. Mismo chequeo de nombre unico que al crear,
// excluyendose a si misma de la comparacion.
router.put(
  '/:id_linea',
  requireRol(...ROLES_ARTICULOS),
  asyncHandler(async (req, res) => {
    const id_linea = parseId(req.params.id_linea, 'El id de la línea debe ser un numero.');

    const nombre_linea = normalizarNombre(req.body.nombre_linea);
    if (!nombre_linea) {
      throw new HttpError(400, { message: 'El nombre de la línea es obligatorio.' });
    }

    await assertNombreUnico(prisma.LINEAS, 'nombre_linea', nombre_linea, {
      mensaje: 'Ya existe una línea con ese nombre.',
      excluir: { campo: 'id_linea', id: id_linea },
    });

    const lineaActualizada = await prisma.LINEAS.update({
      where: { id_linea },
      data: { nombre_linea },
    });
    res.status(200).json(lineaActualizada);
  }, 'Error al actualizar la línea.', {
    log: 'Error al actualizar la linea',
    errores: { P2025: { status: 404, message: 'La línea no existe.' } },
  })
);

// Eliminar una linea. El FK de ARTICULOS a LINEAS es ON DELETE SET NULL, asi
// que esto no falla por articulos en uso: simplemente quedan sin linea. Las
// asociaciones en GRUPOS_X_LINEAS son ON DELETE CASCADE.
router.delete(
  '/:id_linea',
  requireRol(...ROLES_ARTICULOS),
  asyncHandler(async (req, res) => {
    const id_linea = parseId(req.params.id_linea, 'El id de la línea debe ser un numero.');

    await prisma.LINEAS.delete({ where: { id_linea } });
    res.status(204).send();
  }, 'Error al eliminar la línea.', {
    log: 'Error al eliminar la linea',
    errores: { P2025: { status: 404, message: 'La línea no existe.' } },
  })
);

module.exports = router;
