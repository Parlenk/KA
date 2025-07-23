import React, { useState, useEffect } from 'react';

interface CanvasSize {
  id: string;
  name: string;
  width: number;
  height: number;
  category: string;
  platform?: string;
  description?: string;
}

interface SizeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSize: (size: CanvasSize) => void;
  selectedTemplate?: {
    id: number;
    name: string;
    dimensions: { width: number; height: number };
  } | null;
}

const SizeSelectionModal: React.FC<SizeSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectSize,
  selectedTemplate
}) => {
  const [selectedSizeOption, setSelectedSizeOption] = useState<'template' | 'famous' | 'custom' | 'default'>('template');
  const [famousSizes, setFamousSizes] = useState<CanvasSize[]>([]);
  const [selectedFamousSize, setSelectedFamousSize] = useState<CanvasSize | null>(null);
  const [customWidth, setCustomWidth] = useState(800);
  const [customHeight, setCustomHeight] = useState(600);
  const [searchTerm, setSearchTerm] = useState('');

  // Default sizes - famous advertising sizes
  const defaultSizes: CanvasSize[] = [
    // Social Media
    { id: 'instagram-square', name: 'Instagram Post', width: 1080, height: 1080, category: 'Social Media', platform: 'Instagram' },
    { id: 'instagram-story', name: 'Instagram Story', width: 1080, height: 1920, category: 'Social Media', platform: 'Instagram' },
    { id: 'facebook-post', name: 'Facebook Post', width: 1200, height: 630, category: 'Social Media', platform: 'Facebook' },
    { id: 'facebook-story', name: 'Facebook Story', width: 1080, height: 1920, category: 'Social Media', platform: 'Facebook' },
    { id: 'linkedin-post', name: 'LinkedIn Post', width: 1200, height: 627, category: 'Social Media', platform: 'LinkedIn' },
    { id: 'twitter-post', name: 'Twitter Post', width: 1200, height: 675, category: 'Social Media', platform: 'Twitter' },
    
    // Google Ads
    { id: 'google-banner', name: 'Google Display Banner', width: 728, height: 90, category: 'Google Ads', platform: 'Google' },
    { id: 'google-medium-rectangle', name: 'Google Medium Rectangle', width: 300, height: 250, category: 'Google Ads', platform: 'Google' },
    { id: 'google-leaderboard', name: 'Google Leaderboard', width: 728, height: 90, category: 'Google Ads', platform: 'Google' },
    { id: 'google-skyscraper', name: 'Google Skyscraper', width: 160, height: 600, category: 'Google Ads', platform: 'Google' },
    { id: 'google-large-rectangle', name: 'Google Large Rectangle', width: 336, height: 280, category: 'Google Ads', platform: 'Google' },
    
    // YouTube
    { id: 'youtube-thumbnail', name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'Video', platform: 'YouTube' },
    { id: 'youtube-channel-art', name: 'YouTube Channel Art', width: 2560, height: 1440, category: 'Video', platform: 'YouTube' },
    
    // Standard Web
    { id: 'web-banner', name: 'Standard Web Banner', width: 970, height: 250, category: 'Web', description: 'Common website banner' },
    { id: 'mobile-banner', name: 'Mobile Banner', width: 320, height: 50, category: 'Mobile', description: 'Mobile website banner' },
    
    // Print
    { id: 'a4-portrait', name: 'A4 Portrait', width: 794, height: 1123, category: 'Print', description: 'Standard A4 size (72 DPI)' },
    { id: 'a4-landscape', name: 'A4 Landscape', width: 1123, height: 794, category: 'Print', description: 'A4 landscape orientation' },
  ];

  useEffect(() => {
    setFamousSizes(defaultSizes);
    
    // If template is selected, default to template size
    if (selectedTemplate) {
      setSelectedSizeOption('template');
    } else {
      setSelectedSizeOption('default');
    }
  }, [selectedTemplate]);

  const filteredSizes = famousSizes.filter(size =>
    size.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    size.platform?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    size.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedSizes = filteredSizes.reduce((groups, size) => {
    const category = size.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(size);
    return groups;
  }, {} as Record<string, CanvasSize[]>);

  const handleConfirm = () => {
    let selectedSize: CanvasSize;

    switch (selectedSizeOption) {
      case 'template':
        if (selectedTemplate) {
          selectedSize = {
            id: `template-${selectedTemplate.id}`,
            name: `${selectedTemplate.name} Size`,
            width: selectedTemplate.dimensions.width,
            height: selectedTemplate.dimensions.height,
            category: 'Template',
            description: `From ${selectedTemplate.name} template`
          };
        } else {
          return;
        }
        break;
      
      case 'famous':
        if (selectedFamousSize) {
          selectedSize = selectedFamousSize;
        } else {
          return;
        }
        break;
      
      case 'custom':
        selectedSize = {
          id: 'custom',
          name: 'Custom Size',
          width: customWidth,
          height: customHeight,
          category: 'Custom',
          description: `Custom ${customWidth}×${customHeight}px`
        };
        break;
      
      case 'default':
      default:
        selectedSize = {
          id: 'default',
          name: 'Default Canvas',
          width: 800,
          height: 600,
          category: 'Default',
          description: 'Standard 800×600px canvas'
        };
        break;
    }

    onSelectSize(selectedSize);
  };

  if (!isOpen) return null;

  const styles = {
    overlay: {
      position: 'fixed' as 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '1rem',
      padding: '2rem',
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '1rem'
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '1.5rem',
      cursor: 'pointer',
      color: '#6b7280',
      padding: '0.5rem',
      borderRadius: '0.5rem',
      transition: 'all 0.2s'
    },
    subtitle: {
      color: '#6b7280',
      marginBottom: '2rem',
      fontSize: '1rem',
      lineHeight: 1.5
    },
    optionGroup: {
      marginBottom: '2rem'
    },
    optionButton: {
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      padding: '1rem',
      border: '2px solid #e5e7eb',
      borderRadius: '0.75rem',
      backgroundColor: 'white',
      cursor: 'pointer',
      marginBottom: '0.75rem',
      transition: 'all 0.2s',
      textAlign: 'left' as 'left'
    },
    optionButtonActive: {
      borderColor: '#4f46e5',
      backgroundColor: '#f8faff'
    },
    optionIcon: {
      fontSize: '1.5rem',
      marginRight: '1rem',
      minWidth: '2rem'
    },
    optionContent: {
      flex: 1
    },
    optionTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.25rem'
    },
    optionDescription: {
      fontSize: '0.875rem',
      color: '#6b7280'
    },
    sizeDetails: {
      marginTop: '1.5rem',
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.5rem',
      border: '1px solid #e5e7eb'
    },
    searchInput: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
      marginBottom: '1rem'
    },
    sizeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: '0.75rem',
      maxHeight: '300px',
      overflowY: 'auto' as 'auto'
    },
    sizeCard: {
      padding: '0.75rem',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: 'white'
    },
    sizeCardActive: {
      borderColor: '#4f46e5',
      backgroundColor: '#f8faff'
    },
    sizeCategory: {
      fontSize: '0.75rem',
      fontWeight: '600',
      color: '#4f46e5',
      textTransform: 'uppercase' as 'uppercase',
      marginBottom: '0.25rem'
    },
    sizeName: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.25rem'
    },
    sizeDimensions: {
      fontSize: '0.75rem',
      color: '#6b7280'
    },
    customInputs: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
      marginTop: '1rem'
    },
    inputGroup: {
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
      padding: '0.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.875rem'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      marginTop: '2rem',
      paddingTop: '1rem',
      borderTop: '1px solid #e5e7eb'
    },
    cancelButton: {
      flex: 1,
      padding: '0.75rem 1.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.5rem',
      backgroundColor: 'white',
      color: '#374151',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    confirmButton: {
      flex: 1,
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '0.5rem',
      backgroundColor: '#4f46e5',
      color: 'white',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s'
    },
    categoryHeader: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '0.5rem',
      marginTop: '1rem',
      paddingBottom: '0.25rem',
      borderBottom: '1px solid #e5e7eb'
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Choose Canvas Size</h2>
          <button 
            style={styles.closeButton} 
            onClick={onClose}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        <p style={styles.subtitle}>
          Select the canvas size for your design. You can choose from template dimensions, 
          popular advertising sizes, create a custom size, or use the default 800×600px canvas.
        </p>

        <div style={styles.optionGroup}>
          {/* Template Size Option */}
          {selectedTemplate && (
            <button
              style={{
                ...styles.optionButton,
                ...(selectedSizeOption === 'template' ? styles.optionButtonActive : {})
              }}
              onClick={() => setSelectedSizeOption('template')}
            >
              <div style={styles.optionIcon}>📐</div>
              <div style={styles.optionContent}>
                <div style={styles.optionTitle}>Use Template Size</div>
                <div style={styles.optionDescription}>
                  {selectedTemplate.dimensions.width} × {selectedTemplate.dimensions.height}px - 
                  From "{selectedTemplate.name}" template
                </div>
              </div>
            </button>
          )}

          {/* Famous Sizes Option */}
          <button
            style={{
              ...styles.optionButton,
              ...(selectedSizeOption === 'famous' ? styles.optionButtonActive : {})
            }}
            onClick={() => setSelectedSizeOption('famous')}
          >
            <div style={styles.optionIcon}>🌟</div>
            <div style={styles.optionContent}>
              <div style={styles.optionTitle}>Popular Advertising Sizes</div>
              <div style={styles.optionDescription}>
                Choose from Instagram, Facebook, Google Ads, YouTube, and other platform sizes
              </div>
            </div>
          </button>

          {/* Custom Size Option */}
          <button
            style={{
              ...styles.optionButton,
              ...(selectedSizeOption === 'custom' ? styles.optionButtonActive : {})
            }}
            onClick={() => setSelectedSizeOption('custom')}
          >
            <div style={styles.optionIcon}>⚙️</div>
            <div style={styles.optionContent}>
              <div style={styles.optionTitle}>Custom Size</div>
              <div style={styles.optionDescription}>
                Create your own canvas dimensions
              </div>
            </div>
          </button>

          {/* Default Size Option */}
          <button
            style={{
              ...styles.optionButton,
              ...(selectedSizeOption === 'default' ? styles.optionButtonActive : {})
            }}
            onClick={() => setSelectedSizeOption('default')}
          >
            <div style={styles.optionIcon}>📄</div>
            <div style={styles.optionContent}>
              <div style={styles.optionTitle}>Default Canvas</div>
              <div style={styles.optionDescription}>
                800 × 600px - Good for general design work
              </div>
            </div>
          </button>
        </div>

        {/* Size Details */}
        <div style={styles.sizeDetails}>
          {selectedSizeOption === 'famous' && (
            <div>
              <input
                type="text"
                placeholder="Search sizes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
              <div style={styles.sizeGrid}>
                {Object.entries(groupedSizes).map(([category, sizes]) => (
                  <div key={category}>
                    <div style={styles.categoryHeader}>{category}</div>
                    {sizes.map((size) => (
                      <div
                        key={size.id}
                        style={{
                          ...styles.sizeCard,
                          ...(selectedFamousSize?.id === size.id ? styles.sizeCardActive : {})
                        }}
                        onClick={() => setSelectedFamousSize(size)}
                      >
                        <div style={styles.sizeCategory}>{size.platform || size.category}</div>
                        <div style={styles.sizeName}>{size.name}</div>
                        <div style={styles.sizeDimensions}>
                          {size.width} × {size.height}px
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedSizeOption === 'custom' && (
            <div style={styles.customInputs}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Width (px)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Math.max(100, parseInt(e.target.value) || 100))}
                  min="100"
                  max="5000"
                  style={styles.input}
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Height (px)</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Math.max(100, parseInt(e.target.value) || 100))}
                  min="100"
                  max="5000"
                  style={styles.input}
                />
              </div>
            </div>
          )}

          {selectedSizeOption === 'template' && selectedTemplate && (
            <div>
              <strong>Template Size:</strong> {selectedTemplate.dimensions.width} × {selectedTemplate.dimensions.height}px
              <br />
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                This will create a canvas matching your selected template's dimensions.
              </span>
            </div>
          )}

          {selectedSizeOption === 'default' && (
            <div>
              <strong>Default Size:</strong> 800 × 600px
              <br />
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                A versatile canvas size perfect for general design work.
              </span>
            </div>
          )}
        </div>

        <div style={styles.buttonGroup}>
          <button 
            style={styles.cancelButton}
            onClick={onClose}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Cancel
          </button>
          <button 
            style={styles.confirmButton}
            onClick={handleConfirm}
            disabled={selectedSizeOption === 'famous' && !selectedFamousSize}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
          >
            Create Canvas
          </button>
        </div>
      </div>
    </div>
  );
};

export default SizeSelectionModal;