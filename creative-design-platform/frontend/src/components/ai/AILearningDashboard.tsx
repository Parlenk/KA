import React, { useState, useEffect } from 'react';
import { aiLearningService } from '../../services/aiLearningService';

interface AILearningDashboardProps {
  userId: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function AILearningDashboard({ userId, isVisible, onClose }: AILearningDashboardProps) {
  const [insights, setInsights] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'preferences' | 'export'>('overview');

  useEffect(() => {
    if (isVisible) {
      fetchData();
    }
  }, [isVisible, userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get user insights from service
      const userInsights = aiLearningService.getUserInsights(userId);
      setInsights(userInsights);

      // Get overall stats from backend
      const response = await fetch('/api/v1/ai/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch AI learning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    try {
      const response = await fetch(`/api/v1/ai/export/${userId}`);
      if (response.ok) {
        const data = await response.json();
        
        // Create downloadable file
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-learning-data-${userId}-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const resetLearningData = async () => {
    if (!window.confirm('Are you sure you want to reset all AI learning data? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/ai/reset/${userId}`, { method: 'DELETE' });
      if (response.ok) {
        alert('AI learning data has been reset successfully');
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to reset data:', error);
    }
  };

  if (!isVisible) return null;

  const styles = {
    overlay: {
      position: 'fixed' as 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '16px',
      width: '90%',
      maxWidth: '800px',
      height: '90%',
      maxHeight: '600px',
      overflow: 'hidden',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
    },
    header: {
      padding: '24px',
      borderBottom: '1px solid #e5e7eb',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      marginBottom: '8px'
    },
    subtitle: {
      fontSize: '14px',
      opacity: 0.9
    },
    closeButton: {
      position: 'absolute' as 'absolute',
      top: '20px',
      right: '20px',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      borderRadius: '50%',
      width: '32px',
      height: '32px',
      color: 'white',
      fontSize: '18px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    tabs: {
      display: 'flex',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    },
    tab: {
      flex: 1,
      padding: '12px 16px',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s',
      textAlign: 'center' as 'center'
    },
    tabActive: {
      backgroundColor: 'white',
      color: '#4f46e5',
      borderBottom: '2px solid #4f46e5'
    },
    content: {
      padding: '24px',
      height: 'calc(100% - 160px)',
      overflowY: 'auto' as 'auto'
    },
    loading: {
      textAlign: 'center' as 'center',
      padding: '60px',
      color: '#6b7280'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    card: {
      backgroundColor: '#f8fafc',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    },
    cardTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#6b7280',
      marginBottom: '8px',
      textTransform: 'uppercase' as 'uppercase'
    },
    cardValue: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1f2937'
    },
    cardSubtitle: {
      fontSize: '12px',
      color: '#6b7280',
      marginTop: '4px'
    },
    section: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '12px'
    },
    progressBar: {
      width: '100%',
      height: '8px',
      backgroundColor: '#e5e7eb',
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '8px'
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#10b981',
      transition: 'width 0.3s ease'
    },
    list: {
      listStyle: 'none',
      padding: 0,
      margin: 0
    },
    listItem: {
      padding: '12px 0',
      borderBottom: '1px solid #f3f4f6',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    badge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500'
    },
    badgeSuccess: {
      backgroundColor: '#d1fae5',
      color: '#065f46'
    },
    badgeWarning: {
      backgroundColor: '#fef3c7',
      color: '#92400e'
    },
    badgeInfo: {
      backgroundColor: '#dbeafe',
      color: '#1e40af'
    },
    button: {
      padding: '8px 16px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: 'white',
      color: '#374151',
      fontSize: '14px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      marginRight: '8px'
    },
    buttonPrimary: {
      backgroundColor: '#4f46e5',
      color: 'white',
      borderColor: '#4f46e5'
    },
    buttonDanger: {
      backgroundColor: '#ef4444',
      color: 'white',
      borderColor: '#ef4444'
    }
  };

  const renderOverview = () => (
    <div>
      {insights && (
        <>
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Total Resizes</div>
              <div style={styles.cardValue}>{insights.totalResizes}</div>
              <div style={styles.cardSubtitle}>AI resize operations</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Acceptance Rate</div>
              <div style={styles.cardValue}>{Math.round(insights.acceptanceRate * 100)}%</div>
              <div style={styles.cardSubtitle}>Resizes you kept</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>User Segment</div>
              <div style={styles.cardValue}>{insights.segment}</div>
              <div style={styles.cardSubtitle}>Skill level</div>
            </div>
            <div style={styles.card}>
              <div style={styles.cardTitle}>Preferred Strategy</div>
              <div style={styles.cardValue} style={{ fontSize: '16px' }}>
                {insights.preferredStrategy?.replace(/_/g, ' ')}
              </div>
              <div style={styles.cardSubtitle}>Most successful</div>
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>🎯 Learning Progress</div>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${Math.min(100, insights.totalResizes * 10)}%`
                }}
              />
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {insights.totalResizes}/10 resizes to unlock advanced AI features
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>🔧 Object Priorities</div>
            <ul style={styles.list}>
              {Object.entries(insights.objectPriorities || {}).map(([type, priority]: [string, any]) => (
                <li key={type} style={styles.listItem}>
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                  <span style={{
                    ...styles.badge,
                    ...(priority > 1.5 ? styles.badgeSuccess : priority > 1 ? styles.badgeWarning : styles.badgeInfo)
                  }}>
                    Priority: {priority.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );

  const renderPatterns = () => (
    <div>
      {stats && (
        <>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>📊 Strategy Performance</div>
            <ul style={styles.list}>
              {Object.entries(stats.strategyStats || {}).map(([strategy, data]: [string, any]) => (
                <li key={strategy} style={styles.listItem}>
                  <div>
                    <div style={{ fontWeight: '500', textTransform: 'capitalize' }}>
                      {strategy.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {data.total} uses • {Math.round(data.successRate * 100)}% success
                    </div>
                  </div>
                  <div style={{
                    ...styles.badge,
                    ...(data.successRate > 0.7 ? styles.badgeSuccess : 
                        data.successRate > 0.4 ? styles.badgeWarning : styles.badgeInfo)
                  }}>
                    {Math.round(data.successRate * 100)}%
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>🧠 Model Confidence</div>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${stats.modelConfidence * 100}%`
                }}
              />
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              {Math.round(stats.modelConfidence * 100)}% confidence • {stats.patternsLearned} patterns learned
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>🏆 Top Patterns</div>
            <ul style={styles.list}>
              {stats.topPatterns?.map((pattern: any, index: number) => (
                <li key={index} style={styles.listItem}>
                  <div>
                    <div style={{ fontWeight: '500' }}>
                      {pattern.strategy.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {pattern.totalUses} uses
                    </div>
                  </div>
                  <span style={{...styles.badge, ...styles.badgeSuccess}}>
                    {Math.round(pattern.successRate * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );

  const renderPreferences = () => (
    <div>
      {insights && (
        <>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>⚙️ Your Preferences</div>
            <div style={styles.card}>
              <div style={{ marginBottom: '12px' }}>
                <strong>Preferred Padding:</strong> {insights.preferredPadding || 20}px
              </div>
              <div style={{ marginBottom: '12px' }}>
                <strong>Preferred Strategy:</strong> {insights.preferredStrategy?.replace(/_/g, ' ') || 'Balanced'}
              </div>
              <div>
                <strong>Most Used Strategy:</strong> {insights.mostUsedStrategy?.replace(/_/g, ' ') || 'None yet'}
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>💡 Improvement Suggestions</div>
            <div style={styles.card}>
              <div style={{ color: '#6b7280' }}>
                Based on your usage patterns, here are some suggestions:
              </div>
              <ul style={{ marginTop: '12px', paddingLeft: '20px' }}>
                <li>Try different resize strategies to improve acceptance rate</li>
                <li>Provide feedback to help AI learn your preferences</li>
                <li>Use the rating system to indicate satisfaction</li>
                <li>Experiment with different canvas orientations</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderExport = () => (
    <div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>📤 Data Export & Management</div>
        <div style={styles.card}>
          <div style={{ marginBottom: '16px' }}>
            <strong>Export Your Learning Data</strong>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              Download all your AI learning data including preferences, resize history, and patterns.
            </div>
          </div>
          <button style={{...styles.button, ...styles.buttonPrimary}} onClick={exportUserData}>
            📥 Export Data
          </button>
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>🗑️ Reset Learning Data</div>
        <div style={styles.card}>
          <div style={{ marginBottom: '16px' }}>
            <strong>Reset All Learning Data</strong>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
              This will permanently delete all your AI learning data and start fresh. This cannot be undone.
            </div>
          </div>
          <button style={{...styles.button, ...styles.buttonDanger}} onClick={resetLearningData}>
            🗑️ Reset All Data
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🤖 AI Learning Dashboard</h2>
          <p style={styles.subtitle}>Track how the AI is learning your design preferences</p>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.tabs}>
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'patterns', label: '🧠 Patterns' },
            { key: 'preferences', label: '⚙️ Preferences' },
            { key: 'export', label: '📤 Export' }
          ].map(tab => (
            <button
              key={tab.key}
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.tabActive : {})
              }}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🤖</div>
              <div>Loading AI learning insights...</div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'patterns' && renderPatterns()}
              {activeTab === 'preferences' && renderPreferences()}
              {activeTab === 'export' && renderExport()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}