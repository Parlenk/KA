import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import KredivoLogo from '../components/ui/KredivoLogo';
import SizeSelectionModal from '../components/modals/SizeSelectionModal';
import { getApiUrl } from '../services/api';

interface Template {
  id: number;
  name: string;
  category: string;
  description: string;
  dimensions: { width: number; height: number };
  thumbnail: string;
  tags: string[];
}

interface Project {
  id: number;
  name: string;
  userId: number;
  templateId: number;
  createdAt: string;
  updatedAt: string;
}

export default function SimpleDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('templates');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedSize, setSelectedSize] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setError(null);
    
    // Fetch templates and projects in parallel for faster loading
    const fetchTemplates = async () => {
      try {
        console.log('🔄 Fetching templates...');
        const response = await fetch(`${getApiUrl()}/templates`, {
          headers: {
            'Cache-Control': 'max-age=300' // Cache for 5 minutes
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.status}`);
        }
        
        const data = await response.json();
        setTemplates(data.templates || []);
        console.log('✅ Templates loaded:', data.templates?.length || 0);
      } catch (error) {
        console.error('❌ Failed to fetch templates:', error);
        setError('Failed to load templates. Please refresh the page.');
      } finally {
        setTemplatesLoading(false);
      }
    };

    const fetchProjects = async () => {
      try {
        console.log('🔄 Fetching projects...');
        const response = await fetch(`${getApiUrl()}/projects`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch projects: ${response.status}`);
        }
        
        const data = await response.json();
        setProjects(data.projects || []);
        console.log('✅ Projects loaded:', data.projects?.length || 0);
      } catch (error) {
        console.error('❌ Failed to fetch projects:', error);
        // Don't show error for projects since it's less critical
      } finally {
        setProjectsLoading(false);
      }
    };

    // Start both requests in parallel
    await Promise.all([fetchTemplates(), fetchProjects()]);
    
    setLoading(false);
    console.log('🎉 Dashboard data loading complete');
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'social', 'digital', 'web', 'platform-pack', 'custom'];

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc'
    },
    header: {
      backgroundColor: 'white',
      borderBottom: '1px solid #e2e8f0',
      padding: '1rem 0'
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
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem'
    },
    logoText: {
      fontSize: '1.25rem',
      fontWeight: 'bold',
      color: '#1f2937',
      lineHeight: '1',
      marginTop: '-8px'
    },
    userSection: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    userInfo: {
      display: 'flex',
      flexDirection: 'column' as 'column',
      alignItems: 'flex-end'
    },
    userName: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#1f2937'
    },
    userEmail: {
      fontSize: '0.75rem',
      color: '#6b7280'
    },
    logoutButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: 'none',
      padding: '0.5rem 1rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    main: {
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '2rem 1rem'
    },
    welcome: {
      marginBottom: '2rem'
    },
    welcomeTitle: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '0.5rem'
    },
    welcomeSubtitle: {
      color: '#6b7280',
      fontSize: '1rem'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    statCard: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    statIcon: {
      fontSize: '2rem',
      marginBottom: '0.75rem'
    },
    statNumber: {
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '0.25rem'
    },
    statLabel: {
      color: '#6b7280',
      fontSize: '0.875rem'
    },
    tabs: {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '1.5rem',
      borderBottom: '1px solid #e2e8f0'
    },
    tab: {
      padding: '0.75rem 1.5rem',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '0.875rem',
      fontWeight: '500',
      transition: 'all 0.2s',
      borderBottom: '2px solid transparent'
    },
    tabActive: {
      color: '#4f46e5',
      borderBottomColor: '#4f46e5'
    },
    tabInactive: {
      color: '#6b7280'
    },
    searchSection: {
      display: 'flex',
      gap: '1rem',
      marginBottom: '2rem',
      flexWrap: 'wrap' as 'wrap'
    },
    searchInput: {
      flex: 1,
      minWidth: '300px',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      outline: 'none'
    },
    categorySelect: {
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      backgroundColor: 'white',
      minWidth: '150px'
    },
    createButton: {
      backgroundColor: '#4f46e5',
      color: 'white',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1.5rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'all 0.2s',
      cursor: 'pointer'
    },
    cardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    },
    cardImage: {
      height: '180px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '1rem',
      fontWeight: '600',
      position: 'relative' as 'relative'
    },
    cardContent: {
      padding: '1.5rem'
    },
    cardTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.5rem'
    },
    cardDescription: {
      color: '#6b7280',
      fontSize: '0.875rem',
      marginBottom: '1rem',
      lineHeight: 1.5
    },
    cardMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '0.75rem'
    },
    categoryBadge: {
      backgroundColor: '#dbeafe',
      color: '#1e40af',
      padding: '0.25rem 0.5rem',
      borderRadius: '0.25rem',
      textTransform: 'capitalize' as 'capitalize'
    },
    dimensions: {
      color: '#6b7280'
    },
    loading: {
      textAlign: 'center' as 'center',
      padding: '3rem',
      color: '#6b7280'
    },
    emptyState: {
      textAlign: 'center' as 'center',
      padding: '3rem',
      color: '#6b7280'
    },
    emptyIcon: {
      fontSize: '3rem',
      marginBottom: '1rem'
    },
    projectCard: {
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'all 0.2s',
      cursor: 'pointer'
    },
    projectTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.5rem'
    },
    projectDate: {
      color: '#6b7280',
      fontSize: '0.875rem'
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
      borderRadius: '1rem',
      padding: '2rem',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '80vh',
      overflow: 'auto'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.5rem'
    },
    modalTitle: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#1f2937'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '0.25rem'
    },
    templatePreview: {
      marginBottom: '1.5rem'
    },
    previewImage: {
      width: '100%',
      height: '150px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '0.75rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '1.125rem',
      fontWeight: '600',
      marginBottom: '1rem'
    },
    templateInfo: {
      marginBottom: '1.5rem'
    },
    templateName: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.5rem'
    },
    templateDescription: {
      color: '#6b7280',
      lineHeight: 1.5,
      marginBottom: '1rem'
    },
    templateMeta: {
      display: 'flex',
      gap: '1rem',
      fontSize: '0.875rem'
    },
    projectForm: {
      display: 'flex',
      flexDirection: 'column' as 'column',
      gap: '1rem'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column' as 'column',
      gap: '0.5rem'
    },
    label: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#374151'
    },
    input: {
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '1rem',
      outline: 'none'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      marginTop: '1rem'
    },
    primaryButton: {
      backgroundColor: '#4f46e5',
      color: 'white',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      flex: 1
    },
    secondaryButton: {
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      flex: 1
    },
    deleteButton: {
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
      padding: '0.5rem',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute' as 'absolute',
      top: '0.5rem',
      right: '0.5rem',
      zIndex: 10
    },
    saveAsTemplateButton: {
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      padding: '0.5rem',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute' as 'absolute',
      top: '0.5rem',
      right: '3rem',
      zIndex: 10
    },
    projectActions: {
      position: 'absolute' as 'absolute',
      top: '0.5rem',
      right: '0.5rem',
      display: 'flex',
      gap: '0.5rem',
      zIndex: 10
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCreateNewAd = () => {
    setSelectedTemplate(null);
    setShowSizeModal(true);
  };

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setShowSizeModal(true);
  };

  const handleCloseSizeModal = () => {
    setShowSizeModal(false);
    setSelectedTemplate(null);
    setSelectedSize(null);
  };

  const handleSizeSelected = (size: any) => {
    setSelectedSize(size);
    setShowSizeModal(false);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    if (!selectedSize) {
      setSelectedTemplate(null);
    }
  };

  const handleStartProject = async (projectName: string) => {
    try {
      const response = await fetch(`${getApiUrl()}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectName,
          templateId: selectedTemplate?.id || 1,
          canvasSize: selectedSize ? {
            width: selectedSize.width,
            height: selectedSize.height,
            name: selectedSize.name
          } : null
        })
      });

      if (response.ok) {
        const newProject = await response.json();
        // Refresh projects
        await fetchData();
        handleCloseModal();
        // Navigate to the editor with size parameters
        navigate(`/editor/${newProject.id}?width=${selectedSize?.width || 800}&height=${selectedSize?.height || 600}`);
      } else {
        alert('Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Error creating project');
    }
  };

  const handleDeleteProject = async (projectId: number, projectName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation to editor
    
    if (!window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${getApiUrl()}/projects/${projectId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Refresh projects list
        await fetchData();
        alert('Project deleted successfully');
      } else {
        alert('Failed to delete project');
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Error deleting project');
    }
  };

  const handleSaveAsTemplate = async (projectId: number, projectName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation to editor
    
    const templateName = prompt(`Save "${projectName}" as template. Enter template name:`, `${projectName} Template`);
    if (!templateName) return;

    const description = prompt('Enter template description (optional):', `Professional template created from ${projectName}`);
    
    try {
      const response = await fetch(`${getApiUrl()}/projects/${projectId}/save-as-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateName: templateName.trim(),
          description: description?.trim() || `Template created from ${projectName}`,
          category: 'custom'
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Refresh templates
        await fetchData();
        alert(`Template "${templateName}" created successfully! You can find it in the Custom category.`);
      } else {
        alert('Failed to save as template');
      }
    } catch (error) {
      console.error('Error saving as template:', error);
      alert('Error saving as template');
    }
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          
          .skeleton-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}>
            <KredivoLogo size={40} />
            <span style={styles.logoText}>Kredivo Ads Center</span>
          </div>
          <div style={styles.userSection}>
            <div style={styles.userInfo}>
              <div style={styles.userName}>Welcome, {user?.name || 'User'}</div>
              <div style={styles.userEmail}>{user?.email}</div>
            </div>
            <Link to="/" style={{ textDecoration: 'none', marginRight: '1rem' }}>
              <button style={styles.logoutButton}>Home</button>
            </Link>
            <button 
              onClick={logout}
              style={styles.logoutButton}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Welcome Section */}
        <div style={styles.welcome}>
          <h1 style={styles.welcomeTitle}>
            Create Amazing Kredivo Ads
          </h1>
          <p style={styles.welcomeSubtitle}>
            Design professional advertising campaigns with AI-powered tools and templates
          </p>
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📊</div>
            <div style={styles.statNumber}>{templates.length}</div>
            <div style={styles.statLabel}>Ad Templates</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📁</div>
            <div style={styles.statNumber}>{projects.length}</div>
            <div style={styles.statLabel}>Your Projects</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>🚀</div>
            <div style={styles.statNumber}>AI</div>
            <div style={styles.statLabel}>Powered Tools</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>📱</div>
            <div style={styles.statNumber}>Multi</div>
            <div style={styles.statLabel}>Platform Export</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'templates' ? styles.tabActive : styles.tabInactive)
            }}
            onClick={() => setActiveTab('templates')}
          >
            📋 Ad Templates
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'projects' ? styles.tabActive : styles.tabInactive)
            }}
            onClick={() => setActiveTab('projects')}
          >
            📁 My Projects
          </button>
        </div>

        {activeTab === 'templates' && (
          <>
            {/* Search and Filters */}
            <div style={styles.searchSection}>
              <input
                type="text"
                placeholder="Search Kredivo ad templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={styles.categorySelect}
              >
                <option value="all">All Categories</option>
                <option value="social">Social Media</option>
                <option value="digital">Digital Campaigns</option>
                <option value="web">Web Banners</option>
                <option value="platform-pack">Platform Bundles</option>
                <option value="custom">Custom Templates</option>
              </select>
              <button style={styles.createButton} onClick={handleCreateNewAd}>
                <span>➕</span>
                Create New Ad
              </button>
            </div>

            {/* Error State */}
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                padding: '1rem',
                margin: '1rem 0',
                color: '#dc2626',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</div>
                <div>{error}</div>
                <button 
                  onClick={fetchData}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Templates Grid */}
            {templatesLoading ? (
              <div style={styles.grid}>
                {/* Skeleton Loading Cards */}
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={`skeleton-${index}`} style={{
                    ...styles.card,
                    cursor: 'default',
                    animation: 'pulse 2s infinite'
                  }}>
                    <div style={{
                      ...styles.cardImage,
                      backgroundColor: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af'
                    }}>
                      📄
                    </div>
                    <div style={styles.cardContent}>
                      <div style={{
                        height: '1.125rem',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '0.25rem',
                        marginBottom: '0.5rem'
                      }}></div>
                      <div style={{
                        height: '0.875rem',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '0.25rem',
                        marginBottom: '0.5rem',
                        width: '80%'
                      }}></div>
                      <div style={{
                        height: '0.875rem',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '0.25rem',
                        marginBottom: '1rem',
                        width: '60%'
                      }}></div>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{
                          height: '1.5rem',
                          width: '4rem',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '0.25rem'
                        }}></div>
                        <div style={{
                          height: '0.75rem',
                          width: '3rem',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '0.25rem'
                        }}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !error && filteredTemplates.length > 0 ? (
              <div style={styles.grid}>
                {filteredTemplates.map((template) => (
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
                        <span style={styles.categoryBadge}>{template.category}</span>
                        <span style={styles.dimensions}>
                          {template.dimensions.width} × {template.dimensions.height}
                        </span>
                      </div>
                      {template.adSizes && (
                        <div style={{ 
                          fontSize: '0.625rem', 
                          color: '#6b7280', 
                          marginTop: '0.5rem',
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '0.25rem'
                        }}>
                          <span style={{ fontWeight: '500' }}>Includes:</span>
                          <span>{template.adSizes.length} size{template.adSizes.length !== 1 ? 's' : ''}</span>
                          {template.category === 'platform-pack' && (
                            <span style={{
                              backgroundColor: '#f3f4f6',
                              padding: '0.125rem 0.375rem',
                              borderRadius: '0.25rem',
                              fontSize: '0.625rem'
                            }}>
                              {template.adSizes[0]?.platform || 'Multi-Platform'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🔍</div>
                <div>No templates found matching your criteria</div>
              </div>
            )}
          </>
        )}

        {activeTab === 'projects' && (
          <>
            <div style={styles.searchSection}>
              <button style={styles.createButton} onClick={handleCreateNewAd}>
                <span>➕</span>
                Start New Project
              </button>
            </div>

            {loading ? (
              <div style={styles.loading}>
                <div style={styles.emptyIcon}>⏳</div>
                <div>Loading your projects...</div>
              </div>
            ) : projects.length > 0 ? (
              <div style={styles.grid}>
                {projects.map((project) => (
                  <div
                    key={project.id}
                    style={{ ...styles.projectCard, position: 'relative' }}
                    onClick={() => navigate(`/editor/${project.id}`)}
                    onMouseEnter={(e) => {
                      Object.assign(e.currentTarget.style, styles.cardHover);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                    }}
                  >
                    {/* Project Actions */}
                    <div style={styles.projectActions}>
                      <button
                        style={styles.saveAsTemplateButton}
                        onClick={(e) => handleSaveAsTemplate(project.id, project.name, e)}
                        title="Save as Template"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#059669';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#10b981';
                        }}
                      >
                        📑
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={(e) => handleDeleteProject(project.id, project.name, e)}
                        title="Delete Project"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#dc2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#ef4444';
                        }}
                      >
                        🗑️
                      </button>
                    </div>

                    <h3 style={styles.projectTitle}>{project.name}</h3>
                    <p style={styles.projectDate}>
                      Created: {formatDate(project.createdAt)}
                    </p>
                    <p style={styles.projectDate}>
                      Updated: {formatDate(project.updatedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>📁</div>
                <div>No projects yet. Create your first Kredivo ad campaign!</div>
                <button 
                  style={{ ...styles.createButton, marginTop: '1rem' }}
                  onClick={handleCreateNewAd}
                >
                  <span>➕</span>
                  Create Your First Ad
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Size Selection Modal */}
      <SizeSelectionModal
        isOpen={showSizeModal}
        onClose={handleCloseSizeModal}
        onSelectSize={handleSizeSelected}
        selectedTemplate={selectedTemplate}
      />

      {/* Create Project Modal */}
      {showCreateModal && <CreateProjectModal />}
    </div>
  );

  function CreateProjectModal() {
    const [projectName, setProjectName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!projectName.trim()) return;

      setIsCreating(true);
      await handleStartProject(projectName.trim());
      setIsCreating(false);
    };

    return (
      <div style={styles.modal} onClick={handleCloseModal}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>
              {selectedTemplate ? 'Create Ad from Template' : 'Create New Ad'}
            </h2>
            <button style={styles.closeButton} onClick={handleCloseModal}>
              ×
            </button>
          </div>

          {/* Template and Size Information */}
          <div style={styles.templatePreview}>
            {selectedTemplate && (
              <>
                <div style={styles.previewImage}>
                  {selectedTemplate.name}
                </div>
                <div style={styles.templateInfo}>
                  <h3 style={styles.templateName}>{selectedTemplate.name}</h3>
                  <p style={styles.templateDescription}>{selectedTemplate.description}</p>
                  <div style={styles.templateMeta}>
                    <span style={styles.categoryBadge}>{selectedTemplate.category}</span>
                    <span style={styles.dimensions}>
                      Template: {selectedTemplate.dimensions.width} × {selectedTemplate.dimensions.height}px
                    </span>
                  </div>
                </div>
              </>
            )}
            
            {selectedSize && (
              <div style={{
                marginTop: selectedTemplate ? '1rem' : '0',
                padding: '1rem',
                backgroundColor: '#f0f9ff',
                borderRadius: '0.5rem',
                border: '1px solid #0ea5e9'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>📐</span>
                  <span style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600',
                    color: '#0369a1'
                  }}>
                    Canvas Size: {selectedSize.name}
                  </span>
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#0369a1'
                }}>
                  {selectedSize.width} × {selectedSize.height}px
                  {selectedSize.description && (
                    <span style={{ marginLeft: '0.5rem', opacity: 0.8 }}>
                      • {selectedSize.description}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} style={styles.projectForm}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={selectedTemplate 
                  ? `New ${selectedTemplate.name} Campaign` 
                  : 'Enter project name'
                }
                style={styles.input}
                required
                autoFocus
              />
            </div>

            <div style={styles.buttonGroup}>
              <button
                type="button"
                onClick={handleCloseModal}
                style={styles.secondaryButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!projectName.trim() || isCreating}
                style={{
                  ...styles.primaryButton,
                  opacity: (!projectName.trim() || isCreating) ? 0.6 : 1
                }}
              >
                {isCreating ? 'Creating...' : 'Start Creating'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}