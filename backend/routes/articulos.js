const express = require('express');
const prisma = require('../db');
const { HttpError, asyncHandler } = require('../lib/http');
const { parseId, parseIds } = require('../lib/validaciones');
const { ID_GRUPO_NO_ASIGNADO } = require('../constants/agrupaciones');
const {
  parsearConsultaArticulos,
  parseColumnaDeOpciones,
  construirWhere,
  construirOrderBy,
} = require('../lib/articulosConsulta');

const router = express.Router();

/**
 * Resuelve el par (id_grupo, id_subgrupo) que se va a guardar en el articulo.
 * Un articulo pertenece a UN grupo y, como mucho, a un subgrupo de ese grupo
 * (relacion uno-a-muchos directa: ARTICULOS.id_grupo / ARTICULOS.id_subgrupo).
 *
 * `actual` es el articulo antes del cambio (null al crear). Solo se devuelven
 * las claves que efectivamente hay que escribir, asi un PUT que no manda grupo
 * ni subgrupo no los toca.
 *
 * Reglas:
 * - El grupo "No Asignado" nunca se puede asignar a mano (solo lo pone la base
 *   al borrarse el grupo del articulo).
 * - El subgrupo tiene que pertenecer al grupo con el que queda el articulo.
 * - Si el articulo cambia de grupo y su subgrupo actual era del grupo viejo,
 *   el subgrupo se limpia.
 */
async function resolverGrupoYSubgrupo({ id_grupo, id_subgrupo }, actual = null) {
  const cambiaGrupo = id_grupo !== undefined;
  const cambiaSubgrupo = id_subgrupo !== undefined;
  if (!cambiaGrupo && !cambiaSubgrupo) return {};

  const datos = {};

  // --- Grupo ---
  let grupoFinal = actual?.id_grupo ?? null;

  if (cambiaGrupo) {
    if (id_grupo === null) {
      throw new HttpError(400, { message: 'El articulo tiene que pertenecer a un grupo.' });
    }

    const idGrupo = parseId(id_grupo, 'El id del grupo debe ser un numero.');
    if (idGrupo === ID_GRUPO_NO_ASIGNADO) {
      throw new HttpError(400, {
        message: 'No se puede asignar un articulo al grupo "No Asignado".',
      });
    }

    const grupo = await prisma.GRUPOS_DE_VENTA.findUnique({ where: { id_grupo: idGrupo } });
    if (!grupo) {
      throw new HttpError(404, { message: 'El grupo seleccionado no existe.' });
    }

    datos.id_grupo = idGrupo;
    grupoFinal = idGrupo;
  }

  // --- Subgrupo ---
  if (cambiaSubgrupo) {
    if (id_subgrupo === null) {
      datos.id_subgrupo = null;
      return datos;
    }

    const idSubgrupo = parseId(id_subgrupo, 'El id del subgrupo debe ser un numero.');
    const subgrupo = await prisma.SUBGRUPOS_DE_VENTA.findUnique({
      where: { id_subgrupo: idSubgrupo },
    });
    if (!subgrupo) {
      throw new HttpError(404, { message: 'El subgrupo seleccionado no existe.' });
    }
    // grupoFinal null solo pasa al crear sin mandar grupo: ahi el articulo cae
    // en "No Asignado" por default y ningun subgrupo puede corresponderle.
    if (grupoFinal === null || subgrupo.id_grupo !== grupoFinal) {
      throw new HttpError(400, {
        message: 'El subgrupo elegido no pertenece al grupo del articulo.',
      });
    }

    datos.id_subgrupo = idSubgrupo;
    return datos;
  }

  // Cambio de grupo sin tocar el subgrupo: si el que tenia era del grupo
  // anterior, deja de valer.
  if (cambiaGrupo && actual?.id_subgrupo != null && actual.id_grupo !== grupoFinal) {
    datos.id_subgrupo = null;
  }

  return datos;
}

// ============================================================
//  LISTADO PAGINADO
// ============================================================
// El filtrado, la busqueda, el orden y la paginacion se resuelven en la base
// (ver lib/articulosConsulta.js): el frontend nunca se trae la tabla completa.

// Los clientes de cada articulo viajan con la fila, asi la tabla no necesita el
// dump entero de ARTICULOS_X_CLIENTE.
const clientesInclude = { ARTICULOS_X_CLIENTE: { include: { CLIENTES: true } } };

const aplanarClientes = ({ ARTICULOS_X_CLIENTE, ...articulo }) => ({
  ...articulo,
  clientes: ARTICULOS_X_CLIENTE.map(({ CLIENTES }) => ({
    id: CLIENTES.id_cliente,
    nombre: CLIENTES.nombre,
  })),
});

/**
 * Una pagina de articulos + el total que coincide con los filtros.
 * El total sale de un count() con el MISMO where, asi el contador nunca se
 * desincroniza de lo que se ve.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const consulta = parsearConsultaArticulos(req.query);
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
    const articulos = await prisma.ARTICULOS.findMany({
      where: { id_articulo: { in: ids } },
      include: clientesInclude,
    });

    // findMany con `in` no respeta el orden pedido: se reordena por los ids.
    const porId = new Map(articulos.map((articulo) => [articulo.id_articulo, articulo]));

    res.status(200).json({
      articulos: ids.map((id) => aplanarClientes(porId.get(id))),
      total,
    });
  }, 'Error al obtener los articulos.')
);

/**
 * Todos los ids que coinciden con los filtros actuales, sin paginar. Es lo que
 * usa el "seleccionar los N articulos que coinciden" de la tabla: una sola
 * columna, asi que sigue siendo una respuesta liviana.
 */
router.get(
  '/ids',
  asyncHandler(async (req, res) => {
    const consulta = parsearConsultaArticulos(req.query);
    const where = construirWhere(consulta);
    const orderBy = construirOrderBy(consulta.orden);

    const filas = await prisma.$queryRaw`
      SELECT a.id_articulo FROM "ARTICULOS" a WHERE ${where} ORDER BY ${orderBy}`;

    res.status(200).json({ ids: filas.map((fila) => fila.id_articulo) });
  }, 'Error al obtener los ids de los articulos.')
);

/**
 * Opciones de un filtro de seleccion: los valores presentes en el conjunto ya
 * filtrado, EXCLUYENDO el filtro de esa misma columna (si no, al abrir un
 * filtro ya aplicado solo se verian las opciones que uno mismo dejo pasar).
 */
router.get(
  '/opciones',
  asyncHandler(async (req, res) => {
    const columna = req.query.columna;
    const definicion = parseColumnaDeOpciones(columna);
    const consulta = parsearConsultaArticulos(req.query);
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
      id_grupo,
      id_subgrupo,
    } = req.body;

    // Si no se manda grupo, el articulo queda en "No Asignado" por el default
    // de la base.
    const agrupacion = await resolverGrupoYSubgrupo({ id_grupo, id_subgrupo });

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
        ...agrupacion,
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
      id_grupo,
      id_subgrupo,
    } = req.body;

    let agrupacion = {};
    if (id_grupo !== undefined || id_subgrupo !== undefined) {
      const actual = await prisma.ARTICULOS.findUnique({
        where: { id_articulo },
        select: { id_grupo: true, id_subgrupo: true },
      });
      if (!actual) {
        throw new HttpError(404, { message: 'El articulo no existe.' });
      }
      agrupacion = await resolverGrupoYSubgrupo({ id_grupo, id_subgrupo }, actual);
    }

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
        ...agrupacion,
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

// El grupo y el subgrupo del articulo son campos propios (ARTICULOS.id_grupo /
// ARTICULOS.id_subgrupo): se editan con PUT /:id_articulo, no con rutas de
// asociacion.

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

module.exports = router;
