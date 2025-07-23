import { useState, useEffect, useCallback, useRef } from 'react';
import {
  analyticsService,
  analyticsUtils,
  DashboardData,
  OverviewMetrics,
  DashboardInsight,
  CustomReport,
  TrendData
} from '../services/analyticsService';

interface UseDashboardOptions {
  defaultTimeframe?: '24h' | '7d' | '30d' | '90d' | '1y';
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  enableRealTime?: boolean;
}

interface DashboardState {
  // Core data
  dashboardData: DashboardData | null;
  overviewMetrics: OverviewMetrics | null;
  insights: DashboardInsight[];
  customReports: CustomReport[];
  
  // UI state
  selectedTimeframe: '24h' | '7d' | '30d' | '90d' | '1y';
  selectedMetrics: string[];
  activeTab: string;
  isExpanded: boolean;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdate: Date | null;
  
  // Real-time data
  realTimeMetrics: {
    active_users: number;
    current_designs: number;
    active_collaborations: number;
    ongoing_exports: number;
    ai_requests_per_minute: number;
    system_load: number;
  } | null;
  
  // Goals and targets
  userGoals: {
    goals: Record<string, number>;
    progress: Record<string, number>;
    achievements: Array<{
      goal: string;
      achieved_at: string;
      value: number;
    }>;
  } | null;
  
  // Error handling
  error: string | null;
  retryCount: number;
}

export const useDashboard = (options: UseDashboardOptions = {}) => {
  const {
    defaultTimeframe = '30d',
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute
    enableRealTime = true
  } = options;

  const [state, setState] = useState<DashboardState>({
    dashboardData: null,
    overviewMetrics: null,
    insights: [],
    customReports: [],
    selectedTimeframe: defaultTimeframe,
    selectedMetrics: ['designs', 'collaborations', 'exports', 'ai_usage'],
    activeTab: 'overview',
    isExpanded: true,
    isLoading: false,
    isRefreshing: false,
    lastUpdate: null,
    realTimeMetrics: null,
    userGoals: null,
    error: null,
    retryCount: 0
  });

  // Refs for intervals and cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const realTimeIntervalRef = useRef<NodeJS.Timeout>();
  const retryTimeoutRef = useRef<NodeJS.Timeout>();

  // Update state helper
  const updateState = useCallback((updates: Partial<DashboardState>) => {
    setState(prevState => ({ 
      ...prevState, 
      ...updates, 
      lastUpdate: new Date() 
    }));
  }, []);

  // Load initial dashboard data
  useEffect(() => {
    loadDashboardData();
    loadInsights();
    loadCustomReports();
    loadUserGoals();
  }, [state.selectedTimeframe]);

  // Setup auto-refresh
  useEffect(() => {
    if (!autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      return;
    }

    refreshIntervalRef.current = setInterval(() => {
      refreshDashboardData();
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  // Setup real-time updates
  useEffect(() => {
    if (!enableRealTime) {
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
      }
      return;
    }

    const updateRealTimeMetrics = async () => {
      try {
        const metrics = await analyticsService.getRealTimeMetrics();
        updateState({ realTimeMetrics: metrics });
      } catch (error) {
        console.error('Failed to fetch real-time metrics:', error);
      }
    };

    // Initial load
    updateRealTimeMetrics();

    // Update every 30 seconds
    realTimeIntervalRef.current = setInterval(updateRealTimeMetrics, 30000);

    return () => {
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
      }
    };
  }, [enableRealTime]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });

      const [dashboardData, overviewMetrics] = await Promise.all([
        analyticsService.getDashboardData(state.selectedTimeframe),
        analyticsService.getOverviewMetrics(state.selectedTimeframe)
      ]);

      updateState({
        dashboardData,
        overviewMetrics,
        isLoading: false,
        retryCount: 0
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      handleError(error instanceof Error ? error.message : 'Failed to load dashboard data');
    }
  }, [state.selectedTimeframe]);

  // Refresh dashboard data
  const refreshDashboardData = useCallback(async () => {
    try {
      updateState({ isRefreshing: true, error: null });

      const [dashboardData, overviewMetrics] = await Promise.all([
        analyticsService.getDashboardData(state.selectedTimeframe),
        analyticsService.getOverviewMetrics(state.selectedTimeframe)
      ]);

      updateState({
        dashboardData,
        overviewMetrics,
        isRefreshing: false,
        retryCount: 0
      });
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
      updateState({ 
        isRefreshing: false,
        error: error instanceof Error ? error.message : 'Failed to refresh data'
      });
    }
  }, [state.selectedTimeframe]);

  // Load insights
  const loadInsights = useCallback(async () => {
    try {
      const insights = await analyticsService.getInsights();
      updateState({ insights });
    } catch (error) {
      console.error('Failed to load insights:', error);
    }
  }, []);

  // Load custom reports
  const loadCustomReports = useCallback(async () => {
    try {
      const customReports = await analyticsService.getCustomReports();
      updateState({ customReports });
    } catch (error) {
      console.error('Failed to load custom reports:', error);
    }
  }, []);

  // Load user goals
  const loadUserGoals = useCallback(async () => {
    try {
      const userGoals = await analyticsService.getUserGoals();
      updateState({ userGoals });
    } catch (error) {
      console.error('Failed to load user goals:', error);
    }
  }, []);

  // Error handling with retry logic
  const handleError = useCallback((errorMessage: string) => {
    updateState(prevState => ({
      ...prevState,
      isLoading: false,
      isRefreshing: false,
      error: errorMessage,
      retryCount: prevState.retryCount + 1
    }));

    // Auto-retry with exponential backoff
    if (state.retryCount < 3) {
      const delay = Math.pow(2, state.retryCount) * 1000; // 1s, 2s, 4s
      retryTimeoutRef.current = setTimeout(() => {
        loadDashboardData();
      }, delay);
    }
  }, [state.retryCount, loadDashboardData]);

  // Timeframe management
  const setTimeframe = useCallback((timeframe: '24h' | '7d' | '30d' | '90d' | '1y') => {
    updateState({ selectedTimeframe: timeframe });
  }, []);

  // Metrics selection
  const toggleMetric = useCallback((metric: string) => {
    updateState(prevState => ({
      ...prevState,
      selectedMetrics: prevState.selectedMetrics.includes(metric)
        ? prevState.selectedMetrics.filter(m => m !== metric)
        : [...prevState.selectedMetrics, metric]
    }));
  }, []);

  const setSelectedMetrics = useCallback((metrics: string[]) => {
    updateState({ selectedMetrics: metrics });
  }, []);

  // Tab management
  const setActiveTab = useCallback((tab: string) => {
    updateState({ activeTab: tab });
  }, []);

  // Insights management
  const dismissInsight = useCallback(async (insightId: string) => {
    try {
      await analyticsService.dismissInsight(insightId);
      updateState(prevState => ({
        ...prevState,
        insights: prevState.insights.filter(insight => insight.id !== insightId)
      }));
    } catch (error) {
      console.error('Failed to dismiss insight:', error);
    }
  }, []);

  // Custom reports management
  const createCustomReport = useCallback(async (report: Omit<CustomReport, 'id' | 'created_at' | 'last_run'>) => {
    try {
      const newReport = await analyticsService.createCustomReport(report);
      updateState(prevState => ({
        ...prevState,
        customReports: [...prevState.customReports, newReport]
      }));
      return newReport;
    } catch (error) {
      console.error('Failed to create custom report:', error);
      throw error;
    }
  }, []);

  const runCustomReport = useCallback(async (reportId: string) => {
    try {
      const result = await analyticsService.runCustomReport(reportId);
      
      // Update the report's last_run timestamp
      updateState(prevState => ({
        ...prevState,
        customReports: prevState.customReports.map(report =>
          report.id === reportId 
            ? { ...report, last_run: result.generated_at }
            : report
        )
      }));
      
      return result;
    } catch (error) {
      console.error('Failed to run custom report:', error);
      throw error;
    }
  }, []);

  const deleteCustomReport = useCallback(async (reportId: string) => {
    try {
      await analyticsService.deleteCustomReport(reportId);
      updateState(prevState => ({
        ...prevState,
        customReports: prevState.customReports.filter(report => report.id !== reportId)
      }));
    } catch (error) {
      console.error('Failed to delete custom report:', error);
      throw error;
    }
  }, []);

  // Goals management
  const setUserGoals = useCallback(async (goals: Record<string, number>) => {
    try {
      await analyticsService.setUserGoals(goals);
      await loadUserGoals(); // Refresh goals
    } catch (error) {
      console.error('Failed to set user goals:', error);
      throw error;
    }
  }, [loadUserGoals]);

  // Data export
  const exportAnalytics = useCallback(async (options: {
    timeframe: string;
    metrics: string[];
    format: 'csv' | 'json' | 'pdf';
    email?: boolean;
  }) => {
    try {
      const result = await analyticsService.exportAnalytics(options);
      return result;
    } catch (error) {
      console.error('Failed to export analytics:', error);
      throw error;
    }
  }, []);

  // Benchmarking
  const getBenchmarkData = useCallback(async (metric: string) => {
    try {
      const benchmark = await analyticsService.getBenchmarkData(metric);
      return benchmark;
    } catch (error) {
      console.error('Failed to get benchmark data:', error);
      throw error;
    }
  }, []);

  // Utility functions
  const getMetricTrend = useCallback((metricData: TrendData[]) => {
    return analyticsUtils.calculateTrend(metricData);
  }, []);

  const formatMetricValue = useCallback((value: number, type: 'number' | 'percentage' | 'duration' = 'number') => {
    switch (type) {
      case 'percentage':
        return analyticsUtils.formatPercentage(value);
      case 'duration':
        return analyticsUtils.formatDuration(value);
      default:
        return analyticsUtils.formatNumber(value);
    }
  }, []);

  const getScoreInterpretation = useCallback((score: number) => {
    return analyticsUtils.getScoreInterpretation(score);
  }, []);

  // Dashboard layout
  const toggleExpanded = useCallback(() => {
    updateState(prevState => ({ ...prevState, isExpanded: !prevState.isExpanded }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null, retryCount: 0 });
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, []);

  // Manual refresh
  const manualRefresh = useCallback(() => {
    refreshDashboardData();
    loadInsights();
    loadCustomReports();
    loadUserGoals();
  }, [refreshDashboardData, loadInsights, loadCustomReports, loadUserGoals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    ...state,
    
    // Data loading
    loadDashboardData,
    refreshDashboardData,
    manualRefresh,
    
    // Timeframe management
    setTimeframe,
    
    // Metrics management
    toggleMetric,
    setSelectedMetrics,
    
    // Tab management
    setActiveTab,
    
    // Insights
    dismissInsight,
    
    // Custom reports
    createCustomReport,
    runCustomReport,
    deleteCustomReport,
    
    // Goals
    setUserGoals,
    
    // Export
    exportAnalytics,
    
    // Benchmarking
    getBenchmarkData,
    
    // Utilities
    getMetricTrend,
    formatMetricValue,
    getScoreInterpretation,
    
    // UI state
    toggleExpanded,
    
    // Error handling
    clearError
  };
};

export default useDashboard;