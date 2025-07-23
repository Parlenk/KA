/**
 * Test Helper Utilities
 * Reusable functions and components for testing
 */

import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore, Store } from '@reduxjs/toolkit';
import { AccessibilityProvider } from '../../components/Accessibility/AccessibilityProvider';
import { designSlice } from '../../store/designSlice';
import { animationSlice } from '../../store/animationSlice';
import { brandKitSlice } from '../../store/brandKitSlice';
import { exportSlice } from '../../store/exportSlice';

// Extended render options
interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  preloadedState?: any;
  store?: Store;
  withRouter?: boolean;
  withAccessibility?: boolean;
  withRedux?: boolean;
}

// Create test store
export function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      design: designSlice.reducer,
      animation: animationSlice.reducer,
      brandKit: brandKitSlice.reducer,
      export: exportSlice.reducer
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['design/addObject', 'design/updateObject']
        }
      })
  });
}

// Custom render function with providers
export function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = createTestStore(preloadedState),
    withRouter = false,
    withAccessibility = false,
    withRedux = true,
    ...renderOptions
  }: ExtendedRenderOptions = {}
): RenderResult & { store: Store } {
  
  function Wrapper({ children }: { children: React.ReactNode }) {
    let content = children;
    
    // Wrap with Redux Provider
    if (withRedux) {
      content = <Provider store={store}>{content}</Provider>;
    }
    
    // Wrap with Router
    if (withRouter) {
      content = <BrowserRouter>{content}</BrowserRouter>;
    }
    
    // Wrap with Accessibility Provider
    if (withAccessibility) {
      content = <AccessibilityProvider>{content}</AccessibilityProvider>;
    }
    
    return <>{content}</>;
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    store
  };
}

// Mock Fabric.js canvas creation
export function mockFabricCanvas() {
  const canvas = {
    add: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    renderAll: jest.fn(),
    getObjects: jest.fn(() => []),
    setActiveObject: jest.fn(),
    getActiveObject: jest.fn(),
    getActiveObjects: jest.fn(() => []),
    discardActiveObject: jest.fn(),
    requestRenderAll: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getPointer: jest.fn(() => ({ x: 0, y: 0 })),
    setDimensions: jest.fn(),
    getZoom: jest.fn(() => 1),
    setZoom: jest.fn(),
    zoomToPoint: jest.fn(),
    absolutePan: jest.fn(),
    relativePan: jest.fn(),
    getVpCenter: jest.fn(() => ({ x: 400, y: 300 })),
    centerObject: jest.fn(),
    dispose: jest.fn(),
    toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
    toJSON: jest.fn(() => ({})),
    loadFromJSON: jest.fn((data, callback) => {
      if (callback) callback();
    }),
    width: 800,
    height: 600,
    selection: true,
    skipTargetFind: false,
    renderOnAddRemove: true
  };
  
  return canvas;
}

// Mock Fabric.js object
export function mockFabricObject(type = 'rect', properties = {}) {
  const baseObject = {
    type,
    set: jest.fn(),
    get: jest.fn((key) => properties[key]),
    animate: jest.fn((property, value, options) => {
      if (options?.onChange) options.onChange(value);
      if (options?.onComplete) options.onComplete();
    }),
    getBoundingRect: jest.fn(() => ({ 
      left: properties.left || 0, 
      top: properties.top || 0, 
      width: properties.width || 100, 
      height: properties.height || 100 
    })),
    scale: jest.fn(),
    center: jest.fn(),
    centerH: jest.fn(),
    centerV: jest.fn(),
    remove: jest.fn(),
    clone: jest.fn((callback) => {
      const clone = mockFabricObject(type, { ...properties });
      if (callback) callback(clone);
      return clone;
    }),
    toObject: jest.fn(() => ({ type, ...properties })),
    on: jest.fn(),
    off: jest.fn(),
    fire: jest.fn(),
    ...properties
  };
  
  return baseObject;
}

// Create mock file for testing uploads
export function createMockFile(
  name = 'test-image.jpg',
  type = 'image/jpeg',
  size = 1024 * 1024,
  content = 'mock file content'
) {
  const file = new File([content], name, { type });
  
  // Mock additional properties
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false
  });
  
  return file;
}

// Mock FileReader for testing file uploads
export function mockFileReader() {
  const originalFileReader = global.FileReader;
  
  const mockFileReader = jest.fn(() => ({
    readAsDataURL: jest.fn(function(this: any, file: File) {
      setTimeout(() => {
        this.result = `data:${file.type};base64,mockbase64data`;
        this.onload?.({ target: { result: this.result } });
      }, 0);
    }),
    readAsArrayBuffer: jest.fn(function(this: any, file: File) {
      setTimeout(() => {
        this.result = new ArrayBuffer(8);
        this.onload?.({ target: { result: this.result } });
      }, 0);
    }),
    readAsText: jest.fn(function(this: any, file: File) {
      setTimeout(() => {
        this.result = 'mock file content';
        this.onload?.({ target: { result: this.result } });
      }, 0);
    }),
    abort: jest.fn(),
    result: null,
    error: null,
    readyState: 0,
    onload: null,
    onerror: null,
    onabort: null,
    onloadstart: null,
    onloadend: null,
    onprogress: null
  }));
  
  global.FileReader = mockFileReader as any;
  
  return () => {
    global.FileReader = originalFileReader;
  };
}

// Mock drag and drop events
export function createMockDragEvent(type: string, dataTransfer?: Partial<DataTransfer>) {
  const mockDataTransfer = {
    files: [],
    types: [],
    getData: jest.fn(),
    setData: jest.fn(),
    clearData: jest.fn(),
    dropEffect: 'none' as DataTransfer['dropEffect'],
    effectAllowed: 'all' as DataTransfer['effectAllowed'],
    items: [] as any,
    ...dataTransfer
  };

  return new DragEvent(type, {
    bubbles: true,
    cancelable: true,
    dataTransfer: mockDataTransfer as DataTransfer
  });
}

// Mock keyboard events
export function createMockKeyboardEvent(
  type: string,
  key: string,
  options: Partial<KeyboardEventInit> = {}
) {
  return new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true,
    ...options
  });
}

// Mock mouse events
export function createMockMouseEvent(
  type: string,
  clientX = 0,
  clientY = 0,
  options: Partial<MouseEventInit> = {}
) {
  return new MouseEvent(type, {
    clientX,
    clientY,
    bubbles: true,
    cancelable: true,
    ...options
  });
}

// Wait for async operations
export function waitFor(condition: () => boolean, timeout = 5000, interval = 100): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Condition not met within timeout'));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
}

// Mock intersection observer entries
export function createMockIntersectionObserverEntry(
  target: Element,
  isIntersecting = true,
  intersectionRatio = 1
) {
  return {
    target,
    isIntersecting,
    intersectionRatio,
    boundingClientRect: target.getBoundingClientRect(),
    intersectionRect: target.getBoundingClientRect(),
    rootBounds: document.documentElement.getBoundingClientRect(),
    time: Date.now()
  };
}

// Mock resize observer entries
export function createMockResizeObserverEntry(target: Element, contentRect?: DOMRectReadOnly) {
  return {
    target,
    contentRect: contentRect || target.getBoundingClientRect(),
    borderBoxSize: [{ inlineSize: 100, blockSize: 100 }],
    contentBoxSize: [{ inlineSize: 100, blockSize: 100 }],
    devicePixelContentBoxSize: [{ inlineSize: 100, blockSize: 100 }]
  };
}

// Performance testing utilities
export class PerformanceTestHelper {
  private measurements: { [key: string]: number[] } = {};
  
  startMeasurement(name: string) {
    performance.mark(`${name}-start`);
  }
  
  endMeasurement(name: string) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    if (!this.measurements[name]) {
      this.measurements[name] = [];
    }
    this.measurements[name].push(measure.duration);
    
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
  }
  
  getAverageDuration(name: string): number {
    const durations = this.measurements[name] || [];
    return durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }
  
  getMaxDuration(name: string): number {
    const durations = this.measurements[name] || [];
    return durations.length > 0 ? Math.max(...durations) : 0;
  }
  
  clear() {
    this.measurements = {};
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Accessibility testing helpers
export async function checkAccessibility(container: HTMLElement) {
  const { axe } = await import('jest-axe');
  const results = await axe(container);
  return results;
}

// Visual regression testing helpers
export function createVisualSnapshot(element: HTMLElement, name: string) {
  // This would integrate with a visual regression testing tool like Percy, Chromatic, etc.
  // For now, we'll create a simple implementation
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    const rect = element.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // This is a simplified implementation
    // In practice, you'd use html2canvas or similar
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return {
      name,
      dataUrl: canvas.toDataURL(),
      dimensions: { width: rect.width, height: rect.height }
    };
  }
  
  return null;
}

// Database/API mocking helpers
export function createMockAPIResponse<T>(data: T, status = 200, delay = 0) {
  return new Promise<{ data: T; status: number }>((resolve) => {
    setTimeout(() => {
      resolve({ data, status });
    }, delay);
  });
}

export function createMockAPIError(message = 'API Error', status = 500, delay = 0) {
  return new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, delay);
  });
}

// Export all utilities
export * from '@testing-library/react';
export * from '@testing-library/user-event';
export { renderWithProviders as render };