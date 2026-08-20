// Fuente unica: shared/roles.json. La lee este modulo (CommonJS, para las rutas)
// y tambien backend/types.ts (para el frontend). No duplicar valores: si las dos
// listas se separan, el frontend esconde una pagina que la API igual permite
// (o al reves, muestra una que responde 403).
//
// ROLES_PRECIOS: quienes pueden ver la pagina de Precios y ejecutar la
// actualizacion masiva de precios (routes/precios.js).
const roles = require('../shared/roles.json');

module.exports = {
  ROLES_PRECIOS: roles.ROLES_PRECIOS,
};
