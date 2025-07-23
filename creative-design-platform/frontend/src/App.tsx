import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import SimpleLoginPage from './pages/SimpleLoginPage';
import SimpleRegisterPage from './pages/SimpleRegisterPage';
import SimpleDashboardPage from './pages/SimpleDashboardPage';
import SimpleLandingPage from './pages/SimpleLandingPage';
import SimpleDemo from './pages/SimpleDemo';
import SimpleApiTest from './pages/SimpleApiTest';
import SimpleEditor from './pages/SimpleEditor';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/" element={<SimpleLandingPage />} />
              <Route path="/demo" element={<SimpleDemo />} />
              <Route path="/api-test" element={<SimpleApiTest />} />
              <Route path="/login" element={<SimpleLoginPage />} />
              <Route path="/register" element={<SimpleRegisterPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <SimpleDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editor/:projectId"
                element={
                  <ProtectedRoute>
                    <SimpleEditor />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;