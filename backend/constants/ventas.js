// Fuente unica: shared/ventas.json. La lee este modulo (CommonJS, para las rutas
// y services) y tambien backend/types.ts (para el frontend). No duplicar valores.
const ventas = require('../shared/ventas.json');

module.exports = {
  ESTADO_CONFIRMADO: ventas.ESTADOS.CONFIRMADO,
  ESTADO_FACTURADO: ventas.ESTADOS.FACTURADO,
  ESTADO_ANULADO: ventas.ESTADOS.ANULADO,
  ESTADO_DEVUELTO: ventas.ESTADOS.DEVUELTO,
};
