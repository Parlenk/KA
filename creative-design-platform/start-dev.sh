#!/bin/bash

echo "🚀 Starting Kredivo Ads Center..."
echo "📍 Checking ports 3000-3003 for availability..."

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 1  # Port is occupied
    else
        return 0  # Port is available
    fi
}

# Try ports 3000-3003 in order
for port in 3000 3001 3002 3003; do
    if check_port $port; then
        echo "✅ Port $port is available, starting server..."
        npx vite --port $port --host --open
        exit 0
    else
        echo "❌ Port $port is occupied, trying next..."
    fi
done

echo "🚫 All ports 3000-3003 are occupied!"
echo "📋 Current port usage:"
lsof -i :3000-3003

echo ""
echo "💡 You can manually stop processes or use a different port range."
echo "🔧 To kill all node processes: pkill -f node"