/**
 * Cloud Storage Routes
 * API endpoints for managing cloud storage integrations (Google Drive, Dropbox, OneDrive)
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const {
  PROVIDERS,
  connectCloudStorage,
  disconnectCloudStorage,
  listCloudStorageConnections,
  uploadToCloudStorage,
  downloadFromCloudStorage,
  syncDesignToCloud,
  enableAutoSync,
  getSyncHistory,
  verifyProviderToken
} = require('../services/cloudStorageService');
const { authenticateAPIKey, requireScopes } = require('../middleware/apiAuth');
const { sanitizeInput } = require('../middleware/security');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|svg|pdf|mp4|mov|avi/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, videos, and documents are allowed'));
    }
  }
});

// Rate limiting for cloud storage operations
const cloudStorageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each API key to 100 requests per windowMs
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many cloud storage requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
router.use(cloudStorageLimiter);
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
 * Get available cloud storage providers
 * GET /api/cloud-storage/providers
 */
router.get('/providers', (req, res) => {
  try {
    const providers = Object.entries(PROVIDERS).map(([key, config]) => ({
      id: key,
      name: config.name,
      maxFileSize: config.maxFileSize,
      supportedFormats: config.supportedFormats
    }));

    res.json({
      data: providers,
      message: 'Available cloud storage providers retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching cloud storage providers:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch cloud storage providers'
    });
  }
});

/**
 * List user's cloud storage connections
 * GET /api/cloud-storage/connections
 */
router.get('/connections',
  requireScopes(['cloud_storage:read']),
  async (req, res) => {
    try {
      const connections = await listCloudStorageConnections(req.user.id);
      res.json({
        data: connections,
        count: connections.length
      });
    } catch (error) {
      console.error('Error listing cloud storage connections:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch cloud storage connections'
      });
    }
  }
);

/**
 * Connect cloud storage account
 * POST /api/cloud-storage/connect
 */
router.post('/connect',
  requireScopes(['cloud_storage:write']),
  [
    body('provider')
      .isIn(Object.keys(PROVIDERS))
      .withMessage('Invalid cloud storage provider'),
    body('accessToken')
      .isString()
      .notEmpty()
      .withMessage('Access token is required'),
    body('refreshToken')
      .optional()
      .isString()
      .withMessage('Refresh token must be a string'),
    body('expiresAt')
      .optional()
      .isISO8601()
      .withMessage('Invalid expiration date'),
    body('accountInfo')
      .isObject()
      .withMessage('Account info is required'),
    body('accountInfo.id')
      .isString()
      .notEmpty()
      .withMessage('Account ID is required'),
    body('accountInfo.name')
      .optional()
      .isString()
      .withMessage('Account name must be a string'),
    body('accountInfo.email')
      .optional()
      .isEmail()
      .withMessage('Invalid email address')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { provider, accessToken, refreshToken, expiresAt, accountInfo } = req.body;

      const connection = await connectCloudStorage(req.user.id, provider, {
        accessToken,
        refreshToken,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        accountInfo
      });

      res.status(201).json({
        data: connection,
        message: 'Cloud storage account connected successfully'
      });
    } catch (error) {
      console.error('Error connecting cloud storage:', error);
      
      if (error.message.includes('Invalid access token')) {
        return res.status(400).json({
          error: 'INVALID_TOKEN',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to connect cloud storage account'
      });
    }
  }
);

/**
 * Disconnect cloud storage account
 * DELETE /api/cloud-storage/connections/:id
 */
router.delete('/connections/:id',
  requireScopes(['cloud_storage:delete']),
  [
    param('id').isUUID().withMessage('Invalid connection ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      await disconnectCloudStorage(req.user.id, req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('Error disconnecting cloud storage:', error);
      
      if (error.message === 'Cloud storage connection not found') {
        return res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Cloud storage connection not found'
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to disconnect cloud storage account'
      });
    }
  }
);

/**
 * Upload file to cloud storage
 * POST /api/cloud-storage/upload
 */
router.post('/upload',
  requireScopes(['cloud_storage:write']),
  upload.single('file'),
  [
    body('connectionId')
      .isUUID()
      .withMessage('Valid connection ID is required'),
    body('designId')
      .optional()
      .isUUID()
      .withMessage('Invalid design ID'),
    body('folderId')
      .optional()
      .isString()
      .withMessage('Folder ID must be a string')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: 'NO_FILE',
          message: 'No file provided for upload'
        });
      }

      const { connectionId, designId, folderId } = req.body;

      const result = await uploadToCloudStorage(req.user.id, connectionId, {
        fileName: req.file.originalname,
        fileBuffer: req.file.buffer,
        mimeType: req.file.mimetype,
        designId,
        folderId
      });

      res.status(201).json({
        data: result,
        message: 'File uploaded to cloud storage successfully'
      });
    } catch (error) {
      console.error('Error uploading to cloud storage:', error);
      
      if (error.message.includes('File too large')) {
        return res.status(413).json({
          error: 'FILE_TOO_LARGE',
          message: error.message
        });
      }

      if (error.message === 'Cloud storage connection not found or inactive') {
        return res.status(404).json({
          error: 'CONNECTION_NOT_FOUND',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to upload file to cloud storage'
      });
    }
  }
);

/**
 * Download file from cloud storage
 * GET /api/cloud-storage/download/:fileId
 */
router.get('/download/:fileId',
  requireScopes(['cloud_storage:read']),
  [
    param('fileId').isUUID().withMessage('Invalid file ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const result = await downloadFromCloudStorage(req.user.id, req.params.fileId);

      res.set({
        'Content-Type': result.mimeType,
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Content-Length': result.buffer.length
      });

      res.send(result.buffer);
    } catch (error) {
      console.error('Error downloading from cloud storage:', error);
      
      if (error.message === 'Cloud storage file not found or connection inactive') {
        return res.status(404).json({
          error: 'FILE_NOT_FOUND',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to download file from cloud storage'
      });
    }
  }
);

/**
 * Sync design to cloud storage
 * POST /api/cloud-storage/sync-design
 */
router.post('/sync-design',
  requireScopes(['cloud_storage:write']),
  [
    body('designId')
      .isUUID()
      .withMessage('Valid design ID is required'),
    body('connectionId')
      .isUUID()
      .withMessage('Valid connection ID is required'),
    body('includeExports')
      .optional()
      .isBoolean()
      .withMessage('includeExports must be a boolean'),
    body('createFolder')
      .optional()
      .isBoolean()
      .withMessage('createFolder must be a boolean')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { designId, connectionId, includeExports, createFolder } = req.body;

      const result = await syncDesignToCloud(req.user.id, designId, connectionId, {
        includeExports,
        createFolder
      });

      res.json({
        data: result,
        message: 'Design synced to cloud storage successfully'
      });
    } catch (error) {
      console.error('Error syncing design to cloud storage:', error);
      
      if (error.message === 'Design not found') {
        return res.status(404).json({
          error: 'DESIGN_NOT_FOUND',
          message: error.message
        });
      }

      if (error.message === 'Cloud storage connection not found or inactive') {
        return res.status(404).json({
          error: 'CONNECTION_NOT_FOUND',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to sync design to cloud storage'
      });
    }
  }
);

/**
 * Enable/configure auto-sync
 * POST /api/cloud-storage/auto-sync
 */
router.post('/auto-sync',
  requireScopes(['cloud_storage:write']),
  [
    body('connectionId')
      .isUUID()
      .withMessage('Valid connection ID is required'),
    body('settings')
      .isObject()
      .withMessage('Settings object is required'),
    body('settings.syncExports')
      .optional()
      .isBoolean()
      .withMessage('syncExports must be a boolean'),
    body('settings.syncDesigns')
      .optional()
      .isBoolean()
      .withMessage('syncDesigns must be a boolean'),
    body('settings.syncInterval')
      .optional()
      .isIn(['hourly', 'daily', 'weekly'])
      .withMessage('Invalid sync interval')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { connectionId, settings } = req.body;

      await enableAutoSync(req.user.id, connectionId, settings);

      res.json({
        message: 'Auto-sync configured successfully'
      });
    } catch (error) {
      console.error('Error configuring auto-sync:', error);
      
      if (error.message === 'Cloud storage connection not found') {
        return res.status(404).json({
          error: 'CONNECTION_NOT_FOUND',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to configure auto-sync'
      });
    }
  }
);

/**
 * Get sync history
 * GET /api/cloud-storage/history
 */
router.get('/history',
  requireScopes(['cloud_storage:read']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('provider').optional().isIn(Object.keys(PROVIDERS)).withMessage('Invalid provider'),
    query('designId').optional().isUUID().withMessage('Invalid design ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { page = 1, limit = 20, provider, designId } = req.query;

      const result = await getSyncHistory(req.user.id, {
        page: parseInt(page),
        limit: parseInt(limit),
        provider,
        designId
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching sync history:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch sync history'
      });
    }
  }
);

/**
 * Test connection
 * POST /api/cloud-storage/test/:id
 */
router.post('/test/:id',
  requireScopes(['cloud_storage:read']),
  [
    param('id').isUUID().withMessage('Invalid connection ID')
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const connection = await prisma.cloudStorageConnection.findFirst({
        where: { id: req.params.id, userId: req.user.id }
      });

      if (!connection) {
        return res.status(404).json({
          error: 'CONNECTION_NOT_FOUND',
          message: 'Cloud storage connection not found'
        });
      }

      const isValid = await verifyProviderToken(
        connection.provider,
        connection.accessToken,
        connection.accountId
      );

      if (isValid) {
        res.json({
          status: 'connected',
          message: 'Connection is working properly'
        });
      } else {
        res.status(400).json({
          status: 'disconnected',
          message: 'Connection appears to be invalid or expired'
        });
      }
    } catch (error) {
      console.error('Error testing cloud storage connection:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to test connection'
      });
    }
  }
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Cloud Storage API Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'FILE_TOO_LARGE',
        message: 'File size exceeds the maximum limit'
      });
    }
  }
  
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