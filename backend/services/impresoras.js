// Registro de impresoras y resolucion del destino de cada trabajo.
//
// El sistema soporta N impresoras: una fila en IMPRESORAS por cada PC del
// comercio que corre un printer-client. El ruteo lo hace el print-service con
// el id que le manda el backend (services/impresion.js); aca se decide CUAL es
// ese id y se maneja el token con el que cada printer-client se autentica.
//
// El token en claro no se guarda: solo su sha256. Se muestra una unica vez, al
// crear la impresora o al regenerarlo. sha256 sin salt alcanza porque el token
// son 32 bytes aleatorios (no hay diccionario que atacar); para una contrasena
// de persona no alcanzaria.
const crypto = require('node:crypto');
const prisma = require('../db');
const { HttpError } = require('../lib/http');
const { ROLES_ELIGEN_IMPRESORA } = require('../constants/impresion');

/**
 * UNICO lugar donde se decide a que impresora va un trabajo. Es PURA: no toca
 * la base ni la sesion, recibe todo resuelto. Devuelve { id_impresora } o
 * { error: { status, message } }.
 *
 * REGLA DE SEGURIDAD: `rol` sale SIEMPRE de res.locals.session. Si ese rol no
 * puede elegir, `idPedido` se IGNORA por completo. No se responde 403 a
 * proposito: el trabajo sale igual por la predeterminada, y devolver un error
 * solo le confirmaria a quien prueba que el parametro existe.
 *
 * Orden: la elegida (solo si el rol puede) > la asignada al usuario > la
 * predeterminada global. Una impresora desactivada NUNCA es destino: no esta en
 * `activas`, asi que no puede ganar por ninguno de los tres caminos.
 */
const resolverImpresora = ({ rol, idPedido = null, idAsignada = null, activas = [] }) => {
  if (activas.length === 0) {
    return {
      error: {
        status: 409,
        message: 'No hay ninguna impresora configurada. Agregá una en Configuración.',
      },
    };
  }

  const idsActivas = new Set(activas.map((impresora) => impresora.id_impresora));
  const puedeElegir = ROLES_ELIGEN_IMPRESORA.includes(rol);

  if (puedeElegir && idPedido !== null) {
    if (!idsActivas.has(idPedido)) {
      return {
        error: { status: 400, message: 'La impresora elegida no existe o está desactivada.' },
      };
    }
    return { id_impresora: idPedido };
  }

  // Sin eleccion explicita: la asignada al usuario, si sigue activa. Que la
  // hayan desactivado no puede dejarlo sin imprimir; cae a la predeterminada.
  if (puedeElegir && idAsignada !== null && idsActivas.has(idAsignada)) {
    return { id_impresora: idAsignada };
  }

  const predeterminada = activas.find((impresora) => impresora.es_predeterminada);
  if (!predeterminada) {
    // El indice unico parcial de la base y el ABM lo hacen imposible; si igual
    // pasa hay que avisarlo, no elegir una impresora cualquiera.
    return {
      error: {
        status: 409,
        message: 'No hay una impresora predeterminada configurada.',
      },
    };
  }

  return { id_impresora: predeterminada.id_impresora };
};

// 32 bytes aleatorios en base64url: entra en una linea de .env sin escapes.
const generarToken = () => crypto.randomBytes(32).toString('base64url');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Solo las activas: una impresora desactivada no autentica ni recibe trabajos.
const listarActivas = () =>
  prisma.IMPRESORAS.findMany({
    where: { activa: true },
    orderBy: { id_impresora: 'asc' },
  });

/**
 * Impresora que corresponde a un token de printer-client, o null.
 * La comparacion es por igualdad de hash en la base: el secreto no se compara
 * en memoria, asi que no hace falta timingSafeEqual.
 */
const buscarPorToken = (token) =>
  typeof token === 'string' && token.length > 0
    ? prisma.IMPRESORAS.findFirst({ where: { token_hash: hashToken(token), activa: true } })
    : Promise.resolve(null);

/**
 * Deja `id` como la unica predeterminada. Va en dos sentencias dentro de una
 * transaccion porque el indice unico parcial impresoras_predeterminada_unica se
 * evalua por sentencia: sin el clear previo, el update choca con la anterior.
 */
const fijarPredeterminada = async (tx, id_impresora) => {
  await tx.IMPRESORAS.updateMany({
    where: { es_predeterminada: true, NOT: { id_impresora } },
    data: { es_predeterminada: false },
  });
  await tx.IMPRESORAS.update({ where: { id_impresora }, data: { es_predeterminada: true } });
};

/**
 * La impresora asignada se lee de la base en CADA impresion, nunca del JWT: la
 * sesion cachea el usuario hasta el proximo login y un admin puede cambiar su
 * impresora en cualquier momento (el `rol` si viene del JWT y arrastra ese
 * problema, pero es preexistente de todo el sistema de roles).
 */
const contextoDeSesion = async (session) => {
  const rol = session?.user?.rol ?? null;
  const id_usuario = session?.user?.id_usuario ?? null;

  if (id_usuario === null) return { rol, idAsignada: null };

  const usuario = await prisma.USUARIOS.findUnique({
    where: { id_usuario },
    select: { id_impresora: true },
  });

  return { rol, idAsignada: usuario?.id_impresora ?? null };
};

/**
 * Lo que llaman las rutas que imprimen: resuelve el destino y lanza HttpError
 * si no hay ninguno posible. `idPedido` es lo que vino en el body, sin filtrar:
 * resolverImpresora se encarga de ignorarlo cuando no corresponde.
 */
const resolverDestinoParaSesion = async (session, idPedido = null) => {
  const [{ rol, idAsignada }, activas] = await Promise.all([
    contextoDeSesion(session),
    listarActivas(),
  ]);

  const { id_impresora, error } = resolverImpresora({ rol, idPedido, idAsignada, activas });
  if (error) throw new HttpError(error.status, { message: error.message });

  return { id_impresora };
};

// El rol puede elegir impresora. Lo usa GET /api/impresoras para que el
// frontend sepa si mostrar el selector; quien decide de verdad es
// resolverImpresora.
const puedeElegirImpresora = (rol) => ROLES_ELIGEN_IMPRESORA.includes(rol);

module.exports = {
  resolverImpresora,
  generarToken,
  hashToken,
  listarActivas,
  buscarPorToken,
  fijarPredeterminada,
  contextoDeSesion,
  resolverDestinoParaSesion,
  puedeElegirImpresora,
};
