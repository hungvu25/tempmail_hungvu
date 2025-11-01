from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import inbound, inboxes, messages, attachments, websocket
from app.background import background_tasks
import asyncio

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TempMail API",
    description="Temporary Email Service Backend",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(inbound.router, prefix="/api/inbound", tags=["inbound"])
app.include_router(inboxes.router, prefix="/api/inboxes", tags=["inboxes"])
app.include_router(messages.router, prefix="/api/messages", tags=["messages"])
app.include_router(attachments.router, prefix="/api/attachments", tags=["attachments"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])

@app.on_event("startup")
async def startup_event():
    """Start background tasks"""
    asyncio.create_task(background_tasks.cleanup_expired_inboxes())

@app.get("/health")
async def health():
    return {"status": "ok"}

