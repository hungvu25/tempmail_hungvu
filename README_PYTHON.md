# TempMail FastAPI Backend

A complete FastAPI backend for temporary email service with PostgreSQL, WebSocket support, and Docker setup.

## Project Structure

```
.
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── config.py              # Configuration settings
│   ├── database.py             # SQLAlchemy setup
│   ├── models.py               # SQLAlchemy models
│   ├── background.py          # Background cleanup tasks
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── inbound.py          # /api/inbound/mail endpoint
│   │   ├── inboxes.py          # Inbox management
│   │   ├── messages.py         # Message endpoints
│   │   ├── attachments.py      # Attachment download
│   │   └── websocket.py        # WebSocket endpoint
│   └── services/
│       ├── __init__.py
│       ├── email_parser.py     # Email parsing service
│       ├── attachment_service.py  # Attachment storage
│       └── websocket_manager.py   # WebSocket manager
├── alembic/                    # Database migrations
│   ├── versions/
│   │   └── 001_initial_migration.py
│   ├── env.py
│   └── script.py.mako
├── storage/
│   └── attachments/            # Attachment storage directory
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── alembic.ini
└── .env.example
```

## Features

- ✅ `/api/inbound/mail` endpoint accepting multipart POST from Postfix
- ✅ Inbox creation and management
- ✅ Message listing and retrieval
- ✅ Attachment download with security validation
- ✅ SQLAlchemy models with Alembic migrations
- ✅ Service layer for attachment storage
- ✅ WebSocket broadcasting for new messages
- ✅ Background cleanup task for expired inboxes
- ✅ Docker setup with PostgreSQL

## Setup

### Using Docker (Recommended)

1. Copy environment file:
```bash
cp .env.example .env
```

2. Start services:
```bash
docker-compose up -d
```

3. Access API docs:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Manual Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up PostgreSQL and configure `.env` file

3. Run migrations:
```bash
alembic upgrade head
```

4. Start server:
```bash
uvicorn app.main:app --reload
```

## API Endpoints

### Inbound Email
- `POST /api/inbound/mail` - Receive email from Postfix pipe

### Inboxes
- `POST /api/inboxes/` - Create inbox
- `GET /api/inboxes/{inbox_id}` - Get inbox details

### Messages
- `GET /api/messages/inbox/{inbox_id}` - List messages (with pagination)
- `GET /api/messages/{message_id}` - Get message details

### Attachments
- `GET /api/attachments/{attachment_id}` - Download attachment

### WebSocket
- `WS /ws/messages/{inbox_id}` - Real-time message notifications

## Postfix Configuration

Add to `/etc/postfix/main.cf`:

```
virtual_transport = pipe
virtual_pipe_maps = hash:/etc/postfix/virtual
```

Create `/etc/postfix/virtual`:
```
test@yourdomain.com pipe|curl -X POST http://localhost:8000/api/inbound/mail -F "email=@-"
```

## Security Features

- Email validation and sanitization
- Filename sanitization (prevents directory traversal)
- File size validation
- Path validation for file operations
- Attachment storage with secure paths

## Development

Run tests (when implemented):
```bash
pytest
```

Run migrations:
```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

