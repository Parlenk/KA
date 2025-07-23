import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Activity } from 'lucide-react';

interface ApiEndpoint {
  name: string;
  url: string;
  method: string;
  description: string;
}

const ApiTest: React.FC = () => {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<any>(null);

  const endpoints: ApiEndpoint[] = [
    {
      name: 'Health Check',
      url: '/api/health',
      method: 'GET',
      description: 'Backend server health status'
    },
    {
      name: 'API Status',
      url: '/api/v1/status',
      method: 'GET', 
      description: 'API version and endpoints'
    },
    {
      name: 'Test Endpoint',
      url: '/api/v1/test',
      method: 'GET',
      description: 'Test endpoint with sample data'
    }
  ];

  const testEndpoint = async (endpoint: ApiEndpoint) => {
    setLoading(endpoint.name);
    try {
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      setResults(prev => ({
        ...prev,
        [endpoint.name]: {
          success: response.ok,
          status: response.status,
          data: data,
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [endpoint.name]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const testAllEndpoints = async () => {
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  const loadServerStatus = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setServerStatus(data);
      }
    } catch (error) {
      console.log('Server status check failed:', error);
    }
  };

  useEffect(() => {
    loadServerStatus();
    // Load server status every 30 seconds
    const interval = setInterval(loadServerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Integration Test</h1>
        <p className="text-gray-600">
          Test the connection between the React frontend and Express.js backend
        </p>
      </div>

      {/* Server Status */}
      {serverStatus && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Backend Server Status</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Status:</span>
              <span className="ml-2 font-medium text-green-700">{serverStatus.status}</span>
            </div>
            <div>
              <span className="text-gray-600">Version:</span>
              <span className="ml-2 font-medium">{serverStatus.version}</span>
            </div>
            <div>
              <span className="text-gray-600">Environment:</span>
              <span className="ml-2 font-medium">{serverStatus.environment}</span>
            </div>
            <div>
              <span className="text-gray-600">Time:</span>
              <span className="ml-2 font-medium">
                {new Date(serverStatus.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
          {serverStatus.message && (
            <p className="mt-2 text-sm text-green-700">{serverStatus.message}</p>
          )}
        </div>
      )}

      {/* Test Controls */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={testAllEndpoints}
          disabled={loading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Test All Endpoints
        </button>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        {endpoints.map((endpoint) => {
          const result = results[endpoint.name];
          const isLoading = loading === endpoint.name;
          
          return (
            <div
              key={endpoint.name}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {result?.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : result?.success === false ? (
                      <XCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <div className="w-5 h-5 bg-gray-300 rounded-full" />
                    )}
                    <h3 className="font-semibold text-gray-900">{endpoint.name}</h3>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                    {endpoint.method}
                  </span>
                </div>
                
                <button
                  onClick={() => testEndpoint(endpoint)}
                  disabled={isLoading}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Testing...' : 'Test'}
                </button>
              </div>

              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">{endpoint.description}</p>
                <p className="text-xs font-mono text-gray-500">{endpoint.url}</p>
              </div>

              {result && (
                <div className="mt-3 p-3 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Response {result.status && `(${result.status})`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {result.success ? (
                    <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-sm text-red-600">
                      <p><strong>Error:</strong> {result.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Integration Status */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Integration Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Frontend running on http://localhost:3000</span>
          </div>
          <div className="flex items-center gap-2">
            {serverStatus ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span>Backend running on http://localhost:3001</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>Vite proxy configured for /api/* requests</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiTest;