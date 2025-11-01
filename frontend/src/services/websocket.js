class WebSocketManager {
  constructor() {
    this.connections = new Map()
    this.listeners = new Map()
  }

  connect(inboxId, onMessage) {
    // Close existing connection if any
    if (this.connections.has(inboxId)) {
      this.disconnect(inboxId)
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 
                  `ws://${window.location.hostname}:8000`
    const ws = new WebSocket(`${wsUrl}/ws/messages/${inboxId}`)

    ws.onopen = () => {
      console.log(`WebSocket connected for inbox ${inboxId}`)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.event === 'new_message') {
          onMessage(data)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    ws.onerror = (error) => {
      console.error(`WebSocket error for inbox ${inboxId}:`, error)
    }

    ws.onclose = () => {
      console.log(`WebSocket disconnected for inbox ${inboxId}`)
      this.connections.delete(inboxId)
    }

    this.connections.set(inboxId, ws)
    return ws
  }

  disconnect(inboxId) {
    const ws = this.connections.get(inboxId)
    if (ws) {
      ws.close()
      this.connections.delete(inboxId)
    }
  }

  disconnectAll() {
    for (const inboxId of this.connections.keys()) {
      this.disconnect(inboxId)
    }
  }
}

export default new WebSocketManager()

