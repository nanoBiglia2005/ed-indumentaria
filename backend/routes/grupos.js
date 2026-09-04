const express = require('express');
const prisma = require('../db');
const { HttpError, asyncHandler } = require('../lib/http');
const { parseId, parseIds, normalizarNombre, assertNombreUnico } = require('../lib/validaciones');
const { requireRol } = require('../lib/roles');
const { ROLES_ARTICULOS } = require('../constants/roles');
const { ID_GRUPO_NO_ASIGNADO, IDS_GRUPOS_DE_CLIENTES } = require('../constants/agrupaciones');

const router = express.Router();

// Grupos de Articulos/Configuracion: Ventas lee sus propios grupos via
// /api/venta/grupos, nunca por aca.
router.use(requireRol(...ROLES_ARTICULOS));

// "No Asignado" lo administra la base: no se puede renombrar ni borrar (si se
// borrara, los articulos huerfanos se quedarian sin default al que caer).
const assertGrupoEditable = (id_grupo) => {
  if (id_grupo === ID_GRUPO_NO_ASIGNADO) {
    throw new HttpError(403, { message: 'El grupo "No Asignado" no se puede modificar ni eliminar.' });
  }
};

// Los grupos de Colegios/Clubes son especiales y no se listan ni se administran
// desde Configuracion. "No Asignado" SI se devuelve: la pagina de articulos lo
// necesita para mostrar el grupo de cada articulo y para filtrar por el (quien
// no deba ofrecerlo como destino lo descarta de su lista).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const grupos = await prisma.GRUPOS_DE_VENTA.findMany({
      where: { id_grupo: { notIn: IDS_GRUPOS_DE_CLIENTES } },
    });
    res.status(200).json(grupos);
  }, 'Error al obtener los grupos de articulos.')
);

// Crear un nuevo grupo de venta. El nombre no puede repetirse (sin
// distinguir mayusculas/minusculas ni espacios al principio/final).
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const nombre_grupo = normalizarNombre(req.body.nombre_grupo);
    if (!nombre_grupo) {
      throw new HttpError(400, { message: 'El nombre del grupo es obligatorio.' });
    }

    await assertNombreUnico(prisma.GRUPOS_DE_VENTA, 'nombre_grupo', nombre_grupo, {
      mensaje: 'Ya existe un grupo con ese nombre.',
    });

    const nuevoGrupo = await prisma.GRUPOS_DE_VENTA.create({
      data: { nombre_grupo, tipo_grupo: 'venta' },
    });
    res.status(201).json(nuevoGrupo);
  }, 'Error al crear el grupo.')
);

// Editar el nombre de un grupo. Mismo chequeo de nombre unico que al crear,
// excluyendose a si mismo de la comparacion.
router.put(
  '/:id_grupo',
  asyncHandler(async (req, res) => {
    const id_grupo = parseId(req.params.id_grupo, 'El id del grupo debe ser un numero.');
    assertGrupoEditable(id_grupo);

    const nombre_grupo = normalizarNombre(req.body.nombre_grupo);
    if (!nombre_grupo) {
      throw new HttpError(400, { message: 'El nombre del grupo es obligatorio.' });
    }

    await assertNombreUnico(prisma.GRUPOS_DE_VENTA, 'nombre_grupo', nombre_grupo, {
      mensaje: 'Ya existe un grupo con ese nombre.',
      excluir: { campo: 'id_grupo', id: id_grupo },
    });

    const grupoActualizado = await prisma.GRUPOS_DE_VENTA.update({
      where: { id_grupo },
      data: { nombre_grupo },
    });
    res.status(200).json(grupoActualizado);
  }, 'Error al actualizar el grupo.', {
    errores: { P2025: { status: 404, message: 'El grupo no existe.' } },
  })
);

// Eliminar un grupo. Por las reglas de la base, esto tambien borra sus
// subgrupos (cascada) y manda sus articulos al grupo "No Asignado"
// (ON DELETE SET DEFAULT sobre ARTICULOS.id_grupo).
router.delete(
  '/:id_grupo',
  asyncHandler(async (req, res) => {
    const id_grupo = parseId(req.params.id_grupo, 'El id del grupo debe ser un numero.');
    assertGrupoEditable(id_grupo);

    await prisma.GRUPOS_DE_VENTA.delete({ where: { id_grupo } });
    res.status(204).send();
  }, 'Error al eliminar el grupo.', {
    errores: { P2025: { status: 404, message: 'El grupo no existe.' } },
  })
);

// Asociar un grupo a una linea.
router.post(
  '/:id_grupo/lineas',
  asyncHandler(async (req, res) => {
    const [id_grupo, id_linea] = parseIds(
      [req.params.id_grupo, req.body.id_linea],
      'El id del grupo y de la línea deben ser numeros.'
    );

    const asociacion = await prisma.GRUPOS_X_LINEAS.create({
      data: { id_grupo, id_linea },
    });
    res.status(201).json(asociacion);
  }, 'Error al asociar el grupo a la línea.', {
    errores: { P2003: { status: 404, message: 'El grupo o la línea no existen.' } },
  })
);

// Quitar la asociacion entre un grupo y una linea.
router.delete(
  '/:id_grupo/lineas/:id_linea',
  asyncHandler(async (req, res) => {
    const [id_grupo, id_linea] = parseIds(
      [req.params.id_grupo, req.params.id_linea],
      'El id del grupo y de la línea deben ser numeros.'
    );

    await prisma.GRUPOS_X_LINEAS.deleteMany({ where: { id_grupo, id_linea } });
    res.status(204).send();
  }, 'Error al quitar la asociacion entre el grupo y la línea.')
);

module.exports = router;
