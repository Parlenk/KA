/**
 * Webhook Service
 * Manages webhook registrations, deliveries, and retries for third-party integrations
 */

const crypto = require('crypto');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { Queue } = require('bullmq');
const Redis = require('ioredis');

// Initialize clients
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Create webhook delivery queue
const webhookQueue = new Queue('webhook-delivery', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

/**
 * Webhook event types and their schemas
 */
const WEBHOOK_EVENTS = {
  'design.created': {
    description: 'Triggered when a new design is created',
    schema: {
      id: 'string',
      name: 'string',
      userId: 'string',
      createdAt: 'datetime'
    }
  },
  'design.updated': {
    description: 'Triggered when a design is updated',
    schema: {
      id: 'string',
      name: 'string',
      userId: 'string',
      updatedAt: 'datetime',
      changes: 'object'
    }
  },
  'design.deleted': {
    description: 'Triggered when a design is deleted',
    schema: {
      id: 'string',
      name: 'string',
      userId: 'string',
      deletedAt: 'datetime'
    }
  },
  'export.completed': {
    description: 'Triggered when an export is successfully completed',
    schema: {
      id: 'string',
      designId: 'string',
      format: 'string',
      downloadUrl: 'string',
      userId: 'string',
      completedAt: 'datetime'
    }
  },
  'export.failed': {
    description: 'Triggered when an export fails',
    schema: {
      id: 'string',
      designId: 'string',
      format: 'string',
      error: 'string',
      userId: 'string',
      failedAt: 'datetime'
    }
  },
  'template.published': {
    description: 'Triggered when a template is published',
    schema: {
      id: 'string',
      name: 'string',
      category: 'string',
      userId: 'string',
      publishedAt: 'datetime'
    }
  },
  'user.subscription.updated': {
    description: 'Triggered when user subscription changes',
    schema: {
      userId: 'string',
      plan: 'string',
      status: 'string',
      updatedAt: 'datetime'
    }
  }
};

/**
 * Register a new webhook
 */
const registerWebhook = async (userId, webhookData) => {
  const { url, events, description, isActive = true } = webhookData;

  // Validate events
  const invalidEvents = events.filter(event => !WEBHOOK_EVENTS[event]);
  if (invalidEvents.length > 0) {
    throw new Error(`Invalid webhook events: ${invalidEvents.join(', ')}`);
  }

  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    throw new Error('Invalid webhook URL');
  }

  // Generate webhook secret
  const secret = crypto.randomBytes(32).toString('hex');

  // Create webhook in database
  const webhook = await prisma.webhook.create({
    data: {
      url,
      events,
      description,
      secret,
      isActive,
      userId
    }
  });

  // Test webhook with ping event
  if (isActive) {
    await sendWebhookEvent(webhook.id, 'ping', {
      message: 'Webhook successfully registered',
      timestamp: new Date().toISOString(),
      webhookId: webhook.id
    });
  }

  return {
    ...webhook,
    secret: `${secret.substring(0, 8)}...` // Partial secret for security
  };
};

/**
 * Update webhook configuration
 */
const updateWebhook = async (webhookId, userId, updateData) => {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, userId }
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  // Validate events if provided
  if (updateData.events) {
    const invalidEvents = updateData.events.filter(event => !WEBHOOK_EVENTS[event]);
    if (invalidEvents.length > 0) {
      throw new Error(`Invalid webhook events: ${invalidEvents.join(', ')}`);
    }
  }

  // Validate URL if provided
  if (updateData.url) {
    try {
      new URL(updateData.url);
    } catch (error) {
      throw new Error('Invalid webhook URL');
    }
  }

  const updatedWebhook = await prisma.webhook.update({
    where: { id: webhookId },
    data: updateData
  });

  return updatedWebhook;
};

/**
 * Delete webhook
 */
const deleteWebhook = async (webhookId, userId) => {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, userId }
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  await prisma.webhook.delete({
    where: { id: webhookId }
  });

  return true;
};

/**
 * List user webhooks
 */
const listWebhooks = async (userId) => {
  return await prisma.webhook.findMany({
    where: { userId },
    select: {
      id: true,
      url: true,
      events: true,
      description: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          deliveries: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Send webhook event
 */
const sendWebhookEvent = async (webhookId, eventType, payload, userId = null) => {
  try {
    // Get webhook configuration
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
      include: { user: true }
    });

    if (!webhook || !webhook.isActive) {
      return false;
    }

    // Check if webhook is subscribed to this event type
    if (!webhook.events.includes(eventType) && eventType !== 'ping') {
      return false;
    }

    // Filter payload by user if specified
    if (userId && webhook.userId !== userId) {
      return false;
    }

    // Queue webhook delivery
    await webhookQueue.add('deliver-webhook', {
      webhookId: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      eventType,
      payload,
      timestamp: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error sending webhook event:', error);
    return false;
  }
};

/**
 * Broadcast event to all subscribed webhooks
 */
const broadcastEvent = async (eventType, payload, userId = null) => {
  try {
    const whereClause = {
      isActive: true,
      events: {
        has: eventType
      }
    };

    // Filter by user if specified
    if (userId) {
      whereClause.userId = userId;
    }

    const webhooks = await prisma.webhook.findMany({
      where: whereClause
    });

    // Send to all matching webhooks
    const promises = webhooks.map(webhook =>
      sendWebhookEvent(webhook.id, eventType, payload, userId)
    );

    await Promise.allSettled(promises);

    return webhooks.length;
  } catch (error) {
    console.error('Error broadcasting webhook event:', error);
    return 0;
  }
};

/**
 * Deliver webhook (worker function)
 */
const deliverWebhook = async (job) => {
  const { webhookId, url, secret, eventType, payload, timestamp } = job.data;

  try {
    // Create delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType,
        payload,
        url,
        status: 'pending',
        attempts: 0
      }
    });

    // Prepare webhook payload
    const webhookPayload = {
      event: eventType,
      data: payload,
      timestamp,
      webhookId
    };

    // Generate signature
    const signature = generateWebhookSignature(JSON.stringify(webhookPayload), secret);

    // Send HTTP request
    const response = await axios.post(url, webhookPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Creative-Platform-Webhooks/1.0',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'X-Webhook-ID': webhookId,
        'X-Webhook-Timestamp': timestamp
      },
      timeout: 30000, // 30 seconds
      validateStatus: (status) => status < 400
    });

    // Update delivery record
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'success',
        statusCode: response.status,
        responseHeaders: JSON.stringify(response.headers),
        responseBody: response.data ? JSON.stringify(response.data).substring(0, 1000) : null,
        attempts: job.attemptsMade + 1,
        deliveredAt: new Date()
      }
    });

    console.log(`Webhook delivered successfully: ${webhookId} -> ${url}`);
    return { success: true, statusCode: response.status };

  } catch (error) {
    console.error(`Webhook delivery failed: ${webhookId} -> ${url}`, error);

    // Update delivery record with error
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'failed',
        statusCode: error.response?.status || 0,
        errorMessage: error.message,
        responseHeaders: error.response?.headers ? JSON.stringify(error.response.headers) : null,
        responseBody: error.response?.data ? JSON.stringify(error.response.data).substring(0, 1000) : null,
        attempts: job.attemptsMade + 1,
        failedAt: new Date()
      }
    });

    // Disable webhook after too many failures
    if (job.attemptsMade >= 4) {
      await checkAndDisableFailingWebhook(webhookId);
    }

    throw error;
  }
};

/**
 * Generate webhook signature for verification
 */
const generateWebhookSignature = (payload, secret) => {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
};

/**
 * Verify webhook signature
 */
const verifyWebhookSignature = (payload, signature, secret) => {
  const expectedSignature = generateWebhookSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
};

/**
 * Test webhook endpoint
 */
const testWebhook = async (webhookId, userId) => {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, userId }
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const testPayload = {
    test: true,
    message: 'This is a test webhook delivery',
    timestamp: new Date().toISOString()
  };

  return await sendWebhookEvent(webhookId, 'test', testPayload);
};

/**
 * Get webhook delivery history
 */
const getWebhookDeliveries = async (webhookId, userId, options = {}) => {
  const { page = 1, limit = 20, status } = options;
  const offset = (page - 1) * limit;

  // Verify webhook ownership
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, userId }
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const where = { webhookId };
  if (status) {
    where.status = status;
  }

  const [deliveries, total] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        eventType: true,
        status: true,
        statusCode: true,
        attempts: true,
        errorMessage: true,
        createdAt: true,
        deliveredAt: true,
        failedAt: true
      }
    }),
    prisma.webhookDelivery.count({ where })
  ]);

  return {
    deliveries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get webhook statistics
 */
const getWebhookStats = async (webhookId, userId) => {
  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, userId }
  });

  if (!webhook) {
    throw new Error('Webhook not found');
  }

  const [
    totalDeliveries,
    successfulDeliveries,
    failedDeliveries,
    recentDeliveries
  ] = await Promise.all([
    prisma.webhookDelivery.count({ where: { webhookId } }),
    prisma.webhookDelivery.count({ where: { webhookId, status: 'success' } }),
    prisma.webhookDelivery.count({ where: { webhookId, status: 'failed' } }),
    prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        eventType: true,
        status: true,
        createdAt: true
      }
    })
  ]);

  const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;

  return {
    totalDeliveries,
    successfulDeliveries,
    failedDeliveries,
    successRate: Math.round(successRate * 100) / 100,
    recentDeliveries
  };
};

/**
 * Check and disable failing webhooks
 */
const checkAndDisableFailingWebhook = async (webhookId) => {
  const failureThreshold = 10;
  const timeWindow = 24 * 60 * 60 * 1000; // 24 hours

  const recentFailures = await prisma.webhookDelivery.count({
    where: {
      webhookId,
      status: 'failed',
      createdAt: {
        gte: new Date(Date.now() - timeWindow)
      }
    }
  });

  if (recentFailures >= failureThreshold) {
    await prisma.webhook.update({
      where: { id: webhookId },
      data: { isActive: false }
    });

    console.log(`Disabled webhook ${webhookId} due to excessive failures`);
  }
};

/**
 * Cleanup old webhook deliveries
 */
const cleanupOldDeliveries = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedCount = await prisma.webhookDelivery.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    console.log(`Cleaned up ${deletedCount.count} old webhook deliveries`);
  } catch (error) {
    console.error('Error cleaning up webhook deliveries:', error);
  }
};

/**
 * Get available webhook events
 */
const getAvailableEvents = () => {
  return Object.entries(WEBHOOK_EVENTS).map(([event, config]) => ({
    event,
    description: config.description,
    schema: config.schema
  }));
};

// Set up webhook delivery worker
webhookQueue.process('deliver-webhook', deliverWebhook);

// Run cleanup daily
setInterval(cleanupOldDeliveries, 24 * 60 * 60 * 1000);

module.exports = {
  registerWebhook,
  updateWebhook,
  deleteWebhook,
  listWebhooks,
  sendWebhookEvent,
  broadcastEvent,
  deliverWebhook,
  generateWebhookSignature,
  verifyWebhookSignature,
  testWebhook,
  getWebhookDeliveries,
  getWebhookStats,
  getAvailableEvents,
  cleanupOldDeliveries,
  WEBHOOK_EVENTS
};