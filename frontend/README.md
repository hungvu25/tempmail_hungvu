# TempMail Frontend

Vite + React frontend for the TempMail temporary email service.

## Features

- ✅ Inbox creation page
- ✅ Inbox view with message listing
- ✅ Real-time updates (polling + WebSocket)
- ✅ Message view with headers, text/HTML content
- ✅ Inline attachment display with download links
- ✅ Tailwind CSS styling
- ✅ Responsive design

## Setup

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Runs on http://localhost:3000

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file (optional):

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## Project Structure

```
frontend/
├── src/
│   ├── pages/
│   │   ├── CreateInbox.jsx      # Inbox creation page
│   │   ├── InboxView.jsx         # Inbox with message list
│   │   └── MessageView.jsx       # Individual message view
│   ├── services/
│   │   ├── api.js                # API client
│   │   └── websocket.js          # WebSocket manager
│   ├── App.jsx                   # Main app component
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Tailwind CSS
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## Features Breakdown

### Inbox Creation
- Enter email address or generate random one
- Creates inbox via `/api/inboxes` endpoint
- Navigates to inbox view on success

### Inbox View
- Lists all messages for the inbox
- Polls every 5 seconds for new messages
- WebSocket connection for real-time push notifications
- Pagination support
- Shows attachment count
- Displays preview of message content

### Message View
- Shows full message headers (From, To, Date, Subject)
- Displays text and HTML content (with tabs)
- Shows attachments with download buttons
- Inline HTML rendering
- Responsive layout

## API Integration

The frontend connects to the FastAPI backend:

- `POST /api/inboxes/` - Create inbox
- `GET /api/inboxes/{id}` - Get inbox details
- `GET /api/messages/inbox/{id}` - List messages
- `GET /api/messages/{id}` - Get message details
- `GET /api/attachments/{id}` - Download attachment
- `WS /ws/messages/{id}` - WebSocket for real-time updates

## WebSocket

The WebSocket connection:
- Connects when inbox view loads
- Listens for `new_message` events
- Automatically refreshes message list on new message
- Handles reconnection on disconnect

## Styling

Uses Tailwind CSS for all styling:
- Responsive design
- Clean, modern UI
- Hover effects and transitions
- Consistent color scheme

