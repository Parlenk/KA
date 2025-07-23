// API utility functions
export const getApiUrl = (): string => {
  // Use environment variable or fallback to default
  return import.meta.env.VITE_API_URL || '/api/v1';
};

// Get full API URL with endpoint
export const getFullApiUrl = (endpoint: string): string => {
  const baseUrl = getApiUrl();
  return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

// API configuration
export const API_CONFIG = {
  baseURL: getApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};