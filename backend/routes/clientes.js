const express = require('express');
const prisma = require('../db');
const { HttpError, asyncHandler } = require('../lib/http');
const { parseId, normalizarNombre, assertNombreUnico } = require('../lib/validaciones');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const clientes = await prisma.CLIENTES.findMany();
    res.status(200).json(clientes);
  }, 'Error al obtener los clientes.')
);

// Crear un colegio/club (tabla CLIENTES). grupo_venta_exclusivo es
// obligatorio: 1 = Colegio, 2 = Club. El nombre no puede repetirse (sin
// distinguir mayusculas/minusculas ni espacios al principio/final).
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const nombre = normalizarNombre(req.body.nombre);
    const grupo_venta_exclusivo = parseInt(req.body.grupo_venta_exclusivo, 10);

    if (!nombre) {
      throw new HttpError(400, { message: 'El nombre es obligatorio.' });
    }
    if (![1, 2].includes(grupo_venta_exclusivo)) {
      throw new HttpError(400, { message: 'Debe indicar si es Colegio o Club.' });
    }

    await assertNombreUnico(prisma.CLIENTES, 'nombre', nombre, {
      mensaje: 'Ya existe un colegio/club con ese nombre.',
    });

    const nuevoCliente = await prisma.CLIENTES.create({
      data: { nombre, grupo_venta_exclusivo },
    });
    res.status(201).json(nuevoCliente);
  }, 'Error al crear el colegio/club.')
);

// Editar un colegio/club (nombre y/o tipo). Mismo chequeo de nombre unico
// que al crear, excluyendose a si mismo de la comparacion.
router.put(
  '/:id_cliente',
  asyncHandler(async (req, res) => {
    const id_cliente = parseId(req.params.id_cliente, 'El id del cliente debe ser un numero.');

    const nombre = normalizarNombre(req.body.nombre);
    const grupo_venta_exclusivo = parseInt(req.body.grupo_venta_exclusivo, 10);

    if (!nombre) {
      throw new HttpError(400, { message: 'El nombre es obligatorio.' });
    }
    if (![1, 2].includes(grupo_venta_exclusivo)) {
      throw new HttpError(400, { message: 'Debe indicar si es Colegio o Club.' });
    }

    await assertNombreUnico(prisma.CLIENTES, 'nombre', nombre, {
      mensaje: 'Ya existe un colegio/club con ese nombre.',
      excluir: { campo: 'id_cliente', id: id_cliente },
    });

    const clienteActualizado = await prisma.CLIENTES.update({
      where: { id_cliente },
      data: { nombre, grupo_venta_exclusivo },
    });
    res.status(200).json(clienteActualizado);
  }, 'Error al actualizar el colegio/club.', {
    errores: { P2025: { status: 404, message: 'El colegio/club no existe.' } },
  })
);

// Eliminar un colegio/club. Falla si tiene articulos o ventas asociadas.
router.delete(
  '/:id_cliente',
  asyncHandler(async (req, res) => {
    const id_cliente = parseId(req.params.id_cliente, 'El id del cliente debe ser un numero.');

    await prisma.CLIENTES.delete({ where: { id_cliente } });
    res.status(204).send();
  }, 'Error al eliminar el colegio/club.', {
    errores: {
      P2025: { status: 404, message: 'El colegio/club no existe.' },
      P2003: { status: 409, message: 'No se puede eliminar: tiene articulos o ventas asociadas.' },
    },
  })
);

module.exports = router;
