#!/bin/bash

echo "📊 AI Rate Limit - Server Status"
echo "================================"
echo ""

cd "$(dirname "$0")/.."

# Check PostgreSQL
echo "🗄️  PostgreSQL:"
if docker ps | grep -q ai-proxy-db; then
  echo "   ✅ Running (port 5433)"
else
  echo "   ❌ Not running"
fi
echo ""

# Check Backend
echo "🔧 Backend API (port 3000):"
if lsof -ti:3000 > /dev/null 2>&1; then
  PID=$(lsof -ti:3000)
  echo "   ✅ Running (PID: $PID)"
  if [ -f .backend.pid ]; then
    STORED_PID=$(cat .backend.pid)
    if [ "$PID" != "$STORED_PID" ]; then
      echo "   ⚠️  Warning: Running PID doesn't match stored PID"
    fi
  fi
  # Test endpoint
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Responding to requests"
  else
    echo "   ⚠️  Port occupied but not responding"
  fi
else
  echo "   ❌ Not running"
fi
echo ""

# Check Dashboard
echo "🎨 Dashboard (port 3001):"
if lsof -ti:3001 > /dev/null 2>&1; then
  PID=$(lsof -ti:3001)
  echo "   ✅ Running (PID: $PID)"
  if [ -f .dashboard.pid ]; then
    STORED_PID=$(cat .dashboard.pid)
    if [ "$PID" != "$STORED_PID" ]; then
      echo "   ⚠️  Warning: Running PID doesn't match stored PID"
    fi
  fi
else
  echo "   ❌ Not running"
fi
echo ""

echo "================================"
echo ""
echo "🔗 URLs:"
echo "   Backend:   http://localhost:3000"
echo "   Dashboard: http://localhost:3001"
echo ""
echo "📝 Commands:"
echo "   Start:   npm run start"
echo "   Stop:    npm run stop"
echo "   Restart: npm run restart"
echo "   Status:  npm run status"

