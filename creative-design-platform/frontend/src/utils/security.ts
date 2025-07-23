// Security utilities for input validation and sanitization

export class SecurityUtils {
  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/script/gi, ''); // Remove script tags
  }

  // Sanitize JSON for display
  static sanitizeJson(obj: any): string {
    try {
      const jsonString = JSON.stringify(obj, null, 2);
      return this.sanitizeHtml(jsonString);
    } catch (error) {
      return 'Invalid JSON';
    }
  }

  // Validate dimensions with secure bounds
  static validateDimensions(width: number, height: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      errors.push('Dimensions must be integers');
    }
    
    if (width < 1 || width > 8192) {
      errors.push('Width must be between 1 and 8192 pixels');
    }
    
    if (height < 1 || height > 8192) {
      errors.push('Height must be between 1 and 8192 pixels');
    }

    return { valid: errors.length === 0, errors };
  }

  // Validate file size
  static validateFileSize(size: number, maxSize: number = 100 * 1024 * 1024): boolean {
    return size > 0 && size <= maxSize;
  }

  // Validate MIME type
  static validateMimeType(mimeType: string, allowedTypes: string[]): boolean {
    return allowedTypes.includes(mimeType.toLowerCase());
  }

  // Sanitize filename
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
      .replace(/\.{2,}/g, '.') // Prevent directory traversal
      .substring(0, 255); // Limit length
  }

  // Validate string length
  static validateStringLength(input: string, minLength: number = 0, maxLength: number = 1000): boolean {
    return input.length >= minLength && input.length <= maxLength;
  }

  // Validate brand kit ID format
  static validateId(id: string): boolean {
    const idRegex = /^[a-zA-Z0-9-_]{1,50}$/;
    return idRegex.test(id);
  }

  // Rate limiting helper
  static createRateLimiter(maxCalls: number, timeWindow: number) {
    const calls = new Map<string, number[]>();
    
    return (key: string): boolean => {
      const now = Date.now();
      const windowStart = now - timeWindow;
      
      if (!calls.has(key)) {
        calls.set(key, []);
      }
      
      const userCalls = calls.get(key)!;
      
      // Remove old calls outside the time window
      const recentCalls = userCalls.filter(callTime => callTime > windowStart);
      
      if (recentCalls.length >= maxCalls) {
        return false; // Rate limit exceeded
      }
      
      recentCalls.push(now);
      calls.set(key, recentCalls);
      
      return true; // Allow the call
    };
  }

  // Validate export settings
  static validateExportSettings(settings: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!settings.format || typeof settings.format !== 'string') {
      errors.push('Valid format is required');
    }
    
    if (!settings.dimensions || typeof settings.dimensions !== 'object') {
      errors.push('Valid dimensions are required');
    } else {
      const dimValidation = this.validateDimensions(settings.dimensions.width, settings.dimensions.height);
      if (!dimValidation.valid) {
        errors.push(...dimValidation.errors);
      }
    }
    
    if (settings.quality && !['low', 'medium', 'high', 'ultra'].includes(settings.quality)) {
      errors.push('Invalid quality setting');
    }

    return { valid: errors.length === 0, errors };
  }

  // Validate guideline data
  static validateGuidelineData(guideline: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!guideline.name || !this.validateStringLength(guideline.name, 1, 100)) {
      errors.push('Name must be between 1 and 100 characters');
    }
    
    if (!guideline.description || !this.validateStringLength(guideline.description, 1, 500)) {
      errors.push('Description must be between 1 and 500 characters');
    }
    
    const validCategories = ['colors', 'typography', 'spacing', 'layout', 'imagery', 'logo', 'general'];
    if (!validCategories.includes(guideline.category)) {
      errors.push('Invalid category');
    }
    
    const validRuleTypes = ['required', 'preferred', 'forbidden', 'conditional'];
    if (!validRuleTypes.includes(guideline.rule_type)) {
      errors.push('Invalid rule type');
    }
    
    const validSeverities = ['error', 'warning', 'info'];
    if (!validSeverities.includes(guideline.severity)) {
      errors.push('Invalid severity level');
    }

    return { valid: errors.length === 0, errors };
  }

  // Escape HTML entities
  static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Validate URL
  static validateUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // Content Security Policy helper
  static getCSPHeader(): string {
    return "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:; object-src 'none'; frame-src 'none';";
  }
}

// Allowed MIME types for different file categories
export const ALLOWED_MIME_TYPES = {
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp'],
  documents: ['application/pdf'],
  exports: ['application/zip', 'application/json'],
  fonts: ['font/otf', 'font/ttf', 'font/woff', 'font/woff2']
};

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  document: 50 * 1024 * 1024, // 50MB
  export: 100 * 1024 * 1024, // 100MB
  font: 15 * 1024 * 1024 // 15MB
};

export default SecurityUtils;