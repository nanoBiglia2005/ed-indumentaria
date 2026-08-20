// Codigo de barras de un articulo: la columna barcode_tail tal cual.
// Existe como funcion (y no como acceso directo a la columna) para que quien
// llama no tenga que saber que el "codigo" y el campo de la base son lo mismo,
// y por simetria con codigoBarcodeCompleto() de frontend/src/utils/barcode.ts.
const codigoBarcodeCompleto = (tail) => tail || null;

module.exports = { codigoBarcodeCompleto };
