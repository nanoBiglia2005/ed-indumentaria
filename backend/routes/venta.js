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

// Grupos con al menos un articulo vigente asociado al cliente elegido. El grupo
// del articulo es su propio campo id_grupo, asi que se pregunta directo por los
// ARTICULOS del grupo (incluye "No Asignado" si tiene articulos del cliente).
router.get(
  '/grupos',
  asyncHandler(async (req, res) => {
    const id_cliente = parseId(req.query.id_cliente, 'El id del cliente debe ser un numero.');

    const grupos = await prisma.GRUPOS_DE_VENTA.findMany({
      where: {
        ARTICULOS: {
          some: {
            vigente: true,
            ARTICULOS_X_CLIENTE: { some: { id_cliente } },
          },
        },
      },
      orderBy: { nombre_grupo: 'asc' },
    });

    res.status(200).json(grupos);
  }, 'Error al obtener los grupos del cliente.')
);

// Articulos vigentes que estan a la vez en el cliente y en el grupo elegidos.
// La interseccion la resuelve la base; se devuelve tambien el nombre del
// subgrupo de cada articulo, y los subgrupos del grupo para el dropdown.
router.get(
  '/articulos',
  asyncHandler(async (req, res) => {
    const [id_cliente, id_grupo] = parseIds(
      [req.query.id_cliente, req.query.id_grupo],
      'El id del cliente y del grupo deben ser numeros.'
    );

    const filas = await prisma.ARTICULOS.findMany({
      where: {
        id_grupo,
        vigente: true,
        ARTICULOS_X_CLIENTE: { some: { id_cliente } },
      },
      include: { SUBGRUPOS_DE_VENTA: true },
    });

    const articulos = filas.map(({ SUBGRUPOS_DE_VENTA, ...articulo }) => ({
      ...articulo,
      nombre_subgrupo: SUBGRUPOS_DE_VENTA?.nombre_subgrupo ?? null,
    }));

    const subgrupos = await prisma.SUBGRUPOS_DE_VENTA.findMany({
      where: { id_grupo },
      orderBy: { nombre_subgrupo: 'asc' },
    });

    res.status(200).json({ articulos, subgrupos });
  }, 'Error al obtener los articulos.', { log: 'Error al obtener los articulos de la venta' })
);

module.exports = router;
