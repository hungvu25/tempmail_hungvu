# FastAPI TempMail Project Structure

## Complete File Tree

```
tempmail_hungvu/
│
├── app/
│   ├── __init__.py
│   ├── main.py                      # FastAPI application entry point
│   ├── config.py                    # Configuration with environment variables
│   ├── database.py                  # SQLAlchemy database setup
│   ├── models.py                    # SQLAlchemy models (Inbox, Message, Attachment)
│   ├── background.py                # Background cleanup tasks
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── inbound.py              # POST /api/inbound/mail (Postfix endpoint)
│   │   ├── inboxes.py              # POST/GET /api/inboxes/*
│   │   ├── messages.py             # GET /api/messages/*
│   │   ├── attachments.py          # GET /api/attachments/{id}
│   │   └── websocket.py             # WS /ws/messages/{inbox_id}
│   │
│   └── services/
│       ├── __init__.py
│       ├── email_parser.py          # Parse raw email bytes
│       ├── attachment_service.py     # Save/read attachments with security
│       └── websocket_manager.py      # WebSocket connection manager
│
├── alembic/                          # Database migrations
│   ├── versions/
│   │   └── 001_initial_migration.py  # Initial migration
│   ├── env.py                       # Alembic environment config
│   └── script.py.mako               # Migration template
│
├── storage/                         # Created at runtime
│   └── attachments/                # Attachment files stored here
│
├── requirements.txt                 # Python dependencies
├── Dockerfile                       # Docker image definition
├── docker-compose.yml               # Docker Compose (backend + postgres)
├── alembic.ini                      # Alembic configuration
├── .env.example                     # Environment variables template
├── .dockerignore                    # Docker ignore patterns
└── README_PYTHON.md                 # Project documentation
```

## Key Files Summary

### Core Application Files

1. **app/main.py** - FastAPI app initialization, includes all routers
2. **app/config.py** - Settings from environment variables
3. **app/database.py** - SQLAlchemy engine and session management
4. **app/models.py** - Database models with relationships

### API Endpoints

1. **app/routers/inbound.py**
   - `POST /api/inbound/mail` - Receives emails from Postfix pipe script
   - Accepts multipart/form-data or raw email body

2. **app/routers/inboxes.py**
   - `POST /api/inboxes/` - Create inbox
   - `GET /api/inboxes/{inbox_id}` - Get inbox details

3. **app/routers/messages.py**
   - `GET /api/messages/inbox/{inbox_id}` - List messages (paginated)
   - `GET /api/messages/{message_id}` - Get message details

4. **app/routers/attachments.py**
   - `GET /api/attachments/{attachment_id}` - Download attachment

5. **app/routers/websocket.py**
   - `WS /ws/messages/{inbox_id}` - Real-time notifications

### Services

1. **app/services/email_parser.py** - Parses raw email bytes, extracts body and attachments
2. **app/services/attachment_service.py** - Secure file storage with validation
3. **app/services/websocket_manager.py** - Manages WebSocket connections and broadcasts

### Database

1. **app/models.py** - Three models:
   - `Inbox` - Email inboxes with expiration
   - `Message` - Email messages
   - `Attachment` - File attachments

2. **alembic/versions/001_initial_migration.py** - Creates all tables with indexes and foreign keys

### Background Tasks

1. **app/background.py** - Cleanup task for expired inboxes (runs periodically)

## Security Features

- ✅ Email validation and sanitization
- ✅ Filename sanitization (prevents directory traversal)
- ✅ File size validation
- ✅ Path validation for all file operations
- ✅ Secure attachment storage paths

## Ready to Run

The project is ready to run with:

```bash
docker-compose up -d
```

Or manually:

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

