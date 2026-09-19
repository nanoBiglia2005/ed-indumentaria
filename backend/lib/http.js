// Errores HTTP esperados: se lanzan desde los handlers/helpers y asyncHandler
// los responde con su status y body tal cual, sin loguear.
class HttpError extends Error {
  constructor(status, body) {
    super(body?.message ?? 'HttpError');
    this.status = status;
    this.body = body;
  }
}

// Envuelve un handler async y centraliza el catch que antes se repetia en cada ruta:
// - HttpError: responde status/body exactos (errores esperados, no se loguean).
// - Codigos de Prisma mapeados en `errores` (P2002/P2025/P2003): responde el
//   status y message propios de la ruta, con details = error.message.
// - Cualquier otro error: 500 con el `mensaje` literal de la ruta.
// `log` permite un texto de console.error distinto del mensaje HTTP (algunas rutas
// difieren en acentos); si no se pasa, se deriva del mensaje sin el punto final.
const asyncHandler = (fn, mensaje, { log, errores } = {}) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json(error.body);
    }

    console.error(`${log ?? mensaje.replace(/\.$/, '')}:`, error);

    const mapeado = errores?.[error.code];
    if (mapeado) {
      return res.status(mapeado.status).json({ message: mapeado.message, details: error.message });
    }

    res.status(500).json({ message: mensaje, details: error.message });
  }
};

// Detecta el error que tira el trigger de stock de la base (SQLSTATE ED001,
// ver prisma/migrations/20260919193941_flujo_de_stock_remitos/migration.sql:
// fn_mover_stock hace RAISE EXCEPTION con ese codigo cuando una venta dejaria
// "cant" negativa) y devuelve su mensaje limpio en español, sin el ruido de
// Prisma ("Invalid `prisma.x.create()` invocation..."). Devuelve null si el
// error no es este, para que el llamador siga con su manejo normal.
//
// Con el driver adapter (@prisma/adapter-pg, lo que usa backend/db.js) un
// RAISE EXCEPTION de un trigger dentro de `prisma.REMITOS.create()` no llega
// como PrismaClientUnknownRequestError ni como P2010: llega como
// PrismaClientKnownRequestError con code P2039 y el error real de Postgres
// colgado en `error.meta.driverAdapterError.cause` (con el SQLSTATE en
// `originalCode`/`code` y el mensaje en `originalMessage`). Se comprobo
// corriendo `prisma.REMITOS.create` contra la base local con una cantidad
// mayor al stock disponible. El fallback por texto es por si Prisma cambia de
// forma (por ejemplo sin el driver adapter): el codigo ED001 sigue apareciendo
// literal en el mensaje crudo que arma Prisma.
const errorDeStock = (error) => {
  const causa = error?.meta?.driverAdapterError?.cause;
  if (causa && (causa.originalCode === 'ED001' || causa.code === 'ED001')) {
    return causa.originalMessage ?? causa.message ?? null;
  }

  if (typeof error?.message === 'string' && error.message.includes('ED001')) {
    const match = error.message.match(/Message: `([^`]+)`/);
    if (match) return match[1];
  }

  return null;
};

module.exports = { HttpError, asyncHandler, errorDeStock };
