# TrackFinance - Quick Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Update .do/app.yaml
- [x] GitHub repo is set to: `ioulasri/TrackFinance`
- [ ] Change SECRET_KEY to a random 32+ character string
- [ ] Update region if needed (default: nyc)

### 2. Push to GitHub
```bash
git add .
git commit -m "Ready for DigitalOcean deployment"
git push origin main
```

### 3. Deploy on DigitalOcean

#### Option A: Using App Spec (Easiest)
1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Select "GitHub" → Connect to `ioulasri/TrackFinance`
4. Click "Edit App Spec"
5. Copy contents from `.do/app.yaml`
6. **IMPORTANT**: Change the SECRET_KEY value to something random
7. Click "Save" → "Create Resources"

#### Option B: Manual Setup
1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App" → GitHub → Select repo
3. **Add Database:**
   - Type: PostgreSQL 15
   - Name: trackfinance-db
   - Size: Basic ($15/month)

4. **Add Backend Service:**
   - Name: backend
   - Source: /backend
   - Build from Dockerfile: docker/backend.dockerfile
   - HTTP Port: 8000
   - Size: Basic XXS ($5/month)
   - Environment Variables:
     ```
     DATABASE_URL = ${db.DATABASE_URL}
     SECRET_KEY = <random-32-character-string>
     ENVIRONMENT = production
     API_HOST = 0.0.0.0
     API_PORT = 8000
     ```

5. **Add Frontend Static Site:**
   - Name: frontend
   - Source: /frontend
   - Build Command: `npm install && npm run build`
   - Output Directory: `dist`
   - Environment Variables:
     ```
     VITE_API_URL = ${backend.PUBLIC_URL}
     ```

6. Click "Create Resources"

### 4. Post-Deployment

Once deployed (takes ~5-10 minutes):

1. **Run migrations** in backend console:
   ```bash
   alembic upgrade head
   python -m app.scripts.seed_achievements
   ```

2. **Test your app:**
   - Frontend: https://trackfinance-xxxxx.ondigitalocean.app
   - Backend: https://trackfinance-xxxxx.ondigitalocean.app/api
   - API Docs: https://trackfinance-xxxxx.ondigitalocean.app/docs

### 5. (Optional) Custom Domain

If you have a domain from your Student Pack:
1. Go to Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## 🔧 Configuration Changes Made

✅ Updated CORS to allow all origins in production
✅ Added ENVIRONMENT variable support
✅ Created post_deploy.sh script
✅ Updated .do/app.yaml with your GitHub repo

## 💰 Monthly Cost

- Database: $15/month
- Backend: $5/month
- Frontend: FREE
- **Total: $20/month**
- **Your Student Pack: $200 credit = 10 months FREE!**

## 🐛 Troubleshooting

### App won't start
- Check logs in DigitalOcean dashboard
- Verify environment variables are set
- Make sure DATABASE_URL is linked correctly

### Database connection error
- Ensure DATABASE_URL uses internal connection string
- Check database is in same region as app

### Frontend can't reach backend
- Verify VITE_API_URL is set to ${backend.PUBLIC_URL}
- Check backend health endpoint returns 200

### Need to run migrations again
- Go to backend service → Console tab
- Run: `alembic upgrade head`

## 📚 Useful Commands

```bash
# View logs
Go to app → Runtime Logs in DigitalOcean dashboard

# Run migrations
Backend console → alembic upgrade head

# Seed data
Backend console → python -m app.scripts.seed_achievements

# Restart app
Apps → backend → Settings → Restart
```

## 🎉 You're Done!

Your app is now live and accessible worldwide! Share the URL with friends and enjoy your gamified finance tracker!

Remember: Your $200 credit covers 10 months of hosting!
