# Deploy TrackFinance on Vercel and Supabase

Deploy the same Git repository as **two Vercel projects**: `backend/` for FastAPI and `frontend/` for React/Vite. Supabase provides PostgreSQL, public avatar storage, and Cron. Keep the existing application accounts, passwords, OAuth, and JWT authentication; Supabase Auth is not used.

The repository is prepared for this setup. Account creation, credentials, database import, and deployment still need to happen in your accounts. Do not shut down DigitalOcean until the checks at the end pass.

## 1. Create a Supabase project

Choose a European region near your users, ideally Frankfurt: the API's `backend/vercel.json` selects Vercel's `fra1` region. If choosing another region, update that file to the closest Vercel function region.

Save the database password. In the project's **Connect** dialog, copy two PostgreSQL connection strings:

| Setting | Connection | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Transaction pooler, port **6543** | Vercel API requests |
| `DATABASE_MIGRATION_URL` | Session pooler, port **5432**, or direct connection if your network supports IPv6 | Local imports and migrations |

Use the `postgres` database role shown in the dialog (pooler usernames usually look like `postgres.PROJECT_REF`). Replace the password placeholder with your actual password, URL-encoding special characters. Append `?sslmode=require`, or `&sslmode=require` if the URL already contains query parameters. Do not use the REST API URL or a Supabase API key as a database URL.

[Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres)

## 2. Configure your local backend

From the repository root, use Python 3.12 and install the backend dependencies. If you already have the project's virtual environment, activate it and skip creating it again.

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cd backend
```

Create `backend/.env` from `.env.example` only if you do not already have one. Preserve your old configuration privately so you can migrate existing files and roll back if necessary. Never commit `.env` or database backups.

Set the two Supabase database URLs in `.env`. Local commands load this file automatically. Generate **two separate secrets**, running this command once for `SECRET_KEY` and again for `CRON_SECRET`:

```sh
python -c 'import secrets; print(secrets.token_urlsafe(48))'
```

Use a newly generated `SECRET_KEY` for the new deployment; existing users will log in again. Existing password hashes remain valid. Keep `DEBUG=false`.

## 3. Import your existing data, or start fresh

Choose exactly one path. Import before running migrations on the destination. The helpers require PostgreSQL client tools (`pg_dump` and `pg_restore`) matching or newer than the source database version.

### Preserve DigitalOcean data

First stop writes on the old app: put it in maintenance mode or stop its API and background scheduler, and stop the Telegram polling process if you use one. This prevents the old and new copies from recording different transactions. Keep the old database and Spaces bucket available.

In `backend/.env`, set `SOURCE_DATABASE_URL` to the old DigitalOcean database connection string with the required SSL settings. Leave `DATABASE_URL` and `DATABASE_MIGRATION_URL` pointing to Supabase. From `backend/`:

```sh
python -m app.scripts.migrate_database dump /tmp/trackfinance.dump
python -m app.scripts.migrate_database restore /tmp/trackfinance.dump
alembic upgrade head
python -m app.scripts.seed_achievements
```

Use a fresh, empty Supabase project. The restore helper refuses to overwrite application tables, restores in one transaction, and leaves Supabase's managed schemas intact. It copies only the application's `public` schema, including accounts, transactions, sequences, and `alembic_version`; passwords are passed to PostgreSQL tools through their environment rather than command arguments. Keep a private copy of the successful dump somewhere durable, since `/tmp` is temporary.

If the old database does not contain `alembic_version`, stop and inspect its actual schema before proceeding. Do not blindly run `alembic stamp head`: it would skip required changes.

[Supabase's migration guide](https://supabase.com/kb/guides/migrate-from-postgres)

### Start with an empty app

Skip the dump and restore commands. From `backend/`:

```sh
alembic upgrade head
python -m app.scripts.seed_achievements
```

The initial migration now creates the base tables; there is no need to run the old Docker initialization SQL. Do not run `post_deploy.sh` or the old DigitalOcean permission scripts against Supabase.

## 4. Configure Supabase storage and table access

After the import/migrations, open Supabase's **SQL Editor** and run the contents of:

```text
backend/supabase/setup.sql
```

This creates a public `avatars` bucket for JPG/PNG/WebP files. It permits existing avatars up to the old 5 MiB storage limit; new API uploads are limited to 4 MiB to fit Vercel's request limit. It also enables Row Level Security and revokes browser-role access on application tables. FastAPI continues to authorize requests using its own JWTs and the database owner connection. Keep Supabase's `anon`/`authenticated` roles from accessing finance tables directly; the app does not use the Supabase browser SDK.

In **Storage → S3 settings**, generate an **Access Key ID** and **Secret Access Key**. Copy the displayed region and endpoint. These credentials are different from the project's publishable/service-role API keys, and belong only on the backend.

Set in your local `.env` and later in the backend Vercel project:

```dotenv
AVATAR_STORAGE_PROVIDER=supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_STORAGE_BUCKET=avatars
SUPABASE_STORAGE_REGION=eu-central-1
SUPABASE_S3_ENDPOINT=https://YOUR_PROJECT_REF.storage.supabase.co/storage/v1/s3
SUPABASE_S3_ACCESS_KEY_ID=YOUR_S3_ACCESS_KEY
SUPABASE_S3_SECRET_ACCESS_KEY=YOUR_S3_SECRET
```

Use the actual region and endpoint from your project. Only avatars are public; do not upload receipts or financial documents to this bucket.

If preserving existing DigitalOcean avatars, keep the old `DO_SPACES_*` values in the local `.env` and run:

```sh
python -m app.scripts.migrate_avatars
python -m app.scripts.migrate_avatars --apply
```

The first command previews the work. The second copies each referenced object and changes its URL in the **Supabase database** after a successful upload. It retains the original files and skips already migrated URLs on subsequent runs. Google/Discord-hosted avatar URLs remain as they are. Check for reported failures before closing Spaces.

[S3 credential documentation](https://supabase.com/docs/guides/storage/s3/authentication)

## 5. Deploy the FastAPI backend to Vercel

Push the prepared changes to your Git provider, then import that repository in Vercel:

- Project name: for example `trackfinance-api`.
- **Root Directory: `backend`**. Do not deploy the repository root.
- Framework: **FastAPI**. The tracked `vercel.json` sets it explicitly.
- Keep the default build/install behavior; do not use the DigitalOcean Dockerfile or startup command.
- Python version: **3.12**, declared in `backend/.python-version`.

Add the following environment variables to the backend's **Production** environment:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Supabase transaction pooler URL with `sslmode=require` |
| `SECRET_KEY` | New random JWT secret, at least 32 characters |
| `CRON_SECRET` | Separate random secret shared with Supabase Vault |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `DISABLE_SCHEDULER` | `1` |
| `TELEGRAM_STATE_BACKEND` | `database` |
| `BACKEND_URL` | Your stable backend URL, e.g. `https://trackfinance-api.vercel.app` |
| `FRONTEND_URL` | Your eventual stable frontend URL; update after step 6 |
| `ALLOWED_ORIGINS` | Exact frontend origin; comma-separated if also using a custom domain |
| `AVATAR_STORAGE_PROVIDER` and `SUPABASE_*` | Storage settings from step 4 |
| `RESEND_API_KEY` | Your Resend API key, needed for password-account verification emails |
| `FROM_EMAIL` | A sender on a domain verified with Resend |
| `GROQ_API_KEY` | Your existing key, if using AI chat or receipt recognition |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | If using Google login |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | If using Discord login |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`, `TELEGRAM_WEBHOOK_SECRET` | If using Telegram |

Do not add `SOURCE_DATABASE_URL`, the old Spaces credentials, or `DATABASE_MIGRATION_URL` to Vercel. `VERCEL=1` is supplied by Vercel automatically. Configure Production first; preview deployments should use a separate test database and separate credentials before enabling real integrations.

Deploy and save the stable backend domain from Vercel. Opening `https://YOUR_API_DOMAIN/` should return the API welcome JSON; `/docs` should show the API documentation. Requests use `/v1/...`, without an extra `/api` prefix.

Ensure production API routes accept requests from browsers, Telegram, and Supabase Cron without Vercel's login screen. If Deployment Protection blocks those callers, adjust protection for this API's production domain. The API's JWT and job/webhook secret checks remain enabled.

[Vercel FastAPI deployment guide](https://vercel.com/docs/frameworks/backend/fastapi)

## 6. Deploy the frontend to Vercel

Import the same repository as a second Vercel project:

- **Root Directory: `frontend`**.
- Framework: **Vite**.
- Node.js: **22.x**, matching `frontend/package.json`.
- Install command: `npm ci` (set in `frontend/vercel.json`). Dependencies are installed from the lockfile; `node_modules` stays out of Git.
- Build command: `npm run build`.
- Output directory: `dist`.
- Production environment variable: `VITE_API_URL=https://YOUR_API_DOMAIN`.

Do not append `/api` or `/v1` to `VITE_API_URL`. The frontend supplies route paths itself. Builds now fail clearly if this variable is absent or invalid. Changes to it require a new frontend deployment because Vite embeds it at build time.

After deployment, copy the actual stable frontend URL. In the backend project, set `FRONTEND_URL` and `ALLOWED_ORIGINS` to that URL, with no trailing slash, and **redeploy the backend**. Keep `BACKEND_URL` set to the stable API URL. Update these values in your local `.env` too.

For a custom domain such as `https://expensehub.site`, add it to the frontend project, follow Vercel's DNS instructions, and make it `FRONTEND_URL`. Include each frontend origin you will use in `ALLOWED_ORIGINS`, for example:

```dotenv
ALLOWED_ORIGINS=https://expensehub.site,https://trackfinance-web.vercel.app
```

The frontend's rewrite configuration supports direct visits and refreshes on `/verify-email` and `/oauth-callback`.

## 7. Update email, OAuth, and Telegram

**Email:** verify `FROM_EMAIL`'s sending domain in Resend. New password accounts require email verification before login. Test an actual registration and click its verification link; `FRONTEND_URL` determines that link. Supabase Auth settings do not configure these application emails.

**OAuth:** in Google Cloud and/or Discord's developer portal, register the exact new callback URLs:

```text
https://YOUR_API_DOMAIN/v1/users/oauth/google/callback
https://YOUR_API_DOMAIN/v1/users/oauth/discord/callback
```

Keep the old callbacks temporarily if you need rollback. Test login through the frontend. Do not register the frontend URL as the backend callback.

**Telegram:** after updating the local `.env` to the new `BACKEND_URL` and the same bot credentials as Vercel, run from `backend/`:

```sh
python -m app.scripts.setup_telegram_webhook
```

This changes the bot's live webhook. Register only after the new app works and the old polling process is stopped. State now persists in PostgreSQL on Vercel, so `/add` and other multi-step conversations work across separate function invocations. The webhook uses one connection to keep this small bot's updates ordered. Registration drops queued old updates, matching the existing helper's behavior.

## 8. Schedule the background jobs in Supabase

In Supabase, enable **Cron (`pg_cron`)**, **`pg_net`**, and **Vault** through the dashboard's integrations/extensions pages. Create two named Vault secrets:

| Vault secret name | Value |
| --- | --- |
| `trackfinance_backend_url` | `https://YOUR_API_DOMAIN`, without trailing slash |
| `trackfinance_cron_secret` | Exactly the backend's `CRON_SECRET` |

Run `backend/supabase/schedules.sql` in the SQL Editor. It installs:

| Job | UTC schedule | Endpoint |
| --- | --- | --- |
| Due recurring transactions, budget alerts, expired Telegram-state cleanup | Hourly, minute 5 | `POST /internal/jobs/hourly` |
| Weekly Telegram digest | Monday, 07:00 | `POST /internal/jobs/weekly-digest` |

The job secret stays in Vault; it is not embedded in the scheduled SQL. Re-running this script updates jobs with the same names. No Vercel Cron subscription is needed. The in-process scheduler is automatically disabled on Vercel.

To test immediately, use Supabase Cron's HTTP request interface to POST to the hourly endpoint with `Authorization: Bearer YOUR_CRON_SECRET` and body `{}`. Expect status 200 with counters. A repeat run should post zero additional transactions that are no longer due. Missing credentials should return 401, or 503 when jobs have no configured secret.

Cron history records that the SQL request was queued; also inspect HTTP responses in the SQL Editor:

```sql
select id, status_code, timed_out, error_msg, created
from net._http_response
order by created desc
limit 20;
```

Check for HTTP 200 responses. A queued request alone does not prove the API succeeded. Jobs run within the configured 300-second Vercel limit; larger user volumes may require batching or a queue later. A PostgreSQL transaction lock prevents overlapping scheduled jobs across API instances.

[Supabase Cron](https://supabase.com/docs/guides/cron), [Vault](https://supabase.com/docs/guides/database/vault)

## 9. Verify the new deployment before closing DigitalOcean

- Sign in with an existing account; compare transaction counts, balances, budgets, goals, and achievements against the old app.
- Register a new account, verify its email, and log in.
- Add, edit, and delete a small test transaction; confirm it is still present after refreshing where appropriate.
- Upload an avatar, refresh the page, and confirm both new and imported avatars load.
- Test Google/Discord login if enabled.
- Test AI chat and PDF export if used.
- Link Telegram, complete `/add`, and confirm the transaction appears in the web app.
- Run the hourly job twice and inspect HTTP responses; confirm only one transaction is posted for each due recurring entry.
- Open the frontend's `/verify-email` path directly to confirm SPA routing works.
- Check Vercel function logs and Supabase database usage for connection or permission errors.

Once verified, switch remaining DNS records, keep the private backup, and close the old DigitalOcean app/database/Spaces resources to stop their charges. Remove old credentials from the local `.env` and revoke credentials you no longer need. Rolling back after the new app accepts writes requires reconciling those new writes; do not run both copies' schedulers against different databases.

## Costs and routine operation

Vercel Hobby is for personal, non-commercial projects. Supabase Free has database/storage/egress quotas, can pause after low activity, and does not include automatic database backups. Keep your own backups and check usage periodically. AI and email services retain their own quotas or charges.

[Current Vercel Hobby limits](https://vercel.com/docs/plans/hobby), [Supabase pricing](https://supabase.com/pricing)

For local verification after changes, from the repository root:

```sh
cd backend
../.venv/bin/python -m pytest -q
cd ../frontend
VITE_API_URL=https://YOUR_API_DOMAIN npm run build
```

Database migrations are intentionally manual. Vercel preview builds and cold starts never migrate or seed the production database.

The optional PostgreSQL integration test runs when `TEST_POSTGRES_ADMIN_URL` points to a disposable PostgreSQL server with `CREATEDB` privileges. It creates and removes two test databases to check fresh migrations, backup/restore, password preservation, and identity sequences. It is skipped during normal unit tests.
