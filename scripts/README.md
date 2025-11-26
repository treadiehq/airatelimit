# Server Management Scripts

Simple commands to manage backend, dashboard, and database.

## Commands

```bash
npm run start    # Start everything
npm run stop     # Stop everything
npm run restart  # Restart everything
npm run status   # Check what's running
```

## What They Do

**`npm run start`**
1. Starts PostgreSQL (if not running)
2. Starts backend API → `http://localhost:3000`
3. Starts dashboard → `http://localhost:3001`
4. Logs to `logs/backend.log` and `logs/dashboard.log`

**`npm run stop`**
- Stops backend and dashboard
- Cleans up ports 3000 and 3001
- Keeps PostgreSQL running (preserves data)

**`npm run status`**
- Shows what's running
- Displays health check results
- Lists helpful URLs

## View Logs

```bash
# Backend
tail -f logs/backend.log

# Dashboard
tail -f logs/dashboard.log

# Both
tail -f logs/*.log
```

## Troubleshooting

**Port already in use:**
```bash
npm run stop
npm run start
```

**PostgreSQL not running:**
```bash
docker start ai-proxy-db
```

**Kill stuck processes:**
```bash
pkill -f "nest start"
pkill -f "nuxt dev"
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

## Manual Mode

Run servers separately if needed:

```bash
# Backend only
npm run dev

# Dashboard only
cd dashboard && npm run dev
```

## Notes

- Scripts run from project root
- Logs are appended (not overwritten)
- PID files prevent duplicate processes
- Auto-reload enabled during development
