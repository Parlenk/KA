/**
 * API Analytics Middleware
 * Tracks API usage, performance metrics, and generates insights
 */

const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');

// Initialize clients
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Log API usage for analytics
 */
const logAPIUsage = async (req, res, next) => {
  const startTime = Date.now();
  
  // Store original end method
  const originalEnd = res.end;
  
  // Override end method to capture response data
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Log the API call asynchronously
    setImmediate(async () => {
      try {
        await logAPICall({
          userId: req.user?.id,
          apiKeyId: req.apiKey?.id,
          method: req.method,
          endpoint: req.route?.path || req.path,
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          statusCode: res.statusCode,
          duration,
          requestSize: req.headers['content-length'] || 0,
          responseSize: res.get('content-length') || 0,
          timestamp: new Date(startTime)
        });
      } catch (error) {
        console.error('Failed to log API usage:', error);
      }
    });
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Log individual API call
 */
const logAPICall = async (callData) => {
  const {
    userId,
    apiKeyId,
    method,
    endpoint,
    userAgent,
    ip,
    statusCode,
    duration,
    requestSize,
    responseSize,
    timestamp
  } = callData;

  // Store in database for detailed analytics
  await prisma.apiCall.create({
    data: {
      userId,
      apiKeyId,
      method,
      endpoint,
      userAgent,
      ip,
      statusCode,
      duration,
      requestSize: parseInt(requestSize) || 0,
      responseSize: parseInt(responseSize) || 0,
      timestamp
    }
  });

  // Store in Redis for real-time metrics
  const hour = new Date(timestamp).getHours();
  const date = timestamp.toISOString().split('T')[0];
  
  const multi = redis.multi();
  
  // Increment counters
  multi.hincrby(`api:calls:${date}`, hour, 1);
  multi.hincrby(`api:calls:user:${userId}:${date}`, hour, 1);
  multi.hincrby(`api:calls:endpoint:${endpoint}:${date}`, hour, 1);
  multi.hincrby(`api:calls:status:${statusCode}:${date}`, hour, 1);
  
  // Track response times
  multi.lpush(`api:duration:${date}:${hour}`, duration);
  multi.ltrim(`api:duration:${date}:${hour}`, 0, 999); // Keep last 1000 entries
  
  // Track errors
  if (statusCode >= 400) {
    multi.hincrby(`api:errors:${date}`, hour, 1);
    multi.hincrby(`api:errors:${statusCode}:${date}`, hour, 1);
  }
  
  // Set expiration (30 days)
  multi.expire(`api:calls:${date}`, 30 * 24 * 60 * 60);
  multi.expire(`api:calls:user:${userId}:${date}`, 30 * 24 * 60 * 60);
  multi.expire(`api:calls:endpoint:${endpoint}:${date}`, 30 * 24 * 60 * 60);
  multi.expire(`api:duration:${date}:${hour}`, 30 * 24 * 60 * 60);
  
  await multi.exec();
};

/**
 * Get API usage analytics
 */
const getAnalytics = async (userId, options = {}) => {
  const {
    from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to = new Date(),
    granularity = 'day', // 'hour', 'day', 'week', 'month'
    metrics = ['calls', 'errors', 'duration']
  } = options;

  const results = {};

  try {
    // Get database analytics
    if (metrics.includes('calls') || metrics.includes('errors')) {
      const calls = await prisma.apiCall.groupBy({
        by: ['timestamp'],
        where: {
          userId,
          timestamp: {
            gte: from,
            lte: to
          }
        },
        _count: true,
        _avg: {
          duration: true
        }
      });

      results.calls = calls;
    }

    // Get real-time metrics from Redis
    if (metrics.includes('realtime')) {
      const realtime = await getRealTimeMetrics(userId);
      results.realtime = realtime;
    }

    // Get endpoint usage
    if (metrics.includes('endpoints')) {
      const endpoints = await getEndpointUsage(userId, from, to);
      results.endpoints = endpoints;
    }

    // Get performance metrics
    if (metrics.includes('performance')) {
      const performance = await getPerformanceMetrics(userId, from, to);
      results.performance = performance;
    }

    // Get error analysis
    if (metrics.includes('errors')) {
      const errors = await getErrorAnalysis(userId, from, to);
      results.errors = errors;
    }

    return results;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    throw error;
  }
};

/**
 * Get real-time metrics from Redis
 */
const getRealTimeMetrics = async (userId) => {
  const now = new Date();
  const currentHour = now.getHours();
  const today = now.toISOString().split('T')[0];

  try {
    const [
      totalCalls,
      userCalls,
      currentHourCalls,
      errors
    ] = await Promise.all([
      redis.hgetall(`api:calls:${today}`),
      redis.hgetall(`api:calls:user:${userId}:${today}`),
      redis.hget(`api:calls:${today}`, currentHour),
      redis.hgetall(`api:errors:${today}`)
    ]);

    return {
      totalCallsToday: Object.values(totalCalls).reduce((sum, val) => sum + parseInt(val), 0),
      userCallsToday: Object.values(userCalls).reduce((sum, val) => sum + parseInt(val), 0),
      callsThisHour: parseInt(currentHourCalls) || 0,
      errorsToday: Object.values(errors).reduce((sum, val) => sum + parseInt(val), 0)
    };
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    return {};
  }
};

/**
 * Get endpoint usage statistics
 */
const getEndpointUsage = async (userId, from, to) => {
  try {
    const endpoints = await prisma.apiCall.groupBy({
      by: ['endpoint', 'method'],
      where: {
        userId,
        timestamp: {
          gte: from,
          lte: to
        }
      },
      _count: true,
      _avg: {
        duration: true
      },
      orderBy: {
        _count: {
          endpoint: 'desc'
        }
      }
    });

    return endpoints.map(endpoint => ({
      endpoint: endpoint.endpoint,
      method: endpoint.method,
      calls: endpoint._count,
      avgDuration: Math.round(endpoint._avg.duration || 0)
    }));
  } catch (error) {
    console.error('Error fetching endpoint usage:', error);
    return [];
  }
};

/**
 * Get performance metrics
 */
const getPerformanceMetrics = async (userId, from, to) => {
  try {
    const performance = await prisma.apiCall.aggregate({
      where: {
        userId,
        timestamp: {
          gte: from,
          lte: to
        }
      },
      _avg: {
        duration: true,
        requestSize: true,
        responseSize: true
      },
      _max: {
        duration: true
      },
      _min: {
        duration: true
      }
    });

    // Get percentiles from Redis (approximate)
    const dates = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    const durations = [];
    for (const date of dates) {
      for (let hour = 0; hour < 24; hour++) {
        const hourDurations = await redis.lrange(`api:duration:${date}:${hour}`, 0, -1);
        durations.push(...hourDurations.map(d => parseInt(d)));
      }
    }

    durations.sort((a, b) => a - b);
    
    const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

    return {
      avgDuration: Math.round(performance._avg.duration || 0),
      maxDuration: performance._max.duration || 0,
      minDuration: performance._min.duration || 0,
      p50Duration: p50,
      p95Duration: p95,
      p99Duration: p99,
      avgRequestSize: Math.round(performance._avg.requestSize || 0),
      avgResponseSize: Math.round(performance._avg.responseSize || 0)
    };
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return {};
  }
};

/**
 * Get error analysis
 */
const getErrorAnalysis = async (userId, from, to) => {
  try {
    const errors = await prisma.apiCall.groupBy({
      by: ['statusCode'],
      where: {
        userId,
        statusCode: {
          gte: 400
        },
        timestamp: {
          gte: from,
          lte: to
        }
      },
      _count: true,
      orderBy: {
        _count: {
          statusCode: 'desc'
        }
      }
    });

    const totalCalls = await prisma.apiCall.count({
      where: {
        userId,
        timestamp: {
          gte: from,
          lte: to
        }
      }
    });

    const totalErrors = errors.reduce((sum, error) => sum + error._count, 0);
    const errorRate = totalCalls > 0 ? (totalErrors / totalCalls) * 100 : 0;

    return {
      errorRate: Math.round(errorRate * 100) / 100,
      totalErrors,
      errorsByStatus: errors.map(error => ({
        statusCode: error.statusCode,
        count: error._count
      }))
    };
  } catch (error) {
    console.error('Error fetching error analysis:', error);
    return {};
  }
};

/**
 * Get top API consumers
 */
const getTopConsumers = async (from, to, limit = 10) => {
  try {
    const consumers = await prisma.apiCall.groupBy({
      by: ['userId'],
      where: {
        timestamp: {
          gte: from,
          lte: to
        }
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc'
        }
      },
      take: limit
    });

    // Get user details
    const userIds = consumers.map(c => c.userId).filter(Boolean);
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    return consumers.map(consumer => ({
      user: userMap.get(consumer.userId) || { id: consumer.userId, name: 'Unknown' },
      calls: consumer._count
    }));
  } catch (error) {
    console.error('Error fetching top consumers:', error);
    return [];
  }
};

/**
 * Generate usage report
 */
const generateUsageReport = async (userId, period = 'month') => {
  const now = new Date();
  let from;

  switch (period) {
    case 'day':
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  const analytics = await getAnalytics(userId, {
    from,
    to: now,
    metrics: ['calls', 'errors', 'duration', 'endpoints', 'performance']
  });

  return {
    period,
    from,
    to: now,
    ...analytics
  };
};

/**
 * Clean up old analytics data
 */
const cleanupOldData = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const deletedCount = await prisma.apiCall.deleteMany({
      where: {
        timestamp: {
          lt: thirtyDaysAgo
        }
      }
    });

    console.log(`Cleaned up ${deletedCount.count} old API call records`);
  } catch (error) {
    console.error('Error cleaning up old analytics data:', error);
  }
};

// Run cleanup daily
setInterval(cleanupOldData, 24 * 60 * 60 * 1000);

/**
 * Export data for external analytics tools
 */
const exportAnalytics = async (userId, format = 'json', from, to) => {
  const analytics = await getAnalytics(userId, {
    from,
    to,
    metrics: ['calls', 'errors', 'endpoints', 'performance']
  });

  switch (format) {
    case 'csv':
      return convertToCSV(analytics);
    case 'json':
    default:
      return analytics;
  }
};

/**
 * Convert analytics data to CSV format
 */
const convertToCSV = (data) => {
  const headers = ['timestamp', 'calls', 'errors', 'avg_duration'];
  const rows = data.calls?.map(call => [
    call.timestamp,
    call._count,
    call.errors || 0,
    call._avg.duration || 0
  ]) || [];

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csv;
};

module.exports = {
  logAPIUsage,
  logAPICall,
  getAnalytics,
  getRealTimeMetrics,
  getEndpointUsage,
  getPerformanceMetrics,
  getErrorAnalysis,
  getTopConsumers,
  generateUsageReport,
  cleanupOldData,
  exportAnalytics
};