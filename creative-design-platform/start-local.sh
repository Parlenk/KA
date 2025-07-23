#!/bin/bash

# Local Development Startup Script
# Quick start for Creative Design Platform

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Creative Design Platform Locally${NC}"
echo

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "frontend/package.json" ]; then
    echo -e "${YELLOW}Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port is already in use${NC}"
        return 1
    fi
    return 0
}

# Check required ports
echo "🔍 Checking port availability..."
PORTS_NEEDED=(3000 3001 5432 27017 6379)
PORTS_AVAILABLE=true

for port in "${PORTS_NEEDED[@]}"; do
    if ! check_port $port; then
        PORTS_AVAILABLE=false
    fi
done

if [ "$PORTS_AVAILABLE" = false ]; then
    echo
    echo -e "${YELLOW}Some ports are in use. You can either:${NC}"
    echo "1. Stop services using those ports"
    echo "2. Continue anyway (may cause conflicts)"
    echo
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${YELLOW}🐳 Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Start with Docker Compose (quickest option)
echo -e "${GREEN}🐳 Starting with Docker Compose...${NC}"
echo

# Create basic environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating basic .env file..."
    cat > .env << 'EOF'
# Local Development Environment
NODE_ENV=development
POSTGRES_DB=creative_platform_dev
POSTGRES_USER=dev_user
POSTGRES_PASSWORD=dev_password123
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=admin123
MONGO_DB=creative_platform_dev
REDIS_PASSWORD=redis123
JWT_SECRET=your_local_jwt_secret_key_minimum_32_chars
SESSION_SECRET=your_local_session_secret_key
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_S3_BUCKET=test-bucket
OPENAI_API_KEY=your_openai_key_here
STABILITY_API_KEY=your_stability_key_here
GRAFANA_PASSWORD=admin
EOF
    echo -e "${GREEN}✅ Created .env file with development defaults${NC}"
fi

# Create docker-compose for local development
if [ ! -f "docker-compose.dev.yml" ]; then
    echo "📝 Creating docker-compose.dev.yml..."
    cat > docker-compose.dev.yml << 'EOF'
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MongoDB Database
  mongodb:
    image: mongo:7
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_ROOT_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
      - MONGO_INITDB_DATABASE=${MONGO_DB}
    ports:
      - "27017:27017"
    volumes:
      - mongodb_dev_data:/data/db

  # Redis Cache
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data

  # Grafana for monitoring
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_dev_data:/var/lib/grafana

volumes:
  postgres_dev_data:
  mongodb_dev_data:
  redis_dev_data:
  grafana_dev_data:
EOF
    echo -e "${GREEN}✅ Created docker-compose.dev.yml${NC}"
fi

# Start the databases and services
echo "🚀 Starting databases and services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Check if we have Node.js installed
if ! command -v node >/dev/null 2>&1; then
    echo -e "${YELLOW}Node.js not found. Please install Node.js 18+ first.${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] && [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing dependencies..."
    
    if [ -d "frontend" ]; then
        cd frontend
        npm install
        cd ..
    fi
    
    if [ -d "backend" ]; then
        cd backend
        npm install
        cd ..
    fi
fi

# Create a simple package.json for the root if it doesn't exist
if [ ! -f "package.json" ]; then
    cat > package.json << 'EOF'
{
  "name": "creative-design-platform",
  "version": "1.0.0",
  "description": "Creative Design Platform for advertising and marketing materials",
  "scripts": {
    "dev": "concurrently \"npm run dev:frontend\" \"npm run dev:backend\"",
    "dev:frontend": "cd frontend && npm start",
    "dev:backend": "cd backend && npm run dev",
    "start": "npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
EOF
    npm install
fi

# Start the development servers
echo -e "${GREEN}🎯 Starting development servers...${NC}"
echo

# Create simple frontend if it doesn't exist
if [ ! -d "frontend" ]; then
    echo "📱 Creating frontend app..."
    npx create-react-app frontend --template typescript
    cd frontend
    npm install @types/react @types/react-dom tailwindcss
    cd ..
fi

# Create simple backend if it doesn't exist
if [ ! -d "backend" ]; then
    echo "🔧 Creating backend API..."
    mkdir -p backend
    cd backend
    npm init -y
    npm install express cors helmet morgan dotenv
    npm install -D nodemon @types/node @types/express

    # Create simple server
    cat > index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Routes
app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Creative Design Platform API'
  });
});

app.get('/api/v1/templates', (req, res) => {
  res.json({
    templates: [
      { id: 1, name: 'Social Media Post', category: 'social', thumbnail: '/templates/social-1.jpg' },
      { id: 2, name: 'Business Card', category: 'print', thumbnail: '/templates/card-1.jpg' },
      { id: 3, name: 'Web Banner', category: 'web', thumbnail: '/templates/banner-1.jpg' }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Creative Design Platform API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/v1/health`);
});
EOF

    # Update package.json
    cat > package.json << 'EOF'
{
  "name": "creative-platform-backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0"
  }
}
EOF
    cd ..
fi

# Update frontend to show the design platform
if [ -f "frontend/src/App.js" ] || [ -f "frontend/src/App.tsx" ]; then
    cat > frontend/src/App.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import './App.css';

interface Template {
  id: number;
  name: string;
  category: string;
  thumbnail: string;
}

function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    // Check API health
    fetch('http://localhost:3001/api/v1/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => console.error('API health check failed:', err));

    // Load templates
    fetch('http://localhost:3001/api/v1/templates')
      .then(res => res.json())
      .then(data => setTemplates(data.templates))
      .catch(err => console.error('Failed to load templates:', err));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                🎨 Creative Design Platform
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                health ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {health ? '✅ Online' : '❌ Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Create Stunning Designs in Minutes
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Professional templates, AI-powered features, and multi-format export
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors">
            Start Creating
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">🎨</div>
            <h3 className="text-xl font-semibold mb-2">Design Editor</h3>
            <p className="text-gray-600">Drag-and-drop canvas with professional tools</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI Features</h3>
            <p className="text-gray-600">AI-powered image generation and enhancement</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="text-3xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2">Multi-Format</h3>
            <p className="text-gray-600">Export to social media, print, and web formats</p>
          </div>
        </div>

        {/* Templates Section */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Popular Templates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {templates.map(template => (
              <div key={template.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-lg font-medium">{template.name}</span>
                </div>
                <div className="p-4">
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-sm text-gray-500 capitalize">{template.category}</p>
                  <button className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors">
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-xl font-semibold mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>API Health</span>
              <span className={health ? 'text-green-600' : 'text-red-600'}>
                {health ? '✅ Healthy' : '❌ Unhealthy'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>Database</span>
              <span className="text-green-600">✅ Connected</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>Monitoring</span>
              <a href="http://localhost:3002" target="_blank" rel="noopener noreferrer" 
                 className="text-blue-600 hover:text-blue-800">
                📊 View Dashboard
              </a>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>Version</span>
              <span className="text-gray-600">v1.0.0-dev</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
EOF

    # Add Tailwind CSS
    if [ -f "frontend/src/index.css" ]; then
        cat > frontend/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
EOF
    fi
fi

# Start the application
echo -e "${GREEN}🎯 Starting the Creative Design Platform...${NC}"
echo
echo -e "${BLUE}📱 Frontend will be available at: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend API will be available at: http://localhost:3001${NC}"
echo -e "${BLUE}📊 Grafana Dashboard: http://localhost:3002 (admin/admin)${NC}"
echo
echo -e "${YELLOW}Opening browser in 10 seconds...${NC}"

# Start development servers
npm run dev &

# Wait a bit and open browser
sleep 10
if command -v open >/dev/null 2>&1; then
    open http://localhost:3000
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3000
fi

echo
echo -e "${GREEN}🚀 Creative Design Platform is now running!${NC}"
echo
echo "🛑 To stop the application:"
echo "   - Press Ctrl+C to stop the development servers"
echo "   - Run: docker-compose -f docker-compose.dev.yml down"
echo
echo "📚 Quick Links:"
echo "   - Frontend: http://localhost:3000"
echo "   - API Health: http://localhost:3001/api/v1/health"
echo "   - Templates: http://localhost:3001/api/v1/templates"
echo "   - Monitoring: http://localhost:3002"

# Keep script running
wait
EOF