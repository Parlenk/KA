/**
 * Production Security Middleware
 * Comprehensive security measures and threat protection
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult, sanitizeBody } from 'express-validator';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Security Headers Middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "https://api.openai.com", "https://api.stability.ai"],
      mediaSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
});

// Rate Limiting
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    auditLogger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.'
    });
  }
});

// Auth endpoints rate limiting
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    auditLogger.logSecurityEvent('AUTH_RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body?.email
    });
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.'
    });
  }
});

// API rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 API requests per minute
  message: {
    error: 'API rate limit exceeded.'
  }
});

// Input Validation and Sanitization
export const validateAndSanitize = {
  // User registration validation
  userRegistration: [
    body('email').isEmail().normalizeEmail().escape(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
    body('name').isLength({ min: 2, max: 50 }).trim().escape(),
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }
      next();
    }
  ],

  // Design content validation
  designContent: [
    body('name').isLength({ min: 1, max: 100 }).trim().escape(),
    body('content').isObject(),
    body('width').isInt({ min: 1, max: 10000 }),
    body('height').isInt({ min: 1, max: 10000 }),
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid design data',
          details: errors.array()
        });
      }
      next();
    }
  ],

  // File upload validation
  fileUpload: [
    body('filename').isLength({ min: 1, max: 255 }).trim().escape(),
    (req: Request, res: Response, next: NextFunction) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Invalid file data',
          details: errors.array()
        });
      }
      next();
    }
  ]
};

// CSRF Protection
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for API endpoints with proper authentication
  if (req.path.startsWith('/api/v1/') && req.headers.authorization) {
    return next();
  }

  const token = req.body._csrf || req.query._csrf || req.headers['x-csrf-token'];
  const sessionToken = (req as any).session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    auditLogger.logSecurityEvent('CSRF_TOKEN_MISMATCH', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
};

// XSS Protection
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  // Scan request body for potential XSS
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
  ];

  const checkForXSS = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return xssPatterns.some(pattern => pattern.test(obj));
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForXSS(value));
    }
    return false;
  };

  if (checkForXSS(req.body) || checkForXSS(req.query)) {
    auditLogger.logSecurityEvent('XSS_ATTEMPT_DETECTED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      body: req.body,
      query: req.query
    });
    return res.status(400).json({ error: 'Potentially harmful content detected' });
  }

  next();
};

// SQL Injection Protection
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /('|(\\')|(;|%3B)|(--)|(\s|%20)+(union|select|insert|delete|update|drop|create|alter|exec|execute)(\s|%20)+/gi,
    /(union|select|insert|delete|update|drop|create|alter|exec|execute).*(\s|%20)+(from|into|where|values|table|database|column).*(\s|%20)+/gi
  ];

  const checkForSQL = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return sqlPatterns.some(pattern => pattern.test(obj));
    }
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForSQL(value));
    }
    return false;
  };

  if (checkForSQL(req.body) || checkForSQL(req.query)) {
    auditLogger.logSecurityEvent('SQL_INJECTION_ATTEMPT', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      body: req.body,
      query: req.query
    });
    return res.status(400).json({ error: 'Invalid input detected' });
  }

  next();
};

// JWT Token Validation
export const validateJWT = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    (req as any).user = decoded;
    next();
  } catch (error) {
    auditLogger.logSecurityEvent('INVALID_JWT_TOKEN', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      token: token.substring(0, 20) + '...'
    });
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// File Upload Security
export const fileUploadSecurity = (req: Request, res: Response, next: NextFunction) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/quicktime',
    'application/pdf'
  ];

  const maxFileSize = 100 * 1024 * 1024; // 100MB

  if (req.file) {
    // Check file type
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      auditLogger.logSecurityEvent('INVALID_FILE_TYPE', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        mimetype: req.file.mimetype,
        filename: req.file.originalname
      });
      return res.status(400).json({ error: 'Invalid file type' });
    }

    // Check file size
    if (req.file.size > maxFileSize) {
      auditLogger.logSecurityEvent('FILE_SIZE_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        size: req.file.size,
        filename: req.file.originalname
      });
      return res.status(400).json({ error: 'File size too large' });
    }

    // Scan file content for malicious patterns
    if (req.file.mimetype.startsWith('image/')) {
      // Check for embedded scripts in image files
      const content = req.file.buffer.toString();
      if (content.includes('<script') || content.includes('javascript:')) {
        auditLogger.logSecurityEvent('MALICIOUS_FILE_CONTENT', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          filename: req.file.originalname
        });
        return res.status(400).json({ error: 'Potentially malicious file' });
      }
    }
  }

  next();
};

// Audit Logger
class AuditLogger {
  logSecurityEvent(event: string, details: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      details,
      severity: this.getSeverity(event)
    };

    console.log('SECURITY_EVENT:', JSON.stringify(logEntry));

    // Store in database or external logging service
    this.storeSecurityEvent(logEntry);

    // Send alerts for critical events
    if (logEntry.severity === 'CRITICAL') {
      this.sendSecurityAlert(logEntry);
    }
  }

  private getSeverity(event: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalEvents = ['SQL_INJECTION_ATTEMPT', 'XSS_ATTEMPT_DETECTED', 'MALICIOUS_FILE_CONTENT'];
    const highEvents = ['AUTH_RATE_LIMIT_EXCEEDED', 'INVALID_JWT_TOKEN'];
    const mediumEvents = ['RATE_LIMIT_EXCEEDED', 'CSRF_TOKEN_MISMATCH'];

    if (criticalEvents.includes(event)) return 'CRITICAL';
    if (highEvents.includes(event)) return 'HIGH';
    if (mediumEvents.includes(event)) return 'MEDIUM';
    return 'LOW';
  }

  private async storeSecurityEvent(logEntry: any) {
    // Implementation would store in database
    // For now, just log to file
    try {
      const fs = require('fs');
      const logFile = '/var/log/security-audit.log';
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }

  private async sendSecurityAlert(logEntry: any) {
    // Send immediate alert for critical security events
    try {
      const alertData = {
        labels: {
          alertname: 'SecurityThreatDetected',
          severity: 'critical',
          event: logEntry.event
        },
        annotations: {
          summary: `Security threat detected: ${logEntry.event}`,
          description: `Critical security event: ${JSON.stringify(logEntry.details)}`
        },
        startsAt: new Date().toISOString()
      };

      // Send to Alertmanager
      await fetch('http://localhost:9093/api/v1/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([alertData])
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  logUserAction(userId: string, action: string, resource: string, details?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      resource,
      details,
      type: 'USER_ACTION'
    };

    console.log('USER_ACTION:', JSON.stringify(logEntry));
    this.storeSecurityEvent(logEntry);
  }

  logDataAccess(userId: string, dataType: string, operation: string, recordIds?: string[]) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId,
      dataType,
      operation,
      recordIds,
      type: 'DATA_ACCESS'
    };

    console.log('DATA_ACCESS:', JSON.stringify(logEntry));
    this.storeSecurityEvent(logEntry);
  }
}

export const auditLogger = new AuditLogger();

// IP Whitelist/Blacklist
export const ipFiltering = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip;
  
  // Check blacklist
  const blacklistedIPs = process.env.BLACKLISTED_IPS?.split(',') || [];
  if (blacklistedIPs.includes(clientIP)) {
    auditLogger.logSecurityEvent('BLACKLISTED_IP_ACCESS', {
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check whitelist for admin endpoints
  if (req.path.startsWith('/admin/')) {
    const whitelistedIPs = process.env.ADMIN_WHITELISTED_IPS?.split(',') || [];
    if (whitelistedIPs.length > 0 && !whitelistedIPs.includes(clientIP)) {
      auditLogger.logSecurityEvent('UNAUTHORIZED_ADMIN_ACCESS', {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(403).json({ error: 'Admin access restricted' });
    }
  }

  next();
};

// Session Security
export const sessionSecurity = (req: Request, res: Response, next: NextFunction) => {
  const session = (req as any).session;
  
  if (session) {
    // Check for session hijacking
    const currentUserAgent = req.get('User-Agent');
    const sessionUserAgent = session.userAgent;
    
    if (sessionUserAgent && sessionUserAgent !== currentUserAgent) {
      auditLogger.logSecurityEvent('SESSION_HIJACKING_ATTEMPT', {
        ip: req.ip,
        sessionUserAgent,
        currentUserAgent,
        userId: session.userId
      });
      session.destroy();
      return res.status(401).json({ error: 'Session security violation' });
    }
    
    // Store user agent on first request
    if (!sessionUserAgent) {
      session.userAgent = currentUserAgent;
    }
    
    // Check session age
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (session.createdAt && Date.now() - session.createdAt > maxAge) {
      session.destroy();
      return res.status(401).json({ error: 'Session expired' });
    }
  }
  
  next();
};

// Content Integrity
export const contentIntegrity = (req: Request, res: Response, next: NextFunction) => {
  // Add content integrity headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Generate nonce for inline scripts
  const nonce = crypto.randomBytes(16).toString('base64');
  (req as any).nonce = nonce;
  res.locals.nonce = nonce;
  
  next();
};

// Security middleware collection
export const securityMiddleware = [
  securityHeaders,
  ipFiltering,
  globalRateLimit,
  xssProtection,
  sqlInjectionProtection,
  sessionSecurity,
  contentIntegrity
];