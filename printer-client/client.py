import asyncio
import json
import logging
import os
import ssl

import certifi
import websockets
from dotenv import load_dotenv

from imprimir_barcode import imprimir_barcode

load_dotenv()

PRINT_SERVER_WS_URL = os.environ["PRINT_SERVER_WS_URL"]
PRINTER_SERVICE_TOKEN = os.environ["PRINTER_SERVICE_TOKEN"]
PRINTER_NAME = os.environ.get("PRINTER_NAME") or None
RECONNECT_DELAY_SECONDS = 5

# Se usa el CA bundle de certifi en vez del almacen de certificados de Windows,
# que puede quedar desactualizado y rechazar certificados wss:// validos.
SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where()) if PRINT_SERVER_WS_URL.startswith("wss://") else None

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("printer-client")


def handle_print_job(payload: dict) -> None:
    imprimir_barcode(payload["barcode"], printer_name=PRINTER_NAME)


async def run() -> None:
    url = f"{PRINT_SERVER_WS_URL}?token={PRINTER_SERVICE_TOKEN}"
    while True:
        try:
            async with websockets.connect(
                url, ssl=SSL_CONTEXT, additional_headers={"ngrok-skip-browser-warning": "true"}
            ) as websocket:
                logger.info("Conectado al servidor de impresión")
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
                        ack = {"type": "ack", "job_id": job_id, "status": "error", "message": str(exc)}

                    await websocket.send(json.dumps(ack))
        except Exception as exc:
            logger.warning("Conexión perdida (%s); reintentando en %ss", exc, RECONNECT_DELAY_SECONDS)

        await asyncio.sleep(RECONNECT_DELAY_SECONDS)


if __name__ == "__main__":
    asyncio.run(run())
