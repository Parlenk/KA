/**
 * Comprehensive Testing Framework
 * Unit, Integration, E2E, Performance, and Accessibility Testing
 */

import { render, screen, fireEvent, waitFor, RenderOptions } from '@testing-library/react';
import { jest } from '@jest/globals';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

export interface TestSuite {
  name: string;
  tests: TestCase[];
  setup?: () => void;
  teardown?: () => void;
}

export interface TestCase {
  name: string;
  test: () => Promise<void> | void;
  timeout?: number;
  skip?: boolean;
  only?: boolean;
}

export interface PerformanceMetrics {
  renderTime: number;
  interactionTime: number;
  memoryUsage: number;
  bundleSize?: number;
}

export interface AccessibilityReport {
  violations: any[];
  passes: any[];
  incomplete: any[];
  score: number;
}

export class ComprehensiveTestRunner {
  private testSuites: TestSuite[] = [];
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map();
  private accessibilityReports: Map<string, AccessibilityReport> = new Map();

  /**
   * Register a test suite
   */
  addTestSuite(suite: TestSuite): void {
    this.testSuites.push(suite);
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    total: number;
    performance: Map<string, PerformanceMetrics>;
    accessibility: Map<string, AccessibilityReport>;
  }> {
    let passed = 0;
    let failed = 0;
    let total = 0;

    for (const suite of this.testSuites) {
      console.log(`\n🧪 Running test suite: ${suite.name}`);
      
      if (suite.setup) {
        suite.setup();
      }

      for (const testCase of suite.tests) {
        if (testCase.skip) {
          console.log(`⏭️  Skipping: ${testCase.name}`);
          continue;
        }

        total++;
        
        try {
          const startTime = performance.now();
          await testCase.test();
          const endTime = performance.now();
          
          console.log(`✅ ${testCase.name} (${(endTime - startTime).toFixed(2)}ms)`);
          passed++;
        } catch (error) {
          console.error(`❌ ${testCase.name}: ${error}`);
          failed++;
        }
      }

      if (suite.teardown) {
        suite.teardown();
      }
    }

    return {
      passed,
      failed,
      total,
      performance: this.performanceMetrics,
      accessibility: this.accessibilityReports
    };
  }

  /**
   * Performance testing utilities
   */
  async measurePerformance<T>(
    name: string,
    operation: () => Promise<T> | T
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    const result = await operation();
    
    const endTime = performance.now();
    const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    const metrics: PerformanceMetrics = {
      renderTime: endTime - startTime,
      interactionTime: 0,
      memoryUsage: endMemory - startMemory
    };
    
    this.performanceMetrics.set(name, metrics);
    
    return { result, metrics };
  }

  /**
   * Accessibility testing
   */
  async testAccessibility(container: HTMLElement, testName: string): Promise<AccessibilityReport> {
    const results = await axe(container);
    
    const report: AccessibilityReport = {
      violations: results.violations,
      passes: results.passes,
      incomplete: results.incomplete,
      score: this.calculateAccessibilityScore(results)
    };
    
    this.accessibilityReports.set(testName, report);
    
    // Expect no violations for WCAG compliance
    expect(results).toHaveNoViolations();
    
    return report;
  }

  private calculateAccessibilityScore(results: any): number {
    const totalTests = results.violations.length + results.passes.length;
    if (totalTests === 0) return 100;
    
    const passedTests = results.passes.length;
    return Math.round((passedTests / totalTests) * 100);
  }
}

/**
 * Component Testing Utilities
 */
export class ComponentTestUtils {
  /**
   * Render component with accessibility testing
   */
  static async renderWithA11y(
    component: React.ReactElement,
    options?: RenderOptions
  ): Promise<{ container: HTMLElement; a11yReport: AccessibilityReport }> {
    const { container } = render(component, options);
    
    const testRunner = new ComprehensiveTestRunner();
    const a11yReport = await testRunner.testAccessibility(container, 'component-test');
    
    return { container, a11yReport };
  }

  /**
   * Test component performance
   */
  static async testPerformance(
    componentFactory: () => React.ReactElement,
    interactions?: Array<() => Promise<void>>
  ): Promise<PerformanceMetrics> {
    const testRunner = new ComprehensiveTestRunner();
    
    const { metrics } = await testRunner.measurePerformance('component-render', async () => {
      const { container } = render(componentFactory());
      
      if (interactions) {
        const interactionStart = performance.now();
        
        for (const interaction of interactions) {
          await interaction();
        }
        
        const interactionEnd = performance.now();
        return { container, interactionTime: interactionEnd - interactionStart };
      }
      
      return { container, interactionTime: 0 };
    });
    
    return metrics;
  }

  /**
   * Test keyboard navigation
   */
  static async testKeyboardNavigation(
    component: React.ReactElement,
    expectedFocusOrder: string[]
  ): Promise<void> {
    const { container } = render(component);
    const user = userEvent.setup();
    
    // Start from the first focusable element
    const firstElement = container.querySelector('[tabindex], input, button, select, textarea, a[href]') as HTMLElement;
    firstElement?.focus();
    
    for (let i = 0; i < expectedFocusOrder.length - 1; i++) {
      await user.tab();
      
      const expectedSelector = expectedFocusOrder[i + 1];
      const expectedElement = container.querySelector(expectedSelector);
      
      expect(document.activeElement).toBe(expectedElement);
    }
  }

  /**
   * Test responsive behavior
   */
  static async testResponsive(
    component: React.ReactElement,
    breakpoints: Array<{ width: number; height: number; name: string }>
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const breakpoint of breakpoints) {
      // Simulate viewport size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: breakpoint.width,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: breakpoint.height,
      });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
      
      const { container } = render(component);
      
      // Check if component renders without errors
      const hasContent = container.textContent !== '';
      const hasValidLayout = !container.querySelector('.layout-error');
      
      results.set(breakpoint.name, hasContent && hasValidLayout);
    }
    
    return results;
  }
}

/**
 * API Testing Utilities
 */
export class APITestUtils {
  /**
   * Mock API responses
   */
  static mockAPIResponse(url: string, response: any, status: number = 200): void {
    global.fetch = jest.fn().mockImplementation((input: string) => {
      if (input.includes(url)) {
        return Promise.resolve({
          ok: status >= 200 && status < 300,
          status,
          json: () => Promise.resolve(response),
          text: () => Promise.resolve(JSON.stringify(response))
        });
      }
      return Promise.reject(new Error('Unmocked URL'));
    });
  }

  /**
   * Test API error handling
   */
  static async testAPIErrorHandling(
    apiCall: () => Promise<any>,
    expectedErrors: Array<{ status: number; message: string }>
  ): Promise<void> {
    for (const expectedError of expectedErrors) {
      global.fetch = jest.fn().mockRejectedValue(new Error(expectedError.message));
      
      try {
        await apiCall();
        throw new Error('API call should have failed');
      } catch (error) {
        expect(error.message).toContain(expectedError.message);
      }
    }
  }

  /**
   * Test API performance
   */
  static async testAPIPerformance(
    apiCall: () => Promise<any>,
    maxResponseTime: number = 1000
  ): Promise<{ responseTime: number; success: boolean }> {
    const startTime = performance.now();
    
    try {
      await apiCall();
      const responseTime = performance.now() - startTime;
      
      return {
        responseTime,
        success: responseTime <= maxResponseTime
      };
    } catch (error) {
      return {
        responseTime: performance.now() - startTime,
        success: false
      };
    }
  }
}

/**
 * E2E Testing Utilities
 */
export class E2ETestUtils {
  /**
   * Test complete user workflow
   */
  static async testUserWorkflow(
    steps: Array<{
      name: string;
      action: () => Promise<void>;
      assertion: () => Promise<void>;
    }>
  ): Promise<{ completed: number; failed: number; errors: string[] }> {
    let completed = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const step of steps) {
      try {
        console.log(`Executing step: ${step.name}`);
        await step.action();
        await step.assertion();
        completed++;
      } catch (error) {
        failed++;
        errors.push(`${step.name}: ${error.message}`);
      }
    }
    
    return { completed, failed, errors };
  }

  /**
   * Test application state persistence
   */
  static async testStatePersistence(
    setupState: () => Promise<void>,
    validateState: () => Promise<boolean>
  ): Promise<boolean> {
    // Setup initial state
    await setupState();
    
    // Simulate page reload
    window.location.reload();
    
    // Wait for app to load
    await waitFor(() => {
      return document.querySelector('[data-testid="app-loaded"]');
    });
    
    // Validate state persisted
    return await validateState();
  }
}

/**
 * Canvas Testing Utilities
 */
export class CanvasTestUtils {
  /**
   * Test canvas rendering performance
   */
  static async testCanvasPerformance(
    canvas: HTMLCanvasElement,
    drawFunction: (ctx: CanvasRenderingContext2D) => void,
    iterations: number = 100
  ): Promise<{ averageFrameTime: number; fps: number }> {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    
    const frameTimes: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      drawFunction(ctx);
      
      const endTime = performance.now();
      frameTimes.push(endTime - startTime);
    }
    
    const averageFrameTime = frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length;
    const fps = 1000 / averageFrameTime;
    
    return { averageFrameTime, fps };
  }

  /**
   * Test canvas object interactions
   */
  static async testCanvasInteraction(
    canvas: HTMLCanvasElement,
    interaction: { x: number; y: number; type: 'click' | 'drag' }
  ): Promise<boolean> {
    const rect = canvas.getBoundingClientRect();
    const x = interaction.x + rect.left;
    const y = interaction.y + rect.top;
    
    if (interaction.type === 'click') {
      fireEvent.click(canvas, { clientX: x, clientY: y });
    } else if (interaction.type === 'drag') {
      fireEvent.mouseDown(canvas, { clientX: x, clientY: y });
      fireEvent.mouseMove(canvas, { clientX: x + 10, clientY: y + 10 });
      fireEvent.mouseUp(canvas, { clientX: x + 10, clientY: y + 10 });
    }
    
    // Wait for any animations or state updates
    await waitFor(() => {
      return new Promise(resolve => setTimeout(resolve, 100));
    });
    
    return true;
  }
}

/**
 * Test Data Factories
 */
export class TestDataFactory {
  static createUser(overrides: Partial<any> = {}) {
    return {
      id: 'test-user-1',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }
  
  static createProject(overrides: Partial<any> = {}) {
    return {
      id: 'test-project-1',
      name: 'Test Project',
      userId: 'test-user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }
  
  static createDesign(overrides: Partial<any> = {}) {
    return {
      id: 'test-design-1',
      name: 'Test Design',
      projectId: 'test-project-1',
      width: 800,
      height: 600,
      content: {},
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }
}

/**
 * Global test setup
 */
export function setupTestEnvironment(): void {
  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  
  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
  
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  
  // Mock canvas context
  const mockContext = {
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Array(4) })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Array(4) })),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
  };
  
  HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext);
}

// Export singleton instances
export const testRunner = new ComprehensiveTestRunner();
export const componentTestUtils = ComponentTestUtils;
export const apiTestUtils = APITestUtils;
export const e2eTestUtils = E2ETestUtils;
export const canvasTestUtils = CanvasTestUtils;
export const testDataFactory = TestDataFactory;