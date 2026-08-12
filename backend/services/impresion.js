// Comunicacion con el print-service (FastAPI) y armado del payload del ticket.
const PRINT_SERVICE_URL = process.env.PRINT_SERVICE_URL || 'http://localhost:8001';

const formatearFecha = (fecha) => {
  const valor = fecha ? new Date(fecha) : new Date();
  const dia = String(valor.getUTCDate()).padStart(2, '0');
  const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${valor.getUTCFullYear()}`;
};

const construirPayloadTicket = (items, recargoTarjeta, { id_remito = null, fecha = new Date() } = {}) => {
  const lineas = items.map((item) => ({
    descripcion: item.descripcion,
    cantidad: item.cantidad,
    precio_efectivo: item.precio_efectivo,
    precio_tarjeta: item.precio_tarjeta,
    subtotal_efectivo: item.precio_efectivo * item.cantidad,
    subtotal_tarjeta: item.precio_tarjeta * item.cantidad,
  }));

  return {
    tipo: 'remito',
    id_remito,
    fecha: formatearFecha(fecha),
    recargo_tarjeta: recargoTarjeta,
    total_efectivo: lineas.reduce((acumulado, linea) => acumulado + linea.subtotal_efectivo, 0),
    total_tarjeta: lineas.reduce((acumulado, linea) => acumulado + linea.subtotal_tarjeta, 0),
    items: lineas,
  };
};

const enviarTrabajoDeImpresion = async (payload) => {
  const respuesta = await fetch(`${PRINT_SERVICE_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
  });

  const resultado = await respuesta.json().catch(() => ({}));
  return { respuesta, resultado };
};

module.exports = { formatearFecha, construirPayloadTicket, enviarTrabajoDeImpresion };
