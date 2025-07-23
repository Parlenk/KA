// Standard ad sizes utility
// This file provides the same data as the database seed for frontend use

const standardAdSizes = [
  // Social Media - Facebook
  { id: 'facebook-feed', name: 'Facebook Feed Post', width: 1200, height: 630, category: 'social', platform: 'facebook', ratio: '1.91:1' },
  { id: 'facebook-square', name: 'Facebook Square Post', width: 1080, height: 1080, category: 'social', platform: 'facebook', ratio: '1:1' },
  { id: 'facebook-story', name: 'Facebook Story', width: 1080, height: 1920, category: 'social', platform: 'facebook', ratio: '9:16' },
  { id: 'facebook-cover', name: 'Facebook Cover Photo', width: 1200, height: 315, category: 'social', platform: 'facebook', ratio: '3.81:1' },
  { id: 'facebook-event', name: 'Facebook Event Cover', width: 1920, height: 1080, category: 'social', platform: 'facebook', ratio: '16:9' },
  { id: 'facebook-video-landscape', name: 'Facebook Video Landscape', width: 1280, height: 720, category: 'video', platform: 'facebook', ratio: '16:9' },
  { id: 'facebook-video-square', name: 'Facebook Video Square', width: 1080, height: 1080, category: 'video', platform: 'facebook', ratio: '1:1' },
  
  // Social Media - Instagram
  { id: 'instagram-post', name: 'Instagram Feed Post', width: 1080, height: 1080, category: 'social', platform: 'instagram', ratio: '1:1' },
  { id: 'instagram-story', name: 'Instagram Story', width: 1080, height: 1920, category: 'social', platform: 'instagram', ratio: '9:16' },
  { id: 'instagram-reels', name: 'Instagram Reels', width: 1080, height: 1920, category: 'video', platform: 'instagram', ratio: '9:16' },
  { id: 'instagram-video-landscape', name: 'Instagram Video Landscape', width: 1200, height: 628, category: 'video', platform: 'instagram', ratio: '1.91:1' },
  { id: 'instagram-igtv', name: 'Instagram IGTV Cover', width: 420, height: 654, category: 'social', platform: 'instagram', ratio: '9:14' },
  
  // Social Media - Twitter/X
  { id: 'twitter-post', name: 'Twitter/X Post', width: 1200, height: 675, category: 'social', platform: 'twitter', ratio: '16:9' },
  { id: 'twitter-header', name: 'Twitter/X Header', width: 1500, height: 500, category: 'social', platform: 'twitter', ratio: '3:1' },
  { id: 'twitter-video', name: 'Twitter/X Video', width: 1280, height: 720, category: 'video', platform: 'twitter', ratio: '16:9' },
  
  // Social Media - LinkedIn
  { id: 'linkedin-post', name: 'LinkedIn Feed Post', width: 1200, height: 627, category: 'social', platform: 'linkedin', ratio: '1.91:1' },
  { id: 'linkedin-company-cover', name: 'LinkedIn Company Cover', width: 1536, height: 768, category: 'social', platform: 'linkedin', ratio: '2:1' },
  { id: 'linkedin-personal-cover', name: 'LinkedIn Personal Cover', width: 1584, height: 396, category: 'social', platform: 'linkedin', ratio: '4:1' },
  { id: 'linkedin-article', name: 'LinkedIn Article Cover', width: 1200, height: 627, category: 'social', platform: 'linkedin', ratio: '1.91:1' },
  
  // Social Media - TikTok
  { id: 'tiktok-video', name: 'TikTok Video', width: 1080, height: 1920, category: 'video', platform: 'tiktok', ratio: '9:16' },
  { id: 'tiktok-profile', name: 'TikTok Profile Picture', width: 200, height: 200, category: 'social', platform: 'tiktok', ratio: '1:1' },
  
  // Social Media - YouTube
  { id: 'youtube-thumbnail', name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'social', platform: 'youtube', ratio: '16:9' },
  { id: 'youtube-channel-art', name: 'YouTube Channel Art', width: 2560, height: 1440, category: 'social', platform: 'youtube', ratio: '16:9' },
  { id: 'youtube-video', name: 'YouTube Video', width: 1920, height: 1080, category: 'video', platform: 'youtube', ratio: '16:9' },
  { id: 'youtube-shorts', name: 'YouTube Shorts', width: 1080, height: 1920, category: 'video', platform: 'youtube', ratio: '9:16' },
  
  // Social Media - Pinterest
  { id: 'pinterest-pin', name: 'Pinterest Pin', width: 1000, height: 1500, category: 'social', platform: 'pinterest', ratio: '2:3' },
  { id: 'pinterest-square', name: 'Pinterest Square Pin', width: 1080, height: 1080, category: 'social', platform: 'pinterest', ratio: '1:1' },
  
  // Display Advertising - Google Ads
  { id: 'medium-rectangle', name: 'Medium Rectangle', width: 300, height: 250, category: 'display', platform: 'google-ads', ratio: '6:5' },
  { id: 'large-rectangle', name: 'Large Rectangle', width: 336, height: 280, category: 'display', platform: 'google-ads', ratio: '6:5' },
  { id: 'leaderboard', name: 'Leaderboard', width: 728, height: 90, category: 'display', platform: 'google-ads', ratio: '8.09:1' },
  { id: 'wide-skyscraper', name: 'Wide Skyscraper', width: 160, height: 600, category: 'display', platform: 'google-ads', ratio: '4:15' },
  { id: 'mobile-banner', name: 'Mobile Banner', width: 320, height: 50, category: 'display', platform: 'google-ads', ratio: '32:5' },
  { id: 'large-mobile-banner', name: 'Large Mobile Banner', width: 320, height: 100, category: 'display', platform: 'google-ads', ratio: '16:5' },
  { id: 'half-page', name: 'Half Page', width: 300, height: 600, category: 'display', platform: 'google-ads', ratio: '1:2' },
  { id: 'large-leaderboard', name: 'Large Leaderboard', width: 970, height: 90, category: 'display', platform: 'google-ads', ratio: '10.78:1' },
  { id: 'billboard', name: 'Billboard', width: 970, height: 250, category: 'display', platform: 'google-ads', ratio: '3.88:1' },
  { id: 'portrait', name: 'Portrait', width: 300, height: 1050, category: 'display', platform: 'google-ads', ratio: '2:7' },
  
  // Print Media
  { id: 'a4-portrait', name: 'A4 Portrait', width: 2480, height: 3508, category: 'print', platform: null, ratio: '√2:2' },
  { id: 'a4-landscape', name: 'A4 Landscape', width: 3508, height: 2480, category: 'print', platform: null, ratio: '2:√2' },
  { id: 'a3-portrait', name: 'A3 Portrait', width: 3508, height: 4961, category: 'print', platform: null, ratio: '√2:2' },
  { id: 'a3-landscape', name: 'A3 Landscape', width: 4961, height: 3508, category: 'print', platform: null, ratio: '2:√2' },
  { id: 'letter-portrait', name: 'Letter Portrait', width: 2550, height: 3300, category: 'print', platform: null, ratio: '17:22' },
  { id: 'letter-landscape', name: 'Letter Landscape', width: 3300, height: 2550, category: 'print', platform: null, ratio: '22:17' },
  { id: 'business-card', name: 'Business Card', width: 1050, height: 600, category: 'print', platform: null, ratio: '7:4' },
  { id: 'postcard-4x6', name: 'Postcard 4x6', width: 1800, height: 1200, category: 'print', platform: null, ratio: '3:2' },
  { id: 'postcard-5x7', name: 'Postcard 5x7', width: 2100, height: 1500, category: 'print', platform: null, ratio: '7:5' },
  { id: 'flyer-a5', name: 'Flyer A5', width: 1748, height: 2480, category: 'print', platform: null, ratio: '√2:2' },
  { id: 'poster-a2', name: 'Poster A2', width: 4961, height: 7016, category: 'print', platform: null, ratio: '√2:2' },
  { id: 'banner-2x6', name: 'Banner 2x6 ft', width: 1440, height: 4320, category: 'print', platform: null, ratio: '1:3' },
  
  // Web/Digital
  { id: 'desktop-wallpaper', name: 'Desktop Wallpaper', width: 1920, height: 1080, category: 'web', platform: null, ratio: '16:9' },
  { id: 'mobile-wallpaper', name: 'Mobile Wallpaper', width: 1080, height: 1920, category: 'web', platform: null, ratio: '9:16' },
  { id: 'website-header', name: 'Website Header', width: 1200, height: 400, category: 'web', platform: null, ratio: '3:1' },
  { id: 'website-banner', name: 'Website Banner', width: 1200, height: 300, category: 'web', platform: null, ratio: '4:1' },
  { id: 'blog-header', name: 'Blog Header', width: 1200, height: 630, category: 'web', platform: null, ratio: '1.91:1' },
  { id: 'email-header', name: 'Email Header', width: 600, height: 200, category: 'web', platform: null, ratio: '3:1' },
  { id: 'email-signature', name: 'Email Signature', width: 320, height: 120, category: 'web', platform: null, ratio: '8:3' },
  
  // Video Formats
  { id: 'full-hd', name: 'Full HD 16:9', width: 1920, height: 1080, category: 'video', platform: null, ratio: '16:9' },
  { id: 'hd', name: 'HD 16:9', width: 1280, height: 720, category: 'video', platform: null, ratio: '16:9' },
  { id: 'square-video', name: 'Square Video', width: 1080, height: 1080, category: 'video', platform: null, ratio: '1:1' },
  { id: 'vertical-video', name: 'Vertical Video 9:16', width: 1080, height: 1920, category: 'video', platform: null, ratio: '9:16' },
  { id: '4k-uhd', name: '4K Ultra HD', width: 3840, height: 2160, category: 'video', platform: null, ratio: '16:9' },
  { id: 'cinema', name: 'Cinema 21:9', width: 2560, height: 1080, category: 'video', platform: null, ratio: '21:9' }
];

// Helper functions
const getAdSizeById = (id) => {
  return standardAdSizes.find(size => size.id === id);
};

const getAdSizesByCategory = (category) => {
  return standardAdSizes.filter(size => size.category === category);
};

const getAdSizesByPlatform = (platform) => {
  return standardAdSizes.filter(size => size.platform === platform);
};

const getPopularSizes = () => {
  // Return most commonly used sizes
  const popularIds = [
    'instagram-post', 'instagram-story', 'facebook-feed', 'facebook-story',
    'twitter-post', 'linkedin-post', 'youtube-thumbnail', 'pinterest-pin',
    'medium-rectangle', 'leaderboard', 'business-card', 'a4-portrait',
    'full-hd', 'desktop-wallpaper'
  ];
  
  return popularIds.map(id => getAdSizeById(id)).filter(Boolean);
};

const searchAdSizes = (query) => {
  const searchTerm = query.toLowerCase();
  return standardAdSizes.filter(size => 
    size.name.toLowerCase().includes(searchTerm) ||
    size.platform?.toLowerCase().includes(searchTerm) ||
    size.category.toLowerCase().includes(searchTerm) ||
    `${size.width}x${size.height}`.includes(searchTerm)
  );
};

const getAdSizeCategories = () => {
  const categories = [...new Set(standardAdSizes.map(size => size.category))];
  return categories.map(category => ({
    id: category,
    name: category.charAt(0).toUpperCase() + category.slice(1),
    count: standardAdSizes.filter(size => size.category === category).length
  }));
};

const getAdSizePlatforms = () => {
  const platforms = [...new Set(standardAdSizes.map(size => size.platform).filter(Boolean))];
  return platforms.map(platform => ({
    id: platform,
    name: platform.charAt(0).toUpperCase() + platform.slice(1).replace('-', ' '),
    count: standardAdSizes.filter(size => size.platform === platform).length
  }));
};

// Calculate aspect ratio from dimensions
const calculateAspectRatio = (width, height) => {
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

// Create custom size object
const createCustomSize = (width, height, name = null) => {
  return {
    id: `custom-${width}x${height}`,
    name: name || `Custom ${width}×${height}`,
    width,
    height,
    category: 'custom',
    platform: null,
    ratio: calculateAspectRatio(width, height),
    isCustom: true
  };
};

// Validate dimensions
const validateDimensions = (width, height) => {
  const minSize = 50;
  const maxSize = 8000;
  
  if (width < minSize || height < minSize) {
    return { valid: false, error: `Minimum size is ${minSize}px` };
  }
  
  if (width > maxSize || height > maxSize) {
    return { valid: false, error: `Maximum size is ${maxSize}px` };
  }
  
  if (width * height > 50000000) { // 50 megapixels
    return { valid: false, error: 'Total pixel count too large' };
  }
  
  return { valid: true };
};

// Smart resize suggestions
const getSimilarSizes = (width, height, tolerance = 0.1) => {
  const targetRatio = width / height;
  
  return standardAdSizes.filter(size => {
    const sizeRatio = size.width / size.height;
    const difference = Math.abs(targetRatio - sizeRatio) / targetRatio;
    return difference <= tolerance;
  }).sort((a, b) => {
    const aRatio = a.width / a.height;
    const bRatio = b.width / b.height;
    const aDiff = Math.abs(targetRatio - aRatio);
    const bDiff = Math.abs(targetRatio - bRatio);
    return aDiff - bDiff;
  });
};

module.exports = {
  standardAdSizes,
  getAdSizeById,
  getAdSizesByCategory,
  getAdSizesByPlatform,
  getPopularSizes,
  searchAdSizes,
  getAdSizeCategories,
  getAdSizePlatforms,
  calculateAspectRatio,
  createCustomSize,
  validateDimensions,
  getSimilarSizes
};