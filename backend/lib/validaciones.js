const { HttpError } = require('./http');

/**
 * UNICO lugar donde se decide que es un id valido: devuelve el entero, o null
 * si el valor no lo es. Todo lo demas de este bloque es esto mismo con distinta
 * forma de avisar el error, porque cada llamador lo reporta a su manera (unos
 * lanzan HttpError, otros devuelven { error } o comparan contra una lista).
 *
 * Acepta el entero como numero (viene asi de un body JSON) o como string (todo
 * lo que llega por la URL), y acepta negativos porque ID_GRUPO_NO_ASIGNADO vale
 * -1 y varias rutas lo comparan DESPUES de parsear.
 *
 * Es estricto a proposito: antes cada lugar usaba parseInt(), que lee el
 * prefijo numerico y descarta el resto, asi que "1;DROP" pasaba como 1 y "1.5"
 * como 1. No era explotable (el valor ya era un entero y viaja como parametro
 * de la consulta, nunca como SQL) pero hacia pasar por valida una peticion que
 * no lo era.
 */
const aId = (valor) => {
  const id =
    typeof valor === 'number' ? valor
    : typeof valor === 'string' && /^\s*-?\d+\s*$/.test(valor) ? Number(valor)
    : NaN;

  // isSafeInteger y no isInteger: mas alla de 2^53 el numero ya perdio digitos
  // y no representa el id que mandaron.
  return Number.isSafeInteger(id) ? id : null;
};

// Id obligatorio: si no lo es, corta con 400 y el mensaje exacto de la ruta.
const parseId = (valor, mensaje) => {
  const id = aId(valor);
  if (id === null) throw new HttpError(400, { message: mensaje });
  return id;
};

// Varios ids que comparten un unico mensaje de error combinado
// (p. ej. "El id del articulo y del grupo deben ser numeros.").
const parseIds = (valores, mensaje) => valores.map((valor) => parseId(valor, mensaje));

/**
 * Id de un filtro opcional: ausente (o vacio) NO es un error, es "sin filtro".
 * Cualquier otra cosa pasa por parseId y corta igual que un id obligatorio.
 */
const parseIdOpcional = (valor, mensaje) =>
  valor === undefined || valor === null || valor === '' ? null : parseId(valor, mensaje);

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

module.exports = { aId, parseId, parseIds, parseIdOpcional, normalizarNombre, assertNombreUnico };
