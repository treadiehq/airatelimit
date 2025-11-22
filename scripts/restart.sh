#!/bin/bash

echo "🔄 Restarting AI Rate Limit servers..."
echo ""

# Stop servers
"$(dirname "$0")/stop.sh"

echo ""
sleep 2

# Start servers
"$(dirname "$0")/start.sh"

