/**
 * Canvas Performance Utilities Tests
 * Tests for performance optimization, object culling, and rendering efficiency
 */

import { fabric } from 'fabric';
import {
  CanvasPerformanceOptimizer,
  ObjectPool,
  RenderCache,
  PerformanceMonitor,
  optimizeCanvasSettings,
  measureCanvasPerformance,
  ViewportBounds
} from '../../utils/canvasPerformance';
import { mockFabricCanvas, mockFabricObject } from '../utils/testHelpers';

describe('Canvas Performance Utilities', () => {
  let mockCanvas: any;
  let optimizer: CanvasPerformanceOptimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCanvas = mockFabricCanvas();
    optimizer = new CanvasPerformanceOptimizer(mockCanvas);
  });

  describe('CanvasPerformanceOptimizer', () => {
    describe('Object Culling', () => {
      it('culls objects outside viewport', () => {
        const visibleObject = mockFabricObject('rect', {
          left: 100,
          top: 100,
          width: 50,
          height: 50
        });
        
        const hiddenObject = mockFabricObject('rect', {
          left: 2000,
          top: 2000,
          width: 50,
          height: 50
        });

        mockCanvas.getObjects.mockReturnValue([visibleObject, hiddenObject]);
        
        optimizer.setViewport({ left: 0, top: 0, right: 800, bottom: 600 });
        optimizer.cullObjects();

        expect(visibleObject.visible).toBe(true);
        expect(hiddenObject.visible).toBe(false);
      });

      it('includes objects partially in viewport', () => {
        const partiallyVisibleObject = mockFabricObject('rect', {
          left: 750,
          top: 550,
          width: 100,
          height: 100
        });

        mockCanvas.getObjects.mockReturnValue([partiallyVisibleObject]);
        
        optimizer.setViewport({ left: 0, top: 0, right: 800, bottom: 600 });
        optimizer.cullObjects();

        expect(partiallyVisibleObject.visible).toBe(true);
      });

      it('handles objects with transformations', () => {
        const transformedObject = mockFabricObject('rect', {
          left: 400,
          top: 300,
          width: 100,
          height: 100,
          scaleX: 2,
          scaleY: 2,
          angle: 45
        });

        transformedObject.getBoundingRect.mockReturnValue({
          left: 350,
          top: 250,
          width: 200,
          height: 200
        });

        mockCanvas.getObjects.mockReturnValue([transformedObject]);
        
        optimizer.setViewport({ left: 0, top: 0, right: 800, bottom: 600 });
        optimizer.cullObjects();

        expect(transformedObject.visible).toBe(true);
      });

      it('applies buffer zone for smooth scrolling', () => {
        const objectNearEdge = mockFabricObject('rect', {
          left: 850,
          top: 100,
          width: 50,
          height: 50
        });

        mockCanvas.getObjects.mockReturnValue([objectNearEdge]);
        
        optimizer.setViewport({ left: 0, top: 0, right: 800, bottom: 600 });
        optimizer.cullObjects();

        // Should be visible due to buffer zone
        expect(objectNearEdge.visible).toBe(true);
      });
    });

    describe('Level of Detail (LOD)', () => {
      it('applies LOD based on object size', () => {
        const smallObject = mockFabricObject('rect', {
          left: 100,
          top: 100,
          width: 5,
          height: 5
        });

        const largeObject = mockFabricObject('rect', {
          left: 200,
          top: 200,
          width: 200,
          height: 200
        });

        mockCanvas.getObjects.mockReturnValue([smallObject, largeObject]);
        mockCanvas.getZoom.mockReturnValue(0.5); // Zoomed out
        
        optimizer.applyLevelOfDetail();

        expect(smallObject.set).toHaveBeenCalledWith('strokeWidth', 0);
        expect(largeObject.set).not.toHaveBeenCalledWith('strokeWidth', 0);
      });

      it('simplifies complex objects at low zoom', () => {
        const complexObject = mockFabricObject('path', {
          left: 100,
          top: 100,
          width: 100,
          height: 100
        });

        mockCanvas.getObjects.mockReturnValue([complexObject]);
        mockCanvas.getZoom.mockReturnValue(0.25);
        
        optimizer.applyLevelOfDetail();

        expect(complexObject.set).toHaveBeenCalledWith('shadow', null);
      });

      it('restores detail at high zoom levels', () => {
        const detailedObject = mockFabricObject('text', {
          left: 100,
          top: 100,
          width: 100,
          height: 50
        });

        mockCanvas.getObjects.mockReturnValue([detailedObject]);
        mockCanvas.getZoom.mockReturnValue(2.0);
        
        optimizer.applyLevelOfDetail();

        expect(detailedObject.set).not.toHaveBeenCalledWith('strokeWidth', 0);
      });
    });

    describe('Render Optimization', () => {
      it('skips rendering when nothing changed', () => {
        optimizer.optimizeRender();
        optimizer.optimizeRender(); // Second call

        expect(mockCanvas.requestRenderAll).toHaveBeenCalledTimes(1);
      });

      it('forces render when viewport changes', () => {
        optimizer.optimizeRender();
        optimizer.setViewport({ left: 100, top: 100, right: 900, bottom: 700 });
        optimizer.optimizeRender();

        expect(mockCanvas.requestRenderAll).toHaveBeenCalledTimes(2);
      });

      it('batches multiple render requests', () => {
        jest.useFakeTimers();

        optimizer.optimizeRender();
        optimizer.optimizeRender();
        optimizer.optimizeRender();

        jest.runAllTimers();

        expect(mockCanvas.requestRenderAll).toHaveBeenCalledTimes(1);
        jest.useRealTimers();
      });
    });

    describe('Performance Monitoring', () => {
      it('tracks frame rate', () => {
        jest.useFakeTimers();
        const startTime = Date.now();

        optimizer.startFrameRateMonitoring();

        // Simulate some frames
        jest.advanceTimersByTime(1000);
        
        const stats = optimizer.getPerformanceStats();
        expect(stats.frameRate).toBeGreaterThan(0);

        jest.useRealTimers();
      });

      it('measures object count', () => {
        const objects = Array(100).fill(null).map(() => mockFabricObject());
        mockCanvas.getObjects.mockReturnValue(objects);

        const stats = optimizer.getPerformanceStats();
        expect(stats.objectCount).toBe(100);
      });

      it('tracks visible object ratio', () => {
        const visibleObjects = Array(50).fill(null).map(() => ({
          ...mockFabricObject(),
          visible: true
        }));
        const hiddenObjects = Array(50).fill(null).map(() => ({
          ...mockFabricObject(),
          visible: false
        }));

        mockCanvas.getObjects.mockReturnValue([...visibleObjects, ...hiddenObjects]);

        const stats = optimizer.getPerformanceStats();
        expect(stats.visibleObjectRatio).toBe(0.5);
      });
    });
  });

  describe('ObjectPool', () => {
    let pool: ObjectPool;

    beforeEach(() => {
      pool = new ObjectPool();
    });

    it('reuses objects from pool', () => {
      const obj1 = pool.get('rect', { width: 100, height: 100 });
      pool.release(obj1);
      const obj2 = pool.get('rect', { width: 200, height: 200 });

      expect(obj1).toBe(obj2);
      expect(obj2.set).toHaveBeenCalledWith('width', 200);
      expect(obj2.set).toHaveBeenCalledWith('height', 200);
    });

    it('creates new objects when pool is empty', () => {
      const obj1 = pool.get('rect', { width: 100, height: 100 });
      const obj2 = pool.get('rect', { width: 200, height: 200 });

      expect(obj1).not.toBe(obj2);
    });

    it('maintains separate pools for different types', () => {
      const rect = pool.get('rect', {});
      const circle = pool.get('circle', {});

      expect(rect).not.toBe(circle);
    });

    it('limits pool size', () => {
      const objects = [];
      
      // Fill pool beyond max size
      for (let i = 0; i < 150; i++) {
        const obj = pool.get('rect', {});
        objects.push(obj);
      }

      // Release all objects
      objects.forEach(obj => pool.release(obj));

      // Pool should be limited to max size
      const pooledObjects = [];
      for (let i = 0; i < 150; i++) {
        pooledObjects.push(pool.get('rect', {}));
      }

      const reusedCount = pooledObjects.filter(obj => 
        objects.includes(obj)
      ).length;

      expect(reusedCount).toBeLessThanOrEqual(100); // Default max pool size
    });

    it('clears all pools', () => {
      const rect = pool.get('rect', {});
      const circle = pool.get('circle', {});
      
      pool.release(rect);
      pool.release(circle);
      pool.clear();

      const newRect = pool.get('rect', {});
      const newCircle = pool.get('circle', {});

      expect(newRect).not.toBe(rect);
      expect(newCircle).not.toBe(circle);
    });
  });

  describe('RenderCache', () => {
    let cache: RenderCache;

    beforeEach(() => {
      cache = new RenderCache(5); // Max 5 entries
    });

    it('caches rendered objects', () => {
      const obj = mockFabricObject('rect');
      const imageData = 'cached-image-data';

      cache.set('obj1', obj, imageData);
      const cached = cache.get('obj1', obj);

      expect(cached).toBe(imageData);
    });

    it('invalidates cache when object changes', () => {
      const obj = mockFabricObject('rect');
      cache.set('obj1', obj, 'image-data');

      // Simulate object change
      obj.left = 100;
      obj.top = 100;

      const cached = cache.get('obj1', obj);
      expect(cached).toBeNull();
    });

    it('respects cache size limit', () => {
      for (let i = 0; i < 10; i++) {
        const obj = mockFabricObject('rect');
        cache.set(`obj${i}`, obj, `image-data-${i}`);
      }

      // First entries should be evicted
      const obj0 = mockFabricObject('rect');
      const cached = cache.get('obj0', obj0);
      expect(cached).toBeNull();
    });

    it('clears all cached entries', () => {
      const obj = mockFabricObject('rect');
      cache.set('obj1', obj, 'image-data');
      cache.clear();

      const cached = cache.get('obj1', obj);
      expect(cached).toBeNull();
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('starts performance measurement', () => {
      monitor.startMeasurement('test-operation');
      
      expect(monitor.isActive()).toBe(true);
    });

    it('ends measurement and records duration', () => {
      monitor.startMeasurement('test-operation');
      jest.advanceTimersByTime(100);
      monitor.endMeasurement('test-operation');

      const metrics = monitor.getMetrics();
      expect(metrics['test-operation']).toBeDefined();
      expect(metrics['test-operation'].averageDuration).toBeGreaterThan(0);
    });

    it('calculates average duration over multiple measurements', () => {
      monitor.startMeasurement('test-op');
      jest.advanceTimersByTime(100);
      monitor.endMeasurement('test-op');

      monitor.startMeasurement('test-op');
      jest.advanceTimersByTime(200);
      monitor.endMeasurement('test-op');

      const metrics = monitor.getMetrics();
      expect(metrics['test-op'].averageDuration).toBe(150);
      expect(metrics['test-op'].count).toBe(2);
    });

    it('tracks memory usage', () => {
      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10000000,
          totalJSHeapSize: 20000000,
          jsHeapSizeLimit: 100000000
        },
        configurable: true
      });

      const memoryInfo = monitor.getMemoryInfo();
      expect(memoryInfo.used).toBe(10000000);
      expect(memoryInfo.total).toBe(20000000);
    });

    it('resets all measurements', () => {
      monitor.startMeasurement('test-op');
      jest.advanceTimersByTime(100);
      monitor.endMeasurement('test-op');

      monitor.reset();
      const metrics = monitor.getMetrics();
      expect(Object.keys(metrics)).toHaveLength(0);
    });
  });

  describe('Canvas Settings Optimization', () => {
    it('optimizes canvas for performance', () => {
      const settings = optimizeCanvasSettings('performance');

      expect(settings.renderOnAddRemove).toBe(false);
      expect(settings.skipTargetFind).toBe(true);
      expect(settings.selection).toBe(false);
    });

    it('optimizes canvas for quality', () => {
      const settings = optimizeCanvasSettings('quality');

      expect(settings.renderOnAddRemove).toBe(true);
      expect(settings.skipTargetFind).toBe(false);
      expect(settings.selection).toBe(true);
    });

    it('provides balanced settings', () => {
      const settings = optimizeCanvasSettings('balanced');

      expect(settings.renderOnAddRemove).toBe(true);
      expect(settings.skipTargetFind).toBe(false);
      expect(settings.imageSmoothingEnabled).toBe(true);
    });
  });

  describe('Performance Measurement', () => {
    it('measures canvas operation performance', async () => {
      const operation = jest.fn().mockResolvedValue('result');
      
      const result = await measureCanvasPerformance('test-op', operation);
      
      expect(result.result).toBe('result');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('handles operation errors', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(
        measureCanvasPerformance('failing-op', failingOperation)
      ).rejects.toThrow('Operation failed');
    });

    it('measures memory impact', async () => {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 10000000,
          totalJSHeapSize: 20000000,
          jsHeapSizeLimit: 100000000
        },
        configurable: true
      });

      const operation = jest.fn().mockResolvedValue('result');
      
      const result = await measureCanvasPerformance('memory-test', operation);
      
      expect(result.memoryBefore).toBeDefined();
      expect(result.memoryAfter).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles missing canvas context gracefully', () => {
      const invalidCanvas = null;
      
      expect(() => {
        new CanvasPerformanceOptimizer(invalidCanvas as any);
      }).not.toThrow();
    });

    it('handles object pool errors', () => {
      const pool = new ObjectPool();
      
      // Mock fabric to throw error
      const originalRect = fabric.Rect;
      (fabric as any).Rect = jest.fn(() => {
        throw new Error('Fabric error');
      });

      expect(() => {
        pool.get('rect', {});
      }).not.toThrow();

      (fabric as any).Rect = originalRect;
    });

    it('handles performance monitoring errors', () => {
      const monitor = new PerformanceMonitor();
      
      // Try to end measurement that wasn't started
      expect(() => {
        monitor.endMeasurement('non-existent');
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('integrates optimizer with canvas updates', () => {
      const objects = Array(50).fill(null).map((_, i) => 
        mockFabricObject('rect', {
          left: i * 20,
          top: i * 20,
          width: 50,
          height: 50
        })
      );

      mockCanvas.getObjects.mockReturnValue(objects);
      
      optimizer.setViewport({ left: 0, top: 0, right: 400, bottom: 400 });
      optimizer.optimize();

      // Should cull objects outside viewport
      const visibleObjects = objects.filter(obj => obj.visible !== false);
      expect(visibleObjects.length).toBeLessThan(objects.length);
    });

    it('maintains performance during zoom operations', () => {
      jest.useFakeTimers();
      
      const objects = Array(100).fill(null).map(() => mockFabricObject());
      mockCanvas.getObjects.mockReturnValue(objects);
      
      // Simulate zoom changes
      mockCanvas.getZoom.mockReturnValue(0.5);
      optimizer.optimize();
      
      mockCanvas.getZoom.mockReturnValue(2.0);
      optimizer.optimize();
      
      jest.runAllTimers();
      
      // Should handle zoom changes without errors
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });
});