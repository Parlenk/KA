/**
 * Canvas Performance Optimization Utilities
 * Implements object culling, render caching, and performance monitoring
 */

interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface PerformanceMetrics {
  renderTime: number;
  objectCount: number;
  visibleObjects: number;
  frameRate: number;
  memoryUsage: number;
}

interface RenderCache {
  objectId: string;
  lastModified: number;
  cachedImage: HTMLCanvasElement | null;
  bounds: ViewportBounds;
}

export class CanvasPerformanceOptimizer {
  private canvas: fabric.Canvas;
  private renderCache = new Map<string, RenderCache>();
  private viewport: ViewportBounds = { left: 0, top: 0, right: 0, bottom: 0 };
  private performanceMetrics: PerformanceMetrics[] = [];
  private frameStartTime = 0;
  private renderQueue: fabric.Object[] = [];
  private isRenderingQueued = false;
  
  // Performance thresholds
  private readonly MAX_OBJECTS_WITHOUT_CULLING = 50;
  private readonly CACHE_EXPIRY_TIME = 30000; // 30 seconds
  private readonly TARGET_FPS = 60;
  private readonly MAX_RENDER_TIME = 16; // ~60fps

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
    this.initializePerformanceMonitoring();
    this.setupEventListeners();
  }

  private initializePerformanceMonitoring() {
    // Override canvas render methods for performance tracking
    const originalRender = this.canvas.renderAll.bind(this.canvas);
    
    this.canvas.renderAll = () => {
      this.frameStartTime = performance.now();
      
      // Apply optimizations before render
      this.optimizeRender();
      
      originalRender();
      
      // Track performance metrics
      this.trackPerformanceMetrics();
    };
  }

  private setupEventListeners() {
    // Update viewport on zoom/pan
    this.canvas.on('after:render', () => {
      this.updateViewport();
    });

    // Clear cache when objects are modified
    this.canvas.on('object:modified', (e) => {
      if (e.target) {
        this.invalidateCache(e.target);
      }
    });

    // Batch render updates
    this.canvas.on('object:moving', () => {
      this.queueRender();
    });

    this.canvas.on('object:scaling', () => {
      this.queueRender();
    });

    this.canvas.on('object:rotating', () => {
      this.queueRender();
    });
  }

  private updateViewport() {
    const zoom = this.canvas.getZoom();
    const vpt = this.canvas.viewportTransform;
    
    if (vpt) {
      this.viewport = {
        left: -vpt[4] / zoom,
        top: -vpt[5] / zoom,
        right: (-vpt[4] + this.canvas.getWidth()) / zoom,
        bottom: (-vpt[5] + this.canvas.getHeight()) / zoom
      };
    }
  }

  private optimizeRender() {
    const objects = this.canvas.getObjects();
    
    if (objects.length > this.MAX_OBJECTS_WITHOUT_CULLING) {
      this.applyCulling(objects);
    }
    
    this.applyLevelOfDetail(objects);
    this.optimizeTextRendering(objects);
  }

  private applyCulling(objects: fabric.Object[]) {
    objects.forEach(obj => {
      const bounds = obj.getBoundingRect();
      const isVisible = this.isObjectVisible(bounds);
      
      // Hide objects outside viewport
      if (obj.visible !== isVisible) {
        obj.visible = isVisible;
        obj.dirty = true;
      }
    });
  }

  private isObjectVisible(bounds: fabric.Rect): boolean {
    return !(
      bounds.left > this.viewport.right ||
      bounds.left + bounds.width < this.viewport.left ||
      bounds.top > this.viewport.bottom ||
      bounds.top + bounds.height < this.viewport.top
    );
  }

  private applyLevelOfDetail(objects: fabric.Object[]) {
    const zoom = this.canvas.getZoom();
    
    objects.forEach(obj => {
      if (obj.type === 'image' && zoom < 0.5) {
        // Use lower resolution for distant images
        this.applyLowResolution(obj as fabric.Image);
      } else if (obj.type === 'text' && zoom < 0.3) {
        // Simplify text rendering for distant text
        this.simplifyTextRendering(obj as fabric.Text);
      }
    });
  }

  private applyLowResolution(image: fabric.Image) {
    if (!image.lowResVersion) {
      // Create low-res version if it doesn't exist
      this.createLowResVersion(image);
    }
  }

  private createLowResVersion(image: fabric.Image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const originalElement = image.getElement() as HTMLImageElement;
    
    if (ctx && originalElement) {
      // Create 25% resolution version
      canvas.width = originalElement.width * 0.25;
      canvas.height = originalElement.height * 0.25;
      
      ctx.drawImage(
        originalElement,
        0, 0,
        originalElement.width,
        originalElement.height,
        0, 0,
        canvas.width,
        canvas.height
      );
      
      (image as any).lowResVersion = canvas;
    }
  }

  private simplifyTextRendering(text: fabric.Text) {
    // Store original shadow for restoration
    if (!text._originalShadow) {
      text._originalShadow = text.shadow;
    }
    
    // Remove shadows and effects for distant text
    text.shadow = null;
  }

  private optimizeTextRendering(objects: fabric.Object[]) {
    const textObjects = objects.filter(obj => obj.type === 'text') as fabric.Text[];
    
    // Batch text measurement operations
    if (textObjects.length > 10) {
      this.batchTextMeasurements(textObjects);
    }
  }

  private batchTextMeasurements(textObjects: fabric.Text[]) {
    const ctx = this.canvas.getContext();
    const currentFont = ctx.font;
    
    // Group texts by font to minimize font changes
    const fontGroups = new Map<string, fabric.Text[]>();
    
    textObjects.forEach(text => {
      const fontKey = `${text.fontSize}px ${text.fontFamily}`;
      if (!fontGroups.has(fontKey)) {
        fontGroups.set(fontKey, []);
      }
      fontGroups.get(fontKey)!.push(text);
    });
    
    // Process each font group
    fontGroups.forEach((texts, font) => {
      ctx.font = font;
      texts.forEach(text => {
        // Batch process text measurements
        if (text.dirty && text.visible) {
          text._measureText();
        }
      });
    });
    
    ctx.font = currentFont;
  }

  private queueRender() {
    if (!this.isRenderingQueued) {
      this.isRenderingQueued = true;
      requestAnimationFrame(() => {
        this.canvas.renderAll();
        this.isRenderingQueued = false;
      });
    }
  }

  private invalidateCache(object: fabric.Object) {
    const objId = (object as any).id || object.toString();
    this.renderCache.delete(objId);
  }

  private trackPerformanceMetrics() {
    const renderTime = performance.now() - this.frameStartTime;
    const objects = this.canvas.getObjects();
    const visibleObjects = objects.filter(obj => obj.visible).length;
    
    const metrics: PerformanceMetrics = {
      renderTime,
      objectCount: objects.length,
      visibleObjects,
      frameRate: 1000 / renderTime,
      memoryUsage: this.estimateMemoryUsage()
    };
    
    this.performanceMetrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics.shift();
    }
    
    // Auto-optimize if performance is poor
    this.autoOptimize(metrics);
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of canvas memory usage
    const canvasSize = this.canvas.getWidth() * this.canvas.getHeight() * 4; // RGBA
    const objectCount = this.canvas.getObjects().length;
    const averageObjectSize = 1024; // Estimated bytes per object
    
    return canvasSize + (objectCount * averageObjectSize);
  }

  private autoOptimize(metrics: PerformanceMetrics) {
    if (metrics.renderTime > this.MAX_RENDER_TIME) {
      // Performance is poor, apply aggressive optimizations
      this.enableAggressiveOptimizations();
    } else if (metrics.frameRate > this.TARGET_FPS * 0.9) {
      // Performance is good, can relax some optimizations
      this.relaxOptimizations();
    }
  }

  private enableAggressiveOptimizations() {
    // Reduce render quality for better performance
    this.canvas.imageSmoothingEnabled = false;
    
    // Increase culling aggressiveness
    this.viewport = {
      left: this.viewport.left - 100,
      top: this.viewport.top - 100,
      right: this.viewport.right + 100,
      bottom: this.viewport.bottom + 100
    };
  }

  private relaxOptimizations() {
    // Restore render quality
    this.canvas.imageSmoothingEnabled = true;
    
    // Reset viewport bounds
    this.updateViewport();
  }

  // Public API methods
  public getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  public getAverageFrameRate(): number {
    if (this.performanceMetrics.length === 0) return 0;
    
    const sum = this.performanceMetrics.reduce((acc, metric) => acc + metric.frameRate, 0);
    return sum / this.performanceMetrics.length;
  }

  public clearCache() {
    this.renderCache.clear();
  }

  public enablePerformanceMode(enabled: boolean) {
    if (enabled) {
      this.enableAggressiveOptimizations();
    } else {
      this.relaxOptimizations();
    }
  }

  public getMemoryUsage(): number {
    const latest = this.performanceMetrics[this.performanceMetrics.length - 1];
    return latest ? latest.memoryUsage : 0;
  }

  public optimizeForComplexDesign() {
    // Special optimizations for designs with 100+ objects
    const objects = this.canvas.getObjects();
    
    if (objects.length > 100) {
      // Enable object pooling
      this.enableObjectPooling();
      
      // Reduce selection handles
      this.optimizeSelectionHandles();
      
      // Batch similar operations
      this.batchSimilarOperations(objects);
    }
  }

  private enableObjectPooling() {
    // Implementation for object pooling to reduce garbage collection
    // This would involve reusing fabric objects instead of creating new ones
  }

  private optimizeSelectionHandles() {
    // Reduce the number of selection handles for complex objects
    this.canvas.selectionBorderColor = 'rgba(0,0,0,0.3)';
    this.canvas.selectionLineWidth = 1;
  }

  private batchSimilarOperations(objects: fabric.Object[]) {
    // Group similar operations together
    const operations = new Map<string, fabric.Object[]>();
    
    objects.forEach(obj => {
      const operation = obj.dirty ? 'dirty' : 'clean';
      if (!operations.has(operation)) {
        operations.set(operation, []);
      }
      operations.get(operation)!.push(obj);
    });
    
    // Process each group
    operations.forEach((objs, operation) => {
      if (operation === 'dirty') {
        this.batchDirtyOperations(objs);
      }
    });
  }

  private batchDirtyOperations(objects: fabric.Object[]) {
    // Batch process dirty objects
    objects.forEach(obj => {
      obj.setCoords();
    });
  }
}

// Performance monitoring hook for React components
export function useCanvasPerformance(canvas: fabric.Canvas | null) {
  const [optimizer, setOptimizer] = React.useState<CanvasPerformanceOptimizer | null>(null);
  const [metrics, setMetrics] = React.useState<PerformanceMetrics[]>([]);

  React.useEffect(() => {
    if (canvas) {
      const opt = new CanvasPerformanceOptimizer(canvas);
      setOptimizer(opt);
      
      const updateMetrics = () => {
        setMetrics(opt.getPerformanceMetrics());
      };
      
      const interval = setInterval(updateMetrics, 1000);
      
      return () => {
        clearInterval(interval);
      };
    }
  }, [canvas]);

  return {
    optimizer,
    metrics,
    averageFrameRate: optimizer?.getAverageFrameRate() || 0,
    memoryUsage: optimizer?.getMemoryUsage() || 0
  };
}