# TempMail Service

A temporary email service with backend API and frontend interface.

## Backend Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Run database migrations:
```bash
npm run migrate
```

4. Start development server:
```bash
npm run dev
```

5. Run tests:
```bash
npm test
```

## Architecture

- **Backend**: Node.js + Express
- **Database**: SQLite (easily switchable to PostgreSQL)
- **SMTP Server**: Built-in SMTP server for receiving emails
- **Security**: Rate limiting, input validation, secure file handling

