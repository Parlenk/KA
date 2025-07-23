/**
 * Object Pool System for Canvas Performance
 * Reduces garbage collection by reusing objects
 */

interface PoolableObject {
  reset(): void;
  isInUse(): boolean;
  setInUse(inUse: boolean): void;
}

interface PoolStats {
  totalCreated: number;
  totalReused: number;
  currentPoolSize: number;
  currentInUse: number;
}

export class ObjectPool<T extends PoolableObject> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;
  private stats: PoolStats = {
    totalCreated: 0,
    totalReused: 0,
    currentPoolSize: 0,
    currentInUse: 0
  };

  constructor(
    createFn: () => T,
    maxSize: number = 100,
    resetFn?: (obj: T) => void
  ) {
    this.createFn = createFn;
    this.maxSize = maxSize;
    this.resetFn = resetFn;
  }

  acquire(): T {
    let obj: T;

    // Try to get from pool first
    const pooledObj = this.pool.pop();
    if (pooledObj) {
      obj = pooledObj;
      this.stats.totalReused++;
      this.stats.currentPoolSize--;
    } else {
      // Create new object if pool is empty
      obj = this.createFn();
      this.stats.totalCreated++;
    }

    // Reset object state
    obj.reset();
    if (this.resetFn) {
      this.resetFn(obj);
    }
    
    obj.setInUse(true);
    this.stats.currentInUse++;

    return obj;
  }

  release(obj: T): void {
    if (!obj.isInUse()) {
      console.warn('Attempting to release object that is not in use');
      return;
    }

    obj.setInUse(false);
    this.stats.currentInUse--;

    // Return to pool if under max size
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
      this.stats.currentPoolSize++;
    }
    // Otherwise let it be garbage collected
  }

  getStats(): PoolStats {
    return { ...this.stats };
  }

  clear(): void {
    this.pool = [];
    this.stats.currentPoolSize = 0;
  }

  warmUp(count: number): void {
    for (let i = 0; i < count; i++) {
      const obj = this.createFn();
      obj.setInUse(false);
      this.pool.push(obj);
      this.stats.totalCreated++;
      this.stats.currentPoolSize++;
    }
  }
}

// Poolable Fabric.js object wrapper
export class PoolableFabricObject implements PoolableObject {
  public fabricObject: fabric.Object;
  private inUse: boolean = false;

  constructor(fabricObject: fabric.Object) {
    this.fabricObject = fabricObject;
  }

  reset(): void {
    // Reset all properties to defaults
    this.fabricObject.set({
      left: 0,
      top: 0,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      visible: true,
      selectable: true,
      evented: true,
      fill: '#000000',
      stroke: null,
      strokeWidth: 1
    });
  }

  isInUse(): boolean {
    return this.inUse;
  }

  setInUse(inUse: boolean): void {
    this.inUse = inUse;
  }
}

// Specialized pools for different object types
export class FabricObjectPools {
  private rectanglePool: ObjectPool<PoolableFabricObject>;
  private circlePool: ObjectPool<PoolableFabricObject>;
  private textPool: ObjectPool<PoolableFabricObject>;
  private imagePool: ObjectPool<PoolableFabricObject>;
  private groupPool: ObjectPool<PoolableFabricObject>;

  constructor() {
    this.rectanglePool = new ObjectPool(
      () => new PoolableFabricObject(new fabric.Rect()),
      50
    );

    this.circlePool = new ObjectPool(
      () => new PoolableFabricObject(new fabric.Circle()),
      30
    );

    this.textPool = new ObjectPool(
      () => new PoolableFabricObject(new fabric.Text('', {
        fontSize: 16,
        fontFamily: 'Arial'
      })),
      40
    );

    this.imagePool = new ObjectPool(
      () => new PoolableFabricObject(new fabric.Image(new Image())),
      20
    );

    this.groupPool = new ObjectPool(
      () => new PoolableFabricObject(new fabric.Group([])),
      10
    );

    // Warm up pools
    this.warmUpPools();
  }

  private warmUpPools(): void {
    this.rectanglePool.warmUp(10);
    this.circlePool.warmUp(5);
    this.textPool.warmUp(8);
    this.imagePool.warmUp(3);
    this.groupPool.warmUp(2);
  }

  acquireRectangle(): fabric.Rect {
    const pooled = this.rectanglePool.acquire();
    return pooled.fabricObject as fabric.Rect;
  }

  acquireCircle(): fabric.Circle {
    const pooled = this.circlePool.acquire();
    return pooled.fabricObject as fabric.Circle;
  }

  acquireText(): fabric.Text {
    const pooled = this.textPool.acquire();
    return pooled.fabricObject as fabric.Text;
  }

  acquireImage(): fabric.Image {
    const pooled = this.imagePool.acquire();
    return pooled.fabricObject as fabric.Image;
  }

  acquireGroup(): fabric.Group {
    const pooled = this.groupPool.acquire();
    return pooled.fabricObject as fabric.Group;
  }

  release(obj: fabric.Object): void {
    const pooled = this.findPooledObject(obj);
    if (pooled) {
      this.getPoolForType(obj.type!).release(pooled);
    }
  }

  private findPooledObject(obj: fabric.Object): PoolableFabricObject | null {
    // This is a simplified implementation
    // In practice, you'd need to maintain a mapping between fabric objects and pooled objects
    return null;
  }

  private getPoolForType(type: string): ObjectPool<PoolableFabricObject> {
    switch (type) {
      case 'rect': return this.rectanglePool;
      case 'circle': return this.circlePool;
      case 'text': return this.textPool;
      case 'image': return this.imagePool;
      case 'group': return this.groupPool;
      default: return this.rectanglePool;
    }
  }

  getStats(): Record<string, PoolStats> {
    return {
      rectangle: this.rectanglePool.getStats(),
      circle: this.circlePool.getStats(),
      text: this.textPool.getStats(),
      image: this.imagePool.getStats(),
      group: this.groupPool.getStats()
    };
  }

  clearAll(): void {
    this.rectanglePool.clear();
    this.circlePool.clear();
    this.textPool.clear();
    this.imagePool.clear();
    this.groupPool.clear();
  }
}

// Canvas batch operations for performance
export class CanvasBatchOperations {
  private canvas: fabric.Canvas;
  private batchedOperations: (() => void)[] = [];
  private batchTimeout: number | null = null;
  private readonly BATCH_DELAY = 16; // ~60fps

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
  }

  batchOperation(operation: () => void): void {
    this.batchedOperations.push(operation);
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = window.setTimeout(() => {
      this.executeBatch();
    }, this.BATCH_DELAY);
  }

  private executeBatch(): void {
    if (this.batchedOperations.length === 0) return;

    // Disable rendering during batch operations
    this.canvas.renderOnAddRemove = false;

    // Execute all batched operations
    this.batchedOperations.forEach(operation => {
      operation();
    });

    // Clear batch
    this.batchedOperations = [];
    this.batchTimeout = null;

    // Re-enable rendering and render once
    this.canvas.renderOnAddRemove = true;
    this.canvas.renderAll();
  }

  // Batch add multiple objects
  batchAddObjects(objects: fabric.Object[]): void {
    this.batchOperation(() => {
      objects.forEach(obj => {
        this.canvas.add(obj);
      });
    });
  }

  // Batch remove multiple objects
  batchRemoveObjects(objects: fabric.Object[]): void {
    this.batchOperation(() => {
      objects.forEach(obj => {
        this.canvas.remove(obj);
      });
    });
  }

  // Batch update object properties
  batchUpdateObjects(updates: Array<{ object: fabric.Object; properties: any }>): void {
    this.batchOperation(() => {
      updates.forEach(({ object, properties }) => {
        object.set(properties);
      });
    });
  }

  // Force execute all pending operations immediately
  flush(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.executeBatch();
    }
  }
}

// Memory-efficient texture manager
export class TextureManager {
  private textureCache = new Map<string, HTMLCanvasElement>();
  private texturePool: ObjectPool<HTMLCanvasElement>;
  private readonly MAX_CACHE_SIZE = 100;
  private readonly MAX_TEXTURE_SIZE = 2048;

  constructor() {
    this.texturePool = new ObjectPool(
      () => document.createElement('canvas'),
      20
    );
  }

  getTexture(key: string, generator: (canvas: HTMLCanvasElement) => void): HTMLCanvasElement {
    // Check cache first
    let texture = this.textureCache.get(key);
    
    if (!texture) {
      // Get canvas from pool
      texture = this.texturePool.acquire();
      
      // Generate texture
      generator(texture);
      
      // Cache if under limit
      if (this.textureCache.size < this.MAX_CACHE_SIZE) {
        this.textureCache.set(key, texture);
      }
    }

    return texture;
  }

  releaseTexture(texture: HTMLCanvasElement): void {
    // Clear canvas
    const ctx = texture.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, texture.width, texture.height);
    }
    
    // Return to pool
    this.texturePool.release(texture as any);
  }

  clearCache(): void {
    this.textureCache.forEach(texture => {
      this.releaseTexture(texture);
    });
    this.textureCache.clear();
  }

  getStats(): { cacheSize: number; poolStats: PoolStats } {
    return {
      cacheSize: this.textureCache.size,
      poolStats: this.texturePool.getStats()
    };
  }
}

// Export singleton instances
export const fabricObjectPools = new FabricObjectPools();
export const textureManager = new TextureManager();