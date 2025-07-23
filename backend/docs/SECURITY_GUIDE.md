# Security Implementation Guide

## Table of Contents
- [Security Overview](#security-overview)
- [Authentication & Authorization](#authentication--authorization)
- [API Security](#api-security)
- [Data Protection](#data-protection)
- [Infrastructure Security](#infrastructure-security)
- [Secure Development Practices](#secure-development-practices)
- [Compliance & Standards](#compliance--standards)
- [Security Monitoring](#security-monitoring)
- [Incident Response](#incident-response)
- [Security Checklist](#security-checklist)

## Security Overview

The Creative Design Platform implements comprehensive security measures to protect user data, prevent unauthorized access, and ensure compliance with industry standards.

### Security Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   Load Balancer │    │   API Gateway   │
│   (TLS 1.3)     │────│   (WAF + DDoS)  │────│  (Rate Limit)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Application    │    │   Database      │
                       │  (Node.js)      │────│  (Encrypted)    │
                       └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐    ┌─────────────────┐
                       │  File Storage   │    │   Monitoring    │
                       │  (S3 + KMS)     │    │   (SIEM)        │
                       └─────────────────┘    └─────────────────┘
```

### Security Principles
- **Defense in Depth**: Multiple layers of security controls
- **Least Privilege**: Minimal access rights for users and systems
- **Zero Trust**: Verify all access requests regardless of location
- **Fail Securely**: System failures default to secure state
- **Security by Design**: Built-in security from the ground up

## Authentication & Authorization

### Multi-Factor Authentication (MFA)

#### TOTP Implementation
```javascript
// src/services/mfaService.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');

class MFAService {
  static async generateSecret(user) {
    const secret = speakeasy.generateSecret({
      name: `Creative Platform (${user.email})`,
      issuer: 'Creative Platform',
      length: 32
    });

    // Store encrypted secret
    const encryptedSecret = this.encryptSecret(secret.base32);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecret: encryptedSecret,
        mfaEnabled: false // Not enabled until verified
      }
    });

    return {
      secret: secret.base32,
      qrCodeUrl: await QRCode.toDataURL(secret.otpauth_url),
      backupCodes: this.generateBackupCodes()
    };
  }

  static async verifyToken(user, token) {
    const decryptedSecret = this.decryptSecret(user.mfaSecret);
    
    return speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps (60 seconds)
    });
  }

  static encryptSecret(secret) {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.MFA_ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  static generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}
```

#### OAuth 2.0 / OpenID Connect
```javascript
// src/services/oauthService.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  callbackURL: "/auth/google/callback",
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await prisma.user.findUnique({
      where: { email: profile.emails[0].value }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: profile.emails[0].value,
          name: profile.displayName,
          avatarUrl: profile.photos[0].value,
          provider: 'google',
          providerId: profile.id,
          emailVerified: true
        }
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// JWT Token Management
class JWTService {
  static generateTokens(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '15m',
      issuer: 'creative-platform',
      audience: 'creative-platform-api'
    });

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: '7d',
        issuer: 'creative-platform'
      }
    );

    return { accessToken, refreshToken };
  }

  static async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.isActive) {
        throw new Error('Invalid user');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}
```

### Role-Based Access Control (RBAC)

#### Permission System
```javascript
// src/middleware/rbac.js
const permissions = {
  // Design permissions
  'designs:create': 'Create new designs',
  'designs:read': 'View designs',
  'designs:update': 'Edit designs',
  'designs:delete': 'Delete designs',
  'designs:share': 'Share designs',
  
  // Template permissions
  'templates:create': 'Create templates',
  'templates:publish': 'Publish templates',
  'templates:manage': 'Manage template library',
  
  // Admin permissions
  'users:manage': 'Manage users',
  'analytics:view': 'View analytics',
  'settings:manage': 'Manage system settings'
};

const roles = {
  viewer: [
    'designs:read'
  ],
  editor: [
    'designs:create',
    'designs:read',
    'designs:update',
    'designs:share'
  ],
  admin: [
    ...roles.editor,
    'designs:delete',
    'templates:create',
    'templates:publish',
    'users:manage',
    'analytics:view'
  ],
  superadmin: [
    ...roles.admin,
    'templates:manage',
    'settings:manage'
  ]
};

// Middleware to check permissions
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          error: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        });
      }

      const userRole = user.role || 'viewer';
      const userPermissions = roles[userRole] || [];

      if (!userPermissions.includes(permission)) {
        return res.status(403).json({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: `Permission '${permission}' required`,
          required: permission,
          current: userPermissions
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        error: 'AUTHORIZATION_ERROR',
        message: 'Authorization check failed'
      });
    }
  };
};

// Resource-based access control
const requireResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const resourceId = req.params.id;

      let hasAccess = false;

      switch (resourceType) {
        case 'design':
          const design = await prisma.design.findFirst({
            where: {
              id: resourceId,
              OR: [
                { userId: userId },
                { project: { collaborators: { some: { userId: userId } } } }
              ]
            }
          });
          hasAccess = !!design;
          break;

        case 'project':
          const project = await prisma.project.findFirst({
            where: {
              id: resourceId,
              OR: [
                { userId: userId },
                { collaborators: { some: { userId: userId } } }
              ]
            }
          });
          hasAccess = !!project;
          break;

        default:
          hasAccess = false;
      }

      if (!hasAccess) {
        return res.status(403).json({
          error: 'RESOURCE_ACCESS_DENIED',
          message: 'Access denied to this resource'
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        error: 'ACCESS_CHECK_ERROR',
        message: 'Resource access check failed'
      });
    }
  };
};

module.exports = {
  requirePermission,
  requireResourceAccess,
  permissions,
  roles
};
```

## API Security

### Rate Limiting and DDoS Protection

#### Advanced Rate Limiting
```javascript
// src/middleware/advancedRateLimit.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

// Sliding window rate limiter
class SlidingWindowRateLimit {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 900000; // 15 minutes
    this.maxRequests = options.maxRequests || 100;
    this.keyGenerator = options.keyGenerator || this.defaultKeyGenerator;
  }

  defaultKeyGenerator(req) {
    return `rate_limit:${req.ip}:${req.user?.id || 'anonymous'}`;
  }

  async middleware(req, res, next) {
    const key = this.keyGenerator(req);
    const now = Date.now();
    const window = Math.floor(now / this.windowMs);
    
    try {
      // Use Redis pipeline for atomic operations
      const pipeline = redis.pipeline();
      pipeline.zremrangebyscore(key, 0, now - this.windowMs);
      pipeline.zcard(key);
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      pipeline.expire(key, Math.ceil(this.windowMs / 1000));
      
      const results = await pipeline.exec();
      const currentRequests = results[1][1];
      
      if (currentRequests >= this.maxRequests) {
        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          retryAfter: Math.ceil(this.windowMs / 1000)
        });
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': this.maxRequests,
        'X-RateLimit-Remaining': Math.max(0, this.maxRequests - currentRequests - 1),
        'X-RateLimit-Reset': new Date(now + this.windowMs)
      });

      next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      next(); // Fail open
    }
  }
}

// Adaptive rate limiting based on user behavior
const adaptiveRateLimit = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'adaptive_rl:'
  }),
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    // Authenticated users get higher limits
    if (req.user) {
      // Premium users get even higher limits
      if (req.user.plan === 'premium') {
        return 2000;
      }
      return 1000;
    }
    
    // Anonymous users get lower limits
    return 100;
  },
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

module.exports = {
  SlidingWindowRateLimit,
  adaptiveRateLimit
};
```

### Input Validation and Sanitization

#### Comprehensive Input Validation
```javascript
// src/middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');
const DOMPurify = require('isomorphic-dompurify');
const validator = require('validator');

// Custom validation rules
const customValidators = {
  isStrongPassword: (value) => {
    return validator.isStrongPassword(value, {
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    });
  },
  
  isValidHexColor: (value) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value);
  },
  
  isValidCanvasSize: (value) => {
    const size = parseInt(value);
    return size >= 1 && size <= 8000; // Max 8000px
  },
  
  isSafeFileName: (value) => {
    // Prevent path traversal and dangerous characters
    const dangerous = /[<>:"/\\|?*\x00-\x1f]/;
    return !dangerous.test(value) && value.length <= 255;
  }
};

// Sanitization functions
const sanitizers = {
  sanitizeHtml: (input) => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em'],
      ALLOWED_ATTR: []
    });
  },
  
  sanitizeFilename: (input) => {
    return input
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .trim()
      .substring(0, 255);
  },
  
  sanitizeSearchQuery: (input) => {
    return validator.escape(input).trim().substring(0, 100);
  }
};

// Validation schemas
const validationSchemas = {
  createDesign: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters')
      .custom(value => {
        return !validator.contains(value, '<script>');
      })
      .withMessage('Invalid characters in name'),
    
    body('width')
      .isInt({ min: 1, max: 8000 })
      .withMessage('Width must be between 1 and 8000 pixels'),
    
    body('height')
      .isInt({ min: 1, max: 8000 })
      .withMessage('Height must be between 1 and 8000 pixels'),
    
    body('backgroundColor')
      .optional()
      .custom(customValidators.isValidHexColor)
      .withMessage('Invalid hex color format')
  ],
  
  updateUser: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Name must be 1-50 characters')
      .customSanitizer(sanitizers.sanitizeHtml),
    
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email format'),
    
    body('password')
      .optional()
      .custom(customValidators.isStrongPassword)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and symbol')
  ],
  
  uploadFile: [
    body('filename')
      .custom(customValidators.isSafeFileName)
      .withMessage('Invalid filename')
      .customSanitizer(sanitizers.sanitizeFilename)
  ]
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

module.exports = {
  validationSchemas,
  handleValidationErrors,
  customValidators,
  sanitizers
};
```

### SQL Injection Prevention

#### Parameterized Queries with Prisma
```javascript
// src/services/secureDatabase.js
const { PrismaClient } = require('@prisma/client');

class SecureDatabase {
  constructor() {
    this.prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
      errorFormat: 'minimal'
    });
    
    // Add query logging for security monitoring
    this.prisma.$use(async (params, next) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();
      
      // Log slow queries for security analysis
      if (after - before > 1000) {
        console.warn(`Slow query detected: ${params.model}.${params.action} - ${after - before}ms`);
      }
      
      return result;
    });
  }

  // Safe user search with parameterized queries
  async searchUsers(searchTerm, userId) {
    // Validate input
    if (!searchTerm || typeof searchTerm !== 'string') {
      throw new Error('Invalid search term');
    }

    // Sanitize search term
    const sanitizedTerm = searchTerm.replace(/[%_]/g, '\\$&');

    return await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: sanitizedTerm, mode: 'insensitive' } },
              { email: { contains: sanitizedTerm, mode: 'insensitive' } }
            ]
          },
          { id: { not: userId } }, // Exclude current user
          { isActive: true }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      },
      take: 20
    });
  }

  // Safe design filtering
  async getDesigns(filters, userId) {
    const where = {
      userId: userId, // Always filter by user
      ...(filters.projectId && { projectId: filters.projectId }),
      ...(filters.name && { 
        name: { 
          contains: validator.escape(filters.name),
          mode: 'insensitive'
        }
      })
    };

    return await this.prisma.design.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters.limit || 20, 100) // Limit results
    });
  }

  // Safe aggregation queries
  async getAnalytics(userId, dateRange) {
    const { startDate, endDate } = dateRange;
    
    // Validate date range
    if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) {
      throw new Error('Invalid date range');
    }

    return await this.prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as designs_created,
        COUNT(DISTINCT project_id) as projects_used
      FROM designs 
      WHERE user_id = ${userId}
        AND created_at >= ${new Date(startDate)}
        AND created_at <= ${new Date(endDate)}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `;
  }
}

module.exports = { SecureDatabase };
```

## Data Protection

### Encryption at Rest and in Transit

#### Database Encryption
```javascript
// src/services/encryption.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltRounds = 12;
  }

  // Encrypt sensitive data before storing
  encrypt(text, key = process.env.ENCRYPTION_KEY) {
    const derivedKey = crypto.scryptSync(key, 'salt', this.keyLength);
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipher(this.algorithm, derivedKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  // Decrypt sensitive data
  decrypt(encryptedData, key = process.env.ENCRYPTION_KEY) {
    const derivedKey = crypto.scryptSync(key, 'salt', this.keyLength);
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Hash passwords securely
  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  // Verify password hashes
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Generate secure random tokens
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash API keys for storage
  hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}

// Field-level encryption for sensitive data
class FieldEncryption {
  static encryptedFields = ['mfaSecret', 'oauthTokens', 'bankDetails'];

  static async encryptFields(data) {
    const encryption = new EncryptionService();
    const encrypted = { ...data };

    for (const field of this.encryptedFields) {
      if (encrypted[field]) {
        encrypted[field] = encryption.encrypt(JSON.stringify(encrypted[field]));
      }
    }

    return encrypted;
  }

  static async decryptFields(data) {
    const encryption = new EncryptionService();
    const decrypted = { ...data };

    for (const field of this.encryptedFields) {
      if (decrypted[field] && typeof decrypted[field] === 'object') {
        decrypted[field] = JSON.parse(encryption.decrypt(decrypted[field]));
      }
    }

    return decrypted;
  }
}

module.exports = { EncryptionService, FieldEncryption };
```

#### TLS Configuration
```nginx
# /etc/nginx/ssl.conf
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Security headers
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: ws:;" always;
```

### Data Privacy and GDPR Compliance

#### Personal Data Management
```javascript
// src/services/gdprService.js
class GDPRService {
  constructor() {
    this.personalDataFields = [
      'name', 'email', 'phone', 'address', 'avatarUrl',
      'preferences', 'analytics', 'ipAddress', 'userAgent'
    ];
  }

  // Data export for GDPR requests
  async exportUserData(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          projects: {
            include: {
              designs: true,
              collaborators: true
            }
          },
          brandKits: true,
          exports: true,
          apiKeys: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              lastUsed: true,
              scopes: true
            }
          },
          socialConnections: {
            select: {
              id: true,
              platform: true,
              accountName: true,
              createdAt: true,
              lastUsed: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Remove sensitive data before export
      const exportData = this.sanitizeForExport(user);
      
      // Log the export request
      await this.logDataAccess(userId, 'EXPORT', req.ip);

      return {
        exportedAt: new Date().toISOString(),
        userData: exportData,
        dataRetentionPolicy: '2 years after account deletion',
        rightsInformation: {
          rectification: 'Contact support to correct personal data',
          erasure: 'Request account deletion to remove all data',
          portability: 'Data exported in JSON format',
          objection: 'Contact support to object to data processing'
        }
      };
    } catch (error) {
      console.error('GDPR export error:', error);
      throw error;
    }
  }

  // Data deletion for GDPR requests
  async deleteUserData(userId, reason = 'USER_REQUEST') {
    try {
      // Start database transaction
      await prisma.$transaction(async (tx) => {
        // Anonymize user data instead of hard deletion for referential integrity
        await tx.user.update({
          where: { id: userId },
          data: {
            email: `deleted-${userId}@example.com`,
            name: '[Deleted User]',
            avatarUrl: null,
            phone: null,
            address: null,
            preferences: null,
            isActive: false,
            deletedAt: new Date(),
            deletionReason: reason
          }
        });

        // Delete associated personal data
        await tx.apiKey.deleteMany({ where: { userId } });
        await tx.socialConnection.deleteMany({ where: { userId } });
        await tx.cloudStorageConnection.deleteMany({ where: { userId } });
        
        // Anonymize designs (keep for other collaborators)
        await tx.design.updateMany({
          where: { userId },
          data: { userId: null }
        });

        // Delete exports and temporary files
        await tx.exportJob.deleteMany({ where: { userId } });
      });

      // Schedule file cleanup
      await this.scheduleFileCleanup(userId);
      
      // Log the deletion
      await this.logDataAccess(userId, 'DELETION', 'SYSTEM');

      return {
        deletedAt: new Date().toISOString(),
        status: 'completed',
        note: 'User data anonymized and files scheduled for deletion'
      };
    } catch (error) {
      console.error('GDPR deletion error:', error);
      throw error;
    }
  }

  // Data rectification
  async rectifyUserData(userId, updates) {
    const allowedFields = [
      'name', 'email', 'phone', 'address', 'preferences'
    ];

    const sanitizedUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = value;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...sanitizedUpdates,
        updatedAt: new Date()
      }
    });

    await this.logDataAccess(userId, 'RECTIFICATION', 'USER');

    return updatedUser;
  }

  // Privacy consent management
  async updateConsent(userId, consents) {
    const consentRecord = {
      userId,
      analytics: consents.analytics || false,
      marketing: consents.marketing || false,
      functional: consents.functional || true, // Required for service
      updatedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    await prisma.userConsent.upsert({
      where: { userId },
      update: consentRecord,
      create: consentRecord
    });

    return consentRecord;
  }

  sanitizeForExport(data) {
    const sanitized = { ...data };
    
    // Remove sensitive fields
    delete sanitized.password;
    delete sanitized.mfaSecret;
    delete sanitized.resetToken;
    
    // Sanitize nested objects
    if (sanitized.apiKeys) {
      sanitized.apiKeys = sanitized.apiKeys.map(key => ({
        ...key,
        keyHash: '[REDACTED]'
      }));
    }

    return sanitized;
  }

  async logDataAccess(userId, action, source) {
    await prisma.dataAccessLog.create({
      data: {
        userId,
        action,
        source,
        timestamp: new Date()
      }
    });
  }

  async scheduleFileCleanup(userId) {
    // Schedule background job to delete user files
    await exportQueue.add('cleanup-user-files', {
      userId,
      scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });
  }
}

module.exports = { GDPRService };
```

## Infrastructure Security

### Network Security

#### Firewall Configuration
```bash
#!/bin/bash
# /opt/scripts/configure-firewall.sh

# Reset iptables
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -I INPUT 1 -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (rate limited)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow application port from specific IPs
iptables -A INPUT -p tcp --dport 3000 -s 10.0.1.0/24 -j ACCEPT

# Allow database access from app servers only
iptables -A INPUT -p tcp --dport 5432 -s 10.0.1.10 -j ACCEPT
iptables -A INPUT -p tcp --dport 5432 -s 10.0.1.11 -j ACCEPT
iptables -A INPUT -p tcp --dport 5432 -s 10.0.1.12 -j ACCEPT

# Block common attack patterns
iptables -A INPUT -p tcp --tcp-flags ALL NONE -j DROP
iptables -A INPUT -p tcp --tcp-flags ALL ALL -j DROP
iptables -A INPUT -p tcp --tcp-flags ALL FIN,PSH,URG -j DROP
iptables -A INPUT -p tcp --tcp-flags ALL SYN,RST,ACK,FIN,URG -j DROP

# Rate limiting for new connections
iptables -A INPUT -p tcp --dport 443 -m connlimit --connlimit-above 25 -j REJECT
iptables -A INPUT -p tcp --dport 80 -m connlimit --connlimit-above 25 -j REJECT

# Log dropped packets
iptables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "IPTables-Dropped: "

# Save rules
iptables-save > /etc/iptables/rules.v4
```

### Container Security

#### Docker Security Configuration
```dockerfile
# Dockerfile.security
FROM node:18-alpine

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S creative-platform -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=creative-platform:nodejs . .

# Remove unnecessary packages
RUN apk del curl wget

# Set security headers
ENV NODE_OPTIONS="--max-old-space-size=512"
ENV NODE_ENV=production

# Use non-root user
USER creative-platform

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "src/server.js"]
```

```yaml
# docker-compose.security.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.security
    restart: unless-stopped
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    volumes:
      - /app/logs
    networks:
      - app-network
    environment:
      - NODE_ENV=production
    secrets:
      - db_password
      - jwt_secret

networks:
  app-network:
    driver: bridge
    internal: true

secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
```

## Secure Development Practices

### Code Security Standards

#### Security Linting Rules
```json
// .eslintrc.security.json
{
  "extends": ["eslint:recommended", "plugin:security/recommended"],
  "plugins": ["security"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-regexp": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-pseudoRandomBytes": "error",
    "security/detect-possible-timing-attacks": "warn",
    "security/detect-buffer-noassert": "error",
    "security/detect-child-process": "warn",
    "security/detect-disable-mustache-escape": "error",
    "security/detect-new-buffer": "error",
    "security/detect-no-csrf-before-method-override": "error",
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    "no-script-url": "error"
  }
}
```

#### Dependency Security Scanning
```json
// package.json security scripts
{
  "scripts": {
    "security:audit": "npm audit --audit-level=moderate",
    "security:check": "npx better-npm-audit audit",
    "security:fix": "npm audit fix",
    "security:snyk": "npx snyk test",
    "security:retire": "npx retire --js --node",
    "security:full": "npm run security:audit && npm run security:snyk && npm run security:retire"
  }
}
```

### Static Code Analysis

#### SonarQube Configuration
```properties
# sonar-project.properties
sonar.projectKey=creative-platform-backend
sonar.projectName=Creative Platform Backend
sonar.projectVersion=1.0.0

sonar.sources=src
sonar.tests=tests
sonar.exclusions=node_modules/**,coverage/**,dist/**

sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.eslint.reportPaths=reports/eslint-report.json

# Security rules
sonar.security.hotspots.enabled=true
sonar.security.vulnerabilities.enabled=true
```

## Security Monitoring

### Security Event Logging

#### Security Logger Implementation
```javascript
// src/services/securityLogger.js
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

class SecurityLogger {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'creative-platform-security' },
      transports: [
        new winston.transports.File({ filename: 'logs/security.log' }),
        new ElasticsearchTransport({
          level: 'info',
          index: 'security-logs',
          clientOpts: {
            node: process.env.ELASTICSEARCH_URL
          }
        })
      ]
    });
  }

  // Log authentication events
  logAuth(event, details) {
    this.logger.info('AUTH_EVENT', {
      event,
      userId: details.userId,
      email: details.email,
      ip: details.ip,
      userAgent: details.userAgent,
      success: details.success,
      mfaUsed: details.mfaUsed,
      timestamp: new Date().toISOString()
    });
  }

  // Log authorization failures
  logAuthzFailure(details) {
    this.logger.warn('AUTHORIZATION_FAILURE', {
      userId: details.userId,
      resource: details.resource,
      action: details.action,
      ip: details.ip,
      reason: details.reason,
      timestamp: new Date().toISOString()
    });
  }

  // Log suspicious activities
  logSuspiciousActivity(activity, details) {
    this.logger.warn('SUSPICIOUS_ACTIVITY', {
      activity,
      severity: details.severity,
      userId: details.userId,
      ip: details.ip,
      indicators: details.indicators,
      timestamp: new Date().toISOString()
    });
  }

  // Log data access
  logDataAccess(details) {
    this.logger.info('DATA_ACCESS', {
      userId: details.userId,
      resource: details.resource,
      action: details.action,
      dataType: details.dataType,
      recordCount: details.recordCount,
      ip: details.ip,
      timestamp: new Date().toISOString()
    });
  }

  // Log security configuration changes
  logSecurityConfig(change, details) {
    this.logger.warn('SECURITY_CONFIG_CHANGE', {
      change,
      adminId: details.adminId,
      previous: details.previous,
      new: details.new,
      ip: details.ip,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = { SecurityLogger };
```

### Intrusion Detection

#### Automated Threat Detection
```javascript
// src/services/threatDetection.js
class ThreatDetectionService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.securityLogger = new SecurityLogger();
    this.thresholds = {
      failedLogins: { count: 5, window: 300 }, // 5 failures in 5 minutes
      rapidRequests: { count: 100, window: 60 }, // 100 requests per minute
      suspiciousPatterns: { count: 3, window: 600 } // 3 patterns in 10 minutes
    };
  }

  // Monitor failed login attempts
  async trackFailedLogin(ip, email) {
    const key = `failed_login:${ip}`;
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, this.thresholds.failedLogins.window);
    }

    if (count >= this.thresholds.failedLogins.count) {
      await this.handleThreat('BRUTE_FORCE_LOGIN', {
        ip,
        email,
        attempts: count,
        severity: 'HIGH'
      });
    }
  }

  // Monitor API request patterns
  async trackApiRequests(ip, userId, endpoint) {
    const key = `api_requests:${ip}:${userId || 'anonymous'}`;
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, this.thresholds.rapidRequests.window);
    }

    if (count >= this.thresholds.rapidRequests.count) {
      await this.handleThreat('RAPID_API_REQUESTS', {
        ip,
        userId,
        requests: count,
        endpoint,
        severity: 'MEDIUM'
      });
    }
  }

  // Detect suspicious patterns
  async detectSuspiciousPattern(pattern, details) {
    const key = `suspicious_pattern:${pattern}:${details.ip}`;
    const count = await this.redis.incr(key);
    
    if (count === 1) {
      await this.redis.expire(key, this.thresholds.suspiciousPatterns.window);
    }

    if (count >= this.thresholds.suspiciousPatterns.count) {
      await this.handleThreat('SUSPICIOUS_PATTERN', {
        pattern,
        ...details,
        occurrences: count,
        severity: 'HIGH'
      });
    }
  }

  // Handle detected threats
  async handleThreat(threatType, details) {
    // Log the threat
    this.securityLogger.logSuspiciousActivity(threatType, details);

    // Implement response based on severity
    switch (details.severity) {
      case 'HIGH':
        await this.blockIP(details.ip, 3600); // Block for 1 hour
        await this.notifySecurityTeam(threatType, details);
        break;
      
      case 'MEDIUM':
        await this.increaseRateLimit(details.ip);
        break;
      
      case 'LOW':
        // Just log for analysis
        break;
    }
  }

  async blockIP(ip, duration) {
    await this.redis.setex(`blocked_ip:${ip}`, duration, '1');
    console.log(`IP ${ip} blocked for ${duration} seconds`);
  }

  async increaseRateLimit(ip) {
    await this.redis.setex(`rate_limit_strict:${ip}`, 3600, '1');
    console.log(`Strict rate limiting applied to IP ${ip}`);
  }

  async notifySecurityTeam(threatType, details) {
    // Send alert to security team
    // This could be email, Slack, PagerDuty, etc.
    console.log(`SECURITY ALERT: ${threatType}`, details);
  }
}

module.exports = { ThreatDetectionService };
```

## Compliance & Standards

### OWASP Top 10 Mitigation

#### OWASP Security Checklist
```javascript
// src/security/owaspChecklist.js
const owaspMitigations = {
  // A01:2021 – Broken Access Control
  brokenAccessControl: {
    implemented: [
      'Role-based access control (RBAC)',
      'Resource-based authorization',
      'Principle of least privilege',
      'JWT token validation',
      'Session management',
      'CORS configuration'
    ],
    tests: [
      'Authorization bypass testing',
      'Privilege escalation testing',
      'Direct object reference testing'
    ]
  },

  // A02:2021 – Cryptographic Failures
  cryptographicFailures: {
    implemented: [
      'TLS 1.3 encryption in transit',
      'AES-256-GCM encryption at rest',
      'Bcrypt password hashing',
      'Secure key management',
      'Certificate pinning',
      'HSTS headers'
    ],
    tests: [
      'TLS configuration testing',
      'Encryption algorithm validation',
      'Key rotation testing'
    ]
  },

  // A03:2021 – Injection
  injection: {
    implemented: [
      'Parameterized queries (Prisma ORM)',
      'Input validation and sanitization',
      'Output encoding',
      'Command injection prevention',
      'SQL injection prevention'
    ],
    tests: [
      'SQL injection testing',
      'NoSQL injection testing',
      'Command injection testing',
      'LDAP injection testing'
    ]
  },

  // A04:2021 – Insecure Design
  insecureDesign: {
    implemented: [
      'Security requirements gathering',
      'Threat modeling',
      'Secure architecture review',
      'Defense in depth',
      'Fail-safe defaults'
    ],
    tests: [
      'Architecture security review',
      'Design pattern validation',
      'Security control effectiveness'
    ]
  },

  // A05:2021 – Security Misconfiguration
  securityMisconfiguration: {
    implemented: [
      'Security headers configuration',
      'Secure defaults',
      'Error handling',
      'Security configuration management',
      'Regular security updates'
    ],
    tests: [
      'Configuration baseline testing',
      'Security header validation',
      'Default credential testing'
    ]
  }
};

module.exports = { owaspMitigations };
```

### SOC 2 Compliance

#### Security Controls Documentation
```yaml
# Security Controls Mapping
access_controls:
  CC6.1: "Logical access security measures"
    - Multi-factor authentication
    - Role-based access control
    - Regular access reviews
    - Privileged access management

  CC6.2: "User access provisioning and modification"
    - Automated user provisioning
    - Access approval workflows
    - Regular access certifications
    - Segregation of duties

  CC6.3: "User access revocation"
    - Automated deprovisioning
    - Emergency access revocation
    - Exit procedures
    - Orphaned account monitoring

change_management:
  CC8.1: "Change management process"
    - Change approval process
    - Change documentation
    - Rollback procedures
    - Emergency change process

monitoring:
  CC7.1: "System monitoring"
    - Security event monitoring
    - Performance monitoring
    - Capacity monitoring
    - Threat detection

  CC7.2: "System availability"
    - High availability architecture
    - Disaster recovery plan
    - Business continuity plan
    - SLA monitoring

data_classification:
  CC6.7: "Data classification and handling"
    - Data classification policy
    - Data handling procedures
    - Data retention policy
    - Data disposal procedures
```

## Security Checklist

### Pre-Production Security Checklist

```markdown
## Authentication & Authorization
- [ ] Multi-factor authentication implemented
- [ ] Strong password policy enforced
- [ ] Session management secure
- [ ] JWT tokens properly validated
- [ ] Role-based access control implemented
- [ ] Resource-based authorization checked
- [ ] API key management secure

## Input Validation & Data Protection
- [ ] All inputs validated and sanitized
- [ ] SQL injection prevention verified
- [ ] XSS protection implemented
- [ ] CSRF protection enabled
- [ ] File upload security configured
- [ ] Data encryption at rest implemented
- [ ] Data encryption in transit verified

## Infrastructure Security
- [ ] TLS 1.3 configuration verified
- [ ] Security headers configured
- [ ] Firewall rules properly set
- [ ] VPN access configured
- [ ] Database security hardened
- [ ] Container security implemented
- [ ] Network segmentation verified

## Monitoring & Logging
- [ ] Security event logging configured
- [ ] Intrusion detection system deployed
- [ ] Log aggregation system setup
- [ ] Security metrics monitoring
- [ ] Alerting system configured
- [ ] Incident response plan documented

## Compliance & Documentation
- [ ] Security policies documented
- [ ] GDPR compliance verified
- [ ] SOC 2 controls implemented
- [ ] OWASP Top 10 mitigations verified
- [ ] Security training completed
- [ ] Penetration testing performed

## Deployment Security
- [ ] Secrets management configured
- [ ] Environment separation verified
- [ ] Backup encryption enabled
- [ ] Disaster recovery tested
- [ ] Security scanning automated
- [ ] Vulnerability management process
```

### Security Testing Checklist

```bash
#!/bin/bash
# security-test.sh

echo "Running security tests..."

# Static code analysis
npm run security:full

# Dependency vulnerability check
npm audit --audit-level=moderate

# Container security scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image creative-platform:latest

# TLS configuration test
nmap --script ssl-enum-ciphers -p 443 api.yourdomain.com

# Web application security scan
nikto -h https://api.yourdomain.com

# API security test
newman run security-tests.postman_collection.json

echo "Security tests completed"
```

This comprehensive security guide provides the foundation for a secure Creative Design Platform deployment. Regular security reviews and updates are essential to maintain the security posture as the platform evolves.