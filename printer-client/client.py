import asyncio
import json
import logging
import os
import ssl

import certifi
import websockets
from dotenv import load_dotenv

from imprimir_barcode import ANCHO_TICKET_POR_DEFECTO, imprimir_barcode, imprimir_remito

load_dotenv()

PRINT_SERVER_WS_URL = os.environ["PRINT_SERVER_WS_URL"]
PRINTER_SERVICE_TOKEN = os.environ["PRINTER_SERVICE_TOKEN"]
PRINTER_NAME = os.environ.get("PRINTER_NAME") or None
PRINTER_COLUMNS = int(os.environ.get("PRINTER_COLUMNS") or ANCHO_TICKET_POR_DEFECTO)
RECONNECT_DELAY_SECONDS = 5
RECONNECT_DELAY_MAX_SECONDS = 300

# Se usa el CA bundle de certifi en vez del almacen de certificados de Windows,
# que puede quedar desactualizado y rechazar certificados wss:// validos.
SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where()) if PRINT_SERVER_WS_URL.startswith("wss://") else None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("printer-client")


def handle_print_job(payload: dict) -> None:
    # Los trabajos viejos no traian "tipo": eran siempre codigos de barra.
    tipo = payload.get("tipo") or "barcode"

    if tipo == "barcode":
        codigo = (payload["barcode_header"] or "779000") + payload["barcode_tail"]
        imprimir_barcode(codigo, descripcion=payload.get("descripcion"), printer_name=PRINTER_NAME)
    elif tipo == "remito":
        imprimir_remito(payload, printer_name=PRINTER_NAME, columnas=PRINTER_COLUMNS)
    else:
        raise ValueError(f"Tipo de trabajo de impresión desconocido: {tipo}")


async def run() -> None:
    url = f"{PRINT_SERVER_WS_URL}?token={PRINTER_SERVICE_TOKEN}"
    reconnect_delay = RECONNECT_DELAY_SECONDS
    while True:
        try:
            async with websockets.connect(
                url, ssl=SSL_CONTEXT, additional_headers={"ngrok-skip-browser-warning": "true"}
            ) as websocket:
                logger.info("Conectado al servidor de impresión")
                reconnect_delay = RECONNECT_DELAY_SECONDS
                async for raw_message in websocket:
                    message = json.loads(raw_message)
                    if message.get("type") != "print_job":
                        continue

                    job_id = message["job_id"]
                    try:
                        handle_print_job(message["payload"])
                        ack = {"type": "ack", "job_id": job_id, "status": "ok"}
                    except Exception as exc:
                        logger.exception("Error al imprimir el trabajo %s", job_id)
                        # Con el tipo de excepcion incluido: un str(KeyError) pelado
                        # llega como "'barcode'" y no se entiende del lado del navegador.
                        ack = {
                            "type": "ack",
                            "job_id": job_id,
                            "status": "error",
                            "message": f"{type(exc).__name__}: {exc}",
                        }

                    await websocket.send(json.dumps(ack))
        except Exception as exc:
            logger.warning("Conexión perdida (%s); reintentando en %ss", exc, reconnect_delay)

        await asyncio.sleep(reconnect_delay)
        # Backoff exponencial hasta un tope: si el servicio esta caido por un
        # buen rato, no tiene sentido seguir golpeandolo cada 5 segundos.
        reconnect_delay = min(reconnect_delay * 2, RECONNECT_DELAY_MAX_SECONDS)


if __name__ == "__main__":
    asyncio.run(run())
