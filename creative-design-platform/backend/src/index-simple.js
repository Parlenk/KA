const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes (skip routes with external dependencies for simple mode)
// const designSetsRoutes = require('./routes/designSets');
// const animationsRoutes = require('./routes/animations');
// const brandKitsRoutes = require('./routes/brandKits');
// const exportsRoutes = require('./routes/exports');
// const adSizesRoutes = require('./routes/adSizes');
// const canvasRoutes = require('./routes/canvas');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve exported files
app.use('/exports', express.static('uploads/exports'));

// Mock data
let mockDesignSets = [];
let mockAnimations = [];
let mockBrandKits = [];
let mockExportJobs = [];
let mockDesigns = [];

// Standard advertising platform sizes
const adPlatformSizes = {
  facebook: [
    { name: 'Facebook Feed', width: 1200, height: 630, platform: 'Facebook' },
    { name: 'Facebook Square', width: 1080, height: 1080, platform: 'Facebook' },
    { name: 'Facebook Story', width: 1080, height: 1920, platform: 'Facebook' },
    { name: 'Facebook Event Cover', width: 1920, height: 1080, platform: 'Facebook' },
    { name: 'Facebook Cover Photo', width: 1640, height: 859, platform: 'Facebook' }
  ],
  instagram: [
    { name: 'Instagram Feed', width: 1080, height: 1080, platform: 'Instagram' },
    { name: 'Instagram Story', width: 1080, height: 1920, platform: 'Instagram' },
    { name: 'Instagram Reel', width: 1080, height: 1920, platform: 'Instagram' },
    { name: 'Instagram Carousel', width: 1080, height: 1080, platform: 'Instagram' },
    { name: 'Instagram IGTV', width: 1080, height: 1350, platform: 'Instagram' }
  ],
  google: [
    { name: 'Google Display Banner', width: 728, height: 90, platform: 'Google Ads' },
    { name: 'Google Medium Rectangle', width: 300, height: 250, platform: 'Google Ads' },
    { name: 'Google Leaderboard', width: 728, height: 90, platform: 'Google Ads' },
    { name: 'Google Large Rectangle', width: 336, height: 280, platform: 'Google Ads' },
    { name: 'Google Mobile Banner', width: 320, height: 50, platform: 'Google Ads' },
    { name: 'Google Skyscraper', width: 160, height: 600, platform: 'Google Ads' }
  ],
  linkedin: [
    { name: 'LinkedIn Feed', width: 1200, height: 627, platform: 'LinkedIn' },
    { name: 'LinkedIn Story', width: 1080, height: 1920, platform: 'LinkedIn' },
    { name: 'LinkedIn Event', width: 1776, height: 888, platform: 'LinkedIn' },
    { name: 'LinkedIn Company Cover', width: 1536, height: 768, platform: 'LinkedIn' },
    { name: 'LinkedIn Message Ad', width: 300, height: 250, platform: 'LinkedIn' }
  ],
  twitter: [
    { name: 'Twitter Feed', width: 1200, height: 675, platform: 'Twitter/X' },
    { name: 'Twitter Header', width: 1500, height: 500, platform: 'Twitter/X' },
    { name: 'Twitter Card', width: 1200, height: 630, platform: 'Twitter/X' },
    { name: 'Twitter Promoted Tweet', width: 1200, height: 675, platform: 'Twitter/X' }
  ],
  youtube: [
    { name: 'YouTube Thumbnail', width: 1280, height: 720, platform: 'YouTube' },
    { name: 'YouTube Channel Art', width: 2560, height: 1440, platform: 'YouTube' },
    { name: 'YouTube End Screen', width: 1280, height: 720, platform: 'YouTube' },
    { name: 'YouTube Community Post', width: 1200, height: 675, platform: 'YouTube' }
  ],
  tiktok: [
    { name: 'TikTok Video', width: 1080, height: 1920, platform: 'TikTok' },
    { name: 'TikTok Spark Ad', width: 1080, height: 1920, platform: 'TikTok' },
    { name: 'TikTok Collection Ad', width: 1080, height: 1920, platform: 'TikTok' }
  ]
};

const mockTemplates = [
  {
    id: 1,
    name: 'Kredivo Loan Campaign',
    category: 'social',
    description: 'Social media ads for Kredivo loan products',
    dimensions: { width: 1080, height: 1080 },
    thumbnail: '/templates/kredivo-loan-square.jpg',
    tags: ['kredivo', 'loan', 'finance', 'social'],
    adSizes: adPlatformSizes.instagram.concat(adPlatformSizes.facebook.filter(s => s.name.includes('Square')))
  },
  {
    id: 2,
    name: 'Credit Card Promotion',
    category: 'digital',
    description: 'Digital banner for Kredivo credit card offers',
    dimensions: { width: 1200, height: 630 },
    thumbnail: '/templates/kredivo-card-banner.jpg',
    tags: ['kredivo', 'credit-card', 'promotion', 'digital'],
    adSizes: adPlatformSizes.facebook.concat(adPlatformSizes.google)
  },
  {
    id: 3,
    name: 'Payment Solutions Ad',
    category: 'web',
    description: 'Web banner promoting Kredivo payment services',
    dimensions: { width: 1200, height: 400 },
    thumbnail: '/templates/kredivo-payment-web.jpg',
    tags: ['kredivo', 'payment', 'fintech', 'web'],
    adSizes: adPlatformSizes.google.concat(adPlatformSizes.linkedin)
  },
  {
    id: 4,
    name: 'Mobile App Install',
    category: 'social',
    description: 'Instagram stories promoting Kredivo mobile app',
    dimensions: { width: 1080, height: 1920 },
    thumbnail: '/templates/kredivo-app-story.jpg',
    tags: ['kredivo', 'mobile-app', 'download', 'story'],
    adSizes: [
      ...adPlatformSizes.instagram.filter(s => s.name.includes('Story')),
      ...adPlatformSizes.facebook.filter(s => s.name.includes('Story')),
      ...adPlatformSizes.tiktok
    ]
  },
  {
    id: 5,
    name: 'Financial Education',
    category: 'social',
    description: 'Educational content about financial literacy',
    dimensions: { width: 1080, height: 1080 },
    thumbnail: '/templates/kredivo-education.jpg',
    tags: ['kredivo', 'education', 'finance', 'tips'],
    adSizes: adPlatformSizes.instagram.concat(adPlatformSizes.linkedin)
  },
  {
    id: 6,
    name: 'Partnership Campaign',
    category: 'digital',
    description: 'Ads for Kredivo merchant partnerships',
    dimensions: { width: 1200, height: 630 },
    thumbnail: '/templates/kredivo-partnership.jpg',
    tags: ['kredivo', 'partnership', 'merchant', 'collaboration'],
    adSizes: adPlatformSizes.linkedin.concat(adPlatformSizes.twitter)
  },
  {
    id: 7,
    name: 'Facebook Ads Bundle',
    category: 'platform-pack',
    description: 'Complete Facebook advertising template pack with all standard sizes',
    dimensions: { width: 1200, height: 630 },
    thumbnail: '/templates/facebook-ads-bundle.jpg',
    tags: ['facebook', 'bundle', 'platform-pack', 'complete-set'],
    adSizes: adPlatformSizes.facebook
  },
  {
    id: 8,
    name: 'Google Ads Bundle',
    category: 'platform-pack',
    description: 'Complete Google Ads template pack with all display banner sizes',
    dimensions: { width: 728, height: 90 },
    thumbnail: '/templates/google-ads-bundle.jpg',
    tags: ['google', 'display', 'bundle', 'platform-pack'],
    adSizes: adPlatformSizes.google
  },
  {
    id: 9,
    name: 'Instagram Marketing Pack',
    category: 'platform-pack',
    description: 'Complete Instagram template pack including Feed, Story, and IGTV formats',
    dimensions: { width: 1080, height: 1080 },
    thumbnail: '/templates/instagram-marketing-pack.jpg',
    tags: ['instagram', 'marketing', 'bundle', 'social'],
    adSizes: adPlatformSizes.instagram
  },
  {
    id: 10,
    name: 'LinkedIn Business Pack',
    category: 'platform-pack',
    description: 'Professional LinkedIn advertising templates for B2B campaigns',
    dimensions: { width: 1200, height: 627 },
    thumbnail: '/templates/linkedin-business-pack.jpg',
    tags: ['linkedin', 'business', 'b2b', 'professional'],
    adSizes: adPlatformSizes.linkedin
  },
  {
    id: 11,
    name: 'Social Media Stories Pack',
    category: 'platform-pack',
    description: 'Vertical story templates for Instagram, Facebook, and TikTok',
    dimensions: { width: 1080, height: 1920 },
    thumbnail: '/templates/stories-pack.jpg',
    tags: ['stories', 'vertical', 'social', 'mobile'],
    adSizes: [
      ...adPlatformSizes.instagram.filter(s => s.name.includes('Story')),
      ...adPlatformSizes.facebook.filter(s => s.name.includes('Story')),
      ...adPlatformSizes.tiktok
    ]
  },
  {
    id: 12,
    name: 'YouTube Marketing Pack',
    category: 'platform-pack',
    description: 'YouTube templates including thumbnails and channel art',
    dimensions: { width: 1280, height: 720 },
    thumbnail: '/templates/youtube-pack.jpg',
    tags: ['youtube', 'video', 'thumbnails', 'channel'],
    adSizes: adPlatformSizes.youtube
  }
];

let mockUsers = [
  {
    id: 1,
    email: 'demo@example.com',
    name: 'Demo User',
    password: 'demo123'
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
    service: 'Kredivo Ads Center API (Simple Mode)',
    version: '1.0.0-dev',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API v1 routes
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Kredivo Ads Center API',
    version: '1.0.0',
    mode: 'development-simple'
  });
});

// Templates (optimized for faster response)
app.get('/api/v1/templates', (req, res) => {
  console.log('📋 Templates API called:', new Date().toISOString());
  
  // Set caching headers for better performance
  res.set({
    'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
    'ETag': `"templates-${mockTemplates.length}-${Date.now()}"`,
    'X-Response-Time': Date.now()
  });
  
  const { category, search, platform } = req.query;
  
  // Start with a shallow copy for better performance
  let filteredTemplates = mockTemplates;
  
  // Apply filters efficiently
  if (category && category !== 'all') {
    filteredTemplates = filteredTemplates.filter(t => t.category === category);
  }
  
  if (platform) {
    // Filter templates that have sizes for the specified platform
    filteredTemplates = filteredTemplates.filter(t => 
      t.adSizes && t.adSizes.some(size => 
        size.platform && size.platform.toLowerCase().includes(platform.toLowerCase())
      )
    );
  }
  
  if (search) {
    const searchTerm = search.toLowerCase();
    filteredTemplates = filteredTemplates.filter(t => 
      t.name.toLowerCase().includes(searchTerm) ||
      t.description.toLowerCase().includes(searchTerm) ||
      t.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }
  
  // Prepare response data with only essential fields for list view
  const optimizedTemplates = filteredTemplates.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    dimensions: t.dimensions,
    thumbnail: t.thumbnail,
    tags: t.tags,
    adSizes: t.adSizes ? t.adSizes.length : 0 // Just count for performance
  }));
  
  const responseTime = Date.now() - parseInt(res.get('X-Response-Time'));
  console.log(`✅ Templates API response sent (${responseTime}ms): ${optimizedTemplates.length} templates`);
  
  res.json({
    templates: optimizedTemplates,
    total: optimizedTemplates.length,
    categories: ['social', 'digital', 'web', 'platform-pack', 'custom'],
    platforms: Object.keys(adPlatformSizes),
    cached: true,
    responseTime: `${responseTime}ms`
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
  try {
    console.log('Login attempt:', req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    console.log('Looking for user:', email);
    console.log('Available users:', mockUsers);
    
    const user = mockUsers.find(u => u.email === email && u.password === password);
    if (!user) {
      console.log('User not found or password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('User found:', user);
    const token = `mock-token-${user.id}-${Date.now()}`;
    
    const response = {
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
    };
    
    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/v1/auth/register', (req, res) => {
  const { email, name, password } = req.body;
  
  if (mockUsers.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  const newUser = {
    id: mockUsers.length + 1,
    email,
    name,
    password
  };
  
  mockUsers.push(newUser);
  
  const token = `mock-token-${newUser.id}-${Date.now()}`;
  
  res.status(201).json({
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

// Verify token
app.get('/api/v1/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !token.startsWith('mock-token-')) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  const userId = parseInt(token.split('-')[2]);
  const user = mockUsers.find(u => u.id === userId);
  
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name
  });
});

// Mount Phase 2 route modules (disabled for simple mode)
// app.use('/api/v1/design-sets', designSetsRoutes);
// app.use('/api/v1/animations', animationsRoutes);
// app.use('/api/v1/brand-kits', brandKitsRoutes);
// app.use('/api/v1/exports', exportsRoutes);
// app.use('/api/v1/ad-sizes', adSizesRoutes);
// app.use('/api/v1/canvas', canvasRoutes);

// Simple mock endpoints for Phase 2 features
app.get('/api/v1/design-sets', (req, res) => {
  res.json({ designSets: [], message: 'Running in simple mode' });
});

app.get('/api/v1/animations', (req, res) => {
  res.json({ animations: [], message: 'Running in simple mode' });
});

app.get('/api/v1/brand-kits', (req, res) => {
  res.json({ brandKits: [], message: 'Running in simple mode' });
});

app.get('/api/v1/exports', (req, res) => {
  res.json({ exports: [], message: 'Running in simple mode' });
});

app.get('/api/v1/ad-sizes', (req, res) => {
  const { platform } = req.query;
  
  if (platform && adPlatformSizes[platform.toLowerCase()]) {
    res.json({
      adSizes: adPlatformSizes[platform.toLowerCase()],
      platform: platform,
      total: adPlatformSizes[platform.toLowerCase()].length
    });
  } else {
    // Return all sizes grouped by platform
    const allSizes = Object.entries(adPlatformSizes).reduce((acc, [platform, sizes]) => {
      acc[platform] = sizes;
      return acc;
    }, {});
    
    res.json({
      adSizes: allSizes,
      platforms: Object.keys(adPlatformSizes),
      total: Object.values(adPlatformSizes).reduce((sum, sizes) => sum + sizes.length, 0)
    });
  }
});

// Get available platforms
app.get('/api/v1/platforms', (req, res) => {
  const platformInfo = Object.entries(adPlatformSizes).map(([key, sizes]) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    sizeCount: sizes.length,
    sizes: sizes
  }));
  
  res.json({
    platforms: platformInfo,
    total: platformInfo.length
  });
});

// Projects
app.get('/api/v1/projects', (req, res) => {
  res.json({
    projects: mockProjects,
    total: mockProjects.length
  });
});

app.post('/api/v1/projects', (req, res) => {
  const { name, templateId, canvasSize } = req.body;
  
  console.log('📝 Creating new project:', { 
    name, 
    templateId, 
    canvasSize: canvasSize || 'default' 
  });
  
  const newProject = {
    id: mockProjects.length + 1,
    name,
    userId: 1,
    templateId,
    canvasSize: canvasSize || { width: 800, height: 600, name: 'Default' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockProjects.push(newProject);
  
  console.log('✅ Project created successfully:', newProject.id);
  res.status(201).json(newProject);
});

app.get('/api/v1/projects/:id', (req, res) => {
  const project = mockProjects.find(p => p.id === parseInt(req.params.id));
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(project);
});

app.delete('/api/v1/projects/:id', (req, res) => {
  const projectId = parseInt(req.params.id);
  const projectIndex = mockProjects.findIndex(p => p.id === projectId);
  
  if (projectIndex === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  const deletedProject = mockProjects.splice(projectIndex, 1)[0];
  
  // Also remove any associated canvas data
  mockDesigns = mockDesigns.filter(d => d.projectId !== projectId);
  
  res.json({
    success: true,
    message: 'Project deleted successfully',
    deletedProject
  });
});

// Save project as template
app.post('/api/v1/projects/:id/save-as-template', (req, res) => {
  const projectId = parseInt(req.params.id);
  const { templateName, description, category = 'custom', sizes = [] } = req.body;
  
  const project = mockProjects.find(p => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  // Create new template from project
  const newTemplate = {
    id: mockTemplates.length + 1,
    name: templateName || `${project.name} Template`,
    category: category,
    description: description || `Template created from ${project.name}`,
    dimensions: { width: 1080, height: 1080 }, // Default, can be customized
    thumbnail: `/templates/custom-${Date.now()}.jpg`,
    tags: ['custom', 'user-created', project.name.toLowerCase().replace(/\s+/g, '-')],
    isCustom: true,
    originalProjectId: projectId,
    createdAt: new Date().toISOString(),
    sizes: sizes.length > 0 ? sizes : [
      { name: 'Original', width: 1080, height: 1080 }
    ]
  };
  
  mockTemplates.push(newTemplate);
  
  res.status(201).json({
    success: true,
    template: newTemplate,
    message: 'Template created successfully'
  });
});

// AI Learning routes
const aiLearningRoutes = require('./routes/aiLearning');
app.use('/api/v1/ai', aiLearningRoutes);

// AI endpoints (mock)
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
  }, 2000);
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

// Canvas data endpoints (kept in main file for shared access)
app.get('/api/v1/designs/:id/canvas', (req, res) => {
  const design = mockDesigns.find(d => d.id === parseInt(req.params.id));
  if (!design) {
    return res.status(404).json({ error: 'Design not found' });
  }
  res.json(design.canvas);
});

app.put('/api/v1/designs/:id/canvas', (req, res) => {
  const designId = parseInt(req.params.id);
  const { canvas } = req.body;
  
  const designIndex = mockDesigns.findIndex(d => d.id === designId);
  if (designIndex === -1) {
    return res.status(404).json({ error: 'Design not found' });
  }
  
  mockDesigns[designIndex].canvas = canvas;
  res.json({ success: true, canvas });
});

// Project/Design save and load endpoints
app.get('/api/v1/projects/:id/canvas', (req, res) => {
  const projectId = parseInt(req.params.id);
  const design = mockDesigns.find(d => d.projectId === projectId);
  
  if (!design) {
    // Return empty canvas if no design exists yet
    return res.json({
      success: true,
      canvas: {
        version: "5.3.0",
        objects: [],
        background: "#ffffff"
      },
      message: 'No saved design found, starting with empty canvas'
    });
  }
  
  res.json({
    success: true,
    canvas: design.canvas,
    lastSaved: design.updatedAt
  });
});

app.post('/api/v1/projects/:id/save', (req, res) => {
  const projectId = parseInt(req.params.id);
  const { canvas, thumbnail } = req.body;
  
  console.log('💾 Save project API called:', {
    projectId,
    hasCanvas: !!canvas,
    hasThumbnail: !!thumbnail,
    canvasType: typeof canvas,
    bodyKeys: Object.keys(req.body)
  });
  
  if (!canvas) {
    console.error('❌ Save failed: No canvas data provided');
    return res.status(400).json({ error: 'Canvas data is required' });
  }
  
  // Check if project exists
  const project = mockProjects.find(p => p.id === projectId);
  if (!project) {
    console.error('❌ Save failed: Project not found:', projectId);
    return res.status(404).json({ error: 'Project not found' });
  }
  
  console.log('✅ Project found:', project.name);
  
  // Find existing design or create new one
  const existingDesignIndex = mockDesigns.findIndex(d => d.projectId === projectId);
  const timestamp = new Date().toISOString();
  
  if (existingDesignIndex !== -1) {
    // Update existing design
    mockDesigns[existingDesignIndex] = {
      ...mockDesigns[existingDesignIndex],
      canvas: canvas,
      thumbnail: thumbnail,
      updatedAt: timestamp
    };
  } else {
    // Create new design
    const newDesign = {
      id: mockDesigns.length + 1,
      projectId: projectId,
      canvas: canvas,
      thumbnail: thumbnail,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    mockDesigns.push(newDesign);
  }
  
  // Update project's updatedAt timestamp
  const projectIndex = mockProjects.findIndex(p => p.id === projectId);
  if (projectIndex !== -1) {
    mockProjects[projectIndex].updatedAt = timestamp;
  }
  
  res.json({
    success: true,
    message: 'Design saved successfully',
    savedAt: timestamp,
    projectId: projectId
  });
});

// Auto-save endpoint (for frequent saves)
app.post('/api/v1/projects/:id/autosave', (req, res) => {
  const projectId = parseInt(req.params.id);
  const { canvas } = req.body;
  
  if (!canvas) {
    return res.status(400).json({ error: 'Canvas data is required' });
  }
  
  // Check if project exists
  const project = mockProjects.find(p => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  
  // Find existing design or create new one
  const existingDesignIndex = mockDesigns.findIndex(d => d.projectId === projectId);
  const timestamp = new Date().toISOString();
  
  if (existingDesignIndex !== -1) {
    // Update existing design (autosave doesn't update thumbnail)
    mockDesigns[existingDesignIndex] = {
      ...mockDesigns[existingDesignIndex],
      canvas: canvas,
      updatedAt: timestamp,
      autoSavedAt: timestamp
    };
  } else {
    // Create new design
    const newDesign = {
      id: mockDesigns.length + 1,
      projectId: projectId,
      canvas: canvas,
      createdAt: timestamp,
      updatedAt: timestamp,
      autoSavedAt: timestamp
    };
    mockDesigns.push(newDesign);
  }
  
  res.json({
    success: true,
    message: 'Design auto-saved',
    autoSavedAt: timestamp
  });
});

// Status
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
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Kredivo Ads Center API (Simple Mode) running on http://localhost:${PORT}`);
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