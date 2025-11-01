from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_manager import manager

router = APIRouter()

@router.websocket("/messages/{inbox_id}")
async def websocket_endpoint(websocket: WebSocket, inbox_id: str):
    """WebSocket endpoint for real-time message notifications"""
    await manager.connect(websocket, inbox_id)
    try:
        while True:
            # Keep connection alive and handle any messages from client
            data = await websocket.receive_text()
            # Echo back (optional)
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, inbox_id)

