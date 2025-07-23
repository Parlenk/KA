/**
 * Uptime Monitoring Service
 * Comprehensive health checks and external monitoring
 */

interface HealthCheck {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'HEAD';
  timeout: number;
  expectedStatus: number;
  headers?: Record<string, string>;
  body?: string;
  critical: boolean;
}

interface MonitoringResult {
  timestamp: Date;
  checks: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    error?: string;
  }>;
  overallStatus: 'healthy' | 'degraded' | 'down';
  uptime: number;
}

export class UptimeMonitor {
  private checks: HealthCheck[];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private results: MonitoringResult[] = [];
  private maxResults = 1000; // Keep last 1000 results

  constructor() {
    this.checks = [
      {
        name: 'Frontend',
        url: 'http://localhost/health',
        method: 'GET',
        timeout: 5000,
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Backend API',
        url: 'http://localhost/api/v1/health',
        method: 'GET',
        timeout: 5000,
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'AI Services',
        url: 'http://localhost/api/v1/ai/health',
        method: 'GET',
        timeout: 10000,
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Authentication',
        url: 'http://localhost/api/v1/auth/status',
        method: 'GET',
        timeout: 5000,
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Design Editor',
        url: 'http://localhost/editor',
        method: 'GET',
        timeout: 5000,
        expectedStatus: 200,
        critical: false
      },
      {
        name: 'Template Library',
        url: 'http://localhost/api/v1/templates',
        method: 'GET',
        timeout: 5000,
        expectedStatus: 200,
        critical: false
      },
      {
        name: 'Export Service',
        url: 'http://localhost/api/v1/export/status',
        method: 'GET',
        timeout: 5000,
        expectedStatus: 200,
        critical: false
      },
      {
        name: 'Database Connectivity',
        url: 'http://localhost/api/v1/health/db',
        method: 'GET',
        timeout: 3000,
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Cache Connectivity',
        url: 'http://localhost/api/v1/health/cache',
        method: 'GET',
        timeout: 3000,
        expectedStatus: 200,
        critical: true
      },
      {
        name: 'Queue System',
        url: 'http://localhost/api/v1/health/queue',
        method: 'GET',
        timeout: 3000,
        expectedStatus: 200,
        critical: false
      }
    ];
  }

  /**
   * Start monitoring
   */
  start(intervalMs: number = 30000): void {
    console.log('Starting uptime monitoring...');
    
    // Initial check
    this.performChecks();
    
    // Schedule recurring checks
    this.monitoringInterval = setInterval(() => {
      this.performChecks();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Uptime monitoring stopped');
    }
  }

  /**
   * Perform all health checks
   */
  private async performChecks(): Promise<MonitoringResult> {
    const startTime = Date.now();
    const checkResults = await Promise.all(
      this.checks.map(check => this.performSingleCheck(check))
    );

    const result: MonitoringResult = {
      timestamp: new Date(),
      checks: checkResults,
      overallStatus: this.calculateOverallStatus(checkResults),
      uptime: this.calculateUptime()
    };

    this.results.push(result);
    
    // Keep only the last N results
    if (this.results.length > this.maxResults) {
      this.results.shift();
    }

    // Log critical issues
    const failedCritical = checkResults.filter(r => r.status === 'down' && 
      this.checks.find(c => c.name === r.name)?.critical);
    
    if (failedCritical.length > 0) {
      console.error('CRITICAL: Health checks failed:', failedCritical.map(r => r.name));
      this.alertCriticalFailure(failedCritical);
    }

    const totalTime = Date.now() - startTime;
    console.log(`Health checks completed in ${totalTime}ms - Status: ${result.overallStatus}`);

    return result;
  }

  /**
   * Perform a single health check
   */
  private async performSingleCheck(check: HealthCheck): Promise<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), check.timeout);

      const response = await fetch(check.url, {
        method: check.method,
        headers: check.headers || {},
        body: check.body,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.status === check.expectedStatus) {
        return {
          name: check.name,
          status: responseTime > 5000 ? 'degraded' : 'up',
          responseTime
        };
      } else {
        return {
          name: check.name,
          status: 'down',
          responseTime,
          error: `Unexpected status: ${response.status}`
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        name: check.name,
        status: 'down',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate overall system status
   */
  private calculateOverallStatus(checks: Array<{ name: string; status: string }>): 'healthy' | 'degraded' | 'down' {
    const criticalChecks = checks.filter(check => 
      this.checks.find(c => c.name === check.name)?.critical
    );

    const downCritical = criticalChecks.filter(check => check.status === 'down');
    const degradedCritical = criticalChecks.filter(check => check.status === 'degraded');

    if (downCritical.length > 0) {
      return 'down';
    } else if (degradedCritical.length > 0 || checks.some(c => c.status === 'down')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Calculate system uptime percentage
   */
  private calculateUptime(): number {
    if (this.results.length === 0) return 100;

    const healthyResults = this.results.filter(r => r.overallStatus === 'healthy').length;
    return (healthyResults / this.results.length) * 100;
  }

  /**
   * Alert on critical failures
   */
  private async alertCriticalFailure(failedChecks: Array<{ name: string; error?: string }>): Promise<void> {
    const alertData = {
      timestamp: new Date().toISOString(),
      severity: 'critical',
      message: 'Critical health checks failed',
      failedServices: failedChecks.map(check => ({
        name: check.name,
        error: check.error
      }))
    };

    // Send to monitoring webhook
    try {
      await fetch('http://localhost:9093/api/v1/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{
          labels: {
            alertname: 'CriticalHealthCheckFailure',
            severity: 'critical',
            service: failedChecks.map(c => c.name).join(',')
          },
          annotations: {
            summary: 'Critical services are down',
            description: `The following critical services failed health checks: ${failedChecks.map(c => c.name).join(', ')}`
          },
          startsAt: new Date().toISOString()
        }])
      });
    } catch (error) {
      console.error('Failed to send alert:', error);
    }

    // Log to file for backup
    console.error('CRITICAL ALERT:', JSON.stringify(alertData, null, 2));
  }

  /**
   * Get current status
   */
  getStatus(): MonitoringResult | null {
    return this.results[this.results.length - 1] || null;
  }

  /**
   * Get historical data
   */
  getHistory(hours: number = 24): MonitoringResult[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.results.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Get uptime statistics
   */
  getUptimeStats(hours: number = 24): {
    uptime: number;
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    downChecks: number;
    averageResponseTime: number;
  } {
    const history = this.getHistory(hours);
    
    if (history.length === 0) {
      return {
        uptime: 100,
        totalChecks: 0,
        healthyChecks: 0,
        degradedChecks: 0,
        downChecks: 0,
        averageResponseTime: 0
      };
    }

    const healthyChecks = history.filter(r => r.overallStatus === 'healthy').length;
    const degradedChecks = history.filter(r => r.overallStatus === 'degraded').length;
    const downChecks = history.filter(r => r.overallStatus === 'down').length;

    // Calculate average response time across all checks
    const allChecks = history.flatMap(r => r.checks);
    const averageResponseTime = allChecks.reduce((sum, check) => sum + check.responseTime, 0) / allChecks.length;

    return {
      uptime: (healthyChecks / history.length) * 100,
      totalChecks: history.length,
      healthyChecks,
      degradedChecks,
      downChecks,
      averageResponseTime
    };
  }

  /**
   * Generate status page data
   */
  generateStatusPage(): {
    overall: {
      status: string;
      uptime: number;
      lastUpdated: string;
    };
    services: Array<{
      name: string;
      status: string;
      uptime: number;
      averageResponseTime: number;
      lastCheck: string;
    }>;
    incidents: Array<{
      date: string;
      title: string;
      description: string;
      status: string;
    }>;
  } {
    const currentStatus = this.getStatus();
    const history24h = this.getHistory(24);
    
    if (!currentStatus) {
      return {
        overall: {
          status: 'unknown',
          uptime: 0,
          lastUpdated: new Date().toISOString()
        },
        services: [],
        incidents: []
      };
    }

    // Calculate per-service statistics
    const services = this.checks.map(check => {
      const serviceHistory = history24h.map(h => 
        h.checks.find(c => c.name === check.name)
      ).filter(Boolean);

      const upChecks = serviceHistory.filter(c => c!.status === 'up').length;
      const uptime = serviceHistory.length > 0 ? (upChecks / serviceHistory.length) * 100 : 100;
      
      const avgResponseTime = serviceHistory.length > 0 
        ? serviceHistory.reduce((sum, c) => sum + c!.responseTime, 0) / serviceHistory.length
        : 0;

      const currentCheck = currentStatus.checks.find(c => c.name === check.name);

      return {
        name: check.name,
        status: currentCheck?.status || 'unknown',
        uptime,
        averageResponseTime: Math.round(avgResponseTime),
        lastCheck: currentStatus.timestamp.toISOString()
      };
    });

    // Find recent incidents (services down for more than 5 minutes)
    const incidents = this.findRecentIncidents(history24h);

    return {
      overall: {
        status: currentStatus.overallStatus,
        uptime: Math.round(currentStatus.uptime * 100) / 100,
        lastUpdated: currentStatus.timestamp.toISOString()
      },
      services,
      incidents
    };
  }

  /**
   * Find recent incidents
   */
  private findRecentIncidents(history: MonitoringResult[]): Array<{
    date: string;
    title: string;
    description: string;
    status: string;
  }> {
    const incidents: Array<{
      date: string;
      title: string;
      description: string;
      status: string;
    }> = [];

    // Group consecutive down periods
    let currentIncident: any = null;

    for (const result of history) {
      const downServices = result.checks.filter(c => c.status === 'down');
      
      if (downServices.length > 0) {
        if (!currentIncident) {
          currentIncident = {
            startTime: result.timestamp,
            services: new Set(downServices.map(s => s.name)),
            ongoing: true
          };
        } else {
          downServices.forEach(s => currentIncident.services.add(s.name));
        }
      } else if (currentIncident && currentIncident.ongoing) {
        // Incident resolved
        currentIncident.endTime = result.timestamp;
        currentIncident.ongoing = false;
        
        const duration = Math.round((currentIncident.endTime - currentIncident.startTime) / 60000); // minutes
        
        if (duration >= 5) { // Only record incidents longer than 5 minutes
          incidents.push({
            date: currentIncident.startTime.toISOString(),
            title: `Service disruption affecting ${Array.from(currentIncident.services).join(', ')}`,
            description: `Services were unavailable for ${duration} minutes`,
            status: 'resolved'
          });
        }
        
        currentIncident = null;
      }
    }

    // Handle ongoing incidents
    if (currentIncident && currentIncident.ongoing) {
      const duration = Math.round((Date.now() - currentIncident.startTime.getTime()) / 60000);
      
      incidents.push({
        date: currentIncident.startTime.toISOString(),
        title: `Ongoing service disruption affecting ${Array.from(currentIncident.services).join(', ')}`,
        description: `Services have been unavailable for ${duration} minutes`,
        status: 'investigating'
      });
    }

    return incidents.slice(-10); // Return last 10 incidents
  }
}

// Singleton instance
export const uptimeMonitor = new UptimeMonitor();