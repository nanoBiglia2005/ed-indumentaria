// Fuente unica: shared/impresion.json. La lee este modulo (CommonJS, para las
// rutas y services/impresoras.js) y tambien backend/types.ts (para el frontend).
// No duplicar valores: si las dos listas se separan, el frontend muestra el
// selector de impresora a alguien cuya eleccion el backend va a ignorar.
//
// ROLES_ELIGEN_IMPRESORA: quienes pueden elegir a que impresora va un trabajo.
// El resto imprime siempre en la predeterminada global. La decision la toma
// services/impresoras.js con el rol de la SESION, nunca con el body.
const impresion = require('../shared/impresion.json');

module.exports = {
  ROLES_ELIGEN_IMPRESORA: impresion.ROLES_ELIGEN_IMPRESORA,
  NOMBRE_IMPRESORA_MAX: impresion.NOMBRE_IMPRESORA_MAX,
};
