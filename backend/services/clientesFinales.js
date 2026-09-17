// Clientes FINALES (tabla CLIENTES, la del consumidor que compra en el local).
//
// OJO con el nombre: CLIENTES_MAYORISTAS es OTRA tabla, la de los colegios y
// clubes que agrupan articulos. La que se maneja aca es la minorista, con
// nombre / apellido / telefono, y es a la que apunta REMITOS.id_cliente.
//
// Todo lo que entra se valida y se normaliza en un solo lugar: la ruta solo
// llama a `parsearDatosCliente` y guarda lo que sale.
const prisma = require('../db');
const { Prisma } = require('../generated/prisma/client');
const { HttpError } = require('../lib/http');
const {
  NOMBRE_MAX,
  APELLIDO_MAX,
  DNI_LARGO,
  EMAIL_MAX,
  COD_PAIS_DIGITOS,
  COD_AREA_DIGITOS,
  TELEFONO_DIGITOS,
  COD_PAIS_DEFAULT,
  COD_AREA_DEFAULT,
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

// El DNI es opcional: si se completa, varchar(8) en la base y se pide
// completo (ni 7 ni 9 digitos). Vacio viaja como null, igual que el email.
const parseDni = (valor) => {
  const limpio = texto(valor);
  if (limpio === '') return null;
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

// cod_pais y cod_area son numericos en la base y opcionales, con un default
// (54 y 11) si no se completan. El default NO sale de la columna: pasarle
// `null` explicito a Prisma inserta NULL y pisa el @default del schema (que
// solo aplica si la clave viene ausente del create), asi que hay que
// resolverlo aca mismo, a mano, con el mismo valor que declara schema.prisma.
const parseNumeroOpcional = (valor, { campo, digitos, valorDefault = null }) => {
  const limpio = typeof valor === 'number' ? String(valor) : texto(valor);
  if (limpio === '') return valorDefault;
  if (!new RegExp(`^\\d{1,${digitos}}$`).test(limpio)) {
    throw error400(`El ${campo} debe ser un numero de hasta ${digitos} digitos.`);
  }
  return Number(limpio);
};

// El telefono es obligatorio (a diferencia de cod_pais/cod_area, que
// conservan su default) y se pide completo: ni menos ni mas digitos, mismo
// criterio que el DNI.
const parseNumeroRequerido = (valor, { campo, digitos }) => {
  const limpio = typeof valor === 'number' ? String(valor) : texto(valor);
  if (limpio === '') throw error400(`El ${campo} del cliente es obligatorio.`);
  if (!new RegExp(`^\\d{${digitos}}$`).test(limpio)) {
    throw error400(`El ${campo} debe tener exactamente ${digitos} digitos.`);
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
 * para Prisma. Obligatorios: nombre, apellido y telefono. El DNI y el email
 * son opcionales y viajan como null cuando estan vacios (asi editar y borrar
 * un campo funciona igual que cargarlo). cod_pais/cod_area son la excepcion:
 * vacios no quedan en null, caen a su default (54 / 11).
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
      valorDefault: COD_PAIS_DEFAULT,
    }),
    cod_area: parseNumeroOpcional(datos.cod_area, {
      campo: 'codigo de area',
      digitos: COD_AREA_DIGITOS,
      valorDefault: COD_AREA_DEFAULT,
    }),
    telefono: parseNumeroRequerido(datos.telefono, {
      campo: 'telefono',
      digitos: TELEFONO_DIGITOS,
    }),
    fecha_nacimiento: parseFechaNacimiento(datos.fecha_nacimiento),
  };
};

// Los tres identificadores que no pueden repetirse entre clientes, en el
// orden en que se buscan (ver `buscarClienteConDatoRepetido`). Coincide con
// las tres columnas @unique de schema.prisma.
const ETIQUETA_POR_CAMPO = { dni: 'DNI', telefono: 'teléfono', email: 'email' };

/**
 * Cliente que YA usa alguno de dni/telefono/email (excluyendo `excluirId`, el
 * propio cliente al editar), o null. Se busca dni primero, despues telefono,
 * despues email, y se corta en el PRIMERO que matchee: alcanza un cliente
 * para avisar, no tiene sentido acumular los tres choques a la vez. dni y
 * email pueden llegar null (son opcionales) y se saltean — buscar por null
 * encontraria cualquier otro cliente sin ese dato cargado, que no es una
 * colision real.
 */
const buscarClienteConDatoRepetido = async (datos, excluirId = null) => {
  const excluir = excluirId ? { id_cliente: { not: excluirId } } : {};

  for (const campo of Object.keys(ETIQUETA_POR_CAMPO)) {
    const valor = datos[campo];
    if (!valor) continue;

    const cliente = await prisma.CLIENTES.findFirst({ where: { [campo]: valor, ...excluir } });
    if (cliente) return { cliente, campo };
  }

  return null;
};

/**
 * Corta con 409 si el dni/telefono/email ya es de OTRO cliente. Solo se usa
 * al editar: no se puede pisar un dato de un cliente distinto (a diferencia
 * del alta, que responde `creado: false` y deja elegir que hacer, ver
 * routes/venta.js y routes/clientesFinales.js). El cliente encontrado viaja
 * en el body del error para que el frontend pueda ofrecer "ver ese cliente"
 * en vez de un mensaje de error a secas, igual que hace la pantalla de alta.
 */
const assertDatosDisponibles = async (datos, id_cliente) => {
  const encontrado = await buscarClienteConDatoRepetido(datos, id_cliente);
  if (encontrado) {
    throw new HttpError(409, {
      message: `Ya existe otro cliente con ese ${ETIQUETA_POR_CAMPO[encontrado.campo]}.`,
      cliente: encontrado.cliente,
      campo: encontrado.campo,
    });
  }
};

// El telefono se busca CONCATENADO (cod_pais + cod_area + telefono, igual
// que se muestra en pantalla) para que buscar "91112345678" o solo un pedazo
// del numero encuentre al cliente sin que el usuario tenga que saber en que
// columna cae cada parte. cod_pais/cod_area son nullable: COALESCE los deja
// afuera de la concatenacion en vez de romperla con un NULL.
const TELEFONO_CONCAT = Prisma.sql`(COALESCE(cod_pais::text, '') || COALESCE(cod_area::text, '') || telefono::text)`;

/**
 * Condicion OR de la busqueda de un cliente: nombre, apellido, o telefono (si
 * el termino tiene digitos). No se compara contra el DNI: dejo de ser el dato
 * que identifica a un cliente en pantalla desde que paso a ser opcional.
 */
const condicionBusqueda = (termino) => {
  const patron = `%${termino}%`;
  const digitos = termino.replace(/\D/g, '');

  return Prisma.sql`(
    nombre ILIKE ${patron}
    OR apellido ILIKE ${patron}
    ${digitos ? Prisma.sql`OR ${TELEFONO_CONCAT} LIKE ${`%${digitos}%`}` : Prisma.empty}
  )`;
};

/**
 * Busqueda del selector de la venta: un solo termino que matchea por nombre,
 * apellido o telefono (el usuario no elige contra que campo busca).
 * `nombre + ' ' + apellido` tambien matchea, para poder tipear "Stefano Biglia".
 *
 * Dos pasos (ids primero, filas completas despues) porque `$queryRaw` no
 * devuelve instancias tipadas de Prisma: mismo patron que
 * `responderPaginaDeRemitos` en routes/remitos.js.
 */
const buscarClientes = async (termino, limite) => {
  const filas = await prisma.$queryRaw`
    SELECT id_cliente FROM "CLIENTES"
    WHERE ${condicionBusqueda(termino)}
    ORDER BY nombre ASC, apellido ASC
    LIMIT ${limite}`;

  const ids = filas.map((fila) => fila.id_cliente);
  if (ids.length === 0) return [];

  const clientes = await prisma.CLIENTES.findMany({ where: { id_cliente: { in: ids } } });
  const porId = new Map(clientes.map((cliente) => [cliente.id_cliente, cliente]));
  return ids.map((id) => porId.get(id));
};

/** Cliente por id; 404 si no existe (p. ej. lo borraron mientras se vendia). */
const obtenerCliente = async (id_cliente) => {
  const cliente = await prisma.CLIENTES.findUnique({ where: { id_cliente } });
  if (!cliente) throw new HttpError(404, { message: 'El cliente no existe.' });
  return cliente;
};

// Tamano de pagina del ABM standalone (routes/clientesFinales.js) cuando no
// se pide uno explicito. `buscarClientes` de arriba es otra cosa: el selector
// de la venta, que no pagina, solo recorta a un puñado de resultados.
const PAGINA_TAMANO_DEFAULT = 30;

/**
 * Listado paginado del ABM de clientes finales (routes/clientesFinales.js),
 * ordenado por apellido y nombre. Misma condicion OR de `buscarClientes`
 * cuando hay `busqueda`, pero paginado en vez de recortado a un `limite` fijo.
 * Mismo patron ids-primero-filas-despues que `responderPaginaDeRemitos`.
 */
const listarClientes = async ({ busqueda, pagina = 1, tamano = PAGINA_TAMANO_DEFAULT } = {}) => {
  const termino = typeof busqueda === 'string' ? busqueda.trim() : '';
  const where = termino ? condicionBusqueda(termino) : Prisma.sql`TRUE`;
  const offset = (pagina - 1) * tamano;

  const [filas, [{ total }]] = await prisma.$transaction([
    prisma.$queryRaw`
      SELECT id_cliente FROM "CLIENTES"
      WHERE ${where}
      ORDER BY apellido ASC, nombre ASC
      LIMIT ${tamano}::int OFFSET ${offset}::int`,
    prisma.$queryRaw`SELECT count(*)::int AS total FROM "CLIENTES" WHERE ${where}`,
  ]);

  const ids = filas.map((fila) => fila.id_cliente);
  const clientes = await prisma.CLIENTES.findMany({ where: { id_cliente: { in: ids } } });
  const porId = new Map(clientes.map((cliente) => [cliente.id_cliente, cliente]));

  return { clientes: ids.map((id) => porId.get(id)), total };
};

/**
 * Borra un cliente final. A diferencia de CLIENTES_MAYORISTAS, la FK de
 * REMITOS.id_cliente es opcional y Prisma le puso onDelete SetNull por
 * default (no Restrict): sin este chequeo, borrar un cliente con ventas
 * dejaria esos remitos con id_cliente NULL en silencio, perdiendo el dato
 * de quien compro. Se verifica a mano y se corta con 409 antes del delete.
 */
const eliminarCliente = async (id_cliente) => {
  const ventas = await prisma.REMITOS.count({ where: { id_cliente } });

  if (ventas > 0) {
    throw new HttpError(409, { message: 'No se puede eliminar: el cliente tiene ventas asociadas.' });
  }

  return prisma.CLIENTES.delete({ where: { id_cliente } });
};

module.exports = {
  parsearDatosCliente,
  buscarClienteConDatoRepetido,
  assertDatosDisponibles,
  buscarClientes,
  obtenerCliente,
  listarClientes,
  eliminarCliente,
};
