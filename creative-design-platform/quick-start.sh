#!/bin/bash

# Quick Start Script for Creative Design Platform
# Simple and reliable local development startup

set -e

echo "🚀 Starting Creative Design Platform..."
echo

# Check if we're in the right directory
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js $(node --version) found"
echo "✅ npm $(npm --version) found"

# Install dependencies if node_modules don't exist
echo "📦 Installing dependencies..."

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

if [ ! -d "backend/node_modules" ]; then
    echo "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

echo "✅ Dependencies installed"

# Create basic environment file for backend if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating basic backend environment..."
    cat > backend/.env << 'EOF'
# Local Development Environment
NODE_ENV=development
PORT=3001
JWT_SECRET=your_local_jwt_secret_key_minimum_32_characters_long_for_security
CORS_ORIGIN=http://localhost:3000

# Database URLs (will use in-memory/mock for quick start)
DATABASE_URL=sqlite:./dev.db
MONGODB_URI=mongodb://localhost:27017/creative_platform_dev
REDIS_URL=redis://localhost:6379

# Optional: Add your API keys here when ready
# OPENAI_API_KEY=your_openai_key_here
# STABILITY_API_KEY=your_stability_key_here
EOF
    echo "✅ Created backend/.env file"
fi

# Check if App.tsx exists and create a simple one if not
if [ ! -f "frontend/src/App.tsx" ]; then
    echo "📱 Creating frontend App.tsx..."
    cat > frontend/src/App.tsx << 'EOF'
import React, { useState, useEffect } from 'react';

interface HealthStatus {
  status: string;
  timestamp: string;
  service: string;
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check backend health
    fetch('http://localhost:3001/api/health')
      .then(res => res.json())
      .then(data => {
        setHealth(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Backend not available');
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      lineHeight: '1.6'
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '40px',
        borderRadius: '12px',
        textAlign: 'center',
        marginBottom: '30px'
      }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '3em' }}>
          🎨 Creative Design Platform
        </h1>
        <p style={{ margin: '0', fontSize: '1.2em', opacity: '0.9' }}>
          AI-Powered Design Tools for Modern Creators
        </p>
      </header>

      {/* Status */}
      <div style={{
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#495057' }}>System Status</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          <div style={{
            padding: '15px',
            background: 'white',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <strong>Frontend</strong>
            <div style={{ color: '#28a745', marginTop: '5px' }}>✅ Running on :3000</div>
          </div>
          
          <div style={{
            padding: '15px',
            background: 'white',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <strong>Backend API</strong>
            {loading ? (
              <div style={{ color: '#ffc107', marginTop: '5px' }}>⏳ Checking...</div>
            ) : health ? (
              <div style={{ color: '#28a745', marginTop: '5px' }}>✅ Connected</div>
            ) : (
              <div style={{ color: '#dc3545', marginTop: '5px' }}>❌ {error}</div>
            )}
          </div>
          
          <div style={{
            padding: '15px',
            background: 'white',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <strong>Database</strong>
            <div style={{ color: '#6c757d', marginTop: '5px' }}>💾 SQLite (dev)</div>
          </div>
          
          <div style={{
            padding: '15px',
            background: 'white',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <strong>Environment</strong>
            <div style={{ color: '#17a2b8', marginTop: '5px' }}>🛠️ Development</div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#495057', marginBottom: '20px' }}>Platform Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {[
            { icon: '🎨', title: 'Design Editor', desc: 'Drag-and-drop canvas with professional tools' },
            { icon: '🤖', title: 'AI Assistant', desc: 'AI-powered image generation and enhancement' },
            { icon: '📱', title: 'Multi-Format Export', desc: 'Export to social media, print, and web formats' },
            { icon: '🎬', title: 'Animation Tools', desc: 'Create engaging animated content' },
            { icon: '🔗', title: 'Social Integration', desc: 'Direct publishing to social platforms' },
            { icon: '📊', title: 'Analytics', desc: 'Track performance and engagement' }
          ].map((feature, index) => (
            <div key={index} style={{
              background: 'white',
              padding: '25px',
              borderRadius: '8px',
              border: '1px solid #dee2e6',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '3em', marginBottom: '15px' }}>{feature.icon}</div>
              <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>{feature.title}</h3>
              <p style={{ margin: '0', color: '#6c757d' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* API Test */}
      <div style={{
        background: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#495057' }}>API Connection Test</h2>
        
        {loading && (
          <p>🔄 Testing backend connection...</p>
        )}
        
        {health && (
          <div style={{
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
            padding: '15px',
            color: '#155724'
          }}>
            <strong>✅ Backend Connected!</strong>
            <br />
            Service: {health.service}
            <br />
            Status: {health.status}
            <br />
            Time: {new Date(health.timestamp).toLocaleString()}
          </div>
        )}
        
        {error && (
          <div style={{
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '15px',
            color: '#721c24'
          }}>
            <strong>❌ Backend Connection Failed</strong>
            <br />
            Error: {error}
            <br />
            <small>Make sure the backend server is running on port 3001</small>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        marginTop: '40px',
        padding: '20px',
        color: '#6c757d',
        borderTop: '1px solid #dee2e6'
      }}>
        <p>🚀 Creative Design Platform v1.0.0-dev</p>
        <p>Ready for development and testing</p>
      </footer>
    </div>
  );
}

export default App;
EOF
    echo "✅ Created frontend App.tsx"
fi

# Create a simple backend server if index.ts doesn't exist
if [ ! -f "backend/src/index.ts" ]; then
    echo "🔧 Creating backend server..."
    mkdir -p backend/src
    cat > backend/src/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Creative Design Platform API',
    version: '1.0.0-dev',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/templates', (req, res) => {
  res.json({
    templates: [
      {
        id: 1,
        name: 'Social Media Post',
        category: 'social',
        description: 'Perfect for Instagram, Facebook posts',
        dimensions: { width: 1080, height: 1080 },
        thumbnail: '/templates/social-square.jpg'
      },
      {
        id: 2,
        name: 'Business Card',
        category: 'print',
        description: 'Professional business card design',
        dimensions: { width: 1050, height: 600 },
        thumbnail: '/templates/business-card.jpg'
      },
      {
        id: 3,
        name: 'Web Banner',
        category: 'web',
        description: 'Website header and banner design',
        dimensions: { width: 1200, height: 400 },
        thumbnail: '/templates/web-banner.jpg'
      },
      {
        id: 4,
        name: 'Story Template',
        category: 'social',
        description: 'Instagram and Facebook stories',
        dimensions: { width: 1080, height: 1920 },
        thumbnail: '/templates/story-vertical.jpg'
      }
    ]
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    services: {
      api: 'healthy',
      database: 'connected',
      cache: 'available',
      ai: 'ready'
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Creative Design Platform API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Templates: http://localhost:${PORT}/api/templates`);
  console.log(`⚡ Status: http://localhost:${PORT}/api/status`);
});
EOF
    echo "✅ Created backend server"
fi

# Start the application
echo
echo "🎯 Starting Creative Design Platform..."
echo

# Open terminal tabs/windows for frontend and backend
echo "Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

echo "Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a bit for servers to start
echo "⏳ Waiting for servers to start..."
sleep 5

echo
echo "🎉 Creative Design Platform is starting!"
echo
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001/api/health"
echo
echo "Opening browser..."

# Open browser
if command -v open >/dev/null 2>&1; then
    open http://localhost:3000
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:3000
else
    echo "Please open http://localhost:3000 in your browser"
fi

echo
echo "🛑 To stop the servers:"
echo "   Press Ctrl+C to stop this script"
echo "   Or run: pkill -f 'npm run dev'"
echo

# Keep script running and handle cleanup
cleanup() {
    echo
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup INT TERM

# Wait for background processes
wait
EOF