// Actualizacion masiva de precios por talle (pagina Precios del frontend).
//
// El recorrido es en cascada: linea -> grupo -> subgrupo -> talles. Cada paso
// solo ofrece los valores PRESENTES en los articulos que sobrevivieron al paso
// anterior, no el catalogo entero (elegir un grupo que la linea no tiene daria
// una tabla vacia).
//
// Todo el router es admin/superadmin: fija el precio de decenas de articulos de
// una sola vez.
const express = require('express');
const prisma = require('../db');
const { HttpError, asyncHandler } = require('../lib/http');
const { parseId } = require('../lib/validaciones');
const { requireRol } = require('../lib/roles');
const { ROLES_PRECIOS } = require('../constants/roles');
const { ID_GRUPO_NO_ASIGNADO } = require('../constants/agrupaciones');
const { PRECIO_MAX, MAX_ARTICULOS_POR_ACTUALIZACION } = require('../constants/precios');

const router = express.Router();

router.use(requireRol(...ROLES_PRECIOS));

// Los articulos sin subgrupo tambien tienen que ser alcanzables, asi que el
// subgrupo viaja como "id_subgrupo presente = ese subgrupo / ausente = los que
// no tienen ninguno". Un id ficticio (-1) seria ambiguo: existe como id real de
// grupo en otras partes del sistema.
const parseSubgrupoOpcional = (valor) =>
  valor === undefined || valor === ''
    ? null
    : parseId(valor, 'El id del subgrupo debe ser un numero.');

/**
 * Paso 1: los articulos de una linea con su grupo y su subgrupo, mas los
 * nombres de los grupos y subgrupos que aparecen en esa lista.
 *
 * Se devuelven los articulos crudos (no solo los grupos) porque el frontend
 * filtra la MISMA lista en cada paso: primero por grupo para saber que
 * subgrupos ofrecer, y despues por subgrupo. Son 3 enteros por articulo, asi
 * que la respuesta sigue siendo liviana.
 */
router.get(
  '/articulos',
  asyncHandler(async (req, res) => {
    const id_linea = parseId(req.query.id_linea, 'El id de la línea debe ser un numero.');

    const articulos = await prisma.ARTICULOS.findMany({
      where: { id_linea },
      select: { id_articulo: true, id_grupo: true, id_subgrupo: true },
      orderBy: { id_articulo: 'asc' },
    });

    // "No Asignado" no es un grupo de verdad (es donde caen los articulos que
    // se quedaron sin el suyo): no se ofrece para fijar precios. Los articulos
    // igual viajan en la lista, simplemente no hay grupo con el cual llegar a
    // ellos.
    const idsGrupos = [
      ...new Set(articulos.map((articulo) => articulo.id_grupo)),
    ].filter((id) => id !== ID_GRUPO_NO_ASIGNADO);
    const idsSubgrupos = [
      ...new Set(articulos.map((articulo) => articulo.id_subgrupo).filter((id) => id !== null)),
    ];

    // A diferencia de la tabla de Articulos, aca NO se esconden los grupos de
    // Colegios/Clubes: si un articulo de la linea pertenece a uno, tiene que
    // poder elegirse para llegar a el.
    const [grupos, subgrupos] = await Promise.all([
      prisma.GRUPOS_DE_VENTA.findMany({
        where: { id_grupo: { in: idsGrupos } },
        select: { id_grupo: true, nombre_grupo: true },
      }),
      prisma.SUBGRUPOS_DE_VENTA.findMany({
        where: { id_subgrupo: { in: idsSubgrupos } },
        select: { id_subgrupo: true, nombre_subgrupo: true, id_grupo: true },
      }),
    ]);

    res.status(200).json({
      articulos,
      grupos: grupos
        .map((grupo) => ({
          id: grupo.id_grupo,
          nombre: grupo.nombre_grupo ?? `Grupo ${grupo.id_grupo}`,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      subgrupos: subgrupos
        .map((subgrupo) => ({
          id: subgrupo.id_subgrupo,
          nombre: subgrupo.nombre_subgrupo,
          id_grupo: subgrupo.id_grupo,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    });
  }, 'Error al obtener los articulos de la línea.')
);

/**
 * Paso 2: los talles distintos del recorte linea + grupo + subgrupo, cada uno
 * con los ids de los articulos que lo tienen.
 *
 * La consulta se rehace contra la base (no se reusa la lista del paso 1) para
 * que los talles sean los del momento en que se abre la tabla. Los ids viajan
 * junto al talle porque la actualizacion despues va POR ID: si alguien le
 * cambia el talle a un articulo mientras se estan tipeando los precios, el
 * precio cae igual en los articulos que se vieron en pantalla.
 *
 * Los articulos sin talle se agrupan en una fila con talle null (el frontend la
 * muestra como "Sin Talle"): si no, no habria forma de fijarles precio.
 */
router.get(
  '/talles',
  asyncHandler(async (req, res) => {
    const id_linea = parseId(req.query.id_linea, 'El id de la línea debe ser un numero.');
    const id_grupo = parseId(req.query.id_grupo, 'El id del grupo debe ser un numero.');
    // Mismo criterio que el listado de grupos: por "No Asignado" no se filtra.
    if (id_grupo === ID_GRUPO_NO_ASIGNADO) {
      throw new HttpError(400, {
        message: 'No se pueden actualizar los precios del grupo "No Asignado".',
      });
    }
    const id_subgrupo = parseSubgrupoOpcional(req.query.id_subgrupo);

    const articulos = await prisma.ARTICULOS.findMany({
      where: { id_linea, id_grupo, id_subgrupo },
      select: { id_articulo: true, talle: true, precio: true },
      orderBy: { id_articulo: 'asc' },
    });

    // Agrupado en memoria y no con un GROUP BY: el recorte es de decenas de
    // articulos y asi el talle vacio ('' o NULL) cae en un solo grupo sin
    // ensuciar la consulta.
    //
    // De cada talle viajan tambien el precio mas bajo y el mas alto: el
    // frontend los muestra como placeholder del input, para saber que precio
    // se esta por pisar. Cuando los dos coinciden, todos los articulos del
    // talle valen lo mismo.
    const porTalle = new Map();
    for (const articulo of articulos) {
      const talle = articulo.talle?.trim() ? articulo.talle.trim() : null;
      const grupo = porTalle.get(talle);

      if (grupo) {
        grupo.ids.push(articulo.id_articulo);
        grupo.precioMin = Math.min(grupo.precioMin, articulo.precio);
        grupo.precioMax = Math.max(grupo.precioMax, articulo.precio);
      } else {
        porTalle.set(talle, {
          talle,
          ids: [articulo.id_articulo],
          precioMin: articulo.precio,
          precioMax: articulo.precio,
        });
      }
    }

    res.status(200).json({ talles: [...porTalle.values()] });
  }, 'Error al obtener los talles.')
);

// Cada entrada es "este precio, para estos articulos". Se valida entera antes de
// tocar la base: o se aplican todos los talles cargados o no se aplica ninguno.
const parseActualizaciones = (cuerpo) => {
  if (!Array.isArray(cuerpo) || cuerpo.length === 0) {
    throw new HttpError(400, { message: 'No hay precios para actualizar.' });
  }

  const vistos = new Set();
  const actualizaciones = cuerpo.map((entrada) => {
    const precio = entrada?.precio;
    if (!Number.isInteger(precio) || precio < 0 || precio > PRECIO_MAX) {
      throw new HttpError(400, {
        message: `El precio debe ser un numero entero entre 0 y ${PRECIO_MAX}.`,
      });
    }

    const ids = entrada?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every(Number.isInteger)) {
      throw new HttpError(400, { message: 'Los ids de los articulos deben ser numeros.' });
    }

    for (const id of ids) {
      // Un mismo articulo con dos precios distintos dependeria del orden de los
      // updates: se corta antes de escribir nada.
      if (vistos.has(id)) {
        throw new HttpError(400, {
          message: 'Un mismo articulo no puede recibir dos precios distintos.',
        });
      }
      vistos.add(id);
    }

    return { precio, ids };
  });

  if (vistos.size > MAX_ARTICULOS_POR_ACTUALIZACION) {
    throw new HttpError(400, {
      message: `No se pueden actualizar mas de ${MAX_ARTICULOS_POR_ACTUALIZACION} articulos a la vez.`,
    });
  }

  return actualizaciones;
};

/**
 * Aplica los precios cargados. Cada entrada trae los IDS de los articulos que
 * se vieron en la tabla, no un talle: el talle ya se resolvio al armarla y
 * volver a buscarlo aca haria que un cambio de talle en el medio le fije el
 * precio al articulo equivocado.
 *
 * Va todo en una transaccion: si un updateMany falla, no queda media tabla
 * actualizada.
 *
 * No se revalida a que linea/grupo/subgrupo pertenece cada id: el rol que llega
 * hasta aca ya puede editar el precio de cualquier articulo por PUT
 * /api/articulos/:id.
 */
router.put(
  '/',
  asyncHandler(async (req, res) => {
    const actualizaciones = parseActualizaciones(req.body?.actualizaciones);

    const resultados = await prisma.$transaction(
      actualizaciones.map(({ precio, ids }) =>
        prisma.ARTICULOS.updateMany({
          where: { id_articulo: { in: ids } },
          data: { precio },
        })
      )
    );

    res.status(200).json({
      actualizados: resultados.reduce((total, resultado) => total + resultado.count, 0),
    });
  }, 'Error al actualizar los precios.')
);

module.exports = router;
