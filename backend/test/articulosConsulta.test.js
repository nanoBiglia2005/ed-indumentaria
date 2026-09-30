// Tests de lib/articulosConsulta.js — foco en los presets de "stock bajo" /
// "stock normal" del filtro de Cantidad (el resto del modulo se ejercita en
// integracion via la ruta de articulos). Protege que `extra` en el filtro de
// rango de "cant" es la UNICA columna que lo admite, y que la condicion SQL
// que genera es la MISMA regla que stockBajo() en
// frontend/src/features/articulos/stockBajo.ts (minimo configurado > 0 Y
// cantidad por debajo): si diverge, el preset del filtro deja de coincidir
// con las filas que la tabla pinta en rojo.
//
// Tambien congela que el colegio/club es UN campo del articulo (ARTICULOS.id_cliente,
// como linea/grupo/subgrupo) y que ningun filtro vuelve a leer ARTICULOS_X_CLIENTE:
// esa tabla ya no existe, asi que una consulta que le apuntara fallaria en la base.
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

const whereDeConsulta = (query) => construirWhere(parsearConsultaArticulos(query));

test('el filtro por cliente puntual compara ARTICULOS.id_cliente, sin tabla intermedia', () => {
  const resultado = whereDeConsulta({ id_cliente: '7' });
  assert.match(resultado.sql, /a\.id_cliente = /);
  assert.doesNotMatch(resultado.sql, /ARTICULOS_X_CLIENTE/);
});

test('el filtro por agrupacion busca el grupo del cliente del articulo', () => {
  const resultado = whereDeConsulta({ id_agrupacion: '1' });
  assert.match(resultado.sql, /c\.id_cliente = a\.id_cliente/);
  assert.doesNotMatch(resultado.sql, /ARTICULOS_X_CLIENTE/);
});

test('exigir cliente (recorrido de venta) pide que el articulo tenga alguno', () => {
  const resultado = construirWhere({ ...parsearConsultaArticulos({}), exigeCliente: true });
  assert.match(resultado.sql, /a\.id_cliente IS NOT NULL/);
});

test('la columna Colegios/Clubes filtra por id y "Sin asignar" es id_cliente NULL', () => {
  const resultado = where({ colegios: { tipo: 'seleccion', ids: [4, -1] } });
  assert.match(resultado.sql, /a\.id_cliente IN \(/);
  assert.match(resultado.sql, /a\.id_cliente IS NULL/);
  assert.doesNotMatch(resultado.sql, /ARTICULOS_X_CLIENTE/);
});
