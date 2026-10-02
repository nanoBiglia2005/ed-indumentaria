const fs = require('node:fs/promises');
const path = require('node:path');
const express = require('express');
const prisma = require('../db');
const { HttpError, asyncHandler } = require('../lib/http');
const { parseId, parseIdOpcional } = require('../lib/validaciones');
const { parseEntero } = require('../lib/consultaSql');
const { requireRol } = require('../lib/roles');
const { ROLES_REPORTES } = require('../constants/roles');
const { dirReportes } = require('../lib/rutaReportes');
const {
  combinacionesDeLinea,
  estadoReportes,
  listarReportes,
  generarReporteArticulos,
  eliminarReporte,
} = require('../services/reportes');

const router = express.Router();

// Solo superadmin (ROLES_REPORTES), aunque el boton viva en Articulos. El limite
// de reportes guardados es global, asi que cualquiera de estos roles ve y puede
// borrar cualquier reporte.
router.use(requireRol(...ROLES_REPORTES));

const TAMANO_PAGINA_DEFECTO = 20;
const TAMANO_PAGINA_MAX = 50;

/** Cuantos hay guardados, el tope y el mas antiguo (el modal avisa antes de generar). */
router.get(
  '/estado',
  asyncHandler(async (req, res) => {
    res.status(200).json(await estadoReportes());
  }, 'Error al obtener el estado de los reportes.')
);

/**
 * Recorrido del modal: con la linea elegida, todas las combinaciones
 * grupo/subgrupo/Colegio-Club que tienen articulos. Los pasos siguientes se
 * filtran en el navegador, sin otra consulta por paso.
 */
router.get(
  '/opciones',
  asyncHandler(async (req, res) => {
    const idLinea = parseId(req.query.id_linea, 'Hay que elegir una línea.');
    res.status(200).json({ combinaciones: await combinacionesDeLinea(idLinea) });
  }, 'Error al obtener las opciones del reporte.')
);

/** Listado paginado, del mas nuevo al mas viejo. */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const pagina =
      req.query.pagina === undefined ? 1 : parseEntero(req.query.pagina, 'La pagina debe ser un numero mayor a 0.');
    const tamano =
      req.query.tamano === undefined
        ? TAMANO_PAGINA_DEFECTO
        : Math.min(
            parseEntero(req.query.tamano, 'El tamaño de pagina debe ser un numero mayor a 0.'),
            TAMANO_PAGINA_MAX
          );

    res.status(200).json(await listarReportes({ pagina, tamano }));
  }, 'Error al obtener los reportes.')
);

/**
 * Genera el PDF, lo guarda y responde SOLO su url: el binario se sirve por
 * GET /:id/archivo, que es lo que el frontend abre en la pestaña nueva (un
 * window.open no puede hacer este POST). Con el tope alcanzado responde 409
 * con el reporte mas antiguo, salvo que venga id_reporte_a_reemplazar.
 */
router.post(
  '/articulos',
  asyncHandler(
    async (req, res) => {
      const ids = {
        idLinea: parseId(req.body.id_linea, 'Hay que elegir una línea.'),
        idGrupo: parseId(req.body.id_grupo, 'Hay que elegir un grupo.'),
        idSubgrupo: parseId(req.body.id_subgrupo, 'Hay que elegir un subgrupo.'),
        idCliente: parseIdOpcional(req.body.id_cliente, 'El id del colegio/club debe ser un numero.'),
      };
      const idAReemplazar = parseIdOpcional(
        req.body.id_reporte_a_reemplazar,
        'El id del reporte a reemplazar debe ser un numero.'
      );

      const creado = await generarReporteArticulos({
        ids,
        idUsuario: res.locals.session?.user?.id_usuario,
        idAReemplazar,
      });
      res.status(201).json(creado);
    },
    'Error al generar el reporte.',
    // El reporte a reemplazar lo borro otro usuario entre la consulta y el borrado.
    { errores: { P2025: { status: 404, message: 'El reporte a reemplazar ya no existe.' } } }
  )
);

/** El PDF, para verlo en el visor del navegador (inline, no descarga forzada). */
router.get(
  '/:id_reporte/archivo',
  asyncHandler(async (req, res) => {
    const id_reporte = parseId(req.params.id_reporte, 'El id del reporte debe ser un numero.');
    const reporte = await prisma.REPORTES.findUnique({ where: { id_reporte } });
    if (!reporte) throw new HttpError(404, { message: 'El reporte no existe.' });

    const nombre = path.basename(reporte.nombre_archivo);
    const dir = dirReportes();
    try {
      await fs.access(path.join(dir, nombre));
    } catch {
      throw new HttpError(404, { message: 'El archivo del reporte ya no existe.' });
    }

    await new Promise((resolve, reject) => {
      res.sendFile(
        nombre,
        {
          root: dir,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${nombre}"`,
            'Cache-Control': 'private, no-cache',
          },
        },
        // Si ya salieron los headers (p. ej. el usuario cerro la pestaña a
        // mitad de la descarga) no hay respuesta de error que mandar.
        (error) => (error && !res.headersSent ? reject(error) : resolve())
      );
    });
  }, 'Error al obtener el archivo del reporte.')
);

router.delete(
  '/:id_reporte',
  asyncHandler(
    async (req, res) => {
      const id_reporte = parseId(req.params.id_reporte, 'El id del reporte debe ser un numero.');
      await eliminarReporte(id_reporte);
      res.status(204).end();
    },
    'Error al eliminar el reporte.',
    { errores: { P2025: { status: 404, message: 'El reporte no existe.' } } }
  )
);

module.exports = router;
