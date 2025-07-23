import React from 'react';

interface ShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShortcutsHelp({ isOpen, onClose }: ShortcutsHelpProps) {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Canvas Navigation',
      items: [
        { keys: ['Space + Drag'], description: 'Pan canvas' },
        { keys: ['Scroll'], description: 'Zoom in/out' },
        { keys: ['Ctrl/Cmd', '+'], description: 'Zoom in' },
        { keys: ['Ctrl/Cmd', '-'], description: 'Zoom out' },
        { keys: ['Ctrl/Cmd', '0'], description: 'Fit to screen' },
      ]
    },
    {
      category: 'Selection & Editing',
      items: [
        { keys: ['Ctrl/Cmd', 'A'], description: 'Select all objects' },
        { keys: ['Escape'], description: 'Deselect all' },
        { keys: ['Delete', 'Backspace'], description: 'Delete selected objects' },
        { keys: ['Arrow Keys'], description: 'Move selected objects 1px' },
        { keys: ['Shift', 'Arrow Keys'], description: 'Move selected objects 10px' },
      ]
    },
    {
      category: 'Copy & Paste',
      items: [
        { keys: ['Ctrl/Cmd', 'C'], description: 'Copy selected object' },
        { keys: ['Ctrl/Cmd', 'V'], description: 'Paste copied object' },
        { keys: ['Ctrl/Cmd', 'D'], description: 'Duplicate selected object' },
      ]
    },
    {
      category: 'History',
      items: [
        { keys: ['Ctrl/Cmd', 'Z'], description: 'Undo last action' },
        { keys: ['Ctrl/Cmd', 'Y'], description: 'Redo last action' },
        { keys: ['Ctrl/Cmd', 'Shift', 'Z'], description: 'Redo last action (alt)' },
      ]
    },
    {
      category: 'Tools',
      items: [
        { keys: ['T'], description: 'Select text tool' },
        { keys: ['R'], description: 'Select rectangle tool' },
        { keys: ['O'], description: 'Select circle tool' },
        { keys: ['I'], description: 'Select image tool' },
        { keys: ['V'], description: 'Select pointer tool' },
      ]
    },
    {
      category: 'File Operations',
      items: [
        { keys: ['Ctrl/Cmd', 'S'], description: 'Save project' },
        { keys: ['Ctrl/Cmd', 'E'], description: 'Export design' },
        { keys: ['Ctrl/Cmd', 'N'], description: 'New project' },
        { keys: ['Ctrl/Cmd', 'O'], description: 'Open project' },
      ]
    }
  ];

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
      zIndex: 2000,
      fontFamily: 'system-ui, sans-serif'
    },
    modal: {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      padding: '2rem',
      maxWidth: '800px',
      width: '90%',
      maxHeight: '80vh',
      overflowY: 'auto' as 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem'
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: 0
    },
    closeButton: {
      padding: '0.5rem',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      borderRadius: '0.375rem',
      fontSize: '1.5rem',
      color: '#6b7280',
      transition: 'all 0.2s'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '2rem'
    },
    category: {
      marginBottom: '1.5rem'
    },
    categoryTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.75rem',
      paddingBottom: '0.5rem',
      borderBottom: '2px solid #f3f4f6'
    },
    shortcutItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem 0',
      borderBottom: '1px solid #f9fafb'
    },
    shortcutKeys: {
      display: 'flex',
      gap: '0.25rem',
      alignItems: 'center'
    },
    key: {
      padding: '0.25rem 0.5rem',
      backgroundColor: '#f3f4f6',
      border: '1px solid #d1d5db',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      fontWeight: '500',
      color: '#374151',
      fontFamily: 'monospace'
    },
    plus: {
      color: '#6b7280',
      fontSize: '0.75rem'
    },
    description: {
      fontSize: '0.875rem',
      color: '#6b7280',
      flex: 1,
      marginLeft: '1rem'
    },
    footer: {
      marginTop: '2rem',
      padding: '1rem',
      backgroundColor: '#f9fafb',
      borderRadius: '0.5rem',
      textAlign: 'center' as 'center'
    },
    footerText: {
      fontSize: '0.875rem',
      color: '#6b7280',
      margin: 0
    },
    platform: {
      display: 'inline-block',
      padding: '0.125rem 0.375rem',
      backgroundColor: '#e5e7eb',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      fontWeight: '500',
      marginLeft: '0.5rem'
    }
  };

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  const formatKeys = (keys: string[]) => {
    return keys.map((key, index) => (
      <React.Fragment key={key}>
        {index > 0 && <span style={styles.plus}>+</span>}
        <span style={styles.key}>
          {key === 'Ctrl/Cmd' ? (isMac ? '⌘' : 'Ctrl') : key}
        </span>
      </React.Fragment>
    ));
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>⌨️ Keyboard Shortcuts</h2>
          <button 
            style={styles.closeButton}
            onClick={onClose}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        <div style={styles.grid}>
          {shortcuts.map((category) => (
            <div key={category.category} style={styles.category}>
              <h3 style={styles.categoryTitle}>{category.category}</h3>
              {category.items.map((shortcut, index) => (
                <div key={index} style={styles.shortcutItem}>
                  <div style={styles.shortcutKeys}>
                    {formatKeys(shortcut.keys)}
                  </div>
                  <div style={styles.description}>
                    {shortcut.description}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Press <strong>?</strong> or <strong>F1</strong> to toggle this help
            <span style={styles.platform}>
              {isMac ? 'macOS' : 'Windows/Linux'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}