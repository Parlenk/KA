const express = require('express');
const {
  standardAdSizes,
  getAdSizeById,
  getAdSizesByCategory,
  getAdSizesByPlatform,
  getPopularSizes,
  searchAdSizes,
  getAdSizeCategories,
  getAdSizePlatforms,
  createCustomSize,
  validateDimensions,
  getSimilarSizes
} = require('../utils/adSizes');

const router = express.Router();

// Get all ad sizes
router.get('/', (req, res) => {
  const { category, platform, search, popular } = req.query;
  
  let sizes = [...standardAdSizes];
  
  if (popular === 'true') {
    sizes = getPopularSizes();
  } else {
    if (category) {
      sizes = getAdSizesByCategory(category);
    }
    
    if (platform) {
      sizes = sizes.filter(size => size.platform === platform);
    }
    
    if (search) {
      sizes = searchAdSizes(search);
    }
  }
  
  res.json({
    sizes,
    total: sizes.length,
    categories: getAdSizeCategories(),
    platforms: getAdSizePlatforms()
  });
});

// Get ad size by ID
router.get('/:id', (req, res) => {
  const size = getAdSizeById(req.params.id);
  
  if (!size) {
    return res.status(404).json({ error: 'Ad size not found' });
  }
  
  // Get similar sizes
  const similar = getSimilarSizes(size.width, size.height, 0.15)
    .filter(s => s.id !== size.id)
    .slice(0, 5);
  
  res.json({
    ...size,
    similar
  });
});

// Get ad sizes by category
router.get('/category/:category', (req, res) => {
  const { category } = req.params;
  const sizes = getAdSizesByCategory(category);
  
  if (sizes.length === 0) {
    return res.status(404).json({ error: 'Category not found' });
  }
  
  res.json({
    category,
    sizes,
    total: sizes.length
  });
});

// Get ad sizes by platform
router.get('/platform/:platform', (req, res) => {
  const { platform } = req.params;
  const sizes = getAdSizesByPlatform(platform);
  
  if (sizes.length === 0) {
    return res.status(404).json({ error: 'Platform not found' });
  }
  
  res.json({
    platform,
    sizes,
    total: sizes.length
  });
});

// Search ad sizes
router.get('/search/:query', (req, res) => {
  const { query } = req.params;
  const sizes = searchAdSizes(query);
  
  res.json({
    query,
    sizes,
    total: sizes.length
  });
});

// Get popular/recommended sizes
router.get('/popular', (req, res) => {
  const popular = getPopularSizes();
  
  res.json({
    sizes: popular,
    total: popular.length
  });
});

// Validate custom dimensions
router.post('/validate', (req, res) => {
  const { width, height } = req.body;
  
  if (!width || !height || !Number.isInteger(width) || !Number.isInteger(height)) {
    return res.status(400).json({ 
      error: 'Width and height must be integers' 
    });
  }
  
  const validation = validateDimensions(width, height);
  
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error,
      valid: false
    });
  }
  
  // Find similar standard sizes
  const similar = getSimilarSizes(width, height, 0.2).slice(0, 3);
  
  res.json({
    valid: true,
    dimensions: { width, height },
    aspectRatio: `${width}:${height}`,
    similar
  });
});

// Create custom size
router.post('/custom', (req, res) => {
  const { width, height, name } = req.body;
  
  if (!width || !height || !Number.isInteger(width) || !Number.isInteger(height)) {
    return res.status(400).json({ 
      error: 'Width and height must be integers' 
    });
  }
  
  const validation = validateDimensions(width, height);
  
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error
    });
  }
  
  const customSize = createCustomSize(width, height, name);
  
  res.status(201).json(customSize);
});

// Get size recommendations based on usage/purpose
router.get('/recommendations/:purpose', (req, res) => {
  const { purpose } = req.params;
  
  const recommendations = {
    'social-media': [
      'instagram-post', 'instagram-story', 'facebook-feed', 'facebook-story',
      'twitter-post', 'linkedin-post', 'pinterest-pin', 'youtube-thumbnail'
    ],
    'advertising': [
      'medium-rectangle', 'leaderboard', 'wide-skyscraper', 'billboard',
      'facebook-feed', 'instagram-post', 'mobile-banner'
    ],
    'print': [
      'a4-portrait', 'a4-landscape', 'business-card', 'postcard-4x6',
      'flyer-a5', 'poster-a2'
    ],
    'web': [
      'website-header', 'website-banner', 'blog-header', 'email-header',
      'desktop-wallpaper', 'mobile-wallpaper'
    ],
    'video': [
      'full-hd', 'hd', 'square-video', 'vertical-video', '4k-uhd',
      'youtube-video', 'instagram-reels', 'tiktok-video'
    ]
  };
  
  const sizeIds = recommendations[purpose];
  
  if (!sizeIds) {
    return res.status(404).json({ error: 'Purpose not found' });
  }
  
  const sizes = sizeIds.map(id => getAdSizeById(id)).filter(Boolean);
  
  res.json({
    purpose,
    sizes,
    total: sizes.length
  });
});

// Get aspect ratio groups
router.get('/aspect-ratios', (req, res) => {
  const ratioGroups = {};
  
  standardAdSizes.forEach(size => {
    const ratio = size.ratio;
    if (!ratioGroups[ratio]) {
      ratioGroups[ratio] = [];
    }
    ratioGroups[ratio].push(size);
  });
  
  const ratios = Object.keys(ratioGroups).map(ratio => ({
    ratio,
    name: getRatioName(ratio),
    sizes: ratioGroups[ratio],
    count: ratioGroups[ratio].length
  })).sort((a, b) => b.count - a.count);
  
  res.json({
    ratios,
    total: ratios.length
  });
});

// Helper function to get friendly ratio names
function getRatioName(ratio) {
  const names = {
    '1:1': 'Square',
    '16:9': 'Widescreen',
    '9:16': 'Portrait',
    '4:3': 'Standard',
    '3:2': 'Classic Photo',
    '21:9': 'Ultra-wide',
    '2:3': 'Portrait Photo'
  };
  
  return names[ratio] || ratio;
}

module.exports = router;