const express = require('express');
const prisma = require('../db');
const { HttpError, asyncHandler } = require('../lib/http');
const { parseId, normalizarNombre, assertNombreUnico } = require('../lib/validaciones');
const { ID_GRUPO_NO_ASIGNADO } = require('../constants/agrupaciones');

const router = express.Router();

// "No Asignado" es el grupo al que caen los articulos huerfanos: no se le
// cuelgan subgrupos.
const parseIdGrupoPadre = (valor) => {
  const id_grupo = parseId(valor, 'Debe seleccionar un grupo valido.');
  if (id_grupo === ID_GRUPO_NO_ASIGNADO) {
    throw new HttpError(400, { message: 'El grupo "No Asignado" no puede tener subgrupos.' });
  }
  return id_grupo;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const subgrupos = await prisma.SUBGRUPOS_DE_VENTA.findMany();
    res.status(200).json(subgrupos);
  }, 'Error al obtener los subgrupos de venta.')
);

// Crear un nuevo subgrupo dentro de un grupo existente. El nombre no puede
// repetirse dentro de ese mismo grupo (sin distinguir mayusculas/minusculas
// ni espacios al principio/final).
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const nombre_subgrupo = normalizarNombre(req.body.nombre_subgrupo);
    if (!nombre_subgrupo) {
      throw new HttpError(400, { message: 'El nombre del subgrupo es obligatorio.' });
    }
    const id_grupo = parseIdGrupoPadre(req.body.id_grupo);

    const grupo = await prisma.GRUPOS_DE_VENTA.findUnique({ where: { id_grupo } });
    if (!grupo) {
      throw new HttpError(404, { message: 'El grupo seleccionado no existe.' });
    }

    await assertNombreUnico(prisma.SUBGRUPOS_DE_VENTA, 'nombre_subgrupo', nombre_subgrupo, {
      mensaje: 'Ya existe un subgrupo con ese nombre en el grupo elegido.',
      where: { id_grupo },
    });

    const nuevoSubgrupo = await prisma.SUBGRUPOS_DE_VENTA.create({
      data: { nombre_subgrupo, id_grupo },
    });
    res.status(201).json(nuevoSubgrupo);
  }, 'Error al crear el subgrupo.')
);

// Editar un subgrupo (nombre y/o grupo). Mismo chequeo de nombre unico
// dentro del grupo elegido, excluyendose a si mismo de la comparacion.
router.put(
  '/:id_subgrupo',
  asyncHandler(async (req, res) => {
    const id_subgrupo = parseId(req.params.id_subgrupo, 'El id del subgrupo debe ser un numero.');

    const nombre_subgrupo = normalizarNombre(req.body.nombre_subgrupo);
    if (!nombre_subgrupo) {
      throw new HttpError(400, { message: 'El nombre del subgrupo es obligatorio.' });
    }
    const id_grupo = parseIdGrupoPadre(req.body.id_grupo);

    const grupo = await prisma.GRUPOS_DE_VENTA.findUnique({ where: { id_grupo } });
    if (!grupo) {
      throw new HttpError(404, { message: 'El grupo seleccionado no existe.' });
    }

    await assertNombreUnico(prisma.SUBGRUPOS_DE_VENTA, 'nombre_subgrupo', nombre_subgrupo, {
      mensaje: 'Ya existe un subgrupo con ese nombre en el grupo elegido.',
      where: { id_grupo },
      excluir: { campo: 'id_subgrupo', id: id_subgrupo },
    });

    const subgrupoActualizado = await prisma.SUBGRUPOS_DE_VENTA.update({
      where: { id_subgrupo },
      data: { nombre_subgrupo, id_grupo },
    });
    res.status(200).json(subgrupoActualizado);
  }, 'Error al actualizar el subgrupo.', {
    errores: { P2025: { status: 404, message: 'El subgrupo no existe.' } },
  })
);

// Eliminar un subgrupo. Falla si hay articulos que todavia lo tienen
// asignado (hay que quitarselo primero).
router.delete(
  '/:id_subgrupo',
  asyncHandler(async (req, res) => {
    const id_subgrupo = parseId(req.params.id_subgrupo, 'El id del subgrupo debe ser un numero.');

    await prisma.SUBGRUPOS_DE_VENTA.delete({ where: { id_subgrupo } });
    res.status(204).send();
  }, 'Error al eliminar el subgrupo.', {
    errores: {
      P2025: { status: 404, message: 'El subgrupo no existe.' },
      P2003: {
        status: 409,
        message: 'No se puede eliminar el subgrupo: todavia hay articulos que lo tienen asignado.',
      },
    },
  })
);

module.exports = router;
