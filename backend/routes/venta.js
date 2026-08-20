// Flujo de venta: seleccion de articulos y cliente final.
//
// La seleccion es paso a paso (cliente -> grupo -> articulos) y el filtrado se
// hace en la base, asi el frontend nunca se trae la tabla ARTICULOS completa.
// Ademas se puede traer un articulo directo por su codigo de barra.
//
// Todo articulo que sale de aca viaja con `precios_por_metodo`: cuanto sale con
// cada metodo de pago. NO se guarda en la base, se deriva del precio base con
// el recargo vigente de cada metodo (services/preciosPorMetodo.js).
const express = require('express');
const prisma = require('../db');
const { asyncHandler, HttpError } = require('../lib/http');
const { parseId, parseIds } = require('../lib/validaciones');
const { BARCODE_MAX } = require('../constants/barcode');
const { buscarArticuloPorCodigo } = require('../services/busquedaPorBarcode');
const { listarMetodosDePago, preciosDeArticulo } = require('../services/preciosPorMetodo');
const {
  parsearDatosCliente,
  buscarPorDni,
  buscarClientes,
  obtenerCliente,
} = require('../services/clientesFinales');

const router = express.Router();

const conPrecios = (articulo, metodos) => ({
  ...articulo,
  precios_por_metodo: preciosDeArticulo(articulo.precio, metodos),
});

// ============================================================
//  SELECCION DE ARTICULOS
// ============================================================

// Clientes agrupados por su grupo de venta exclusivo (Colegios, Clubes, ...).
// No se hardcodea cuales son: se arma con lo que haya en la base, asi que si
// mañana aparece una agrupacion nueva sale sola.
router.get(
  '/agrupaciones',
  asyncHandler(async (req, res) => {
    const clientes = await prisma.CLIENTES_MAYORISTAS.findMany({
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

    const metodos = await listarMetodosDePago();
    const articulos = filas.map(({ SUBGRUPOS_DE_VENTA, ...articulo }) =>
      conPrecios(
        { ...articulo, nombre_subgrupo: SUBGRUPOS_DE_VENTA?.nombre_subgrupo ?? null },
        metodos
      )
    );

    const subgrupos = await prisma.SUBGRUPOS_DE_VENTA.findMany({
      where: { id_grupo },
      orderBy: { nombre_subgrupo: 'asc' },
    });

    res.status(200).json({ articulos, subgrupos });
  }, 'Error al obtener los articulos.', { log: 'Error al obtener los articulos de la venta' })
);

// El frontend ya deja tipear solo numeros, pero el limite real es este: la
// query llega tal cual desde el navegador.
const parseCodigo = (valor) => {
  const codigo = typeof valor === 'string' ? valor.trim() : '';

  if (!/^\d+$/.test(codigo) || codigo.length > BARCODE_MAX) {
    throw new HttpError(400, {
      message: `El código de barras debe ser un número de hasta ${BARCODE_MAX} dígitos.`,
    });
  }

  return codigo;
};

// Articulo con ese codigo de barra completo, para agregarlo a la venta con el
// lector. El 404 es un caso ESPERADO (se escaneo algo que no esta): el modal lo
// muestra como un aviso, no como un error.
router.get(
  '/articulo-por-codigo',
  asyncHandler(async (req, res) => {
    const codigo = parseCodigo(req.query.codigo);
    const articulo = await buscarArticuloPorCodigo(codigo);

    if (!articulo) {
      throw new HttpError(404, {
        message: `No existe ningún artículo con el código ${codigo}.`,
      });
    }

    // Los articulos no vigentes no se venden (tampoco aparecen en el modal de
    // busqueda), pero conviene decir POR QUE no se puede agregar en vez de
    // hacerlo pasar por inexistente.
    if (articulo.vigente !== true) {
      throw new HttpError(404, {
        message: `El artículo "${articulo.descripcion ?? 'Sin Nombre'}" (código ${codigo}) no está vigente.`,
      });
    }

    const metodos = await listarMetodosDePago();
    res.status(200).json(conPrecios(articulo, metodos));
  }, 'Error al buscar el artículo por código de barras.')
);

// ============================================================
//  CLIENTE FINAL DE LA VENTA (tabla CLIENTES, la minorista)
// ============================================================

// El selector muestra unos pocos resultados: es para reconocer al cliente que
// esta en el mostrador, no para listar la tabla.
const MAX_RESULTADOS = 8;

// Busqueda del selector: un solo termino contra nombre, apellido y DNI.
router.get(
  '/clientes',
  asyncHandler(async (req, res) => {
    const termino = typeof req.query.busqueda === 'string' ? req.query.busqueda.trim() : '';

    // Sin termino no se devuelve "todo": el selector solo busca cuando se tipea.
    if (termino === '') {
      res.status(200).json([]);
      return;
    }

    res.status(200).json(await buscarClientes(termino, MAX_RESULTADOS));
  }, 'Error al buscar los clientes.')
);

/**
 * Alta de un cliente para asignarlo a la venta.
 *
 * El DNI repetido NO es un error: es una decision del usuario (asignar el que
 * ya existe, pisarle los datos, o cancelar), asi que se responde 200 con
 * `creado: false` y el cliente encontrado. Un 409 obligaria al frontend a leer
 * el cuerpo de un error para seguir el flujo normal.
 */
router.post(
  '/clientes',
  asyncHandler(async (req, res) => {
    const datos = parsearDatosCliente(req.body);

    const existente = await buscarPorDni(datos.dni);
    if (existente) {
      res.status(200).json({ creado: false, cliente: existente });
      return;
    }

    const cliente = await prisma.CLIENTES.create({ data: datos });
    res.status(201).json({ creado: true, cliente });
  }, 'Error al crear el cliente.')
);

// Pisa los datos del cliente (el "asignar y sobrescribir" del DNI repetido).
router.put(
  '/clientes/:id_cliente',
  asyncHandler(async (req, res) => {
    const id_cliente = parseId(req.params.id_cliente, 'El id del cliente debe ser un numero.');
    const datos = parsearDatosCliente(req.body);

    await obtenerCliente(id_cliente);

    res.status(200).json(await prisma.CLIENTES.update({ where: { id_cliente }, data: datos }));
  }, 'Error al actualizar el cliente.')
);

module.exports = router;
