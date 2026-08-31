const express = require('express');
const cors = require('cors');
const prisma = require('./db');
require('dotenv').config();

const authModule = import('./auth.mjs');

const app = express();
app.set('trust proxy', true); // necesario para que Auth.js detecte https detrás de ngrok/un proxy
const PORT = process.env.PORT || 5000;

// En produccion el frontend y la API viven en el mismo origen (nginx sirve el
// build y proxea /api y /auth), asi que CORS no hace falta. Se deja restringido
// al dominio propio; sin AUTH_URL (desarrollo local) mantiene el comportamiento
// permisivo de siempre.
app.use(cors({ origin: process.env.AUTH_URL ?? true, credentials: true }));

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
//  ROUTERS POR DOMINIO (ver routes/)
// ============================================================
app.use('/api/venta', require('./routes/venta'));
app.use('/api/tipos-de-pago', require('./routes/tiposDePago'));
app.use('/api/remitos', require('./routes/remitos'));
app.use('/api/print', require('./routes/print'));
app.use('/api/articulos', require('./routes/articulos'));
app.use('/api/grupos', require('./routes/grupos'));
app.use('/api/subgrupos', require('./routes/subgrupos'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/lineas', require('./routes/lineas'));
app.use('/api/precios', require('./routes/precios'));
app.use('/api', require('./routes/asociaciones'));


app.get('/', (req, res) => {
  res.send('Servidor Express corriendo correctamente.');
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Servidor corriendo en el puerto http://localhost:${PORT}`);
});