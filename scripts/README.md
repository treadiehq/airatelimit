# Server Management Scripts

Convenient scripts to manage all AI Rate Limit servers (Backend + Dashboard + PostgreSQL).

## Quick Commands

```bash
# Start all servers
npm run start

# Stop all servers
npm run stop

# Restart all servers
npm run restart

# Check status
npm run status
```

## Scripts Overview

### 🚀 `start.sh`
Starts all required services:
1. Checks PostgreSQL container (starts if stopped)
2. Starts backend API (http://localhost:3000)
3. Waits for backend to be ready
4. Starts dashboard (http://localhost:3001)

**Logs:** Outputs to `logs/backend.log` and `logs/dashboard.log`

### 🛑 `stop.sh`
Stops all running services:
- Kills backend process
- Kills dashboard process
- Cleans up ports 3000 and 3001
- Removes PID files

**Note:** Does NOT stop PostgreSQL (keeps your data safe)

### 🔄 `restart.sh`
Convenience script that:
1. Runs `stop.sh`
2. Waits 2 seconds
3. Runs `start.sh`

### 📊 `status.sh`
Shows the current status of:
- PostgreSQL container
- Backend API (port 3000)
- Dashboard (port 3001)

Includes health checks and helpful URLs.

## Process Management

The scripts use PID files to track processes:
- `.backend.pid` - Backend process ID
- `.dashboard.pid` - Dashboard process ID

These are automatically created on start and cleaned up on stop.

## Log Files

Server output is redirected to:
- `logs/backend.log` - NestJS backend output
- `logs/dashboard.log` - Nuxt dashboard output

**View logs in real-time:**
```bash
# Backend logs
tail -f logs/backend.log

# Dashboard logs
tail -f logs/dashboard.log

# Both logs
tail -f logs/*.log
```

## Troubleshooting

### "Port already in use"
```bash
npm run stop
# Wait a few seconds
npm run start
```

### Check what's running
```bash
npm run status
```

### Kill stuck processes manually
```bash
# Kill backend
pkill -f "nest start"
lsof -ti:3000 | xargs kill -9

# Kill dashboard
pkill -f "nuxt dev"
lsof -ti:3001 | xargs kill -9
```

### PostgreSQL not starting
```bash
# Check if container exists
docker ps -a | grep ai-proxy-db

# Start it manually
docker start ai-proxy-db

# If it doesn't exist, create it
docker run --name ai-proxy-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=ai_proxy \
  -p 5433:5432 -d postgres:15
```

## Development Workflow

**Normal development:**
```bash
# First time setup
npm install
cd dashboard && npm install && cd ..

# Start everything
npm run start

# Work on your code (auto-reload is enabled)

# When done
npm run stop
```

**Quick restart after code changes:**
```bash
npm run restart
```

**Check if everything is running:**
```bash
npm run status
```

## Manual Mode

If you prefer to run servers separately:

**Backend only:**
```bash
npm run dev
```

**Dashboard only:**
```bash
cd dashboard
npm run dev
```

## Notes

- Scripts are designed to run from the project root
- All paths are relative to the script location
- Scripts check for PostgreSQL before starting
- Logs are appended (not overwritten)
- PID files prevent duplicate processes

