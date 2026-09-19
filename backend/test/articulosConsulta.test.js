// Tests de lib/articulosConsulta.js — foco en los presets de "stock bajo" /
// "stock normal" del filtro de Cantidad (el resto del modulo se ejercita en
// integracion via la ruta de articulos). Protege que `extra` en el filtro de
// rango de "cant" es la UNICA columna que lo admite, y que la condicion SQL
// que genera es la MISMA regla que stockBajo() en
// frontend/src/features/articulos/stockBajo.ts (minimo configurado > 0 Y
// cantidad por debajo): si diverge, el preset del filtro deja de coincidir
// con las filas que la tabla pinta en rojo.
const test = require('node:test');
const assert = require('node:assert/strict');

const { parsearConsultaArticulos, construirWhere } = require('../lib/articulosConsulta');
const { HttpError } = require('../lib/http');

const consulta = (filtrosCrudos) => parsearConsultaArticulos({ filtros: JSON.stringify(filtrosCrudos) });
const where = (filtrosCrudos) => construirWhere(consulta(filtrosCrudos));

test('parsearConsultaArticulos rechaza "extra" en una columna que no lo admite', () => {
  assert.throws(
    () => consulta({ precio: { tipo: 'rango', desde: null, hasta: null, extra: 'bajo' } }),
    (error) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      return true;
    }
  );
});

test('parsearConsultaArticulos rechaza un valor de "extra" que no esta en la lista blanca de "cant"', () => {
  assert.throws(
    () => consulta({ cant: { tipo: 'rango', desde: null, hasta: null, extra: 'lo-que-sea' } }),
    (error) => error instanceof HttpError && error.status === 400
  );
});

test('"extra: bajo" en Cantidad arma minimo configurado Y cantidad por debajo', () => {
  const resultado = where({ cant: { tipo: 'rango', desde: null, hasta: null, extra: 'bajo' } });
  assert.match(resultado.sql, /a\.stock_minimo > 0 AND a\.cant < a\.stock_minimo/);
  assert.doesNotMatch(resultado.sql, /NOT \(/);
});

test('"extra: normal" es la negacion exacta de "bajo"', () => {
  const resultado = where({ cant: { tipo: 'rango', desde: null, hasta: null, extra: 'normal' } });
  assert.match(resultado.sql, /NOT \(a\.stock_minimo > 0 AND a\.cant < a\.stock_minimo\)/);
});

test('"extra" se combina con AND si tambien hay rango numerico', () => {
  const resultado = where({ cant: { tipo: 'rango', desde: 1, hasta: 10, extra: 'bajo' } });
  assert.match(resultado.sql, /a\.cant >= .*::numeric.*a\.cant <= .*::numeric/s);
  assert.match(resultado.sql, /a\.stock_minimo > 0 AND a\.cant < a\.stock_minimo/);
  assert.deepEqual(resultado.values, [1, 10]);
});

test('sin "extra", el filtro de Cantidad queda igual que antes (solo el rango numerico)', () => {
  const resultado = where({ cant: { tipo: 'rango', desde: 5, hasta: null } });
  assert.equal(resultado.sql, '(a.cant >= ?::numeric)');
  assert.deepEqual(resultado.values, [5]);
});
