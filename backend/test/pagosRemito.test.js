// Tests de services/pagosRemito.js — decide cuanta plata entra.
//
// Los montos finales se recalculan SIEMPRE en el backend, aunque el frontend ya
// los muestre: lo que llega del navegador no decide cuanto se cobra
// (pagosRemito.js:16-17). Estos tests fijan esa validacion y la REGLA DEL METODO
// UNICO (pagosRemito.js:8-14).
const test = require('node:test');
const assert = require('node:assert/strict');

const { parsearPagos } = require('../services/pagosRemito');
const { HttpError } = require('../lib/http');

const EFECTIVO = { id_tipos_de_pago: 1, nombre_tipo_de_pago: 'Efectivo', recargo: 0 };
const TARJETA = { id_tipos_de_pago: 2, nombre_tipo_de_pago: 'Tarjeta', recargo: 10 };
const METODOS = [EFECTIVO, TARJETA];

/** Totales de la venta por metodo, como los devuelve remitoConTotales. */
const TOTALES = { 1: 1000, 2: 1100 };

const es400 = (mensajeEsperado) => (error) => {
  assert.ok(error instanceof HttpError);
  assert.equal(error.status, 400);
  if (mensajeEsperado) assert.equal(error.body.message, mensajeEsperado);
  return true;
};

test('parsearPagos exige que venga el detalle del reparto', () => {
  assert.throws(
    () => parsearPagos({}, METODOS, 1000, TOTALES),
    es400('Falta el detalle de como se paga el remito.')
  );
  assert.throws(() => parsearPagos(null, METODOS, 1000, TOTALES), es400());
  assert.throws(() => parsearPagos({ pagos: 'no' }, METODOS, 1000, TOTALES), es400());
});

test('parsearPagos rechaza un metodo que no existe', () => {
  assert.throws(
    () => parsearPagos({ pagos: [{ id_tipo_de_pago: 99, monto_inicial: 1000 }] }, METODOS, 1000, TOTALES),
    es400('El metodo de pago "99" no existe.')
  );
});

test('parsearPagos rechaza un id invalido mostrando el valor crudo', () => {
  assert.throws(
    () =>
      parsearPagos(
        { pagos: [{ id_tipo_de_pago: '1;DROP', monto_inicial: 1000 }] },
        METODOS,
        1000,
        TOTALES
      ),
    es400('El metodo de pago "1;DROP" no existe.')
  );
});

test('parsearPagos rechaza un metodo repetido', () => {
  assert.throws(
    () =>
      parsearPagos(
        {
          pagos: [
            { id_tipo_de_pago: 1, monto_inicial: 500 },
            { id_tipo_de_pago: 1, monto_inicial: 500 },
          ],
        },
        METODOS,
        1000,
        TOTALES
      ),
    es400('El metodo "Efectivo" viene repetido.')
  );
});

test('parsearPagos rechaza montos negativos o no numericos', () => {
  const conMonto = (monto) => () =>
    parsearPagos({ pagos: [{ id_tipo_de_pago: 1, monto_inicial: monto }] }, METODOS, 1000, TOTALES);

  assert.throws(conMonto(-1), es400('El monto de "Efectivo" debe ser un numero mayor o igual a 0.'));
  assert.throws(conMonto('abc'), es400());
  assert.throws(conMonto(Infinity), es400());
});

test('parsearPagos descarta los metodos en 0 sin generar fila', () => {
  // El frontend manda SIEMPRE todos los metodos; los que vienen en 0 no se usaron.
  const resultado = parsearPagos(
    {
      pagos: [
        { id_tipo_de_pago: 1, monto_inicial: 1000 },
        { id_tipo_de_pago: 2, monto_inicial: 0 },
      ],
    },
    METODOS,
    1000,
    TOTALES
  );

  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].id_tipo_de_pago, 1);
});

test('parsearPagos exige que el reparto sume exactamente el total de la venta', () => {
  const repartir = (a, b) => () =>
    parsearPagos(
      {
        pagos: [
          { id_tipo_de_pago: 1, monto_inicial: a },
          { id_tipo_de_pago: 2, monto_inicial: b },
        ],
      },
      METODOS,
      1000,
      TOTALES
    );

  // De menos: quedaria plata sin cobrar.
  assert.throws(repartir(400, 500), es400('Los montos iniciales deben sumar exactamente 1000 (suman 900).'));
  // De mas: se estaria cobrando de mas.
  assert.throws(repartir(600, 500), es400());
});

test('parsearPagos tolera el polvo binario de sumar decimales', () => {
  // 0.1 + 0.2 !== 0.3. La tolerancia es de medio centavo (TOLERANCIA = 0.009).
  const resultado = parsearPagos(
    {
      pagos: [
        { id_tipo_de_pago: 1, monto_inicial: 0.1 },
        { id_tipo_de_pago: 2, monto_inicial: 0.2 },
      ],
    },
    METODOS,
    0.3,
    TOTALES
  );

  assert.equal(resultado.length, 2);
});

test('REGLA DEL METODO UNICO: un solo metodo cobra el total ya congelado del remito', () => {
  // Con un solo metodo se usa totalesDelRemito[id], que es la suma de las lineas
  // ya redondeadas. NO se recalcula el recargo sobre el monto.
  const resultado = parsearPagos(
    { pagos: [{ id_tipo_de_pago: 2, monto_inicial: 1000 }] },
    METODOS,
    1000,
    { 1: 1000, 2: 1130 } // total "raro" a proposito: no es 1000 * 1.1
  );

  assert.equal(resultado[0].monto_final, 1130);
});

test('con dos o mas metodos se aplica el recargo a cada parte', () => {
  // Repartido no hay con que comparar: cada parte no se corresponde con ningun
  // articulo, asi que se le aplica el recargo al monto.
  const resultado = parsearPagos(
    {
      pagos: [
        { id_tipo_de_pago: 1, monto_inicial: 500 },
        { id_tipo_de_pago: 2, monto_inicial: 500 },
      ],
    },
    METODOS,
    1000,
    { 1: 1000, 2: 1130 }
  );

  const tarjeta = resultado.find((pago) => pago.id_tipo_de_pago === 2);
  assert.equal(tarjeta.monto_final, 550); // 500 * 1.1, NO 1130
});

test('metodo unico sin total congelado cae al recargo sobre el monto', () => {
  const resultado = parsearPagos(
    { pagos: [{ id_tipo_de_pago: 2, monto_inicial: 1000 }] },
    METODOS,
    1000,
    {} // sin totales del remito
  );

  assert.equal(resultado[0].monto_final, 1100);
});

test('parsearPagos devuelve la forma que espera registrarCobro', () => {
  const [pago] = parsearPagos(
    { pagos: [{ id_tipo_de_pago: 1, monto_inicial: 1000 }] },
    METODOS,
    1000,
    TOTALES
  );

  assert.deepEqual(Object.keys(pago).sort(), ['id_tipo_de_pago', 'monto_final', 'monto_inicial']);
});
