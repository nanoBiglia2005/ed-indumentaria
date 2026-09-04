// Fuente unica: shared/roles.json. La lee este modulo (CommonJS, para las rutas)
// y tambien backend/types.ts (para el frontend). No duplicar valores: si las dos
// listas se separan, el frontend esconde una pagina que la API igual permite
// (o al reves, muestra una que responde 403).
//
// ROLES_PRECIOS: quienes pueden ver la pagina de Precios y ejecutar la
// actualizacion masiva de precios (routes/precios.js).
//
// ROLES_ARTICULOS: quienes pueden ver la pagina de Articulos y su ABM
// completo (routes/articulos.js, grupos.js, subgrupos.js, clientes.js,
// print.js, asociaciones.js, y el POST/PUT/DELETE de lineas.js). El rol
// "empleado" no esta en la lista: solo tiene acceso a Ventas. El GET de
// lineas.js NO usa esta lista porque Ventas tambien lo necesita (el modal de
// agregar producto arma el filtro por linea).
//
// ROLES_CONFIGURACION: quienes pueden ver la pagina de Configuracion y editar
// el recargo de un medio de pago (routes/tiposDePago.js). Ni "empleado" ni
// "ventas" estan en la lista.
//
// ROLES_HISTORIAL: quienes pueden ver el listado historico de remitos
// (routes/remitos.js, GET /). Los pendientes de cobro (GET /pendientes) viven
// en la pagina de Ventas y no usan esta lista: todos los roles los siguen
// viendo. Ni "empleado" ni "ventas" estan en ROLES_HISTORIAL.
const roles = require('../shared/roles.json');

module.exports = {
  ROLES_PRECIOS: roles.ROLES_PRECIOS,
  ROLES_ARTICULOS: roles.ROLES_ARTICULOS,
  ROLES_CONFIGURACION: roles.ROLES_CONFIGURACION,
  ROLES_HISTORIAL: roles.ROLES_HISTORIAL,
};
