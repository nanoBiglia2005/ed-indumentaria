// Tests de lib/validaciones.js
//
// aId() es el UNICO lugar donde se decide que es un id valido, y existe para
// arreglar un bug concreto documentado en validaciones.js:12-17: parseInt() leia
// el prefijo numerico y descartaba el resto, asi que "1;DROP" pasaba como 1 y
// "1.5" como 1. Estos tests fijan ese comportamiento.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  aId,
  parseId,
  parseIds,
  parseIdOpcional,
  normalizarNombre,
  assertNombreUnico,
} = require('../lib/validaciones');
const { HttpError } = require('../lib/http');

test('aId acepta enteros como numero y como string', () => {
  assert.equal(aId(42), 42);
  assert.equal(aId('42'), 42);
  assert.equal(aId(0), 0);
  assert.equal(aId('0'), 0);
  assert.equal(aId('007'), 7);
});

test('aId acepta espacios alrededor (llegan asi desde la URL)', () => {
  assert.equal(aId(' 42 '), 42);
});

test('aId acepta negativos porque ID_GRUPO_NO_ASIGNADO vale -1', () => {
  assert.equal(aId(-1), -1);
  assert.equal(aId('-1'), -1);
});

test('aId rechaza el prefijo numerico que parseInt aceptaba', () => {
  // El motivo por el que existe esta funcion.
  assert.equal(aId('1;DROP'), null);
  assert.equal(aId('1.5'), null);
  assert.equal(aId('42abc'), null);
  assert.equal(aId('12 34'), null);
});

test('aId rechaza numeros no enteros', () => {
  assert.equal(aId(1.5), null);
  assert.equal(aId(NaN), null);
  assert.equal(aId(Infinity), null);
  assert.equal(aId(-Infinity), null);
});

test('aId rechaza mas alla de 2^53, donde el id ya perdio digitos', () => {
  assert.equal(aId(String(Number.MAX_SAFE_INTEGER)), Number.MAX_SAFE_INTEGER);
  assert.equal(aId('9007199254740993'), null);
});

test('aId rechaza valores que no son ni numero ni string numerico', () => {
  assert.equal(aId(''), null);
  assert.equal(aId('   '), null);
  assert.equal(aId(null), null);
  assert.equal(aId(undefined), null);
  assert.equal(aId([]), null);
  assert.equal(aId({}), null);
  assert.equal(aId(true), null);
  assert.equal(aId('+1'), null);
});

test('parseId devuelve el id o lanza 400 con el mensaje de la ruta', () => {
  assert.equal(parseId('7', 'El id debe ser un numero.'), 7);

  assert.throws(
    () => parseId('no', 'El id del articulo debe ser un numero.'),
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      assert.deepEqual(error.body, { message: 'El id del articulo debe ser un numero.' });
      return true;
    }
  );
});

test('parseIds valida toda la lista y corta en el primero invalido', () => {
  assert.deepEqual(parseIds(['1', '2', '3'], 'mensaje'), [1, 2, 3]);
  assert.throws(() => parseIds(['1', 'x', '3'], 'mensaje'), HttpError);
});

test('parseIdOpcional trata ausente y vacio como "sin filtro"', () => {
  assert.equal(parseIdOpcional(undefined, 'm'), null);
  assert.equal(parseIdOpcional(null, 'm'), null);
  assert.equal(parseIdOpcional('', 'm'), null);
});

test('parseIdOpcional NO trata el cero como ausente', () => {
  // 0 es un id, no una ausencia: si esto cambia, un filtro por id 0 se ignora.
  assert.equal(parseIdOpcional(0, 'm'), 0);
  assert.equal(parseIdOpcional('0', 'm'), 0);
});

test('parseIdOpcional sigue rechazando lo invalido', () => {
  assert.throws(() => parseIdOpcional('1.5', 'mensaje'), HttpError);
});

test('normalizarNombre recorta strings y descarta cualquier otro tipo', () => {
  assert.equal(normalizarNombre('  Remera  '), 'Remera');
  assert.equal(normalizarNombre(''), '');
  assert.equal(normalizarNombre(42), '');
  assert.equal(normalizarNombre(null), '');
  assert.equal(normalizarNombre(undefined), '');
  assert.equal(normalizarNombre({}), '');
});

test('assertNombreUnico arma el filtro insensible a mayusculas y pasa si no hay duplicado', async () => {
  let filtroRecibido = null;
  const modelo = {
    findFirst: async ({ where }) => {
      filtroRecibido = where;
      return null;
    },
  };

  await assertNombreUnico(modelo, 'nombre_grupo', 'Verano', { mensaje: 'Ya existe.' });

  assert.deepEqual(filtroRecibido, {
    nombre_grupo: { equals: 'Verano', mode: 'insensitive' },
  });
});

test('assertNombreUnico combina el where extra y excluye la propia fila al editar', async () => {
  let filtroRecibido = null;
  const modelo = {
    findFirst: async ({ where }) => {
      filtroRecibido = where;
      return null;
    },
  };

  await assertNombreUnico(modelo, 'nombre_subgrupo', 'Chico', {
    mensaje: 'Ya existe.',
    where: { id_grupo: 3 },
    excluir: { campo: 'id_subgrupo', id: 9 },
  });

  assert.deepEqual(filtroRecibido, {
    id_grupo: 3,
    nombre_subgrupo: { equals: 'Chico', mode: 'insensitive' },
    id_subgrupo: { not: 9 },
  });
});

test('assertNombreUnico lanza 409 cuando el nombre ya existe', async () => {
  const modelo = { findFirst: async () => ({ id: 1 }) };

  await assert.rejects(
    () => assertNombreUnico(modelo, 'nombre_grupo', 'Verano', { mensaje: 'Ese grupo ya existe.' }),
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 409);
      assert.deepEqual(error.body, { message: 'Ese grupo ya existe.' });
      return true;
    }
  );
});
