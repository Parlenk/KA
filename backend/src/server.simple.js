/**
 * Creative Design Platform - Simple Development Server
 * Basic Express.js server for initial development testing
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false // Disabled for development
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// General middleware
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    message: 'Creative Design Platform API is running'
  });
});

// Basic API routes for testing
app.get('/api/v1/status', (req, res) => {
  res.json({
    message: 'API v1 is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /health - Health check',
      'GET /api/v1/status - API status',
      'GET /api/v1/test - Test endpoint'
    ]
  });
});

app.get('/api/v1/test', (req, res) => {
  res.json({
    success: true,
    message: 'Test endpoint working',
    data: {
      server: 'Creative Design Platform',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested endpoint does not exist',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /health',
      'GET /api/v1/status',
      'GET /api/v1/test'
    ]
  });
});

// Basic error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Server startup
const server = app.listen(PORT, () => {
  console.log(`🚀 Creative Design Platform API (Simple Mode) running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API Status: http://localhost:${PORT}/api/v1/status`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/v1/test`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET /health');
  console.log('  GET /api/v1/status');
  console.log('  GET /api/v1/test');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;