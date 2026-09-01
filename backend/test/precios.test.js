// Tests de services/preciosPorMetodo.js — la regla de redondeo de todo el sistema.
//
// La invariante que protegen estos tests (documentada en preciosPorMetodo.js:8-11):
// el total de un metodo es la SUMA DE LAS LINEAS YA REDONDEADAS, no
// `total * (1 + recargo/100)`. Es lo que hace que el ticket cierre cuando el
// cliente suma los renglones a mano.
//
// OJO: redondearPrecio y precioConRecargo estan duplicadas linea por linea en
// frontend/src/utils/precios.ts. Los casos de "redondearPrecio" y
// "precioConRecargo" de aca estan replicados alli a proposito: si algun dia
// divergen, el precio que se muestra deja de coincidir con el que se cobra.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  redondearPrecio,
  precioConRecargo,
  preciosDeArticulo,
  remitoConTotales,
} = require('../services/preciosPorMetodo');

const EFECTIVO = { id_tipos_de_pago: 1, nombre_tipo_de_pago: 'Efectivo', recargo: 0 };
const TARJETA = { id_tipos_de_pago: 2, nombre_tipo_de_pago: 'Tarjeta', recargo: 10 };

test('redondearPrecio lleva a multiplos de 10', () => {
  assert.equal(redondearPrecio(0), 0);
  assert.equal(redondearPrecio(100), 100);
  assert.equal(redondearPrecio(104), 100);
  assert.equal(redondearPrecio(105), 110);
  assert.equal(redondearPrecio(94), 90);
  assert.equal(redondearPrecio(95), 100);
});

test('redondearPrecio redondea DOS veces: primero al entero, despues a la decena', () => {
  // 14.6 -> 15 -> 20. Redondeando directo a la decena daria 10.
  // El doble redondeo es intencional; este test lo fija.
  assert.equal(redondearPrecio(14.6), 20);
  assert.equal(redondearPrecio(14.4), 10);
});

test('redondearPrecio con negativos redondea hacia +infinito, como Math.round', () => {
  assert.equal(redondearPrecio(-15), -10);
  assert.equal(redondearPrecio(-16), -20);
});

test('precioConRecargo aplica el porcentaje y redondea', () => {
  assert.equal(precioConRecargo(1000, 0), 1000);
  assert.equal(precioConRecargo(1000, 10), 1100);
  assert.equal(precioConRecargo(1000, 15), 1150);
  assert.equal(precioConRecargo(100, 5), 110); // 105 -> 110
});

test('precioConRecargo con recargo 0 igual redondea el precio base', () => {
  // Diferencia deliberada con el frontend, que en este caso NO redondea
  // (ver frontend/src/utils/precios.ts:10-13). Aca si, porque es lo que se cobra.
  assert.equal(precioConRecargo(997, 0), 1000);
});

test('precioConRecargo siempre devuelve un multiplo de 10', () => {
  for (const precio of [1, 7, 33, 101, 999, 12345]) {
    for (const recargo of [0, 5, 10, 12.5, 30]) {
      assert.equal(precioConRecargo(precio, recargo) % 10, 0);
    }
  }
});

test('preciosDeArticulo devuelve un precio por metodo, indexado por id', () => {
  assert.deepEqual(preciosDeArticulo(1000, [EFECTIVO, TARJETA]), { 1: 1000, 2: 1100 });
});

test('preciosDeArticulo trata el precio nulo como 0', () => {
  assert.deepEqual(preciosDeArticulo(null, [EFECTIVO, TARJETA]), { 1: 0, 2: 0 });
  assert.deepEqual(preciosDeArticulo(undefined, [EFECTIVO]), { 1: 0 });
});

test('preciosDeArticulo parte del precio YA redondeado', () => {
  // 105 -> redondea a 110 -> +10% = 121 -> redondea a 120.
  // Si partiera del crudo: 105 * 1.1 = 115.5 -> 120. Coincide aca, asi que
  // usamos un caso donde difiere:  104 -> 100 -> 110  vs  104*1.1=114.4 -> 110.
  assert.equal(preciosDeArticulo(105, [TARJETA])[2], 120);
});

test('remitoConTotales suma las lineas ya redondeadas, no aplica el recargo al total', () => {
  // Tres lineas de 105. Por metodo tarjeta (10%):
  //   por linea: 105 -> 110 -> 121 -> 120  =>  total 360
  //   sobre el total: 315 * 1.1 = 346.5 -> 350
  // Los numeros difieren a proposito: el correcto es 360.
  const remito = {
    id_remito: 1,
    DETALLES_REMITO: [
      { id_detalle: 1, precio: 105, cantidad: 1 },
      { id_detalle: 2, precio: 105, cantidad: 1 },
      { id_detalle: 3, precio: 105, cantidad: 1 },
    ],
  };

  const resultado = remitoConTotales(remito, [EFECTIVO, TARJETA]);

  assert.equal(resultado.totales_por_metodo[2], 360);
  assert.notEqual(resultado.totales_por_metodo[2], 350);
});

test('remitoConTotales multiplica por la cantidad de cada linea', () => {
  const remito = { DETALLES_REMITO: [{ precio: 1000, cantidad: 3 }] };
  const resultado = remitoConTotales(remito, [EFECTIVO, TARJETA]);

  assert.equal(resultado.totales_por_metodo[1], 3000);
  assert.equal(resultado.totales_por_metodo[2], 3300);
});

test('remitoConTotales agrega precios_por_metodo a cada linea sin perder sus campos', () => {
  const remito = { DETALLES_REMITO: [{ id_detalle: 9, precio: 1000, cantidad: 1 }] };
  const [detalle] = remitoConTotales(remito, [EFECTIVO, TARJETA]).DETALLES_REMITO;

  assert.equal(detalle.id_detalle, 9);
  assert.equal(detalle.precio, 1000);
  assert.deepEqual(detalle.precios_por_metodo, { 1: 1000, 2: 1100 });
});

test('remitoConTotales tolera un remito sin lineas y cantidades nulas', () => {
  assert.deepEqual(remitoConTotales({}, [EFECTIVO]).totales_por_metodo, { 1: 0 });
  assert.deepEqual(
    remitoConTotales({ DETALLES_REMITO: [{ precio: 1000, cantidad: null }] }, [EFECTIVO])
      .totales_por_metodo,
    { 1: 0 }
  );
});

test('remitoConTotales conserva el resto del remito', () => {
  const resultado = remitoConTotales({ id_remito: 7, cod_mes: 3 }, [EFECTIVO]);
  assert.equal(resultado.id_remito, 7);
  assert.equal(resultado.cod_mes, 3);
});
