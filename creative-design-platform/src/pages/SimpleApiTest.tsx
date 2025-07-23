import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface ApiResponse {
  endpoint: string;
  status: 'success' | 'error';
  data?: any;
  error?: string;
}

export default function SimpleApiTest() {
  const [results, setResults] = useState<ApiResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const apiEndpoints = [
    { name: 'Health Check', url: '/health' },
    { name: 'API Health', url: '/api/v1/health' },
    { name: 'Templates', url: '/api/v1/templates' },
    { name: 'Ad Sizes', url: '/api/v1/ad-sizes' },
    { name: 'Projects', url: '/api/v1/projects' },
    { name: 'Status', url: '/api/v1/status' }
  ];

  const testAllEndpoints = async () => {
    setLoading(true);
    setResults([]);

    const newResults: ApiResponse[] = [];

    for (const endpoint of apiEndpoints) {
      try {
        const response = await fetch(`http://localhost:3001${endpoint.url}`);
        const data = await response.json();

        newResults.push({
          endpoint: endpoint.name,
          status: response.ok ? 'success' : 'error',
          data: data
        });
      } catch (error) {
        newResults.push({
          endpoint: endpoint.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  useEffect(() => {
    testAllEndpoints();
  }, []);

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '2rem'
    },
    header: {
      maxWidth: '1200px',
      margin: '0 auto',
      marginBottom: '2rem'
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '1rem'
    },
    description: {
      color: '#6b7280',
      marginBottom: '2rem'
    },
    button: {
      backgroundColor: '#4f46e5',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      fontWeight: '500',
      cursor: 'pointer',
      marginRight: '1rem',
      transition: 'background-color 0.2s'
    },
    content: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '1.5rem'
    },
    card: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb'
    },
    cardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1rem'
    },
    cardTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#111827'
    },
    status: {
      padding: '0.25rem 0.75rem',
      borderRadius: '9999px',
      fontSize: '0.75rem',
      fontWeight: '500'
    },
    statusSuccess: {
      backgroundColor: '#dcfce7',
      color: '#166534'
    },
    statusError: {
      backgroundColor: '#fee2e2',
      color: '#dc2626'
    },
    pre: {
      backgroundColor: '#f3f4f6',
      padding: '1rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      overflow: 'auto',
      maxHeight: '200px'
    },
    loading: {
      textAlign: 'center' as 'center',
      padding: '2rem',
      color: '#6b7280'
    },
    backLink: {
      color: '#4f46e5',
      textDecoration: 'none',
      fontWeight: '500'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Kredivo Ads Center API Test</h1>
        <p style={styles.description}>
          Testing connection to Kredivo Ads Center backend API endpoints. This page verifies that all services are running correctly.
        </p>
        <button onClick={testAllEndpoints} disabled={loading} style={styles.button}>
          {loading ? 'Testing...' : 'Run Tests Again'}
        </button>
        <Link to="/" style={styles.backLink}>← Back to Home</Link>
      </div>

      <div style={styles.content}>
        {loading ? (
          <div style={styles.loading}>
            <div>Testing API endpoints...</div>
          </div>
        ) : (
          <div style={styles.grid}>
            {results.map((result, index) => (
              <div key={index} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{result.endpoint}</h3>
                  <span
                    style={{
                      ...styles.status,
                      ...(result.status === 'success' ? styles.statusSuccess : styles.statusError)
                    }}
                  >
                    {result.status === 'success' ? '✅ Success' : '❌ Error'}
                  </span>
                </div>
                
                <pre style={styles.pre}>
                  {result.status === 'success' 
                    ? JSON.stringify(result.data, null, 2)
                    : result.error || 'Failed to connect'
                  }
                </pre>
              </div>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'white', borderRadius: '0.5rem' }}>
            <h3>Summary</h3>
            <p>
              <strong>{results.filter(r => r.status === 'success').length}</strong> out of{' '}
              <strong>{results.length}</strong> endpoints working correctly.
            </p>
            {results.every(r => r.status === 'success') ? (
              <p style={{ color: '#059669' }}>🎉 All services are running perfectly!</p>
            ) : (
              <p style={{ color: '#dc2626' }}>⚠️ Some services may need attention.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}