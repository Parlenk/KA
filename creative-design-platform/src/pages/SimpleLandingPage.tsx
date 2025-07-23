import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import KredivoLogo from '../components/ui/KredivoLogo';

export default function SimpleLandingPage() {
  const { isAuthenticated } = useAuth();

  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Inter, sans-serif'
    },
    header: {
      backgroundColor: 'white',
      padding: '1rem 0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    logo: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#333'
    },
    nav: {
      display: 'flex',
      gap: '1rem'
    },
    navLink: {
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      textDecoration: 'none',
      fontWeight: '500',
      transition: 'background-color 0.2s'
    },
    primaryButton: {
      backgroundColor: '#4f46e5',
      color: 'white'
    },
    secondaryButton: {
      color: '#374151'
    },
    main: {
      padding: '4rem 1rem',
      textAlign: 'center' as 'center',
      color: 'white'
    },
    heroTitle: {
      fontSize: '3rem',
      fontWeight: 'bold',
      marginBottom: '1rem',
      lineHeight: 1.2
    },
    heroSubtitle: {
      fontSize: '1.25rem',
      marginBottom: '2rem',
      opacity: 0.9
    },
    ctaButton: {
      display: 'inline-block',
      backgroundColor: 'white',
      color: '#4f46e5',
      padding: '1rem 2rem',
      borderRadius: '0.5rem',
      textDecoration: 'none',
      fontWeight: 'bold',
      fontSize: '1.1rem',
      transition: 'transform 0.2s',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    features: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '2rem',
      maxWidth: '1200px',
      margin: '4rem auto 0',
      padding: '0 1rem'
    },
    feature: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      padding: '2rem',
      borderRadius: '1rem',
      backdropFilter: 'blur(10px)'
    },
    featureIcon: {
      fontSize: '3rem',
      marginBottom: '1rem'
    },
    featureTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      marginBottom: '1rem'
    },
    featureDescription: {
      opacity: 0.9,
      lineHeight: 1.6
    },
    footer: {
      backgroundColor: 'rgba(0,0,0,0.2)',
      padding: '2rem 1rem',
      marginTop: '4rem',
      textAlign: 'center' as 'center',
      color: 'white'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <KredivoLogo size={40} />
            <span style={{ 
              marginLeft: '0.75rem', 
              lineHeight: '1',
              fontSize: '1.25rem',
              fontWeight: 'bold',
              marginTop: '-8px'
            }}>Kredivo Ads Center</span>
          </div>
          <nav style={styles.nav}>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                style={{...styles.navLink, ...styles.primaryButton}}
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  style={{...styles.navLink, ...styles.secondaryButton}}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  style={{...styles.navLink, ...styles.primaryButton}}
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <h1 style={styles.heroTitle}>
          Create Stunning Ads in Minutes
        </h1>
        <p style={styles.heroSubtitle}>
          Professional advertising design tools, AI-powered features, and templates for Kredivo campaigns
        </p>
        
        <Link to="/demo" style={styles.ctaButton}>
          Try Demo Now
        </Link>

        {/* Features */}
        <div style={styles.features}>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>
              <KredivoLogo size={32} />
            </div>
            <h3 style={styles.featureTitle}>Ad Designer</h3>
            <p style={styles.featureDescription}>
              Professional canvas with drag-and-drop tools, layers, and advanced editing for advertising campaigns
            </p>
          </div>
          
          <div style={styles.feature}>
            <div style={styles.featureIcon}>🤖</div>
            <h3 style={styles.featureTitle}>AI-Powered Ads</h3>
            <p style={styles.featureDescription}>
              AI-powered image generation, background removal, and smart ad optimization for maximum impact
            </p>
          </div>
          
          <div style={styles.feature}>
            <div style={styles.featureIcon}>📱</div>
            <h3 style={styles.featureTitle}>Multi-Platform Publishing</h3>
            <p style={styles.featureDescription}>
              Export and publish ads across social media, digital platforms, and print media with one click
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>&copy; 2025 Kredivo Ads Center. Built with React and Express.</p>
        <p>
          <Link to="/api-test" style={{color: 'white', opacity: 0.8}}>API Test</Link>
          {' | '}
          <Link to="/demo" style={{color: 'white', opacity: 0.8}}>Demo</Link>
        </p>
      </footer>
    </div>
  );
}