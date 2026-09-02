"""Ruteo de trabajos de impresion hacia los printer-client del comercio.

Cada PC del local corre un printer-client que abre UN websocket contra este
servicio y se identifica con el token de su impresora. El backend, al pedir una
impresion, dice a que id_impresora va: los trabajos se rutean a ese websocket y
solo a ese. Nunca hay broadcast — un ticket de venta que sale en la impresora
equivocada expone datos de otra sucursal y nadie se entera.

Este servicio NO conoce los tokens: los valida contra el backend, que es el
unico que habla con la base. Guarda en memoria solo las conexiones vivas, asi
que reiniciarlo desconecta a todos los printer-client (reconectan solos, pero
por eso el deploy automatico no lo toca).
"""

import asyncio
import contextlib
import logging
import os
import secrets
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

load_dotenv()

# Secreto compartido con el backend (mismo valor en los dos .env): protege
# /jobs y es lo que este servicio presenta al backend para validar tokens.
PRINT_SERVICE_SECRET = os.environ["PRINT_SERVICE_SECRET"]
BACKEND_INTERNAL_URL = os.environ.get("BACKEND_INTERNAL_URL") or "http://127.0.0.1:5000"

JOB_ACK_TIMEOUT_SECONDS = 10
BACKEND_TIMEOUT_SECONDS = 3
# Un token revocado sigue valiendo, como mucho, este tiempo. El backend ademas
# pide /printers/{id}/disconnect al regenerarlo, asi que en la practica corta al
# instante; la cache es para no pegarle a la base en cada reintento de conexion.
TOKEN_CACHE_TTL_SECONDS = 60
TOKEN_CACHE_NEGATIVE_TTL_SECONDS = 30

# Codigos de cierre del websocket (4000-4999 es el rango libre del protocolo).
CLOSE_TOKEN_INVALIDO = 4401
CLOSE_REEMPLAZADA = 4409
CLOSE_BACKEND_CAIDO = 4503

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("print-service")

app = FastAPI()


class PrintJob(BaseModel):
    payload: dict
    # Obligatorio a proposito: sin destino no se adivina. Que el servicio elija
    # "la unica que hay" funciona hasta el dia que hay dos.
    id_impresora: int


def verificar_secreto(enviado: Optional[str]) -> None:
    if not enviado or not secrets.compare_digest(enviado, PRINT_SERVICE_SECRET):
        raise HTTPException(status_code=403, detail="Secreto de servicio inválido")


# ---------------------------------------------------------------------------
#  Validacion de tokens contra el backend
# ---------------------------------------------------------------------------

# token -> (impresora | None, vence_en). None cachea el rechazo: un cliente mal
# configurado reintenta con backoff y no tiene sentido consultar cada vez.
_cache_tokens: dict[str, tuple[Optional[dict], float]] = {}

BACKEND_CAIDO = object()


async def resolver_impresora(token: str):
    """Devuelve la impresora del token, None si es invalido, o BACKEND_CAIDO."""
    if not token:
        return None

    entrada = _cache_tokens.get(token)
    if entrada is not None and entrada[1] > time.monotonic():
        return entrada[0]

    try:
        async with httpx.AsyncClient(timeout=BACKEND_TIMEOUT_SECONDS) as cliente:
            respuesta = await cliente.post(
                f"{BACKEND_INTERNAL_URL}/interno/impresoras/validar-token",
                json={"token": token},
                headers={"X-Print-Secret": PRINT_SERVICE_SECRET},
            )
    except Exception as exc:
        # El backend se esta reiniciando (el deploy lo hace) o esta caido. Si
        # este token ya habia sido valido, se acepta con la entrada vencida: el
        # local no puede quedarse sin imprimir porque se reinicio ed-backend.
        if entrada is not None and entrada[0] is not None:
            logger.warning("Backend inaccesible (%s); se acepta el token cacheado", exc)
            return entrada[0]

        logger.error("No se pudo validar el token contra el backend: %s", exc)
        return BACKEND_CAIDO

    if respuesta.status_code == 200:
        impresora = respuesta.json()
        _cache_tokens[token] = (impresora, time.monotonic() + TOKEN_CACHE_TTL_SECONDS)
        return impresora

    if respuesta.status_code == 401:
        _cache_tokens[token] = (None, time.monotonic() + TOKEN_CACHE_NEGATIVE_TTL_SECONDS)
        return None

    # 403: los secretos de los dos .env no coinciden. No se cachea porque se
    # arregla del lado del servidor y conviene que se recupere solo.
    logger.error("El backend rechazó la consulta de token: %s", respuesta.status_code)
    return BACKEND_CAIDO


def olvidar_token_de(id_impresora: int) -> None:
    """Invalida la cache de una impresora (su token se regenero)."""
    for token, (impresora, _) in list(_cache_tokens.items()):
        if impresora is not None and impresora.get("id_impresora") == id_impresora:
            _cache_tokens.pop(token, None)


# ---------------------------------------------------------------------------
#  Conexiones vivas
# ---------------------------------------------------------------------------


@dataclass
class Conexion:
    websocket: WebSocket
    nombre: str
    pending_acks: dict[str, "asyncio.Future[dict]"] = field(default_factory=dict)

    def fallar_pendientes(self, motivo: str) -> None:
        for future in self.pending_acks.values():
            if not future.done():
                future.set_exception(ConnectionError(motivo))
        self.pending_acks.clear()


class ConnectionManager:

    def __init__(self) -> None:
        self.conexiones: dict[int, Conexion] = {}

    async def connect(self, impresora: dict, websocket: WebSocket) -> Conexion:
        await websocket.accept()
        id_impresora = impresora["id_impresora"]

        # Gana el ULTIMO que llega. El guard anterior hacia lo contrario
        # (rechazaba al nuevo) y un socket medio abierto —la PC se durmio, se
        # corto internet— dejaba a esa impresora afuera hasta que alguien
        # reiniciara el servicio, que es justo lo que el deploy no hace.
        anterior = self.conexiones.pop(id_impresora, None)
        if anterior is not None:
            logger.warning("Reemplazando la conexión de '%s'", anterior.nombre)
            anterior.fallar_pendientes("La conexión con la impresora fue reemplazada")
            with contextlib.suppress(Exception):
                await anterior.websocket.close(code=CLOSE_REEMPLAZADA)

        conexion = Conexion(websocket=websocket, nombre=impresora["nombre"])
        self.conexiones[id_impresora] = conexion
        return conexion

    def disconnect(self, id_impresora: int, conexion: Conexion) -> None:
        # Solo si sigue siendo la conexion actual: si ya la reemplazo otra, el
        # cierre tardio de la vieja no puede llevarse puesta a la nueva.
        if self.conexiones.get(id_impresora) is conexion:
            self.conexiones.pop(id_impresora, None)
        conexion.fallar_pendientes("La conexión con el servicio de impresión se cerró")

    async def send_job(self, id_impresora: int, job_id: str, payload: dict) -> dict:
        conexion = self.conexiones.get(id_impresora)
        if conexion is None:
            raise HTTPException(
                status_code=503, detail="La impresora seleccionada está desconectada"
            )

        future: "asyncio.Future[dict]" = asyncio.get_event_loop().create_future()
        conexion.pending_acks[job_id] = future
        await conexion.websocket.send_json(
            {"type": "print_job", "job_id": job_id, "payload": payload}
        )

        try:
            return await asyncio.wait_for(future, timeout=JOB_ACK_TIMEOUT_SECONDS)
        except asyncio.TimeoutError as exc:
            raise HTTPException(
                status_code=504, detail="La impresora no respondió a tiempo"
            ) from exc
        finally:
            conexion.pending_acks.pop(job_id, None)

    def resolve_ack(self, conexion: Conexion, job_id: str, result: dict) -> None:
        future = conexion.pending_acks.get(job_id)
        if future and not future.done():
            future.set_result(result)

    async def cerrar(self, id_impresora: int) -> bool:
        conexion = self.conexiones.get(id_impresora)
        if conexion is None:
            return False

        with contextlib.suppress(Exception):
            await conexion.websocket.close(code=CLOSE_TOKEN_INVALIDO)
        self.disconnect(id_impresora, conexion)
        return True


manager = ConnectionManager()


# ---------------------------------------------------------------------------
#  HTTP
# ---------------------------------------------------------------------------


@app.get("/health")
def health() -> dict:
    """Estado del servicio y de cada impresora conectada.

    Sin auth: lo consulta el smoke test del deploy por localhost y el backend
    para el ABM. No expone nada sensible (ni tokens ni trabajos).
    """
    return {
        "impresoras": [
            {"id_impresora": id_impresora, "nombre": conexion.nombre, "conectada": True}
            for id_impresora, conexion in manager.conexiones.items()
        ],
        "conectadas": len(manager.conexiones),
    }


@app.post("/jobs")
async def create_job(job: PrintJob, x_print_secret: Optional[str] = Header(default=None)) -> dict:
    verificar_secreto(x_print_secret)
    return await manager.send_job(job.id_impresora, str(uuid.uuid4()), job.payload)


@app.post("/printers/{id_impresora}/disconnect")
async def disconnect_printer(
    id_impresora: int, x_print_secret: Optional[str] = Header(default=None)
) -> dict:
    """Corta el websocket de una impresora. Lo llama el backend al regenerar su
    token: sin esto, el printer-client viejo seguiria imprimiendo hasta que
    venza la cache de validacion."""
    verificar_secreto(x_print_secret)
    olvidar_token_de(id_impresora)
    return {"desconectada": await manager.cerrar(id_impresora)}


async def rechazar(websocket: WebSocket, code: int) -> None:
    """Cierra el socket con un codigo que el cliente pueda leer.

    Hay que aceptar primero: un close ANTES del accept lo traduce uvicorn a un
    HTTP 403 en el handshake, y del otro lado se pierde el motivo. Aceptar por
    un instante a alguien sin credenciales no cuesta nada; que el operador del
    local no sepa por que no imprime, si.
    """
    await websocket.accept()
    with contextlib.suppress(Exception):
        await websocket.close(code=code)


@app.websocket("/ws/printer")
async def printer_socket(websocket: WebSocket) -> None:
    impresora = await resolver_impresora(websocket.query_params.get("token") or "")

    if impresora is None:
        logger.warning("Conexión rechazada: token inválido")
        await rechazar(websocket, CLOSE_TOKEN_INVALIDO)
        return

    if impresora is BACKEND_CAIDO:
        # 4503 y no 4401: el cliente tiene que reintentar con su backoff, no
        # concluir que su token esta mal.
        await rechazar(websocket, CLOSE_BACKEND_CAIDO)
        return

    id_impresora = impresora["id_impresora"]
    conexion = await manager.connect(impresora, websocket)
    logger.info("Impresora '%s' (id %s) conectada", impresora["nombre"], id_impresora)

    # El cliente loguea esto en la PC del comercio: es el diagnostico mas util
    # cuando alguien se equivoca de token entre dos maquinas.
    await websocket.send_json({"type": "bienvenida", **impresora})

    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "ack":
                manager.resolve_ack(conexion, message["job_id"], message)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(id_impresora, conexion)
        logger.info("Impresora '%s' (id %s) desconectada", impresora["nombre"], id_impresora)
