# Deploy TrackFinance with GitHub Student Pack

## DigitalOcean App Platform (RECOMMENDED)

### Prerequisites
✅ GitHub Student Pack activated
✅ $200 DigitalOcean credit redeemed
✅ Code pushed to GitHub

### Step-by-Step Deployment

#### 1. Activate Student Pack
- Go to: https://education.github.com/pack
- Click "Get your Pack"
- Scroll to DigitalOcean → Click "Get access"
- Follow instructions to redeem $200 credit

#### 2. Create App on DigitalOcean

**Option A: Using App Spec (Automated)**
1. Log in to [DigitalOcean](https://cloud.digitalocean.com)
2. Go to Apps → Create App
3. Connect your GitHub account
4. Select `TrackFinance` repository
5. Upload `.do/app.yaml` spec file
6. Review and create

**Option B: Manual Setup**
1. Log in to [DigitalOcean](https://cloud.digitalocean.com)
2. Go to Apps → Create App
3. Connect GitHub → Select `TrackFinance` repo

**Add Database:**
- Type: PostgreSQL
- Name: trackfinance-db
- Size: Basic (1 GB RAM) - $15/month

**Add Backend Service:**
- Name: backend
- Source Directory: `/backend`
- Build Command: Auto-detected
- Run Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- HTTP Port: 8000
- Instance Size: Basic XXS ($5/month)
- Environment Variables:
  ```
  DATABASE_URL=${db.DATABASE_URL}  (auto-linked)
  SECRET_KEY=<generate-random-32-char-string>
  ```

**Add Frontend Static Site:**
- Name: frontend
- Source Directory: `/frontend`
- Build Command: `npm install && npm run build`
- Output Directory: `dist`
- Environment Variables:
  ```
  VITE_API_URL=${backend.PUBLIC_URL}
  ```

4. Click "Create Resources"
5. Wait for deployment (~5 minutes)

#### 3. Run Database Migrations
Once deployed:
1. Go to your backend app → Console
2. Run:
   ```bash
   alembic upgrade head
   python -m app.scripts.seed_achievements
   ```

#### 4. Access Your App
- Frontend: `https://trackfinance-xxxxx.ondigitalocean.app`
- Backend: `https://trackfinance-xxxxx.ondigitalocean.app/api`
- API Docs: `https://trackfinance-xxxxx.ondigitalocean.app/docs`

### Cost Estimate
- Database: $15/month
- Backend: $5/month
- Frontend: $0/month (static)
- **Total: $20/month**
- **Your $200 credit = 10 months FREE!**

---

## Alternative: Microsoft Azure (Also Free with Student Pack)

### Azure for Students
- $100 credit + Free services
- No credit card required

### Deploy with Azure

**Frontend (Azure Static Web Apps - FREE FOREVER):**
1. Go to [Azure Portal](https://portal.azure.com)
2. Create Resource → Static Web Apps
3. Connect GitHub → Select `TrackFinance`
4. Build Details:
   - App location: `/frontend`
   - Output location: `dist`
5. Create

**Backend (Azure App Service):**
1. Create Resource → Web App
2. Runtime: Python 3.12
3. Connect to GitHub
4. Deploy from `/backend`

**Database (Azure Database for PostgreSQL):**
1. Create Resource → Azure Database for PostgreSQL
2. Choose Flexible Server
3. Use your student credit

---

## GitHub Codespaces (For Development)

Your Student Pack also includes:
- **180 core hours/month of GitHub Codespaces**
- Use it for development and testing!

---

## Domain Name (Bonus)

Your Student Pack includes:
- **Free .me domain** from Name.com
- **Free SSL certificate** from Namecheap

Perfect for your deployed app!

---

## Quick Links

- **DigitalOcean Students**: https://www.digitalocean.com/github-students
- **Azure for Students**: https://azure.microsoft.com/en-us/free/students
- **GitHub Student Pack**: https://education.github.com/pack
- **GitHub Education**: https://education.github.com

---

## Recommended Choice

🏆 **DigitalOcean App Platform**
- Easiest setup
- Most generous credit ($200!)
- Perfect for full-stack apps
- Auto-deploys from GitHub
- Runs 24/7 (no sleeping)
- Professional grade infrastructure

Start here: https://cloud.digitalocean.com/apps
