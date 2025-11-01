# Frontend Setup Guide

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

The app will run on http://localhost:3000

## File Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── CreateInbox.jsx       # Create inbox page
│   │   ├── InboxView.jsx         # Inbox with message list (polling + WebSocket)
│   │   └── MessageView.jsx       # Individual message view
│   ├── services/
│   │   ├── api.js                # API client (axios)
│   │   └── websocket.js          # WebSocket manager
│   ├── App.jsx                   # Main router
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Tailwind CSS
├── package.json                  # Dependencies
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
└── index.html                    # HTML template
```

## Components Overview

### CreateInbox.jsx
- Form to create new inbox
- Email input with "Generate" button
- Calls `/api/inboxes/` POST endpoint
- Navigates to inbox view on success

### InboxView.jsx
- Displays inbox information
- Lists messages with pagination
- **Polling**: Fetches messages every 5 seconds
- **WebSocket**: Connects to `/ws/messages/{inboxId}` for real-time push
- Shows attachment count badges
- Message preview snippets

### MessageView.jsx
- Full message display
- Headers (From, To, Date, Subject)
- Text/HTML content tabs
- Attachment list with download buttons
- Inline HTML rendering

## Features

### Real-time Updates
The inbox view uses two mechanisms:
1. **Polling**: Every 5 seconds, fetches new messages
2. **WebSocket**: Receives `new_message` events and refreshes immediately

### WebSocket Integration
- Automatically connects when inbox view loads
- Listens for `new_message` events
- Refreshes message list on event
- Handles disconnections gracefully

### API Client
- Uses axios for HTTP requests
- Base URL configurable via `VITE_API_URL`
- Error handling for expired inboxes

## Configuration

### Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### Vite Proxy

The `vite.config.js` includes proxy configuration:
- `/api/*` → `http://localhost:8000/api/*`
- `/ws/*` → `ws://localhost:8000/ws/*`

This allows development without CORS issues.

## Styling

Uses Tailwind CSS:
- Utility-first CSS framework
- Responsive design classes
- Consistent color scheme
- Hover effects and transitions

## Production Build

```bash
npm run build
```

Outputs to `dist/` directory.

## Testing the Integration

1. Start FastAPI backend: `uvicorn app.main:app --reload`
2. Start frontend: `npm run dev`
3. Create an inbox
4. Send email to the inbox address (via Postfix or mailpipe script)
5. Watch messages appear in real-time!

## Notes

- Update domain in `CreateInbox.jsx` (currently `yourdomain.com`)
- WebSocket falls back to stderr logging if connection fails
- Polling stops if inbox expires (410 status)
- All API errors are displayed to user

