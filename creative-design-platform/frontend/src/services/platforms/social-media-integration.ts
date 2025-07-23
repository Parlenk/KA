/**
 * Social Media Platform Integration
 * Direct publishing to Facebook, Instagram, LinkedIn, Twitter
 */

export interface PlatformCredentials {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok';
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  userId?: string;
  pageId?: string; // For Facebook pages
}

export interface PostContent {
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  tags?: string[];
  location?: {
    name: string;
    latitude?: number;
    longitude?: number;
  };
}

export interface ScheduledPost {
  id: string;
  platform: string;
  content: PostContent;
  scheduledFor: Date;
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  publishedUrl?: string;
  error?: string;
}

export interface PlatformLimits {
  maxTextLength: number;
  maxImageSize: number; // in bytes
  maxVideoSize: number; // in bytes
  supportedImageFormats: string[];
  supportedVideoFormats: string[];
  maxHashtags: number;
  requiresImage: boolean;
}

export class SocialMediaIntegrator {
  private credentials: Map<string, PlatformCredentials> = new Map();
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api/v1/social') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Platform limits and specifications
   */
  private platformLimits: Record<string, PlatformLimits> = {
    facebook: {
      maxTextLength: 63206,
      maxImageSize: 4 * 1024 * 1024, // 4MB
      maxVideoSize: 1024 * 1024 * 1024, // 1GB
      supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      supportedVideoFormats: ['mp4', 'mov', 'avi'],
      maxHashtags: 30,
      requiresImage: false
    },
    instagram: {
      maxTextLength: 2200,
      maxImageSize: 8 * 1024 * 1024, // 8MB
      maxVideoSize: 100 * 1024 * 1024, // 100MB
      supportedImageFormats: ['jpg', 'jpeg', 'png'],
      supportedVideoFormats: ['mp4', 'mov'],
      maxHashtags: 30,
      requiresImage: true
    },
    linkedin: {
      maxTextLength: 3000,
      maxImageSize: 20 * 1024 * 1024, // 20MB
      maxVideoSize: 5 * 1024 * 1024 * 1024, // 5GB
      supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif'],
      supportedVideoFormats: ['mp4', 'mov', 'wmv', 'flv'],
      maxHashtags: 3,
      requiresImage: false
    },
    twitter: {
      maxTextLength: 280,
      maxImageSize: 5 * 1024 * 1024, // 5MB
      maxVideoSize: 512 * 1024 * 1024, // 512MB
      supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      supportedVideoFormats: ['mp4', 'mov'],
      maxHashtags: 10,
      requiresImage: false
    },
    tiktok: {
      maxTextLength: 150,
      maxImageSize: 0, // TikTok is video-only
      maxVideoSize: 500 * 1024 * 1024, // 500MB
      supportedImageFormats: [],
      supportedVideoFormats: ['mp4', 'mov', 'avi'],
      maxHashtags: 5,
      requiresImage: false
    }
  };

  /**
   * Authenticate with a social media platform
   */
  async authenticate(platform: string, redirectUri: string): Promise<string> {
    const authUrls = {
      facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${redirectUri}&scope=pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish&response_type=code`,
      instagram: `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`,
      linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${redirectUri}&scope=w_member_social,r_liteprofile,r_emailaddress`,
      twitter: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${redirectUri}&scope=tweet.read%20tweet.write%20users.read&state=state&code_challenge=challenge&code_challenge_method=plain`
    };

    return authUrls[platform as keyof typeof authUrls] || '';
  }

  /**
   * Complete OAuth flow and store credentials
   */
  async completeAuth(platform: string, authCode: string, redirectUri: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/${platform}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: authCode,
          redirectUri
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const credentials = await response.json();
      this.credentials.set(platform, credentials);
      
      // Store in localStorage for persistence
      localStorage.setItem(`social_${platform}_credentials`, JSON.stringify(credentials));
      
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  /**
   * Load stored credentials
   */
  loadStoredCredentials(): void {
    Object.keys(this.platformLimits).forEach(platform => {
      const stored = localStorage.getItem(`social_${platform}_credentials`);
      if (stored) {
        try {
          const credentials = JSON.parse(stored);
          // Check if token is still valid
          if (!credentials.expiresAt || credentials.expiresAt > Date.now()) {
            this.credentials.set(platform, credentials);
          } else {
            localStorage.removeItem(`social_${platform}_credentials`);
          }
        } catch (error) {
          console.error(`Error loading credentials for ${platform}:`, error);
        }
      }
    });
  }

  /**
   * Check if platform is connected
   */
  isConnected(platform: string): boolean {
    return this.credentials.has(platform);
  }

  /**
   * Get connected platforms
   */
  getConnectedPlatforms(): string[] {
    return Array.from(this.credentials.keys());
  }

  /**
   * Disconnect from a platform
   */
  disconnect(platform: string): void {
    this.credentials.delete(platform);
    localStorage.removeItem(`social_${platform}_credentials`);
  }

  /**
   * Validate content against platform limits
   */
  validateContent(platform: string, content: PostContent): { valid: boolean; errors: string[] } {
    const limits = this.platformLimits[platform];
    const errors: string[] = [];

    if (!limits) {
      errors.push(`Unknown platform: ${platform}`);
      return { valid: false, errors };
    }

    // Check text length
    if (content.text.length > limits.maxTextLength) {
      errors.push(`Text too long. Maximum ${limits.maxTextLength} characters allowed.`);
    }

    // Check if image is required
    if (limits.requiresImage && !content.imageUrl && !content.videoUrl) {
      errors.push(`${platform} requires an image or video.`);
    }

    // Check hashtags
    const hashtags = content.text.match(/#\w+/g) || [];
    if (hashtags.length > limits.maxHashtags) {
      errors.push(`Too many hashtags. Maximum ${limits.maxHashtags} allowed.`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Optimize content for specific platform
   */
  optimizeContentForPlatform(platform: string, content: PostContent): PostContent {
    const limits = this.platformLimits[platform];
    const optimized = { ...content };

    // Truncate text if too long
    if (optimized.text.length > limits.maxTextLength) {
      optimized.text = optimized.text.substring(0, limits.maxTextLength - 3) + '...';
    }

    // Limit hashtags
    const hashtags = optimized.text.match(/#\w+/g) || [];
    if (hashtags.length > limits.maxHashtags) {
      const allowedHashtags = hashtags.slice(0, limits.maxHashtags);
      optimized.text = optimized.text.replace(/#\w+/g, (match) => {
        return allowedHashtags.includes(match) ? match : '';
      }).replace(/\s+/g, ' ').trim();
    }

    // Platform-specific optimizations
    switch (platform) {
      case 'twitter':
        // Add thread numbering if text is long
        if (content.text.length > 240) {
          optimized.text = `1/ ${optimized.text}`;
        }
        break;

      case 'linkedin':
        // Add professional tone
        if (!optimized.text.includes('#')) {
          optimized.text += ' #business #professional';
        }
        break;

      case 'instagram':
        // Ensure hashtags are included
        if (!optimized.text.includes('#')) {
          optimized.text += ' #design #creative #art';
        }
        break;
    }

    return optimized;
  }

  /**
   * Publish content immediately
   */
  async publishNow(platform: string, content: PostContent): Promise<{ success: boolean; postUrl?: string; error?: string }> {
    const credentials = this.credentials.get(platform);
    if (!credentials) {
      return { success: false, error: 'Platform not connected' };
    }

    const validation = this.validateContent(platform, content);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    try {
      const optimizedContent = this.optimizeContentForPlatform(platform, content);
      
      const response = await fetch(`${this.apiBaseUrl}/publish/${platform}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.accessToken}`
        },
        body: JSON.stringify({
          content: optimizedContent,
          userId: credentials.userId,
          pageId: credentials.pageId
        })
      });

      if (!response.ok) {
        throw new Error(`Publishing failed: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, postUrl: result.postUrl };
    } catch (error) {
      console.error('Publishing error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Schedule content for later
   */
  async schedulePost(
    platform: string, 
    content: PostContent, 
    scheduledFor: Date
  ): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
    const credentials = this.credentials.get(platform);
    if (!credentials) {
      return { success: false, error: 'Platform not connected' };
    }

    const validation = this.validateContent(platform, content);
    if (!validation.valid) {
      return { success: false, error: validation.errors.join(', ') };
    }

    // Check if scheduling time is in the future
    if (scheduledFor <= new Date()) {
      return { success: false, error: 'Scheduled time must be in the future' };
    }

    try {
      const optimizedContent = this.optimizeContentForPlatform(platform, content);
      
      const response = await fetch(`${this.apiBaseUrl}/schedule/${platform}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${credentials.accessToken}`
        },
        body: JSON.stringify({
          content: optimizedContent,
          scheduledFor: scheduledFor.toISOString(),
          userId: credentials.userId,
          pageId: credentials.pageId
        })
      });

      if (!response.ok) {
        throw new Error(`Scheduling failed: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, scheduleId: result.scheduleId };
    } catch (error) {
      console.error('Scheduling error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get scheduled posts
   */
  async getScheduledPosts(): Promise<ScheduledPost[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/scheduled`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch scheduled posts: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      return [];
    }
  }

  /**
   * Cancel scheduled post
   */
  async cancelScheduledPost(scheduleId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/scheduled/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error cancelling scheduled post:', error);
      return false;
    }
  }

  /**
   * Get platform analytics
   */
  async getAnalytics(platform: string, timeRange: '7d' | '30d' | '90d' = '30d'): Promise<any> {
    const credentials = this.credentials.get(platform);
    if (!credentials) {
      throw new Error('Platform not connected');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/analytics/${platform}?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${credentials.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Analytics error:', error);
      throw error;
    }
  }

  /**
   * Bulk publish to multiple platforms
   */
  async publishToMultiplePlatforms(
    platforms: string[], 
    content: PostContent
  ): Promise<Array<{ platform: string; success: boolean; postUrl?: string; error?: string }>> {
    const results = await Promise.all(
      platforms.map(async platform => ({
        platform,
        ...(await this.publishNow(platform, content))
      }))
    );

    return results;
  }

  /**
   * Get platform-specific post preview
   */
  generatePostPreview(platform: string, content: PostContent): {
    displayText: string;
    characterCount: number;
    estimatedReach?: number;
    suggestedHashtags?: string[];
  } {
    const optimized = this.optimizeContentForPlatform(platform, content);
    const limits = this.platformLimits[platform];
    
    return {
      displayText: optimized.text,
      characterCount: optimized.text.length,
      estimatedReach: this.estimateReach(platform, optimized),
      suggestedHashtags: this.getSuggestedHashtags(platform, optimized.text)
    };
  }

  private estimateReach(platform: string, content: PostContent): number {
    // Simplified reach estimation based on platform and content
    const baseReach = {
      facebook: 500,
      instagram: 300,
      linkedin: 200,
      twitter: 400,
      tiktok: 1000
    };

    const hashtags = (content.text.match(/#\w+/g) || []).length;
    const multiplier = Math.min(1 + (hashtags * 0.1), 2); // Max 2x multiplier

    return Math.floor((baseReach[platform as keyof typeof baseReach] || 100) * multiplier);
  }

  private getSuggestedHashtags(platform: string, text: string): string[] {
    // Basic hashtag suggestions based on content
    const suggestions: Record<string, string[]> = {
      facebook: ['#business', '#marketing', '#social', '#engage'],
      instagram: ['#design', '#creative', '#art', '#inspiration', '#beautiful'],
      linkedin: ['#professional', '#business', '#networking', '#career'],
      twitter: ['#trending', '#social', '#tech', '#news'],
      tiktok: ['#viral', '#trending', '#creative', '#fun']
    };

    return suggestions[platform] || [];
  }

  private getAuthToken(): string {
    // Get user's auth token for API requests
    return localStorage.getItem('auth_token') || '';
  }

  /**
   * Get platform limits
   */
  getPlatformLimits(platform: string): PlatformLimits | null {
    return this.platformLimits[platform] || null;
  }
}

// Singleton instance
export const socialMediaIntegrator = new SocialMediaIntegrator();