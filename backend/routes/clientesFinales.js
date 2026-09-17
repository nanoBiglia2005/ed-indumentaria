// ABM standalone de clientes FINALES (tabla CLIENTES, la del consumidor que
// compra en el local). NO confundir con CLIENTES_MAYORISTAS (routes/clientes.js,
// los colegios/clubes).
//
// La creacion/edicion durante una venta ya vive en routes/venta.js
// (POST/PUT /api/venta/clientes): esta pagina reusa exactamente esa misma
// validacion desde services/clientesFinales.js, no la duplica.
//
// Gateado a ROLES_HISTORIAL: es la misma familia que /api/remitos y la pagina
// de Historial, y esta pagina deep-linkea alli (GET /api/remitos/:id_remito).
const express = require('express');
const prisma = require('../db');
const { asyncHandler } = require('../lib/http');
const { aId, parseId } = require('../lib/validaciones');
const { requireRol } = require('../lib/roles');
const { ROLES_HISTORIAL } = require('../constants/roles');
const {
  parsearDatosCliente,
  buscarClienteConDatoRepetido,
  assertDatosDisponibles,
  obtenerCliente,
  listarClientes,
  eliminarCliente,
} = require('../services/clientesFinales');
const { remitosDeCliente } = require('../services/remitos');

const router = express.Router();

router.use(requireRol(...ROLES_HISTORIAL));

// Pagina de listado: ausente o invalida cae en 1. No es un dato critico como
// un id de recurso, asi que no amerita un 400 propio.
const parsePagina = (valor) => {
  const pagina = aId(valor);
  return pagina && pagina > 0 ? pagina : 1;
};

// Tamano de pagina: ausente o invalido cae en el default de listarClientes /
// remitosDeCliente (undefined deja que cada servicio aplique el suyo).
const parseTamano = (valor) => {
  const tamano = aId(valor);
  return tamano && tamano > 0 ? tamano : undefined;
};

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { clientes, total } = await listarClientes({
      busqueda: typeof req.query.busqueda === 'string' ? req.query.busqueda : '',
      pagina: parsePagina(req.query.pagina),
      tamano: parseTamano(req.query.tamano),
    });

    res.status(200).json({ clientes, total });
  }, 'Error al obtener los clientes.')
);

router.get(
  '/:id_cliente',
  asyncHandler(async (req, res) => {
    const id_cliente = parseId(req.params.id_cliente, 'El id del cliente debe ser un numero.');
    res.status(200).json(await obtenerCliente(id_cliente));
  }, 'Error al obtener el cliente.')
);

/**
 * Alta de un cliente. Misma semantica que POST /api/venta/clientes: un
 * dni/telefono/email repetido NO es un error, es una decision de quien esta
 * cargando (asignar el existente o pisarle los datos con el PUT de abajo),
 * asi que se responde 200 con `creado: false` en vez de 409.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const datos = parsearDatosCliente(req.body);

    const encontrado = await buscarClienteConDatoRepetido(datos);
    if (encontrado) {
      res.status(200).json({ creado: false, cliente: encontrado.cliente, campo: encontrado.campo });
      return;
    }

    const cliente = await prisma.CLIENTES.create({ data: datos });
    res.status(201).json({ creado: true, cliente });
  }, 'Error al crear el cliente.')
);

// Pisa los datos del cliente. Misma semantica que PUT /api/venta/clientes/:id.
router.put(
  '/:id_cliente',
  asyncHandler(async (req, res) => {
    const id_cliente = parseId(req.params.id_cliente, 'El id del cliente debe ser un numero.');
    const datos = parsearDatosCliente(req.body);

    await obtenerCliente(id_cliente);
    await assertDatosDisponibles(datos, id_cliente);

    res.status(200).json(await prisma.CLIENTES.update({ where: { id_cliente }, data: datos }));
  }, 'Error al actualizar el cliente.')
);

// Elimina un cliente. REMITOS.id_cliente es una FK OPCIONAL con onDelete
// SetNull por default (no Restrict, a diferencia de CLIENTES_MAYORISTAS): sin
// chequeo propio, Postgres dejaria borrar el cliente y le pondria NULL a sus
// remitos en silencio. `eliminarCliente` corta con 409 antes de llegar ahi.
router.delete(
  '/:id_cliente',
  asyncHandler(async (req, res) => {
    const id_cliente = parseId(req.params.id_cliente, 'El id del cliente debe ser un numero.');

    await eliminarCliente(id_cliente);
    res.status(204).send();
  }, 'Error al eliminar el cliente.', {
    errores: {
      P2025: { status: 404, message: 'El cliente no existe.' },
    },
  })
);

// Ventas de un cliente, para el deep-link a Historial/Ventas desde su ficha.
router.get(
  '/:id_cliente/ventas',
  asyncHandler(async (req, res) => {
    const id_cliente = parseId(req.params.id_cliente, 'El id del cliente debe ser un numero.');
    await obtenerCliente(id_cliente);

    const { remitos, total } = await remitosDeCliente(id_cliente, {
      pagina: parsePagina(req.query.pagina),
      tamano: parseTamano(req.query.tamano),
    });

    res.status(200).json({ remitos, total });
  }, 'Error al obtener las ventas del cliente.')
);

module.exports = router;
