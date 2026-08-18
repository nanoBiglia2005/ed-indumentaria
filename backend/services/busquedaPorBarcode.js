// Busqueda de un articulo por su codigo de barras COMPLETO: el que se ve en la
// columna Codigo de la tabla de articulos y el que sale impreso en la etiqueta.
//
// El codigo completo NO es una columna de la base: se arma con
// barcode_header + barcode_tail y, cuando el articulo no tiene header propio,
// con BARCODE_HEADER_GENERICO adelante. Es la misma regla que
// codigoBarcodeCompleto() de frontend/src/utils/barcode.ts y que la expresion
// CODIGO de lib/articulosConsulta.js (las tres leen el prefijo del mismo
// shared/barcode.json).
//
// Como el codigo llega entero (lo tipea el usuario o lo dispara el lector), no
// se sabe donde termina el header: se prueban TODOS los cortes posibles. El
// header tiene a lo sumo BARCODE_HEADER_MAX digitos, asi que son unas pocas
// alternativas y entre todas quedan cubiertas las tres formas del codigo:
//   header + tail   |   solo header   |   generico + tail
const prisma = require('../db');
const { BARCODE_HEADER_GENERICO, BARCODE_HEADER_MAX } = require('../constants/barcode');

// En la base "sin header"/"sin tail" puede ser NULL o el string vacio;
// codigoBarcodeCompleto() trata a los dos igual (el '' es falsy en JS), asi que
// aca tambien.
const vacio = (campo) => [{ [campo]: null }, { [campo]: '' }];

const condicionesDeCodigo = (codigo) => {
  const condiciones = [];

  // header + tail: el corte cae en cada posicion que el header admite.
  const corteMax = Math.min(BARCODE_HEADER_MAX, codigo.length - 1);
  for (let corte = 1; corte <= corteMax; corte++) {
    condiciones.push({
      barcode_header: codigo.slice(0, corte),
      barcode_tail: codigo.slice(corte),
    });
  }

  // Solo header (articulo sin tail).
  if (codigo.length <= BARCODE_HEADER_MAX) {
    condiciones.push({ barcode_header: codigo, OR: vacio('barcode_tail') });
  }

  // Sin header propio: el codigo que se ve arranca con el prefijo generico.
  if (codigo.startsWith(BARCODE_HEADER_GENERICO) && codigo.length > BARCODE_HEADER_GENERICO.length) {
    condiciones.push({
      barcode_tail: codigo.slice(BARCODE_HEADER_GENERICO.length),
      OR: vacio('barcode_header'),
    });
  }

  return condiciones;
};

/**
 * Articulo cuyo codigo de barra completo es exactamente `codigo`, o null si no
 * hay ninguno. `codigo` tiene que venir ya validado como una tira de digitos.
 *
 * Devuelve la misma forma que GET /api/venta/articulos (el articulo con
 * `nombre_subgrupo` resuelto) para que el frontend lo trate igual que a uno
 * elegido desde la tabla.
 */
const buscarArticuloPorCodigo = async (codigo) => {
  const articulo = await prisma.ARTICULOS.findFirst({
    where: { OR: condicionesDeCodigo(codigo) },
    include: { SUBGRUPOS_DE_VENTA: true },
    // barcode_tail es unico, asi que como mucho puede haber empate entre un
    // codigo armado con header propio y otro con el prefijo generico: gana el
    // articulo mas viejo, siempre el mismo.
    orderBy: { id_articulo: 'asc' },
  });

  if (!articulo) return null;

  const { SUBGRUPOS_DE_VENTA, ...resto } = articulo;
  return { ...resto, nombre_subgrupo: SUBGRUPOS_DE_VENTA?.nombre_subgrupo ?? null };
};

module.exports = { buscarArticuloPorCodigo };
