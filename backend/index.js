const express = require('express');
const cors = require('cors');
const prisma = require('./db');
require('dotenv').config();

const authModule = import('./auth.mjs');

const app = express();
app.set('trust proxy', true); // necesario para que Auth.js detecte https detrás de ngrok/un proxy
const PORT = process.env.PORT || 5000;
const PRINT_SERVICE_URL = process.env.PRINT_SERVICE_URL || 'http://localhost:8001';

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'OK',
      message: 'Conexión a la base de datos PostgreSQL exitosa'
    });
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'No se pudo conectar a la base de datos.',
      details: error.message
    });
  }
});

app.use('/auth', async (req, res, next) => (await authModule).authHandler(req, res, next));
app.use('/api', async (req, res, next) => (await authModule).requireAuth(req, res, next));


// ============================================================
//  ARTICULOS
// ============================================================

// Obtener TODOS los articulos
app.get('/api/articulos', async (req, res) => {
  try {
    const articulos = await prisma.ARTICULOS.findMany();
    res.status(200).json(articulos);
  } catch (error) {
    console.error('Error al obtener los articulos:', error);
    res.status(500).json({ message: 'Error al obtener los articulos.', details: error.message });
  }
});

// Crear un nuevo articulo (tabla ARTICULOS)
app.post('/api/articulos', async (req, res) => {
  try {
    const {
      cant,
      precio,
      barcode_header,
      barcode_tail,
      stock_minimo,
      vigente,
      talle,
      cant_reservada,
    } = req.body;

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
      },
    });
    res.status(201).json(nuevoArticulo);
  } catch (error) {
    console.error('Error al crear el articulo:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe un articulo con ese codigo de barra.', details: error.message });
    }
    res.status(500).json({ message: 'Error al crear el articulo.', details: error.message });
  }
});

// Actualizar un articulo existente (tabla ARTICULOS)
app.put('/api/articulos/:id_articulo', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

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
    } = req.body;

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
      },
    });
    res.status(200).json(articuloActualizado);
  } catch (error) {
    console.error('Error al actualizar el articulo:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe un articulo con ese codigo de barra.', details: error.message });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El articulo no existe.', details: error.message });
    }
    res.status(500).json({ message: 'Error al actualizar el articulo.', details: error.message });
  }
});

app.delete('/api/articulos/:id_articulo', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    await prisma.ARTICULOS.delete({ where: { id_articulo } });
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar el articulo:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El articulo no existe.', details: error.message });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({
        message: 'No se puede eliminar el articulo: tiene ventas u otros registros asociados.',
        details: error.message,
      });
    }
    res.status(500).json({ message: 'Error al eliminar el articulo.', details: error.message });
  }
});

app.post('/api/articulos/:id_articulo/grupos', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const { id_grupo } = req.body;

    const asignacion = await prisma.ARTICULOS_X_GRUPO_VENTA.create({
      data: { id_articulo, id_grupo_venta: id_grupo },
    });
    res.status(201).json(asignacion);
  } catch (error) {
    console.error('Error al asignar el articulo al grupo:', error);
    res.status(500).json({ message: 'Error al asignar el articulo al grupo.', details: error.message });
  }
});

app.post('/api/articulos/:id_articulo/clientes', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const { id_cliente } = req.body;

    const asignacion = await prisma.ARTICULOS_X_CLIENTE.create({
      data: { id_articulo, id_cliente },
    });
    res.status(201).json(asignacion);
  } catch (error) {
    console.error('Error al asignar el articulo al cliente:', error);
    if (error.code === 'P2003') {
      return res.status(404).json({ message: 'El articulo o el cliente no existen.', details: error.message });
    }
    res.status(500).json({ message: 'Error al asignar el articulo al cliente.', details: error.message });
  }
});

// Asignar un articulo a un SUBGRUPO: un articulo solo puede tener un
// subgrupo por cada grupo al que pertenece, asi que esto siempre actualiza
// la fila existente de ese grupo (sea cual sea su subgrupo actual) en vez de
// crear una fila nueva; si el articulo todavia no esta en el grupo del
// subgrupo, se crea la fila.
app.post('/api/articulos/:id_articulo/subgrupos', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const { id_subgrupo } = req.body;

    const subgrupo = await prisma.SUBGRUPOS_DE_VENTA.findUnique({ where: { id_subgrupo } });
    if (!subgrupo) {
      return res.status(404).json({ message: 'El subgrupo no existe.' });
    }

    const filaDelGrupo = await prisma.ARTICULOS_X_GRUPO_VENTA.findFirst({
      where: { id_articulo, id_grupo_venta: subgrupo.id_grupo },
    });

    if (filaDelGrupo) {
      await prisma.ARTICULOS_X_GRUPO_VENTA.update({
        where: { id_reg: filaDelGrupo.id_reg },
        data: { id_subgrupo },
      });
    } else {
      await prisma.ARTICULOS_X_GRUPO_VENTA.create({
        data: { id_articulo, id_grupo_venta: subgrupo.id_grupo, id_subgrupo },
      });
    }

    res.status(201).json({ id_articulo, id_subgrupo });
  } catch (error) {
    console.error('Error al asignar el articulo al subgrupo:', error);
    res.status(500).json({ message: 'Error al asignar el articulo al subgrupo.', details: error.message });
  }
});

app.delete('/api/articulos/:id_articulo/grupos/:id_grupo', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    const id_grupo = parseInt(req.params.id_grupo, 10);
    if (Number.isNaN(id_articulo) || Number.isNaN(id_grupo)) {
      return res.status(400).json({ message: 'El id del articulo y del grupo deben ser numeros.' });
    }

    await prisma.ARTICULOS_X_GRUPO_VENTA.deleteMany({
      where: { id_articulo, id_grupo_venta: id_grupo },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error al quitar el articulo del grupo:', error);
    res.status(500).json({ message: 'Error al quitar el articulo del grupo.', details: error.message });
  }
});

app.delete('/api/articulos/:id_articulo/clientes/:id_cliente', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    const id_cliente = parseInt(req.params.id_cliente, 10);
    if (Number.isNaN(id_articulo) || Number.isNaN(id_cliente)) {
      return res.status(400).json({ message: 'El id del articulo y del cliente deben ser numeros.' });
    }

    await prisma.ARTICULOS_X_CLIENTE.deleteMany({
      where: { id_articulo, id_cliente },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error al quitar el articulo del cliente:', error);
    res.status(500).json({ message: 'Error al quitar el articulo del cliente.', details: error.message });
  }
});

// Quitar un articulo de un SUBGRUPO: se limpia el atributo id_subgrupo de
// las filas, sin sacar el articulo de su grupo.
app.delete('/api/articulos/:id_articulo/subgrupos/:id_subgrupo', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    const id_subgrupo = parseInt(req.params.id_subgrupo, 10);
    if (Number.isNaN(id_articulo) || Number.isNaN(id_subgrupo)) {
      return res.status(400).json({ message: 'El id del articulo y del subgrupo deben ser numeros.' });
    }

    await prisma.ARTICULOS_X_GRUPO_VENTA.updateMany({
      where: { id_articulo, id_subgrupo },
      data: { id_subgrupo: null },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error al quitar el articulo del subgrupo:', error);
    res.status(500).json({ message: 'Error al quitar el articulo del subgrupo.', details: error.message });
  }
});

app.get('/api/articulos-x-grupo', async (req, res) => {
  try {
    const registros = await prisma.ARTICULOS_X_GRUPO_VENTA.findMany();
    res.status(200).json(registros);
  } catch (error) {
    console.error('Error al obtener ARTICULOS_X_GRUPO_VENTA:', error);
    res.status(500).json({ message: 'Error al obtener ARTICULOS_X_GRUPO_VENTA.', details: error.message });
  }
});

app.get('/api/articulos-x-cliente', async (req, res) => {
  try {
    const registros = await prisma.ARTICULOS_X_CLIENTE.findMany();
    res.status(200).json(registros);
  } catch (error) {
    console.error('Error al obtener ARTICULOS_X_CLIENTE:', error);
    res.status(500).json({ message: 'Error al obtener ARTICULOS_X_CLIENTE.', details: error.message });
  }
});

app.get('/api/grupos', async (req, res) => {
  try {
    const grupos = await prisma.GRUPOS_DE_VENTA.findMany({
      where: { id_grupo: { notIn: [1, 2] } },
    });
    res.status(200).json(grupos);
  } catch (error) {
    console.error('Error al obtener los grupos de articulos:', error);
    res.status(500).json({ message: 'Error al obtener los grupos de articulos.', details: error.message });
  }
});

// Crear un nuevo grupo de venta. El nombre no puede repetirse (sin
// distinguir mayusculas/minusculas ni espacios al principio/final).
app.post('/api/grupos', async (req, res) => {
  try {
    const nombre_grupo = typeof req.body.nombre_grupo === 'string' ? req.body.nombre_grupo.trim() : '';
    if (!nombre_grupo) {
      return res.status(400).json({ message: 'El nombre del grupo es obligatorio.' });
    }

    const existente = await prisma.GRUPOS_DE_VENTA.findFirst({
      where: { nombre_grupo: { equals: nombre_grupo, mode: 'insensitive' } },
    });
    if (existente) {
      return res.status(409).json({ message: 'Ya existe un grupo con ese nombre.' });
    }

    const nuevoGrupo = await prisma.GRUPOS_DE_VENTA.create({
      data: { nombre_grupo, tipo_grupo: 'venta' },
    });
    res.status(201).json(nuevoGrupo);
  } catch (error) {
    console.error('Error al crear el grupo:', error);
    res.status(500).json({ message: 'Error al crear el grupo.', details: error.message });
  }
});

// Editar el nombre de un grupo. Mismo chequeo de nombre unico que al crear,
// excluyendose a si mismo de la comparacion.
app.put('/api/grupos/:id_grupo', async (req, res) => {
  try {
    const id_grupo = parseInt(req.params.id_grupo, 10);
    if (Number.isNaN(id_grupo)) {
      return res.status(400).json({ message: 'El id del grupo debe ser un numero.' });
    }

    const nombre_grupo = typeof req.body.nombre_grupo === 'string' ? req.body.nombre_grupo.trim() : '';
    if (!nombre_grupo) {
      return res.status(400).json({ message: 'El nombre del grupo es obligatorio.' });
    }

    const existente = await prisma.GRUPOS_DE_VENTA.findFirst({
      where: { nombre_grupo: { equals: nombre_grupo, mode: 'insensitive' }, id_grupo: { not: id_grupo } },
    });
    if (existente) {
      return res.status(409).json({ message: 'Ya existe un grupo con ese nombre.' });
    }

    const grupoActualizado = await prisma.GRUPOS_DE_VENTA.update({
      where: { id_grupo },
      data: { nombre_grupo },
    });
    res.status(200).json(grupoActualizado);
  } catch (error) {
    console.error('Error al actualizar el grupo:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El grupo no existe.', details: error.message });
    }
    res.status(500).json({ message: 'Error al actualizar el grupo.', details: error.message });
  }
});

// Eliminar un grupo. Por la relacion en cascada de la base, esto tambien
// borra sus subgrupos y las asociaciones de articulos a este grupo.
app.delete('/api/grupos/:id_grupo', async (req, res) => {
  try {
    const id_grupo = parseInt(req.params.id_grupo, 10);
    if (Number.isNaN(id_grupo)) {
      return res.status(400).json({ message: 'El id del grupo debe ser un numero.' });
    }

    await prisma.GRUPOS_DE_VENTA.delete({ where: { id_grupo } });
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar el grupo:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El grupo no existe.', details: error.message });
    }
    res.status(500).json({ message: 'Error al eliminar el grupo.', details: error.message });
  }
});

app.get('/api/subgrupos', async (req, res) => {
  try {
    const subgrupos = await prisma.SUBGRUPOS_DE_VENTA.findMany();
    res.status(200).json(subgrupos);
  } catch (error) {
    console.error('Error al obtener los subgrupos de venta:', error);
    res.status(500).json({ message: 'Error al obtener los subgrupos de venta.', details: error.message });
  }
});

// Crear un nuevo subgrupo dentro de un grupo existente. El nombre no puede
// repetirse dentro de ese mismo grupo (sin distinguir mayusculas/minusculas
// ni espacios al principio/final).
app.post('/api/subgrupos', async (req, res) => {
  try {
    const nombre_subgrupo = typeof req.body.nombre_subgrupo === 'string' ? req.body.nombre_subgrupo.trim() : '';
    const id_grupo = parseInt(req.body.id_grupo, 10);

    if (!nombre_subgrupo) {
      return res.status(400).json({ message: 'El nombre del subgrupo es obligatorio.' });
    }
    if (Number.isNaN(id_grupo)) {
      return res.status(400).json({ message: 'Debe seleccionar un grupo valido.' });
    }

    const grupo = await prisma.GRUPOS_DE_VENTA.findUnique({ where: { id_grupo } });
    if (!grupo) {
      return res.status(404).json({ message: 'El grupo seleccionado no existe.' });
    }

    const existente = await prisma.SUBGRUPOS_DE_VENTA.findFirst({
      where: { id_grupo, nombre_subgrupo: { equals: nombre_subgrupo, mode: 'insensitive' } },
    });
    if (existente) {
      return res.status(409).json({ message: 'Ya existe un subgrupo con ese nombre en el grupo elegido.' });
    }

    const nuevoSubgrupo = await prisma.SUBGRUPOS_DE_VENTA.create({
      data: { nombre_subgrupo, id_grupo },
    });
    res.status(201).json(nuevoSubgrupo);
  } catch (error) {
    console.error('Error al crear el subgrupo:', error);
    res.status(500).json({ message: 'Error al crear el subgrupo.', details: error.message });
  }
});

// Editar un subgrupo (nombre y/o grupo). Mismo chequeo de nombre unico
// dentro del grupo elegido, excluyendose a si mismo de la comparacion.
app.put('/api/subgrupos/:id_subgrupo', async (req, res) => {
  try {
    const id_subgrupo = parseInt(req.params.id_subgrupo, 10);
    if (Number.isNaN(id_subgrupo)) {
      return res.status(400).json({ message: 'El id del subgrupo debe ser un numero.' });
    }

    const nombre_subgrupo = typeof req.body.nombre_subgrupo === 'string' ? req.body.nombre_subgrupo.trim() : '';
    const id_grupo = parseInt(req.body.id_grupo, 10);

    if (!nombre_subgrupo) {
      return res.status(400).json({ message: 'El nombre del subgrupo es obligatorio.' });
    }
    if (Number.isNaN(id_grupo)) {
      return res.status(400).json({ message: 'Debe seleccionar un grupo valido.' });
    }

    const grupo = await prisma.GRUPOS_DE_VENTA.findUnique({ where: { id_grupo } });
    if (!grupo) {
      return res.status(404).json({ message: 'El grupo seleccionado no existe.' });
    }

    const existente = await prisma.SUBGRUPOS_DE_VENTA.findFirst({
      where: {
        id_grupo,
        nombre_subgrupo: { equals: nombre_subgrupo, mode: 'insensitive' },
        id_subgrupo: { not: id_subgrupo },
      },
    });
    if (existente) {
      return res.status(409).json({ message: 'Ya existe un subgrupo con ese nombre en el grupo elegido.' });
    }

    const subgrupoActualizado = await prisma.SUBGRUPOS_DE_VENTA.update({
      where: { id_subgrupo },
      data: { nombre_subgrupo, id_grupo },
    });
    res.status(200).json(subgrupoActualizado);
  } catch (error) {
    console.error('Error al actualizar el subgrupo:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El subgrupo no existe.', details: error.message });
    }
    res.status(500).json({ message: 'Error al actualizar el subgrupo.', details: error.message });
  }
});

// Eliminar un subgrupo. Falla si hay articulos que todavia lo tienen
// asignado (hay que quitarselo primero).
app.delete('/api/subgrupos/:id_subgrupo', async (req, res) => {
  try {
    const id_subgrupo = parseInt(req.params.id_subgrupo, 10);
    if (Number.isNaN(id_subgrupo)) {
      return res.status(400).json({ message: 'El id del subgrupo debe ser un numero.' });
    }

    await prisma.SUBGRUPOS_DE_VENTA.delete({ where: { id_subgrupo } });
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar el subgrupo:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El subgrupo no existe.', details: error.message });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({
        message: 'No se puede eliminar el subgrupo: todavia hay articulos que lo tienen asignado.',
        details: error.message,
      });
    }
    res.status(500).json({ message: 'Error al eliminar el subgrupo.', details: error.message });
  }
});

app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await prisma.CLIENTES.findMany();
    res.status(200).json(clientes);
  } catch (error) {
    console.error('Error al obtener los clientes:', error);
    res.status(500).json({ message: 'Error al obtener los clientes.', details: error.message });
  }
});

// Crear un colegio/club (tabla CLIENTES). grupo_venta_exclusivo es
// obligatorio: 1 = Colegio, 2 = Club. El nombre no puede repetirse (sin
// distinguir mayusculas/minusculas ni espacios al principio/final).
app.post('/api/clientes', async (req, res) => {
  try {
    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    const grupo_venta_exclusivo = parseInt(req.body.grupo_venta_exclusivo, 10);

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }
    if (![1, 2].includes(grupo_venta_exclusivo)) {
      return res.status(400).json({ message: 'Debe indicar si es Colegio o Club.' });
    }

    const existente = await prisma.CLIENTES.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } },
    });
    if (existente) {
      return res.status(409).json({ message: 'Ya existe un colegio/club con ese nombre.' });
    }

    const nuevoCliente = await prisma.CLIENTES.create({
      data: { nombre, grupo_venta_exclusivo },
    });
    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error('Error al crear el colegio/club:', error);
    res.status(500).json({ message: 'Error al crear el colegio/club.', details: error.message });
  }
});

// Editar un colegio/club (nombre y/o tipo). Mismo chequeo de nombre unico
// que al crear, excluyendose a si mismo de la comparacion.
app.put('/api/clientes/:id_cliente', async (req, res) => {
  try {
    const id_cliente = parseInt(req.params.id_cliente, 10);
    if (Number.isNaN(id_cliente)) {
      return res.status(400).json({ message: 'El id del cliente debe ser un numero.' });
    }

    const nombre = typeof req.body.nombre === 'string' ? req.body.nombre.trim() : '';
    const grupo_venta_exclusivo = parseInt(req.body.grupo_venta_exclusivo, 10);

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es obligatorio.' });
    }
    if (![1, 2].includes(grupo_venta_exclusivo)) {
      return res.status(400).json({ message: 'Debe indicar si es Colegio o Club.' });
    }

    const existente = await prisma.CLIENTES.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' }, id_cliente: { not: id_cliente } },
    });
    if (existente) {
      return res.status(409).json({ message: 'Ya existe un colegio/club con ese nombre.' });
    }

    const clienteActualizado = await prisma.CLIENTES.update({
      where: { id_cliente },
      data: { nombre, grupo_venta_exclusivo },
    });
    res.status(200).json(clienteActualizado);
  } catch (error) {
    console.error('Error al actualizar el colegio/club:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El colegio/club no existe.', details: error.message });
    }
    res.status(500).json({ message: 'Error al actualizar el colegio/club.', details: error.message });
  }
});

// Eliminar un colegio/club. Falla si tiene articulos o ventas asociadas.
app.delete('/api/clientes/:id_cliente', async (req, res) => {
  try {
    const id_cliente = parseInt(req.params.id_cliente, 10);
    if (Number.isNaN(id_cliente)) {
      return res.status(400).json({ message: 'El id del cliente debe ser un numero.' });
    }

    await prisma.CLIENTES.delete({ where: { id_cliente } });
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar el colegio/club:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El colegio/club no existe.', details: error.message });
    }
    if (error.code === 'P2003') {
      return res.status(409).json({
        message: 'No se puede eliminar: tiene articulos o ventas asociadas.',
        details: error.message,
      });
    }
    res.status(500).json({ message: 'Error al eliminar el colegio/club.', details: error.message });
  }
});

app.get('/api/lineas', async (req, res) => {
  try {
    const lineas = await prisma.LINEAS.findMany();
    res.status(200).json(lineas);
  } catch (error) {
    console.error('Error al obtener las lineas:', error);
    res.status(500).json({ message: 'Error al obtener las lineas.', details: error.message });
  }
});

// Crear una nueva linea. El nombre no puede repetirse (sin distinguir
// mayusculas/minusculas ni espacios al principio/final).
app.post('/api/lineas', async (req, res) => {
  try {
    const nombre_linea = typeof req.body.nombre_linea === 'string' ? req.body.nombre_linea.trim() : '';
    if (!nombre_linea) {
      return res.status(400).json({ message: 'El nombre de la línea es obligatorio.' });
    }

    const existente = await prisma.LINEAS.findFirst({
      where: { nombre_linea: { equals: nombre_linea, mode: 'insensitive' } },
    });
    if (existente) {
      return res.status(409).json({ message: 'Ya existe una línea con ese nombre.' });
    }

    const nuevaLinea = await prisma.LINEAS.create({ data: { nombre_linea } });
    res.status(201).json(nuevaLinea);
  } catch (error) {
    console.error('Error al crear la linea:', error);
    res.status(500).json({ message: 'Error al crear la línea.', details: error.message });
  }
});

// Editar el nombre de una linea. Mismo chequeo de nombre unico que al crear,
// excluyendose a si misma de la comparacion.
app.put('/api/lineas/:id_linea', async (req, res) => {
  try {
    const id_linea = parseInt(req.params.id_linea, 10);
    if (Number.isNaN(id_linea)) {
      return res.status(400).json({ message: 'El id de la línea debe ser un numero.' });
    }

    const nombre_linea = typeof req.body.nombre_linea === 'string' ? req.body.nombre_linea.trim() : '';
    if (!nombre_linea) {
      return res.status(400).json({ message: 'El nombre de la línea es obligatorio.' });
    }

    const existente = await prisma.LINEAS.findFirst({
      where: { nombre_linea: { equals: nombre_linea, mode: 'insensitive' }, id_linea: { not: id_linea } },
    });
    if (existente) {
      return res.status(409).json({ message: 'Ya existe una línea con ese nombre.' });
    }

    const lineaActualizada = await prisma.LINEAS.update({
      where: { id_linea },
      data: { nombre_linea },
    });
    res.status(200).json(lineaActualizada);
  } catch (error) {
    console.error('Error al actualizar la linea:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'La línea no existe.', details: error.message });
    }
    res.status(500).json({ message: 'Error al actualizar la línea.', details: error.message });
  }
});

// Eliminar una linea. Falla si hay articulos que todavia la tienen asignada.
app.delete('/api/lineas/:id_linea', async (req, res) => {
  try {
    const id_linea = parseInt(req.params.id_linea, 10);
    if (Number.isNaN(id_linea)) {
      return res.status(400).json({ message: 'El id de la línea debe ser un numero.' });
    }

    // El FK de ARTICULOS a LINEAS es ON DELETE SET NULL, asi que esto no
    // falla por articulos en uso: simplemente quedan sin linea. Las
    // asociaciones en GRUPOS_X_LINEAS son ON DELETE CASCADE.
    await prisma.LINEAS.delete({ where: { id_linea } });
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar la linea:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'La línea no existe.', details: error.message });
    }
    res.status(500).json({ message: 'Error al eliminar la línea.', details: error.message });
  }
});

app.get('/api/grupos-x-lineas', async (req, res) => {
  try {
    const registros = await prisma.GRUPOS_X_LINEAS.findMany();
    res.status(200).json(registros);
  } catch (error) {
    console.error('Error al obtener GRUPOS_X_LINEAS:', error);
    res.status(500).json({ message: 'Error al obtener GRUPOS_X_LINEAS.', details: error.message });
  }
});

// Asociar un grupo a una linea.
app.post('/api/grupos/:id_grupo/lineas', async (req, res) => {
  try {
    const id_grupo = parseInt(req.params.id_grupo, 10);
    const id_linea = parseInt(req.body.id_linea, 10);
    if (Number.isNaN(id_grupo) || Number.isNaN(id_linea)) {
      return res.status(400).json({ message: 'El id del grupo y de la línea deben ser numeros.' });
    }

    const asociacion = await prisma.GRUPOS_X_LINEAS.create({
      data: { id_grupo, id_linea },
    });
    res.status(201).json(asociacion);
  } catch (error) {
    console.error('Error al asociar el grupo a la línea:', error);
    if (error.code === 'P2003') {
      return res.status(404).json({ message: 'El grupo o la línea no existen.', details: error.message });
    }
    res.status(500).json({ message: 'Error al asociar el grupo a la línea.', details: error.message });
  }
});

// Quitar la asociacion entre un grupo y una linea.
app.delete('/api/grupos/:id_grupo/lineas/:id_linea', async (req, res) => {
  try {
    const id_grupo = parseInt(req.params.id_grupo, 10);
    const id_linea = parseInt(req.params.id_linea, 10);
    if (Number.isNaN(id_grupo) || Number.isNaN(id_linea)) {
      return res.status(400).json({ message: 'El id del grupo y de la línea deben ser numeros.' });
    }

    await prisma.GRUPOS_X_LINEAS.deleteMany({ where: { id_grupo, id_linea } });
    res.status(204).send();
  } catch (error) {
    console.error('Error al quitar la asociacion entre el grupo y la línea:', error);
    res.status(500).json({ message: 'Error al quitar la asociacion entre el grupo y la línea.', details: error.message });
  }
});

// ============================================================
//  VENTA (seleccion de articulos, paso a paso)
// ============================================================
// El flujo es cliente -> grupo -> articulos. Cada paso acota el siguiente y
// el filtrado se hace en la base, asi el frontend nunca se trae la tabla
// ARTICULOS completa.

// Clientes agrupados por su grupo de venta exclusivo (Colegios, Clubes, ...).
// No se hardcodea cuales son: se arma con lo que haya en la base, asi que si
// mañana aparece una agrupacion nueva sale sola.
app.get('/api/venta/agrupaciones', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Error al obtener las agrupaciones de clientes:', error);
    res.status(500).json({ message: 'Error al obtener las agrupaciones.', details: error.message });
  }
});

// Grupos con al menos un articulo vigente asociado al cliente elegido.
app.get('/api/venta/grupos', async (req, res) => {
  try {
    const id_cliente = parseInt(req.query.id_cliente, 10);
    if (Number.isNaN(id_cliente)) {
      return res.status(400).json({ message: 'El id del cliente debe ser un numero.' });
    }

    const grupos = await prisma.GRUPOS_DE_VENTA.findMany({
      where: {
        ARTICULOS_X_GRUPO_VENTA: {
          some: {
            ARTICULOS: {
              vigente: true,
              ARTICULOS_X_CLIENTE: { some: { id_cliente } },
            },
          },
        },
      },
      orderBy: { nombre_grupo: 'asc' },
    });

    res.status(200).json(grupos);
  } catch (error) {
    console.error('Error al obtener los grupos del cliente:', error);
    res.status(500).json({ message: 'Error al obtener los grupos del cliente.', details: error.message });
  }
});

// Articulos vigentes que estan a la vez en el cliente y en el grupo elegidos.
// La interseccion la resuelve la base; se devuelve tambien el subgrupo de cada
// articulo DENTRO de ese grupo, y los subgrupos disponibles para el dropdown.
app.get('/api/venta/articulos', async (req, res) => {
  try {
    const id_cliente = parseInt(req.query.id_cliente, 10);
    const id_grupo = parseInt(req.query.id_grupo, 10);
    if (Number.isNaN(id_cliente) || Number.isNaN(id_grupo)) {
      return res.status(400).json({ message: 'El id del cliente y del grupo deben ser numeros.' });
    }

    const relaciones = await prisma.ARTICULOS_X_GRUPO_VENTA.findMany({
      where: {
        id_grupo_venta: id_grupo,
        ARTICULOS: {
          vigente: true,
          ARTICULOS_X_CLIENTE: { some: { id_cliente } },
        },
      },
      include: { ARTICULOS: true, SUBGRUPOS_DE_VENTA: true },
    });

    // Un articulo deberia tener una sola fila por grupo, pero se deduplica por
    // las dudas para no repetir filas en la tabla.
    const porArticulo = new Map();
    for (const relacion of relaciones) {
      if (porArticulo.has(relacion.id_articulo)) continue;
      porArticulo.set(relacion.id_articulo, {
        ...relacion.ARTICULOS,
        id_subgrupo: relacion.id_subgrupo,
        nombre_subgrupo: relacion.SUBGRUPOS_DE_VENTA?.nombre_subgrupo ?? null,
      });
    }

    const subgrupos = await prisma.SUBGRUPOS_DE_VENTA.findMany({
      where: { id_grupo },
      orderBy: { nombre_subgrupo: 'asc' },
    });

    res.status(200).json({ articulos: [...porArticulo.values()], subgrupos });
  } catch (error) {
    console.error('Error al obtener los articulos de la venta:', error);
    res.status(500).json({ message: 'Error al obtener los articulos.', details: error.message });
  }
});

app.get('/api/tipos-de-pago', async (req, res) => {
  try {
    const tiposDePago = await prisma.TIPOS_DE_PAGO.findMany();
    res.status(200).json(tiposDePago);
  } catch (error) {
    console.error('Error al obtener los tipos de pago:', error);
    res.status(500).json({ message: 'Error al obtener los tipos de pago.', details: error.message });
  }
});

app.put('/api/tipos-de-pago/:id_tipos_de_pago', async (req, res) => {
  try {
    const id_tipos_de_pago = parseInt(req.params.id_tipos_de_pago, 10);
    if (Number.isNaN(id_tipos_de_pago)) {
      return res.status(400).json({ message: 'El id del tipo de pago debe ser un numero.' });
    }

    const recargo = Number(req.body.recargo);
    if (!Number.isFinite(recargo) || recargo < 0) {
      return res.status(400).json({ message: 'El recargo debe ser un numero mayor o igual a 0.' });
    }

    const tipoDePagoActualizado = await prisma.TIPOS_DE_PAGO.update({
      where: { id_tipos_de_pago },
      data: { recargo },
    });
    res.status(200).json(tipoDePagoActualizado);
  } catch (error) {
    console.error('Error al actualizar el tipo de pago:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'El tipo de pago no existe.', details: error.message });
    }
    res.status(500).json({ message: 'Error al actualizar el tipo de pago.', details: error.message });
  }
});

const remitosInclude = {
  DETALLES_REMITO: {
    include: { ARTICULOS: true },
  },
};

const redondearPrecio = (valor) => Math.round(Math.round(valor) / 10) * 10;

const formatearFecha = (fecha) => {
  const valor = fecha ? new Date(fecha) : new Date();
  const dia = String(valor.getUTCDate()).padStart(2, '0');
  const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${valor.getUTCFullYear()}`;
};

const METODOS_DE_PAGO = ['efectivo', 'tarjeta'];

// Estados de la tabla ESTADOS_REMITOS.
const ESTADO_CONFIRMADO = 1;
const ESTADO_FACTURADO = 2;
const ESTADO_ANULADO = 3;

// El recargo sale de TIPOS_DE_PAGO (configurable desde la app).
const obtenerRecargoTarjeta = async () => {
  const tiposDePago = await prisma.TIPOS_DE_PAGO.findMany();
  const tarjeta = tiposDePago.find((tipo) =>
    (tipo.nombre_tipo_de_pago ?? '').toLowerCase().includes('tarjeta')
  );

  if (!tarjeta) {
    console.warn('No se encontro un tipo de pago "Tarjeta": la venta se calcula sin recargo.');
  }

  return tarjeta?.recargo ?? 0;
};

const resolverItemsVenta = async (detalles) => {
  if (!Array.isArray(detalles) || detalles.length === 0) {
    return { error: { status: 400, message: 'La venta debe tener al menos un articulo.' } };
  }

  const cantidadesPorArticulo = new Map();
  const metodosPorArticulo = new Map();

  for (const detalle of detalles) {
    const id_articulo = parseInt(detalle.id_articulo, 10);
    const cantidad = parseInt(detalle.cantidad, 10);

    if (Number.isNaN(id_articulo)) {
      return { error: { status: 400, message: 'Los articulos de la venta son invalidos.' } };
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      return {
        error: { status: 400, message: 'Las cantidades de la venta deben ser numeros enteros mayores a 0.' },
      };
    }

    const metodo = detalle.metodo_pago ?? 'efectivo';
    if (!METODOS_DE_PAGO.includes(metodo)) {
      return { error: { status: 400, message: `Metodo de pago invalido: "${metodo}".` } };
    }

    cantidadesPorArticulo.set(id_articulo, cantidad);
    metodosPorArticulo.set(id_articulo, metodo);
  }

  const articulos = await prisma.ARTICULOS.findMany({
    where: { id_articulo: { in: [...cantidadesPorArticulo.keys()] } },
  });

  if (articulos.length !== cantidadesPorArticulo.size) {
    return { error: { status: 404, message: 'Alguno de los articulos de la venta no existe.' } };
  }

  const articuloNoVigente = articulos.find((articulo) => !articulo.vigente);
  if (articuloNoVigente) {
    return {
      error: {
        status: 409,
        message: `El articulo "${articuloNoVigente.descripcion ?? articuloNoVigente.id_articulo}" ya no esta vigente.`,
      },
    };
  }

  const recargoTarjeta = await obtenerRecargoTarjeta();
  const multiplicador = 1 + recargoTarjeta / 100;

  const items = articulos.map((articulo) => {
    const precioEfectivo = redondearPrecio(articulo.precio);

    return {
      id_articulo: articulo.id_articulo,
      descripcion: articulo.descripcion ?? `Articulo ${articulo.id_articulo}`,
      cantidad: cantidadesPorArticulo.get(articulo.id_articulo),
      metodo_pago: metodosPorArticulo.get(articulo.id_articulo),
      precio_efectivo: precioEfectivo,
      precio_tarjeta: redondearPrecio(precioEfectivo * multiplicador),
    };
  });

  return { items, recargoTarjeta };
};


const construirPayloadTicket = (items, recargoTarjeta, { id_remito = null, fecha = new Date() } = {}) => {
  const lineas = items.map((item) => ({
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_efectivo: item.precio_efectivo,
    precio_tarjeta: item.precio_tarjeta,
    subtotal_efectivo: item.precio_efectivo * item.cantidad,
    subtotal_tarjeta: item.precio_tarjeta * item.cantidad,
  }));

  return {
    tipo: 'remito',
    id_remito,
    fecha: formatearFecha(fecha),
    recargo_tarjeta: recargoTarjeta,
    total_efectivo: lineas.reduce((acumulado, linea) => acumulado + linea.subtotal_efectivo, 0),
    total_tarjeta: lineas.reduce((acumulado, linea) => acumulado + linea.subtotal_tarjeta, 0),
    items: lineas,
  };
};

// Historial: todo MENOS los pendientes de cobro, que viven en la pagina de Ventas.
app.get('/api/remitos', async (req, res) => {
  try {
    const remitos = await prisma.REMITOS.findMany({
      where: { NOT: { id_estado: ESTADO_CONFIRMADO } },
      include: remitosInclude,
      orderBy: { id_remito: 'desc' },
    });
    res.status(200).json(remitos);
  } catch (error) {
    console.error('Error al obtener los remitos:', error);
    res.status(500).json({ message: 'Error al obtener los remitos.', details: error.message });
  }
});

// Remitos confirmados que todavia no se cobraron.
app.get('/api/remitos/pendientes', async (req, res) => {
  try {
    const remitos = await prisma.REMITOS.findMany({
      where: { id_estado: ESTADO_CONFIRMADO },
      include: remitosInclude,
      orderBy: { id_remito: 'desc' },
    });
    res.status(200).json(remitos);
  } catch (error) {
    console.error('Error al obtener los remitos pendientes:', error);
    res.status(500).json({ message: 'Error al obtener los remitos pendientes.', details: error.message });
  }
});

// Registra la venta como CONFIRMADA (pendiente de cobro) con los precios en
// efectivo, e imprime el ticket salvo que se pida `imprimir: false`.
// El metodo de pago se elige despues, al facturar.
app.post('/api/remitos', async (req, res) => {
  try {
    const { error, items, recargoTarjeta } = await resolverItemsVenta(req.body.detalles);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const detallesData = items.map((item) => ({
      id_articulo: item.id_articulo,
      precio: item.precio_efectivo,
      cantidad: item.cantidad,
    }));

    const totalVenta = detallesData.reduce((acumulado, d) => acumulado + d.precio * d.cantidad, 0);
    const ahora = new Date();

    const nuevoRemito = await prisma.REMITOS.create({
      data: {
        fecha_de_emision: ahora,
        fecha_de_creacion: ahora,
        id_estado: ESTADO_CONFIRMADO,
        total_bruto: totalVenta,
        total_neto: totalVenta,
        DETALLES_REMITO: {
          create: detallesData,
        },
      },
      include: remitosInclude,
    });

    // La venta ya quedo guardada: si falla la impresion no se revierte, se avisa
    // en la respuesta. Ahora el ticket si lleva el numero de remito.
    let impresion = { status: 'omitida' };
    if (req.body.imprimir !== false) {
      impresion = { status: 'ok' };
      try {
        const { respuesta, resultado } = await enviarTrabajoDeImpresion(
          construirPayloadTicket(items, recargoTarjeta, {
            id_remito: nuevoRemito.id_remito,
            fecha: nuevoRemito.fecha_de_emision,
          })
        );

        if (!respuesta.ok || resultado.status === 'error') {
          throw new Error(resultado.message ?? resultado.detail ?? 'No se pudo imprimir el remito.');
        }
      } catch (errorImpresion) {
        console.error('Error al imprimir el remito:', errorImpresion);
        impresion = { status: 'error', message: errorImpresion.message };
      }
    }

    res.status(201).json({ ...nuevoRemito, impresion });
  } catch (error) {
    console.error('Error al crear la venta:', error);
    res.status(500).json({ message: 'Error al crear la venta.', details: error.message });
  }
});

// Busca un remito y valida que siga pendiente de cobro.
const buscarRemitoPendiente = async (idParam) => {
  const id_remito = parseInt(idParam, 10);
  if (Number.isNaN(id_remito)) {
    return { error: { status: 400, message: 'El id del remito debe ser un numero.' } };
  }

  const remito = await prisma.REMITOS.findUnique({
    where: { id_remito },
    include: remitosInclude,
  });

  if (!remito) {
    return { error: { status: 404, message: 'El remito no existe.' } };
  }
  if (remito.id_estado !== ESTADO_CONFIRMADO) {
    return {
      error: { status: 409, message: 'El remito ya no esta pendiente: no se puede modificar.' },
    };
  }

  return { remito };
};

// Precios en efectivo (los guardados) y en tarjeta para cada linea del remito.
// La base es el precio YA GUARDADO, no el del catalogo: el remito se confirmo a
// ese precio aunque el articulo haya cambiado despues.
const opcionesDePagoDeRemito = async (remito) => {
  const recargoTarjeta = await obtenerRecargoTarjeta();
  const multiplicador = 1 + recargoTarjeta / 100;

  const items = remito.DETALLES_REMITO.map((detalle) => {
    const precioEfectivo = detalle.precio ?? 0;

    return {
      id_detalle: detalle.id_detalle,
      descripcion: detalle.ARTICULOS?.descripcion ?? `Articulo ${detalle.id_articulo}`,
      cantidad: detalle.cantidad ?? 0,
      precio_efectivo: precioEfectivo,
      precio_tarjeta: redondearPrecio(precioEfectivo * multiplicador),
    };
  });

  return { items, recargo_tarjeta: recargoTarjeta };
};

// Opciones de pago de un remito pendiente, para poblar el modal de cobro.
app.get('/api/remitos/:id_remito/opciones-pago', async (req, res) => {
  try {
    const { error, remito } = await buscarRemitoPendiente(req.params.id_remito);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    res.status(200).json(await opcionesDePagoDeRemito(remito));
  } catch (error) {
    console.error('Error al obtener las opciones de pago:', error);
    res.status(500).json({ message: 'Error al obtener las opciones de pago.', details: error.message });
  }
});

// Cobra un remito pendiente: fija el precio de cada linea segun su metodo de
// pago, recalcula el total y lo pasa a FACTURADO.
app.put('/api/remitos/:id_remito/facturar', async (req, res) => {
  try {
    const { error, remito } = await buscarRemitoPendiente(req.params.id_remito);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const { pagos } = req.body;
    if (!Array.isArray(pagos)) {
      return res.status(400).json({ message: 'Falta el detalle de como se paga cada articulo.' });
    }

    const metodosPorDetalle = new Map();
    for (const pago of pagos) {
      const id_detalle = parseInt(pago.id_detalle, 10);
      const metodo = pago.metodo_pago ?? 'efectivo';

      if (Number.isNaN(id_detalle)) {
        return res.status(400).json({ message: 'Los detalles del pago son invalidos.' });
      }
      if (!METODOS_DE_PAGO.includes(metodo)) {
        return res.status(400).json({ message: `Metodo de pago invalido: "${metodo}".` });
      }

      metodosPorDetalle.set(id_detalle, metodo);
    }

    const { items } = await opcionesDePagoDeRemito(remito);

    const preciosFinales = items.map((item) => ({
      id_detalle: item.id_detalle,
      precio:
        metodosPorDetalle.get(item.id_detalle) === 'tarjeta'
          ? item.precio_tarjeta
          : item.precio_efectivo,
      cantidad: item.cantidad,
    }));

    const totalVenta = preciosFinales.reduce(
      (acumulado, linea) => acumulado + linea.precio * linea.cantidad,
      0
    );

    // Todo junto: si algo falla no queda un remito a medio cobrar.
    const remitoFacturado = await prisma.$transaction(async (tx) => {
      await Promise.all(
        preciosFinales.map((linea) =>
          tx.DETALLES_REMITO.update({
            where: { id_detalle: linea.id_detalle },
            data: { precio: linea.precio },
          })
        )
      );

      return tx.REMITOS.update({
        where: { id_remito: remito.id_remito },
        data: {
          id_estado: ESTADO_FACTURADO,
          total_bruto: totalVenta,
          total_neto: totalVenta,
        },
        include: remitosInclude,
      });
    });

    res.status(200).json(remitoFacturado);
  } catch (error) {
    console.error('Error al facturar el remito:', error);
    res.status(500).json({ message: 'Error al facturar el remito.', details: error.message });
  }
});

// Anula un remito pendiente (no se borra: queda registrado como ANULADO).
app.put('/api/remitos/:id_remito/anular', async (req, res) => {
  try {
    const { error, remito } = await buscarRemitoPendiente(req.params.id_remito);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const remitoAnulado = await prisma.REMITOS.update({
      where: { id_remito: remito.id_remito },
      data: { id_estado: ESTADO_ANULADO },
      include: remitosInclude,
    });

    res.status(200).json(remitoAnulado);
  } catch (error) {
    console.error('Error al anular el remito:', error);
    res.status(500).json({ message: 'Error al anular el remito.', details: error.message });
  }
});

const enviarTrabajoDeImpresion = async (payload) => {
  const respuesta = await fetch(`${PRINT_SERVICE_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });

  const resultado = await respuesta.json().catch(() => ({}));
  return { respuesta, resultado };
};

app.post('/api/print', async (req, res) => {
  try {
    const id_articulo = parseInt(req.body.id_articulo, 10);
    const cantidad = parseInt(req.body.cantidad, 10) || 1;
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const articulo = await prisma.ARTICULOS.findUnique({ where: { id_articulo } });
    if (!articulo) {
      return res.status(404).json({ message: 'El articulo no existe.' });
    }

    const { respuesta: printResponse, resultado: printResult } = await enviarTrabajoDeImpresion({
      tipo: 'barcode',
      id_articulo: articulo.id_articulo,
      barcode_header: articulo.barcode_header,
      barcode_tail: articulo.barcode_tail,
      descripcion: articulo.descripcion,
      precio: articulo.precio,
      talle: articulo.talle,
      cantidad,
    });

    if (!printResponse.ok) {
      return res.status(printResponse.status).json(printResult);
    }
    res.status(200).json(printResult);
  } catch (error) {
    console.error('Error al enviar el trabajo de impresion:', error);
    res.status(500).json({ message: 'Error al enviar el trabajo de impresion.', details: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Servidor Express corriendo correctamente.');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto http://localhost:${PORT}`);
});