import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function SimpleLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    },
    card: {
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '1rem',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      width: '100%',
      maxWidth: '400px'
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      textAlign: 'center' as 'center',
      marginBottom: '2rem',
      color: '#333'
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as 'column',
      gap: '1rem'
    },
    label: {
      fontWeight: '500',
      color: '#374151',
      marginBottom: '0.5rem'
    },
    input: {
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    button: {
      backgroundColor: '#4f46e5',
      color: 'white',
      padding: '0.75rem',
      border: 'none',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      marginTop: '1rem'
    },
    buttonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    error: {
      color: '#dc2626',
      fontSize: '0.875rem',
      marginTop: '0.5rem'
    },
    demoInfo: {
      backgroundColor: '#f3f4f6',
      padding: '1rem',
      borderRadius: '0.5rem',
      marginBottom: '1rem',
      fontSize: '0.875rem',
      color: '#6b7280'
    },
    links: {
      textAlign: 'center' as 'center',
      marginTop: '1rem',
      color: '#6b7280'
    },
    link: {
      color: '#4f46e5',
      textDecoration: 'none'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sign In to Kredivo Ads Center</h1>
        
        <div style={styles.demoInfo}>
          <strong>Demo Credentials:</strong><br />
          Email: demo@example.com<br />
          Password: demo123
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              placeholder="Enter your password"
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div style={styles.links}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.link}>
            Sign up
          </Link>
          <br />
          <Link to="/" style={styles.link}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}