import React from 'react';
import { Link } from 'react-router-dom';

const SimpleDashboardPage = () => {
  const templates = [
    { id: '1', name: 'Facebook Ad', width: 1200, height: 628, category: 'Social Media' },
    { id: '2', name: 'Instagram Story', width: 1080, height: 1920, category: 'Social Media' },
    { id: '3', name: 'Google Banner', width: 728, height: 90, category: 'Display' },
    { id: '4', name: 'LinkedIn Post', width: 1200, height: 627, category: 'Social Media' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold text-gray-900">
              Kredivo Ads Center
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome back!</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Creative Dashboard</h1>
          <p className="text-gray-600">Choose a template to start creating your next ad campaign</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-blue-600">24</div>
            <div className="text-gray-600">Projects Created</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-green-600">156</div>
            <div className="text-gray-600">Designs Generated</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-purple-600">89</div>
            <div className="text-gray-600">AI Copies Created</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-2xl font-bold text-orange-600">12</div>
            <div className="text-gray-600">Campaigns Exported</div>
          </div>
        </div>

        {/* Templates Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Popular Templates</h2>
            <button className="text-blue-600 hover:text-blue-700 font-medium">
              View All Templates
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div 
                  className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg mb-4 flex items-center justify-center text-gray-400"
                  style={{ aspectRatio: `${template.width}/${template.height}`, minHeight: '120px' }}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">🎨</div>
                    <div className="text-sm">{template.width} × {template.height}</div>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{template.category}</p>
                <Link 
                  to={`/editor?template=${template.id}&width=${template.width}&height=${template.height}`}
                  className="block w-full bg-blue-600 text-white text-center py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Use Template
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Projects */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Projects</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">FB</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Summer Sale Campaign</h3>
                  <p className="text-sm text-gray-600">Facebook Ad • Created 2 hours ago</p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Continue Editing
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 font-semibold">IG</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Product Launch Story</h3>
                  <p className="text-sm text-gray-600">Instagram Story • Created yesterday</p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Continue Editing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboardPage;