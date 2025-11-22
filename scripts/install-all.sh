#!/bin/bash

echo "📦 Installing all dependencies for AI Rate Limit project..."
echo ""

cd "$(dirname "$0")/.."

# Backend
echo "🔧 Installing backend dependencies..."
npm install
if [ $? -ne 0 ]; then
  echo "❌ Backend installation failed"
  exit 1
fi
echo "✅ Backend dependencies installed"
echo ""

# Dashboard
echo "🎨 Installing dashboard dependencies..."
cd dashboard
npm install
if [ $? -ne 0 ]; then
  echo "❌ Dashboard installation failed"
  exit 1
fi
cd ..
echo "✅ Dashboard dependencies installed"
echo ""

# SDK
echo "📚 Installing SDK dependencies..."
cd sdk/js
npm install
if [ $? -ne 0 ]; then
  echo "❌ SDK installation failed"
  exit 1
fi
echo "✅ SDK dependencies installed"
echo ""

# Build SDK
echo "🔨 Building SDK..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ SDK build failed"
  exit 1
fi
cd ../..
echo "✅ SDK built successfully"
echo ""

echo "🎉 All dependencies installed and SDK built!"
echo ""
echo "📝 Next steps:"
echo "   1. Copy .env.example to .env and configure it"
echo "   2. Start PostgreSQL: docker run --name ai-proxy-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=ai_proxy -p 5433:5432 -d postgres:15"
echo "   3. Start all servers: npm run start"
echo ""

