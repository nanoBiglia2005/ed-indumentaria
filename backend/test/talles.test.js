// Tests de lib/talles.js — el orden de talles de las columnas del PDF "Stock por
// talle".
//
// QUE REGLA PROTEGE: es una COPIA de frontend/src/utils/talles.ts y este archivo
// repite su misma tabla de casos (frontend/src/utils/talles.test.ts). Si una de
// las dos implementaciones cambia sin la otra, el PDF ordena los talles distinto
// que la pantalla. La regla que se rompe facil: los vacios van SIEMPRE al final.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { valorOrdenTalle, compararTalles } = require('../lib/talles');

describe('valorOrdenTalle', () => {
  it('convierte a numero los talles numericos', () => {
    assert.equal(valorOrdenTalle('2'), 2);
    assert.equal(valorOrdenTalle('22'), 22);
    assert.equal(valorOrdenTalle(' 8 '), 8);
  });

  it('conserva el string cuando no es numerico', () => {
    assert.equal(valorOrdenTalle('S'), 'S');
    assert.equal(valorOrdenTalle('XL'), 'XL');
  });

  it('el cero es un talle numerico, no un vacio', () => {
    assert.equal(valorOrdenTalle('0'), 0);
  });

  it('trata como vacio el null y los espacios', () => {
    assert.equal(valorOrdenTalle(null), null);
    assert.equal(valorOrdenTalle(''), null);
    assert.equal(valorOrdenTalle('   '), null);
  });
});

describe('compararTalles', () => {
  it('ordena los numericos por valor, no alfabeticamente', () => {
    // El bug que evita: como string, "10" < "2".
    assert.ok(compararTalles('2', '10') < 0);
    assert.ok(compararTalles('10', '2') > 0);
    assert.equal(compararTalles('4', '4'), 0);
  });

  it('ordena los no numericos alfabeticamente', () => {
    assert.ok(compararTalles('L', 'S') < 0);
    assert.ok(compararTalles('S', 'L') > 0);
  });

  it('pone los vacios al final en AMBAS direcciones', () => {
    assert.ok(compararTalles(null, '2') > 0);
    assert.ok(compararTalles('2', null) < 0);
    assert.equal(compararTalles(null, null), 0);
    assert.ok(compararTalles('', 'S') > 0);
  });

  it('ordena una lista mezclada dejando los vacios al final', () => {
    const ordenados = ['10', null, 'S', '2', '', 'L'].sort(compararTalles);
    assert.deepEqual(ordenados, ['2', '10', 'L', 'S', null, '']);
  });
});
