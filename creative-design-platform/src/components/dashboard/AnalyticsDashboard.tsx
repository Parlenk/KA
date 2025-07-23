import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Download,
  Zap,
  Target,
  Clock,
  Award,
  AlertCircle,
  RefreshCw,
  Settings,
  Calendar,
  Filter,
  ExternalLink,
  Eye,
  ChevronDown,
  ChevronUp,
  Plus,
  Share,
  Bookmark,
  Bell,
  PieChart,
  LineChart,
  Activity,
  Layers,
  Palette,
  Monitor
} from 'lucide-react';
import { useDashboard } from '../../hooks/useDashboard';
import { analyticsUtils } from '../../services/analyticsService';

interface AnalyticsDashboardProps {
  className?: string;
  showSidebar?: boolean;
  defaultTimeframe?: '24h' | '7d' | '30d' | '90d' | '1y';
}

interface DashboardUIState {
  sidebarCollapsed: boolean;
  showFilters: boolean;
  selectedWidgets: string[];
  viewMode: 'grid' | 'list';
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  className = '',
  showSidebar = true,
  defaultTimeframe = '30d'
}) => {
  const dashboard = useDashboard({
    defaultTimeframe,
    autoRefresh: true,
    refreshInterval: 60000,
    enableRealTime: true
  });

  const [uiState, setUIState] = useState<DashboardUIState>({
    sidebarCollapsed: false,
    showFilters: false,
    selectedWidgets: ['overview', 'designs', 'collaboration', 'ai', 'performance'],
    viewMode: 'grid'
  });

  const updateUIState = (updates: Partial<DashboardUIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  };

  const timeframeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 3 Months' },
    { value: '1y', label: 'Last Year' }
  ];

  const getTrendIcon = (trend: { direction: 'up' | 'down' | 'stable'; percentage: number }) => {
    if (trend.direction === 'up') {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    }
    if (trend.direction === 'down') {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  const formatTrendText = (trend: { direction: 'up' | 'down' | 'stable'; percentage: number }) => {
    if (trend.direction === 'stable') return 'No change';
    return `${trend.percentage.toFixed(1)}% ${trend.direction}`;
  };

  // Header component
  const DashboardHeader: React.FC = () => (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track your design performance and productivity
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Real-time indicator */}
          {dashboard.realTimeMetrics && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-green-700">Live</span>
            </div>
          )}
          
          {/* Timeframe selector */}
          <select
            value={dashboard.selectedTimeframe}
            onChange={(e) => dashboard.setTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timeframeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Refresh button */}
          <button
            onClick={dashboard.manualRefresh}
            disabled={dashboard.isRefreshing}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${dashboard.isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Settings */}
          <button
            onClick={() => updateUIState({ showFilters: !uiState.showFilters })}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Last updated */}
      {dashboard.lastUpdate && (
        <div className="mt-2 text-xs text-gray-500">
          Last updated: {dashboard.lastUpdate.toLocaleTimeString()}
        </div>
      )}
    </div>
  );

  // Overview metrics component
  const OverviewMetrics: React.FC = () => {
    if (!dashboard.overviewMetrics) return null;

    const metrics = [
      {
        label: 'Total Designs',
        value: dashboard.overviewMetrics.total_designs,
        icon: FileText,
        color: 'blue',
        trend: dashboard.getMetricTrend(dashboard.overviewMetrics.trends.designs_created)
      },
      {
        label: 'Active Projects',
        value: dashboard.overviewMetrics.active_projects,
        icon: Layers,
        color: 'green',
        trend: { direction: 'stable' as const, percentage: 0, isSignificant: false }
      },
      {
        label: 'Collaborations',
        value: dashboard.overviewMetrics.collaborations,
        icon: Users,
        color: 'purple',
        trend: dashboard.getMetricTrend(dashboard.overviewMetrics.trends.collaboration_hours)
      },
      {
        label: 'AI Interactions',
        value: dashboard.overviewMetrics.ai_interactions,
        icon: Zap,
        color: 'yellow',
        trend: dashboard.getMetricTrend(dashboard.overviewMetrics.trends.ai_usage)
      },
      {
        label: 'Performance Score',
        value: dashboard.overviewMetrics.performance_score,
        icon: Target,
        color: 'red',
        trend: { direction: 'stable' as const, percentage: 0, isSignificant: false },
        isScore: true
      },
      {
        label: 'Productivity Score',
        value: dashboard.overviewMetrics.productivity_score,
        icon: TrendingUp,
        color: 'indigo',
        trend: { direction: 'stable' as const, percentage: 0, isSignificant: false },
        isScore: true
      }
    ];

    const getColorClasses = (color: string) => {
      const colors: Record<string, string> = {
        blue: 'bg-blue-500 text-blue-100',
        green: 'bg-green-500 text-green-100',
        purple: 'bg-purple-500 text-purple-100',
        yellow: 'bg-yellow-500 text-yellow-100',
        red: 'bg-red-500 text-red-100',
        indigo: 'bg-indigo-500 text-indigo-100'
      };
      return colors[color] || 'bg-gray-500 text-gray-100';
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${getColorClasses(metric.color)}`}>
                <metric.icon className="w-6 h-6" />
              </div>
              <div className="flex items-center space-x-1">
                {getTrendIcon(metric.trend)}
                <span className={`text-xs ${
                  metric.trend.direction === 'up' ? 'text-green-600' :
                  metric.trend.direction === 'down' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {formatTrendText(metric.trend)}
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {metric.isScore 
                  ? metric.value
                  : dashboard.formatMetricValue(metric.value)
                }
                {metric.isScore && <span className="text-sm text-gray-500">/100</span>}
              </div>
              <div className="text-sm text-gray-600">{metric.label}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Real-time metrics component
  const RealTimeMetrics: React.FC = () => {
    if (!dashboard.realTimeMetrics) return null;

    const realTimeData = [
      { label: 'Active Users', value: dashboard.realTimeMetrics.active_users, icon: Users },
      { label: 'Current Designs', value: dashboard.realTimeMetrics.current_designs, icon: FileText },
      { label: 'Active Collaborations', value: dashboard.realTimeMetrics.active_collaborations, icon: Users },
      { label: 'Ongoing Exports', value: dashboard.realTimeMetrics.ongoing_exports, icon: Download },
      { label: 'AI Requests/min', value: dashboard.realTimeMetrics.ai_requests_per_minute, icon: Zap }
    ];

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Real-Time Activity</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-600">Live</span>
          </div>
        </div>
        
        <div className="grid grid-cols-5 gap-6">
          {realTimeData.map((item, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3">
                <item.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-sm text-gray-600">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Insights component
  const InsightsPanel: React.FC = () => {
    if (dashboard.insights.length === 0) return null;

    const getInsightIcon = (type: string) => {
      switch (type) {
        case 'achievement': return Award;
        case 'recommendation': return Target;
        case 'alert': return AlertCircle;
        case 'tip': return Zap;
        default: return AlertCircle;
      }
    };

    const getInsightColor = (type: string, priority: string) => {
      if (type === 'alert') return 'border-red-200 bg-red-50';
      if (priority === 'high') return 'border-yellow-200 bg-yellow-50';
      return 'border-blue-200 bg-blue-50';
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Insights & Recommendations</h3>
          <span className="text-sm text-gray-500">{dashboard.insights.length} insights</span>
        </div>
        
        <div className="space-y-4">
          {dashboard.insights.slice(0, 5).map(insight => {
            const IconComponent = getInsightIcon(insight.type);
            return (
              <div
                key={insight.id}
                className={`border rounded-lg p-4 ${getInsightColor(insight.type, insight.priority)}`}
              >
                <div className="flex items-start space-x-3">
                  <IconComponent className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                    
                    {insight.action_url && (
                      <a
                        href={insight.action_url}
                        className="inline-flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <span>{insight.action_text || 'Learn more'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  
                  <button
                    onClick={() => dashboard.dismissInsight(insight.id)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Goals progress component
  const GoalsProgress: React.FC = () => {
    if (!dashboard.userGoals) return null;

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Goals Progress</h3>
          <button className="text-sm text-blue-600 hover:text-blue-700">
            Edit Goals
          </button>
        </div>
        
        <div className="space-y-4">
          {Object.entries(dashboard.userGoals.goals).map(([goal, target]) => {
            const progress = dashboard.userGoals!.progress[goal] || 0;
            const percentage = Math.min((progress / target) * 100, 100);
            
            return (
              <div key={goal} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {goal.replace('_', ' ')}
                  </span>
                  <span className="text-sm text-gray-600">
                    {dashboard.formatMetricValue(progress)} / {dashboard.formatMetricValue(target)}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                <div className="text-xs text-gray-500">
                  {percentage.toFixed(0)}% complete
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Recent achievements */}
        {dashboard.userGoals.achievements.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Achievements</h4>
            <div className="space-y-2">
              {dashboard.userGoals.achievements.slice(0, 3).map((achievement, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">
                    {achievement.goal}: {dashboard.formatMetricValue(achievement.value)}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(achievement.achieved_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Custom reports component
  const CustomReports: React.FC = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Custom Reports</h3>
        <button className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span>New Report</span>
        </button>
      </div>
      
      {dashboard.customReports.length === 0 ? (
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Custom Reports</h4>
          <p className="text-gray-600 mb-4">Create custom reports to track specific metrics</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create Your First Report
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {dashboard.customReports.map(report => (
            <div key={report.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <h4 className="font-medium text-gray-900">{report.name}</h4>
                <p className="text-sm text-gray-600">{report.description}</p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>Last run: {report.last_run ? new Date(report.last_run).toLocaleDateString() : 'Never'}</span>
                  <span>Metrics: {report.metrics.length}</span>
                  {report.is_scheduled && <span className="text-green-600">Scheduled</span>}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => dashboard.runCustomReport(report.id)}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  title="Run report"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Loading state
  if (dashboard.isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (dashboard.error) {
    return (
      <div className={`min-h-screen bg-gray-50 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load dashboard</h3>
            <p className="text-gray-600 mb-4">{dashboard.error}</p>
            <button
              onClick={dashboard.clearError}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <DashboardHeader />
      
      <div className="px-6 py-8">
        <OverviewMetrics />
        <RealTimeMetrics />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <InsightsPanel />
            <GoalsProgress />
          </div>
          
          <div>
            <CustomReports />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;