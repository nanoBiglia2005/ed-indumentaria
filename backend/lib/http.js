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

module.exports = { HttpError, asyncHandler };
