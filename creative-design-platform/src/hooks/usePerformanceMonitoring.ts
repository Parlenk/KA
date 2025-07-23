import { useState, useEffect, useCallback, useRef } from 'react';
import {
  performanceService,
  performanceUtils,
  PerformanceReport,
  PerformanceAlert,
  OptimizationSuggestion,
  ResourceUsage
} from '../services/performanceService';

interface UsePerformanceMonitoringOptions {
  enableMonitoring?: boolean;
  enableAutoOptimization?: boolean;
  alertThresholds?: {
    lcp: number; // milliseconds
    fid: number; // milliseconds
    cls: number; // score
    memory: number; // MB
    api_response: number; // milliseconds
  };
  reportingInterval?: number; // milliseconds
}

interface PerformanceState {
  // Current metrics
  currentMetrics: {
    lcp: number;
    fid: number;
    cls: number;
    memory_usage: number;
    api_response_time: number;
    canvas_fps: number;
  };
  
  // Reports and analysis
  performanceReport: PerformanceReport | null;
  optimizationSuggestions: OptimizationSuggestion[];
  activeAlerts: PerformanceAlert[];
  resourceUsage: ResourceUsage | null;
  
  // State tracking
  isMonitoring: boolean;
  lastUpdate: Date | null;
  monitoringErrors: string[];
  
  // Performance scores
  overallScore: number;
  coreWebVitalsScore: number;
  userExperienceScore: number;
}

export const usePerformanceMonitoring = (options: UsePerformanceMonitoringOptions = {}) => {
  const {
    enableMonitoring = true,
    enableAutoOptimization = false,
    alertThresholds = {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      memory: 100,
      api_response: 1000
    },
    reportingInterval = 30000 // 30 seconds
  } = options;

  const [state, setState] = useState<PerformanceState>({
    currentMetrics: {
      lcp: 0,
      fid: 0,
      cls: 0,
      memory_usage: 0,
      api_response_time: 0,
      canvas_fps: 60
    },
    performanceReport: null,
    optimizationSuggestions: [],
    activeAlerts: [],
    resourceUsage: null,
    isMonitoring: false,
    lastUpdate: null,
    monitoringErrors: [],
    overallScore: 100,
    coreWebVitalsScore: 100,
    userExperienceScore: 100
  });

  // Refs for cleanup and intervals
  const reportingIntervalRef = useRef<NodeJS.Timeout>();
  const metricsCollectionRef = useRef<NodeJS.Timeout>();

  // Update state helper
  const updateState = useCallback((updates: Partial<PerformanceState>) => {
    setState(prevState => ({ 
      ...prevState, 
      ...updates, 
      lastUpdate: new Date() 
    }));
  }, []);

  // Initialize performance monitoring
  useEffect(() => {
    if (enableMonitoring) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [enableMonitoring]);

  // Start performance monitoring
  const startMonitoring = useCallback(() => {
    try {
      performanceService.startMonitoring();
      updateState({ isMonitoring: true });

      // Set up periodic data collection
      metricsCollectionRef.current = setInterval(() => {
        collectCurrentMetrics();
      }, 5000); // Collect metrics every 5 seconds

      // Set up periodic reporting
      reportingIntervalRef.current = setInterval(() => {
        fetchPerformanceData();
      }, reportingInterval);

      // Initial data fetch
      fetchPerformanceData();
    } catch (error) {
      console.error('Failed to start performance monitoring:', error);
      updateState({
        monitoringErrors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }, [reportingInterval]);

  // Stop performance monitoring
  const stopMonitoring = useCallback(() => {
    performanceService.stopMonitoring();
    updateState({ isMonitoring: false });

    if (metricsCollectionRef.current) {
      clearInterval(metricsCollectionRef.current);
    }
    if (reportingIntervalRef.current) {
      clearInterval(reportingIntervalRef.current);
    }
  }, []);

  // Collect current metrics
  const collectCurrentMetrics = useCallback(() => {
    try {
      const memoryInfo = performanceService.measureMemoryUsage();
      
      updateState(prevState => ({
        ...prevState,
        currentMetrics: {
          ...prevState.currentMetrics,
          memory_usage: memoryInfo ? memoryInfo.used_heap_size / (1024 * 1024) : 0, // Convert to MB
        }
      }));

      // Check for performance alerts
      checkPerformanceThresholds();
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    }
  }, []);

  // Fetch performance data from server
  const fetchPerformanceData = useCallback(async () => {
    try {
      const [report, suggestions, alerts, resourceUsage] = await Promise.all([
        performanceService.getPerformanceReport('24h').catch(() => null),
        performanceService.getOptimizationSuggestions().catch(() => []),
        performanceService.getPerformanceAlerts().catch(() => []),
        performanceService.getResourceUsage().catch(() => null)
      ]);

      updateState({
        performanceReport: report,
        optimizationSuggestions: suggestions,
        activeAlerts: alerts,
        resourceUsage,
        overallScore: calculateOverallScore(report),
        coreWebVitalsScore: calculateCoreWebVitalsScore(report),
        userExperienceScore: calculateUserExperienceScore(report)
      });
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      updateState({
        monitoringErrors: [error instanceof Error ? error.message : 'Failed to fetch data']
      });
    }
  }, []);

  // Check performance thresholds and create alerts
  const checkPerformanceThresholds = useCallback(() => {
    const alerts: PerformanceAlert[] = [];
    const { currentMetrics } = state;

    // LCP threshold check
    if (currentMetrics.lcp > alertThresholds.lcp) {
      alerts.push({
        id: `lcp_alert_${Date.now()}`,
        metric: 'LCP',
        threshold: alertThresholds.lcp,
        current_value: currentMetrics.lcp,
        severity: currentMetrics.lcp > alertThresholds.lcp * 2 ? 'critical' : 'warning',
        description: 'Largest Contentful Paint is slower than recommended',
        recommendation: 'Optimize images, reduce server response times, and eliminate render-blocking resources',
        created_at: new Date().toISOString()
      });
    }

    // FID threshold check
    if (currentMetrics.fid > alertThresholds.fid) {
      alerts.push({
        id: `fid_alert_${Date.now()}`,
        metric: 'FID',
        threshold: alertThresholds.fid,
        current_value: currentMetrics.fid,
        severity: currentMetrics.fid > alertThresholds.fid * 3 ? 'critical' : 'warning',
        description: 'First Input Delay is higher than recommended',
        recommendation: 'Reduce JavaScript execution time and optimize main thread work',
        created_at: new Date().toISOString()
      });
    }

    // CLS threshold check
    if (currentMetrics.cls > alertThresholds.cls) {
      alerts.push({
        id: `cls_alert_${Date.now()}`,
        metric: 'CLS',
        threshold: alertThresholds.cls,
        current_value: currentMetrics.cls,
        severity: currentMetrics.cls > alertThresholds.cls * 2.5 ? 'critical' : 'warning',
        description: 'Cumulative Layout Shift exceeds recommended threshold',
        recommendation: 'Set explicit dimensions for images and ads, avoid inserting content above existing content',
        created_at: new Date().toISOString()
      });
    }

    // Memory threshold check
    if (currentMetrics.memory_usage > alertThresholds.memory) {
      alerts.push({
        id: `memory_alert_${Date.now()}`,
        metric: 'Memory',
        threshold: alertThresholds.memory,
        current_value: currentMetrics.memory_usage,
        severity: currentMetrics.memory_usage > alertThresholds.memory * 2 ? 'critical' : 'warning',
        description: 'Memory usage is higher than recommended',
        recommendation: 'Check for memory leaks, optimize component lifecycle, and use virtualization for large lists',
        created_at: new Date().toISOString()
      });
    }

    if (alerts.length > 0) {
      updateState(prevState => ({
        ...prevState,
        activeAlerts: [...prevState.activeAlerts, ...alerts]
      }));
    }
  }, [state.currentMetrics, alertThresholds]);

  // Performance measurement utilities
  const measureApiCall = useCallback(<T,>(
    apiCall: () => Promise<T>,
    endpoint: string,
    method: string = 'GET'
  ): Promise<T> => {
    return performanceService.measureApiCall(apiCall, endpoint, method);
  }, []);

  const measureCanvasPerformance = useCallback((canvasElement: HTMLCanvasElement) => {
    const metrics = performanceService.measureCanvasPerformance(canvasElement);
    
    updateState(prevState => ({
      ...prevState,
      currentMetrics: {
        ...prevState.currentMetrics,
        canvas_fps: metrics.frame_rate
      }
    }));

    return metrics;
  }, []);

  const measureComponentRender = useCallback((componentName: string, renderFunction: () => void) => {
    return performanceUtils.measureRender(componentName, renderFunction);
  }, []);

  // Optimization utilities
  const applyOptimizations = useCallback(async () => {
    if (!enableAutoOptimization) return;

    try {
      // Optimize images
      const images = document.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
      performanceService.optimizeImages(Array.from(images));

      // Detect and report memory leaks
      const memoryLeaks = performanceUtils.detectMemoryLeaks();
      if (memoryLeaks.length > 0) {
        console.warn('Memory leaks detected:', memoryLeaks);
      }

      // Apply lazy loading to off-screen elements
      const lazyElements = document.querySelectorAll('[data-lazy]');
      lazyElements.forEach(element => {
        if ('loading' in element) {
          (element as HTMLImageElement).loading = 'lazy';
        }
      });

      updateState(prevState => ({
        ...prevState,
        monitoringErrors: [] // Clear errors after successful optimization
      }));
    } catch (error) {
      console.error('Failed to apply optimizations:', error);
      updateState({
        monitoringErrors: [error instanceof Error ? error.message : 'Optimization failed']
      });
    }
  }, [enableAutoOptimization]);

  // Run performance audit
  const runPerformanceAudit = useCallback(async () => {
    try {
      const audit = await performanceService.runPerformanceAudit();
      return audit;
    } catch (error) {
      console.error('Performance audit failed:', error);
      throw error;
    }
  }, []);

  // Bundle analysis
  const analyzeBundleSize = useCallback(async () => {
    try {
      const analysis = await performanceService.analyzeBundleSize();
      return analysis;
    } catch (error) {
      console.error('Bundle analysis failed:', error);
      throw error;
    }
  }, []);

  // Score calculations
  const calculateOverallScore = (report: PerformanceReport | null): number => {
    if (!report) return 100;
    
    const weights = {
      core_web_vitals: 0.4,
      load_time: 0.3,
      error_rate: 0.2,
      user_satisfaction: 0.1
    };

    const coreWebVitalsScore = report.summary.core_web_vitals_score || 100;
    const loadTimeScore = Math.max(0, 100 - (report.summary.average_load_time / 1000) * 10);
    const errorRateScore = Math.max(0, 100 - report.summary.error_rate * 100);
    const userSatisfactionScore = report.summary.user_satisfaction_score || 100;

    return Math.round(
      coreWebVitalsScore * weights.core_web_vitals +
      loadTimeScore * weights.load_time +
      errorRateScore * weights.error_rate +
      userSatisfactionScore * weights.user_satisfaction
    );
  };

  const calculateCoreWebVitalsScore = (report: PerformanceReport | null): number => {
    if (!report) return 100;
    return report.summary.core_web_vitals_score || 100;
  };

  const calculateUserExperienceScore = (report: PerformanceReport | null): number => {
    if (!report) return 100;
    return report.summary.user_satisfaction_score || 100;
  };

  // Performance utilities for components
  const debounce = performanceUtils.debounce;
  const throttle = performanceUtils.throttle;
  const calculateVisibleRange = performanceUtils.calculateVisibleRange;

  // Record custom metrics
  const recordMetric = useCallback((name: string, value: number, tags?: Record<string, string>) => {
    performanceService.recordMetric(name, value, tags);
  }, []);

  // Clear alerts
  const clearAlert = useCallback((alertId: string) => {
    updateState(prevState => ({
      ...prevState,
      activeAlerts: prevState.activeAlerts.filter(alert => alert.id !== alertId)
    }));
  }, []);

  const clearAllAlerts = useCallback(() => {
    updateState(prevState => ({
      ...prevState,
      activeAlerts: []
    }));
  }, []);

  // Refresh data
  const refreshData = useCallback(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  // Clear errors
  const clearErrors = useCallback(() => {
    updateState({ monitoringErrors: [] });
  }, []);

  return {
    // State
    ...state,
    
    // Monitoring controls
    startMonitoring,
    stopMonitoring,
    refreshData,
    
    // Measurement utilities
    measureApiCall,
    measureCanvasPerformance,
    measureComponentRender,
    recordMetric,
    
    // Optimization
    applyOptimizations,
    runPerformanceAudit,
    analyzeBundleSize,
    
    // Alert management
    clearAlert,
    clearAllAlerts,
    clearErrors,
    
    // Performance utilities
    debounce,
    throttle,
    calculateVisibleRange
  };
};

export default usePerformanceMonitoring;