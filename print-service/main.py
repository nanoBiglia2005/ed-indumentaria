import asyncio
import os
import uuid
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

load_dotenv()

PRINTER_SERVICE_TOKEN = os.environ["PRINTER_SERVICE_TOKEN"]
JOB_ACK_TIMEOUT_SECONDS = 10

app = FastAPI()


class PrintJob(BaseModel):
    payload: dict


class ConnectionManager:

    def __init__(self) -> None:
        self.websocket: Optional[WebSocket] = None
        self.pending_acks: dict[str, "asyncio.Future[dict]"] = {}

    @property
    def is_connected(self) -> bool:
        return self.websocket is not None

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.websocket = websocket

    def disconnect(self) -> None:
        self.websocket = None
        for future in self.pending_acks.values():
            if not future.done():
                future.set_exception(ConnectionError("La conexión con el servicio de impresión se cerró"))
        self.pending_acks.clear()

    async def send_job(self, job_id: str, payload: dict) -> dict:
        if self.websocket is None:
            raise HTTPException(status_code=503, detail="La impresora local está desconectada")

        future: "asyncio.Future[dict]" = asyncio.get_event_loop().create_future()
        self.pending_acks[job_id] = future
        await self.websocket.send_json({"type": "print_job", "job_id": job_id, "payload": payload})

        try:
            return await asyncio.wait_for(future, timeout=JOB_ACK_TIMEOUT_SECONDS)
        except asyncio.TimeoutError as exc:
            raise HTTPException(status_code=504, detail="El servicio de impresión no respondió a tiempo") from exc
        finally:
            self.pending_acks.pop(job_id, None)

    def resolve_ack(self, job_id: str, result: dict) -> None:
        future = self.pending_acks.get(job_id)
        if future and not future.done():
            future.set_result(result)


manager = ConnectionManager()


@app.get("/health")
def health() -> dict:
    return {"printer_connected": manager.is_connected}


@app.post("/jobs")
async def create_job(job: PrintJob) -> dict:
    job_id = str(uuid.uuid4())
    return await manager.send_job(job_id, job.payload)


@app.websocket("/ws/printer")
async def printer_socket(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if token != PRINTER_SERVICE_TOKEN:
        await websocket.close(code=4401)
        return

    if manager.is_connected:
        await websocket.close(code=4409)
        return

    await manager.connect(websocket)
    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "ack":
                manager.resolve_ack(message["job_id"], message)
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect()
