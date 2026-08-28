// Clientes FINALES (tabla CLIENTES, la del consumidor que compra en el local).
//
// OJO con el nombre: CLIENTES_MAYORISTAS es OTRA tabla, la de los colegios y
// clubes que agrupan articulos. La que se maneja aca es la minorista, con
// nombre / apellido / DNI, y es a la que apunta REMITOS.id_cliente.
//
// Todo lo que entra se valida y se normaliza en un solo lugar: la ruta solo
// llama a `parsearDatosCliente` y guarda lo que sale.
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const {
  NOMBRE_MAX,
  APELLIDO_MAX,
  DNI_LARGO,
  EMAIL_MAX,
  COD_PAIS_DIGITOS,
  COD_AREA_DIGITOS,
  TELEFONO_DIGITOS,
} = require('../constants/clientes');

const error400 = (message) => new HttpError(400, { message });

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Obligatorio: no vacio y dentro del largo de la columna.
const parseTextoRequerido = (valor, { campo, max }) => {
  const limpio = texto(valor);
  if (limpio === '') throw error400(`El ${campo} del cliente es obligatorio.`);
  if (limpio.length > max) throw error400(`El ${campo} no puede tener mas de ${max} caracteres.`);
  return limpio;
};

// El DNI es varchar(8) en la base y se pide completo: ni 7 ni 9 digitos.
const parseDni = (valor) => {
  const limpio = texto(valor);
  if (limpio === '') throw error400('El DNI del cliente es obligatorio.');
  if (!new RegExp(`^\\d{${DNI_LARGO}}$`).test(limpio)) {
    throw error400(`El DNI debe tener exactamente ${DNI_LARGO} digitos.`);
  }
  return limpio;
};

// Chequeo deliberadamente simple (algo@algo.dominio): validar mail "de verdad"
// con una regex es imposible y lo unico que importa es atajar el tipeo obvio.
const parseEmail = (valor) => {
  const limpio = texto(valor);
  if (limpio === '') return null;
  if (limpio.length > EMAIL_MAX) {
    throw error400(`El email no puede tener mas de ${EMAIL_MAX} caracteres.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
    throw error400('El email no tiene un formato valido.');
  }
  return limpio;
};

// Los tres campos del telefono son numericos en la base y opcionales.
const parseNumeroOpcional = (valor, { campo, digitos }) => {
  const limpio = typeof valor === 'number' ? String(valor) : texto(valor);
  if (limpio === '') return null;
  if (!new RegExp(`^\\d{1,${digitos}}$`).test(limpio)) {
    throw error400(`El ${campo} debe ser un numero de hasta ${digitos} digitos.`);
  }
  return Number(limpio);
};

/**
 * Fecha de nacimiento: llega como 'AAAA-MM-DD' (lo que arma el frontend a
 * partir del DD/MM/AAAA que se tipea) y sale como un Date en medianoche UTC.
 * La columna es `date`: si se construyera con la hora local de Argentina
 * (UTC-3) se guardaria el dia anterior.
 */
const parseFechaNacimiento = (valor) => {
  const limpio = texto(valor);
  if (limpio === '') return null;

  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpio);
  if (!partes) throw error400('La fecha de nacimiento debe tener el formato DD/MM/AAAA.');

  const [, anio, mes, dia] = partes.map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  // Rebota los dias que no existen (31/02 caeria en marzo).
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    throw error400('La fecha de nacimiento no existe.');
  }
  if (fecha.getTime() > Date.now()) {
    throw error400('La fecha de nacimiento no puede ser futura.');
  }

  return fecha;
};

/**
 * Valida el cuerpo del alta/edicion de un cliente y devuelve el objeto listo
 * para Prisma. Obligatorios: nombre, apellido y DNI. El resto es opcional y
 * viaja como null cuando esta vacio (asi editar y borrar un campo funciona
 * igual que cargarlo).
 */
const parsearDatosCliente = (cuerpo) => {
  const datos = cuerpo ?? {};

  return {
    nombre: parseTextoRequerido(datos.nombre, { campo: 'nombre', max: NOMBRE_MAX }),
    apellido: parseTextoRequerido(datos.apellido, { campo: 'apellido', max: APELLIDO_MAX }),
    dni: parseDni(datos.dni),
    email: parseEmail(datos.email),
    cod_pais: parseNumeroOpcional(datos.cod_pais, {
      campo: 'codigo de pais',
      digitos: COD_PAIS_DIGITOS,
    }),
    cod_area: parseNumeroOpcional(datos.cod_area, {
      campo: 'codigo de area',
      digitos: COD_AREA_DIGITOS,
    }),
    telefono: parseNumeroOpcional(datos.telefono, {
      campo: 'telefono',
      digitos: TELEFONO_DIGITOS,
    }),
    fecha_nacimiento: parseFechaNacimiento(datos.fecha_nacimiento),
  };
};

/** Cliente con ese DNI exacto, o null. El DNI no es unico en la base. */
const buscarPorDni = (dni) => prisma.CLIENTES.findFirst({ where: { dni } });

/**
 * Busqueda del selector de la venta: un solo termino que matchea por nombre,
 * por apellido o por DNI (el usuario no elige contra que campo busca).
 * `nombre + ' ' + apellido` tambien matchea, para poder tipear "Stefano Biglia".
 */
const buscarClientes = (termino, limite) => {
  const contiene = { contains: termino, mode: 'insensitive' };

  return prisma.CLIENTES.findMany({
    where: {
      OR: [
        { nombre: contiene },
        { apellido: contiene },
        { dni: { contains: termino } },
      ],
    },
    orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
    take: limite,
  });
};

/** Cliente por id; 404 si no existe (p. ej. lo borraron mientras se vendia). */
const obtenerCliente = async (id_cliente) => {
  const cliente = await prisma.CLIENTES.findUnique({ where: { id_cliente } });
  if (!cliente) throw new HttpError(404, { message: 'El cliente no existe.' });
  return cliente;
};

module.exports = {
  parsearDatosCliente,
  buscarPorDni,
  buscarClientes,
  obtenerCliente,
};
