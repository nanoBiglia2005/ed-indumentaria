// Fuente unica: shared/clientes.json. La lee este modulo (CommonJS, para las
// rutas y services/) y tambien backend/types.ts (para el frontend). No duplicar
// valores: el formulario del frontend limita lo que se puede tipear y el
// backend valida exactamente lo mismo, asi que si las dos listas se separan el
// formulario deja cargar algo que la API despues rechaza.
//
// Los limites siguen a la tabla CLIENTES (la minorista, la del consumidor
// final): nombre/apellido varchar(50), dni varchar(8), email varchar(50).
const clientes = require('../shared/clientes.json');

module.exports = {
  NOMBRE_MAX: clientes.NOMBRE_MAX,
  APELLIDO_MAX: clientes.APELLIDO_MAX,
  DNI_LARGO: clientes.DNI_LARGO,
  EMAIL_MAX: clientes.EMAIL_MAX,
  COD_PAIS_DIGITOS: clientes.COD_PAIS_DIGITOS,
  COD_AREA_DIGITOS: clientes.COD_AREA_DIGITOS,
  TELEFONO_DIGITOS: clientes.TELEFONO_DIGITOS,
};
