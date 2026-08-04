const express = require('express');
const cors = require('cors');
const prisma = require('./db');
require('dotenv').config();

const app = express();
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

// Asignar un articulo a un SUBGRUPO: el subgrupo pertenece a un grupo de
// venta puntual, asi que se marca una fila existente de ese grupo que no
// tenga subgrupo; si no hay ninguna, se crea una fila nueva usando el grupo
// del subgrupo (mismo patron que la asignacion de clientes).
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

    const filasMarcadas = await prisma.ARTICULOS_X_GRUPO_VENTA.updateMany({
      where: { id_articulo, id_grupo_venta: subgrupo.id_grupo, id_subgrupo: null },
      data: { id_subgrupo },
    });

    if (filasMarcadas.count === 0) {
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

  const tiposDePago = await prisma.TIPOS_DE_PAGO.findMany();
  const tarjeta = tiposDePago.find((tipo) =>
    (tipo.nombre_tipo_de_pago ?? '').toLowerCase().includes('tarjeta')
  );

  if (!tarjeta) {
    console.warn('No se encontro un tipo de pago "Tarjeta": la venta se calcula sin recargo.');
  }

  const recargoTarjeta = tarjeta?.recargo ?? 0;
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

app.get('/api/remitos', async (req, res) => {
  try {
    const remitos = await prisma.REMITOS.findMany({
      include: remitosInclude,
      orderBy: { id_remito: 'desc' },
    });
    res.status(200).json(remitos);
  } catch (error) {
    console.error('Error al obtener los remitos:', error);
    res.status(500).json({ message: 'Error al obtener los remitos.', details: error.message });
  }
});

app.post('/api/remitos/preparar', async (req, res) => {
  try {
    const { error, items, recargoTarjeta } = await resolverItemsVenta(req.body.detalles);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    if (req.body.imprimir === false) {
      return res.status(200).json({
        items,
        recargo_tarjeta: recargoTarjeta,
        impresion: { status: 'omitida' },
      });
    }

    let impresion = { status: 'ok' };
    try {
      const { respuesta, resultado } = await enviarTrabajoDeImpresion(
        construirPayloadTicket(items, recargoTarjeta)
      );

      if (!respuesta.ok || resultado.status === 'error') {
        throw new Error(resultado.message ?? resultado.detail ?? 'No se pudo imprimir el remito.');
      }
    } catch (errorImpresion) {
      console.error('Error al imprimir el remito:', errorImpresion);
      impresion = { status: 'error', message: errorImpresion.message };
    }

    res.status(200).json({ items, recargo_tarjeta: recargoTarjeta, impresion });
  } catch (error) {
    console.error('Error al preparar la venta:', error);
    res.status(500).json({ message: 'Error al preparar la venta.', details: error.message });
  }
});

app.post('/api/remitos', async (req, res) => {
  try {
    const { error, items } = await resolverItemsVenta(req.body.detalles);
    if (error) {
      return res.status(error.status).json({ message: error.message });
    }

    const detallesData = items.map((item) => ({
      id_articulo: item.id_articulo,
      precio: item.metodo_pago === 'tarjeta' ? item.precio_tarjeta : item.precio_efectivo,
      cantidad: item.cantidad,
    }));

    const totalVenta = detallesData.reduce((acumulado, d) => acumulado + d.precio * d.cantidad, 0);
    const ahora = new Date();

    const nuevoRemito = await prisma.REMITOS.create({
      data: {
        fecha_de_emision: ahora,
        fecha_de_creacion: ahora,
        total_bruto: totalVenta,
        total_neto: totalVenta,
        DETALLES_REMITO: {
          create: detallesData,
        },
      },
      include: remitosInclude,
    });

    res.status(201).json(nuevoRemito);
  } catch (error) {
    console.error('Error al crear la venta:', error);
    res.status(500).json({ message: 'Error al crear la venta.', details: error.message });
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
      barcode: articulo.barcode_tail,
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