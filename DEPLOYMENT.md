# DigitalOcean Deployment Configuration

## Backend and Frontend Connection

### Option 1: Set Environment Variable in DigitalOcean (Recommended)

In your DigitalOcean App Platform:

1. Go to your **Frontend App Settings**
2. Navigate to **Environment Variables**
3. Add:
   ```
   VITE_API_URL=${backend.PUBLIC_URL}
   ```
   (This references your backend component automatically)
4. Redeploy the frontend

### Option 2: Already Configured!

The `frontend/.env.production` file already contains:

```env
VITE_API_URL=${backend.PUBLIC_URL}
```

This will automatically resolve to your backend URL in DigitalOcean.

## How to Find Your Backend URL

1. Go to DigitalOcean Dashboard
2. Click on your backend app
3. Copy the URL (should look like: `https://backend-xxx.ondigitalocean.app`)
4. Use that URL in the VITE_API_URL variable

## Testing the Connection

After deployment, open browser console (F12) and check for:

✅ Good:
```
🔌 API URL: https://backend-xxx.ondigitalocean.app
```

❌ Bad:
```
❌ Cannot connect to backend at: http://localhost:8000
```

## Common Issues

### 1. CORS Errors
**Solution:** Backend is already configured with CORS enabled for all origins in production

### 2. 404 Not Found on API Calls
**Solution:** Make sure VITE_API_URL doesn't have trailing slash
- ✅ Correct: `https://backend-xxx.ondigitalocean.app`
- ❌ Wrong: `https://backend-xxx.ondigitalocean.app/`

### 3. Network Error / Cannot Connect
**Solution:** 
- Check backend is deployed and running
- Verify backend URL is correct
- Check backend logs for errors

## Deployment Structure

### Two-App Setup (Recommended)
- **Frontend App:** Serves React build (nginx)
  - Environment: VITE_API_URL
- **Backend App:** Serves FastAPI
  - Environment: DATABASE_URL, ENVIRONMENT=production

### Single-App Setup
If both services are in one app:
```env
VITE_API_URL=http://localhost:8000
```
(Services communicate internally)

## Quick Test

After deployment, test the backend directly:
```bash
curl https://your-backend-app-name.ondigitalocean.app/
```

Should return:
```json
{
  "message": "Welcome to Financial Quest API",
  "docs": "/docs",
  "version": "1.0.0"
}
```

## Environment Variables Reference

### Frontend
- `VITE_API_URL` - Backend API base URL (required in production)

### Backend
- `DATABASE_URL` - PostgreSQL connection string
- `ENVIRONMENT=production` - Enables production mode
- `SECRET_KEY` - JWT secret key
- `ALLOWED_ORIGINS` - CORS origins (defaults to "*" in production)
