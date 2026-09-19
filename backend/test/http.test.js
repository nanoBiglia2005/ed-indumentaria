// Tests de lib/http.js — el manejo de errores de TODAS las rutas.
//
// asyncHandler decide que ve el usuario cuando algo falla. Sus cuatro ramas
// (HttpError tal cual / codigo de Prisma mapeado / 500 generico / logueo)
// estan cubiertas aca.
const test = require('node:test');
const assert = require('node:assert/strict');

const { HttpError, asyncHandler, errorDeStock } = require('../lib/http');

/** `res` minimo que captura lo que el handler respondio. */
const resFalso = () => {
  const capturado = { status: null, body: null };
  const res = {
    status(codigo) {
      capturado.status = codigo;
      return res;
    },
    json(cuerpo) {
      capturado.body = cuerpo;
      return res;
    },
  };
  return { res, capturado };
};

/** Corre fn silenciando console.error y devuelve lo que se logueo. */
const sinRuido = async (fn) => {
  const original = console.error;
  const logueado = [];
  console.error = (...args) => logueado.push(args);
  try {
    await fn();
  } finally {
    console.error = original;
  }
  return logueado;
};

test('HttpError deriva el message del body', () => {
  const error = new HttpError(400, { message: 'Falta el nombre.' });
  assert.ok(error instanceof Error);
  assert.equal(error.status, 400);
  assert.equal(error.message, 'Falta el nombre.');
  assert.deepEqual(error.body, { message: 'Falta el nombre.' });
});

test('HttpError sin message en el body usa un texto por defecto', () => {
  assert.equal(new HttpError(500, {}).message, 'HttpError');
  assert.equal(new HttpError(500, null).message, 'HttpError');
});

test('asyncHandler deja pasar la respuesta cuando no hay error', async () => {
  const { res, capturado } = resFalso();
  const handler = asyncHandler(async (req, res) => res.status(200).json({ ok: true }), 'Error.');

  await handler({}, res);

  assert.equal(capturado.status, 200);
  assert.deepEqual(capturado.body, { ok: true });
});

test('asyncHandler responde un HttpError con su status y body exactos', async () => {
  const { res, capturado } = resFalso();
  const handler = asyncHandler(async () => {
    throw new HttpError(409, { message: 'Ese grupo ya existe.' });
  }, 'Error al crear el grupo.');

  const logueado = await sinRuido(() => handler({}, res));

  assert.equal(capturado.status, 409);
  assert.deepEqual(capturado.body, { message: 'Ese grupo ya existe.' });
  // Los errores esperados no ensucian los logs del servidor.
  assert.equal(logueado.length, 0);
});

test('asyncHandler mapea los codigos de Prisma al status de la ruta', async () => {
  const { res, capturado } = resFalso();
  const error = new Error('Record to delete does not exist.');
  error.code = 'P2025';

  const handler = asyncHandler(
    async () => {
      throw error;
    },
    'Error al eliminar el tipo de pago.',
    { errores: { P2025: { status: 404, message: 'El tipo de pago no existe.' } } }
  );

  await sinRuido(() => handler({}, res));

  // Sin el mapa esto seria un 500 y el usuario veria un error generico.
  assert.equal(capturado.status, 404);
  assert.deepEqual(capturado.body, {
    message: 'El tipo de pago no existe.',
    details: 'Record to delete does not exist.',
  });
});

test('asyncHandler responde 500 con el mensaje de la ruta ante un error inesperado', async () => {
  const { res, capturado } = resFalso();
  const handler = asyncHandler(async () => {
    throw new Error('boom');
  }, 'Error al obtener los articulos.');

  await sinRuido(() => handler({}, res));

  assert.equal(capturado.status, 500);
  assert.deepEqual(capturado.body, {
    message: 'Error al obtener los articulos.',
    details: 'boom',
  });
});

test('asyncHandler cae al 500 si el codigo del error no esta en el mapa', async () => {
  const { res, capturado } = resFalso();
  const error = new Error('violacion de clave foranea');
  error.code = 'P2003';

  const handler = asyncHandler(
    async () => {
      throw error;
    },
    'Error al eliminar.',
    { errores: { P2025: { status: 404, message: 'No existe.' } } }
  );

  await sinRuido(() => handler({}, res));

  assert.equal(capturado.status, 500);
});

test('asyncHandler loguea los errores inesperados derivando el texto del mensaje', async () => {
  const { res } = resFalso();
  const handler = asyncHandler(async () => {
    throw new Error('boom');
  }, 'Error al obtener los articulos.');

  const logueado = await sinRuido(() => handler({}, res));

  assert.equal(logueado.length, 1);
  // El punto final se quita para armar el prefijo del log.
  assert.equal(logueado[0][0], 'Error al obtener los articulos:');
});

test('asyncHandler usa el texto de `log` cuando la ruta lo especifica', async () => {
  const { res } = resFalso();
  const handler = asyncHandler(
    async () => {
      throw new Error('boom');
    },
    'Error al obtener los articulos.',
    { log: 'Fallo la consulta de articulos' }
  );

  const logueado = await sinRuido(() => handler({}, res));

  assert.equal(logueado[0][0], 'Fallo la consulta de articulos:');
});

// errorDeStock protege POST /remitos: cuando el trigger de stock de la base
// (fn_mover_stock, SQLSTATE ED001, ver
// prisma/migrations/20260919193941_flujo_de_stock_remitos/migration.sql)
// rechaza una venta por falta de stock, el error de Prisma NO puede llegar
// crudo al usuario ("Invalid `prisma.rEMITOS.create()` invocation..."). Este
// test fabrica el error con la MISMA forma que se observo corriendo
// `prisma.REMITOS.create()` contra la base local (con el driver adapter
// @prisma/adapter-pg que usa backend/db.js): PrismaClientKnownRequestError,
// code P2039, con el SQLSTATE y el mensaje real de Postgres colgados en
// `error.meta.driverAdapterError.cause`.
test('errorDeStock reconoce el error ED001 del trigger y devuelve el mensaje limpio', () => {
  const mensaje = 'No hay stock suficiente de "Buzo colegial ALEMAN 026": quedan 18 unidades.';
  const error = new Error(
    'Invalid `prisma.rEMITOS.create()` invocation:\n\n\nDatabase error. Code: `ED001`. Message: `' +
      mensaje +
      '`'
  );
  error.code = 'P2039';
  error.meta = {
    modelName: 'REMITOS',
    driverAdapterError: {
      name: 'DriverAdapterError',
      cause: {
        originalCode: 'ED001',
        originalMessage: mensaje,
        kind: 'postgres',
        code: 'ED001',
        severity: 'ERROR',
        message: mensaje,
      },
    },
  };

  assert.equal(errorDeStock(error), mensaje);
});

test('errorDeStock devuelve null ante cualquier otro error de Prisma', () => {
  const error = new Error('Record to delete does not exist.');
  error.code = 'P2025';

  assert.equal(errorDeStock(error), null);
  assert.equal(errorDeStock(new Error('boom')), null);
  assert.equal(errorDeStock(null), null);
});
