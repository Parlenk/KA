import api from './api';

// Performance Monitoring Types
export interface PerformanceMetrics {
  id: string;
  session_id: string;
  user_id: string;
  timestamp: string;
  page_url: string;
  metrics: {
    // Core Web Vitals
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    fcp: number; // First Contentful Paint
    ttfb: number; // Time to First Byte
    
    // Custom metrics
    design_load_time: number;
    canvas_render_time: number;
    export_processing_time: number;
    collaboration_latency: number;
    ai_response_time: number;
    
    // Resource metrics
    memory_usage: number;
    cpu_usage: number;
    bundle_size: number;
    image_load_time: number;
    api_response_time: number;
  };
  device_info: {
    user_agent: string;
    screen_resolution: string;
    device_type: 'desktop' | 'tablet' | 'mobile';
    connection_type: string;
    browser: string;
    os: string;
  };
  errors: PerformanceError[];
}

export interface PerformanceError {
  id: string;
  timestamp: string;
  type: 'javascript' | 'network' | 'resource' | 'security';
  message: string;
  stack?: string;
  url?: string;
  line_number?: number;
  column_number?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_agent: string;
  page_url: string;
}

export interface PerformanceAlert {
  id: string;
  metric: string;
  threshold: number;
  current_value: number;
  severity: 'warning' | 'critical';
  description: string;
  recommendation: string;
  created_at: string;
}

export interface PerformanceReport {
  timeframe: string;
  summary: {
    total_sessions: number;
    average_load_time: number;
    error_rate: number;
    user_satisfaction_score: number;
    core_web_vitals_score: number;
  };
  trends: {
    load_times: Array<{ date: string; value: number }>;
    error_rates: Array<{ date: string; value: number }>;
    user_counts: Array<{ date: string; value: number }>;
  };
  top_issues: Array<{
    issue: string;
    frequency: number;
    impact_score: number;
    affected_users: number;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    estimated_impact: string;
    implementation_effort: 'easy' | 'medium' | 'complex';
  }>;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'bundle' | 'image' | 'api' | 'memory' | 'rendering';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimated_improvement: string;
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    estimated_time: string;
    steps: string[];
    code_examples?: string[];
  };
  metrics_impact: {
    lcp_improvement?: number;
    fid_improvement?: number;
    cls_improvement?: number;
    memory_reduction?: number;
  };
}

export interface ResourceUsage {
  timestamp: string;
  memory: {
    used_heap_size: number;
    total_heap_size: number;
    heap_size_limit: number;
    memory_leaks: Array<{
      component: string;
      size: number;
      retention_count: number;
    }>;
  };
  cpu: {
    usage_percentage: number;
    main_thread_blocking: number;
    long_tasks: Array<{
      duration: number;
    timestamp: string;
      source: string;
    }>;
  };
  network: {
    active_requests: number;
    bandwidth_usage: number;
    failed_requests: number;
    slow_requests: Array<{
      url: string;
      duration: number;
      size: number;
    }>;
  };
}

class PerformanceService {
  private metricsBuffer: PerformanceMetrics[] = [];
  private performanceObserver: PerformanceObserver | null = null;
  private resourceObserver: PerformanceObserver | null = null;
  private isMonitoring = false;

  // Initialize performance monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.initializeWebVitals();
    this.initializeResourceObserver();
    this.setupErrorHandling();
    this.scheduleMetricsCollection();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    this.performanceObserver?.disconnect();
    this.resourceObserver?.disconnect();
  }

  // Core Web Vitals monitoring
  private initializeWebVitals(): void {
    // LCP (Largest Contentful Paint)
    this.observeMetric('largest-contentful-paint', (entries) => {
      const lcp = entries[entries.length - 1];
      this.recordMetric('lcp', lcp.startTime);
    });

    // FID (First Input Delay)
    this.observeMetric('first-input', (entries) => {
      const fid = entries[0];
      this.recordMetric('fid', fid.processingStart - fid.startTime);
    });

    // CLS (Cumulative Layout Shift)
    this.observeMetric('layout-shift', (entries) => {
      let cls = 0;
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      });
      this.recordMetric('cls', cls);
    });

    // FCP (First Contentful Paint)
    this.observeMetric('paint', (entries) => {
      const fcp = entries.find(entry => entry.name === 'first-contentful-paint');
      if (fcp) {
        this.recordMetric('fcp', fcp.startTime);
      }
    });
  }

  private observeMetric(type: string, callback: (entries: any[]) => void): void {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ entryTypes: [type] });
    } catch (error) {
      console.warn(`Performance observer not supported for ${type}:`, error);
    }
  }

  // Resource performance monitoring
  private initializeResourceObserver(): void {
    this.resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'resource') {
          this.analyzeResourcePerformance(entry as PerformanceResourceTiming);
        }
      });
    });

    this.resourceObserver.observe({ entryTypes: ['resource', 'navigation'] });
  }

  private analyzeResourcePerformance(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.startTime;
    const size = entry.transferSize || 0;

    // Flag slow resources
    if (duration > 1000) { // > 1 second
      this.recordPerformanceIssue({
        type: 'slow_resource',
        url: entry.name,
        duration,
        size,
        severity: duration > 3000 ? 'high' : 'medium'
      });
    }

    // Flag large resources
    if (size > 1024 * 1024) { // > 1MB
      this.recordPerformanceIssue({
        type: 'large_resource',
        url: entry.name,
        duration,
        size,
        severity: size > 5 * 1024 * 1024 ? 'high' : 'medium'
      });
    }
  }

  // Memory monitoring
  measureMemoryUsage(): ResourceUsage['memory'] | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used_heap_size: memory.usedJSHeapSize,
        total_heap_size: memory.totalJSHeapSize,
        heap_size_limit: memory.jsHeapSizeLimit,
        memory_leaks: [] // Would be populated by memory leak detection
      };
    }
    return null;
  }

  // Custom metric recording
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric = {
      name,
      value,
      timestamp: Date.now(),
      tags: tags || {}
    };

    // Send to analytics immediately for critical metrics
    if (['lcp', 'fid', 'cls'].includes(name)) {
      this.sendMetricToAnalytics(metric);
    }

    // Buffer for batch sending
    this.metricsBuffer.push(metric as any);
  }

  // Canvas performance monitoring
  measureCanvasPerformance(canvasElement: HTMLCanvasElement): {
    render_time: number;
    frame_rate: number;
    memory_usage: number;
  } {
    const startTime = performance.now();
    
    // Measure render time
    const renderTime = performance.now() - startTime;
    
    // Estimate frame rate based on render time
    const frameRate = renderTime > 0 ? 1000 / renderTime : 60;
    
    // Estimate canvas memory usage
    const { width, height } = canvasElement;
    const pixelCount = width * height;
    const bytesPerPixel = 4; // RGBA
    const memoryUsage = pixelCount * bytesPerPixel;

    return {
      render_time: renderTime,
      frame_rate: Math.min(frameRate, 60),
      memory_usage: memoryUsage
    };
  }

  // API performance monitoring
  measureApiCall<T>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: string = 'GET'
  ): Promise<T> {
    const startTime = performance.now();
    
    return apiCall().then(
      (result) => {
        const duration = performance.now() - startTime;
        this.recordMetric('api_response_time', duration, {
          endpoint,
          method,
          status: 'success'
        });
        
        // Flag slow API calls
        if (duration > 2000) {
          this.recordPerformanceIssue({
            type: 'slow_api',
            url: endpoint,
            duration,
            severity: duration > 5000 ? 'high' : 'medium'
          });
        }
        
        return result;
      },
      (error) => {
        const duration = performance.now() - startTime;
        this.recordMetric('api_response_time', duration, {
          endpoint,
          method,
          status: 'error'
        });
        
        this.recordPerformanceIssue({
          type: 'api_error',
          url: endpoint,
          duration,
          error: error.message,
          severity: 'high'
        });
        
        throw error;
      }
    );
  }

  // Error handling setup
  private setupErrorHandling(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        line_number: event.lineno,
        column_number: event.colno,
        stack: event.error?.stack,
        severity: 'high'
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError({
        type: 'javascript',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        severity: 'high'
      });
    });

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.recordError({
          type: 'resource',
          message: `Failed to load resource: ${(event.target as any)?.src || 'unknown'}`,
          url: (event.target as any)?.src,
          severity: 'medium'
        });
      }
    }, true);
  }

  private recordError(error: Partial<PerformanceError>): void {
    const fullError: PerformanceError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: error.type || 'javascript',
      message: error.message || 'Unknown error',
      stack: error.stack,
      url: error.url || window.location.href,
      line_number: error.line_number,
      column_number: error.column_number,
      severity: error.severity || 'medium',
      user_agent: navigator.userAgent,
      page_url: window.location.href
    };

    // Send critical errors immediately
    if (fullError.severity === 'critical' || fullError.severity === 'high') {
      this.sendErrorToServer(fullError);
    }
  }

  private recordPerformanceIssue(issue: any): void {
    console.warn('Performance issue detected:', issue);
    // Could trigger alerts or automatic optimizations
  }

  // Server communication
  private async sendMetricToAnalytics(metric: any): Promise<void> {
    try {
      await api.post('/analytics/metrics', metric);
    } catch (error) {
      console.error('Failed to send metric:', error);
    }
  }

  private async sendErrorToServer(error: PerformanceError): Promise<void> {
    try {
      await api.post('/analytics/errors', error);
    } catch (err) {
      console.error('Failed to send error to server:', err);
    }
  }

  private scheduleMetricsCollection(): void {
    setInterval(() => {
      if (this.metricsBuffer.length > 0) {
        this.flushMetrics();
      }
    }, 10000); // Send metrics every 10 seconds
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await api.post('/analytics/metrics/batch', { metrics });
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-add metrics to buffer for retry
      this.metricsBuffer.unshift(...metrics);
    }
  }

  // API endpoints
  async getPerformanceReport(timeframe: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<PerformanceReport> {
    const response = await api.get('/analytics/performance/report', {
      params: { timeframe }
    });
    return response.data.data;
  }

  async getResourceUsage(): Promise<ResourceUsage> {
    const response = await api.get('/analytics/performance/resources');
    return response.data.data;
  }

  async getOptimizationSuggestions(): Promise<OptimizationSuggestion[]> {
    const response = await api.get('/analytics/performance/suggestions');
    return response.data.data;
  }

  async getPerformanceAlerts(): Promise<PerformanceAlert[]> {
    const response = await api.get('/analytics/performance/alerts');
    return response.data.data;
  }

  async runPerformanceAudit(): Promise<{
    score: number;
    audits: Array<{
      id: string;
      title: string;
      score: number;
      description: string;
      details: any;
    }>;
  }> {
    const response = await api.post('/analytics/performance/audit');
    return response.data.data;
  }

  // Performance optimization utilities
  optimizeImages(images: HTMLImageElement[]): void {
    images.forEach(img => {
      // Add lazy loading
      if ('loading' in img) {
        img.loading = 'lazy';
      }
      
      // Add decoding hint
      img.decoding = 'async';
    });
  }

  preloadCriticalResources(urls: string[]): void {
    urls.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = this.getResourceType(url);
      document.head.appendChild(link);
    });
  }

  private getResourceType(url: string): string {
    if (url.match(/\.(js)$/)) return 'script';
    if (url.match(/\.(css)$/)) return 'style';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    return 'fetch';
  }

  // Bundle analysis
  analyzeBundleSize(): Promise<{
    total_size: number;
    chunks: Array<{
      name: string;
      size: number;
      percentage: number;
    }>;
    suggestions: string[];
  }> {
    return this.measureApiCall(
      () => api.get('/analytics/performance/bundle-analysis'),
      '/analytics/performance/bundle-analysis'
    ).then(response => response.data.data);
  }
}

// Performance utilities
export const performanceUtils = {
  // Debounce function calls for performance
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function calls
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Lazy load component
  lazyLoad<T>(importFunction: () => Promise<{ default: T }>): React.LazyExoticComponent<T> {
    return React.lazy(importFunction);
  },

  // Measure component render time
  measureRender(componentName: string, renderFunction: () => void): void {
    const startTime = performance.now();
    renderFunction();
    const endTime = performance.now();
    console.log(`${componentName} render time: ${endTime - startTime}ms`);
  },

  // Virtual scrolling helper
  calculateVisibleRange(
    containerHeight: number,
    itemHeight: number,
    scrollTop: number,
    overscan: number = 5
  ): { start: number; end: number } {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount + overscan * 2;
    
    return { start, end };
  },

  // Memory leak detector
  detectMemoryLeaks(): Array<{ component: string; instances: number }> {
    const leaks: Array<{ component: string; instances: number }> = [];
    
    // Check for DOM nodes that should have been cleaned up
    const allElements = document.querySelectorAll('*');
    const componentCounts: Record<string, number> = {};
    
    allElements.forEach(element => {
      const componentName = element.getAttribute('data-component');
      if (componentName) {
        componentCounts[componentName] = (componentCounts[componentName] || 0) + 1;
      }
    });
    
    // Flag components with unusually high instance counts
    Object.entries(componentCounts).forEach(([component, count]) => {
      if (count > 100) { // Threshold for potential leak
        leaks.push({ component, instances: count });
      }
    });
    
    return leaks;
  }
};

// Export singleton instance
export const performanceService = new PerformanceService();
export default performanceService;