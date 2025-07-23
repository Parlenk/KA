/**
 * Canvas Performance Optimizer
 * Manages rendering strategies and performance optimizations
 */

import { WebGLCanvasRenderer, RenderObject } from './webgl-renderer';
import { performanceMonitor, PerformanceIssue } from '../performance/monitor';

export interface OptimizationSettings {
  enableWebGL: boolean;
  enableObjectCulling: boolean;
  enableLevelOfDetail: boolean;
  enableRenderCaching: boolean;
  maxObjectsPerFrame: number;
  lodDistanceThreshold: number;
  renderQuality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface RenderCache {
  key: string;
  imageData: ImageData;
  lastUsed: number;
  hitCount: number;
}

export class CanvasOptimizer {
  private canvas: HTMLCanvasElement;
  private context2D: CanvasRenderingContext2D;
  private webglRenderer: WebGLCanvasRenderer | null = null;
  private settings: OptimizationSettings;
  
  // Performance optimization state
  private useWebGL = false;
  private renderMode: 'canvas2d' | 'webgl' = 'canvas2d';
  private isOptimizing = false;
  
  // Caching system
  private renderCache = new Map<string, RenderCache>();
  private maxCacheSize = 50;
  private cacheHits = 0;
  private cacheMisses = 0;
  
  // Level of Detail (LOD) system
  private lodLevels = new Map<string, RenderObject[]>();
  
  // Object pooling
  private objectPool: RenderObject[] = [];
  private poolIndex = 0;

  constructor(canvas: HTMLCanvasElement, settings: Partial<OptimizationSettings> = {}) {
    this.canvas = canvas;
    
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Cannot get 2D context from canvas');
    }
    this.context2D = context;
    
    this.settings = {
      enableWebGL: true,
      enableObjectCulling: true,
      enableLevelOfDetail: true,
      enableRenderCaching: true,
      maxObjectsPerFrame: 1000,
      lodDistanceThreshold: 0.5,
      renderQuality: 'high',
      ...settings
    };
    
    this.initializeOptimizer();
  }

  private initializeOptimizer(): void {
    // Try to initialize WebGL if enabled
    if (this.settings.enableWebGL) {
      try {
        this.webglRenderer = new WebGLCanvasRenderer(this.canvas);
        this.useWebGL = true;
        this.renderMode = 'webgl';
        console.log('WebGL renderer initialized successfully');
      } catch (error) {
        console.warn('WebGL initialization failed, falling back to Canvas2D:', error);
        this.useWebGL = false;
        this.renderMode = 'canvas2d';
      }
    }
    
    // Setup performance monitoring
    this.setupPerformanceMonitoring();
    
    // Setup automatic optimization
    this.setupAutoOptimization();
  }

  private setupPerformanceMonitoring(): void {
    performanceMonitor.onPerformanceIssueDetected((issue: PerformanceIssue) => {
      this.handlePerformanceIssue(issue);
    });
    
    performanceMonitor.startMonitoring(1000);
  }

  private setupAutoOptimization(): void {
    // Check performance every 5 seconds and adjust settings
    setInterval(() => {
      this.optimizeBasedOnPerformance();
    }, 5000);
  }

  /**
   * Main render method with optimization
   */
  public render(objects: RenderObject[], camera: { x: number; y: number; zoom: number }): void {
    performanceMonitor.frameStart();
    
    try {
      // Update performance metrics
      performanceMonitor.updateObjectCount(objects.length, objects.filter(o => o.visible).length);
      performanceMonitor.updateCanvasSize(this.canvas.width, this.canvas.height);
      
      // Apply optimizations
      const optimizedObjects = this.applyOptimizations(objects, camera);
      
      performanceMonitor.renderStart();
      
      if (this.useWebGL && this.webglRenderer) {
        this.renderWithWebGL(optimizedObjects, camera);
      } else {
        this.renderWithCanvas2D(optimizedObjects, camera);
      }
      
      performanceMonitor.renderEnd();
      
    } finally {
      performanceMonitor.frameEnd();
    }
  }

  private applyOptimizations(objects: RenderObject[], camera: { x: number; y: number; zoom: number }): RenderObject[] {
    let optimizedObjects = objects;
    
    // Apply object culling
    if (this.settings.enableObjectCulling) {
      optimizedObjects = this.performObjectCulling(optimizedObjects, camera);
    }
    
    // Apply level of detail
    if (this.settings.enableLevelOfDetail) {
      optimizedObjects = this.applyLevelOfDetail(optimizedObjects, camera);
    }
    
    // Limit objects per frame
    if (optimizedObjects.length > this.settings.maxObjectsPerFrame) {
      optimizedObjects = this.limitObjectsPerFrame(optimizedObjects);
    }
    
    return optimizedObjects;
  }

  private performObjectCulling(objects: RenderObject[], camera: { x: number; y: number; zoom: number }): RenderObject[] {
    const viewportBounds = {
      left: camera.x,
      top: camera.y,
      right: camera.x + this.canvas.width / camera.zoom,
      bottom: camera.y + this.canvas.height / camera.zoom
    };
    
    // Add padding for smooth scrolling
    const padding = 100;
    viewportBounds.left -= padding;
    viewportBounds.top -= padding;
    viewportBounds.right += padding;
    viewportBounds.bottom += padding;
    
    return objects.filter(obj => {
      if (!obj.visible) return false;
      
      const objBounds = {
        left: obj.x,
        top: obj.y,
        right: obj.x + obj.width * obj.scaleX,
        bottom: obj.y + obj.height * obj.scaleY
      };
      
      // Check intersection
      return !(
        objBounds.right < viewportBounds.left ||
        objBounds.left > viewportBounds.right ||
        objBounds.bottom < viewportBounds.top ||
        objBounds.top > viewportBounds.bottom
      );
    });
  }

  private applyLevelOfDetail(objects: RenderObject[], camera: { x: number; y: number; zoom: number }): RenderObject[] {
    if (camera.zoom >= this.settings.lodDistanceThreshold) {
      return objects; // Full detail at high zoom
    }
    
    // Reduce detail for distant objects
    return objects.map(obj => {
      if (camera.zoom < 0.25) {
        // Very low detail - simplify complex objects
        return this.createLowDetailVersion(obj);
      } else if (camera.zoom < 0.5) {
        // Medium detail - some simplification
        return this.createMediumDetailVersion(obj);
      }
      
      return obj;
    });
  }

  private createLowDetailVersion(obj: RenderObject): RenderObject {
    // For very low zoom, render simple rectangles instead of complex shapes
    if (obj.type === 'path' || obj.type === 'circle') {
      return {
        ...obj,
        type: 'rectangle'
      };
    }
    
    return obj;
  }

  private createMediumDetailVersion(obj: RenderObject): RenderObject {
    // Reduce complexity but maintain general shape
    if (obj.type === 'path') {
      // Simplify path with fewer points
      return {
        ...obj,
        data: this.simplifyPath(obj.data)
      };
    }
    
    return obj;
  }

  private simplifyPath(pathData: any): any {
    // Implement path simplification algorithm (Douglas-Peucker, etc.)
    return pathData; // Placeholder
  }

  private limitObjectsPerFrame(objects: RenderObject[]): RenderObject[] {
    // Sort by importance (z-index, size, etc.)
    const sortedObjects = objects.sort((a, b) => {
      const importanceA = this.calculateObjectImportance(a);
      const importanceB = this.calculateObjectImportance(b);
      return importanceB - importanceA;
    });
    
    return sortedObjects.slice(0, this.settings.maxObjectsPerFrame);
  }

  private calculateObjectImportance(obj: RenderObject): number {
    let importance = 0;
    
    // Higher z-index = more important
    importance += obj.zIndex * 10;
    
    // Larger objects = more important
    const area = obj.width * obj.scaleX * obj.height * obj.scaleY;
    importance += Math.log(area + 1);
    
    // Visible objects = more important
    if (obj.visible) importance += 100;
    
    // Less transparent = more important
    importance += obj.opacity * 50;
    
    return importance;
  }

  private renderWithWebGL(objects: RenderObject[], camera: { x: number; y: number; zoom: number }): void {
    if (!this.webglRenderer) return;
    
    this.webglRenderer.setCamera(camera.x, camera.y, camera.zoom);
    this.webglRenderer.render(objects);
  }

  private renderWithCanvas2D(objects: RenderObject[], camera: { x: number; y: number; zoom: number }): void {
    const ctx = this.context2D;
    
    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply camera transform
    ctx.save();
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    
    // Render objects
    for (const obj of objects) {
      this.renderObjectCanvas2D(ctx, obj);
    }
    
    ctx.restore();
  }

  private renderObjectCanvas2D(ctx: CanvasRenderingContext2D, obj: RenderObject): void {
    if (!obj.visible || obj.opacity <= 0) return;
    
    ctx.save();
    
    // Apply transforms
    ctx.translate(obj.x + obj.width / 2, obj.y + obj.height / 2);
    ctx.rotate(obj.rotation);
    ctx.scale(obj.scaleX, obj.scaleY);
    ctx.globalAlpha = obj.opacity;
    
    // Render based on type
    switch (obj.type) {
      case 'rectangle':
        this.renderRectangleCanvas2D(ctx, obj);
        break;
      case 'circle':
        this.renderCircleCanvas2D(ctx, obj);
        break;
      case 'text':
        this.renderTextCanvas2D(ctx, obj);
        break;
      case 'image':
        this.renderImageCanvas2D(ctx, obj);
        break;
      case 'path':
        this.renderPathCanvas2D(ctx, obj);
        break;
    }
    
    ctx.restore();
  }

  private renderRectangleCanvas2D(ctx: CanvasRenderingContext2D, obj: RenderObject): void {
    const x = -obj.width / 2;
    const y = -obj.height / 2;
    
    if (obj.fill) {
      ctx.fillStyle = obj.fill;
      ctx.fillRect(x, y, obj.width, obj.height);
    }
    
    if (obj.stroke && obj.strokeWidth) {
      ctx.strokeStyle = obj.stroke;
      ctx.lineWidth = obj.strokeWidth;
      ctx.strokeRect(x, y, obj.width, obj.height);
    }
  }

  private renderCircleCanvas2D(ctx: CanvasRenderingContext2D, obj: RenderObject): void {
    const radius = Math.min(obj.width, obj.height) / 2;
    
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    
    if (obj.fill) {
      ctx.fillStyle = obj.fill;
      ctx.fill();
    }
    
    if (obj.stroke && obj.strokeWidth) {
      ctx.strokeStyle = obj.stroke;
      ctx.lineWidth = obj.strokeWidth;
      ctx.stroke();
    }
  }

  private renderTextCanvas2D(ctx: CanvasRenderingContext2D, obj: RenderObject): void {
    // Text rendering implementation
    if (obj.data?.text) {
      ctx.fillStyle = obj.fill || '#000000';
      ctx.font = obj.data.font || '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(obj.data.text, 0, 0);
    }
  }

  private renderImageCanvas2D(ctx: CanvasRenderingContext2D, obj: RenderObject): void {
    // Image rendering implementation
    if (obj.data?.image instanceof HTMLImageElement) {
      const x = -obj.width / 2;
      const y = -obj.height / 2;
      ctx.drawImage(obj.data.image, x, y, obj.width, obj.height);
    }
  }

  private renderPathCanvas2D(ctx: CanvasRenderingContext2D, obj: RenderObject): void {
    // Path rendering implementation
    if (obj.data?.path) {
      const path = new Path2D(obj.data.path);
      
      if (obj.fill) {
        ctx.fillStyle = obj.fill;
        ctx.fill(path);
      }
      
      if (obj.stroke && obj.strokeWidth) {
        ctx.strokeStyle = obj.stroke;
        ctx.lineWidth = obj.strokeWidth;
        ctx.stroke(path);
      }
    }
  }

  private handlePerformanceIssue(issue: PerformanceIssue): void {
    console.warn('Performance issue detected:', issue.message);
    
    switch (issue.type) {
      case 'low_fps':
        this.reduceFidelity();
        break;
      case 'high_render_time':
        this.enableMoreAggresiveOptimizations();
        break;
      case 'high_object_count':
        this.reduceMaxObjectsPerFrame();
        break;
    }
  }

  private reduceFidelity(): void {
    if (this.settings.renderQuality === 'ultra') {
      this.settings.renderQuality = 'high';
    } else if (this.settings.renderQuality === 'high') {
      this.settings.renderQuality = 'medium';
    } else if (this.settings.renderQuality === 'medium') {
      this.settings.renderQuality = 'low';
    }
    
    console.log(`Reduced render quality to: ${this.settings.renderQuality}`);
  }

  private enableMoreAggresiveOptimizations(): void {
    this.settings.enableObjectCulling = true;
    this.settings.enableLevelOfDetail = true;
    this.settings.lodDistanceThreshold = Math.min(this.settings.lodDistanceThreshold * 1.5, 1.0);
    
    console.log('Enabled more aggressive optimizations');
  }

  private reduceMaxObjectsPerFrame(): void {
    this.settings.maxObjectsPerFrame = Math.max(this.settings.maxObjectsPerFrame * 0.8, 100);
    console.log(`Reduced max objects per frame to: ${this.settings.maxObjectsPerFrame}`);
  }

  private optimizeBasedOnPerformance(): void {
    const summary = performanceMonitor.getPerformanceSummary();
    
    if (summary.overallRating === 'poor' || summary.overallRating === 'critical') {
      this.enableMoreAggresiveOptimizations();
    } else if (summary.overallRating === 'excellent' && summary.avgFps > 55) {
      // Performance is good, we can increase quality
      this.increaseQualityIfPossible();
    }
  }

  private increaseQualityIfPossible(): void {
    if (this.settings.renderQuality === 'low') {
      this.settings.renderQuality = 'medium';
    } else if (this.settings.renderQuality === 'medium') {
      this.settings.renderQuality = 'high';
    } else if (this.settings.renderQuality === 'high') {
      this.settings.renderQuality = 'ultra';
    }
  }

  /**
   * Get current optimization settings
   */
  public getSettings(): OptimizationSettings {
    return { ...this.settings };
  }

  /**
   * Update optimization settings
   */
  public updateSettings(newSettings: Partial<OptimizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Reinitialize if WebGL setting changed
    if (newSettings.enableWebGL !== undefined) {
      this.initializeOptimizer();
    }
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): any {
    const webglStats = this.webglRenderer?.getStats();
    const summary = performanceMonitor.getPerformanceSummary();
    
    return {
      renderMode: this.renderMode,
      useWebGL: this.useWebGL,
      webglStats,
      summary,
      cacheStats: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses) || 0,
        size: this.renderCache.size
      }
    };
  }

  /**
   * Force render mode switch
   */
  public setRenderMode(mode: 'canvas2d' | 'webgl'): void {
    if (mode === 'webgl' && !this.webglRenderer) {
      console.warn('WebGL renderer not available');
      return;
    }
    
    this.renderMode = mode;
    this.useWebGL = mode === 'webgl';
  }

  /**
   * Cleanup resources
   */
  public dispose(): void {
    performanceMonitor.stopMonitoring();
    
    if (this.webglRenderer) {
      this.webglRenderer.dispose();
    }
    
    this.renderCache.clear();
  }
}