from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    """Manage WebSocket connections and broadcast messages"""
    
    def __init__(self):
        # Map of inbox_id -> list of WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, inbox_id: str):
        """Accept WebSocket connection and register it"""
        await websocket.accept()
        
        if inbox_id not in self.active_connections:
            self.active_connections[inbox_id] = []
        
        self.active_connections[inbox_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, inbox_id: str):
        """Remove WebSocket connection"""
        if inbox_id in self.active_connections:
            try:
                self.active_connections[inbox_id].remove(websocket)
                if not self.active_connections[inbox_id]:
                    del self.active_connections[inbox_id]
            except ValueError:
                pass
    
    async def broadcast_to_inbox(self, inbox_id: str, message: dict):
        """Broadcast message to all connections for an inbox"""
        if inbox_id not in self.active_connections:
            return
        
        # Send to all connections for this inbox
        disconnected = []
        for connection in self.active_connections[inbox_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                # Connection closed, mark for removal
                disconnected.append(connection)
        
        # Remove disconnected connections
        for connection in disconnected:
            self.disconnect(connection, inbox_id)

manager = ConnectionManager()

async def broadcast_new_message(inbox_id: str, message_id: str):
    """Broadcast new message event to WebSocket subscribers"""
    await manager.broadcast_to_inbox(inbox_id, {
        "event": "new_message",
        "inbox_id": inbox_id,
        "message_id": message_id
    })

