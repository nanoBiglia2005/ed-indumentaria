// Tests de lib/roles.js — autorizacion por rol.
//
// La regla que protegen: el rol se lee SIEMPRE de la sesion del servidor, nunca
// de un header ni del body (roles.js:5-7). El frontend esconde las secciones que
// no corresponden, pero eso es cosmetico: la API tiene que negarse igual si
// alguien la llama a mano.
const test = require('node:test');
const assert = require('node:assert/strict');

const { requireRol } = require('../lib/roles');

const contexto = ({ rol, headers = {}, body = {} } = {}) => {
  const capturado = { status: null, body: null, siguio: false };
  const req = { headers, body };
  const res = {
    locals: { session: rol === undefined ? undefined : { user: { rol } } },
    status(codigo) {
      capturado.status = codigo;
      return res;
    },
    json(cuerpo) {
      capturado.body = cuerpo;
      return res;
    },
  };
  const next = () => {
    capturado.siguio = true;
  };
  return { req, res, next, capturado };
};

test('requireRol deja pasar a un rol de la lista', () => {
  const { req, res, next, capturado } = contexto({ rol: 'admin' });

  requireRol('admin', 'superadmin')(req, res, next);

  assert.equal(capturado.siguio, true);
  assert.equal(capturado.status, null);
});

test('requireRol deja pasar a cualquiera de los roles permitidos', () => {
  const { req, res, next, capturado } = contexto({ rol: 'superadmin' });

  requireRol('admin', 'superadmin')(req, res, next);

  assert.equal(capturado.siguio, true);
});

test('requireRol responde 403 a un rol que no esta en la lista', () => {
  const { req, res, next, capturado } = contexto({ rol: 'empleado' });

  requireRol('admin', 'superadmin')(req, res, next);

  assert.equal(capturado.siguio, false);
  assert.equal(capturado.status, 403);
  assert.deepEqual(capturado.body, {
    message: 'No tenés permiso para acceder a esta sección.',
  });
});

test('requireRol responde 403 cuando no hay sesion', () => {
  const { req, res, next, capturado } = contexto();

  requireRol('admin')(req, res, next);

  assert.equal(capturado.siguio, false);
  assert.equal(capturado.status, 403);
});

test('requireRol responde 403 cuando la sesion no tiene rol', () => {
  const { req, res, next, capturado } = contexto({ rol: null });

  requireRol('admin')(req, res, next);

  assert.equal(capturado.siguio, false);
  assert.equal(capturado.status, 403);
});

test('requireRol IGNORA el rol que venga por header o por body', () => {
  // El intento de escalada mas obvio: mandar el rol a mano.
  const { req, res, next, capturado } = contexto({
    rol: 'empleado',
    headers: { 'x-rol': 'superadmin', rol: 'admin' },
    body: { rol: 'superadmin' },
  });

  requireRol('admin', 'superadmin')(req, res, next);

  assert.equal(capturado.siguio, false);
  assert.equal(capturado.status, 403);
});

test('requireRol distingue mayusculas: "Admin" no es "admin"', () => {
  const { req, res, next, capturado } = contexto({ rol: 'Admin' });

  requireRol('admin')(req, res, next);

  assert.equal(capturado.status, 403);
});
