import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock data
const mockTemplates = [
  {
    id: 1,
    name: 'Social Media Post',
    category: 'social',
    description: 'Perfect for Instagram, Facebook posts',
    dimensions: { width: 1080, height: 1080 },
    thumbnail: '/templates/social-square.jpg',
    tags: ['social', 'square', 'instagram']
  },
  {
    id: 2,
    name: 'Business Card',
    category: 'print',
    description: 'Professional business card design',
    dimensions: { width: 1050, height: 600 },
    thumbnail: '/templates/business-card.jpg',
    tags: ['print', 'business', 'card']
  },
  {
    id: 3,
    name: 'Web Banner',
    category: 'web',
    description: 'Website header and banner design',
    dimensions: { width: 1200, height: 400 },
    thumbnail: '/templates/web-banner.jpg',
    tags: ['web', 'banner', 'header']
  },
  {
    id: 4,
    name: 'Instagram Story',
    category: 'social',
    description: 'Instagram and Facebook stories',
    dimensions: { width: 1080, height: 1920 },
    thumbnail: '/templates/story-vertical.jpg',
    tags: ['social', 'story', 'vertical']
  }
];

let mockUsers = [
  {
    id: 1,
    email: 'demo@example.com',
    name: 'Demo User',
    password: 'demo123' // In real app, this would be hashed
  }
];

let mockProjects = [
  {
    id: 1,
    name: 'My First Design',
    userId: 1,
    templateId: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Creative Design Platform API (Simple Mode)',
    version: '1.0.0-dev',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API v1 routes
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Creative Design Platform API',
    version: '1.0.0',
    mode: 'development-simple'
  });
});

// Templates
app.get('/api/v1/templates', (req, res) => {
  const { category, search } = req.query;
  
  let filteredTemplates = [...mockTemplates];
  
  if (category) {
    filteredTemplates = filteredTemplates.filter(t => t.category === category);
  }
  
  if (search) {
    const searchTerm = (search as string).toLowerCase();
    filteredTemplates = filteredTemplates.filter(t => 
      t.name.toLowerCase().includes(searchTerm) ||
      t.description.toLowerCase().includes(searchTerm) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
  
  res.json({
    templates: filteredTemplates,
    total: filteredTemplates.length,
    categories: ['social', 'print', 'web']
  });
});

app.get('/api/v1/templates/:id', (req, res) => {
  const template = mockTemplates.find(t => t.id === parseInt(req.params.id));
  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }
  res.json(template);
});

// Authentication (simplified)
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = mockUsers.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // In real app, generate JWT token
  const token = `mock-token-${user.id}-${Date.now()}`;
  
  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    },
    tokens: {
      access: token,
      refresh: `refresh-${token}`
    }
  });
});

app.post('/api/v1/auth/register', (req, res) => {
  const { email, name, password } = req.body;
  
  // Check if user exists
  if (mockUsers.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  // Create new user
  const newUser = {
    id: mockUsers.length + 1,
    email,
    name,
    password // In real app, hash this
  };
  
  mockUsers.push(newUser);
  
  const token = `mock-token-${newUser.id}-${Date.now()}`;
  
  return res.status(201).json({
    success: true,
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name
    },
    tokens: {
      access: token,
      refresh: `refresh-${token}`
    }
  });
});

// Verify token (simplified)
app.get('/api/v1/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !token.startsWith('mock-token-')) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  // Extract user ID from token
  const userId = parseInt(token.split('-')[2]);
  const user = mockUsers.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  return res.json({
    id: user.id,
    email: user.email,
    name: user.name
  });
});

// Projects
app.get('/api/v1/projects', (req, res) => {
  // In real app, filter by user
  res.json({
    projects: mockProjects,
    total: mockProjects.length
  });
});

app.post('/api/v1/projects', (req, res) => {
  const { name, templateId } = req.body;
  
  const newProject = {
    id: mockProjects.length + 1,
    name,
    userId: 1, // Mock user ID
    templateId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockProjects.push(newProject);
  
  return res.status(201).json(newProject);
});

// AI endpoints (mock responses)
app.post('/api/v1/ai/generate-image', (req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      images: [
        'https://picsum.photos/1024/1024?random=1',
        'https://picsum.photos/1024/1024?random=2'
      ],
      message: 'Images generated successfully (demo mode)'
    });
  }, 2000); // Simulate processing time
});

app.post('/api/v1/ai/remove-background', (req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      processedImage: 'https://picsum.photos/1024/1024?random=3',
      message: 'Background removed successfully (demo mode)'
    });
  }, 1500);
});

// Export endpoints
app.post('/api/v1/export/:format', (req, res) => {
  const { format } = req.params;
  
  setTimeout(() => {
    res.json({
      success: true,
      downloadUrl: `https://example.com/exports/design.${format}`,
      format,
      message: `Exported as ${format.toUpperCase()} (demo mode)`
    });
  }, 1000);
});

// Status endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({
    services: {
      api: 'healthy',
      database: 'mock',
      cache: 'mock',
      ai: 'mock'
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mode: 'development-simple'
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
  console.log(`🚀 Creative Design Platform API (Simple Mode) running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 API Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`📋 Templates: http://localhost:${PORT}/api/v1/templates`);
  console.log('');
  console.log('🎯 Demo Credentials:');
  console.log('   Email: demo@example.com');
  console.log('   Password: demo123');
  console.log('');
  console.log('✨ Mode: Development (No external dependencies)');
});