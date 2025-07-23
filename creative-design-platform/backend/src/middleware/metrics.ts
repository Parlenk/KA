/**
 * Prometheus Metrics Collection Middleware
 * Application performance and business metrics tracking
 */

import { Request, Response, NextFunction } from 'express';
import promClient from 'prom-client';

// Initialize Prometheus registry
const register = new promClient.Registry();

// Add default Node.js metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'creative_platform_',
});

/**
 * HTTP Request Metrics
 */
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  registers: [register]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestSize = new promClient.Histogram({
  name: 'http_request_size_bytes',
  help: 'Size of HTTP requests in bytes',
  labelNames: ['method', 'route'],
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000],
  registers: [register]
});

/**
 * Database Metrics
 */
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
});

const dbConnectionsActive = new promClient.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database'],
  registers: [register]
});

const dbQueriesTotal = new promClient.Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register]
});

/**
 * Queue Metrics
 */
const queuePendingJobs = new promClient.Gauge({
  name: 'queue_pending_jobs',
  help: 'Number of jobs pending in queue',
  labelNames: ['queue_name'],
  registers: [register]
});

const queueProcessedJobsTotal = new promClient.Counter({
  name: 'queue_processed_jobs_total',
  help: 'Total number of processed queue jobs',
  labelNames: ['queue_name', 'status'],
  registers: [register]
});

const queueJobDuration = new promClient.Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Duration of queue job processing in seconds',
  labelNames: ['queue_name', 'job_type'],
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800],
  registers: [register]
});

/**
 * AI Service Metrics
 */
const aiRequestsTotal = new promClient.Counter({
  name: 'ai_requests_total',
  help: 'Total number of AI service requests',
  labelNames: ['service', 'operation'],
  registers: [register]
});

const aiRequestsFailedTotal = new promClient.Counter({
  name: 'ai_requests_failed_total',
  help: 'Total number of failed AI service requests',
  labelNames: ['service', 'operation', 'error_type'],
  registers: [register]
});

const aiRequestDuration = new promClient.Histogram({
  name: 'ai_request_duration_seconds',
  help: 'Duration of AI service requests in seconds',
  labelNames: ['service', 'operation'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register]
});

/**
 * Business Metrics
 */
const activeUsersCount = new promClient.Gauge({
  name: 'active_users_count',
  help: 'Number of active users',
  registers: [register]
});

const userRegistrationsTotal = new promClient.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  registers: [register]
});

const designsCreatedTotal = new promClient.Counter({
  name: 'designs_created_total',
  help: 'Total number of designs created',
  labelNames: ['template_id', 'user_type'],
  registers: [register]
});

const exportsTotal = new promClient.Counter({
  name: 'exports_total',
  help: 'Total number of design exports',
  labelNames: ['format', 'size_category'],
  registers: [register]
});

const exportJobsTotal = new promClient.Counter({
  name: 'export_jobs_total',
  help: 'Total number of export jobs',
  labelNames: ['status'],
  registers: [register]
});

const exportJobsFailedTotal = new promClient.Counter({
  name: 'export_jobs_failed_total',
  help: 'Total number of failed export jobs',
  labelNames: ['error_type'],
  registers: [register]
});

/**
 * Authentication Metrics
 */
const authLoginAttemptsTotal = new promClient.Counter({
  name: 'auth_login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['status'],
  registers: [register]
});

const authLoginFailuresTotal = new promClient.Counter({
  name: 'auth_login_failures_total',
  help: 'Total number of failed login attempts',
  labelNames: ['reason'],
  registers: [register]
});

/**
 * Middleware for HTTP request metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Track request size
  const requestSize = parseInt(req.get('content-length') || '0', 10);
  httpRequestSize.observe(
    { method: req.method, route: req.route?.path || req.path },
    requestSize
  );

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    // Record metrics
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode.toString() },
      duration
    );
    
    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode.toString()
    });

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Business metrics helpers
 */
export const trackUserRegistration = () => {
  userRegistrationsTotal.inc();
};

export const trackDesignCreation = (templateId: string, userType: 'free' | 'premium') => {
  designsCreatedTotal.inc({ template_id: templateId, user_type: userType });
};

export const trackExport = (format: string, sizeCategory: 'small' | 'medium' | 'large') => {
  exportsTotal.inc({ format, size_category: sizeCategory });
};

export const trackExportJob = (status: 'success' | 'failed') => {
  exportJobsTotal.inc({ status });
};

export const trackExportJobFailure = (errorType: string) => {
  exportJobsFailedTotal.inc({ error_type: errorType });
};

export const trackLoginAttempt = (status: 'success' | 'failed') => {
  authLoginAttemptsTotal.inc({ status });
};

export const trackLoginFailure = (reason: string) => {
  authLoginFailuresTotal.inc({ reason });
};

export const updateActiveUsers = (count: number) => {
  activeUsersCount.set(count);
};

/**
 * Database metrics helpers
 */
export const trackDatabaseQuery = (
  operation: string,
  table: string,
  duration: number,
  status: 'success' | 'error'
) => {
  dbQueryDuration.observe({ operation, table }, duration / 1000);
  dbQueriesTotal.inc({ operation, table, status });
};

export const updateDatabaseConnections = (database: string, count: number) => {
  dbConnectionsActive.set({ database }, count);
};

/**
 * Queue metrics helpers
 */
export const updateQueuePendingJobs = (queueName: string, count: number) => {
  queuePendingJobs.set({ queue_name: queueName }, count);
};

export const trackQueueJobProcessed = (
  queueName: string,
  status: 'completed' | 'failed',
  duration: number
) => {
  queueProcessedJobsTotal.inc({ queue_name: queueName, status });
  queueJobDuration.observe({ queue_name: queueName, job_type: 'generic' }, duration / 1000);
};

/**
 * AI service metrics helpers
 */
export const trackAIRequest = (
  service: string,
  operation: string,
  duration: number,
  success: boolean,
  errorType?: string
) => {
  aiRequestsTotal.inc({ service, operation });
  aiRequestDuration.observe({ service, operation }, duration / 1000);
  
  if (!success && errorType) {
    aiRequestsFailedTotal.inc({ service, operation, error_type: errorType });
  }
};

/**
 * Metrics endpoint
 */
export const getMetrics = async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
};

/**
 * Business metrics endpoint
 */
export const getBusinessMetrics = async (req: Request, res: Response) => {
  try {
    // Collect current business metrics
    const businessMetrics = {
      timestamp: new Date().toISOString(),
      active_users: await getActiveUsersCount(),
      total_designs: await getTotalDesignsCount(),
      total_exports: await getTotalExportsCount(),
      ai_usage: await getAIUsageStats(),
      queue_status: await getQueueStatus()
    };

    res.json(businessMetrics);
  } catch (error) {
    console.error('Error collecting business metrics:', error);
    res.status(500).json({ error: 'Failed to collect business metrics' });
  }
};

// Helper functions for business metrics
async function getActiveUsersCount(): Promise<number> {
  // Implementation would query your database for active users
  // This is a placeholder
  return 0;
}

async function getTotalDesignsCount(): Promise<number> {
  // Implementation would query your database for total designs
  return 0;
}

async function getTotalExportsCount(): Promise<number> {
  // Implementation would query your database for total exports
  return 0;
}

async function getAIUsageStats(): Promise<any> {
  // Implementation would collect AI usage statistics
  return {};
}

async function getQueueStatus(): Promise<any> {
  // Implementation would collect queue status
  return {};
}

/**
 * Health check with metrics
 */
export const healthCheck = (req: Request, res: Response) => {
  const healthMetrics = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };

  res.json(healthMetrics);
};

// Export all metrics for external use
export const metrics = {
  httpRequestDuration,
  httpRequestsTotal,
  httpRequestSize,
  dbQueryDuration,
  dbConnectionsActive,
  dbQueriesTotal,
  queuePendingJobs,
  queueProcessedJobsTotal,
  queueJobDuration,
  aiRequestsTotal,
  aiRequestsFailedTotal,
  aiRequestDuration,
  activeUsersCount,
  userRegistrationsTotal,
  designsCreatedTotal,
  exportsTotal,
  exportJobsTotal,
  exportJobsFailedTotal,
  authLoginAttemptsTotal,
  authLoginFailuresTotal,
  register
};