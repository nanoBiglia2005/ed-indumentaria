// Endpoints servicio-a-servicio: los llama el print-service (ed-print) por
// localhost, NO un usuario del navegador.
//
// Por eso este router se monta ANTES de requireAuth en index.js: el print-service
// no tiene sesion de Auth.js. A cambio, todo lo que cuelga de aca exige el
// secreto compartido X-Print-Secret, y nginx solo proxea /api y /auth (Express
// ademas escucha en 127.0.0.1), asi que /interno no sale del VPS.
//
// La base es la unica fuente de verdad de los tokens de impresora: el
// print-service no los conoce, pregunta aca.
const crypto = require('node:crypto');
const express = require('express');
const { asyncHandler, HttpError } = require('../lib/http');
const { buscarPorToken } = require('../services/impresoras');

const router = express.Router();

const PRINT_SERVICE_SECRET = process.env.PRINT_SERVICE_SECRET || '';

// Comparacion de longitud constante: timingSafeEqual explota si los buffers
// miden distinto, asi que la longitud se chequea antes (y esa diferencia no
// filtra nada util). Sin secreto configurado no se autoriza a nadie: es mejor
// que el print-service falle ruidosamente a que /interno quede abierto.
const requireSecretoDeServicio = (req, res, next) => {
  const enviado = Buffer.from(req.get('X-Print-Secret') ?? '');
  const esperado = Buffer.from(PRINT_SERVICE_SECRET);

  const autorizado =
    esperado.length > 0 &&
    enviado.length === esperado.length &&
    crypto.timingSafeEqual(enviado, esperado);

  if (!autorizado) {
    return res.status(403).json({ message: 'Secreto de servicio invalido.' });
  }

  next();
};

router.use(requireSecretoDeServicio);

/**
 * Traduce el token con el que se conecta un printer-client a la impresora que
 * le corresponde. El print-service cachea la respuesta 60s, asi que esto se
 * llama en cada reconexion, no en cada trabajo.
 *
 * Una impresora desactivada no autentica: buscarPorToken filtra por `activa`,
 * asi que desactivarla desde el ABM la echa en cuanto vence la cache.
 */
router.post(
  '/impresoras/validar-token',
  asyncHandler(async (req, res) => {
    const impresora = await buscarPorToken(req.body?.token);

    if (!impresora) {
      throw new HttpError(401, { message: 'Token invalido.' });
    }

    res.status(200).json({ id_impresora: impresora.id_impresora, nombre: impresora.nombre });
  }, 'Error al validar el token de la impresora.')
);

module.exports = router;
