# Deployment Guide

## Environment Variables Required

### Backend
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
SECRET_KEY=your-super-secret-key-min-32-chars
```

### Frontend
```
VITE_API_URL=https://your-backend-url.com
```

## Render.com Deployment

### Database
1. New PostgreSQL instance
2. Copy Internal Database URL

### Backend
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Root: `backend`

### Frontend
- Build: `npm install && npm run build`
- Publish: `dist`
- Root: `frontend`

## Post-Deployment
Run in backend shell:
```bash
alembic upgrade head
python -m app.scripts.seed_achievements
```
