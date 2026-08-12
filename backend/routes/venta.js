// Seleccion de articulos para una venta, paso a paso.
// El flujo es cliente -> grupo -> articulos. Cada paso acota el siguiente y
// el filtrado se hace en la base, asi el frontend nunca se trae la tabla
// ARTICULOS completa.
const express = require('express');
const prisma = require('../db');
const { asyncHandler } = require('../lib/http');
const { parseId, parseIds } = require('../lib/validaciones');

const router = express.Router();

// Clientes agrupados por su grupo de venta exclusivo (Colegios, Clubes, ...).
// No se hardcodea cuales son: se arma con lo que haya en la base, asi que si
// mañana aparece una agrupacion nueva sale sola.
router.get(
  '/agrupaciones',
  asyncHandler(async (req, res) => {
    const clientes = await prisma.CLIENTES.findMany({
      where: { grupo_venta_exclusivo: { not: null } },
      include: { GRUPOS_DE_VENTA: true },
      orderBy: { nombre: 'asc' },
    });

    const porGrupo = new Map();
    for (const cliente of clientes) {
      const grupo = cliente.GRUPOS_DE_VENTA;
      if (!grupo) continue;

      if (!porGrupo.has(grupo.id_grupo)) {
        porGrupo.set(grupo.id_grupo, {
          id_grupo: grupo.id_grupo,
          nombre_grupo: grupo.nombre_grupo,
          clientes: [],
        });
      }
      porGrupo.get(grupo.id_grupo).clientes.push({
        id_cliente: cliente.id_cliente,
        nombre: cliente.nombre,
      });
    }

    res.status(200).json([...porGrupo.values()].sort((a, b) => a.id_grupo - b.id_grupo));
  }, 'Error al obtener las agrupaciones.', { log: 'Error al obtener las agrupaciones de clientes' })
);

// Grupos con al menos un articulo vigente asociado al cliente elegido.
router.get(
  '/grupos',
  asyncHandler(async (req, res) => {
    const id_cliente = parseId(req.query.id_cliente, 'El id del cliente debe ser un numero.');

    const grupos = await prisma.GRUPOS_DE_VENTA.findMany({
      where: {
        ARTICULOS_X_GRUPO_VENTA: {
          some: {
            ARTICULOS: {
              vigente: true,
              ARTICULOS_X_CLIENTE: { some: { id_cliente } },
            },
          },
        },
      },
      orderBy: { nombre_grupo: 'asc' },
    });

    res.status(200).json(grupos);
  }, 'Error al obtener los grupos del cliente.')
);

// Articulos vigentes que estan a la vez en el cliente y en el grupo elegidos.
// La interseccion la resuelve la base; se devuelve tambien el subgrupo de cada
// articulo DENTRO de ese grupo, y los subgrupos disponibles para el dropdown.
router.get(
  '/articulos',
  asyncHandler(async (req, res) => {
    const [id_cliente, id_grupo] = parseIds(
      [req.query.id_cliente, req.query.id_grupo],
      'El id del cliente y del grupo deben ser numeros.'
    );

    const relaciones = await prisma.ARTICULOS_X_GRUPO_VENTA.findMany({
      where: {
        id_grupo_venta: id_grupo,
        ARTICULOS: {
          vigente: true,
          ARTICULOS_X_CLIENTE: { some: { id_cliente } },
        },
      },
      include: { ARTICULOS: true, SUBGRUPOS_DE_VENTA: true },
    });

    // Un articulo deberia tener una sola fila por grupo, pero se deduplica por
    // las dudas para no repetir filas en la tabla.
    const porArticulo = new Map();
    for (const relacion of relaciones) {
      if (porArticulo.has(relacion.id_articulo)) continue;
      porArticulo.set(relacion.id_articulo, {
        ...relacion.ARTICULOS,
        id_subgrupo: relacion.id_subgrupo,
        nombre_subgrupo: relacion.SUBGRUPOS_DE_VENTA?.nombre_subgrupo ?? null,
      });
    }

    const subgrupos = await prisma.SUBGRUPOS_DE_VENTA.findMany({
      where: { id_grupo },
      orderBy: { nombre_subgrupo: 'asc' },
    });

    res.status(200).json({ articulos: [...porArticulo.values()], subgrupos });
  }, 'Error al obtener los articulos.', { log: 'Error al obtener los articulos de la venta' })
);

module.exports = router;
