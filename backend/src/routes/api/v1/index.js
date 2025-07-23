/**
 * Public API v1 Routes
 * External integration endpoints for third-party developers
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateAPIKey, requireScopes } = require('../../../middleware/apiAuth');
const { sanitizeInput } = require('../../../middleware/security');
const { logAPIUsage } = require('../../../middleware/analytics');

const router = express.Router();

// Security middleware for public API
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting for public API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each API key to 1000 requests per windowMs
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests from this API key, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.apiKey?.id || req.ip,
  handler: (req, res) => {
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'API rate limit exceeded',
      limit: req.rateLimit.limit,
      remaining: req.rateLimit.remaining,
      reset: new Date(req.rateLimit.resetTime)
    });
  }
});

router.use(apiLimiter);

// API authentication and logging
router.use(authenticateAPIKey);
router.use(logAPIUsage);
router.use(sanitizeInput);

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: errors.array()
    });
  }
  next();
};

// API Info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'Creative Design Platform API',
    version: '1.0.0',
    description: 'Public API for external integrations',
    documentation: 'https://docs.example.com/api/v1',
    status: 'active',
    endpoints: {
      designs: '/api/v1/designs',
      templates: '/api/v1/templates',
      exports: '/api/v1/exports',
      assets: '/api/v1/assets',
      webhooks: '/api/v1/webhooks'
    },
    limits: {
      requestsPerMinute: 1000,
      maxFileSize: '10MB',
      maxExportSize: '50MB'
    }
  });
});

// Designs API
router.get('/designs',
  requireScopes(['designs:read']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search query too long'),
    query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
    query('created_after').optional().isISO8601().withMessage('Invalid date format'),
    query('created_before').optional().isISO8601().withMessage('Invalid date format')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        created_after,
        created_before
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { userId: req.user.id };

      // Apply filters
      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }
      if (status) {
        where.status = status;
      }
      if (created_after || created_before) {
        where.createdAt = {};
        if (created_after) where.createdAt.gte = new Date(created_after);
        if (created_before) where.createdAt.lte = new Date(created_before);
      }

      const [designs, total] = await Promise.all([
        req.prisma.design.findMany({
          where,
          skip: offset,
          take: parseInt(limit),
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            thumbnail: true,
            width: true,
            height: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { exports: true }
            }
          },
          orderBy: { updatedAt: 'desc' }
        }),
        req.prisma.design.count({ where })
      ]);

      res.json({
        data: designs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch designs'
      });
    }
  }
);

router.get('/designs/:id',
  requireScopes(['designs:read']),
  [
    param('id').isUUID().withMessage('Invalid design ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const design = await req.prisma.design.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          thumbnail: true,
          width: true,
          height: true,
          canvasData: true,
          createdAt: true,
          updatedAt: true,
          designSet: {
            select: {
              id: true,
              name: true,
              designs: {
                select: {
                  id: true,
                  name: true,
                  width: true,
                  height: true
                }
              }
            }
          },
          exports: {
            select: {
              id: true,
              format: true,
              status: true,
              downloadUrl: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!design) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Design not found'
        });
      }

      res.json({ data: design });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch design'
      });
    }
  }
);

router.post('/designs',
  requireScopes(['designs:write']),
  [
    body('name').notEmpty().isLength({ max: 255 }).withMessage('Name is required and must be under 255 characters'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
    body('width').isInt({ min: 1, max: 8000 }).withMessage('Width must be between 1 and 8000 pixels'),
    body('height').isInt({ min: 1, max: 8000 }).withMessage('Height must be between 1 and 8000 pixels'),
    body('canvasData').optional().isObject().withMessage('Canvas data must be an object'),
    body('templateId').optional().isUUID().withMessage('Invalid template ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, description, width, height, canvasData, templateId } = req.body;

      // Validate template access if provided
      if (templateId) {
        const template = await req.prisma.template.findFirst({
          where: {
            id: templateId,
            OR: [
              { isPublic: true },
              { userId: req.user.id }
            ]
          }
        });

        if (!template) {
          return res.status(404).json({
            error: 'NOT_FOUND',
            message: 'Template not found or access denied'
          });
        }
      }

      const design = await req.prisma.design.create({
        data: {
          name,
          description,
          width,
          height,
          canvasData: canvasData || {},
          status: 'draft',
          userId: req.user.id,
          templateId
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          width: true,
          height: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.status(201).json({ data: design });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create design'
      });
    }
  }
);

router.put('/designs/:id',
  requireScopes(['designs:write']),
  [
    param('id').isUUID().withMessage('Invalid design ID'),
    body('name').optional().isLength({ max: 255 }).withMessage('Name must be under 255 characters'),
    body('description').optional().isLength({ max: 1000 }).withMessage('Description must be under 1000 characters'),
    body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
    body('canvasData').optional().isObject().withMessage('Canvas data must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, description, status, canvasData } = req.body;
      
      const design = await req.prisma.design.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!design) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Design not found'
        });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (canvasData !== undefined) updateData.canvasData = canvasData;

      const updatedDesign = await req.prisma.design.update({
        where: { id: req.params.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          width: true,
          height: true,
          updatedAt: true
        }
      });

      res.json({ data: updatedDesign });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update design'
      });
    }
  }
);

router.delete('/designs/:id',
  requireScopes(['designs:delete']),
  [
    param('id').isUUID().withMessage('Invalid design ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const design = await req.prisma.design.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id
        }
      });

      if (!design) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Design not found'
        });
      }

      await req.prisma.design.delete({
        where: { id: req.params.id }
      });

      res.status(204).send();
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete design'
      });
    }
  }
);

// Templates API
router.get('/templates',
  requireScopes(['templates:read']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('category').optional().isLength({ max: 50 }).withMessage('Category name too long'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search query too long'),
    query('public_only').optional().isBoolean().withMessage('public_only must be boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        public_only = false
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Filter by visibility
      if (public_only === 'true') {
        where.isPublic = true;
      } else {
        where.OR = [
          { isPublic: true },
          { userId: req.user.id }
        ];
      }

      // Apply filters
      if (category) {
        where.category = category;
      }
      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      const [templates, total] = await Promise.all([
        req.prisma.template.findMany({
          where,
          skip: offset,
          take: parseInt(limit),
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            thumbnail: true,
            width: true,
            height: true,
            isPublic: true,
            isPremium: true,
            tags: true,
            createdAt: true,
            _count: {
              select: { designs: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        req.prisma.template.count({ where })
      ]);

      res.json({
        data: templates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch templates'
      });
    }
  }
);

router.get('/templates/:id',
  requireScopes(['templates:read']),
  [
    param('id').isUUID().withMessage('Invalid template ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const template = await req.prisma.template.findFirst({
        where: {
          id: req.params.id,
          OR: [
            { isPublic: true },
            { userId: req.user.id }
          ]
        },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          thumbnail: true,
          width: true,
          height: true,
          canvasData: true,
          isPublic: true,
          isPremium: true,
          tags: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!template) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Template not found or access denied'
        });
      }

      res.json({ data: template });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch template'
      });
    }
  }
);

// Export API
router.post('/exports',
  requireScopes(['exports:create']),
  [
    body('designId').isUUID().withMessage('Invalid design ID'),
    body('format').isIn(['png', 'jpg', 'pdf', 'svg', 'html5', 'mp4']).withMessage('Invalid export format'),
    body('quality').optional().isInt({ min: 1, max: 100 }).withMessage('Quality must be between 1 and 100'),
    body('width').optional().isInt({ min: 1, max: 8000 }).withMessage('Width must be between 1 and 8000'),
    body('height').optional().isInt({ min: 1, max: 8000 }).withMessage('Height must be between 1 and 8000'),
    body('background').optional().isHexColor().withMessage('Background must be a valid hex color')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { designId, format, quality = 90, width, height, background } = req.body;

      // Verify design access
      const design = await req.prisma.design.findFirst({
        where: {
          id: designId,
          userId: req.user.id
        }
      });

      if (!design) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Design not found'
        });
      }

      // Create export job
      const exportJob = await req.prisma.export.create({
        data: {
          designId,
          format,
          status: 'pending',
          settings: {
            quality,
            width,
            height,
            background
          },
          userId: req.user.id
        },
        select: {
          id: true,
          status: true,
          format: true,
          createdAt: true
        }
      });

      // Queue export job
      await req.exportQueue.add('export', {
        exportId: exportJob.id,
        designId,
        format,
        settings: { quality, width, height, background }
      });

      res.status(201).json({ data: exportJob });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to create export'
      });
    }
  }
);

router.get('/exports/:id',
  requireScopes(['exports:read']),
  [
    param('id').isUUID().withMessage('Invalid export ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const exportJob = await req.prisma.export.findFirst({
        where: {
          id: req.params.id,
          userId: req.user.id
        },
        select: {
          id: true,
          status: true,
          format: true,
          downloadUrl: true,
          progress: true,
          error: true,
          settings: true,
          createdAt: true,
          completedAt: true,
          design: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!exportJob) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Export not found'
        });
      }

      res.json({ data: exportJob });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch export'
      });
    }
  }
);

// Assets API
router.get('/assets',
  requireScopes(['assets:read']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('type').optional().isIn(['image', 'video', 'audio', 'font']).withMessage('Invalid asset type'),
    query('search').optional().isLength({ max: 100 }).withMessage('Search query too long')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        search
      } = req.query;

      const offset = (page - 1) * limit;
      const where = { userId: req.user.id };

      if (type) {
        where.type = type;
      }
      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      const [assets, total] = await Promise.all([
        req.prisma.asset.findMany({
          where,
          skip: offset,
          take: parseInt(limit),
          select: {
            id: true,
            name: true,
            type: true,
            url: true,
            thumbnailUrl: true,
            size: true,
            mimeType: true,
            dimensions: true,
            tags: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }),
        req.prisma.asset.count({ where })
      ]);

      res.json({
        data: assets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch assets'
      });
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('API Error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'INVALID_JSON',
      message: 'Invalid JSON in request body'
    });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload too large'
    });
  }

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred'
  });
});

module.exports = router;