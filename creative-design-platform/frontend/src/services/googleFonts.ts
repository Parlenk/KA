// Professional Google Fonts Integration - Figma/Canva Level
export interface GoogleFont {
  family: string;
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
  variants: string[];
  subsets: string[];
  popularity: number;
  preview: string;
  recommended: boolean;
  tags: string[];
}

// Curated Professional Font Collection
export const PROFESSIONAL_FONTS: GoogleFont[] = [
  // Sans-Serif - Professional & Modern
  {
    family: 'Inter',
    category: 'sans-serif',
    variants: ['300', '400', '500', '600', '700', '800', '900'],
    subsets: ['latin', 'latin-ext'],
    popularity: 95,
    preview: 'The quick brown fox jumps over the lazy dog',
    recommended: true,
    tags: ['modern', 'clean', 'readable', 'tech', 'ui']
  },
  {
    family: 'Poppins',
    category: 'sans-serif',
    variants: ['300', '400', '500', '600', '700', '800', '900'],
    subsets: ['latin', 'latin-ext'],
    popularity: 92,
    preview: 'The quick brown fox jumps over the lazy dog',
    recommended: true,
    tags: ['friendly', 'rounded', 'modern', 'marketing']
  },
  {
    family: 'Montserrat',
    category: 'sans-serif',
    variants: ['300', '400', '500', '600', '700', '800', '900'],
    subsets: ['latin', 'latin-ext'],
    popularity: 90,
    preview: 'The quick brown fox jumps over the lazy dog',
    recommended: true,
    tags: ['elegant', 'geometric', 'headlines', 'branding']
  },
  {
    family: 'Open Sans',
    category: 'sans-serif',
    variants: ['300', '400', '500', '600', '700', '800'],
    subsets: ['latin', 'latin-ext'],
    popularity: 88,
    preview: 'The quick brown fox jumps over the lazy dog',
    recommended: true,
    tags: ['readable', 'neutral', 'body-text', 'professional']
  },
  {
    family: 'Roboto',
    category: 'sans-serif',
    variants: ['300', '400', '500', '700', '900'],
    subsets: ['latin', 'latin-ext'],
    popularity: 86,
    preview: 'The quick brown fox jumps over the lazy dog',
    recommended: true,
    tags: ['google', 'material', 'tech', 'modern']
  },

  // Serif - Elegant & Traditional
  {
    family: 'Playfair Display',
    category: 'serif',
    variants: ['400', '500', '600', '700', '800', '900'],
    subsets: ['latin', 'latin-ext'],
    popularity: 85,
    preview: 'The quick brown fox jumps over the lazy dog',
    recommended: true,
    tags: ['elegant', 'luxury', 'fashion', 'editorial', 'headlines']
  },
  {
    family: 'Merriweather',
    category: 'serif',
    variants: ['300', '400', '700', '900'],
    subsets: ['latin', 'latin-ext'],
    popularity: 82,
    preview: 'The quick brown fox jumps over the lazy dog',
    recommended: true,
    tags: ['readable', 'body-text', 'traditional', 'academic']
  },
  {
    family: 'Source Serif Pro',
    category: 'serif',
    variants: ['400', '600', '700'],
    subsets: ['latin', 'latin-ext'],
    popularity: 78,
    preview: 'The quick brown fox jumps over the lazy dog',
    recommended: true,
    tags: ['professional', 'readable', 'adobe', 'corporate']
  },

  // Display - Creative & Bold
  {
    family: 'Oswald',
    category: 'sans-serif',
    variants: ['300', '400', '500', '600', '700'],
    subsets: ['latin', 'latin-ext'],
    popularity: 80,
    preview: 'THE QUICK BROWN FOX',
    recommended: true,
    tags: ['bold', 'condensed', 'headlines', 'impact', 'sports']
  },
  {
    family: 'Bebas Neue',
    category: 'display',
    variants: ['400'],
    subsets: ['latin', 'latin-ext'],
    popularity: 76,
    preview: 'THE QUICK BROWN FOX',
    recommended: true,
    tags: ['bold', 'condensed', 'headlines', 'modern', 'advertising']
  },
  {
    family: 'Anton',
    category: 'sans-serif',
    variants: ['400'],
    subsets: ['latin', 'latin-ext'],
    popularity: 74,
    preview: 'THE QUICK BROWN FOX',
    recommended: false,
    tags: ['bold', 'impact', 'headlines', 'condensed']
  },

  // Script & Handwriting
  {
    family: 'Dancing Script',
    category: 'handwriting',
    variants: ['400', '500', '600', '700'],
    subsets: ['latin', 'latin-ext'],
    popularity: 72,
    preview: 'The quick brown fox',
    recommended: false,
    tags: ['script', 'elegant', 'wedding', 'decorative']
  },
  {
    family: 'Great Vibes',
    category: 'handwriting',
    variants: ['400'],
    subsets: ['latin', 'latin-ext'],
    popularity: 68,
    preview: 'The quick brown fox',
    recommended: false,
    tags: ['script', 'luxury', 'elegant', 'decorative']
  },

  // Monospace - Technical
  {
    family: 'JetBrains Mono',
    category: 'monospace',
    variants: ['400', '500', '600', '700', '800'],
    subsets: ['latin', 'latin-ext'],
    popularity: 70,
    preview: 'The quick brown fox 123',
    recommended: true,
    tags: ['code', 'technical', 'modern', 'programming']
  },
  {
    family: 'Source Code Pro',
    category: 'monospace',
    variants: ['400', '500', '600', '700', '900'],
    subsets: ['latin', 'latin-ext'],
    popularity: 66,
    preview: 'The quick brown fox 123',
    recommended: true,
    tags: ['code', 'technical', 'adobe', 'programming']
  }
];

// Font Categories for UI Organization
export const FONT_CATEGORIES = {
  RECOMMENDED: {
    name: 'Recommended',
    icon: '⭐',
    fonts: PROFESSIONAL_FONTS.filter(font => font.recommended)
  },
  SANS_SERIF: {
    name: 'Sans Serif',
    icon: '🔤',
    fonts: PROFESSIONAL_FONTS.filter(font => font.category === 'sans-serif')
  },
  SERIF: {
    name: 'Serif',
    icon: '📖',
    fonts: PROFESSIONAL_FONTS.filter(font => font.category === 'serif')
  },
  DISPLAY: {
    name: 'Display',
    icon: '🎪',
    fonts: PROFESSIONAL_FONTS.filter(font => font.category === 'display')
  },
  HANDWRITING: {
    name: 'Script',
    icon: '✍️',
    fonts: PROFESSIONAL_FONTS.filter(font => font.category === 'handwriting')
  },
  MONOSPACE: {
    name: 'Monospace',
    icon: '💻',
    fonts: PROFESSIONAL_FONTS.filter(font => font.category === 'monospace')
  }
};

// Font Loading Service
class GoogleFontsService {
  private loadedFonts: Set<string> = new Set();
  private fontCache: Map<string, boolean> = new Map();

  // Load a single font family
  async loadFont(family: string, variants: string[] = ['400']): Promise<boolean> {
    if (this.loadedFonts.has(family)) {
      return true;
    }

    try {
      // Create font URL for Google Fonts
      const variantString = variants.join(',');
      const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${variantString}&display=swap`;
      
      // Create link element
      const link = document.createElement('link');
      link.href = fontUrl;
      link.rel = 'stylesheet';
      link.media = 'all';
      
      // Add to head
      document.head.appendChild(link);
      
      // Wait for font to load
      await this.waitForFontLoad(family);
      
      this.loadedFonts.add(family);
      this.fontCache.set(family, true);
      
      return true;
    } catch (error) {
      console.error(`Failed to load font ${family}:`, error);
      this.fontCache.set(family, false);
      return false;
    }
  }

  // Wait for font to be available
  private async waitForFontLoad(family: string): Promise<void> {
    return new Promise((resolve) => {
      if ('fonts' in document) {
        document.fonts.ready.then(() => {
          // Check if font is loaded
          const testString = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          
          // Test with fallback font
          context.font = '16px serif';
          const fallbackWidth = context.measureText(testString).width;
          
          // Test with requested font
          context.font = `16px "${family}", serif`;
          const fontWidth = context.measureText(testString).width;
          
          // If widths are different, font is loaded
          if (fontWidth !== fallbackWidth) {
            resolve();
          } else {
            // Fallback after timeout
            setTimeout(resolve, 1000);
          }
        });
      } else {
        // Fallback for older browsers
        setTimeout(resolve, 1000);
      }
    });
  }

  // Preload popular fonts
  async preloadPopularFonts(): Promise<void> {
    const popularFonts = PROFESSIONAL_FONTS
      .filter(font => font.popularity >= 85)
      .slice(0, 5);

    const loadPromises = popularFonts.map(font => 
      this.loadFont(font.family, ['400', '600', '700'])
    );

    await Promise.all(loadPromises);
  }

  // Get font suggestions based on category
  getFontSuggestions(category: 'body' | 'heading' | 'display' | 'accent'): GoogleFont[] {
    switch (category) {
      case 'body':
        return PROFESSIONAL_FONTS.filter(font => 
          font.tags.includes('readable') || font.tags.includes('body-text')
        ).slice(0, 5);
      
      case 'heading':
        return PROFESSIONAL_FONTS.filter(font => 
          font.tags.includes('headlines') || font.category === 'serif'
        ).slice(0, 5);
      
      case 'display':
        return PROFESSIONAL_FONTS.filter(font => 
          font.category === 'display' || font.tags.includes('bold')
        ).slice(0, 5);
      
      case 'accent':
        return PROFESSIONAL_FONTS.filter(font => 
          font.category === 'handwriting' || font.tags.includes('decorative')
        ).slice(0, 5);
      
      default:
        return PROFESSIONAL_FONTS.filter(font => font.recommended).slice(0, 5);
    }
  }

  // Check if font is loaded
  isFontLoaded(family: string): boolean {
    return this.loadedFonts.has(family);
  }

  // Get all loaded fonts
  getLoadedFonts(): string[] {
    return Array.from(this.loadedFonts);
  }
}

// Export singleton instance
export const googleFontsService = new GoogleFontsService();

// Font pairing recommendations
export const FONT_PAIRINGS = [
  {
    name: 'Modern Professional',
    heading: 'Inter',
    body: 'Open Sans',
    accent: 'Montserrat',
    usage: 'Corporate, Tech, SaaS'
  },
  {
    name: 'Editorial Elegance',
    heading: 'Playfair Display',
    body: 'Source Serif Pro',
    accent: 'Montserrat',
    usage: 'Magazine, Blog, Publishing'
  },
  {
    name: 'Friendly Marketing',
    heading: 'Poppins',
    body: 'Open Sans',
    accent: 'Dancing Script',
    usage: 'Marketing, Social Media, E-commerce'
  },
  {
    name: 'Bold Impact',
    heading: 'Oswald',
    body: 'Roboto',
    accent: 'Bebas Neue',
    usage: 'Sports, Fitness, Events'
  },
  {
    name: 'Luxury Brand',
    heading: 'Playfair Display',
    body: 'Montserrat',
    accent: 'Great Vibes',
    usage: 'Fashion, Luxury, Beauty'
  }
];

// Initialize fonts on module load
googleFontsService.preloadPopularFonts();