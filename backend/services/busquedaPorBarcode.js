// Busqueda de un articulo por su codigo de barras: el que se ve en la columna
// Codigo de la tabla de articulos y el que sale impreso en la etiqueta.
//
// El codigo es directamente el valor de barcode_tail (ver
// codigoBarcodeCompleto() de frontend/src/utils/barcode.ts y la expresion
// CODIGO de lib/articulosConsulta.js), asi que la busqueda es un match exacto
// contra esa columna.
const prisma = require('../db');

/**
 * Articulo cuyo codigo de barra es exactamente `codigo`, o null si no hay
 * ninguno. `codigo` tiene que venir ya validado como una tira de digitos.
 *
 * Devuelve la misma forma que GET /api/venta/articulos (el articulo con
 * `nombre_subgrupo` resuelto) para que el frontend lo trate igual que a uno
 * elegido desde la tabla.
 */
const buscarArticuloPorCodigo = async (codigo) => {
  const articulo = await prisma.ARTICULOS.findFirst({
    where: { barcode_tail: codigo },
    include: { SUBGRUPOS_DE_VENTA: true },
  });

  if (!articulo) return null;

  const { SUBGRUPOS_DE_VENTA, ...resto } = articulo;
  return { ...resto, nombre_subgrupo: SUBGRUPOS_DE_VENTA?.nombre_subgrupo ?? null };
};

module.exports = { buscarArticuloPorCodigo };
