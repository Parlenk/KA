import api from './api';
import { 
  mockDashboardData, 
  mockRealTimeMetrics, 
  mockUserGoals, 
  mockCustomReports 
} from '../utils/mockData';

// Analytics Types
export interface DashboardData {
  user_id: string;
  timeframe: '24h' | '7d' | '30d' | '90d' | '1y';
  overview: OverviewMetrics;
  design_analytics: DesignAnalytics;
  collaboration_metrics: CollaborationMetrics;
  performance_summary: PerformanceSummary;
  ai_usage: AIUsageMetrics;
  export_analytics: ExportAnalytics;
  brand_compliance: BrandComplianceMetrics;
  user_activity: UserActivityMetrics;
  insights: DashboardInsight[];
  generated_at: string;
}

export interface OverviewMetrics {
  total_designs: number;
  active_projects: number;
  collaborations: number;
  exports_completed: number;
  ai_interactions: number;
  performance_score: number;
  productivity_score: number;
  trends: {
    designs_created: TrendData[];
    time_spent: TrendData[];
    collaboration_hours: TrendData[];
    ai_usage: TrendData[];
  };
}

export interface DesignAnalytics {
  total_designs: number;
  designs_by_category: Record<string, number>;
  average_design_time: number;
  completion_rate: number;
  popular_templates: Array<{
    id: string;
    name: string;
    usage_count: number;
    thumbnail: string;
  }>;
  design_complexity: {
    simple: number;
    medium: number;
    complex: number;
  };
  canvas_usage: {
    average_elements: number;
    most_used_tools: Array<{
      tool: string;
      usage_count: number;
      percentage: number;
    }>;
    size_distribution: Record<string, number>;
  };
  design_trends: TrendData[];
  time_spent_by_phase: {
    planning: number;
    designing: number;
    reviewing: number;
    finalizing: number;
  };
}

export interface CollaborationMetrics {
  total_sessions: number;
  unique_collaborators: number;
  average_session_duration: number;
  real_time_hours: number;
  messages_sent: number;
  comments_made: number;
  conflicts_resolved: number;
  collaboration_efficiency: number;
  popular_features: Array<{
    feature: string;
    usage_count: number;
  }>;
  team_performance: {
    response_time: number;
    approval_rate: number;
    feedback_quality_score: number;
  };
  collaboration_trends: TrendData[];
}

export interface PerformanceSummary {
  overall_score: number;
  core_web_vitals_score: number;
  user_experience_score: number;
  load_times: {
    average: number;
    p95: number;
    improvement_over_period: number;
  };
  error_rates: {
    total_errors: number;
    error_rate_percentage: number;
    most_common_errors: Array<{
      error: string;
      count: number;
    }>;
  };
  optimization_impact: {
    suggestions_implemented: number;
    performance_improvements: number;
    user_satisfaction_increase: number;
  };
}

export interface AIUsageMetrics {
  total_requests: number;
  successful_generations: number;
  average_response_time: number;
  most_used_features: Array<{
    feature: string;
    usage_count: number;
    success_rate: number;
  }>;
  ai_efficiency: {
    time_saved: number; // in hours
    automation_rate: number; // percentage
    user_satisfaction: number; // score 1-10
  };
  feature_breakdown: {
    image_generation: number;
    text_generation: number;
    background_removal: number;
    smart_resize: number;
    color_palette: number;
  };
  cost_analysis: {
    total_cost: number;
    cost_per_request: number;
    cost_savings: number;
  };
  ai_trends: TrendData[];
}

export interface ExportAnalytics {
  total_exports: number;
  exports_by_format: Record<string, number>;
  exports_by_platform: Record<string, number>;
  average_processing_time: number;
  file_size_distribution: {
    small: number; // < 1MB
    medium: number; // 1-10MB  
    large: number; // > 10MB
  };
  quality_metrics: {
    average_quality_score: number;
    user_satisfaction: number;
    re_export_rate: number;
  };
  batch_export_usage: {
    batch_exports: number;
    average_batch_size: number;
    time_savings: number;
  };
  export_trends: TrendData[];
}

export interface BrandComplianceMetrics {
  overall_compliance_score: number;
  total_guidelines: number;
  violations_detected: number;
  auto_fixes_applied: number;
  compliance_trends: TrendData[];
  violation_breakdown: Record<string, number>;
  brand_consistency: {
    color_consistency: number;
    typography_consistency: number;
    layout_consistency: number;
    overall_consistency: number;
  };
  approval_metrics: {
    pending_approvals: number;
    approval_rate: number;
    average_approval_time: number;
  };
}

export interface UserActivityMetrics {
  total_active_time: number; // in minutes
  daily_usage_pattern: Array<{
    hour: number;
    activity_level: number;
  }>;
  feature_usage: Record<string, number>;
  productivity_metrics: {
    designs_per_hour: number;
    focus_time_percentage: number;
    multitasking_score: number;
  };
  engagement_score: number;
  learning_progress: {
    features_discovered: number;
    advanced_techniques_used: number;
    efficiency_improvement: number;
  };
}

export interface TrendData {
  date: string;
  value: number;
  change_percentage?: number;
}

export interface DashboardInsight {
  id: string;
  type: 'achievement' | 'recommendation' | 'alert' | 'tip';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action_url?: string;
  action_text?: string;
  metrics?: Record<string, number>;
  created_at: string;
}

export interface CustomReport {
  id: string;
  name: string;
  description: string;
  timeframe: string;
  metrics: string[];
  filters: Record<string, any>;
  chart_type: 'line' | 'bar' | 'pie' | 'area' | 'table';
  created_at: string;
  last_run: string;
  is_scheduled: boolean;
  schedule_frequency?: 'daily' | 'weekly' | 'monthly';
}

export interface TeamAnalytics {
  team_id: string;
  team_name: string;
  members_count: number;
  overview: {
    total_projects: number;
    active_collaborations: number;
    designs_created: number;
    avg_productivity_score: number;
  };
  collaboration_health: {
    response_time: number;
    conflict_resolution_rate: number;
    communication_quality: number;
    team_satisfaction: number;
  };
  member_performance: Array<{
    user_id: string;
    user_name: string;
    designs_created: number;
    collaboration_score: number;
    productivity_rank: number;
    specialties: string[];
  }>;
  workflow_efficiency: {
    design_to_approval_time: number;
    revision_cycles: number;
    bottlenecks: Array<{
      stage: string;
      avg_delay: number;
      impact_score: number;
    }>;
  };
}

class AnalyticsService {
  private isDemoMode = window.location.pathname.includes('/demo');

  // Dashboard data
  async getDashboardData(timeframe: '24h' | '7d' | '30d' | '90d' | '1y' = '30d'): Promise<DashboardData> {
    if (this.isDemoMode) {
      return new Promise(resolve => 
        setTimeout(() => resolve(mockDashboardData), 500)
      );
    }
    
    const response = await api.get('/analytics/dashboard', {
      params: { timeframe }
    });
    return response.data.data;
  }

  async getOverviewMetrics(timeframe: string = '30d'): Promise<OverviewMetrics> {
    if (this.isDemoMode) {
      return new Promise(resolve => 
        setTimeout(() => resolve(mockDashboardData.overview), 300)
      );
    }
    
    const response = await api.get('/analytics/overview', {
      params: { timeframe }
    });
    return response.data.data;
  }

  // Design analytics
  async getDesignAnalytics(timeframe: string = '30d'): Promise<DesignAnalytics> {
    const response = await api.get('/analytics/designs', {
      params: { timeframe }
    });
    return response.data.data;
  }

  async getDesignPerformance(designId: string): Promise<{
    views: number;
    likes: number;
    shares: number;
    exports: number;
    collaboration_sessions: number;
    time_to_complete: number;
    complexity_score: number;
    user_engagement: number;
  }> {
    const response = await api.get(`/analytics/designs/${designId}/performance`);
    return response.data.data;
  }

  async getPopularTemplates(limit: number = 10): Promise<Array<{
    id: string;
    name: string;
    category: string;
    usage_count: number;
    rating: number;
    thumbnail: string;
    trend_direction: 'up' | 'down' | 'stable';
  }>> {
    const response = await api.get('/analytics/templates/popular', {
      params: { limit }
    });
    return response.data.data;
  }

  // Collaboration analytics
  async getCollaborationMetrics(timeframe: string = '30d'): Promise<CollaborationMetrics> {
    const response = await api.get('/analytics/collaboration', {
      params: { timeframe }
    });
    return response.data.data;
  }

  async getTeamAnalytics(teamId?: string): Promise<TeamAnalytics> {
    const response = await api.get('/analytics/team', {
      params: { team_id: teamId }
    });
    return response.data.data;
  }

  // AI usage analytics
  async getAIUsageMetrics(timeframe: string = '30d'): Promise<AIUsageMetrics> {
    const response = await api.get('/analytics/ai-usage', {
      params: { timeframe }
    });
    return response.data.data;
  }

  async getAIFeaturePerformance(): Promise<Array<{
    feature: string;
    usage_count: number;
    success_rate: number;
    average_response_time: number;
    user_satisfaction: number;
    cost_per_use: number;
  }>> {
    const response = await api.get('/analytics/ai/feature-performance');
    return response.data.data;
  }

  // Export analytics
  async getExportAnalytics(timeframe: string = '30d'): Promise<ExportAnalytics> {
    const response = await api.get('/analytics/exports', {
      params: { timeframe }
    });
    return response.data.data;
  }

  async getExportTrends(metric: string, timeframe: string = '30d'): Promise<TrendData[]> {
    const response = await api.get('/analytics/exports/trends', {
      params: { metric, timeframe }
    });
    return response.data.data;
  }

  // Brand compliance analytics
  async getBrandComplianceMetrics(brandKitId?: string, timeframe: string = '30d'): Promise<BrandComplianceMetrics> {
    const response = await api.get('/analytics/brand-compliance', {
      params: { brand_kit_id: brandKitId, timeframe }
    });
    return response.data.data;
  }

  // User activity analytics
  async getUserActivityMetrics(userId?: string, timeframe: string = '30d'): Promise<UserActivityMetrics> {
    const response = await api.get('/analytics/user-activity', {
      params: { user_id: userId, timeframe }
    });
    return response.data.data;
  }

  async getProductivityInsights(timeframe: string = '30d'): Promise<{
    efficiency_score: number;
    focus_time: number;
    peak_hours: number[];
    optimization_suggestions: Array<{
      category: string;
      suggestion: string;
      potential_improvement: string;
    }>;
  }> {
    const response = await api.get('/analytics/productivity', {
      params: { timeframe }
    });
    return response.data.data;
  }

  // Custom reports
  async getCustomReports(): Promise<CustomReport[]> {
    if (this.isDemoMode) {
      return new Promise(resolve => 
        setTimeout(() => resolve(mockCustomReports), 350)
      );
    }
    
    const response = await api.get('/analytics/custom-reports');
    return response.data.data;
  }

  async createCustomReport(report: Omit<CustomReport, 'id' | 'created_at' | 'last_run'>): Promise<CustomReport> {
    const response = await api.post('/analytics/custom-reports', report);
    return response.data.data;
  }

  async runCustomReport(reportId: string): Promise<{
    report: CustomReport;
    data: any[];
    generated_at: string;
    export_url?: string;
  }> {
    const response = await api.post(`/analytics/custom-reports/${reportId}/run`);
    return response.data.data;
  }

  async deleteCustomReport(reportId: string): Promise<void> {
    await api.delete(`/analytics/custom-reports/${reportId}`);
  }

  // Insights and recommendations
  async getInsights(category?: string): Promise<DashboardInsight[]> {
    if (this.isDemoMode) {
      return new Promise(resolve => 
        setTimeout(() => resolve(mockDashboardData.insights), 400)
      );
    }
    
    const response = await api.get('/analytics/insights', {
      params: { category }
    });
    return response.data.data;
  }

  async dismissInsight(insightId: string): Promise<void> {
    await api.post(`/analytics/insights/${insightId}/dismiss`);
  }

  // Benchmarking
  async getBenchmarkData(metric: string): Promise<{
    user_value: number;
    industry_average: number;
    top_percentile: number;
    percentile_rank: number;
    comparison_insights: string[];
  }> {
    const response = await api.get('/analytics/benchmarks', {
      params: { metric }
    });
    return response.data.data;
  }

  // Real-time analytics
  async getRealTimeMetrics(): Promise<{
    active_users: number;
    current_designs: number;
    active_collaborations: number;
    ongoing_exports: number;
    ai_requests_per_minute: number;
    system_load: number;
  }> {
    if (this.isDemoMode) {
      return new Promise(resolve => 
        setTimeout(() => resolve(mockRealTimeMetrics), 200)
      );
    }
    
    const response = await api.get('/analytics/real-time');
    return response.data.data;
  }

  // Data export
  async exportAnalytics(options: {
    timeframe: string;
    metrics: string[];
    format: 'csv' | 'json' | 'pdf';
    email?: boolean;
  }): Promise<{
    export_id: string;
    download_url?: string;
    estimated_completion: string;
  }> {
    const response = await api.post('/analytics/export', options);
    return response.data.data;
  }

  async getExportStatus(exportId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    download_url?: string;
    error_message?: string;
  }> {
    const response = await api.get(`/analytics/exports/${exportId}/status`);
    return response.data.data;
  }

  // Goals and targets
  async setUserGoals(goals: {
    designs_per_week?: number;
    collaboration_hours?: number;
    ai_efficiency_target?: number;
    brand_compliance_score?: number;
  }): Promise<void> {
    await api.post('/analytics/goals', goals);
  }

  async getUserGoals(): Promise<{
    goals: Record<string, number>;
    progress: Record<string, number>;
    achievements: Array<{
      goal: string;
      achieved_at: string;
      value: number;
    }>;
  }> {
    if (this.isDemoMode) {
      return new Promise(resolve => 
        setTimeout(() => resolve(mockUserGoals), 300)
      );
    }
    
    const response = await api.get('/analytics/goals');
    return response.data.data;
  }

  // Alerts and notifications
  async createAnalyticsAlert(alert: {
    name: string;
    metric: string;
    condition: 'above' | 'below' | 'equals';
    threshold: number;
    frequency: 'real-time' | 'daily' | 'weekly';
    notification_channels: ('email' | 'push' | 'dashboard')[];
  }): Promise<string> {
    const response = await api.post('/analytics/alerts', alert);
    return response.data.data.alert_id;
  }

  async getAnalyticsAlerts(): Promise<Array<{
    id: string;
    name: string;
    metric: string;
    condition: string;
    threshold: number;
    is_active: boolean;
    last_triggered?: string;
  }>> {
    const response = await api.get('/analytics/alerts');
    return response.data.data;
  }

  // A/B testing analytics
  async getABTestResults(testId: string): Promise<{
    test_name: string;
    variants: Array<{
      variant_id: string;
      name: string;
      traffic_percentage: number;
      conversion_rate: number;
      significance: number;
      confidence_interval: [number, number];
    }>;
    winner?: string;
    statistical_significance: boolean;
    recommendations: string[];
  }> {
    const response = await api.get(`/analytics/ab-tests/${testId}/results`);
    return response.data.data;
  }
}

// Analytics utilities
export const analyticsUtils = {
  // Format numbers for display
  formatNumber(value: number, precision: number = 1): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(precision)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(precision)}K`;
    }
    return value.toFixed(precision);
  },

  // Format percentage
  formatPercentage(value: number, precision: number = 1): string {
    return `${(value * 100).toFixed(precision)}%`;
  },

  // Format duration
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  },

  // Calculate trend
  calculateTrend(data: TrendData[]): {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    isSignificant: boolean;
  } {
    if (data.length < 2) {
      return { direction: 'stable', percentage: 0, isSignificant: false };
    }

    const recent = data.slice(-7); // Last 7 data points
    const older = data.slice(-14, -7); // Previous 7 data points

    const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, d) => sum + d.value, 0) / older.length : recentAvg;

    const percentage = olderAvg !== 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
    const isSignificant = Math.abs(percentage) > 5; // 5% threshold for significance

    return {
      direction: percentage > 0 ? 'up' : percentage < 0 ? 'down' : 'stable',
      percentage: Math.abs(percentage),
      isSignificant
    };
  },

  // Generate chart colors
  generateChartColors(count: number): string[] {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  },

  // Score interpretation
  getScoreInterpretation(score: number): {
    level: 'excellent' | 'good' | 'fair' | 'poor';
    color: string;
    description: string;
  } {
    if (score >= 90) {
      return {
        level: 'excellent',
        color: '#10B981',
        description: 'Outstanding performance'
      };
    }
    if (score >= 70) {
      return {
        level: 'good',
        color: '#3B82F6',
        description: 'Good performance'
      };
    }
    if (score >= 50) {
      return {
        level: 'fair',
        color: '#F59E0B',
        description: 'Room for improvement'
      };
    }
    return {
      level: 'poor',
      color: '#EF4444',
      description: 'Needs attention'
    };
  },

  // Time range utilities
  getTimeRangeLabel(timeframe: string): string {
    const labels: Record<string, string> = {
      '24h': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 3 Months',
      '1y': 'Last Year'
    };
    return labels[timeframe] || timeframe;
  },

  // Data aggregation
  aggregateData(data: TrendData[], groupBy: 'hour' | 'day' | 'week' | 'month'): TrendData[] {
    // Implementation would group data points by the specified time unit
    // For now, returning the original data
    return data;
  },

  // Export data formatting
  formatForExport(data: any[], format: 'csv' | 'json'): string {
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    // CSV format
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' ? `"${value}"` : value;
        }).join(',')
      )
    ];
    
    return csvRows.join('\n');
  }
};

// Export singleton instance
export const analyticsService = new AnalyticsService();
export default analyticsService;