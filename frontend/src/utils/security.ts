/**
 * Security Utilities for Creative Design Platform
 * Comprehensive security functions to prevent XSS, CSRF, and other vulnerabilities
 */

import DOMPurify from 'dompurify';

// Content Security Policy configuration
export const CSP_CONFIG = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'connect-src': ["'self'", 'https://api.openai.com', 'https://api.replicate.com'],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': []
};

// Input sanitization configurations
export const SANITIZE_CONFIGS = {
  // Basic text input - strips all HTML
  TEXT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false
  },
  
  // Rich text editor - allows safe formatting
  RICH_TEXT: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false
  },
  
  // SVG content - for uploaded SVG files
  SVG: {
    ALLOWED_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'g', 'defs', 'use'],
    ALLOWED_ATTR: ['viewBox', 'width', 'height', 'd', 'cx', 'cy', 'r', 'x', 'y', 'fill', 'stroke', 'stroke-width'],
    FORBID_TAGS: ['script', 'object', 'embed', 'foreignObject'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
  }
};

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(
  dirty: string, 
  config: keyof typeof SANITIZE_CONFIGS = 'TEXT'
): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  try {
    const sanitizeConfig = SANITIZE_CONFIGS[config];
    return DOMPurify.sanitize(dirty, sanitizeConfig);
  } catch (error) {
    console.error('HTML sanitization error:', error);
    return '';
  }
}

/**
 * Validate and sanitize file uploads
 */
export interface FileValidationOptions {
  allowedTypes: string[];
  maxSize: number; // in bytes
  allowedExtensions: string[];
  scanForMalware?: boolean;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedFile?: File;
}

export function validateFile(
  file: File, 
  options: FileValidationOptions
): FileValidationResult {
  const errors: string[] = [];

  // Validate file size
  if (file.size > options.maxSize) {
    errors.push(`File size exceeds limit of ${(options.maxSize / 1024 / 1024).toFixed(1)}MB`);
  }

  // Validate file type
  if (!options.allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // Validate file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !options.allowedExtensions.includes(extension)) {
    errors.push(`File extension .${extension} is not allowed`);
  }

  // Check for double extensions (security risk)
  const nameParts = file.name.split('.');
  if (nameParts.length > 2) {
    errors.push('Files with multiple extensions are not allowed');
  }

  // Validate file name
  if (!isValidFileName(file.name)) {
    errors.push('Invalid characters in filename');
  }

  // Basic malware detection (file signature check)
  if (options.scanForMalware) {
    // This is a basic check - in production, use a proper malware scanning service
    const suspiciousExtensions = ['exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs'];
    if (extension && suspiciousExtensions.includes(extension)) {
      errors.push('Potentially malicious file type detected');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedFile: errors.length === 0 ? file : undefined
  };
}

/**
 * Validate filename for security
 */
export function isValidFileName(filename: string): boolean {
  if (!filename || filename.length === 0) return false;
  if (filename.length > 255) return false;
  
  // Check for dangerous characters
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(filename)) return false;
  
  // Check for reserved names (Windows)
  const reservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;
  if (reservedNames.test(filename)) return false;
  
  // Check for directory traversal
  if (filename.includes('..') || filename.includes('./') || filename.includes('.\\')) {
    return false;
  }
  
  return true;
}

/**
 * Generate secure random string for tokens, IDs, etc.
 */
export function generateSecureToken(length: number = 32): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without crypto.getRandomValues
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate URL to prevent SSRF attacks
 */
export function isValidUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    const urlObject = new URL(url);
    
    // Only allow HTTP and HTTPS protocols
    if (!['http:', 'https:'].includes(urlObject.protocol)) {
      return false;
    }
    
    // Prevent localhost/private IP access
    const hostname = urlObject.hostname.toLowerCase();
    
    // Block localhost variations
    if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
      return false;
    }
    
    // Block private IP ranges
    const privateIPRegex = /^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/;
    if (privateIPRegex.test(hostname)) {
      return false;
    }
    
    // Check against allowed domains if provided
    if (allowedDomains && allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some(domain => 
        hostname === domain || hostname.endsWith('.' + domain)
      );
      if (!isAllowed) {
        return false;
      }
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Rate limiting utility
 */
interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (identifier: string) => string;
}

class RateLimiter {
  private requests = new Map<string, number[]>();
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.options = options;
  }

  check(identifier: string): { allowed: boolean; resetTime?: number } {
    const key = this.options.keyGenerator ? this.options.keyGenerator(identifier) : identifier;
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    // Get existing requests for this key
    let userRequests = this.requests.get(key) || [];
    
    // Remove expired requests
    userRequests = userRequests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (userRequests.length >= this.options.maxRequests) {
      const oldestRequest = Math.min(...userRequests);
      const resetTime = oldestRequest + this.options.windowMs;
      return { allowed: false, resetTime };
    }
    
    // Add current request
    userRequests.push(now);
    this.requests.set(key, userRequests);
    
    return { allowed: true };
  }

  clear(identifier?: string): void {
    if (identifier) {
      const key = this.options.keyGenerator ? this.options.keyGenerator(identifier) : identifier;
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

export { RateLimiter };

/**
 * Encrypt sensitive data before storing in localStorage
 */
export async function encryptData(data: string, key?: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const encoder = new TextEncoder();
  const keyMaterial = key || 'default-key-' + window.location.hostname;
  
  // Generate a key from the key material
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(keyMaterial.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Generate a random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the data
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(data)
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Convert to base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt data from localStorage
 */
export async function decryptData(encryptedData: string, key?: string): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API not available');
  }

  const decoder = new TextDecoder();
  const keyMaterial = key || 'default-key-' + window.location.hostname;
  
  // Convert from base64
  const combined = new Uint8Array(
    atob(encryptedData).split('').map(char => char.charCodeAt(0))
  );
  
  // Extract IV and encrypted data
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  // Generate the same key
  const encoder = new TextEncoder();
  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(keyMaterial.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt the data
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

/**
 * Secure localStorage wrapper
 */
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      const encrypted = await encryptData(value);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to encrypt and store data:', error);
      throw error;
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) return null;
      
      return await decryptData(encrypted);
    } catch (error) {
      console.error('Failed to decrypt stored data:', error);
      return null;
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(key);
  },

  clear(): void {
    localStorage.clear();
  }
};

/**
 * CSRF token management
 */
export const csrfToken = {
  generate(): string {
    const token = generateSecureToken(32);
    document.querySelector('meta[name="csrf-token"]')?.setAttribute('content', token);
    return token;
  },

  get(): string | null {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null;
  },

  validate(token: string): boolean {
    const storedToken = this.get();
    return storedToken !== null && token === storedToken;
  }
};

/**
 * Password strength validation
 */
export interface PasswordStrength {
  score: number; // 0-5
  feedback: string[];
  isValid: boolean;
}

export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score++;
  } else {
    feedback.push('Use at least 8 characters');
  }

  // Character variety checks
  if (/[a-z]/.test(password)) score++;
  else feedback.push('Include lowercase letters');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Include uppercase letters');

  if (/\d/.test(password)) score++;
  else feedback.push('Include numbers');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Include special characters');

  // Common password check
  const commonPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
  if (!commonPasswords.includes(password.toLowerCase())) {
    score++;
  } else {
    feedback.push('Avoid common passwords');
    score = Math.max(0, score - 2);
  }

  return {
    score,
    feedback,
    isValid: score >= 4
  };
}

/**
 * Input validation helpers
 */
export const validators = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },

  phone: (phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 7;
  },

  alphanumeric: (str: string): boolean => {
    return /^[a-zA-Z0-9]+$/.test(str);
  },

  noHtml: (str: string): boolean => {
    return !/<[^>]*>/g.test(str);
  },

  noScript: (str: string): boolean => {
    const scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    const onEventRegex = /on\w+\s*=/gi;
    const jsProtocolRegex = /javascript:/gi;
    
    return !scriptRegex.test(str) && !onEventRegex.test(str) && !jsProtocolRegex.test(str);
  }
};

export default {
  sanitizeHtml,
  validateFile,
  isValidFileName,
  generateSecureToken,
  isValidUrl,
  RateLimiter,
  encryptData,
  decryptData,
  secureStorage,
  csrfToken,
  validatePasswordStrength,
  validators,
  CSP_CONFIG,
  SANITIZE_CONFIGS
};