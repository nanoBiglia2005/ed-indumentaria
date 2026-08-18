// Armado del codigo de barras COMPLETO de un articulo.
//
// El codigo completo no es una columna de la base: se arma con
// barcode_header + barcode_tail y, cuando el articulo no tiene header propio,
// con BARCODE_HEADER_GENERICO adelante. La misma regla vive en SQL
// (lib/articulosConsulta.js, para filtrar y ordenar la columna Codigo) y en el
// frontend (utils/barcode.ts, para mostrarla); las tres leen el prefijo del
// mismo shared/barcode.json.
const { BARCODE_HEADER_GENERICO } = require('../constants/barcode');

/**
 * Codigo de barras completo, o null si el articulo no tiene ningun dato de
 * barcode. Equivalente a codigoBarcodeCompleto() de frontend/src/utils/barcode.ts.
 */
const codigoBarcodeCompleto = (header, tail) =>
  header ? (tail ? header + tail : header) : tail ? BARCODE_HEADER_GENERICO + tail : null;

module.exports = { codigoBarcodeCompleto };
