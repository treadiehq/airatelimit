#!/bin/bash

echo "🛑 Stopping AI Rate Limit servers..."

cd "$(dirname "$0")/.."

# Stop backend
if [ -f .backend.pid ]; then
  BACKEND_PID=$(cat .backend.pid)
  if ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "⏹️  Stopping backend (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    # Also kill the nest process if running
    pkill -f "nest start" 2>/dev/null
    echo "✅ Backend stopped"
  else
    echo "⚠️  Backend not running"
  fi
  rm .backend.pid
else
  echo "⚠️  No backend PID file found, killing by process name..."
  pkill -f "nest start" 2>/dev/null && echo "✅ Backend stopped"
fi

# Stop dashboard
if [ -f .dashboard.pid ]; then
  DASHBOARD_PID=$(cat .dashboard.pid)
  if ps -p $DASHBOARD_PID > /dev/null 2>&1; then
    echo "⏹️  Stopping dashboard (PID: $DASHBOARD_PID)..."
    kill $DASHBOARD_PID 2>/dev/null
    # Also kill nuxt process if running
    pkill -f "nuxt dev" 2>/dev/null
    echo "✅ Dashboard stopped"
  else
    echo "⚠️  Dashboard not running"
  fi
  rm .dashboard.pid
else
  echo "⚠️  No dashboard PID file found, killing by process name..."
  pkill -f "nuxt dev" 2>/dev/null && echo "✅ Dashboard stopped"
fi

# Clean up any remaining node processes on these ports
echo "🧹 Cleaning up..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo ""
echo "✅ All servers stopped"

