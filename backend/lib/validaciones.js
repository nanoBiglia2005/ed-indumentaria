const { HttpError } = require('./http');

// parseInt de un id de param/query/body; si no es numero corta con 400 y el
// mensaje exacto de la ruta.
const parseId = (valor, mensaje) => {
  const id = parseInt(valor, 10);
  if (Number.isNaN(id)) {
    throw new HttpError(400, { message: mensaje });
  }
  return id;
};

// Varios ids que comparten un unico mensaje de error combinado
// (p. ej. "El id del articulo y del grupo deben ser numeros.").
const parseIds = (valores, mensaje) => {
  const ids = valores.map((valor) => parseInt(valor, 10));
  if (ids.some(Number.isNaN)) {
    throw new HttpError(400, { message: mensaje });
  }
  return ids;
};

// Los nombres llegan como string libre: se recortan espacios y cualquier otro
// tipo queda como '' (que despues falla la validacion de obligatorio).
const normalizarNombre = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Chequeo de nombre unico sin distinguir mayusculas/minusculas. `where` acota la
// busqueda (p. ej. subgrupos dentro de su grupo) y `excluir` omite la propia fila
// al editar. Si ya existe, corta con 409 y el mensaje de la ruta.
const assertNombreUnico = async (modelo, campo, valor, { mensaje, where = {}, excluir = null }) => {
  const filtro = { ...where, [campo]: { equals: valor, mode: 'insensitive' } };
  if (excluir) {
    filtro[excluir.campo] = { not: excluir.id };
  }

  const existente = await modelo.findFirst({ where: filtro });
  if (existente) {
    throw new HttpError(409, { message: mensaje });
  }
};

module.exports = { parseId, parseIds, normalizarNombre, assertNombreUnico };
