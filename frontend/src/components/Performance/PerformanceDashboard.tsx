import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Zap, 
  Monitor, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Settings,
  BarChart3
} from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  objectCount: number;
  visibleObjects: number;
  frameRate: number;
  memoryUsage: number;
  cpuUsage?: number;
  cacheHitRate?: number;
  networkLatency?: number;
}

interface PerformanceDashboardProps {
  metrics: PerformanceMetrics[];
  isVisible: boolean;
  onClose: () => void;
  onOptimizationToggle: (optimization: string, enabled: boolean) => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  metrics,
  isVisible,
  onClose,
  onOptimizationToggle
}) => {
  const [selectedTab, setSelectedTab] = useState<'metrics' | 'optimizations' | 'memory'>('metrics');
  const [autoOptimize, setAutoOptimize] = useState(true);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([]);

  const latestMetrics = metrics[metrics.length - 1] || {
    renderTime: 0,
    objectCount: 0,
    visibleObjects: 0,
    frameRate: 0,
    memoryUsage: 0
  };

  // Calculate performance status
  const getPerformanceStatus = () => {
    const fps = latestMetrics.frameRate;
    const renderTime = latestMetrics.renderTime;
    
    if (fps > 50 && renderTime < 10) return 'excellent';
    if (fps > 30 && renderTime < 20) return 'good';
    if (fps > 20 && renderTime < 40) return 'fair';
    return 'poor';
  };

  // Calculate averages
  const getAverages = () => {
    if (metrics.length === 0) return { fps: 0, renderTime: 0, memory: 0 };
    
    const recentMetrics = metrics.slice(-30); // Last 30 measurements
    return {
      fps: recentMetrics.reduce((sum, m) => sum + m.frameRate, 0) / recentMetrics.length,
      renderTime: recentMetrics.reduce((sum, m) => sum + m.renderTime, 0) / recentMetrics.length,
      memory: recentMetrics.reduce((sum, m) => sum + m.memoryUsage, 0) / recentMetrics.length
    };
  };

  // Performance recommendations
  const getRecommendations = () => {
    const recommendations = [];
    const status = getPerformanceStatus();
    
    if (latestMetrics.frameRate < 30) {
      recommendations.push({
        type: 'warning',
        title: 'Low Frame Rate',
        description: 'Consider enabling object culling or reducing object count',
        action: 'Enable Performance Mode'
      });
    }
    
    if (latestMetrics.renderTime > 16) {
      recommendations.push({
        type: 'error',
        title: 'High Render Time',
        description: 'Rendering is taking too long. Try WebGL acceleration',
        action: 'Enable WebGL'
      });
    }
    
    if (latestMetrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push({
        type: 'warning',
        title: 'High Memory Usage',
        description: 'Memory usage is high. Clear cache or reduce image quality',
        action: 'Clear Cache'
      });
    }
    
    if (latestMetrics.objectCount > 100) {
      recommendations.push({
        type: 'info',
        title: 'Complex Design',
        description: 'Large number of objects detected. Object pooling recommended',
        action: 'Enable Object Pooling'
      });
    }

    return recommendations;
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fair':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'poor':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-gray-500" />;
    }
  };

  const MetricCard = ({ 
    icon: Icon, 
    title, 
    value, 
    unit, 
    status = 'normal',
    trend 
  }: {
    icon: React.ElementType;
    title: string;
    value: number | string;
    unit?: string;
    status?: 'normal' | 'warning' | 'error';
    trend?: 'up' | 'down' | 'stable';
  }) => (
    <div className={`bg-white p-4 rounded-lg border-l-4 ${
      status === 'error' ? 'border-red-500' :
      status === 'warning' ? 'border-yellow-500' :
      'border-green-500'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${
            status === 'error' ? 'text-red-500' :
            status === 'warning' ? 'text-yellow-500' :
            'text-green-500'
          }`} />
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-2xl font-bold">
              {typeof value === 'number' ? value.toFixed(1) : value}
              {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
            </p>
          </div>
        </div>
        {trend && (
          <TrendingUp className={`w-4 h-4 ${
            trend === 'up' ? 'text-green-500 rotate-0' :
            trend === 'down' ? 'text-red-500 rotate-180' :
            'text-gray-400'
          }`} />
        )}
      </div>
    </div>
  );

  const OptimizationToggle = ({ 
    id, 
    title, 
    description, 
    enabled, 
    impact = 'medium' 
  }: {
    id: string;
    title: string;
    description: string;
    enabled: boolean;
    impact?: 'low' | 'medium' | 'high';
  }) => (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium">{title}</h4>
          <span className={`text-xs px-2 py-1 rounded ${
            impact === 'high' ? 'bg-green-100 text-green-700' :
            impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {impact} impact
          </span>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={enabled}
          onChange={(e) => onOptimizationToggle(id, e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );

  const MiniChart = ({ data, color = '#3b82f6' }: { data: number[]; color?: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    return (
      <div className="flex items-end h-16 gap-1">
        {data.slice(-20).map((value, index) => (
          <div
            key={index}
            className="bg-blue-500 w-2 rounded-t"
            style={{
              height: `${((value - min) / range) * 100}%`,
              backgroundColor: color,
              minHeight: '2px'
            }}
          />
        ))}
      </div>
    );
  };

  if (!isVisible) return null;

  const averages = getAverages();
  const status = getPerformanceStatus();
  const recommendations = getRecommendations();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-semibold">Performance Dashboard</h2>
                <p className="text-blue-100 text-sm">Real-time canvas performance monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <StatusIcon status={status} />
                <span className="text-sm font-medium capitalize">{status}</span>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-200 text-2xl"
              >
                ×
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {[
              { id: 'metrics', label: 'Metrics', icon: BarChart3 },
              { id: 'optimizations', label: 'Optimizations', icon: Settings },
              { id: 'memory', label: 'Memory', icon: HardDrive }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {selectedTab === 'metrics' && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard
                    icon={Zap}
                    title="Frame Rate"
                    value={latestMetrics.frameRate}
                    unit="fps"
                    status={latestMetrics.frameRate < 30 ? 'warning' : 'normal'}
                  />
                  <MetricCard
                    icon={Monitor}
                    title="Render Time"
                    value={latestMetrics.renderTime}
                    unit="ms"
                    status={latestMetrics.renderTime > 16 ? 'warning' : 'normal'}
                  />
                  <MetricCard
                    icon={Cpu}
                    title="Objects"
                    value={`${latestMetrics.visibleObjects}/${latestMetrics.objectCount}`}
                    status={latestMetrics.objectCount > 100 ? 'warning' : 'normal'}
                  />
                  <MetricCard
                    icon={HardDrive}
                    title="Memory"
                    value={(latestMetrics.memoryUsage / 1024 / 1024)}
                    unit="MB"
                    status={latestMetrics.memoryUsage > 100 * 1024 * 1024 ? 'warning' : 'normal'}
                  />
                </div>

                {/* Performance Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-3">Frame Rate History</h3>
                    <MiniChart 
                      data={metrics.map(m => m.frameRate)} 
                      color="#10b981" 
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Average: {averages.fps.toFixed(1)} fps
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-3">Render Time History</h3>
                    <MiniChart 
                      data={metrics.map(m => m.renderTime)} 
                      color="#f59e0b" 
                    />
                    <p className="text-sm text-gray-600 mt-2">
                      Average: {averages.renderTime.toFixed(1)} ms
                    </p>
                  </div>
                </div>

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-3">Performance Recommendations</h3>
                    <div className="space-y-3">
                      {recommendations.map((rec, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-l-4 ${
                            rec.type === 'error' ? 'border-red-500 bg-red-50' :
                            rec.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                            'border-blue-500 bg-blue-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{rec.title}</h4>
                              <p className="text-sm text-gray-600">{rec.description}</p>
                            </div>
                            <button className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-50">
                              {rec.action}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTab === 'optimizations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Performance Optimizations</h3>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoOptimize}
                      onChange={(e) => setAutoOptimize(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Auto-optimize</span>
                  </label>
                </div>

                <div className="space-y-4">
                  <OptimizationToggle
                    id="webgl"
                    title="WebGL Acceleration"
                    description="Use WebGL for faster rendering of complex designs"
                    enabled={true}
                    impact="high"
                  />
                  
                  <OptimizationToggle
                    id="culling"
                    title="Object Culling"
                    description="Hide objects outside the viewport to improve performance"
                    enabled={true}
                    impact="high"
                  />
                  
                  <OptimizationToggle
                    id="pooling"
                    title="Object Pooling"
                    description="Reuse objects to reduce garbage collection"
                    enabled={false}
                    impact="medium"
                  />
                  
                  <OptimizationToggle
                    id="caching"
                    title="Render Caching"
                    description="Cache rendered objects for faster redraws"
                    enabled={true}
                    impact="medium"
                  />
                  
                  <OptimizationToggle
                    id="lod"
                    title="Level of Detail"
                    description="Reduce quality for distant objects"
                    enabled={false}
                    impact="medium"
                  />
                  
                  <OptimizationToggle
                    id="batching"
                    title="Batch Operations"
                    description="Group similar operations together"
                    enabled={true}
                    impact="low"
                  />
                </div>
              </div>
            )}

            {selectedTab === 'memory' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Canvas Memory</h4>
                    <p className="text-2xl font-bold">
                      {(latestMetrics.memoryUsage / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Cache Size</h4>
                    <p className="text-2xl font-bold">2.1 MB</p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Pool Objects</h4>
                    <p className="text-2xl font-bold">47</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Memory Usage Over Time</h4>
                  <MiniChart 
                    data={metrics.map(m => m.memoryUsage / 1024 / 1024)} 
                    color="#8b5cf6" 
                  />
                </div>

                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Clear Cache
                  </button>
                  <button className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
                    Garbage Collect
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                    Optimize Memory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;