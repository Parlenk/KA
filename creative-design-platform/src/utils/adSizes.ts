// Standard advertising sizes and formats
export interface AdSize {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'social' | 'display' | 'print' | 'video' | 'custom';
  platform?: string;
  isStandard: boolean;
  aspectRatio: string;
  description?: string;
}

export const STANDARD_AD_SIZES: AdSize[] = [
  // Social Media - Facebook
  {
    id: 'facebook_feed_image',
    name: 'Facebook Feed Image',
    width: 1200,
    height: 630,
    category: 'social',
    platform: 'Facebook',
    isStandard: true,
    aspectRatio: '1.91:1',
    description: 'Recommended for Facebook feed posts',
  },
  {
    id: 'facebook_cover_photo',
    name: 'Facebook Cover Photo',
    width: 1200,
    height: 315,
    category: 'social',
    platform: 'Facebook',
    isStandard: true,
    aspectRatio: '3.81:1',
  },
  {
    id: 'facebook_event_cover',
    name: 'Facebook Event Cover',
    width: 1200,
    height: 628,
    category: 'social',
    platform: 'Facebook',
    isStandard: true,
    aspectRatio: '1.91:1',
  },
  {
    id: 'facebook_story',
    name: 'Facebook Story',
    width: 1080,
    height: 1920,
    category: 'social',
    platform: 'Facebook',
    isStandard: true,
    aspectRatio: '9:16',
  },

  // Social Media - Instagram
  {
    id: 'instagram_post_square',
    name: 'Instagram Post (Square)',
    width: 1080,
    height: 1080,
    category: 'social',
    platform: 'Instagram',
    isStandard: true,
    aspectRatio: '1:1',
  },
  {
    id: 'instagram_post_portrait',
    name: 'Instagram Post (Portrait)',
    width: 1080,
    height: 1350,
    category: 'social',
    platform: 'Instagram',
    isStandard: true,
    aspectRatio: '4:5',
  },
  {
    id: 'instagram_post_landscape',
    name: 'Instagram Post (Landscape)',
    width: 1080,
    height: 566,
    category: 'social',
    platform: 'Instagram',
    isStandard: true,
    aspectRatio: '1.91:1',
  },
  {
    id: 'instagram_story',
    name: 'Instagram Story',
    width: 1080,
    height: 1920,
    category: 'social',
    platform: 'Instagram',
    isStandard: true,
    aspectRatio: '9:16',
  },
  {
    id: 'instagram_reel',
    name: 'Instagram Reel',
    width: 1080,
    height: 1920,
    category: 'social',
    platform: 'Instagram',
    isStandard: true,
    aspectRatio: '9:16',
  },

  // Social Media - Twitter/X
  {
    id: 'twitter_post',
    name: 'Twitter/X Post',
    width: 1200,
    height: 675,
    category: 'social',
    platform: 'Twitter/X',
    isStandard: true,
    aspectRatio: '16:9',
  },
  {
    id: 'twitter_header',
    name: 'Twitter/X Header',
    width: 1500,
    height: 500,
    category: 'social',
    platform: 'Twitter/X',
    isStandard: true,
    aspectRatio: '3:1',
  },

  // Social Media - LinkedIn
  {
    id: 'linkedin_post',
    name: 'LinkedIn Post',
    width: 1200,
    height: 627,
    category: 'social',
    platform: 'LinkedIn',
    isStandard: true,
    aspectRatio: '1.91:1',
  },
  {
    id: 'linkedin_company_banner',
    name: 'LinkedIn Company Banner',
    width: 1192,
    height: 220,
    category: 'social',
    platform: 'LinkedIn',
    isStandard: true,
    aspectRatio: '5.42:1',
  },
  {
    id: 'linkedin_personal_background',
    name: 'LinkedIn Personal Background',
    width: 1584,
    height: 396,
    category: 'social',
    platform: 'LinkedIn',
    isStandard: true,
    aspectRatio: '4:1',
  },

  // Social Media - TikTok
  {
    id: 'tiktok_video',
    name: 'TikTok Video',
    width: 1080,
    height: 1920,
    category: 'social',
    platform: 'TikTok',
    isStandard: true,
    aspectRatio: '9:16',
  },

  // Social Media - YouTube
  {
    id: 'youtube_thumbnail',
    name: 'YouTube Thumbnail',
    width: 1280,
    height: 720,
    category: 'social',
    platform: 'YouTube',
    isStandard: true,
    aspectRatio: '16:9',
  },
  {
    id: 'youtube_channel_banner',
    name: 'YouTube Channel Banner',
    width: 2560,
    height: 1440,
    category: 'social',
    platform: 'YouTube',
    isStandard: true,
    aspectRatio: '16:9',
  },

  // Social Media - Pinterest
  {
    id: 'pinterest_pin',
    name: 'Pinterest Pin',
    width: 1000,
    height: 1500,
    category: 'social',
    platform: 'Pinterest',
    isStandard: true,
    aspectRatio: '2:3',
  },

  // Display Ads - Google Ads
  {
    id: 'google_leaderboard',
    name: 'Leaderboard',
    width: 728,
    height: 90,
    category: 'display',
    platform: 'Google Ads',
    isStandard: true,
    aspectRatio: '8.09:1',
  },
  {
    id: 'google_medium_rectangle',
    name: 'Medium Rectangle',
    width: 300,
    height: 250,
    category: 'display',
    platform: 'Google Ads',
    isStandard: true,
    aspectRatio: '1.2:1',
  },
  {
    id: 'google_large_rectangle',
    name: 'Large Rectangle',
    width: 336,
    height: 280,
    category: 'display',
    platform: 'Google Ads',
    isStandard: true,
    aspectRatio: '1.2:1',
  },
  {
    id: 'google_wide_skyscraper',
    name: 'Wide Skyscraper',
    width: 160,
    height: 600,
    category: 'display',
    platform: 'Google Ads',
    isStandard: true,
    aspectRatio: '3.75:1',
  },
  {
    id: 'google_banner',
    name: 'Banner',
    width: 468,
    height: 60,
    category: 'display',
    platform: 'Google Ads',
    isStandard: true,
    aspectRatio: '7.8:1',
  },
  {
    id: 'google_large_mobile_banner',
    name: 'Large Mobile Banner',
    width: 320,
    height: 100,
    category: 'display',
    platform: 'Google Ads',
    isStandard: true,
    aspectRatio: '3.2:1',
  },
  {
    id: 'google_mobile_banner',
    name: 'Mobile Banner',
    width: 320,
    height: 50,
    category: 'display',
    platform: 'Google Ads',
    isStandard: true,
    aspectRatio: '6.4:1',
  },

  // Display Ads - IAB Standard
  {
    id: 'iab_billboard',
    name: 'Billboard',
    width: 970,
    height: 250,
    category: 'display',
    platform: 'IAB Standard',
    isStandard: true,
    aspectRatio: '3.88:1',
  },
  {
    id: 'iab_half_page',
    name: 'Half Page',
    width: 300,
    height: 600,
    category: 'display',
    platform: 'IAB Standard',
    isStandard: true,
    aspectRatio: '1:2',
  },
  {
    id: 'iab_super_leaderboard',
    name: 'Super Leaderboard',
    width: 970,
    height: 90,
    category: 'display',
    platform: 'IAB Standard',
    isStandard: true,
    aspectRatio: '10.78:1',
  },
  {
    id: 'iab_large_leaderboard',
    name: 'Large Leaderboard',
    width: 970,
    height: 150,
    category: 'display',
    platform: 'IAB Standard',
    isStandard: true,
    aspectRatio: '6.47:1',
  },

  // Print
  {
    id: 'print_letter',
    name: 'Letter (8.5" × 11")',
    width: 2550,
    height: 3300,
    category: 'print',
    isStandard: true,
    aspectRatio: '8.5:11',
    description: '300 DPI',
  },
  {
    id: 'print_a4',
    name: 'A4',
    width: 2480,
    height: 3508,
    category: 'print',
    isStandard: true,
    aspectRatio: '√2:1',
    description: '300 DPI',
  },
  {
    id: 'print_business_card',
    name: 'Business Card',
    width: 1050,
    height: 600,
    category: 'print',
    isStandard: true,
    aspectRatio: '1.75:1',
    description: '300 DPI (3.5" × 2")',
  },
  {
    id: 'print_postcard',
    name: 'Postcard (4" × 6")',
    width: 1200,
    height: 1800,
    category: 'print',
    isStandard: true,
    aspectRatio: '2:3',
    description: '300 DPI',
  },
  {
    id: 'print_flyer_letter',
    name: 'Flyer (Letter)',
    width: 2550,
    height: 3300,
    category: 'print',
    isStandard: true,
    aspectRatio: '8.5:11',
    description: '300 DPI',
  },
  {
    id: 'print_poster_18x24',
    name: 'Poster (18" × 24")',
    width: 5400,
    height: 7200,
    category: 'print',
    isStandard: true,
    aspectRatio: '3:4',
    description: '300 DPI',
  },

  // Video
  {
    id: 'video_4k',
    name: '4K (Ultra HD)',
    width: 3840,
    height: 2160,
    category: 'video',
    isStandard: true,
    aspectRatio: '16:9',
  },
  {
    id: 'video_1080p',
    name: '1080p (Full HD)',
    width: 1920,
    height: 1080,
    category: 'video',
    isStandard: true,
    aspectRatio: '16:9',
  },
  {
    id: 'video_720p',
    name: '720p (HD)',
    width: 1280,
    height: 720,
    category: 'video',
    isStandard: true,
    aspectRatio: '16:9',
  },
  {
    id: 'video_square',
    name: 'Square Video',
    width: 1080,
    height: 1080,
    category: 'video',
    isStandard: true,
    aspectRatio: '1:1',
  },
  {
    id: 'video_vertical',
    name: 'Vertical Video',
    width: 1080,
    height: 1920,
    category: 'video',
    isStandard: true,
    aspectRatio: '9:16',
  },
];

// Helper functions
export const getSizeById = (id: string): AdSize | undefined => {
  return STANDARD_AD_SIZES.find(size => size.id === id);
};

export const getSizesByCategory = (category: string): AdSize[] => {
  return STANDARD_AD_SIZES.filter(size => size.category === category);
};

export const getSizesByPlatform = (platform: string): AdSize[] => {
  return STANDARD_AD_SIZES.filter(size => size.platform === platform);
};

export const getAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

export const findSimilarSizes = (width: number, height: number, tolerance: number = 0.1): AdSize[] => {
  const targetAspectRatio = width / height;
  
  return STANDARD_AD_SIZES.filter(size => {
    const sizeAspectRatio = size.width / size.height;
    const difference = Math.abs(targetAspectRatio - sizeAspectRatio) / targetAspectRatio;
    return difference <= tolerance;
  });
};

// Popular size presets for quick access
export const POPULAR_SIZES = [
  'instagram_post_square',
  'facebook_feed_image',
  'youtube_thumbnail',
  'google_medium_rectangle',
  'google_leaderboard',
  'instagram_story',
  'linkedin_post',
  'twitter_post',
];

export const getPopularSizes = (): AdSize[] => {
  return POPULAR_SIZES.map(id => getSizeById(id)).filter(Boolean) as AdSize[];
};