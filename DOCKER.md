# Docker Setup for TrackFinance

This project uses Docker Compose to orchestrate three services:
- **PostgreSQL** database
- **FastAPI** backend
- **React + Vite** frontend with Nginx

## Architecture

```
┌─────────────┐
│   Frontend  │ (port 3000)
│  (Nginx)    │
└──────┬──────┘
       │
       │ /api/* → proxied to backend
       │
┌──────▼──────┐
│   Backend   │ (port 8000)
│  (FastAPI)  │
└──────┬──────┘
       │
┌──────▼──────┐
│  PostgreSQL │ (port 5432)
└─────────────┘
```

## Quick Start

### Start all services
```bash
docker-compose up -d
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f postgres
```

### Stop all services
```bash
docker-compose down
```

### Rebuild services (after code changes)
```bash
# Rebuild all
docker-compose up -d --build

# Rebuild specific service
docker-compose up -d --build frontend
docker-compose up -d --build backend
```

### Clean up (remove volumes)
```bash
docker-compose down -v
```

## Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **PostgreSQL**: localhost:5432

## Environment Variables

### Backend
Set in `docker-compose.yaml`:
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: JWT secret key
- `API_HOST`: Host to bind (0.0.0.0)
- `API_PORT`: Port to bind (8000)

### Frontend
Create `.env` file in `frontend/` directory:
```env
VITE_API_URL=http://localhost:8000
```

For production, set `VITE_API_URL` to your production API URL.

## Development Workflow

### Local Development (without Docker)

**Backend:**
```bash
cd backend
source ../.venv/bin/activate
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Docker Development

The backend uses volume mounting for hot reload:
```yaml
volumes:
  - ./backend:/app
```

Changes to backend code will automatically reload the server.

For frontend changes, rebuild the container:
```bash
docker-compose up -d --build frontend
```

## Networking

All services are connected via the `trackfinance-network` bridge network, allowing them to communicate using service names:

- Frontend → Backend: `http://backend:8000`
- Backend → Postgres: `postgresql://postgres:postgres@postgres:5432/trackfinance`

The frontend uses Nginx to proxy `/api/*` requests to the backend, avoiding CORS issues.

## Troubleshooting

### Backend can't connect to database
```bash
docker-compose restart postgres
docker-compose logs postgres
```

### Frontend shows 502 Bad Gateway
```bash
# Check if backend is running
docker-compose ps
docker-compose logs backend
```

### Port already in use
```bash
# Check what's using the port
lsof -i :3000
lsof -i :8000
lsof -i :5432

# Stop the process or change ports in docker-compose.yaml
```

### Clear everything and start fresh
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## Production Considerations

1. **Change default credentials** in `docker-compose.yaml`
2. **Set strong SECRET_KEY** for JWT tokens
3. **Use environment variables** for sensitive data
4. **Enable HTTPS** with a reverse proxy (Traefik, Nginx)
5. **Use Docker secrets** for production deployments
6. **Implement proper logging** and monitoring
7. **Set up database backups**
8. **Use production-grade database** settings

## Database Migrations

Run migrations inside the backend container:
```bash
docker-compose exec backend alembic upgrade head
```

Create a new migration:
```bash
docker-compose exec backend alembic revision --autogenerate -m "description"
```

## Seed Initial Data

```bash
docker-compose exec backend python -m app.scripts.seed_achievements
```
