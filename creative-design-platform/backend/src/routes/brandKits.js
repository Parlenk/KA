const express = require('express');
const router = express.Router();

// Mock data storage
let mockBrandKits = [];

// Get all brand kits
router.get('/', (req, res) => {
  const { userId } = req.query;
  
  let brandKits = [...mockBrandKits];
  if (userId) {
    brandKits = brandKits.filter(bk => bk.userId === parseInt(userId));
  }
  
  res.json({
    brandKits,
    total: brandKits.length
  });
});

// Create new brand kit
router.post('/', (req, res) => {
  const { name, colors = [], fonts = [], logos = [], userId = 1 } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Brand kit name is required' });
  }
  
  // Validate colors (max 500)
  if (colors.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 colors allowed per brand kit' });
  }
  
  const newBrandKit = {
    id: mockBrandKits.length + 1,
    name,
    userId,
    colors: colors.map((color, index) => ({
      id: `color-${Date.now()}-${index}`,
      hex: color.hex || color,
      name: color.name || `Color ${index + 1}`,
      usage: 0,
      order: index
    })),
    fonts: fonts.map((font, index) => ({
      id: `font-${Date.now()}-${index}`,
      family: font.family || font,
      url: font.url,
      type: font.type || 'custom',
      variants: font.variants || ['regular'],
      usage: 0
    })),
    logos: logos.map((logo, index) => ({
      id: `logo-${Date.now()}-${index}`,
      name: logo.name || `Logo ${index + 1}`,
      url: logo.url,
      type: logo.type || 'primary', // primary, secondary, icon, wordmark
      format: logo.format || 'png',
      usage: 0
    })),
    isDefault: mockBrandKits.filter(bk => bk.userId === userId).length === 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockBrandKits.push(newBrandKit);
  res.status(201).json(newBrandKit);
});

// Get brand kit by ID
router.get('/:id', (req, res) => {
  const brandKit = mockBrandKits.find(bk => bk.id === parseInt(req.params.id));
  if (!brandKit) {
    return res.status(404).json({ error: 'Brand kit not found' });
  }
  res.json(brandKit);
});

// Update brand kit
router.put('/:id', (req, res) => {
  const kitId = parseInt(req.params.id);
  const { name, colors, fonts, logos } = req.body;
  
  const kitIndex = mockBrandKits.findIndex(k => k.id === kitId);
  if (kitIndex === -1) {
    return res.status(404).json({ error: 'Brand kit not found' });
  }
  
  // Validate colors if provided
  if (colors && colors.length > 500) {
    return res.status(400).json({ error: 'Maximum 500 colors allowed per brand kit' });
  }
  
  const existingKit = mockBrandKits[kitIndex];
  
  mockBrandKits[kitIndex] = {
    ...existingKit,
    name: name || existingKit.name,
    colors: colors ? colors.map((color, index) => ({
      id: color.id || `color-${Date.now()}-${index}`,
      hex: color.hex || color,
      name: color.name || `Color ${index + 1}`,
      usage: color.usage || 0,
      order: index
    })) : existingKit.colors,
    fonts: fonts ? fonts.map((font, index) => ({
      id: font.id || `font-${Date.now()}-${index}`,
      family: font.family || font,
      url: font.url,
      type: font.type || 'custom',
      variants: font.variants || ['regular'],
      usage: font.usage || 0
    })) : existingKit.fonts,
    logos: logos ? logos.map((logo, index) => ({
      id: logo.id || `logo-${Date.now()}-${index}`,
      name: logo.name || `Logo ${index + 1}`,
      url: logo.url,
      type: logo.type || 'primary',
      format: logo.format || 'png',
      usage: logo.usage || 0
    })) : existingKit.logos,
    updatedAt: new Date().toISOString()
  };
  
  res.json(mockBrandKits[kitIndex]);
});

// Delete brand kit
router.delete('/:id', (req, res) => {
  const kitId = parseInt(req.params.id);
  
  const kitIndex = mockBrandKits.findIndex(k => k.id === kitId);
  if (kitIndex === -1) {
    return res.status(404).json({ error: 'Brand kit not found' });
  }
  
  const kit = mockBrandKits[kitIndex];
  
  // If this was the default kit, make another one default
  if (kit.isDefault && mockBrandKits.length > 1) {
    const nextKit = mockBrandKits.find(k => k.id !== kitId && k.userId === kit.userId);
    if (nextKit) {
      nextKit.isDefault = true;
    }
  }
  
  mockBrandKits.splice(kitIndex, 1);
  res.json({ success: true, message: 'Brand kit deleted' });
});

// Set default brand kit
router.put('/:id/default', (req, res) => {
  const kitId = parseInt(req.params.id);
  
  const kit = mockBrandKits.find(k => k.id === kitId);
  if (!kit) {
    return res.status(404).json({ error: 'Brand kit not found' });
  }
  
  // Remove default from other kits of the same user
  mockBrandKits.forEach(k => {
    if (k.userId === kit.userId) {
      k.isDefault = k.id === kitId;
    }
  });
  
  res.json({ success: true, message: 'Default brand kit updated' });
});

// Add color to brand kit
router.post('/:id/colors', (req, res) => {
  const kitId = parseInt(req.params.id);
  const { hex, name } = req.body;
  
  if (!hex) {
    return res.status(400).json({ error: 'Color hex value is required' });
  }
  
  const kit = mockBrandKits.find(k => k.id === kitId);
  if (!kit) {
    return res.status(404).json({ error: 'Brand kit not found' });
  }
  
  if (kit.colors.length >= 500) {
    return res.status(400).json({ error: 'Maximum 500 colors allowed per brand kit' });
  }
  
  const newColor = {
    id: `color-${Date.now()}`,
    hex,
    name: name || `Color ${kit.colors.length + 1}`,
    usage: 0,
    order: kit.colors.length
  };
  
  kit.colors.push(newColor);
  kit.updatedAt = new Date().toISOString();
  
  res.status(201).json(newColor);
});

// Add font to brand kit
router.post('/:id/fonts', (req, res) => {
  const kitId = parseInt(req.params.id);
  const { family, url, type = 'custom', variants = ['regular'] } = req.body;
  
  if (!family) {
    return res.status(400).json({ error: 'Font family is required' });
  }
  
  const kit = mockBrandKits.find(k => k.id === kitId);
  if (!kit) {
    return res.status(404).json({ error: 'Brand kit not found' });
  }
  
  const newFont = {
    id: `font-${Date.now()}`,
    family,
    url,
    type,
    variants,
    usage: 0
  };
  
  kit.fonts.push(newFont);
  kit.updatedAt = new Date().toISOString();
  
  res.status(201).json(newFont);
});

// Add logo to brand kit
router.post('/:id/logos', (req, res) => {
  const kitId = parseInt(req.params.id);
  const { name, url, type = 'primary', format = 'png' } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Logo URL is required' });
  }
  
  const kit = mockBrandKits.find(k => k.id === kitId);
  if (!kit) {
    return res.status(404).json({ error: 'Brand kit not found' });
  }
  
  const newLogo = {
    id: `logo-${Date.now()}`,
    name: name || `Logo ${kit.logos.length + 1}`,
    url,
    type,
    format,
    usage: 0
  };
  
  kit.logos.push(newLogo);
  kit.updatedAt = new Date().toISOString();
  
  res.status(201).json(newLogo);
});

// Extract color palette from image (AI)
router.post('/extract-palette', (req, res) => {
  const { imageUrl } = req.body;
  
  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }
  
  // Simulate AI palette extraction
  setTimeout(() => {
    const extractedColors = [
      { hex: '#FF6B6B', name: 'Coral Red' },
      { hex: '#4ECDC4', name: 'Turquoise' },
      { hex: '#45B7D1', name: 'Sky Blue' },
      { hex: '#F7DC6F', name: 'Sunny Yellow' },
      { hex: '#BB8FCE', name: 'Soft Purple' },
      { hex: '#F8F9F9', name: 'Off White' },
      { hex: '#2C3E50', name: 'Dark Blue' },
      { hex: '#27AE60', name: 'Forest Green' }
    ];
    
    res.json({
      success: true,
      colors: extractedColors,
      dominantColor: extractedColors[0],
      message: 'Colors extracted successfully'
    });
  }, 1500);
});

// Generate color variations
router.post('/generate-variations', (req, res) => {
  const { baseColor, count = 5 } = req.body;
  
  if (!baseColor) {
    return res.status(400).json({ error: 'Base color is required' });
  }
  
  // Simulate color variation generation
  const variations = [];
  for (let i = 0; i < count; i++) {
    variations.push({
      hex: adjustColor(baseColor, (i + 1) * 20),
      name: `Variation ${i + 1}`
    });
  }
  
  res.json({
    success: true,
    baseColor,
    variations
  });
});

// Track asset usage
router.post('/:id/track-usage', (req, res) => {
  const kitId = parseInt(req.params.id);
  const { assetType, assetId } = req.body;
  
  const kit = mockBrandKits.find(k => k.id === kitId);
  if (!kit) {
    return res.status(404).json({ error: 'Brand kit not found' });
  }
  
  let asset;
  switch (assetType) {
    case 'color':
      asset = kit.colors.find(c => c.id === assetId);
      break;
    case 'font':
      asset = kit.fonts.find(f => f.id === assetId);
      break;
    case 'logo':
      asset = kit.logos.find(l => l.id === assetId);
      break;
  }
  
  if (asset) {
    asset.usage++;
    kit.updatedAt = new Date().toISOString();
  }
  
  res.json({ success: true, usage: asset ? asset.usage : 0 });
});

// Export/Import brand kit
router.get('/:id/export', (req, res) => {
  const kit = mockBrandKits.find(k => k.id === parseInt(req.params.id));
  if (!kit) {
    return res.status(404).json({ error: 'Brand kit not found' });
  }
  
  const exportData = {
    version: '1.0',
    exported: new Date().toISOString(),
    brandKit: {
      name: kit.name,
      colors: kit.colors,
      fonts: kit.fonts,
      logos: kit.logos
    }
  };
  
  res.json(exportData);
});

router.post('/import', (req, res) => {
  const { brandKit, userId = 1 } = req.body;
  
  if (!brandKit || !brandKit.name) {
    return res.status(400).json({ error: 'Invalid brand kit data' });
  }
  
  const imported = {
    id: mockBrandKits.length + 1,
    ...brandKit,
    userId,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockBrandKits.push(imported);
  res.status(201).json(imported);
});

// Helper function to adjust color
function adjustColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

module.exports = router;