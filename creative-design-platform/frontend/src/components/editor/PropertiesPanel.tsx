import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';

interface PropertiesPanelProps {
  canvas: fabric.Canvas | null;
  selectedObjects: fabric.Object[];
  onObjectUpdate: (object: fabric.Object, properties: any) => void;
}

export default function PropertiesPanel({
  canvas,
  selectedObjects,
  onObjectUpdate
}: PropertiesPanelProps) {
  const [properties, setProperties] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'appearance' | 'transform' | 'text'>('appearance');

  // Update properties when selection changes
  useEffect(() => {
    if (selectedObjects.length === 1) {
      const obj = selectedObjects[0];
      setProperties({
        left: Math.round(obj.left || 0),
        top: Math.round(obj.top || 0),
        width: Math.round(obj.getScaledWidth()),
        height: Math.round(obj.getScaledHeight()),
        scaleX: obj.scaleX || 1,
        scaleY: obj.scaleY || 1,
        angle: Math.round(obj.angle || 0),
        opacity: (obj.opacity || 1) * 100,
        fill: obj.fill || '#000000',
        stroke: obj.stroke || '',
        strokeWidth: obj.strokeWidth || 0,
        strokeDashArray: obj.strokeDashArray || [],
        shadow: obj.shadow,
        // Text properties
        fontSize: (obj as any).fontSize || 20,
        fontFamily: (obj as any).fontFamily || 'Arial',
        fontWeight: (obj as any).fontWeight || 'normal',
        fontStyle: (obj as any).fontStyle || 'normal',
        textAlign: (obj as any).textAlign || 'left',
        underline: (obj as any).underline || false,
        overline: (obj as any).overline || false,
        linethrough: (obj as any).linethrough || false,
        text: (obj as any).text || '',
        lineHeight: (obj as any).lineHeight || 1.16,
        charSpacing: (obj as any).charSpacing || 0,
      });
    } else {
      setProperties({});
    }
  }, [selectedObjects]);

  const updateProperty = (key: string, value: any) => {
    if (selectedObjects.length !== 1) return;

    const obj = selectedObjects[0];
    const updates: any = { [key]: value };

    // Handle special cases
    if (key === 'opacity') {
      updates.opacity = value / 100;
    }

    if (key === 'width' || key === 'height') {
      const currentWidth = obj.getScaledWidth();
      const currentHeight = obj.getScaledHeight();
      
      if (key === 'width') {
        updates.scaleX = value / (obj.width || 1);
      } else {
        updates.scaleY = value / (obj.height || 1);
      }
    }

    // Apply updates
    obj.set(updates);
    canvas?.renderAll();
    onObjectUpdate(obj, updates);

    // Update local state
    setProperties(prev => ({ ...prev, [key]: value }));
  };

  const addShadow = () => {
    if (selectedObjects.length !== 1) return;

    const obj = selectedObjects[0];
    const shadow = new fabric.Shadow({
      color: 'rgba(0,0,0,0.3)',
      blur: 10,
      offsetX: 5,
      offsetY: 5,
    });

    obj.set('shadow', shadow);
    canvas?.renderAll();
    onObjectUpdate(obj, { shadow });
  };

  const removeShadow = () => {
    if (selectedObjects.length !== 1) return;

    const obj = selectedObjects[0];
    obj.set('shadow', null);
    canvas?.renderAll();
    onObjectUpdate(obj, { shadow: null });
  };

  const duplicateObject = () => {
    if (selectedObjects.length !== 1 || !canvas) return;

    const obj = selectedObjects[0];
    obj.clone((cloned: fabric.Object) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    });
  };

  const bringToFront = () => {
    if (selectedObjects.length !== 1 || !canvas) return;
    const obj = selectedObjects[0];
    canvas.bringToFront(obj);
    canvas.renderAll();
  };

  const sendToBack = () => {
    if (selectedObjects.length !== 1 || !canvas) return;
    const obj = selectedObjects[0];
    canvas.sendToBack(obj);
    canvas.renderAll();
  };

  const bringForward = () => {
    if (selectedObjects.length !== 1 || !canvas) return;
    const obj = selectedObjects[0];
    canvas.bringForward(obj);
    canvas.renderAll();
  };

  const sendBackwards = () => {
    if (selectedObjects.length !== 1 || !canvas) return;
    const obj = selectedObjects[0];
    canvas.sendBackwards(obj);
    canvas.renderAll();
  };

  const isTextObject = () => {
    return selectedObjects.length === 1 && 
           (selectedObjects[0] instanceof fabric.Textbox || selectedObjects[0] instanceof fabric.Text);
  };

  const styles = {
    container: {
      width: '280px',
      backgroundColor: 'white',
      borderLeft: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column' as 'column',
      height: '100%'
    },
    header: {
      padding: '1rem',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    },
    title: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#374151',
      margin: 0
    },
    tabs: {
      display: 'flex',
      borderBottom: '1px solid #e5e7eb'
    },
    tab: {
      flex: 1,
      padding: '0.75rem',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '0.75rem',
      fontWeight: '500',
      transition: 'all 0.2s'
    },
    tabActive: {
      backgroundColor: '#dbeafe',
      color: '#1d4ed8',
      borderBottom: '2px solid #1d4ed8'
    },
    content: {
      flex: 1,
      overflowY: 'auto' as 'auto',
      padding: '1rem'
    },
    section: {
      marginBottom: '1.5rem'
    },
    sectionTitle: {
      fontSize: '0.75rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.5rem',
      textTransform: 'uppercase' as 'uppercase',
      letterSpacing: '0.05em'
    },
    formGroup: {
      marginBottom: '0.75rem'
    },
    label: {
      display: 'block',
      fontSize: '0.75rem',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '0.25rem'
    },
    input: {
      width: '100%',
      padding: '0.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      backgroundColor: 'white'
    },
    colorInput: {
      width: '100%',
      height: '2rem',
      padding: '0.125rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      cursor: 'pointer'
    },
    rangeInput: {
      width: '100%',
      marginBottom: '0.25rem'
    },
    rangeValue: {
      fontSize: '0.75rem',
      color: '#6b7280',
      textAlign: 'right' as 'right'
    },
    row: {
      display: 'flex',
      gap: '0.5rem'
    },
    col: {
      flex: 1
    },
    button: {
      padding: '0.5rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: 'white'
    },
    buttonPrimary: {
      backgroundColor: '#4f46e5',
      color: 'white',
      borderColor: '#4f46e5'
    },
    buttonGroup: {
      display: 'flex',
      gap: '0.25rem',
      marginBottom: '0.5rem'
    },
    checkbox: {
      marginRight: '0.5rem'
    },
    emptyState: {
      padding: '2rem',
      textAlign: 'center' as 'center',
      color: '#6b7280'
    },
    emptyIcon: {
      fontSize: '2rem',
      marginBottom: '0.5rem'
    },
    emptyText: {
      fontSize: '0.875rem'
    }
  };

  if (selectedObjects.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Properties</h3>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🎛️</div>
          <div style={styles.emptyText}>Select an object to edit properties</div>
        </div>
      </div>
    );
  }

  if (selectedObjects.length > 1) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>Properties</h3>
        </div>
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📦</div>
          <div style={styles.emptyText}>Multiple objects selected</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Properties</h3>
      </div>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'appearance' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('appearance')}
        >
          Appearance
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'transform' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('transform')}
        >
          Transform
        </button>
        {isTextObject() && (
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'text' ? styles.tabActive : {})
            }}
            onClick={() => setActiveTab('text')}
          >
            Text
          </button>
        )}
      </div>

      <div style={styles.content}>
        {activeTab === 'appearance' && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Fill & Stroke</div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Fill Color</label>
                <input
                  type="color"
                  value={properties.fill || '#000000'}
                  onChange={(e) => updateProperty('fill', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Stroke Color</label>
                <input
                  type="color"
                  value={properties.stroke || '#000000'}
                  onChange={(e) => updateProperty('stroke', e.target.value)}
                  style={styles.colorInput}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Stroke Width</label>
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={properties.strokeWidth || 0}
                  onChange={(e) => updateProperty('strokeWidth', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Opacity: {Math.round(properties.opacity || 100)}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={properties.opacity || 100}
                  onChange={(e) => updateProperty('opacity', parseFloat(e.target.value))}
                  style={styles.rangeInput}
                />
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Shadow</div>
              
              <div style={styles.buttonGroup}>
                <button style={styles.button} onClick={addShadow}>
                  Add Shadow
                </button>
                <button style={styles.button} onClick={removeShadow}>
                  Remove Shadow
                </button>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Layer Order</div>
              
              <div style={styles.buttonGroup}>
                <button style={styles.button} onClick={bringToFront}>↑↑ Front</button>
                <button style={styles.button} onClick={bringForward}>↑ Forward</button>
              </div>
              <div style={styles.buttonGroup}>
                <button style={styles.button} onClick={sendBackwards}>↓ Backward</button>
                <button style={styles.button} onClick={sendToBack}>↓↓ Back</button>
              </div>
            </div>

            <div style={styles.section}>
              <button style={{ ...styles.button, ...styles.buttonPrimary, width: '100%' }} onClick={duplicateObject}>
                🔄 Duplicate Object
              </button>
            </div>
          </>
        )}

        {activeTab === 'transform' && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Position</div>
              
              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>X</label>
                  <input
                    type="number"
                    value={properties.left || 0}
                    onChange={(e) => updateProperty('left', parseFloat(e.target.value))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Y</label>
                  <input
                    type="number"
                    value={properties.top || 0}
                    onChange={(e) => updateProperty('top', parseFloat(e.target.value))}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Size</div>
              
              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Width</label>
                  <input
                    type="number"
                    value={properties.width || 0}
                    onChange={(e) => updateProperty('width', parseFloat(e.target.value))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Height</label>
                  <input
                    type="number"
                    value={properties.height || 0}
                    onChange={(e) => updateProperty('height', parseFloat(e.target.value))}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Rotation</div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Angle: {properties.angle || 0}°</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={properties.angle || 0}
                  onChange={(e) => updateProperty('angle', parseFloat(e.target.value))}
                  style={styles.rangeInput}
                />
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Scale</div>
              
              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>Scale X</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={properties.scaleX || 1}
                    onChange={(e) => updateProperty('scaleX', parseFloat(e.target.value))}
                    style={styles.input}
                  />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Scale Y</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={properties.scaleY || 1}
                    onChange={(e) => updateProperty('scaleY', parseFloat(e.target.value))}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'text' && isTextObject() && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Font</div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Font Family</label>
                <select
                  value={properties.fontFamily || 'Arial'}
                  onChange={(e) => updateProperty('fontFamily', e.target.value)}
                  style={styles.input}
                >
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Impact">Impact</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Font Size</label>
                <input
                  type="number"
                  min="8"
                  max="200"
                  value={properties.fontSize || 20}
                  onChange={(e) => updateProperty('fontSize', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Text Align</label>
                <select
                  value={properties.textAlign || 'left'}
                  onChange={(e) => updateProperty('textAlign', e.target.value)}
                  style={styles.input}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Text Style</div>
              
              <div style={styles.buttonGroup}>
                <button
                  style={{
                    ...styles.button,
                    ...(properties.fontWeight === 'bold' ? styles.buttonPrimary : {})
                  }}
                  onClick={() => updateProperty('fontWeight', properties.fontWeight === 'bold' ? 'normal' : 'bold')}
                >
                  B
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(properties.fontStyle === 'italic' ? styles.buttonPrimary : {})
                  }}
                  onClick={() => updateProperty('fontStyle', properties.fontStyle === 'italic' ? 'normal' : 'italic')}
                >
                  I
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...(properties.underline ? styles.buttonPrimary : {})
                  }}
                  onClick={() => updateProperty('underline', !properties.underline)}
                >
                  U
                </button>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Line Height</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="3"
                  value={properties.lineHeight || 1.16}
                  onChange={(e) => updateProperty('lineHeight', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Character Spacing</label>
                <input
                  type="number"
                  min="-50"
                  max="200"
                  value={properties.charSpacing || 0}
                  onChange={(e) => updateProperty('charSpacing', parseFloat(e.target.value))}
                  style={styles.input}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}