import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  CPU,
  Download,
  Eye,
  EyeOff,
  MemoryStick,
  Monitor,
  Network,
  Play,
  Pause,
  RefreshCw,
  Settings,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
  PieChart,
  LineChart,
  AlertCircle,
  Lightbulb,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { usePerformanceMonitoring } from '../../hooks/usePerformanceMonitoring';
import { PerformanceAlert, OptimizationSuggestion } from '../../services/performanceService';

interface PerformanceMonitorProps {
  position?: 'floating' | 'sidebar' | 'fullscreen';
  showMiniMode?: boolean;
  enableAutoOptimization?: boolean;
  className?: string;
}

interface MonitorUIState {
  isExpanded: boolean;
  selectedTab: 'overview' | 'metrics' | 'alerts' | 'optimization' | 'resources';
  showSettings: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  position = 'floating',
  showMiniMode = false,
  enableAutoOptimization = false,
  className = ''
}) => {
  const performance = usePerformanceMonitoring({
    enableMonitoring: true,
    enableAutoOptimization,
    reportingInterval: 30000
  });

  const [uiState, setUIState] = useState<MonitorUIState>({
    isExpanded: !showMiniMode,
    selectedTab: 'overview',
    showSettings: false,
    autoRefresh: true,
    refreshInterval: 30000
  });

  // Auto-refresh setup
  useEffect(() => {
    if (!uiState.autoRefresh) return;

    const interval = setInterval(() => {
      performance.refreshData();
    }, uiState.refreshInterval);

    return () => clearInterval(interval);
  }, [uiState.autoRefresh, uiState.refreshInterval, performance.refreshData]);

  const updateUIState = (updates: Partial<MonitorUIState>) => {
    setUIState(prev => ({ ...prev, ...updates }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    if (score >= 50) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const formatMetric = (value: number, unit: string) => {
    if (unit === 'ms') {
      return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`;
    }
    if (unit === 'MB') {
      return `${Math.round(value)}MB`;
    }
    if (unit === 'fps') {
      return `${Math.round(value)} fps`;
    }
    return `${Math.round(value * 100) / 100}`;
  };

  // Mini mode display
  if (showMiniMode && !uiState.isExpanded) {
    return (
      <div className={`fixed ${position === 'floating' ? 'bottom-4 left-4' : 'bottom-0 left-0'} z-50`}>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <button
            onClick={() => updateUIState({ isExpanded: true })}
            className="flex items-center space-x-2"
          >
            <Activity className="w-5 h-5 text-blue-600" />
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${getScoreColor(performance.overallScore)}`}>
                {performance.overallScore}
              </span>
              <div className="flex space-x-1">
                {performance.activeAlerts.length > 0 && (
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
                {performance.isMonitoring && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Settings panel
  const SettingsPanel: React.FC = () => (
    <div className="absolute top-12 right-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-10">
      <h3 className="font-medium text-gray-900 mb-3">Monitor Settings</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">Auto Refresh</label>
          <input
            type="checkbox"
            checked={uiState.autoRefresh}
            onChange={(e) => updateUIState({ autoRefresh: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-700 mb-1">Refresh Interval</label>
          <select
            value={uiState.refreshInterval}
            onChange={(e) => updateUIState({ refreshInterval: parseInt(e.target.value) })}
            className="w-full text-sm border border-gray-200 rounded px-2 py-1"
          >
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
            <option value={60000}>1 minute</option>
            <option value={300000}>5 minutes</option>
          </select>
        </div>
        
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">Monitoring</label>
          <button
            onClick={performance.isMonitoring ? performance.stopMonitoring : performance.startMonitoring}
            className={`px-2 py-1 text-xs rounded ${
              performance.isMonitoring 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {performance.isMonitoring ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>
    </div>
  );

  // Overview tab
  const OverviewTab: React.FC = () => (
    <div className="space-y-4">
      {/* Score cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg ${getScoreBg(performance.overallScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Overall Score</div>
              <div className={`text-2xl font-bold ${getScoreColor(performance.overallScore)}`}>
                {performance.overallScore}
              </div>
            </div>
            <BarChart3 className={`w-8 h-8 ${getScoreColor(performance.overallScore)}`} />
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${getScoreBg(performance.coreWebVitalsScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Core Web Vitals</div>
              <div className={`text-2xl font-bold ${getScoreColor(performance.coreWebVitalsScore)}`}>
                {performance.coreWebVitalsScore}
              </div>
            </div>
            <TrendingUp className={`w-8 h-8 ${getScoreColor(performance.coreWebVitalsScore)}`} />
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${getScoreBg(performance.userExperienceScore)}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">User Experience</div>
              <div className={`text-2xl font-bold ${getScoreColor(performance.userExperienceScore)}`}>
                {performance.userExperienceScore}
              </div>
            </div>
            <Monitor className={`w-8 h-8 ${getScoreColor(performance.userExperienceScore)}`} />
          </div>
        </div>
      </div>

      {/* Current metrics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Current Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-gray-500">LCP</div>
            <div className="text-sm font-medium">
              {formatMetric(performance.currentMetrics.lcp, 'ms')}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">FID</div>
            <div className="text-sm font-medium">
              {formatMetric(performance.currentMetrics.fid, 'ms')}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">CLS</div>
            <div className="text-sm font-medium">
              {formatMetric(performance.currentMetrics.cls, '')}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Memory</div>
            <div className="text-sm font-medium">
              {formatMetric(performance.currentMetrics.memory_usage, 'MB')}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">API Response</div>
            <div className="text-sm font-medium">
              {formatMetric(performance.currentMetrics.api_response_time, 'ms')}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Canvas FPS</div>
            <div className="text-sm font-medium">
              {formatMetric(performance.currentMetrics.canvas_fps, 'fps')}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex space-x-2">
        <button
          onClick={performance.applyOptimizations}
          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <Zap className="w-4 h-4" />
          <span>Auto Optimize</span>
        </button>
        
        <button
          onClick={() => performance.runPerformanceAudit()}
          className="flex items-center space-x-1 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Run Audit</span>
        </button>
      </div>
    </div>
  );

  // Alerts tab
  const AlertsTab: React.FC = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Active Alerts</h4>
        {performance.activeAlerts.length > 0 && (
          <button
            onClick={performance.clearAllAlerts}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        )}
      </div>
      
      {performance.activeAlerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No performance alerts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {performance.activeAlerts.map(alert => (
            <AlertItem key={alert.id} alert={alert} onDismiss={performance.clearAlert} />
          ))}
        </div>
      )}
    </div>
  );

  // Optimization tab
  const OptimizationTab: React.FC = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Optimization Suggestions</h4>
        <button
          onClick={performance.refreshData}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      
      {performance.optimizationSuggestions.length === 0 ? (
        <div className="text-center py-8">
          <Lightbulb className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No optimization suggestions available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {performance.optimizationSuggestions.slice(0, 5).map(suggestion => (
            <OptimizationItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Performance Monitor</h3>
            {performance.isMonitoring && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={performance.refreshData}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            
            <div className="relative">
              <button
                onClick={() => updateUIState({ showSettings: !uiState.showSettings })}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
              
              {uiState.showSettings && <SettingsPanel />}
            </div>
            
            {showMiniMode && (
              <button
                onClick={() => updateUIState({ isExpanded: false })}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Tab navigation */}
        <div className="flex space-x-1 mt-4">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: performance.activeAlerts.length },
            { id: 'optimization', label: 'Optimize', icon: Lightbulb }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => updateUIState({ selectedTab: tab.id as any })}
              className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                uiState.selectedTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {uiState.selectedTab === 'overview' && <OverviewTab />}
        {uiState.selectedTab === 'alerts' && <AlertsTab />}
        {uiState.selectedTab === 'optimization' && <OptimizationTab />}
      </div>

      {/* Status bar */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>
            Last updated: {performance.lastUpdate ? performance.lastUpdate.toLocaleTimeString() : 'Never'}
          </span>
          <div className="flex items-center space-x-4">
            <span>Monitoring: {performance.isMonitoring ? 'Active' : 'Inactive'}</span>
            {performance.monitoringErrors.length > 0 && (
              <span className="text-red-600">
                {performance.monitoringErrors.length} error(s)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Alert item component
const AlertItem: React.FC<{
  alert: PerformanceAlert;
  onDismiss: (id: string) => void;
}> = ({ alert, onDismiss }) => {
  const getSeverityColor = (severity: string) => {
    return severity === 'critical' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50';
  };

  const getSeverityIcon = (severity: string) => {
    return severity === 'critical' ? (
      <AlertTriangle className="w-4 h-4 text-red-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-yellow-500" />
    );
  };

  return (
    <div className={`border rounded-lg p-3 ${getSeverityColor(alert.severity)}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2 flex-1">
          {getSeverityIcon(alert.severity)}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {alert.metric}: {alert.current_value} (threshold: {alert.threshold})
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {alert.description}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              💡 {alert.recommendation}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-gray-400 hover:text-gray-600 ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Optimization item component
const OptimizationItem: React.FC<{
  suggestion: OptimizationSuggestion;
}> = ({ suggestion }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(suggestion.priority)}`}>
              {suggestion.priority}
            </span>
            <span className="text-sm font-medium text-gray-900">{suggestion.title}</span>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Impact: {suggestion.estimated_improvement}</span>
            <span>Effort: {suggestion.implementation.difficulty}</span>
            <span>Time: {suggestion.implementation.estimated_time}</span>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <h5 className="text-sm font-medium text-gray-900 mb-2">Implementation Steps:</h5>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            {suggestion.implementation.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          
          {suggestion.metrics_impact && (
            <div className="mt-3">
              <h5 className="text-sm font-medium text-gray-900 mb-2">Expected Improvements:</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {Object.entries(suggestion.metrics_impact).map(([metric, improvement]) => (
                  <div key={metric} className="flex justify-between">
                    <span className="text-gray-600">{metric.replace('_', ' ')}:</span>
                    <span className="text-green-600">+{improvement}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;