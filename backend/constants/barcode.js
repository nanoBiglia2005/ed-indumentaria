// Fuente unica: shared/barcode.json. La lee este modulo (CommonJS, para las
// rutas y lib/) y tambien backend/types.ts (para el frontend). No duplicar
// valores: el prefijo generico se usa para ARMAR el codigo completo tanto al
// mostrarlo (frontend) como al filtrarlo y ordenarlo en SQL (backend), asi que
// si los dos lados no coinciden la busqueda por codigo deja de encontrar.
const barcode = require('../shared/barcode.json');

module.exports = {
  BARCODE_HEADER_GENERICO: barcode.BARCODE_HEADER_GENERICO,
  BARCODE_HEADER_MAX: barcode.BARCODE_HEADER_MAX,
  BARCODE_TAIL_MAX: barcode.BARCODE_TAIL_MAX,
};
