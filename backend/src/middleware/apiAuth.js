/**
 * API Authentication Middleware
 * Handles API key authentication and scope-based authorization
 */

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Authenticate API key from request headers
 */
const authenticateAPIKey = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'API key required'
      });
    }

    // Extract API key from Authorization header
    const apiKey = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!apiKey) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid API key format'
      });
    }

    // Validate API key format (should be: prefix_secret)
    const keyParts = apiKey.split('_');
    if (keyParts.length !== 2) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid API key format'
      });
    }

    const [keyPrefix, keySecret] = keyParts;

    // Find API key in database
    const dbApiKey = await prisma.apiKey.findFirst({
      where: {
        keyPrefix,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true
          }
        }
      }
    });

    if (!dbApiKey) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid API key'
      });
    }

    // Verify API key secret (in production, this should be hashed)
    const crypto = require('crypto');
    const hashedSecret = crypto
      .createHash('sha256')
      .update(keySecret)
      .digest('hex');

    if (dbApiKey.keyHash !== hashedSecret) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Invalid API key'
      });
    }

    // Check if user is active
    if (!dbApiKey.user.isActive) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'User account is disabled'
      });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: dbApiKey.id },
      data: { 
        lastUsed: new Date(),
        usageCount: { increment: 1 }
      }
    });

    // Attach API key and user to request
    req.apiKey = {
      id: dbApiKey.id,
      name: dbApiKey.name,
      scopes: dbApiKey.scopes,
      usageCount: dbApiKey.usageCount
    };
    req.user = dbApiKey.user;
    req.prisma = prisma;

    next();
  } catch (error) {
    console.error('API Authentication Error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Authentication failed'
    });
  }
};

/**
 * Require specific scopes for API access
 */
const requireScopes = (requiredScopes) => {
  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'API key required'
      });
    }

    const userScopes = req.apiKey.scopes || [];
    
    // Check if user has all required scopes
    const hasRequiredScopes = requiredScopes.every(scope => 
      userScopes.includes(scope) || userScopes.includes('*')
    );

    if (!hasRequiredScopes) {
      return res.status(403).json({
        error: 'INSUFFICIENT_SCOPE',
        message: 'Insufficient permissions for this operation',
        required: requiredScopes,
        granted: userScopes
      });
    }

    next();
  };
};

/**
 * JWT token authentication for GraphQL
 */
const authenticateToken = async (token) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    // Verify JWT token
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        scopes: true
      }
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    return user;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * GraphQL authentication wrapper
 */
const authenticateGraphQL = async (parent, args, context) => {
  const token = context.req?.headers?.authorization;
  
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const user = await authenticateToken(token);
    context.user = user;
    return true;
  } catch (error) {
    throw new Error('Invalid authentication credentials');
  }
};

/**
 * GraphQL scope validation
 */
const requireGraphQLScopes = (requiredScopes) => {
  return async (parent, args, context) => {
    if (!context.user) {
      throw new Error('Authentication required');
    }

    const userScopes = context.user.scopes || [];
    
    const hasRequiredScopes = requiredScopes.every(scope => 
      userScopes.includes(scope) || userScopes.includes('*')
    );

    if (!hasRequiredScopes) {
      throw new Error(`Insufficient permissions. Required: ${requiredScopes.join(', ')}`);
    }

    return true;
  };
};

/**
 * Rate limiting for GraphQL
 */
const rateLimitGraphQL = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (parent, args, context) => {
    const identifier = context.user?.id || context.req?.ip;
    const now = Date.now();
    
    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }

    const userRequests = requests.get(identifier);
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      throw new Error('Rate limit exceeded');
    }

    validRequests.push(now);
    requests.set(identifier, validRequests);

    return true;
  };
};

/**
 * Generate API key pair
 */
const generateAPIKey = () => {
  const crypto = require('crypto');
  
  // Generate prefix (8 characters)
  const prefix = crypto.randomBytes(4).toString('hex');
  
  // Generate secret (32 characters)
  const secret = crypto.randomBytes(16).toString('hex');
  
  // Create hash of secret for storage
  const keyHash = crypto
    .createHash('sha256')
    .update(secret)
    .digest('hex');

  return {
    key: `${prefix}_${secret}`,
    keyPrefix: prefix,
    keyHash
  };
};

/**
 * Create API key for user
 */
const createAPIKey = async (userId, name, scopes = [], expiresAt = null) => {
  const { key, keyPrefix, keyHash } = generateAPIKey();

  const apiKey = await prisma.apiKey.create({
    data: {
      name,
      keyPrefix,
      keyHash,
      scopes,
      expiresAt,
      userId,
      isActive: true
    }
  });

  return {
    ...apiKey,
    key // Only return the full key once
  };
};

/**
 * Revoke API key
 */
const revokeAPIKey = async (apiKeyId, userId) => {
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      userId
    }
  });

  if (!apiKey) {
    throw new Error('API key not found');
  }

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { isActive: false }
  });

  return true;
};

/**
 * List user's API keys
 */
const listAPIKeys = async (userId) => {
  return await prisma.apiKey.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      isActive: true,
      lastUsed: true,
      usageCount: true,
      createdAt: true,
      expiresAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Validate API key scopes
 */
const validateScopes = (scopes) => {
  const validScopes = [
    'designs:read',
    'designs:write',
    'designs:delete',
    'templates:read',
    'templates:write',
    'templates:delete',
    'exports:read',
    'exports:create',
    'exports:write',
    'assets:read',
    'assets:write',
    'assets:delete',
    'brandkits:read',
    'brandkits:write',
    'brandkits:delete',
    'webhooks:read',
    'webhooks:write',
    'webhooks:delete',
    'analytics:read',
    'apikeys:read',
    'apikeys:write',
    'apikeys:delete',
    '*' // Full access
  ];

  return scopes.every(scope => validScopes.includes(scope));
};

/**
 * Middleware to clean up expired API keys
 */
const cleanupExpiredKeys = async () => {
  try {
    const expiredCount = await prisma.apiKey.updateMany({
      where: {
        expiresAt: {
          lte: new Date()
        },
        isActive: true
      },
      data: {
        isActive: false
      }
    });

    if (expiredCount.count > 0) {
      console.log(`Deactivated ${expiredCount.count} expired API keys`);
    }
  } catch (error) {
    console.error('Error cleaning up expired API keys:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredKeys, 60 * 60 * 1000);

module.exports = {
  authenticateAPIKey,
  requireScopes,
  authenticateToken,
  authenticateGraphQL,
  requireGraphQLScopes,
  rateLimitGraphQL,
  generateAPIKey,
  createAPIKey,
  revokeAPIKey,
  listAPIKeys,
  validateScopes,
  cleanupExpiredKeys
};