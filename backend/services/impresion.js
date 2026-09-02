// Comunicacion con el print-service (FastAPI) y armado del payload del ticket.
//
// OJO con el formato: el printer-client corre en OTRA maquina (es un servicio
// aparte, ver printer-client/imprimir_barcode.py) y lee claves fijas
// —precio_efectivo, subtotal_tarjeta, total_tarjeta—, o sea que el ticket
// imprime exactamente DOS columnas de precio. Por eso, aunque el sistema ya
// maneja N metodos de pago, aca se eligen dos: el precio base y el primer
// metodo con recargo. Para imprimir mas columnas hay que tocar tambien el
// printer-client y redesplegarlo.
const { precioConRecargo } = require('./preciosPorMetodo');

const PRINT_SERVICE_URL = process.env.PRINT_SERVICE_URL || 'http://localhost:8001';

// Secreto compartido con el print-service (mismo valor en los dos .env). El
// print-service escucha solo en localhost, pero /jobs sin autenticar significa
// que cualquier proceso del VPS puede imprimir en el local; y el mismo secreto
// protege el endpoint interno que el print-service usa para validar tokens.
const PRINT_SERVICE_SECRET = process.env.PRINT_SERVICE_SECRET || '';

const cabecerasDeServicio = () => ({
  'Content-Type': 'application/json',
  'X-Print-Secret': PRINT_SERVICE_SECRET,
});

const formatearFecha = (fecha) => {
  const valor = fecha ? new Date(fecha) : new Date();
  const dia = String(valor.getUTCDate()).padStart(2, '0');
  const mes = String(valor.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${valor.getUTCFullYear()}`;
};

// El metodo "con recargo" del ticket: el primero que tenga uno. Si no hay
// ninguno, las dos columnas del ticket muestran lo mismo.
const metodoConRecargo = (metodos) => metodos.find((metodo) => metodo.recargo > 0) ?? null;

/**
 * `items` son las lineas de la venta ({ descripcion, cantidad, precio }), con
 * el precio base ya redondeado. Los totales se arman con la misma regla que el
 * resto del sistema (redondear por linea y sumar), asi que el ticket coincide
 * con lo que muestra la pantalla y con lo que se cobra.
 */
const construirPayloadTicket = (items, metodos, { id_remito = null, fecha = new Date() } = {}) => {
  const conRecargo = metodoConRecargo(metodos);
  const recargo = conRecargo?.recargo ?? 0;

  const lineas = items.map((item) => {
    const precioEfectivo = item.precio;
    const precioTarjeta = precioConRecargo(precioEfectivo, recargo);

    return {
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precio_efectivo: precioEfectivo,
      precio_tarjeta: precioTarjeta,
      subtotal_efectivo: precioEfectivo * item.cantidad,
      subtotal_tarjeta: precioTarjeta * item.cantidad,
    };
  });

  return {
    tipo: 'remito',
    id_remito,
    fecha: formatearFecha(fecha),
    recargo_tarjeta: recargo,
    total_efectivo: lineas.reduce((acumulado, linea) => acumulado + linea.subtotal_efectivo, 0),
    total_tarjeta: lineas.reduce((acumulado, linea) => acumulado + linea.subtotal_tarjeta, 0),
    items: lineas,
  };
};

// El print-service espera hasta 10s el ack de la impresora
// (JOB_ACK_TIMEOUT_SECONDS en print-service/main.py:13). Se corta un poco
// despues para no dejar colgada la request del usuario si no responde nada.
const TIMEOUT_IMPRESION_MS = 15000;

// Las consultas de estado no esperan a ninguna impresora, solo a ed-print
// contestando por localhost: si tarda mas que esto, esta caido.
const TIMEOUT_ESTADO_MS = 2000;

/**
 * `id_impresora` viaja FUERA del payload, en el body de /jobs: el payload es un
 * contrato congelado con el printer-client (ver el comentario de arriba y
 * test/impresion.test.js), y a que impresora va el trabajo es cosa del
 * print-service, no del ticket. Quien decide ese id es
 * services/impresoras.js, con el rol de la sesion.
 */
const enviarTrabajoDeImpresion = async (payload, { id_impresora }) => {
  const respuesta = await fetch(`${PRINT_SERVICE_URL}/jobs`, {
    method: 'POST',
    headers: cabecerasDeServicio(),
    body: JSON.stringify({ payload, id_impresora }),
    signal: AbortSignal.timeout(TIMEOUT_IMPRESION_MS),
  });

  const resultado = await respuesta.json().catch(() => ({}));
  return { respuesta, resultado };
};

/**
 * Que impresoras tienen ahora mismo su printer-client conectado. Es informativo
 * (lo muestra el ABM), asi que NUNCA puede hacer fallar la request: si ed-print
 * no responde en 2s se devuelve la lista vacia y todas figuran desconectadas.
 */
const estadoDeImpresoras = async () => {
  try {
    const respuesta = await fetch(`${PRINT_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(TIMEOUT_ESTADO_MS),
    });
    if (!respuesta.ok) return [];

    const { impresoras } = await respuesta.json();
    return Array.isArray(impresoras) ? impresoras : [];
  } catch (error) {
    console.error('No se pudo consultar el estado de las impresoras:', error.message);
    return [];
  }
};

/**
 * Corta el websocket de una impresora. Se llama al regenerar su token: el
 * print-service cachea la validacion 60s, asi que sin esto el printer-client
 * viejo seguiria imprimiendo un rato con el token que ya no vale.
 * Es best-effort: que falle no puede impedir la regeneracion.
 */
const desconectarImpresora = async (id_impresora) => {
  try {
    await fetch(`${PRINT_SERVICE_URL}/printers/${id_impresora}/disconnect`, {
      method: 'POST',
      headers: cabecerasDeServicio(),
      signal: AbortSignal.timeout(TIMEOUT_ESTADO_MS),
    });
  } catch (error) {
    console.error('No se pudo desconectar la impresora del print-service:', error.message);
  }
};

module.exports = {
  formatearFecha,
  metodoConRecargo,
  construirPayloadTicket,
  enviarTrabajoDeImpresion,
  estadoDeImpresoras,
  desconectarImpresora,
};
