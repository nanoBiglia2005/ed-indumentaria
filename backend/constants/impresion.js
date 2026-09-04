// Fuente unica: shared/impresion.json. La lee este modulo (CommonJS, para las
// rutas y services/impresoras.js) y tambien backend/types.ts (para el frontend).
// No duplicar valores: si las listas se separan del lado equivocado, el
// frontend muestra un control a alguien cuya accion el backend va a rechazar
// (o al reves, esconde uno que la API igual permitiria).
//
// ROLES_ELIGEN_IMPRESORA: quienes pueden elegir a que impresora va UN TRABAJO
// puntual (un ticket o una etiqueta), en Articulos/Ventas. El resto imprime
// siempre en la predeterminada o en la asignada. La decision la toma
// services/impresoras.js con el rol de la SESION, nunca con el body.
//
// ROLES_ADMINISTRAN_IMPRESORAS: quienes pueden administrar el REGISTRO de
// impresoras en Configuracion (verla, crear, editar, desactivar, regenerar
// token, elegir su propia impresora predeterminada). Es un permiso mas
// restrictivo y DISTINTO del anterior: un admin elige a donde imprime un
// trabajo, pero ya no administra el registro (routes/impresoras.js).
const impresion = require('../shared/impresion.json');

module.exports = {
  ROLES_ELIGEN_IMPRESORA: impresion.ROLES_ELIGEN_IMPRESORA,
  ROLES_ADMINISTRAN_IMPRESORAS: impresion.ROLES_ADMINISTRAN_IMPRESORAS,
  NOMBRE_IMPRESORA_MAX: impresion.NOMBRE_IMPRESORA_MAX,
};
