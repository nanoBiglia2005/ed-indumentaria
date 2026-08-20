// Fuente unica: shared/barcode.json. La lee este modulo (CommonJS, para las
// rutas y lib/) y tambien backend/types.ts (para el frontend). No duplicar el
// valor: BARCODE_MAX es el largo maximo de un codigo de barra (columna
// barcode_tail, @db.VarChar(20)).
const barcode = require('../shared/barcode.json');

module.exports = {
  BARCODE_MAX: barcode.BARCODE_MAX,
};
