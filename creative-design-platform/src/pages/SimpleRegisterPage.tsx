import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import KredivoLogo from '../components/ui/KredivoLogo';

export default function SimpleRegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem'
    },
    card: {
      backgroundColor: 'white',
      padding: '3rem',
      borderRadius: '1rem',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '500px',
      position: 'relative' as 'relative'
    },
    header: {
      textAlign: 'center' as 'center',
      marginBottom: '2rem'
    },
    logo: {
      fontSize: '2.5rem',
      marginBottom: '0.5rem'
    },
    title: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '0.5rem'
    },
    subtitle: {
      color: '#6b7280',
      fontSize: '1rem',
      lineHeight: 1.5
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as 'column',
      gap: '1.5rem'
    },
    inputGroup: {
      display: 'flex',
      flexDirection: 'column' as 'column',
      gap: '0.5rem'
    },
    label: {
      fontWeight: '600',
      color: '#374151',
      fontSize: '0.875rem'
    },
    inputWrapper: {
      position: 'relative' as 'relative'
    },
    input: {
      width: '100%',
      padding: '1rem',
      border: '2px solid #e5e7eb',
      borderRadius: '0.75rem',
      fontSize: '1rem',
      outline: 'none',
      transition: 'all 0.2s ease',
      backgroundColor: '#f9fafb',
      boxSizing: 'border-box' as 'border-box'
    },
    inputFocus: {
      borderColor: '#4f46e5',
      backgroundColor: 'white',
      boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)'
    },
    passwordToggle: {
      position: 'absolute' as 'absolute',
      right: '1rem',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#6b7280',
      fontSize: '1.25rem',
      padding: '0.25rem'
    },
    button: {
      backgroundColor: '#4f46e5',
      color: 'white',
      padding: '1rem',
      border: 'none',
      borderRadius: '0.75rem',
      fontSize: '1rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginTop: '1rem',
      position: 'relative' as 'relative'
    },
    buttonHover: {
      backgroundColor: '#4338ca',
      transform: 'translateY(-1px)',
      boxShadow: '0 10px 20px rgba(79, 70, 229, 0.3)'
    },
    buttonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none'
    },
    error: {
      color: '#dc2626',
      fontSize: '0.875rem',
      marginTop: '0.5rem',
      padding: '0.75rem',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '0.5rem'
    },
    features: {
      backgroundColor: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      marginBottom: '1.5rem'
    },
    featuresTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '1rem'
    },
    featuresList: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      display: 'flex',
      flexDirection: 'column' as 'column',
      gap: '0.75rem'
    },
    featureItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: '#4b5563',
      fontSize: '0.875rem'
    },
    checkIcon: {
      color: '#10b981',
      fontSize: '1.25rem'
    },
    links: {
      textAlign: 'center' as 'center',
      marginTop: '2rem',
      padding: '1.5rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.75rem',
      color: '#6b7280'
    },
    link: {
      color: '#4f46e5',
      textDecoration: 'none',
      fontWeight: '500',
      transition: 'color 0.2s ease'
    },
    divider: {
      height: '1px',
      backgroundColor: '#e5e7eb',
      margin: '1.5rem 0',
      width: '100%'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>
            <KredivoLogo size={48} />
          </div>
          <h1 style={styles.title}>Join Kredivo Ads Center</h1>
          <p style={styles.subtitle}>
            Create stunning advertising campaigns for Kredivo with AI-powered design tools
          </p>
        </div>

        {/* Features Preview */}
        <div style={styles.features}>
          <h3 style={styles.featuresTitle}>What you'll get:</h3>
          <ul style={styles.featuresList}>
            <li style={styles.featureItem}>
              <span style={styles.checkIcon}>✓</span>
              <span>AI-powered ad creation and optimization</span>
            </li>
            <li style={styles.featureItem}>
              <span style={styles.checkIcon}>✓</span>
              <span>Professional Kredivo-branded templates</span>
            </li>
            <li style={styles.featureItem}>
              <span style={styles.checkIcon}>✓</span>
              <span>Multi-platform publishing (Social, Digital, Print)</span>
            </li>
            <li style={styles.featureItem}>
              <span style={styles.checkIcon}>✓</span>
              <span>Real-time collaboration and approval workflow</span>
            </li>
          </ul>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              style={styles.input}
              placeholder="Enter your work email"
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <div style={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                style={styles.input}
                placeholder="Create a strong password (min 6 characters)"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <div style={styles.inputWrapper}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                style={styles.input}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.passwordToggle}
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                Object.assign(e.currentTarget.style, styles.buttonHover);
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                Object.assign(e.currentTarget.style, styles.button);
              }
            }}
          >
            {loading ? (
              <>
                <span style={{ marginRight: '0.5rem' }}>⏳</span>
                Creating Account...
              </>
            ) : (
              <>
                <span style={{ marginRight: '0.5rem' }}>🚀</span>
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div style={styles.links}>
          <div>
            Already have an account?{' '}
            <Link to="/login" style={styles.link}>
              Sign in here
            </Link>
          </div>
          <div style={styles.divider}></div>
          <div>
            <Link to="/" style={styles.link}>
              ← Back to Home
            </Link>
            {' | '}
            <Link to="/demo" style={styles.link}>
              Try Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}