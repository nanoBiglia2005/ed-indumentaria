// ABM de impresoras y estado de conexion de cada una.
//
// El token en claro se devuelve UNA sola vez (al crear y al regenerar) y nunca
// mas: la base guarda solo su hash. Ninguna respuesta de este router puede
// incluir `token_hash`, por eso todas pasan por `aRespuesta`.
const express = require('express');
const prisma = require('../db');
const { asyncHandler, HttpError } = require('../lib/http');
const { parseId, normalizarNombre, assertNombreUnico } = require('../lib/validaciones');
const { requireRol } = require('../lib/roles');
const { ROLES_ADMINISTRAN_IMPRESORAS, NOMBRE_IMPRESORA_MAX } = require('../constants/impresion');
const {
  generarToken,
  hashToken,
  fijarPredeterminada,
  contextoDeSesion,
  puedeElegirImpresora,
  resolverImpresora,
} = require('../services/impresoras');
const { estadoDeImpresoras, desconectarImpresora } = require('../services/impresion');

const router = express.Router();

// Administrar el REGISTRO de impresoras (crear, editar, elegir la propia
// predeterminada, regenerar token) es superadmin-only. Distinto de poder
// ELEGIR a que impresora va un trabajo puntual al imprimir desde
// Articulos/Ventas, que sigue siendo admin+superadmin
// (ROLES_ELIGEN_IMPRESORA, sin tocar: ver services/impresoras.js).
const requireAdmin = requireRol(...ROLES_ADMINISTRAN_IMPRESORAS);

// Fuera token_hash. Se aplica a TODA respuesta de este router.
const aRespuesta = (impresora, conectadas = new Set()) => ({
  id_impresora: impresora.id_impresora,
  nombre: impresora.nombre,
  activa: impresora.activa,
  es_predeterminada: impresora.es_predeterminada,
  conectada: conectadas.has(impresora.id_impresora),
});

const parsearNombre = async (valor, { excluir = null } = {}) => {
  const nombre = normalizarNombre(valor);

  if (!nombre) {
    throw new HttpError(400, { message: 'El nombre de la impresora es obligatorio.' });
  }
  if (nombre.length > NOMBRE_IMPRESORA_MAX) {
    throw new HttpError(400, {
      message: `El nombre no puede superar los ${NOMBRE_IMPRESORA_MAX} caracteres.`,
    });
  }

  await assertNombreUnico(prisma.IMPRESORAS, 'nombre', nombre, {
    mensaje: 'Ya existe una impresora con ese nombre.',
    excluir,
  });

  return nombre;
};

const buscarImpresora = async (idParam) => {
  const id_impresora = parseId(idParam, 'El id de la impresora debe ser un numero.');
  const impresora = await prisma.IMPRESORAS.findUnique({ where: { id_impresora } });

  if (!impresora) {
    throw new HttpError(404, { message: 'La impresora no existe.' });
  }

  return impresora;
};

/**
 * Lista todas las impresoras (activas e inactivas) con su estado de conexion, y
 * de paso le dice al frontend si este usuario puede elegir y cual mostrar
 * preseleccionada. `id_impresora_sugerida` sale del MISMO resolvedor que usa la
 * impresion, para que lo que se ve preseleccionado sea de verdad lo que va a
 * pasar si no se toca nada.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [impresoras, estado, { rol, idAsignada }] = await Promise.all([
      prisma.IMPRESORAS.findMany({ orderBy: { id_impresora: 'asc' } }),
      estadoDeImpresoras(),
      contextoDeSesion(res.locals.session),
    ]);

    const conectadas = new Set(
      estado.filter((item) => item.conectada).map((item) => item.id_impresora)
    );

    const activas = impresoras.filter((impresora) => impresora.activa);
    const { id_impresora } = resolverImpresora({ rol, idAsignada, activas });

    res.status(200).json({
      impresoras: impresoras.map((impresora) => aRespuesta(impresora, conectadas)),
      id_impresora_sugerida: id_impresora ?? null,
      puede_elegir: puedeElegirImpresora(rol),
    });
  }, 'Error al obtener las impresoras.')
);

/**
 * Alta. Devuelve el token en claro: es la unica vez que se puede ver.
 *
 * La PRIMERA impresora queda predeterminada si o si, para que nunca exista el
 * estado "hay impresoras pero ninguna predeterminada", que dejaria sin imprimir
 * a todos los empleados.
 */
router.post(
  '/',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const nombre = await parsearNombre(req.body.nombre);
    const token = generarToken();

    const esLaPrimera = (await prisma.IMPRESORAS.count()) === 0;
    const predeterminada = esLaPrimera || req.body.es_predeterminada === true;

    const impresora = await prisma.$transaction(async (tx) => {
      const creada = await tx.IMPRESORAS.create({
        data: { nombre, token_hash: hashToken(token) },
      });

      if (predeterminada) await fijarPredeterminada(tx, creada.id_impresora);

      return tx.IMPRESORAS.findUnique({ where: { id_impresora: creada.id_impresora } });
    });

    res.status(201).json({ impresora: aRespuesta(impresora), token });
  }, 'Error al crear la impresora.', {
    errores: { P2002: { status: 409, message: 'Ya existe una impresora con ese nombre.' } },
  })
);

/**
 * Impresora preseleccionada del usuario de la SESION. No recibe id_usuario a
 * proposito: nadie cambia la asignacion de otro por esta ruta.
 * `null` limpia la asignacion y vuelve a la predeterminada global.
 *
 * Va ANTES de /:id_impresora: Express matchea por orden y si no, "asignacion"
 * entraria como id y moriria en parseId con un 400 desconcertante.
 */
router.put(
  '/asignacion',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id_usuario = res.locals.session?.user?.id_usuario;
    if (!id_usuario) {
      throw new HttpError(400, { message: 'La sesión no tiene un usuario asociado.' });
    }

    const id_impresora =
      req.body.id_impresora === null || req.body.id_impresora === undefined
        ? null
        : (await buscarImpresora(req.body.id_impresora)).id_impresora;

    await prisma.USUARIOS.update({ where: { id_usuario }, data: { id_impresora } });

    res.status(200).json({ id_impresora });
  }, 'Error al asignar la impresora.', {
    errores: { P2025: { status: 404, message: 'El usuario no existe.' } },
  })
);

/**
 * Edicion: renombrar, activar/desactivar y marcar predeterminada.
 *
 * Dos reglas que se cuidan aca porque la base sola no las puede expresar:
 * - No se desactiva la predeterminada (dejaria a los empleados sin destino).
 * - No se marca predeterminada una desactivada.
 */
router.put(
  '/:id_impresora',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const impresora = await buscarImpresora(req.params.id_impresora);
    const data = {};

    if (req.body.nombre !== undefined) {
      data.nombre = await parsearNombre(req.body.nombre, {
        excluir: { campo: 'id_impresora', id: impresora.id_impresora },
      });
    }

    const activa = req.body.activa === undefined ? impresora.activa : req.body.activa === true;
    const predeterminada = req.body.es_predeterminada === true;

    if (!activa && (predeterminada || impresora.es_predeterminada)) {
      throw new HttpError(409, {
        message: 'No se puede desactivar la impresora predeterminada. Marcá otra primero.',
      });
    }
    if (req.body.activa !== undefined) data.activa = activa;

    const actualizada = await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.IMPRESORAS.update({ where: { id_impresora: impresora.id_impresora }, data });
      }
      if (predeterminada) await fijarPredeterminada(tx, impresora.id_impresora);

      return tx.IMPRESORAS.findUnique({ where: { id_impresora: impresora.id_impresora } });
    });

    res.status(200).json(aRespuesta(actualizada));
  }, 'Error al actualizar la impresora.', {
    errores: {
      P2002: { status: 409, message: 'Ya existe una impresora con ese nombre.' },
      P2025: { status: 404, message: 'La impresora no existe.' },
    },
  })
);

/**
 * Regenera el token. El anterior deja de valer al instante en la base, pero el
 * print-service cachea la validacion 60s: por eso se le pide ademas que corte
 * el websocket vigente. Si eso falla, en el peor caso el cliente viejo sigue
 * imprimiendo hasta un minuto.
 */
router.post(
  '/:id_impresora/token',
  requireAdmin,
  asyncHandler(async (req, res) => {
    const impresora = await buscarImpresora(req.params.id_impresora);
    const token = generarToken();

    await prisma.IMPRESORAS.update({
      where: { id_impresora: impresora.id_impresora },
      data: { token_hash: hashToken(token) },
    });

    await desconectarImpresora(impresora.id_impresora);

    res.status(200).json({ token });
  }, 'Error al regenerar el token de la impresora.')
);

module.exports = router;
