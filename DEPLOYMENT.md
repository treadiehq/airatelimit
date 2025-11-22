# Deployment Guide

Deploy AI Ratelimit to Railway with Resend for email.

## Prerequisites

- [Railway Account](https://railway.app)
- [Resend Account](https://resend.com)
- GitHub repository connected to Railway

## 1. Set Up Resend

1. Go to [Resend](https://resend.com) and sign up/login
2. Add and verify your domain (or use `onboarding@resend.dev` for testing)
3. Create an API key from the dashboard
4. Save your API key - you'll need it for Railway

## 2. Deploy to Railway

### Backend API

1. **Create New Project**
   - Go to [Railway](https://railway.app/new)
   - Click "Deploy from GitHub repo"
   - Select your `airatelimit` repository

2. **Add PostgreSQL**
   - In your project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway auto-generates `DATABASE_URL` variable
   - **That's it!** Database tables auto-create on first deployment

3. **Configure Environment Variables**
   
   Click on your backend service → Variables → Add these:

   ```bash
   NODE_ENV=production
   
   # Database (auto-provided by Railway)
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   
   # JWT Secret (generate a secure random string)
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRES_IN=7d
   
   # CORS (will update after dashboard is deployed)
   CORS_ORIGIN=https://your-dashboard-url.railway.app
   
   # Resend Email
   RESEND_API_KEY=re_your_resend_api_key_here
   EMAIL_FROM=noreply@yourdomain.com
   ```

4. **Deploy**
   - Railway automatically deploys on git push
   - Get your backend URL from the deployment (e.g., `https://airatelimit-backend.railway.app`)

### Dashboard (Nuxt)

1. **Create New Service**
   - In the same Railway project, click "New"
   - Select "GitHub Repo" → Choose the same repo
   - Set root directory to `/dashboard`

2. **Configure Environment Variables**
   
   ```bash
   NODE_ENV=production
   NUXT_PUBLIC_API_URL=https://your-backend-url.railway.app/api
   ```

3. **Deploy**
   - Railway automatically deploys
   - Get your dashboard URL (e.g., `https://airatelimit-dashboard.railway.app`)

4. **Update Backend CORS**
   - Go back to backend service variables
   - Update `CORS_ORIGIN` to your dashboard URL

## 3. Database Auto-Setup ✨

**No manual migrations needed!** 

When you add PostgreSQL to Railway and deploy, the app automatically:
- ✅ Creates all database tables
- ✅ Seeds reserved organization names
- ✅ Sets up indexes and relationships

Just add the PostgreSQL service and deploy - everything happens automatically on first startup.

## 4. Verify Deployment

1. **Test Backend**: Visit `https://your-backend-url.railway.app`
2. **Test Dashboard**: Visit `https://your-dashboard-url.railway.app`
3. **Sign Up**: Create an account - you should receive a magic link email via Resend

## 5. Custom Domain (Optional)

### Backend
1. In Railway backend service → Settings → Domains
2. Click "Custom Domain"
3. Add your domain (e.g., `api.yourdomain.com`)
4. Configure DNS as instructed

### Dashboard
1. In Railway dashboard service → Settings → Domains
2. Add your domain (e.g., `app.yourdomain.com`)
3. Configure DNS as instructed
4. Update backend `CORS_ORIGIN` to your new dashboard domain

## 6. Environment Variables Reference

### Backend
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection | Auto-provided by Railway |
| `JWT_SECRET` | Secret for JWT tokens | Random 32+ char string |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `CORS_ORIGIN` | Dashboard URL | `https://app.yourdomain.com` |
| `RESEND_API_KEY` | Resend API key | `re_abc123...` |
| `EMAIL_FROM` | From email address | `noreply@yourdomain.com` |

### Dashboard
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `NUXT_PUBLIC_API_URL` | Backend API URL | `https://api.yourdomain.com/api` |

## 7. Monitoring & Logs

- **View Logs**: Railway dashboard → Service → Deployments → View Logs
- **Metrics**: Railway provides CPU, Memory, and Network metrics
- **Alerts**: Set up in Railway Settings → Observability

## 8. Automatic Deployments

Railway automatically deploys when you push to `main`:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Both backend and dashboard will redeploy automatically.

## Troubleshooting

### Email Not Sending
- Verify `RESEND_API_KEY` is correct
- Check Resend dashboard for delivery status
- Verify your domain is verified in Resend

### Database Connection Issues
- Check `DATABASE_URL` is set correctly
- Verify PostgreSQL service is running
- Check Railway PostgreSQL logs
- Tables are auto-created on first startup - check backend logs for "schema" messages

### CORS Errors
- Ensure `CORS_ORIGIN` matches your dashboard URL exactly
- Include `https://` in the URL
- No trailing slash

### Build Failures
- Check Railway logs for specific errors
- Verify `package.json` scripts are correct
- Ensure all dependencies are in `dependencies` not `devDependencies`

## Cost Estimate

**Railway:**
- Hobby Plan: $5/month (includes $5 usage credit)
- PostgreSQL: ~$5/month for small DB
- Backend + Dashboard: Included in usage credit for small projects

**Resend:**
- Free: 3,000 emails/month
- Pro: $20/month for 50,000 emails/month

**Total Starting Cost:** ~$5-10/month for small-scale deployment

## Support

- Railway Docs: https://docs.railway.app
- Resend Docs: https://resend.com/docs
- Issues: https://github.com/treadiehq/airatelimit/issues

