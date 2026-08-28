// Fuente unica: shared/precios.json. La lee este modulo (CommonJS, para las
// rutas) y tambien backend/types.ts (para el frontend). No duplicar valores: el
// input de la pagina de Precios y la validacion de la ruta tienen que aceptar
// exactamente lo mismo, si no el usuario puede tipear un precio que despues la
// API rechaza.
//
// PRECIO_MAX: precio entero maximo que se puede fijar.
// MAX_ARTICULOS_POR_ACTUALIZACION: tope de articulos de un solo PUT (la pagina
// actualiza por talle, asi que una tanda normal son decenas, no miles).
const precios = require('../shared/precios.json');

module.exports = {
  PRECIO_MAX: precios.PRECIO_MAX,
  MAX_ARTICULOS_POR_ACTUALIZACION: precios.MAX_ARTICULOS_POR_ACTUALIZACION,
};
