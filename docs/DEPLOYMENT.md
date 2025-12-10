# Deploy to Railway

## 1. Create Project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
2. Select your `airatelimit` repository

## 2. Add Database

1. Click **+ New** → **Database** → **PostgreSQL**

## 3. Add Backend Service

1. Click **+ New** → **GitHub Repo** → Select repo again
2. **Settings:**
   - Root Directory: *(leave empty)*
   - Start Command: `npm run start:prod`

3. **Variables** → Add:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<run: openssl rand -base64 32>
ENCRYPTION_KEY=<run: openssl rand -hex 16>
NODE_ENV=production
```

4. **Settings** → **Networking** → **Generate Domain**

## 4. Add Dashboard Service

1. Click **+ New** → **GitHub Repo** → Select repo again  
2. **Settings:**
   - Root Directory: `dashboard`
   - Start Command: `node .output/server/index.mjs`

3. **Variables** → Add:
```
NUXT_PUBLIC_API_URL=https://<your-backend-domain>.up.railway.app
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

## Custom Domain

**Settings** → **Networking** → **Custom Domain** → Add your domain → Update DNS with the CNAME provided.
