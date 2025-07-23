/**
 * Performance Monitoring System
 * Tracks canvas performance, memory usage, and optimization metrics
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  objectCount: number;
  visibleObjectCount: number;
  memoryUsage: number;
  canvasSize: { width: number; height: number };
  timestamp: number;
}

export interface PerformanceThresholds {
  minFps: number;
  maxFrameTime: number;
  maxRenderTime: number;
  maxObjectCount: number;
  maxMemoryUsage: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private currentMetrics: Partial<PerformanceMetrics> = {};
  private thresholds: PerformanceThresholds;
  private isMonitoring = false;
  private monitoringInterval?: number;
  
  // Performance tracking
  private frameStartTime = 0;
  private renderStartTime = 0;
  private frameCount = 0;
  private lastSecondTime = 0;
  private currentFps = 0;
  
  // Callbacks for performance events
  private onPerformanceIssue?: (issue: PerformanceIssue) => void;
  private onMetricsUpdate?: (metrics: PerformanceMetrics) => void;

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = {
      minFps: 30,
      maxFrameTime: 33, // 30 FPS = ~33ms per frame
      maxRenderTime: 16, // Target 60 FPS = ~16ms render time
      maxObjectCount: 1000,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      ...thresholds
    };
  }

  /**
   * Start performance monitoring
   */
  public startMonitoring(updateInterval = 1000): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastSecondTime = performance.now();
    
    // Update metrics periodically
    this.monitoringInterval = window.setInterval(() => {
      this.updateMetrics();
    }, updateInterval);
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    console.log('Performance monitoring stopped');
  }

  /**
   * Mark the start of a frame
   */
  public frameStart(): void {
    this.frameStartTime = performance.now();
  }

  /**
   * Mark the end of a frame
   */
  public frameEnd(): void {
    const now = performance.now();
    const frameTime = now - this.frameStartTime;
    
    this.currentMetrics.frameTime = frameTime;
    this.frameCount++;
    
    // Calculate FPS every second
    if (now - this.lastSecondTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastSecondTime = now;
      this.currentMetrics.fps = this.currentFps;
    }
    
    // Check for performance issues
    this.checkPerformanceThresholds();
  }

  /**
   * Mark the start of rendering
   */
  public renderStart(): void {
    this.renderStartTime = performance.now();
  }

  /**
   * Mark the end of rendering
   */
  public renderEnd(): void {
    const renderTime = performance.now() - this.renderStartTime;
    this.currentMetrics.renderTime = renderTime;
  }

  /**
   * Update object count metrics
   */
  public updateObjectCount(total: number, visible: number): void {
    this.currentMetrics.objectCount = total;
    this.currentMetrics.visibleObjectCount = visible;
  }

  /**
   * Update canvas size metrics
   */
  public updateCanvasSize(width: number, height: number): void {
    this.currentMetrics.canvasSize = { width, height };
  }

  /**
   * Get current performance metrics
   */
  public getCurrentMetrics(): PerformanceMetrics | null {
    if (!this.isCompleteMetrics(this.currentMetrics)) {
      return null;
    }
    
    return {
      ...this.currentMetrics as PerformanceMetrics,
      memoryUsage: this.getMemoryUsage(),
      timestamp: Date.now()
    };
  }

  /**
   * Get performance history
   */
  public getMetricsHistory(count = 60): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): PerformanceSummary {
    const recentMetrics = this.getMetricsHistory(30);
    
    if (recentMetrics.length === 0) {
      return {
        avgFps: 0,
        avgFrameTime: 0,
        avgRenderTime: 0,
        avgObjectCount: 0,
        memoryTrend: 'stable',
        overallRating: 'unknown'
      };
    }
    
    const avgFps = recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length;
    const avgFrameTime = recentMetrics.reduce((sum, m) => sum + m.frameTime, 0) / recentMetrics.length;
    const avgRenderTime = recentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentMetrics.length;
    const avgObjectCount = recentMetrics.reduce((sum, m) => sum + m.objectCount, 0) / recentMetrics.length;
    
    // Calculate memory trend
    const memoryTrend = this.calculateMemoryTrend(recentMetrics);
    
    // Calculate overall rating
    const overallRating = this.calculateOverallRating(avgFps, avgFrameTime, avgRenderTime);
    
    return {
      avgFps: Math.round(avgFps),
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      avgObjectCount: Math.round(avgObjectCount),
      memoryTrend,
      overallRating
    };
  }

  /**
   * Set callback for performance issues
   */
  public onPerformanceIssueDetected(callback: (issue: PerformanceIssue) => void): void {
    this.onPerformanceIssue = callback;
  }

  /**
   * Set callback for metrics updates
   */
  public onMetricsUpdated(callback: (metrics: PerformanceMetrics) => void): void {
    this.onMetricsUpdate = callback;
  }

  private updateMetrics(): void {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) return;
    
    this.metrics.push(currentMetrics);
    
    // Keep only last 5 minutes of data (300 seconds)
    if (this.metrics.length > 300) {
      this.metrics = this.metrics.slice(-300);
    }
    
    // Notify listeners
    if (this.onMetricsUpdate) {
      this.onMetricsUpdate(currentMetrics);
    }
  }

  private checkPerformanceThresholds(): void {
    const issues: PerformanceIssue[] = [];
    
    // Check FPS
    if (this.currentMetrics.fps !== undefined && this.currentMetrics.fps < this.thresholds.minFps) {
      issues.push({
        type: 'low_fps',
        severity: 'high',
        message: `FPS dropped to ${this.currentMetrics.fps} (min: ${this.thresholds.minFps})`,
        value: this.currentMetrics.fps,
        threshold: this.thresholds.minFps
      });
    }
    
    // Check frame time
    if (this.currentMetrics.frameTime !== undefined && this.currentMetrics.frameTime > this.thresholds.maxFrameTime) {
      issues.push({
        type: 'high_frame_time',
        severity: 'medium',
        message: `Frame time increased to ${this.currentMetrics.frameTime}ms (max: ${this.thresholds.maxFrameTime}ms)`,
        value: this.currentMetrics.frameTime,
        threshold: this.thresholds.maxFrameTime
      });
    }
    
    // Check render time
    if (this.currentMetrics.renderTime !== undefined && this.currentMetrics.renderTime > this.thresholds.maxRenderTime) {
      issues.push({
        type: 'high_render_time',
        severity: 'medium',
        message: `Render time increased to ${this.currentMetrics.renderTime}ms (max: ${this.thresholds.maxRenderTime}ms)`,
        value: this.currentMetrics.renderTime,
        threshold: this.thresholds.maxRenderTime
      });
    }
    
    // Check object count
    if (this.currentMetrics.objectCount !== undefined && this.currentMetrics.objectCount > this.thresholds.maxObjectCount) {
      issues.push({
        type: 'high_object_count',
        severity: 'low',
        message: `Object count increased to ${this.currentMetrics.objectCount} (max: ${this.thresholds.maxObjectCount})`,
        value: this.currentMetrics.objectCount,
        threshold: this.thresholds.maxObjectCount
      });
    }
    
    // Notify about issues
    if (issues.length > 0 && this.onPerformanceIssue) {
      for (const issue of issues) {
        this.onPerformanceIssue(issue);
      }
    }
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private calculateMemoryTrend(metrics: PerformanceMetrics[]): 'increasing' | 'decreasing' | 'stable' {
    if (metrics.length < 5) return 'stable';
    
    const recent = metrics.slice(-5);
    const firstHalf = recent.slice(0, 2);
    const secondHalf = recent.slice(-2);
    
    const avgFirst = firstHalf.reduce((sum, m) => sum + m.memoryUsage, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, m) => sum + m.memoryUsage, 0) / secondHalf.length;
    
    const difference = avgSecond - avgFirst;
    const threshold = avgFirst * 0.05; // 5% change threshold
    
    if (difference > threshold) return 'increasing';
    if (difference < -threshold) return 'decreasing';
    return 'stable';
  }

  private calculateOverallRating(fps: number, frameTime: number, renderTime: number): PerformanceRating {
    let score = 100;
    
    // FPS penalty
    if (fps < 30) score -= 30;
    else if (fps < 45) score -= 15;
    else if (fps < 55) score -= 5;
    
    // Frame time penalty
    if (frameTime > 50) score -= 20;
    else if (frameTime > 33) score -= 10;
    else if (frameTime > 20) score -= 5;
    
    // Render time penalty
    if (renderTime > 25) score -= 15;
    else if (renderTime > 16) score -= 8;
    else if (renderTime > 10) score -= 3;
    
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }

  private isCompleteMetrics(metrics: Partial<PerformanceMetrics>): metrics is PerformanceMetrics {
    return !!(
      metrics.fps !== undefined &&
      metrics.frameTime !== undefined &&
      metrics.renderTime !== undefined &&
      metrics.objectCount !== undefined &&
      metrics.visibleObjectCount !== undefined &&
      metrics.canvasSize
    );
  }
}

export interface PerformanceIssue {
  type: 'low_fps' | 'high_frame_time' | 'high_render_time' | 'high_object_count' | 'memory_leak';
  severity: 'low' | 'medium' | 'high';
  message: string;
  value: number;
  threshold: number;
}

export interface PerformanceSummary {
  avgFps: number;
  avgFrameTime: number;
  avgRenderTime: number;
  avgObjectCount: number;
  memoryTrend: 'increasing' | 'decreasing' | 'stable';
  overallRating: PerformanceRating;
}

export type PerformanceRating = 'excellent' | 'good' | 'fair' | 'poor' | 'critical' | 'unknown';

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();