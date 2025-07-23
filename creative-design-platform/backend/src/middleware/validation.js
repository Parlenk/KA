const Joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');

// Custom Joi extensions for additional validation
const customJoi = Joi.extend((joi) => ({
  type: 'string',
  base: joi.string(),
  messages: {
    'string.noHtml': '{{#label}} cannot contain HTML tags',
    'string.alphanumericSpaces': '{{#label}} can only contain letters, numbers, spaces, hyphens, and underscores'
  },
  rules: {
    noHtml: {
      validate(value, helpers) {
        const cleaned = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
        if (cleaned !== value) {
          return helpers.error('string.noHtml');
        }
        return value;
      }
    },
    alphanumericSpaces: {
      validate(value, helpers) {
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(value)) {
          return helpers.error('string.alphanumericSpaces');
        }
        return value;
      }
    }
  }
}));

// Common validation schemas
const schemas = {
  // Project validation
  project: {
    create: customJoi.object({
      name: customJoi.string()
        .min(1)
        .max(100)
        .noHtml()
        .alphanumericSpaces()
        .required()
        .label('Project name'),
      templateId: customJoi.number()
        .integer()
        .min(1)
        .required()
        .label('Template ID'),
      canvasSize: customJoi.object({
        width: customJoi.number().integer().min(100).max(5000).required(),
        height: customJoi.number().integer().min(100).max(5000).required(),
        name: customJoi.string().max(50).optional()
      }).optional()
    }),
    
    save: customJoi.object({
      canvas: customJoi.object({
        version: customJoi.string().optional(),
        objects: customJoi.array().items(customJoi.object()).optional(),
        background: customJoi.alternatives().try(
          customJoi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
          customJoi.string().pattern(/^#[0-9A-Fa-f]{3}$/),
          customJoi.string().valid('transparent')
        ).optional()
      }).required().label('Canvas data'),
      thumbnail: customJoi.string()
        .max(2 * 1024 * 1024) // 2MB base64 limit
        .optional()
        .label('Thumbnail')
    })
  },

  // Template validation
  template: {
    create: customJoi.object({
      templateName: customJoi.string()
        .min(1)
        .max(100)
        .noHtml()
        .required()
        .label('Template name'),
      description: customJoi.string()
        .max(500)
        .noHtml()
        .optional()
        .label('Description'),
      category: customJoi.string()
        .valid('social', 'digital', 'web', 'platform-pack', 'custom')
        .required()
        .label('Category')
    })
  },

  // Canvas resize validation
  canvasResize: customJoi.object({
    width: customJoi.number()
      .integer()
      .min(100)
      .max(5000)
      .required()
      .label('Canvas width'),
    height: customJoi.number()
      .integer()
      .min(100)
      .max(5000)
      .required()
      .label('Canvas height'),
    useSmartResize: customJoi.boolean()
      .optional()
      .default(false)
      .label('Smart resize option')
  }),

  // File upload validation
  fileUpload: customJoi.object({
    filename: customJoi.string()
      .pattern(/^[a-zA-Z0-9._-]+$/)
      .max(255)
      .required()
      .label('Filename'),
    mimetype: customJoi.string()
      .valid(
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'image/svg+xml',
        'application/pdf'
      )
      .required()
      .label('File type'),
    size: customJoi.number()
      .integer()
      .max(10 * 1024 * 1024) // 10MB limit
      .required()
      .label('File size')
  }),

  // Query parameters validation
  queryParams: {
    pagination: customJoi.object({
      page: customJoi.number().integer().min(1).default(1),
      limit: customJoi.number().integer().min(1).max(100).default(20),
      sortBy: customJoi.string().valid('name', 'createdAt', 'updatedAt').optional(),
      sortOrder: customJoi.string().valid('asc', 'desc').default('desc')
    }),
    
    search: customJoi.object({
      q: customJoi.string().max(100).noHtml().optional().label('Search query'),
      category: customJoi.string().valid('all', 'social', 'digital', 'web', 'platform-pack', 'custom').optional(),
      platform: customJoi.string().max(50).alphanumericSpaces().optional()
    })
  }
};

// Validation middleware factory
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : 
                  source === 'params' ? req.params : 
                  req.body;
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errorMessages,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Replace the original data with validated/sanitized data
    if (source === 'query') {
      req.query = value;
    } else if (source === 'params') {
      req.params = value;
    } else {
      req.body = value;
    }
    
    next();
  };
};

// Sanitize HTML content
const sanitizeHtml = (content) => {
  if (typeof content !== 'string') return content;
  
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false
  });
};

// Middleware to sanitize request body
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// Recursively sanitize object properties
const sanitizeObject = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeHtml(value);
      } else if (value && typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  return obj;
};

// Validate file uploads
const validateFileUpload = (file) => {
  const errors = [];
  
  // Check file exists
  if (!file) {
    errors.push('No file provided');
    return errors;
  }
  
  // Validate file size (10MB limit)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }
  
  // Validate file type
  const allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push('File type not allowed. Supported types: JPEG, PNG, GIF, WebP, SVG');
  }
  
  // Validate filename
  const filenameRegex = /^[a-zA-Z0-9._-]+$/;
  if (!filenameRegex.test(file.originalname)) {
    errors.push('Filename contains invalid characters');
  }
  
  return errors;
};

// Error handling middleware for validation
const handleValidationError = (error, req, res, next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.message,
      code: 'VALIDATION_ERROR'
    });
  }
  
  next(error);
};

module.exports = {
  schemas,
  validate,
  sanitizeHtml,
  sanitizeBody,
  sanitizeObject,
  validateFileUpload,
  handleValidationError
};