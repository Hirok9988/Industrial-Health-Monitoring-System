import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_manager import manager
from app.services.firestore_service import machine_exists

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/{machine_id}")
async def websocket_endpoint(websocket: WebSocket, machine_id: str):
    # Check if machine exists, close if invalid
    if not machine_exists(machine_id):
        logger.warning(f"WebSocket rejected: Machine '{machine_id}' does not exist.")
        await websocket.close(code=1008, reason="Machine not found")
        return

    await manager.connect(websocket, machine_id)
    try:
        while True:
            # We don't expect the client to send messages, 
            # but we wait for receive to handle disconnects gracefully.
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, machine_id)
    except Exception as e:
        logger.error(f"WebSocket connection error for {machine_id}: {e}")
        manager.disconnect(websocket, machine_id)
