// Tests de services/impresoras.js
//
// QUE REGLA PROTEGEN: a que impresora va un trabajo lo decide SIEMPRE el
// servidor. El frontend esconde el selector a los empleados, pero eso es
// cosmetico: si un empleado manda `id_impresora` a mano en el body, el trabajo
// tiene que salir igual por la impresora predeterminada. Sin este test, "el
// empleado no elige impresora" seria una regla que solo existe en la UI.
//
// El resto de los casos fijan el orden de resolucion (elegida > asignada >
// predeterminada) y que una impresora desactivada nunca sea destino: un ticket
// que sale por la impresora equivocada es peor que uno que no sale, porque
// nadie se entera.
const test = require('node:test');
const assert = require('node:assert/strict');

const { resolverImpresora, generarToken, hashToken } = require('../services/impresoras');

const MOSTRADOR = { id_impresora: 1, nombre: 'Mostrador', es_predeterminada: true };
const DEPOSITO = { id_impresora: 2, nombre: 'Deposito', es_predeterminada: false };
const ACTIVAS = [MOSTRADOR, DEPOSITO];

test('un empleado NO elige impresora aunque mande el id en el body', () => {
  const resultado = resolverImpresora({
    rol: 'empleado',
    idPedido: DEPOSITO.id_impresora,
    activas: ACTIVAS,
  });

  // No es un 403: el id se ignora en silencio y el trabajo sale por la
  // predeterminada. Devolver un error le confirmaria al que prueba que el
  // parametro existe.
  assert.deepEqual(resultado, { id_impresora: MOSTRADOR.id_impresora });
});

test('un empleado con impresora asignada tampoco la usa: va a la predeterminada', () => {
  // La asignacion es una comodidad para los admins; el empleado imprime donde
  // dice la configuracion global.
  const resultado = resolverImpresora({
    rol: 'empleado',
    idAsignada: DEPOSITO.id_impresora,
    activas: ACTIVAS,
  });

  assert.deepEqual(resultado, { id_impresora: MOSTRADOR.id_impresora });
});

test('un admin elige la impresora que pide', () => {
  const resultado = resolverImpresora({
    rol: 'admin',
    idPedido: DEPOSITO.id_impresora,
    activas: ACTIVAS,
  });

  assert.deepEqual(resultado, { id_impresora: DEPOSITO.id_impresora });
});

test('un superadmin tambien elige', () => {
  const resultado = resolverImpresora({
    rol: 'superadmin',
    idPedido: DEPOSITO.id_impresora,
    activas: ACTIVAS,
  });

  assert.deepEqual(resultado, { id_impresora: DEPOSITO.id_impresora });
});

test('un admin que pide una impresora inexistente o desactivada recibe 400', () => {
  const inexistente = resolverImpresora({ rol: 'admin', idPedido: 99, activas: ACTIVAS });
  assert.equal(inexistente.error.status, 400);
  assert.equal(inexistente.id_impresora, undefined);

  // Una desactivada no esta en `activas`: mismo camino, mismo error.
  const desactivada = resolverImpresora({
    rol: 'admin',
    idPedido: DEPOSITO.id_impresora,
    activas: [MOSTRADOR],
  });
  assert.equal(desactivada.error.status, 400);
});

test('un admin sin eleccion usa su impresora asignada', () => {
  const resultado = resolverImpresora({
    rol: 'admin',
    idAsignada: DEPOSITO.id_impresora,
    activas: ACTIVAS,
  });

  assert.deepEqual(resultado, { id_impresora: DEPOSITO.id_impresora });
});

test('un admin con la impresora asignada desactivada cae a la predeterminada, sin error', () => {
  // Desactivar una impresora no puede dejar sin imprimir a quien la tenia
  // asignada: es un cambio de configuracion, no un error del que vende.
  const resultado = resolverImpresora({
    rol: 'admin',
    idAsignada: DEPOSITO.id_impresora,
    activas: [MOSTRADOR],
  });

  assert.deepEqual(resultado, { id_impresora: MOSTRADOR.id_impresora });
});

test('sin ninguna impresora activa devuelve 409', () => {
  const resultado = resolverImpresora({ rol: 'admin', activas: [] });
  assert.equal(resultado.error.status, 409);
});

test('con impresoras activas pero ninguna predeterminada devuelve 409', () => {
  // El indice parcial de la base y el ABM lo hacen imposible, pero si alguna vez
  // pasa hay que avisarlo, no elegir una cualquiera.
  const resultado = resolverImpresora({ rol: 'empleado', activas: [DEPOSITO] });
  assert.equal(resultado.error.status, 409);
});

test('hashToken es determinista y devuelve 64 hex', () => {
  const hash = hashToken('token-de-prueba');
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, hashToken('token-de-prueba'));
  assert.notEqual(hash, hashToken('token-de-prueba '));
});

test('generarToken no repite valores', () => {
  const tokens = new Set(Array.from({ length: 100 }, () => generarToken()));
  assert.equal(tokens.size, 100);
});
