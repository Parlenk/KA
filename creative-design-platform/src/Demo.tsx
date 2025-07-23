import React, { useState } from 'react';
import AnalyticsDashboard from './components/dashboard/AnalyticsDashboard';
import PerformanceMonitor from './components/performance/PerformanceMonitor';
import BrandGuidelinesManager from './components/brand/BrandGuidelinesManager';
import BrandComplianceChecker from './components/brand/BrandComplianceChecker';
import AIAssistant from './components/ai/AIAssistant';
import TemplateMarketplace from './components/templates/TemplateMarketplace';
import EditorLayout from './components/editor/EditorLayout';
import { 
  BarChart3, 
  Activity, 
  Shield, 
  Sparkles, 
  Layout, 
  Palette,
  Menu,
  X
} from 'lucide-react';

const Demo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const demos = [
    {
      id: 'dashboard',
      name: 'Analytics Dashboard',
      description: 'Comprehensive analytics and insights',
      icon: BarChart3,
      component: <AnalyticsDashboard className="w-full h-full" />
    },
    {
      id: 'editor',
      name: 'Design Editor',
      description: 'Multi-canvas design interface',
      icon: Layout,
      component: <EditorLayout />
    },
    {
      id: 'ai-assistant',
      name: 'AI Assistant',
      description: 'AI-powered design assistance',
      icon: Sparkles,
      component: (
        <div className="p-8 bg-gray-50 min-h-screen">
          <AIAssistant />
        </div>
      )
    },
    {
      id: 'templates',
      name: 'Template Marketplace',
      description: 'AI-categorized template discovery',
      icon: Layout,
      component: (
        <div className="p-8 bg-gray-50 min-h-screen">
          <TemplateMarketplace />
        </div>
      )
    },
    {
      id: 'brand-guidelines',
      name: 'Brand Guidelines',
      description: 'Brand compliance management',
      icon: Shield,
      component: (
        <div className="p-8 bg-gray-50 min-h-screen">
          <BrandGuidelinesManager brandKitId="demo-brand-kit" />
        </div>
      )
    },
    {
      id: 'performance',
      name: 'Performance Monitor',
      description: 'Real-time performance tracking',
      icon: Activity,
      component: (
        <div className="p-8 bg-gray-50 min-h-screen">
          <PerformanceMonitor className="max-w-4xl mx-auto" />
        </div>
      )
    }
  ];

  const activeComponent = demos.find(demo => demo.id === activeDemo)?.component;

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-white shadow-lg transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div>
                <h1 className="text-xl font-bold text-gray-900">Design Platform</h1>
                <p className="text-sm text-gray-600">Feature Demo</p>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Demo Navigation */}
        <div className="flex-1 overflow-y-auto p-4">
          {sidebarOpen && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Available Features</h3>
              <p className="text-xs text-gray-600 mb-4">
                Click on any feature below to see it in action. These are frontend demos with mock data.
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            {demos.map(demo => {
              const IconComponent = demo.icon;
              return (
                <button
                  key={demo.id}
                  onClick={() => setActiveDemo(demo.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                    activeDemo === demo.id 
                      ? 'bg-blue-100 text-blue-700 border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  } ${sidebarOpen ? '' : 'justify-center'}`}
                  title={!sidebarOpen ? demo.name : undefined}
                >
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <div className="text-left">
                      <div className="font-medium">{demo.name}</div>
                      <div className="text-xs text-gray-500">{demo.description}</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-gray-200">
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Demo Mode</h4>
              <p className="text-xs text-blue-700">
                This is a frontend demo with mock data. Backend integration required for full functionality.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeComponent}
      </div>
    </div>
  );
};

export default Demo;