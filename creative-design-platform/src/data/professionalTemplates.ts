// Professional Template Library - Figma/Canva Level
export interface ProfessionalTemplate {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  dimensions: { width: number; height: number };
  thumbnailUrl: string;
  tags: string[];
  isPremium: boolean;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  elements: {
    backgrounds: number;
    graphics: number;
    textLayers: number;
    images: number;
  };
  colors: string[];
  fonts: string[];
  designData: any; // Fabric.js canvas data
}

export const PROFESSIONAL_CATEGORIES = {
  SOCIAL_MEDIA: {
    name: 'Social Media',
    icon: '📱',
    subcategories: {
      INSTAGRAM: 'Instagram',
      FACEBOOK: 'Facebook', 
      TWITTER: 'Twitter',
      LINKEDIN: 'LinkedIn',
      TIKTOK: 'TikTok',
      YOUTUBE: 'YouTube'
    }
  },
  ADVERTISING: {
    name: 'Digital Advertising',
    icon: '📢',
    subcategories: {
      GOOGLE_ADS: 'Google Ads',
      FACEBOOK_ADS: 'Facebook Ads',
      DISPLAY_BANNER: 'Display Banners',
      RETARGETING: 'Retargeting Ads',
      NATIVE_ADS: 'Native Ads'
    }
  },
  PRINT: {
    name: 'Print Design',
    icon: '🖨️',
    subcategories: {
      BUSINESS_CARDS: 'Business Cards',
      FLYERS: 'Flyers',
      BROCHURES: 'Brochures',
      POSTERS: 'Posters',
      POSTCARDS: 'Postcards'
    }
  },
  BRANDING: {
    name: 'Brand Identity',
    icon: '🎨',
    subcategories: {
      LOGOS: 'Logos',
      BRAND_KITS: 'Brand Kits',
      STYLE_GUIDES: 'Style Guides',
      LETTERHEADS: 'Letterheads'
    }
  },
  MARKETING: {
    name: 'Marketing Materials',
    icon: '📊',
    subcategories: {
      EMAIL_HEADERS: 'Email Headers',
      PRESENTATIONS: 'Presentations',
      INFOGRAPHICS: 'Infographics',
      CASE_STUDIES: 'Case Studies'
    }
  }
};

// Standard Ad Sizes (IAB Standard + Social Media)
export const PROFESSIONAL_AD_SIZES = {
  // Google Ads
  LEADERBOARD: { width: 728, height: 90, name: 'Leaderboard', platform: 'Google Ads' },
  MEDIUM_RECTANGLE: { width: 300, height: 250, name: 'Medium Rectangle', platform: 'Google Ads' },
  LARGE_RECTANGLE: { width: 336, height: 280, name: 'Large Rectangle', platform: 'Google Ads' },
  WIDE_SKYSCRAPER: { width: 160, height: 600, name: 'Wide Skyscraper', platform: 'Google Ads' },
  MOBILE_BANNER: { width: 320, height: 50, name: 'Mobile Banner', platform: 'Google Ads' },
  LARGE_MOBILE_BANNER: { width: 320, height: 100, name: 'Large Mobile Banner', platform: 'Google Ads' },
  
  // Facebook/Meta
  FACEBOOK_FEED: { width: 1200, height: 630, name: 'Facebook Feed', platform: 'Facebook' },
  FACEBOOK_STORY: { width: 1080, height: 1920, name: 'Facebook Story', platform: 'Facebook' },
  FACEBOOK_COVER: { width: 1640, height: 859, name: 'Facebook Cover', platform: 'Facebook' },
  
  // Instagram
  INSTAGRAM_FEED: { width: 1080, height: 1080, name: 'Instagram Post', platform: 'Instagram' },
  INSTAGRAM_STORY: { width: 1080, height: 1920, name: 'Instagram Story', platform: 'Instagram' },
  INSTAGRAM_REEL: { width: 1080, height: 1920, name: 'Instagram Reel', platform: 'Instagram' },
  
  // LinkedIn
  LINKEDIN_POST: { width: 1200, height: 627, name: 'LinkedIn Post', platform: 'LinkedIn' },
  LINKEDIN_COVER: { width: 1584, height: 396, name: 'LinkedIn Cover', platform: 'LinkedIn' },
  
  // Twitter/X
  TWITTER_POST: { width: 1200, height: 675, name: 'Twitter Post', platform: 'Twitter' },
  TWITTER_HEADER: { width: 1500, height: 500, name: 'Twitter Header', platform: 'Twitter' },
  
  // YouTube
  YOUTUBE_THUMBNAIL: { width: 1280, height: 720, name: 'YouTube Thumbnail', platform: 'YouTube' },
  YOUTUBE_BANNER: { width: 2560, height: 1440, name: 'YouTube Banner', platform: 'YouTube' },
  
  // TikTok
  TIKTOK_VIDEO: { width: 1080, height: 1920, name: 'TikTok Video', platform: 'TikTok' },
  
  // Print
  BUSINESS_CARD: { width: 1050, height: 600, name: 'Business Card', platform: 'Print' },
  FLYER_A4: { width: 2480, height: 3508, name: 'A4 Flyer', platform: 'Print' },
  POSTER_A3: { width: 3508, height: 4961, name: 'A3 Poster', platform: 'Print' },
};

// Professional Template Collection
export const PROFESSIONAL_TEMPLATES: ProfessionalTemplate[] = [
  // Social Media Templates
  {
    id: 'sm_ig_minimal_01',
    name: 'Minimal Instagram Post',
    category: 'SOCIAL_MEDIA',
    subcategory: 'INSTAGRAM',
    dimensions: PROFESSIONAL_AD_SIZES.INSTAGRAM_FEED,
    thumbnailUrl: '/templates/thumbnails/minimal-ig-post.jpg',
    tags: ['minimal', 'clean', 'modern', 'photography'],
    isPremium: false,
    difficulty: 'beginner',
    elements: { backgrounds: 1, graphics: 2, textLayers: 3, images: 1 },
    colors: ['#FFFFFF', '#000000', '#F5F5F5'],
    fonts: ['Inter', 'Playfair Display'],
    designData: {
      version: '5.3.0',
      objects: [
        {
          type: 'rect',
          version: '5.3.0',
          left: 0,
          top: 0,
          width: 1080,
          height: 1080,
          fill: '#FFFFFF',
          selectable: false
        },
        {
          type: 'textbox',
          version: '5.3.0',
          left: 540,
          top: 300,
          width: 800,
          height: 100,
          text: 'Your Message Here',
          fontSize: 48,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          textAlign: 'center',
          fill: '#000000'
        }
      ]
    }
  },
  
  // Google Ads Templates
  {
    id: 'gads_leaderboard_01',
    name: 'Professional Leaderboard Ad',
    category: 'ADVERTISING',
    subcategory: 'GOOGLE_ADS',
    dimensions: PROFESSIONAL_AD_SIZES.LEADERBOARD,
    thumbnailUrl: '/templates/thumbnails/leaderboard-ad.jpg',
    tags: ['professional', 'business', 'corporate', 'cta'],
    isPremium: true,
    difficulty: 'intermediate',
    elements: { backgrounds: 1, graphics: 3, textLayers: 4, images: 1 },
    colors: ['#2563EB', '#FFFFFF', '#1F2937'],
    fonts: ['Inter', 'Open Sans'],
    designData: {
      version: '5.3.0',
      objects: [
        {
          type: 'rect',
          left: 0,
          top: 0,
          width: 728,
          height: 90,
          fill: 'linear-gradient(45deg, #2563EB, #1D4ED8)',
          selectable: false
        },
        {
          type: 'textbox',
          left: 20,
          top: 20,
          width: 500,
          height: 30,
          text: 'Boost Your Business Today',
          fontSize: 24,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fill: '#FFFFFF'
        },
        {
          type: 'textbox',
          left: 20,
          top: 50,
          width: 400,
          height: 20,
          text: 'Professional solutions for modern businesses',
          fontSize: 14,
          fontFamily: 'Open Sans',
          fill: '#E5E7EB'
        },
        {
          type: 'rect',
          left: 600,
          top: 25,
          width: 100,
          height: 40,
          fill: '#FFFFFF',
          rx: 20
        },
        {
          type: 'textbox',
          left: 625,
          top: 35,
          width: 50,
          height: 20,
          text: 'Get Started',
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: '600',
          fill: '#2563EB',
          textAlign: 'center'
        }
      ]
    }
  },

  // Business Card Template
  {
    id: 'print_bc_modern_01',
    name: 'Modern Business Card',
    category: 'PRINT',
    subcategory: 'BUSINESS_CARDS',
    dimensions: PROFESSIONAL_AD_SIZES.BUSINESS_CARD,
    thumbnailUrl: '/templates/thumbnails/modern-business-card.jpg',
    tags: ['modern', 'professional', 'clean', 'contact'],
    isPremium: false,
    difficulty: 'beginner',
    elements: { backgrounds: 2, graphics: 1, textLayers: 6, images: 0 },
    colors: ['#1F2937', '#FFFFFF', '#3B82F6'],
    fonts: ['Inter', 'Montserrat'],
    designData: {
      version: '5.3.0',
      objects: [
        {
          type: 'rect',
          left: 0,
          top: 0,
          width: 1050,
          height: 600,
          fill: '#1F2937'
        },
        {
          type: 'rect',
          left: 0,
          top: 0,
          width: 1050,
          height: 150,
          fill: '#3B82F6'
        },
        {
          type: 'textbox',
          left: 50,
          top: 40,
          width: 500,
          height: 50,
          text: 'Your Name',
          fontSize: 36,
          fontFamily: 'Montserrat',
          fontWeight: 'bold',
          fill: '#FFFFFF'
        },
        {
          type: 'textbox',
          left: 50,
          top: 90,
          width: 400,
          height: 30,
          text: 'Professional Title',
          fontSize: 18,
          fontFamily: 'Inter',
          fill: '#E5E7EB'
        }
      ]
    }
  }
];

// Template Categories for UI
export const getTemplatesByCategory = (category: string) => {
  return PROFESSIONAL_TEMPLATES.filter(template => template.category === category);
};

export const getTemplatesBySize = (width: number, height: number) => {
  return PROFESSIONAL_TEMPLATES.filter(
    template => template.dimensions.width === width && template.dimensions.height === height
  );
};

export const getFeaturedTemplates = () => {
  return PROFESSIONAL_TEMPLATES.filter(template => !template.isPremium).slice(0, 12);
};

export const getPremiumTemplates = () => {
  return PROFESSIONAL_TEMPLATES.filter(template => template.isPremium);
};