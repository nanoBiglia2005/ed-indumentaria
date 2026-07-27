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

// Relaciones que se incluyen al consultar ARTICULOS.
// Fuente unica del lado del backend (debe reflejar el de backend/types.ts).
const articulosInclude = {
  COLORES: true,
  TALLES: true,
  TIPOS_DE_MEDIDA: true,
  PROVEEDORES: true,
};

// Obtener TODOS los articulos
app.get('/api/articulos', async (req, res) => {
  try {
    const articulos = await prisma.ARTICULOS.findMany({
      include: articulosInclude,
    });
    res.status(200).json(articulos);
  } catch (error) {
    console.error('Error al obtener los articulos:', error);
    res.status(500).json({ message: 'Error al obtener los articulos.', details: error.message });
  }
});

// Obtener articulos segun su GRUPO (via ARTICULOS_X_GRUPO_VENTA_alt)
app.get('/api/articulos/grupo/:id_grupo', async (req, res) => {
  try {
    const id_grupo = parseInt(req.params.id_grupo, 10);
    if (Number.isNaN(id_grupo)) {
      return res.status(400).json({ message: 'El id del grupo debe ser un numero.' });
    }

    const articulos = await prisma.ARTICULOS.findMany({
      where: {
        ARTICULOS_X_GRUPO_VENTA_alt: {
          some: { id_grupo_venta: id_grupo },
        },
      },
      include: {
        ...articulosInclude,
        ARTICULOS_X_GRUPO_VENTA_alt: {
          where: { id_grupo_venta: id_grupo },
          include: { GRUPOS_DE_VENTA: true },
        },
      },
    });
    res.status(200).json(articulos);
  } catch (error) {
    console.error('Error al obtener los articulos por grupo:', error);
    res.status(500).json({ message: 'Error al obtener los articulos por grupo.', details: error.message });
  }
});

// Obtener articulos segun su CLIENTE (via ARTICULOS_X_CLIENTES)
app.get('/api/articulos/cliente/:id_cliente', async (req, res) => {
  try {
    const id_cliente = parseInt(req.params.id_cliente, 10);
    if (Number.isNaN(id_cliente)) {
      return res.status(400).json({ message: 'El id del cliente debe ser un numero.' });
    }

    const articulos = await prisma.ARTICULOS.findMany({
      where: {
        ARTICULOS_X_CLIENTES: {
          some: { id_cliente },
        },
      },
      include: {
        ...articulosInclude,
        ARTICULOS_X_CLIENTES: {
          where: { id_cliente },
          include: { CLIENTES: true },
        },
      },
    });
    res.status(200).json(articulos);
  } catch (error) {
    console.error('Error al obtener los articulos por cliente:', error);
    res.status(500).json({ message: 'Error al obtener los articulos por cliente.', details: error.message });
  }
});

// Crear un nuevo articulo (tabla ARTICULOS)
app.post('/api/articulos', async (req, res) => {
  try {
    const {
      cant,
      precio,
      barcode,
      stock_minimo,
      vigente,
      id_medida,
      id_color,
      id_talle,
      cant_reservada,
    } = req.body;

    const nuevoArticulo = await prisma.ARTICULOS.create({
      data: {
        cant,
        precio,
        barcode,
        stock_minimo,
        vigente,
        id_medida,
        id_color,
        id_talle,
        cant_reservada,
      },
      include: articulosInclude,
    });
    res.status(201).json(nuevoArticulo);
  } catch (error) {
    console.error('Error al crear el articulo:', error);
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
      barcode,
      stock_minimo,
      id_color,
      id_talle,
      cant_reservada,
      descripcion,
    } = req.body;

    const articuloActualizado = await prisma.ARTICULOS.update({
      where: { id_articulo },
      data: {
        cant,
        precio,
        barcode,
        stock_minimo,
        id_color,
        id_talle,
        cant_reservada,
        descripcion,
      },
      include: articulosInclude,
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

// Asignar un articulo a un GRUPO (tabla ARTICULOS_X_GRUPO_VENTA_alt)
app.post('/api/articulos/:id_articulo/grupos', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const { id_grupo } = req.body;

    const asignacion = await prisma.ARTICULOS_X_GRUPO_VENTA_alt.create({
      data: { id_articulo, id_grupo_venta: id_grupo },
    });
    res.status(201).json(asignacion);
  } catch (error) {
    console.error('Error al asignar el articulo al grupo:', error);
    res.status(500).json({ message: 'Error al asignar el articulo al grupo.', details: error.message });
  }
});

// Asignar un articulo a un CLIENTE (tabla ARTICULOS_X_CLIENTES)
app.post('/api/articulos/:id_articulo/clientes', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const { id_cliente, descripcion } = req.body;

    const asignacion = await prisma.ARTICULOS_X_CLIENTES.create({
      data: { id_articulo, id_cliente, descripcion },
    });
    res.status(201).json(asignacion);
  } catch (error) {
    console.error('Error al asignar el articulo al cliente:', error);
    res.status(500).json({ message: 'Error al asignar el articulo al cliente.', details: error.message });
  }
});

// Quitar un articulo de un GRUPO (tabla ARTICULOS_X_GRUPO_VENTA_alt)
app.delete('/api/articulos/:id_articulo/grupos/:id_grupo', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    const id_grupo = parseInt(req.params.id_grupo, 10);
    if (Number.isNaN(id_articulo) || Number.isNaN(id_grupo)) {
      return res.status(400).json({ message: 'El id del articulo y del grupo deben ser numeros.' });
    }

    await prisma.ARTICULOS_X_GRUPO_VENTA_alt.deleteMany({
      where: { id_articulo, id_grupo_venta: id_grupo },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error al quitar el articulo del grupo:', error);
    res.status(500).json({ message: 'Error al quitar el articulo del grupo.', details: error.message });
  }
});

// Quitar un articulo de un CLIENTE (tabla ARTICULOS_X_CLIENTES)
app.delete('/api/articulos/:id_articulo/clientes/:id_cliente', async (req, res) => {
  try {
    const id_articulo = parseInt(req.params.id_articulo, 10);
    const id_cliente = parseInt(req.params.id_cliente, 10);
    if (Number.isNaN(id_articulo) || Number.isNaN(id_cliente)) {
      return res.status(400).json({ message: 'El id del articulo y del cliente deben ser numeros.' });
    }

    await prisma.ARTICULOS_X_CLIENTES.deleteMany({
      where: { id_articulo, id_cliente },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error al quitar el articulo del cliente:', error);
    res.status(500).json({ message: 'Error al quitar el articulo del cliente.', details: error.message });
  }
});

// Obtener TODOS los registros de ARTICULOS_X_GRUPO_VENTA_alt (para filtrar en el frontend)
app.get('/api/articulos-x-grupo', async (req, res) => {
  try {
    const registros = await prisma.ARTICULOS_X_GRUPO_VENTA_alt.findMany();
    res.status(200).json(registros);
  } catch (error) {
    console.error('Error al obtener ARTICULOS_X_GRUPO_VENTA_alt:', error);
    res.status(500).json({ message: 'Error al obtener ARTICULOS_X_GRUPO_VENTA_alt.', details: error.message });
  }
});

// Obtener TODOS los registros de ARTICULOS_X_CLIENTES (para filtrar en el frontend)
app.get('/api/articulos-x-clientes', async (req, res) => {
  try {
    const registros = await prisma.ARTICULOS_X_CLIENTES.findMany();
    res.status(200).json(registros);
  } catch (error) {
    console.error('Error al obtener ARTICULOS_X_CLIENTES:', error);
    res.status(500).json({ message: 'Error al obtener ARTICULOS_X_CLIENTES.', details: error.message });
  }
});

// ============================================================
//  GRUPOS DE VENTA
// ============================================================

// Obtener TODOS los grupos de venta (para poblar el dropdown)
app.get('/api/grupos', async (req, res) => {
  try {
    const grupos = await prisma.GRUPOS_DE_VENTA.findMany();
    res.status(200).json(grupos);
  } catch (error) {
    console.error('Error al obtener los grupos de articulos:', error);
    res.status(500).json({ message: 'Error al obtener los grupos de articulos.', details: error.message });
  }
});

// Crear un nuevo grupo de venta (tabla GRUPOS_DE_VENTA)
app.post('/api/grupos', async (req, res) => {
  try {
    const { nombre_grupo, tipo_grupo } = req.body;

    const nuevoGrupo = await prisma.GRUPOS_DE_VENTA.create({
      data: { nombre_grupo, tipo_grupo },
    });
    res.status(201).json(nuevoGrupo);
  } catch (error) {
    console.error('Error al crear el grupo de articulos:', error);
    res.status(500).json({ message: 'Error al crear el grupo de articulos.', details: error.message });
  }
});

// Obtener TODOS los subgrupos de venta (para filtrar en el frontend)
app.get('/api/subgrupos', async (req, res) => {
  try {
    const subgrupos = await prisma.SUBGRUPOS_DE_VENTA_alt.findMany();
    res.status(200).json(subgrupos);
  } catch (error) {
    console.error('Error al obtener los subgrupos de venta:', error);
    res.status(500).json({ message: 'Error al obtener los subgrupos de venta.', details: error.message });
  }
});

// ============================================================
//  TALLES
// ============================================================

// Obtener TODOS los talles (para poblar el dropdown)
app.get('/api/talles', async (req, res) => {
  try {
    const talles = await prisma.TALLES.findMany();
    res.status(200).json(talles);
  } catch (error) {
    console.error('Error al obtener los talles:', error);
    res.status(500).json({ message: 'Error al obtener los talles.', details: error.message });
  }
});

// ============================================================
//  COLORES
// ============================================================

// Obtener TODOS los colores (para poblar el dropdown)
app.get('/api/colores', async (req, res) => {
  try {
    const colores = await prisma.COLORES.findMany();
    res.status(200).json(colores);
  } catch (error) {
    console.error('Error al obtener los colores:', error);
    res.status(500).json({ message: 'Error al obtener los colores.', details: error.message });
  }
});

// ============================================================
//  CLIENTES
// ============================================================

// Obtener TODOS los clientes (para poblar el dropdown)
app.get('/api/clientes', async (req, res) => {
  try {
    const clientes = await prisma.CLIENTES.findMany();
    res.status(200).json(clientes);
  } catch (error) {
    console.error('Error al obtener los clientes:', error);
    res.status(500).json({ message: 'Error al obtener los clientes.', details: error.message });
  }
});

// Crear un nuevo cliente (tabla CLIENTES)
app.post('/api/clientes', async (req, res) => {
  try {
    const { nombre, id_grupo } = req.body;

    if (!nombre) {
      return res.status(400).json({ message: 'El campo "nombre" es obligatorio.' });
    }

    const nuevoCliente = await prisma.CLIENTES.create({
      data: { nombre, id_grupo },
    });
    res.status(201).json(nuevoCliente);
  } catch (error) {
    console.error('Error al crear el cliente:', error);
    res.status(500).json({ message: 'Error al crear el cliente.', details: error.message });
  }
});

// ============================================================
//  IMPRESION
// ============================================================

// Envia un articulo a imprimir en la impresora local del cliente (via print-service)
app.post('/api/print', async (req, res) => {
  try {
    const id_articulo = parseInt(req.body.id_articulo, 10);
    const cantidad = parseInt(req.body.cantidad, 10) || 1;
    if (Number.isNaN(id_articulo)) {
      return res.status(400).json({ message: 'El id del articulo debe ser un numero.' });
    }

    const articulo = await prisma.ARTICULOS.findUnique({
      where: { id_articulo },
      include: articulosInclude,
    });
    if (!articulo) {
      return res.status(404).json({ message: 'El articulo no existe.' });
    }

    const printResponse = await fetch(`${PRINT_SERVICE_URL}/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload: {
          id_articulo: articulo.id_articulo,
          barcode: articulo.barcode,
          descripcion: articulo.descripcion,
          precio: articulo.precio,
          talle: articulo.TALLES?.nombre_talle,
          color: articulo.COLORES?.nombre_color,
          cantidad,
        },
      }),
    });

    const printResult = await printResponse.json();
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