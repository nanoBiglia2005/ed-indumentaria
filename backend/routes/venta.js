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
const { parseId, parseIdOpcional } = require('../lib/validaciones');
const { BARCODE_MAX } = require('../constants/barcode');
const { buscarArticuloPorCodigo } = require('../services/busquedaPorBarcode');
const { listarMetodosDePago, preciosDeArticulo } = require('../services/preciosPorMetodo');
const {
  parsearConsultaArticulos,
  parseColumnaDeOpciones,
  construirWhere,
  construirOrderBy,
} = require('../lib/articulosConsulta');
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

// Cada paso del recorrido (linea -> cliente -> grupo) acota a los siguientes,
// pero todos se pueden saltear con la opcion "Todos": ahi el id no viaja y ese
// filtro simplemente no se aplica. Eso es exactamente parseIdOpcional().

/** Ids que la tabla ya no tiene que ofrecer, como "12,45,7". */
const parseIdsSeparadosPorComa = (valor) => {
  if (typeof valor !== 'string' || valor.trim() === '') return [];

  return valor.split(',').map((id) => parseId(id, 'Los ids a excluir deben ser numeros.'));
};

// ============================================================
//  SELECCION DE ARTICULOS
// ============================================================

// Clientes agrupados por su grupo de venta exclusivo (Colegios, Clubes, ...).
// No se hardcodea cuales son: se arma con lo que haya en la base, asi que si
// mañana aparece una agrupacion nueva sale sola.
router.get(
  '/agrupaciones',
  asyncHandler(async (req, res) => {
    const id_linea = parseIdOpcional(req.query.id_linea, 'El id de la línea debe ser un numero.');

    // Los grupos salen de su propia consulta y NO de los clientes encontrados:
    // asi, cuando la linea deja a un grupo sin ninguno, igual viaja con la
    // lista vacia y el frontend puede decir "no hay clubes" en vez de esconder
    // la columna entera.
    const [grupos, clientes] = await Promise.all([
      prisma.GRUPOS_DE_VENTA.findMany({
        where: { CLIENTES_MAYORISTAS: { some: {} } },
        orderBy: { id_grupo: 'asc' },
      }),
      prisma.CLIENTES_MAYORISTAS.findMany({
        where: {
          grupo_venta_exclusivo: { not: null },
          // Solo los que tienen algo vigente de esa linea para vender: si no,
          // elegir un colegio llevaria a un paso siguiente vacio.
          ...(id_linea !== null && {
            ARTICULOS_X_CLIENTE: { some: { ARTICULOS: { vigente: true, id_linea } } },
          }),
        },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    const porGrupo = new Map(
      grupos.map((grupo) => [
        grupo.id_grupo,
        { id_grupo: grupo.id_grupo, nombre_grupo: grupo.nombre_grupo, clientes: [] },
      ])
    );

    for (const cliente of clientes) {
      porGrupo.get(cliente.grupo_venta_exclusivo)?.clientes.push({
        id_cliente: cliente.id_cliente,
        nombre: cliente.nombre,
      });
    }

    res.status(200).json([...porGrupo.values()]);
  }, 'Error al obtener las agrupaciones.', { log: 'Error al obtener las agrupaciones de clientes' })
);

/**
 * Que clientes tiene que tener el articulo para entrar en el paso siguiente,
 * segun lo elegido en el paso 2: un colegio/club puntual, una agrupacion entera
 * ("todos los colegios"), o cualquiera.
 *
 * Nunca queda vacio del todo: aun sin nada elegido se exige que el articulo sea
 * DE alguno, o sea que el stock no asociado a ningun colegio o club no se
 * vende por este camino.
 */
const clientesDelPaso = (id_cliente, id_agrupacion) => {
  if (id_cliente !== null) return { id_cliente };
  // El nombre del campo NO es CLIENTES_MAYORISTAS: la relacion de
  // ARTICULOS_X_CLIENTE hacia esa tabla se llama CLIENTES (ver schema.prisma).
  if (id_agrupacion !== null) return { CLIENTES: { grupo_venta_exclusivo: id_agrupacion } };
  return {};
};

// Grupos con al menos un articulo vigente asociado al cliente elegido. El grupo
// del articulo es su propio campo id_grupo, asi que se pregunta directo por los
// ARTICULOS del grupo (incluye "No Asignado" si tiene articulos del cliente).
router.get(
  '/grupos',
  asyncHandler(async (req, res) => {
    const id_cliente = parseIdOpcional(req.query.id_cliente, 'El id del cliente debe ser un numero.');
    const id_agrupacion = parseIdOpcional(
      req.query.id_agrupacion,
      'El id de la agrupación debe ser un numero.'
    );
    const id_linea = parseIdOpcional(req.query.id_linea, 'El id de la línea debe ser un numero.');

    const grupos = await prisma.GRUPOS_DE_VENTA.findMany({
      where: {
        ARTICULOS: {
          some: {
            vigente: true,
            ...(id_linea !== null && { id_linea }),
            ARTICULOS_X_CLIENTE: { some: clientesDelPaso(id_cliente, id_agrupacion) },
          },
        },
      },
      orderBy: { nombre_grupo: 'asc' },
    });

    res.status(200).json(grupos);
  }, 'Error al obtener los grupos del cliente.')
);

/**
 * Consulta de la tabla de articulos del recorrido de venta.
 *
 * Usa el MISMO constructor que la pagina de Articulos (lib/articulosConsulta.js)
 * para paginar, filtrar y ordenar en la base: con "Todos" en los tres pasos son
 * casi 7000 articulos y traerlos de una vez no escala.
 *
 * Lo que la venta agrega y la query NO puede pedir (lo fija la ruta): solo
 * vigentes, solo lo que sea de algun colegio o club, y sin los que ya estan en
 * el carrito.
 */
const consultaDeVenta = (query) => ({
  ...parsearConsultaArticulos(query),
  soloVigentes: true,
  exigeCliente: true,
  excluirIds: parseIdsSeparadosPorComa(query.excluir),
});

router.get(
  '/articulos',
  asyncHandler(async (req, res) => {
    const consulta = consultaDeVenta(req.query);
    const where = construirWhere(consulta);
    const orderBy = construirOrderBy(consulta.orden);
    const offset = (consulta.pagina - 1) * consulta.tamano;

    // Primero solo los ids de la pagina (y el total): traer las filas enteras
    // ordenadas seria mover mucho mas dato por una pagina de 30.
    const [filas, [{ total }]] = await prisma.$transaction([
      prisma.$queryRaw`
        SELECT a.id_articulo FROM "ARTICULOS" a
          WHERE ${where}
          ORDER BY ${orderBy}
          LIMIT ${consulta.tamano}::int OFFSET ${offset}::int`,
      prisma.$queryRaw`SELECT count(*)::int AS total FROM "ARTICULOS" a WHERE ${where}`,
    ]);

    const ids = filas.map((fila) => fila.id_articulo);
    const [articulos, metodos] = await Promise.all([
      prisma.ARTICULOS.findMany({
        where: { id_articulo: { in: ids } },
        include: { SUBGRUPOS_DE_VENTA: true },
      }),
      listarMetodosDePago(),
    ]);

    // findMany con `in` no respeta el orden pedido: se reordena por los ids.
    const porId = new Map(articulos.map((articulo) => [articulo.id_articulo, articulo]));

    res.status(200).json({
      articulos: ids.map((id) => {
        const { SUBGRUPOS_DE_VENTA, ...articulo } = porId.get(id);
        return conPrecios(
          { ...articulo, nombre_subgrupo: SUBGRUPOS_DE_VENTA?.nombre_subgrupo ?? null },
          metodos
        );
      }),
      total,
    });
  }, 'Error al obtener los articulos.', { log: 'Error al obtener los articulos de la venta' })
);

/**
 * Opciones de un filtro de seleccion de la tabla: los valores presentes en el
 * conjunto ya filtrado, EXCLUYENDO el filtro de esa misma columna.
 */
router.get(
  '/articulos/opciones',
  asyncHandler(async (req, res) => {
    const columna = req.query.columna;
    const definicion = parseColumnaDeOpciones(columna);
    const consulta = consultaDeVenta(req.query);
    const where = construirWhere(consulta, { excluirFiltro: columna });

    const [opciones, [{ existe }]] = await prisma.$transaction([
      prisma.$queryRaw(definicion.opciones(where)),
      prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM "ARTICULOS" a WHERE ${where} AND ${definicion.sinAsignar}
        ) AS existe`,
    ]);

    res.status(200).json({ opciones, haySinAsignar: existe });
  }, 'Error al obtener las opciones del filtro.')
);

// Subgrupos de un grupo, para el desplegable de la tabla. Solo tiene sentido
// con un grupo concreto elegido: la base filtra por subgrupo unicamente dentro
// de un grupo (ver construirWhere).
router.get(
  '/subgrupos',
  asyncHandler(async (req, res) => {
    const id_grupo = parseId(req.query.id_grupo, 'El id del grupo debe ser un numero.');

    res.status(200).json(
      await prisma.SUBGRUPOS_DE_VENTA.findMany({
        where: { id_grupo },
        orderBy: { nombre_subgrupo: 'asc' },
      })
    );
  }, 'Error al obtener los subgrupos.')
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
