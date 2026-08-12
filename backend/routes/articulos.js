const express = require('express');
const prisma = require('../db');
const { HttpError, asyncHandler } = require('../lib/http');
const { parseId, parseIds } = require('../lib/validaciones');

const router = express.Router();

// Obtener TODOS los articulos
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const articulos = await prisma.ARTICULOS.findMany();
    res.status(200).json(articulos);
  }, 'Error al obtener los articulos.')
);

// Crear un nuevo articulo (tabla ARTICULOS)
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const {
      cant,
      precio,
      barcode_header,
      barcode_tail,
      stock_minimo,
      vigente,
      talle,
      cant_reservada,
    } = req.body;

    const nuevoArticulo = await prisma.ARTICULOS.create({
      data: {
        cant,
        precio,
        barcode_header,
        barcode_tail,
        stock_minimo,
        vigente,
        talle,
        cant_reservada,
      },
    });
    res.status(201).json(nuevoArticulo);
  }, 'Error al crear el articulo.', {
    errores: { P2002: { status: 409, message: 'Ya existe un articulo con ese codigo de barra.' } },
  })
);

// Actualizar un articulo existente (tabla ARTICULOS)
router.put(
  '/:id_articulo',
  asyncHandler(async (req, res) => {
    const id_articulo = parseId(req.params.id_articulo, 'El id del articulo debe ser un numero.');

    const {
      cant,
      precio,
      barcode_header,
      barcode_tail,
      stock_minimo,
      talle,
      cant_reservada,
      descripcion,
      detalle,
      vigente,
      id_linea,
    } = req.body;

    const articuloActualizado = await prisma.ARTICULOS.update({
      where: { id_articulo },
      data: {
        cant,
        precio,
        barcode_header,
        barcode_tail,
        stock_minimo,
        talle,
        cant_reservada,
        descripcion,
        detalle,
        vigente,
        id_linea,
      },
    });
    res.status(200).json(articuloActualizado);
  }, 'Error al actualizar el articulo.', {
    errores: {
      P2002: { status: 409, message: 'Ya existe un articulo con ese codigo de barra.' },
      P2025: { status: 404, message: 'El articulo no existe.' },
    },
  })
);

router.delete(
  '/:id_articulo',
  asyncHandler(async (req, res) => {
    const id_articulo = parseId(req.params.id_articulo, 'El id del articulo debe ser un numero.');

    await prisma.ARTICULOS.delete({ where: { id_articulo } });
    res.status(204).send();
  }, 'Error al eliminar el articulo.', {
    errores: {
      P2025: { status: 404, message: 'El articulo no existe.' },
      P2003: {
        status: 409,
        message: 'No se puede eliminar el articulo: tiene ventas u otros registros asociados.',
      },
    },
  })
);

router.post(
  '/:id_articulo/grupos',
  asyncHandler(async (req, res) => {
    const id_articulo = parseId(req.params.id_articulo, 'El id del articulo debe ser un numero.');

    const { id_grupo } = req.body;

    const asignacion = await prisma.ARTICULOS_X_GRUPO_VENTA.create({
      data: { id_articulo, id_grupo_venta: id_grupo },
    });
    res.status(201).json(asignacion);
  }, 'Error al asignar el articulo al grupo.')
);

router.post(
  '/:id_articulo/clientes',
  asyncHandler(async (req, res) => {
    const id_articulo = parseId(req.params.id_articulo, 'El id del articulo debe ser un numero.');

    const { id_cliente } = req.body;

    const asignacion = await prisma.ARTICULOS_X_CLIENTE.create({
      data: { id_articulo, id_cliente },
    });
    res.status(201).json(asignacion);
  }, 'Error al asignar el articulo al cliente.', {
    errores: { P2003: { status: 404, message: 'El articulo o el cliente no existen.' } },
  })
);

// Asignar un articulo a un SUBGRUPO: un articulo solo puede tener un
// subgrupo por cada grupo al que pertenece, asi que esto siempre actualiza
// la fila existente de ese grupo (sea cual sea su subgrupo actual) en vez de
// crear una fila nueva; si el articulo todavia no esta en el grupo del
// subgrupo, se crea la fila.
router.post(
  '/:id_articulo/subgrupos',
  asyncHandler(async (req, res) => {
    const id_articulo = parseId(req.params.id_articulo, 'El id del articulo debe ser un numero.');

    const { id_subgrupo } = req.body;

    const subgrupo = await prisma.SUBGRUPOS_DE_VENTA.findUnique({ where: { id_subgrupo } });
    if (!subgrupo) {
      throw new HttpError(404, { message: 'El subgrupo no existe.' });
    }

    const filaDelGrupo = await prisma.ARTICULOS_X_GRUPO_VENTA.findFirst({
      where: { id_articulo, id_grupo_venta: subgrupo.id_grupo },
    });

    if (filaDelGrupo) {
      await prisma.ARTICULOS_X_GRUPO_VENTA.update({
        where: { id_reg: filaDelGrupo.id_reg },
        data: { id_subgrupo },
      });
    } else {
      await prisma.ARTICULOS_X_GRUPO_VENTA.create({
        data: { id_articulo, id_grupo_venta: subgrupo.id_grupo, id_subgrupo },
      });
    }

    res.status(201).json({ id_articulo, id_subgrupo });
  }, 'Error al asignar el articulo al subgrupo.')
);

router.delete(
  '/:id_articulo/grupos/:id_grupo',
  asyncHandler(async (req, res) => {
    const [id_articulo, id_grupo] = parseIds(
      [req.params.id_articulo, req.params.id_grupo],
      'El id del articulo y del grupo deben ser numeros.'
    );

    await prisma.ARTICULOS_X_GRUPO_VENTA.deleteMany({
      where: { id_articulo, id_grupo_venta: id_grupo },
    });
    res.status(204).send();
  }, 'Error al quitar el articulo del grupo.')
);

router.delete(
  '/:id_articulo/clientes/:id_cliente',
  asyncHandler(async (req, res) => {
    const [id_articulo, id_cliente] = parseIds(
      [req.params.id_articulo, req.params.id_cliente],
      'El id del articulo y del cliente deben ser numeros.'
    );

    await prisma.ARTICULOS_X_CLIENTE.deleteMany({
      where: { id_articulo, id_cliente },
    });
    res.status(204).send();
  }, 'Error al quitar el articulo del cliente.')
);

// Quitar un articulo de un SUBGRUPO: se limpia el atributo id_subgrupo de
// las filas, sin sacar el articulo de su grupo.
router.delete(
  '/:id_articulo/subgrupos/:id_subgrupo',
  asyncHandler(async (req, res) => {
    const [id_articulo, id_subgrupo] = parseIds(
      [req.params.id_articulo, req.params.id_subgrupo],
      'El id del articulo y del subgrupo deben ser numeros.'
    );

    await prisma.ARTICULOS_X_GRUPO_VENTA.updateMany({
      where: { id_articulo, id_subgrupo },
      data: { id_subgrupo: null },
    });
    res.status(204).send();
  }, 'Error al quitar el articulo del subgrupo.')
);

module.exports = router;
