/**
 * Webhook Management Routes
 * API endpoints for managing webhook registrations and monitoring deliveries
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  registerWebhook,
  updateWebhook,
  deleteWebhook,
  listWebhooks,
  testWebhook,
  getWebhookDeliveries,
  getWebhookStats,
  getAvailableEvents,
  broadcastEvent
} = require('../services/webhookService');
const { authenticateAPIKey, requireScopes } = require('../middleware/apiAuth');
const { sanitizeInput } = require('../middleware/security');

const router = express.Router();

// Rate limiting for webhook management
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each API key to 50 requests per windowMs
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many webhook requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
router.use(webhookLimiter);
router.use(authenticateAPIKey);
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

/**
 * Get available webhook events
 * GET /api/webhooks/events
 */
router.get('/events', (req, res) => {
  try {
    const events = getAvailableEvents();
    res.json({
      data: events,
      message: 'Available webhook events retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching webhook events:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch webhook events'
    });
  }
});

/**
 * List user webhooks
 * GET /api/webhooks
 */
router.get('/',
  requireScopes(['webhooks:read']),
  async (req, res) => {
    try {
      const webhooks = await listWebhooks(req.user.id);
      res.json({
        data: webhooks,
        count: webhooks.length
      });
    } catch (error) {
      console.error('Error listing webhooks:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch webhooks'
      });
    }
  }
);

/**
 * Register new webhook
 * POST /api/webhooks
 */
router.post('/',
  requireScopes(['webhooks:write']),
  [
    body('url')
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Valid HTTPS URL is required'),
    body('events')
      .isArray({ min: 1 })
      .withMessage('At least one event must be specified'),
    body('events.*')
      .isString()
      .withMessage('Event names must be strings'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be under 500 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { url, events, description, isActive } = req.body;

      // Ensure HTTPS in production
      if (process.env.NODE_ENV === 'production' && !url.startsWith('https://')) {
        return res.status(400).json({
          error: 'INVALID_URL',
          message: 'Webhook URLs must use HTTPS in production'
        });
      }

      const webhook = await registerWebhook(req.user.id, {
        url,
        events,
        description,
        isActive
      });

      res.status(201).json({
        data: webhook,
        message: 'Webhook registered successfully'
      });
    } catch (error) {
      console.error('Error registering webhook:', error);
      
      if (error.message.includes('Invalid webhook events')) {
        return res.status(400).json({
          error: 'INVALID_EVENTS',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to register webhook'
      });
    }
  }
);

/**
 * Get webhook details
 * GET /api/webhooks/:id
 */
router.get('/:id',
  requireScopes(['webhooks:read']),
  [
    param('id').isUUID().withMessage('Invalid webhook ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const webhooks = await listWebhooks(req.user.id);
      const webhook = webhooks.find(w => w.id === req.params.id);

      if (!webhook) {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Webhook not found'
        });
      }

      res.json({ data: webhook });
    } catch (error) {
      console.error('Error fetching webhook:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch webhook'
      });
    }
  }
);

/**
 * Update webhook
 * PUT /api/webhooks/:id
 */
router.put('/:id',
  requireScopes(['webhooks:write']),
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    body('url')
      .optional()
      .isURL({ protocols: ['http', 'https'] })
      .withMessage('Valid URL is required'),
    body('events')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one event must be specified'),
    body('events.*')
      .optional()
      .isString()
      .withMessage('Event names must be strings'),
    body('description')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Description must be under 500 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const updateData = req.body;

      // Ensure HTTPS in production
      if (updateData.url && process.env.NODE_ENV === 'production' && !updateData.url.startsWith('https://')) {
        return res.status(400).json({
          error: 'INVALID_URL',
          message: 'Webhook URLs must use HTTPS in production'
        });
      }

      const webhook = await updateWebhook(req.params.id, req.user.id, updateData);

      res.json({
        data: webhook,
        message: 'Webhook updated successfully'
      });
    } catch (error) {
      console.error('Error updating webhook:', error);
      
      if (error.message === 'Webhook not found') {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Webhook not found'
        });
      }

      if (error.message.includes('Invalid webhook events')) {
        return res.status(400).json({
          error: 'INVALID_EVENTS',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to update webhook'
      });
    }
  }
);

/**
 * Delete webhook
 * DELETE /api/webhooks/:id
 */
router.delete('/:id',
  requireScopes(['webhooks:delete']),
  [
    param('id').isUUID().withMessage('Invalid webhook ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await deleteWebhook(req.params.id, req.user.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting webhook:', error);
      
      if (error.message === 'Webhook not found') {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Webhook not found'
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to delete webhook'
      });
    }
  }
);

/**
 * Test webhook
 * POST /api/webhooks/:id/test
 */
router.post('/:id/test',
  requireScopes(['webhooks:write']),
  [
    param('id').isUUID().withMessage('Invalid webhook ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const success = await testWebhook(req.params.id, req.user.id);

      if (success) {
        res.json({
          message: 'Test webhook sent successfully',
          status: 'sent'
        });
      } else {
        res.status(400).json({
          error: 'TEST_FAILED',
          message: 'Failed to send test webhook'
        });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      
      if (error.message === 'Webhook not found') {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Webhook not found'
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to test webhook'
      });
    }
  }
);

/**
 * Get webhook delivery history
 * GET /api/webhooks/:id/deliveries
 */
router.get('/:id/deliveries',
  requireScopes(['webhooks:read']),
  [
    param('id').isUUID().withMessage('Invalid webhook ID'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('status').optional().isIn(['pending', 'success', 'failed']).withMessage('Invalid status')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, status } = req.query;

      const result = await getWebhookDeliveries(req.params.id, req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching webhook deliveries:', error);
      
      if (error.message === 'Webhook not found') {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Webhook not found'
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch webhook deliveries'
      });
    }
  }
);

/**
 * Get webhook statistics
 * GET /api/webhooks/:id/stats
 */
router.get('/:id/stats',
  requireScopes(['webhooks:read']),
  [
    param('id').isUUID().withMessage('Invalid webhook ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const stats = await getWebhookStats(req.params.id, req.user.id);
      res.json({ data: stats });
    } catch (error) {
      console.error('Error fetching webhook stats:', error);
      
      if (error.message === 'Webhook not found') {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Webhook not found'
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch webhook statistics'
      });
    }
  }
);

/**
 * Manual event trigger (for testing/admin)
 * POST /api/webhooks/trigger
 */
router.post('/trigger',
  requireScopes(['webhooks:write']),
  [
    body('event')
      .isString()
      .notEmpty()
      .withMessage('Event type is required'),
    body('payload')
      .isObject()
      .withMessage('Payload must be an object')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { event, payload } = req.body;

      // Only allow manual triggering of test events
      if (!event.startsWith('test.')) {
        return res.status(400).json({
          error: 'INVALID_EVENT',
          message: 'Only test events can be manually triggered'
        });
      }

      const deliveredCount = await broadcastEvent(event, payload, req.user.id);

      res.json({
        message: 'Event triggered successfully',
        deliveredToWebhooks: deliveredCount
      });
    } catch (error) {
      console.error('Error triggering webhook event:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to trigger webhook event'
      });
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Webhook API Error:', error);
  
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'INVALID_JSON',
      message: 'Invalid JSON in request body'
    });
  }

  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred'
  });
});

module.exports = router;