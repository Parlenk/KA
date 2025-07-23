/**
 * Database Performance Optimizer
 * Query optimization, indexing, and connection pooling
 */

import { PrismaClient } from '@prisma/client';
import { getCacheService } from './cache';

export interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: number;
  cached: boolean;
  rowsAffected?: number;
}

export interface DatabaseStats {
  activeConnections: number;
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  cacheHitRate: number;
  connectionPoolUtilization: number;
}

export class DatabaseOptimizer {
  private prisma: PrismaClient;
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second
  private maxMetricsHistory = 1000;
  private cacheService = getCacheService();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.setupQueryLogging();
    this.setupIndexOptimization();
  }

  private setupQueryLogging(): void {
    // Add query logging middleware
    this.prisma.$use(async (params, next) => {
      const startTime = performance.now();
      
      try {
        const result = await next(params);
        const duration = performance.now() - startTime;
        
        this.recordQueryMetric({
          query: `${params.model}.${params.action}`,
          duration,
          timestamp: Date.now(),
          cached: false,
          rowsAffected: Array.isArray(result) ? result.length : 1
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        this.recordQueryMetric({
          query: `${params.model}.${params.action}`,
          duration,
          timestamp: Date.now(),
          cached: false
        });
        
        throw error;
      }
    });
  }

  private setupIndexOptimization(): void {
    // This would run database-specific index analysis
    // For now, we'll define the optimal indexes needed
    console.log('Database optimizer initialized with index recommendations');
  }

  /**
   * Optimized user queries with caching
   */
  async findUserById(id: string): Promise<any> {
    return this.cacheService.getOrSet(
      `user:${id}`,
      async () => {
        return this.prisma.user.findUnique({
          where: { id },
          include: {
            projects: {
              select: {
                id: true,
                name: true,
                updatedAt: true,
                thumbnail: true
              },
              orderBy: { updatedAt: 'desc' },
              take: 10 // Only recent projects
            }
          }
        });
      },
      { ttl: 300, tags: ['users', `user:${id}`] }
    );
  }

  /**
   * Optimized project queries with pagination and caching
   */
  async findProjectsByUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
    filters: any = {}
  ): Promise<{ projects: any[]; total: number; hasMore: boolean }> {
    const cacheKey = `user:${userId}:projects:${page}:${limit}:${JSON.stringify(filters)}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;
        
        const where: any = {
          userId,
          ...filters
        };

        const [projects, total] = await Promise.all([
          this.prisma.project.findMany({
            where,
            include: {
              designs: {
                select: {
                  id: true,
                  name: true,
                  thumbnail: true
                },
                take: 1,
                orderBy: { updatedAt: 'desc' }
              },
              _count: {
                select: { designs: true }
              }
            },
            orderBy: { updatedAt: 'desc' },
            skip,
            take: limit
          }),
          this.prisma.project.count({ where })
        ]);

        return {
          projects,
          total,
          hasMore: skip + limit < total
        };
      },
      { ttl: 180, tags: ['projects', `user:${userId}`] }
    );
  }

  /**
   * Optimized design queries with selective loading
   */
  async findDesignById(id: string, includeContent: boolean = false): Promise<any> {
    const cacheKey = `design:${id}:${includeContent ? 'full' : 'meta'}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const select: any = {
          id: true,
          name: true,
          width: true,
          height: true,
          thumbnail: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: {
              id: true,
              name: true,
              userId: true
            }
          }
        };

        if (includeContent) {
          select.content = true;
          select.layers = true;
          select.animations = true;
        }

        return this.prisma.design.findUnique({
          where: { id },
          select
        });
      },
      { 
        ttl: includeContent ? 120 : 300, 
        tags: ['designs', `design:${id}`] 
      }
    );
  }

  /**
   * Optimized template queries with filtering
   */
  async findTemplates(
    category?: string,
    tags?: string[],
    page: number = 1,
    limit: number = 24
  ): Promise<{ templates: any[]; total: number; hasMore: boolean }> {
    const cacheKey = `templates:${category || 'all'}:${tags?.join(',') || 'none'}:${page}:${limit}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;
        
        const where: any = {};
        
        if (category) {
          where.category = category;
        }
        
        if (tags && tags.length > 0) {
          where.tags = {
            hasSome: tags
          };
        }

        const [templates, total] = await Promise.all([
          this.prisma.template.findMany({
            where,
            select: {
              id: true,
              name: true,
              category: true,
              tags: true,
              thumbnail: true,
              previewUrl: true,
              isPremium: true,
              width: true,
              height: true,
              usageCount: true
            },
            orderBy: [
              { featured: 'desc' },
              { usageCount: 'desc' },
              { createdAt: 'desc' }
            ],
            skip,
            take: limit
          }),
          this.prisma.template.count({ where })
        ]);

        return {
          templates,
          total,
          hasMore: skip + limit < total
        };
      },
      { ttl: 600, tags: ['templates'] } // Cache templates longer
    );
  }

  /**
   * Optimized search with full-text search and ranking
   */
  async searchDesigns(
    userId: string,
    query: string,
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ designs: any[]; total: number; hasMore: boolean }> {
    const cacheKey = `search:${userId}:${query}:${JSON.stringify(filters)}:${page}:${limit}`;
    
    return this.cacheService.getOrSet(
      cacheKey,
      async () => {
        const skip = (page - 1) * limit;
        
        // Build search conditions
        const where: any = {
          project: {
            userId
          },
          OR: [
            {
              name: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              description: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              tags: {
                hasSome: query.split(' ')
              }
            }
          ],
          ...filters
        };

        const [designs, total] = await Promise.all([
          this.prisma.design.findMany({
            where,
            include: {
              project: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: [
              { updatedAt: 'desc' }
            ],
            skip,
            take: limit
          }),
          this.prisma.design.count({ where })
        ]);

        return {
          designs,
          total,
          hasMore: skip + limit < total
        };
      },
      { ttl: 120, tags: ['search', `user:${userId}`] }
    );
  }

  /**
   * Batch operations for better performance
   */
  async batchUpdateDesigns(updates: Array<{ id: string; data: any }>): Promise<void> {
    const transaction = await this.prisma.$transaction(
      updates.map(update =>
        this.prisma.design.update({
          where: { id: update.id },
          data: update.data
        })
      )
    );

    // Invalidate cache for updated designs
    for (const update of updates) {
      await this.cacheService.invalidateByTag(`design:${update.id}`);
    }

    return transaction;
  }

  /**
   * Aggregate queries for analytics
   */
  async getAnalytics(userId: string): Promise<any> {
    return this.cacheService.getOrSet(
      `analytics:${userId}`,
      async () => {
        const [
          projectCount,
          designCount,
          recentActivity,
          popularTemplates
        ] = await Promise.all([
          this.prisma.project.count({
            where: { userId }
          }),
          this.prisma.design.count({
            where: {
              project: { userId }
            }
          }),
          this.prisma.design.findMany({
            where: {
              project: { userId }
            },
            select: {
              id: true,
              name: true,
              updatedAt: true,
              project: {
                select: { name: true }
              }
            },
            orderBy: { updatedAt: 'desc' },
            take: 5
          }),
          this.prisma.template.findMany({
            select: {
              id: true,
              name: true,
              category: true,
              usageCount: true
            },
            orderBy: { usageCount: 'desc' },
            take: 10
          })
        ]);

        return {
          projectCount,
          designCount,
          recentActivity,
          popularTemplates
        };
      },
      { ttl: 300, tags: ['analytics', `user:${userId}`] }
    );
  }

  /**
   * Connection pool monitoring
   */
  async getConnectionPoolStats(): Promise<any> {
    // This would integrate with your connection pool library
    // For Prisma, you can monitor through metrics
    return {
      activeConnections: 0, // Would get from pool
      maxConnections: 0,
      queuedQueries: 0,
      utilization: 0
    };
  }

  /**
   * Get database performance statistics
   */
  getStats(): DatabaseStats {
    const recentMetrics = this.queryMetrics.slice(-100);
    const totalQueries = recentMetrics.length;
    const averageQueryTime = totalQueries > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries 
      : 0;
    const slowQueries = recentMetrics.filter(m => m.duration > this.slowQueryThreshold).length;
    const cachedQueries = recentMetrics.filter(m => m.cached).length;
    const cacheHitRate = totalQueries > 0 ? cachedQueries / totalQueries : 0;

    return {
      activeConnections: 0, // Would get from connection pool
      totalQueries,
      averageQueryTime,
      slowQueries,
      cacheHitRate,
      connectionPoolUtilization: 0 // Would calculate from pool stats
    };
  }

  /**
   * Get slow query report
   */
  getSlowQueries(limit: number = 10): QueryMetrics[] {
    return this.queryMetrics
      .filter(m => m.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  /**
   * Optimize database with maintenance tasks
   */
  async runMaintenance(): Promise<void> {
    console.log('Running database maintenance...');
    
    try {
      // This would run database-specific optimization
      // For PostgreSQL: VACUUM, ANALYZE, REINDEX
      // For MongoDB: compact, reIndex
      
      // Clear old metrics
      const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > cutoff);
      
      console.log('Database maintenance completed');
    } catch (error) {
      console.error('Database maintenance failed:', error);
    }
  }

  private recordQueryMetric(metric: QueryMetrics): void {
    this.queryMetrics.push(metric);
    
    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory);
    }
    
    // Log slow queries
    if (metric.duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected: ${metric.query} took ${metric.duration}ms`);
    }
  }

  /**
   * Database health check
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const startTime = performance.now();
    
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = performance.now() - startTime;
      
      return {
        healthy: true,
        latency
      };
    } catch (error) {
      return {
        healthy: false,
        latency: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// SQL optimization queries for different databases
export const optimizationQueries = {
  postgresql: {
    // Create indexes for better performance
    indexes: [
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_user_id_updated_at ON projects(user_id, updated_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_designs_project_id_updated_at ON designs(project_id, updated_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_category_featured ON templates(category, featured DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_designs_name_gin ON designs USING gin(to_tsvector(\'english\', name))',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_designs_tags_gin ON designs USING gin(tags)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assets_user_id_type ON assets(user_id, type, created_at DESC)'
    ],
    
    // Maintenance queries
    maintenance: [
      'VACUUM ANALYZE projects',
      'VACUUM ANALYZE designs',
      'VACUUM ANALYZE templates',
      'VACUUM ANALYZE assets',
      'REINDEX TABLE projects',
      'REINDEX TABLE designs'
    ]
  }
};

export { DatabaseOptimizer };