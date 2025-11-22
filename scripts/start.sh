#!/bin/bash

echo "🚀 Starting AI Rate Limit servers..."

# Check if PostgreSQL is running
if ! docker ps | grep -q ai-proxy-db; then
  echo "⚠️  PostgreSQL container not running. Starting it..."
  docker start ai-proxy-db 2>/dev/null || {
    echo "❌ PostgreSQL container not found. Please run:"
    echo "   docker run --name ai-proxy-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ai_proxy -p 5433:5432 -d postgres:15"
    exit 1
  }
  echo "✅ PostgreSQL started"
  sleep 2
else
  echo "✅ PostgreSQL already running"
fi

# Start backend in background
echo "🔧 Starting backend API..."
cd "$(dirname "$0")/.."
npm run dev > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .backend.pid
echo "✅ Backend started (PID: $BACKEND_PID)"

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
for i in {1..30}; do
  if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✅ Backend is ready!"
    sleep 1  # Give it one more second to fully initialize
    break
  fi
  if [ $i -eq 30 ]; then
    echo "⚠️  Backend startup timeout. Check logs/backend.log"
  fi
  sleep 1
done

# Start dashboard in background
echo "🎨 Starting dashboard..."
cd dashboard
npm run dev > ../logs/dashboard.log 2>&1 &
DASHBOARD_PID=$!
echo $DASHBOARD_PID > ../.dashboard.pid
echo "✅ Dashboard started (PID: $DASHBOARD_PID)"

echo ""
echo "🎉 All servers started successfully!"
echo ""
echo "📊 Backend API:  http://localhost:3000"
echo "🖥️  Dashboard:    http://localhost:3001"
echo ""
echo "📝 Logs:"
echo "   Backend:   tail -f logs/backend.log"
echo "   Dashboard: tail -f logs/dashboard.log"
echo ""
echo "🛑 To stop: npm run stop"

