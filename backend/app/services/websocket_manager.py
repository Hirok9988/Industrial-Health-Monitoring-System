import logging
import json
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages WebSocket connections for real-time dashboard updates.
    Connections are bucketed by machine_id.
    """
    def __init__(self):
        # machine_id -> List[WebSocket]
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, machine_id: str):
        await websocket.accept()
        if machine_id not in self.active_connections:
            self.active_connections[machine_id] = []
        self.active_connections[machine_id].append(websocket)
        logger.info(f"WebSocket client connected to {machine_id}. Total clients for {machine_id}: {len(self.active_connections[machine_id])}")

    def disconnect(self, websocket: WebSocket, machine_id: str):
        if machine_id in self.active_connections:
            if websocket in self.active_connections[machine_id]:
                self.active_connections[machine_id].remove(websocket)
                logger.info(f"WebSocket client disconnected from {machine_id}. Total clients for {machine_id}: {len(self.active_connections[machine_id])}")
            if not self.active_connections[machine_id]:
                del self.active_connections[machine_id]

    async def broadcast(self, machine_id: str, message: dict):
        """
        Broadcasts a JSON message to all clients connected to a specific machine.
        """
        if machine_id in self.active_connections:
            # We iterate over a copy of the list so that if a connection drops and we remove it,
            # we don't mutate the list while iterating.
            for connection in list(self.active_connections[machine_id]):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to client on {machine_id}: {e}")
                    self.disconnect(connection, machine_id)

manager = ConnectionManager()
