import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';

interface PropertiesPanelProps {
  canvas: fabric.Canvas | null;
  selectedObjects: fabric.Object[];
  onObjectUpdate: (object: fabric.Object, properties: any) => void;
}

export default function EnterprisePropertiesPanel({
  canvas,
  selectedObjects,
  onObjectUpdate
}: PropertiesPanelProps) {
  const [properties, setProperties] = useState<any>({});
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'transform' | 'text' | 'effects'>('general');

  // Update properties when selection changes
  useEffect(() => {
    if (selectedObjects.length === 1) {
      const obj = selectedObjects[0];
      const bounds = obj.getBoundingRect();
      
      setProperties({
        // General properties
        id: (obj as any).id || 'object_' + Date.now(),
        name: (obj as any).name || getObjectTypeName(obj),
        type: getObjectType(obj),
        visible: obj.visible !== false,
        locked: !obj.selectable,
        
        // Transform properties
        left: Math.round(obj.left || 0),
        top: Math.round(obj.top || 0),
        width: Math.round(obj.getScaledWidth()),
        height: Math.round(obj.getScaledHeight()),
        scaleX: Number((obj.scaleX || 1).toFixed(2)),
        scaleY: Number((obj.scaleY || 1).toFixed(2)),
        angle: Math.round(obj.angle || 0),
        flipX: obj.flipX || false,
        flipY: obj.flipY || false,
        skewX: obj.skewX || 0,
        skewY: obj.skewY || 0,
        
        // Appearance properties
        opacity: Math.round((obj.opacity || 1) * 100),
        fill: obj.fill || '#000000',
        stroke: obj.stroke || '',
        strokeWidth: obj.strokeWidth || 0,
        strokeDashArray: obj.strokeDashArray || [],
        strokeLineCap: obj.strokeLineCap || 'butt',
        strokeLineJoin: obj.strokeLineJoin || 'miter',
        
        // Shadow properties
        shadow: obj.shadow,
        shadowColor: obj.shadow?.color || '#000000',
        shadowBlur: obj.shadow?.blur || 0,
        shadowOffsetX: obj.shadow?.offsetX || 0,
        shadowOffsetY: obj.shadow?.offsetY || 0,
        
        // Text properties (if text object)
        text: (obj as any).text || '',
        fontSize: (obj as any).fontSize || 20,
        fontFamily: (obj as any).fontFamily || 'Arial',
        fontWeight: (obj as any).fontWeight || 'normal',
        fontStyle: (obj as any).fontStyle || 'normal',
        textAlign: (obj as any).textAlign || 'left',
        lineHeight: (obj as any).lineHeight || 1.16,
        charSpacing: (obj as any).charSpacing || 0,
        underline: (obj as any).underline || false,
        overline: (obj as any).overline || false,
        linethrough: (obj as any).linethrough || false,
        textBackgroundColor: (obj as any).textBackgroundColor || '',
        
        // Advanced properties
        selectable: obj.selectable !== false,
        evented: obj.evented !== false,
        moveCursor: obj.moveCursor || 'move',
        hoverCursor: obj.hoverCursor || 'move',
        
        // Bounds info
        boundingBox: {
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height
        }
      });
    } else {
      setProperties({});
    }
  }, [selectedObjects]);

  const getObjectType = (obj: fabric.Object): string => {
    if (obj instanceof fabric.Textbox || obj instanceof fabric.Text) return 'text';
    if (obj instanceof fabric.Image) return 'image';
    if (obj instanceof fabric.Rect) return 'rectangle';
    if (obj instanceof fabric.Circle) return 'circle';
    if (obj instanceof fabric.Triangle) return 'triangle';
    if (obj instanceof fabric.Group) return 'group';
    if (obj instanceof fabric.Path) return 'path';
    return 'object';
  };

  const getObjectTypeName = (obj: fabric.Object): string => {
    const type = getObjectType(obj);
    switch (type) {
      case 'text': return 'Text Layer';
      case 'image': return 'Image Layer';
      case 'rectangle': return 'Rectangle';
      case 'circle': return 'Circle';
      case 'triangle': return 'Triangle';
      case 'group': return 'Group';
      case 'path': return 'Path';
      default: return 'Object';
    }
  };

  const updateProperty = (key: string, value: any) => {
    if (selectedObjects.length !== 1) return;

    const obj = selectedObjects[0];
    const updates: any = { [key]: value };

    // Handle special cases
    if (key === 'opacity') {
      updates.opacity = value / 100;
    }

    if (key === 'width' || key === 'height') {
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
      color: properties.shadowColor || '#000000',
      blur: properties.shadowBlur || 10,
      offsetX: properties.shadowOffsetX || 5,
      offsetY: properties.shadowOffsetY || 5,
    });

    obj.set('shadow', shadow);
    canvas?.renderAll();
    setProperties(prev => ({ ...prev, shadow }));
    onObjectUpdate(obj, { shadow });
  };

  const removeShadow = () => {
    if (selectedObjects.length !== 1) return;

    const obj = selectedObjects[0];
    obj.set('shadow', null);
    canvas?.renderAll();
    setProperties(prev => ({ ...prev, shadow: null }));
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

  const deleteObject = () => {
    if (selectedObjects.length === 0 || !canvas) return;
    
    selectedObjects.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const alignObject = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedObjects.length !== 1 || !canvas) return;

    const obj = selectedObjects[0];
    const canvasWidth = canvas.width || 800;
    const canvasHeight = canvas.height || 600;
    
    // Add padding for better visual alignment (20px from edges)
    const padding = 20;
    
    // Get object's current bounding rectangle (actual visual bounds)
    const objBounds = obj.getBoundingRect();
    const objWidth = objBounds.width;
    const objHeight = objBounds.height;
    
    // Calculate the offset between object's position and its visual bounds
    const offsetX = objBounds.left - (obj.left || 0);
    const offsetY = objBounds.top - (obj.top || 0);
    
    let newLeft = obj.left || 0;
    let newTop = obj.top || 0;

    switch (alignment) {
      case 'left':
        // Align visual left edge to padding distance from canvas left
        newLeft = padding - offsetX;
        break;
      case 'center':
        // Center the visual bounds horizontally
        const centerX = canvasWidth / 2;
        newLeft = centerX - objWidth / 2 - offsetX;
        break;
      case 'right':
        // Align visual right edge to padding distance from canvas right
        newLeft = canvasWidth - padding - objWidth - offsetX;
        break;
      case 'top':
        // Align visual top edge to padding distance from canvas top
        newTop = padding - offsetY;
        break;
      case 'middle':
        // Center the visual bounds vertically
        const centerY = canvasHeight / 2;
        newTop = centerY - objHeight / 2 - offsetY;
        break;
      case 'bottom':
        // Align visual bottom edge to padding distance from canvas bottom
        newTop = canvasHeight - padding - objHeight - offsetY;
        break;
    }

    // Ensure the object's visual bounds stay within canvas
    const finalBounds = {
      left: newLeft + offsetX,
      top: newTop + offsetY,
      right: newLeft + offsetX + objWidth,
      bottom: newTop + offsetY + objHeight
    };
    
    // Adjust if bounds exceed canvas
    if (finalBounds.left < 0) {
      newLeft = -offsetX;
    } else if (finalBounds.right > canvasWidth) {
      newLeft = canvasWidth - objWidth - offsetX;
    }
    
    if (finalBounds.top < 0) {
      newTop = -offsetY;
    } else if (finalBounds.bottom > canvasHeight) {
      newTop = canvasHeight - objHeight - offsetY;
    }
    
    // Apply the new position
    obj.set({
      left: newLeft,
      top: newTop
    });
    
    // Update coordinates and render
    obj.setCoords();
    canvas.renderAll();
    onObjectUpdate(obj, { left: obj.left, top: obj.top });
    
    // Update properties display
    setProperties(prev => ({
      ...prev,
      left: Math.round(obj.left || 0),
      top: Math.round(obj.top || 0)
    }));
    
    console.log(`🎯 Aligned ${alignment}:`, {
      canvasSize: `${canvasWidth}x${canvasHeight}`,
      objectBounds: objBounds,
      newPosition: `${Math.round(newLeft)}, ${Math.round(newTop)}`,
      visualBounds: `${Math.round(finalBounds.left)}, ${Math.round(finalBounds.top)} to ${Math.round(finalBounds.right)}, ${Math.round(finalBounds.bottom)}`
    });
  };

  const isTextObject = () => {
    return selectedObjects.length === 1 && 
           (selectedObjects[0] instanceof fabric.Textbox || selectedObjects[0] instanceof fabric.Text);
  };

  const styles = {
    container: {
      width: '350px',
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column' as 'column',
      height: '100%',
      fontFamily: 'system-ui, sans-serif',
      flexShrink: 0
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
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb',
      overflowX: 'auto' as 'auto'
    },
    tab: {
      flex: 1,
      padding: '0.75rem 0.5rem',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      fontSize: '0.6rem',
      fontWeight: '500',
      transition: 'all 0.2s',
      textAlign: 'center' as 'center',
      minWidth: '60px'
    },
    tabActive: {
      backgroundColor: '#ffffff',
      color: '#4f46e5',
      borderBottom: '2px solid #4f46e5'
    },
    content: {
      flex: 1,
      overflowY: 'auto' as 'auto',
      padding: '0'
    },
    section: {
      borderBottom: '1px solid #f3f4f6',
      padding: '1rem'
    },
    sectionTitle: {
      fontSize: '0.75rem',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '0.75rem',
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
    buttonDanger: {
      backgroundColor: '#ef4444',
      color: 'white',
      borderColor: '#ef4444'
    },
    buttonGroup: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.5rem',
      marginBottom: '0.75rem'
    },
    alignmentGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: '0.25rem',
      marginBottom: '0.75rem'
    },
    checkbox: {
      marginRight: '0.5rem'
    },
    select: {
      width: '100%',
      padding: '0.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      backgroundColor: 'white'
    },
    objectInfo: {
      backgroundColor: '#f3f4f6',
      padding: '0.75rem',
      borderRadius: '0.5rem',
      fontSize: '0.75rem',
      color: '#4b5563'
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
        <div style={styles.content}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Multiple Selection ({selectedObjects.length} objects)</div>
            <div style={styles.buttonGroup}>
              <button style={styles.button} onClick={duplicateObject}>
                🔄 Duplicate
              </button>
              <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={deleteObject}>
                🗑️ Delete
              </button>
            </div>
          </div>
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
            ...(activeTab === 'general' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('general')}
        >
          General
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
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'appearance' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('appearance')}
        >
          Style
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
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'effects' ? styles.tabActive : {})
          }}
          onClick={() => setActiveTab('effects')}
        >
          Effects
        </button>
      </div>

      <div style={styles.content}>
        {activeTab === 'general' && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Object Info</div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Name</label>
                <input
                  type="text"
                  value={properties.name || ''}
                  onChange={(e) => updateProperty('name', e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.objectInfo}>
                <div><strong>Type:</strong> {properties.type}</div>
                <div><strong>ID:</strong> {properties.id}</div>
                <div><strong>Size:</strong> {properties.width} × {properties.height}px</div>
                <div><strong>Position:</strong> {properties.left}, {properties.top}</div>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Visibility & Lock</div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <input
                    type="checkbox"
                    checked={properties.visible}
                    onChange={(e) => updateProperty('visible', e.target.checked)}
                    style={styles.checkbox}
                  />
                  Visible
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  <input
                    type="checkbox"
                    checked={properties.locked}
                    onChange={(e) => updateProperty('locked', e.target.checked)}
                    style={styles.checkbox}
                  />
                  Locked
                </label>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Actions</div>
              
              <div style={styles.buttonGroup}>
                <button style={styles.button} onClick={duplicateObject}>
                  🔄 Duplicate
                </button>
                <button style={{ ...styles.button, ...styles.buttonDanger }} onClick={deleteObject}>
                  🗑️ Delete
                </button>
              </div>
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
              <div style={styles.sectionTitle}>Rotation & Flip</div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Rotation: {properties.angle}°</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={properties.angle || 0}
                  onChange={(e) => updateProperty('angle', parseFloat(e.target.value))}
                  style={styles.rangeInput}
                />
              </div>

              <div style={styles.buttonGroup}>
                <button
                  style={properties.flipX ? { ...styles.button, ...styles.buttonPrimary } : styles.button}
                  onClick={() => updateProperty('flipX', !properties.flipX)}
                >
                  ↔️ Flip X
                </button>
                <button
                  style={properties.flipY ? { ...styles.button, ...styles.buttonPrimary } : styles.button}
                  onClick={() => updateProperty('flipY', !properties.flipY)}
                >
                  ↕️ Flip Y
                </button>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Alignment</div>
              
              <div style={styles.alignmentGrid}>
                <button style={styles.button} onClick={() => alignObject('left')}>
                  ⬅️
                </button>
                <button style={styles.button} onClick={() => alignObject('center')}>
                  ↔️
                </button>
                <button style={styles.button} onClick={() => alignObject('right')}>
                  ➡️
                </button>
                <button style={styles.button} onClick={() => alignObject('top')}>
                  ⬆️
                </button>
                <button style={styles.button} onClick={() => alignObject('middle')}>
                  ↕️
                </button>
                <button style={styles.button} onClick={() => alignObject('bottom')}>
                  ⬇️
                </button>
              </div>
            </div>
          </>
        )}

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
                <label style={styles.label}>Opacity: {properties.opacity || 100}%</label>
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
                  style={styles.select}
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

              <div style={styles.buttonGroup}>
                <button
                  style={properties.fontWeight === 'bold' ? { ...styles.button, ...styles.buttonPrimary } : styles.button}
                  onClick={() => updateProperty('fontWeight', properties.fontWeight === 'bold' ? 'normal' : 'bold')}
                >
                  <strong>B</strong>
                </button>
                <button
                  style={properties.fontStyle === 'italic' ? { ...styles.button, ...styles.buttonPrimary } : styles.button}
                  onClick={() => updateProperty('fontStyle', properties.fontStyle === 'italic' ? 'normal' : 'italic')}
                >
                  <em>I</em>
                </button>
                <button
                  style={properties.underline ? { ...styles.button, ...styles.buttonPrimary } : styles.button}
                  onClick={() => updateProperty('underline', !properties.underline)}
                >
                  <u>U</u>
                </button>
              </div>
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>Text Formatting</div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Text Align</label>
                <select
                  value={properties.textAlign || 'left'}
                  onChange={(e) => updateProperty('textAlign', e.target.value)}
                  style={styles.select}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
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

        {activeTab === 'effects' && (
          <>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Drop Shadow</div>
              
              {properties.shadow ? (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Shadow Color</label>
                    <input
                      type="color"
                      value={properties.shadowColor || '#000000'}
                      onChange={(e) => {
                        setProperties(prev => ({ ...prev, shadowColor: e.target.value }));
                        addShadow();
                      }}
                      style={styles.colorInput}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Blur: {properties.shadowBlur}px</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={properties.shadowBlur || 0}
                      onChange={(e) => {
                        setProperties(prev => ({ ...prev, shadowBlur: parseFloat(e.target.value) }));
                        addShadow();
                      }}
                      style={styles.rangeInput}
                    />
                  </div>

                  <div style={styles.row}>
                    <div style={styles.col}>
                      <label style={styles.label}>X Offset</label>
                      <input
                        type="number"
                        min="-50"
                        max="50"
                        value={properties.shadowOffsetX || 0}
                        onChange={(e) => {
                          setProperties(prev => ({ ...prev, shadowOffsetX: parseFloat(e.target.value) }));
                          addShadow();
                        }}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.col}>
                      <label style={styles.label}>Y Offset</label>
                      <input
                        type="number"
                        min="-50"
                        max="50"
                        value={properties.shadowOffsetY || 0}
                        onChange={(e) => {
                          setProperties(prev => ({ ...prev, shadowOffsetY: parseFloat(e.target.value) }));
                          addShadow();
                        }}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  <button style={{ ...styles.button, width: '100%' }} onClick={removeShadow}>
                    Remove Shadow
                  </button>
                </>
              ) : (
                <button style={{ ...styles.button, ...styles.buttonPrimary, width: '100%' }} onClick={addShadow}>
                  Add Drop Shadow
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}