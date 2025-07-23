/**
 * Security Utilities Tests
 * Tests for input sanitization, validation, and security features
 */

import {
  sanitizeHtml,
  validateFile,
  generateSecureToken,
  hashPassword,
  verifyPassword,
  encryptData,
  decryptData,
  validateUrl,
  sanitizeFilename,
  detectXSS,
  validateCSRF,
  rateLimiter,
  secureHeaders,
  SANITIZE_CONFIGS
} from '../../utils/security';

// Mock crypto for testing
const mockCrypto = {
  getRandomValues: jest.fn((arr: any) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
  subtle: {
    importKey: jest.fn(),
    encrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16))),
    decrypt: jest.fn(() => Promise.resolve(new ArrayBuffer(16))),
    generateKey: jest.fn(),
    digest: jest.fn(() => Promise.resolve(new ArrayBuffer(32)))
  }
};

// Mock DOMPurify
jest.mock('dompurify', () => ({
  default: {
    sanitize: jest.fn((dirty, config) => {
      // Simple mock that removes script tags
      if (typeof dirty === 'string') {
        return dirty.replace(/<script[^>]*>.*?<\/script>/gi, '');
      }
      return dirty;
    }),
    addHook: jest.fn(),
    removeHook: jest.fn(),
    isValidAttribute: jest.fn(() => true)
  }
}));

describe('Security Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(global, 'crypto', {
      value: mockCrypto,
      writable: true
    });
  });

  describe('sanitizeHtml', () => {
    it('sanitizes HTML content by default', () => {
      const dirty = '<p>Safe content</p><script>alert("xss")</script>';
      const clean = sanitizeHtml(dirty);
      
      expect(clean).toContain('<p>Safe content</p>');
      expect(clean).not.toContain('<script>');
    });

    it('handles different sanitization configs', () => {
      const dirty = '<p><strong>Bold</strong> text</p>';
      
      const textOnly = sanitizeHtml(dirty, 'TEXT');
      const basicHtml = sanitizeHtml(dirty, 'BASIC_HTML');
      
      expect(textOnly).not.toContain('<p>');
      expect(basicHtml).toContain('<p>');
    });

    it('handles null and undefined input', () => {
      expect(sanitizeHtml(null as any)).toBe('');
      expect(sanitizeHtml(undefined as any)).toBe('');
      expect(sanitizeHtml('')).toBe('');
    });

    it('handles non-string input', () => {
      expect(sanitizeHtml(123 as any)).toBe('');
      expect(sanitizeHtml({} as any)).toBe('');
      expect(sanitizeHtml([] as any)).toBe('');
    });

    it('handles DOMPurify errors gracefully', () => {
      const DOMPurify = require('dompurify').default;
      DOMPurify.sanitize.mockImplementation(() => {
        throw new Error('Sanitization error');
      });

      const result = sanitizeHtml('<p>test</p>');
      expect(result).toBe('');
    });
  });

  describe('validateFile', () => {
    const createMockFile = (name: string, type: string, size: number) => {
      const file = new File(['test content'], name, { type });
      Object.defineProperty(file, 'size', { value: size });
      return file;
    };

    it('validates allowed file types', () => {
      const imageFile = createMockFile('test.jpg', 'image/jpeg', 1024);
      const result = validateFile(imageFile, {
        allowedTypes: ['image/jpeg', 'image/png'],
        maxSize: 5 * 1024 * 1024
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects disallowed file types', () => {
      const execFile = createMockFile('malware.exe', 'application/octet-stream', 1024);
      const result = validateFile(execFile, {
        allowedTypes: ['image/jpeg', 'image/png'],
        maxSize: 5 * 1024 * 1024
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File type not allowed');
    });

    it('validates file size limits', () => {
      const largeFile = createMockFile('large.jpg', 'image/jpeg', 10 * 1024 * 1024);
      const result = validateFile(largeFile, {
        allowedTypes: ['image/jpeg'],
        maxSize: 5 * 1024 * 1024
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File size too large');
    });

    it('validates filename patterns', () => {
      const suspiciousFile = createMockFile('../../../etc/passwd', 'text/plain', 1024);
      const result = validateFile(suspiciousFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid filename');
    });

    it('detects potentially dangerous filenames', () => {
      const scriptFile = createMockFile('script.php.jpg', 'image/jpeg', 1024);
      const result = validateFile(scriptFile);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid filename');
    });
  });

  describe('generateSecureToken', () => {
    it('generates token of specified length', () => {
      const token = generateSecureToken(32);
      expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it('generates different tokens each time', () => {
      const token1 = generateSecureToken(16);
      const token2 = generateSecureToken(16);
      expect(token1).not.toBe(token2);
    });

    it('uses default length when not specified', () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64); // 32 bytes default
    });
  });

  describe('hashPassword', () => {
    it('generates consistent hash for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      // Hashes should be different due to salt, but verifiable
      expect(hash1).not.toBe(hash2);
      expect(hash1).toHaveLength(97); // 32 salt + 32 hash + separators
    });

    it('handles empty password', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeTruthy();
    });
  });

  describe('verifyPassword', () => {
    it('verifies correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('rejects incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });

    it('handles malformed hash', async () => {
      const isValid = await verifyPassword('password', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('encryptData and decryptData', () => {
    it('encrypts and decrypts data successfully', async () => {
      const originalData = 'sensitive information';
      const key = 'encryption-key-32-characters-long';
      
      const encrypted = await encryptData(originalData, key);
      const decrypted = await decryptData(encrypted, key);
      
      expect(decrypted).toBe(originalData);
      expect(encrypted).not.toBe(originalData);
    });

    it('fails decryption with wrong key', async () => {
      const originalData = 'sensitive information';
      const key1 = 'encryption-key-32-characters-long';
      const key2 = 'wrong-key-32-characters-long-too';
      
      const encrypted = await encryptData(originalData, key1);
      
      await expect(decryptData(encrypted, key2)).rejects.toThrow();
    });

    it('handles empty data', async () => {
      const key = 'encryption-key-32-characters-long';
      const encrypted = await encryptData('', key);
      const decrypted = await decryptData(encrypted, key);
      
      expect(decrypted).toBe('');
    });
  });

  describe('validateUrl', () => {
    it('validates safe URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
      expect(validateUrl('mailto:test@example.com')).toBe(true);
    });

    it('rejects dangerous URLs', () => {
      expect(validateUrl('javascript:alert("xss")')).toBe(false);
      expect(validateUrl('data:text/html,<script>alert("xss")</script>')).toBe(false);
      expect(validateUrl('vbscript:msgbox("xss")')).toBe(false);
    });

    it('handles malformed URLs', () => {
      expect(validateUrl('not-a-url')).toBe(false);
      expect(validateUrl('')).toBe(false);
      expect(validateUrl(null as any)).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('removes dangerous characters', () => {
      const dangerous = '../../../etc/passwd';
      const safe = sanitizeFilename(dangerous);
      expect(safe).not.toContain('../');
    });

    it('preserves safe filename', () => {
      const filename = 'my-document.pdf';
      const sanitized = sanitizeFilename(filename);
      expect(sanitized).toBe(filename);
    });

    it('handles special characters', () => {
      const filename = 'document with spaces & symbols!.txt';
      const sanitized = sanitizeFilename(filename);
      expect(sanitized).toBe('document-with-spaces-symbols.txt');
    });

    it('truncates long filenames', () => {
      const longName = 'a'.repeat(300) + '.txt';
      const sanitized = sanitizeFilename(longName);
      expect(sanitized.length).toBeLessThanOrEqual(255);
    });
  });

  describe('detectXSS', () => {
    it('detects script injection attempts', () => {
      expect(detectXSS('<script>alert("xss")</script>')).toBe(true);
      expect(detectXSS('javascript:alert("xss")')).toBe(true);
      expect(detectXSS('onload="alert(1)"')).toBe(true);
    });

    it('allows safe content', () => {
      expect(detectXSS('Normal text content')).toBe(false);
      expect(detectXSS('<p>Safe HTML</p>')).toBe(false);
      expect(detectXSS('email@example.com')).toBe(false);
    });

    it('detects encoded XSS attempts', () => {
      expect(detectXSS('%3Cscript%3Ealert%281%29%3C/script%3E')).toBe(true);
      expect(detectXSS('&#60;script&#62;alert(1)&#60;/script&#62;')).toBe(true);
    });
  });

  describe('validateCSRF', () => {
    it('validates matching CSRF tokens', () => {
      const token = 'csrf-token-123';
      expect(validateCSRF(token, token)).toBe(true);
    });

    it('rejects mismatched tokens', () => {
      expect(validateCSRF('token1', 'token2')).toBe(false);
    });

    it('rejects empty tokens', () => {
      expect(validateCSRF('', 'token')).toBe(false);
      expect(validateCSRF('token', '')).toBe(false);
      expect(validateCSRF('', '')).toBe(false);
    });

    it('handles null/undefined tokens', () => {
      expect(validateCSRF(null as any, 'token')).toBe(false);
      expect(validateCSRF('token', undefined as any)).toBe(false);
    });
  });

  describe('rateLimiter', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('allows requests within limit', () => {
      const limiter = rateLimiter(3, 60000); // 3 requests per minute
      
      expect(limiter('user1')).toBe(true);
      expect(limiter('user1')).toBe(true);
      expect(limiter('user1')).toBe(true);
    });

    it('blocks requests exceeding limit', () => {
      const limiter = rateLimiter(2, 60000); // 2 requests per minute
      
      expect(limiter('user1')).toBe(true);
      expect(limiter('user1')).toBe(true);
      expect(limiter('user1')).toBe(false); // Third request blocked
    });

    it('resets limits after window expires', () => {
      const limiter = rateLimiter(1, 1000); // 1 request per second
      
      expect(limiter('user1')).toBe(true);
      expect(limiter('user1')).toBe(false);
      
      // Advance time past window
      jest.advanceTimersByTime(1001);
      
      expect(limiter('user1')).toBe(true);
    });

    it('tracks different identifiers separately', () => {
      const limiter = rateLimiter(1, 60000);
      
      expect(limiter('user1')).toBe(true);
      expect(limiter('user2')).toBe(true);
      expect(limiter('user1')).toBe(false);
      expect(limiter('user2')).toBe(false);
    });
  });

  describe('secureHeaders', () => {
    it('generates comprehensive security headers', () => {
      const headers = secureHeaders();
      
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
      expect(headers['Content-Security-Policy']).toContain('default-src \'self\'');
    });

    it('allows custom CSP policy', () => {
      const customCSP = "default-src 'self'; img-src 'self' data:";
      const headers = secureHeaders({ csp: customCSP });
      
      expect(headers['Content-Security-Policy']).toBe(customCSP);
    });

    it('includes referrer policy', () => {
      const headers = secureHeaders();
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('SANITIZE_CONFIGS', () => {
    it('exports different sanitization configurations', () => {
      expect(SANITIZE_CONFIGS.TEXT).toBeDefined();
      expect(SANITIZE_CONFIGS.BASIC_HTML).toBeDefined();
      expect(SANITIZE_CONFIGS.RICH_TEXT).toBeDefined();
      expect(SANITIZE_CONFIGS.SVG_SAFE).toBeDefined();
    });

    it('TEXT config removes all HTML', () => {
      const config = SANITIZE_CONFIGS.TEXT;
      expect(config.ALLOWED_TAGS).toHaveLength(0);
      expect(config.ALLOWED_ATTR).toHaveLength(0);
    });

    it('BASIC_HTML allows safe tags only', () => {
      const config = SANITIZE_CONFIGS.BASIC_HTML;
      expect(config.ALLOWED_TAGS).toContain('p');
      expect(config.ALLOWED_TAGS).toContain('br');
      expect(config.ALLOWED_TAGS).not.toContain('script');
    });
  });

  describe('Error Handling', () => {
    it('handles crypto API unavailability', () => {
      Object.defineProperty(global, 'crypto', {
        value: undefined,
        writable: true
      });

      expect(() => generateSecureToken()).not.toThrow();
    });

    it('handles async encryption errors', async () => {
      mockCrypto.subtle.encrypt.mockRejectedValue(new Error('Encryption failed'));
      
      await expect(encryptData('test', 'key')).rejects.toThrow('Encryption failed');
    });

    it('handles invalid base64 in decryption', async () => {
      await expect(decryptData('invalid-base64', 'key')).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('rate limiter cleans up old entries', () => {
      jest.useFakeTimers();
      const limiter = rateLimiter(5, 1000);
      
      // Make requests to create entries
      for (let i = 0; i < 100; i++) {
        limiter(`user${i}`);
      }
      
      // Advance time to trigger cleanup
      jest.advanceTimersByTime(2000);
      
      // New request should trigger cleanup of expired entries
      limiter('newuser');
      
      jest.useRealTimers();
    });

    it('file validation is performant for large files', () => {
      const largeFile = createMockFile('large.jpg', 'image/jpeg', 50 * 1024 * 1024);
      
      const start = performance.now();
      validateFile(largeFile);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});

// Helper function for creating mock files
function createMockFile(name: string, type: string, size: number) {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}