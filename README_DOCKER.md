# Docker Setup Guide

## Quick Start

### Development Environment

1. Copy environment file:
```bash
cp .env.example .env
```

2. Update `.env` with your settings

3. Start services:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

Or for production:
```bash
docker-compose up -d
```

### Services

- **postgres** - PostgreSQL database (port 5432)
- **backend** - FastAPI backend (port 8000)
- **frontend** - React frontend (port 3000)

## Development vs Production

### Development (`docker-compose.dev.yml`)

- Hot reload enabled for backend and frontend
- Source code mounted as volumes
- Debug mode enabled
- Auto-rebuild on code changes

### Production (`docker-compose.yml`)

- Optimized builds
- No volume mounts for source
- Production-optimized settings

## Environment Variables

See `.env.example` for all available variables.

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `API_KEY` - Optional API key for authentication
- `INBOUND_URL` - URL for inbound email endpoint
- `VITE_API_URL` - Frontend API URL
- `VITE_WS_URL` - WebSocket URL

## Volumes

### PostgreSQL Data
- `postgres_data_dev` (development)
- `postgres_data` (production)

### Attachments
- `./storage/attachments` - Mapped from host to container

## Networking

All services are on the `tempmail_network` bridge network:
- Backend accessible at `http://backend:8000` from frontend
- Frontend accessible at `http://localhost:3000` from host
- PostgreSQL accessible at `postgres:5432` from backend

## Useful Commands

### View logs
```bash
docker-compose -f docker-compose.dev.yml logs -f
docker-compose -f docker-compose.dev.yml logs -f backend
```

### Stop services
```bash
docker-compose -f docker-compose.dev.yml down
```

### Stop and remove volumes
```bash
docker-compose -f docker-compose.dev.yml down -v
```

### Rebuild services
```bash
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

### Execute commands in container
```bash
# Backend shell
docker-compose -f docker-compose.dev.yml exec backend sh

# Database shell
docker-compose -f docker-compose.dev.yml exec postgres psql -U tempmail -d tempmail

# Run migrations manually
docker-compose -f docker-compose.dev.yml exec backend alembic upgrade head
```

## Health Checks

- PostgreSQL: Checks if database is ready
- Backend: Auto-restarts on failure
- Frontend: Nginx health check

## Troubleshooting

### Backend can't connect to database
- Check `DATABASE_URL` in `.env`
- Ensure postgres service is healthy
- Check network connectivity: `docker network ls`

### Frontend can't reach backend
- Check `VITE_API_URL` in `.env`
- Verify backend is running: `docker-compose ps`
- Check nginx proxy config in `frontend/nginx.conf`

### Port conflicts
- Change ports in `.env`:
  - `BACKEND_PORT=8001`
  - `FRONTEND_PORT=3001`
  - `POSTGRES_PORT=5433`

## Production Deployment

1. Update `.env` with production values
2. Set `DEBUG=false`
3. Use strong `API_KEY`
4. Configure proper domain in `VITE_API_URL` and `VITE_WS_URL`
5. Use external database if needed
6. Set up SSL/TLS certificates

```bash
docker-compose up -d
```

