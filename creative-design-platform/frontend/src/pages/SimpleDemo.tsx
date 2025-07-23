import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Template {
  id: number;
  name: string;
  category: string;
  description: string;
  dimensions: { width: number; height: number };
  thumbnail: string;
  tags: string[];
}

export default function SimpleDemo() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('`${getApiUrl()}`/templates')
      .then(res => res.json())
      .then(data => {
        setTemplates(data.templates || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load templates:', err);
        setLoading(false);
      });
  }, []);

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f9fafb'
    },
    header: {
      backgroundColor: 'white',
      padding: '1rem 0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '2rem'
    },
    headerContent: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 1rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#111827'
    },
    backLink: {
      color: '#4f46e5',
      textDecoration: 'none',
      fontWeight: '500'
    },
    main: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 1rem'
    },
    sectionTitle: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#111827',
      marginBottom: '1rem'
    },
    description: {
      color: '#6b7280',
      marginBottom: '2rem',
      fontSize: '1.1rem',
      lineHeight: 1.6
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem',
      marginBottom: '3rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: '1px solid #e5e7eb',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer'
    },
    cardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    },
    cardImage: {
      height: '200px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '1.2rem',
      fontWeight: '600'
    },
    cardContent: {
      padding: '1.5rem'
    },
    cardTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '0.5rem'
    },
    cardDescription: {
      color: '#6b7280',
      marginBottom: '1rem',
      lineHeight: 1.5
    },
    cardMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '0.875rem',
      color: '#9ca3af'
    },
    dimensions: {
      backgroundColor: '#f3f4f6',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem'
    },
    category: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      textTransform: 'capitalize' as 'capitalize'
    },
    modal: {
      position: 'fixed' as 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      padding: '2rem',
      maxWidth: '500px',
      width: '100%'
    },
    modalTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      marginBottom: '1rem'
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
      marginRight: '1rem'
    },
    buttonSecondary: {
      backgroundColor: '#f3f4f6',
      color: '#374151'
    },
    loading: {
      textAlign: 'center' as 'center',
      padding: '3rem',
      color: '#6b7280'
    },
    features: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem',
      marginBottom: '3rem'
    },
    feature: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textAlign: 'center' as 'center'
    },
    featureIcon: {
      fontSize: '2rem',
      marginBottom: '1rem'
    }
  };

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
  };

  const closeModal = () => {
    setSelectedTemplate(null);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🎨 Kredivo Ads Center Demo</h1>
          <Link to="/" style={styles.backLink}>← Back to Home</Link>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <h2 style={styles.sectionTitle}>Explore Ad Creation Features</h2>
        <p style={styles.description}>
          Welcome to Kredivo Ads Center demo! Browse our advertising template library, 
          explore the features, and see what makes our ad creation platform special for Kredivo campaigns.
        </p>

        {/* Features */}
        <div style={styles.features}>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>🎨</div>
            <h3>Ad Canvas Editor</h3>
            <p>Professional advertising design tools with layers, shapes, and text editing for campaigns</p>
          </div>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>🤖</div>
            <h3>AI Ad Optimization</h3>
            <p>Smart background removal, image generation, and automated ad optimization for better performance</p>
          </div>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>📱</div>
            <h3>Multi-Platform Ads</h3>
            <p>Export ads to social media, digital campaigns, and print formats for Kredivo marketing</p>
          </div>
          <div style={styles.feature}>
            <div style={styles.featureIcon}>⚡</div>
            <h3>Real-time Preview</h3>
            <p>Live collaboration and instant preview of your ad campaigns across devices</p>
          </div>
        </div>

        {/* Templates */}
        <h3 style={styles.sectionTitle}>Kredivo Ad Templates</h3>

        {loading ? (
          <div style={styles.loading}>
            <div>Loading templates...</div>
          </div>
        ) : (
          <div style={styles.grid}>
            {templates.map((template) => (
              <div
                key={template.id}
                style={styles.card}
                onClick={() => handleTemplateClick(template)}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, styles.cardHover);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
              >
                <div style={styles.cardImage}>
                  {template.name}
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.cardTitle}>{template.name}</h3>
                  <p style={styles.cardDescription}>{template.description}</p>
                  <div style={styles.cardMeta}>
                    <span style={styles.category}>{template.category}</span>
                    <span style={styles.dimensions}>
                      {template.dimensions.width} × {template.dimensions.height}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '3rem' }}>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            Ready to start creating? Sign up for full access to all features!
          </p>
          <Link to="/register">
            <button style={styles.button}>Get Started Free</button>
          </Link>
          <Link to="/login">
            <button style={{...styles.button, ...styles.buttonSecondary}}>Sign In</button>
          </Link>
        </div>
      </main>

      {/* Template Modal */}
      {selectedTemplate && (
        <div style={styles.modal} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{selectedTemplate.name}</h3>
            <p><strong>Description:</strong> {selectedTemplate.description}</p>
            <p><strong>Category:</strong> {selectedTemplate.category}</p>
            <p><strong>Dimensions:</strong> {selectedTemplate.dimensions.width} × {selectedTemplate.dimensions.height}px</p>
            <p><strong>Tags:</strong> {selectedTemplate.tags.join(', ')}</p>
            
            <div style={{ marginTop: '2rem' }}>
              <button style={styles.button}>Use This Template</button>
              <button style={{...styles.button, ...styles.buttonSecondary}} onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}