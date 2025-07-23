/**
 * Jest Test Setup
 * Global test configuration and mocks for the design platform
 */

import '@testing-library/jest-dom';
import 'jest-canvas-mock';
import { configure } from '@testing-library/react';
import { TextEncoder, TextDecoder } from 'util';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: true
});

// Global mocks
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock Web APIs
Object.defineProperty(window, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    subtle: {
      importKey: jest.fn(),
      encrypt: jest.fn(),
      decrypt: jest.fn(),
      generateKey: jest.fn()
    }
  }
});

// Mock Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn((contextType: string) => {
  if (contextType === '2d') {
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4)
      })),
      putImageData: jest.fn(),
      createImageData: jest.fn(() => ({
        data: new Uint8ClampedArray(4)
      })),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      scale: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      transform: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      stroke: jest.fn(),
      fill: jest.fn(),
      canvas: {
        width: 800,
        height: 600
      }
    };
  }
  if (contextType === 'webgl' || contextType === 'webgl2') {
    return {
      createShader: jest.fn(),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      getShaderParameter: jest.fn(() => true),
      createProgram: jest.fn(),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      getProgramParameter: jest.fn(() => true),
      useProgram: jest.fn(),
      createBuffer: jest.fn(),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      getAttribLocation: jest.fn(() => 0),
      getUniformLocation: jest.fn(() => ({})),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),
      uniform1f: jest.fn(),
      uniformMatrix4fv: jest.fn(),
      drawArrays: jest.fn(),
      viewport: jest.fn(),
      clear: jest.fn(),
      enable: jest.fn(),
      blendFunc: jest.fn(),
      createTexture: jest.fn(),
      bindTexture: jest.fn(),
      texImage2D: jest.fn(),
      texParameteri: jest.fn(),
      activeTexture: jest.fn(),
      uniform1i: jest.fn(),
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      COMPILE_STATUS: 35713,
      LINK_STATUS: 35714,
      COLOR_BUFFER_BIT: 16384,
      TEXTURE_2D: 3553,
      TEXTURE0: 33984,
      CLAMP_TO_EDGE: 33071,
      LINEAR: 9729,
      BLEND: 3042,
      SRC_ALPHA: 770,
      ONE_MINUS_SRC_ALPHA: 771,
      TRIANGLE_STRIP: 5,
      FLOAT: 5126,
      ARRAY_BUFFER: 34962,
      STATIC_DRAW: 35044,
      RGBA: 6408,
      UNSIGNED_BYTE: 5121
    };
  }
  return null;
});

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock');
HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
  top: 0,
  left: 0,
  bottom: 600,
  right: 800,
  width: 800,
  height: 600,
  x: 0,
  y: 0,
  toJSON: jest.fn()
}));

// Mock Fabric.js
jest.mock('fabric', () => ({
  fabric: {
    Canvas: jest.fn().mockImplementation(() => ({
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
      loadFromJSON: jest.fn(),
      width: 800,
      height: 600,
      selection: true,
      skipTargetFind: false,
      renderOnAddRemove: true
    })),
    Object: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      animate: jest.fn(),
      getBoundingRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })),
      scale: jest.fn(),
      center: jest.fn(),
      centerH: jest.fn(),
      centerV: jest.fn(),
      remove: jest.fn(),
      clone: jest.fn(),
      toObject: jest.fn(() => ({})),
      on: jest.fn(),
      off: jest.fn()
    })),
    Rect: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      animate: jest.fn(),
      getBoundingRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })),
      scale: jest.fn(),
      type: 'rect'
    })),
    Circle: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      animate: jest.fn(),
      getBoundingRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })),
      scale: jest.fn(),
      type: 'circle'
    })),
    Text: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      animate: jest.fn(),
      getBoundingRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })),
      scale: jest.fn(),
      type: 'text'
    })),
    Image: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      animate: jest.fn(),
      getBoundingRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })),
      scale: jest.fn(),
      type: 'image'
    })),
    Group: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      animate: jest.fn(),
      getBoundingRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })),
      scale: jest.fn(),
      addWithUpdate: jest.fn(),
      getObjects: jest.fn(() => []),
      type: 'group'
    })),
    Polygon: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      animate: jest.fn(),
      getBoundingRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })),
      scale: jest.fn(),
      type: 'polygon'
    })),
    Path: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      get: jest.fn(),
      animate: jest.fn(),
      getBoundingRect: jest.fn(() => ({ left: 0, top: 0, width: 100, height: 100 })),
      scale: jest.fn(),
      type: 'path'
    })),
    Shadow: jest.fn().mockImplementation(() => ({})),
    Gradient: jest.fn().mockImplementation(() => ({})),
    util: {
      object: {
        clone: jest.fn((obj) => ({ ...obj }))
      }
    }
  }
}));

// Mock DOMPurify
jest.mock('dompurify', () => ({
  default: {
    sanitize: jest.fn((dirty) => dirty),
    addHook: jest.fn(),
    removeHook: jest.fn(),
    isValidAttribute: jest.fn(() => true)
  },
  sanitize: jest.fn((dirty) => dirty),
  addHook: jest.fn(),
  removeHook: jest.fn(),
  isValidAttribute: jest.fn(() => true)
}));

// Mock localStorage
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockStorage
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockStorage
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock MutationObserver
global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn()
}));

// Mock window.requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id));

// Mock console methods for cleaner test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn((...args) => {
    // Only show errors that aren't React testing warnings
    if (typeof args[0] === 'string' && !args[0].includes('Warning:')) {
      originalError(...args);
    }
  });
  
  console.warn = jest.fn((...args) => {
    // Only show warnings that aren't React testing warnings
    if (typeof args[0] === 'string' && !args[0].includes('Warning:')) {
      originalWarn(...args);
    }
  });
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Custom matchers
expect.extend({
  toHaveAccessibleName(received, expected) {
    const accessibleName = received.getAttribute('aria-label') || 
                          received.getAttribute('aria-labelledby') ||
                          received.textContent;
    
    const pass = accessibleName === expected;
    
    return {
      message: () => 
        pass 
          ? `Expected element not to have accessible name "${expected}"`
          : `Expected element to have accessible name "${expected}", but got "${accessibleName}"`,
      pass
    };
  },
  
  toBeAccessible(received) {
    const hasAriaLabel = received.hasAttribute('aria-label');
    const hasAriaLabelledBy = received.hasAttribute('aria-labelledby');
    const hasRole = received.hasAttribute('role');
    const hasTextContent = received.textContent && received.textContent.trim().length > 0;
    
    const pass = hasAriaLabel || hasAriaLabelledBy || hasRole || hasTextContent;
    
    return {
      message: () =>
        pass
          ? `Expected element not to be accessible`
          : `Expected element to be accessible (have aria-label, aria-labelledby, role, or text content)`,
      pass
    };
  }
});

// Global test utilities
global.testUtils = {
  // Wait for next tick
  waitForNextTick: () => new Promise(resolve => setTimeout(resolve, 0)),
  
  // Create mock canvas
  createMockCanvas: () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    return canvas;
  },
  
  // Create mock fabric canvas
  createMockFabricCanvas: () => {
    const mockCanvas = {
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
      width: 800,
      height: 600
    };
    return mockCanvas;
  },
  
  // Mock file
  createMockFile: (name = 'test.jpg', type = 'image/jpeg', size = 1024) => {
    const file = new File(['test content'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  },
  
  // Mock security context
  mockSecurityContext: () => ({
    validateFile: jest.fn(() => ({ isValid: true, errors: [] })),
    sanitizeHtml: jest.fn(content => content),
    generateSecureToken: jest.fn(() => 'mock-token'),
    csrfToken: {
      get: jest.fn(() => 'mock-csrf-token'),
      validate: jest.fn(() => true)
    }
  })
};

// Set up accessibility testing
import { toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);