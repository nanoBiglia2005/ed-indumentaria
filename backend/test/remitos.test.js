// Tests de la parte pura de services/remitos.js
//
// QUE REGLA PROTEGE: un comprobante ya emitido no cambia. La reimpresion arma
// el ticket con el precio CONGELADO en DETALLES_REMITO, nunca con el precio
// actual del articulo. Si alguien "simplificara" itemsDeRemito para leer
// ARTICULOS.precio, reimprimir una venta de hace un mes despues de un aumento
// imprimiria numeros que el cliente nunca pago, y no fallaria nada mas.
const test = require('node:test');
const assert = require('node:assert/strict');

const { itemsDeRemito } = require('../services/remitos');

const remitoDeEjemplo = {
  id_remito: 7,
  DETALLES_REMITO: [
    {
      id_articulo: 1,
      cantidad: 2,
      precio: 1000, // lo que se cobro ese dia
      ARTICULOS: { id_articulo: 1, descripcion: 'Remera', precio: 1800 }, // precio de hoy
    },
  ],
};

test('itemsDeRemito usa el precio congelado del detalle, no el del articulo', () => {
  const [item] = itemsDeRemito(remitoDeEjemplo);

  assert.equal(item.precio, 1000);
  assert.notEqual(item.precio, 1800);
});

test('itemsDeRemito devuelve la forma que espera construirPayloadTicket', () => {
  const [item] = itemsDeRemito(remitoDeEjemplo);

  assert.equal(item.descripcion, 'Remera');
  assert.equal(item.cantidad, 2);
});

test('itemsDeRemito sobrevive a un articulo sin descripcion', () => {
  // ARTICULOS es opcional en el schema (el detalle guarda id_articulo nullable),
  // asi que un articulo borrado no puede romper la reimpresion.
  const [item] = itemsDeRemito({
    DETALLES_REMITO: [{ id_articulo: 42, cantidad: 1, precio: 500, ARTICULOS: null }],
  });

  assert.equal(item.descripcion, 'Articulo 42');
  assert.equal(item.precio, 500);
});

test('itemsDeRemito acepta un remito sin detalles', () => {
  assert.deepEqual(itemsDeRemito({}), []);
  assert.deepEqual(itemsDeRemito({ DETALLES_REMITO: [] }), []);
});
