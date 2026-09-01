// Tests de services/impresion.js
//
// construirPayloadTicket es un CONTRATO con otro servicio en otra maquina: el
// printer-client lee claves fijas (ver el comentario de impresion.js:1-9). Si
// alguien renombra `subtotal_tarjeta`, la impresion se rompe en produccion y
// nada en este repo falla. Estos tests congelan la forma del payload.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatearFecha,
  metodoConRecargo,
  construirPayloadTicket,
} = require('../services/impresion');

const EFECTIVO = { id_tipos_de_pago: 1, nombre_tipo_de_pago: 'Efectivo', recargo: 0 };
const TARJETA = { id_tipos_de_pago: 2, nombre_tipo_de_pago: 'Tarjeta', recargo: 10 };

test('formatearFecha devuelve DD/MM/AAAA', () => {
  assert.equal(formatearFecha(new Date(Date.UTC(2026, 0, 5))), '05/01/2026');
  assert.equal(formatearFecha(new Date(Date.UTC(2026, 11, 31))), '31/12/2026');
});

test('formatearFecha usa UTC, no la hora local', () => {
  // Las 23:30 del 5 en hora argentina son las 02:30 del 6 en UTC.
  // El ticket imprime el dia UTC. Este test documenta el comportamiento actual;
  // si alguna vez se decide imprimir la fecha local, este test lo va a marcar.
  assert.equal(formatearFecha('2026-01-05T23:30:00-03:00'), '06/01/2026');
});

test('formatearFecha acepta strings ISO', () => {
  assert.equal(formatearFecha('2026-03-09T12:00:00Z'), '09/03/2026');
});

test('metodoConRecargo devuelve el primero con recargo mayor a 0', () => {
  assert.equal(metodoConRecargo([EFECTIVO, TARJETA]), TARJETA);
});

test('metodoConRecargo devuelve null cuando ninguno tiene recargo', () => {
  assert.equal(metodoConRecargo([EFECTIVO]), null);
  assert.equal(metodoConRecargo([]), null);
});

test('metodoConRecargo respeta el orden del array', () => {
  const primero = { id_tipos_de_pago: 3, recargo: 5 };
  const segundo = { id_tipos_de_pago: 4, recargo: 20 };
  assert.equal(metodoConRecargo([EFECTIVO, primero, segundo]), primero);
});

test('construirPayloadTicket devuelve exactamente las claves que lee el printer-client', () => {
  const payload = construirPayloadTicket(
    [{ descripcion: 'Remera', cantidad: 1, precio: 1000 }],
    [EFECTIVO, TARJETA],
    { id_remito: 42, fecha: new Date(Date.UTC(2026, 0, 5)) }
  );

  assert.deepEqual(Object.keys(payload).sort(), [
    'fecha',
    'id_remito',
    'items',
    'recargo_tarjeta',
    'tipo',
    'total_efectivo',
    'total_tarjeta',
  ]);

  assert.deepEqual(Object.keys(payload.items[0]).sort(), [
    'cantidad',
    'descripcion',
    'precio_efectivo',
    'precio_tarjeta',
    'subtotal_efectivo',
    'subtotal_tarjeta',
  ]);
});

test('construirPayloadTicket calcula las dos columnas de precio', () => {
  const payload = construirPayloadTicket(
    [{ descripcion: 'Remera', cantidad: 2, precio: 1000 }],
    [EFECTIVO, TARJETA],
    { id_remito: 42, fecha: new Date(Date.UTC(2026, 0, 5)) }
  );

  assert.equal(payload.tipo, 'remito');
  assert.equal(payload.id_remito, 42);
  assert.equal(payload.fecha, '05/01/2026');
  assert.equal(payload.recargo_tarjeta, 10);

  const [item] = payload.items;
  assert.equal(item.precio_efectivo, 1000);
  assert.equal(item.precio_tarjeta, 1100);
  assert.equal(item.subtotal_efectivo, 2000);
  assert.equal(item.subtotal_tarjeta, 2200);

  assert.equal(payload.total_efectivo, 2000);
  assert.equal(payload.total_tarjeta, 2200);
});

test('construirPayloadTicket suma los subtotales ya redondeados', () => {
  // Misma invariante que remitoConTotales: el total del ticket es la suma de
  // los renglones, para que cierre si el cliente los suma a mano.
  const payload = construirPayloadTicket(
    [
      { descripcion: 'A', cantidad: 1, precio: 105 },
      { descripcion: 'B', cantidad: 1, precio: 105 },
      { descripcion: 'C', cantidad: 1, precio: 105 },
    ],
    [EFECTIVO, TARJETA],
    {}
  );

  // 105 * 1.1 = 115.5 -> 120 por linea  =>  360
  assert.equal(payload.total_tarjeta, 360);
  assert.equal(payload.total_efectivo, 315);
});

test('construirPayloadTicket sin metodo con recargo deja las dos columnas iguales', () => {
  const payload = construirPayloadTicket(
    [{ descripcion: 'Remera', cantidad: 1, precio: 1000 }],
    [EFECTIVO],
    {}
  );

  assert.equal(payload.recargo_tarjeta, 0);
  assert.equal(payload.total_efectivo, payload.total_tarjeta);
  assert.equal(payload.items[0].precio_efectivo, payload.items[0].precio_tarjeta);
});

test('construirPayloadTicket acepta un remito sin id', () => {
  const payload = construirPayloadTicket([], [EFECTIVO], {});
  assert.equal(payload.id_remito, null);
  assert.deepEqual(payload.items, []);
  assert.equal(payload.total_efectivo, 0);
});
