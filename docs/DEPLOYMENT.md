# Deploy to Railway

## 1. Create Project

1. Go to [railway.app](https://railway.app) → **New Project**
2. You'll need to create 3 services → Database, Backend (select repo from Github) and Dashboard (select repo from Github)

## 2. Add Database

1. Click **+ Create** → **Database** → **PostgreSQL**

## 3. Add Backend Service

1. Click **+ Create** → **GitHub Repo** → Select repo

2. **Variables** → Add:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<run: openssl rand -base64 32>
ENCRYPTION_KEY=<run: openssl rand -hex 16>
CORS_ORIGIN=https://<your-dashboard-domain>.up.railway.app
RESEND_API_KEY=<from resend.com>
EMAIL_FROM=noreply@yourdomain.com
NODE_ENV=production
```

3. **Settings** → **Networking** → **Generate Domain**

## 4. Add Dashboard Service

1. Click **+ Create** → **GitHub Repo** → Select repo again  
2. **Settings:**
   - Dockerfile Path: `Dockerfile.dashboard`

3. **Variables** → Add:
```
NUXT_PUBLIC_API_URL=https://<your-backend-domain>.up.railway.app/api
NODE_ENV=production
```

4. **Settings** → **Networking** → **Generate Domain**

## 5. Verify

```bash
curl https://<your-backend-domain>.up.railway.app/api/health
```

Done. Railway auto-deploys on every `git push`.

---

## Environment Variables

| Variable | How to Generate |
|----------|-----------------|
| `JWT_SECRET` | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 16` |
| `RESEND_API_KEY` | Get from [resend.com](https://resend.com) |
| `EMAIL_FROM` | Your verified sender domain |

## Custom Domain

**Settings** → **Networking** → **Custom Domain** → Add your domain → Update DNS with the CNAME provided.
