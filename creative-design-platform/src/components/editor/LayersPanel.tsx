import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';

interface LayerItem {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  fabricObject: fabric.Object;
}

interface LayersPanelProps {
  canvas: fabric.Canvas | null;
  selectedObjects: fabric.Object[];
  onLayerSelect: (object: fabric.Object, isMultiSelect?: boolean) => void;
  onLayerVisibilityChange: (object: fabric.Object, visible: boolean) => void;
  onLayerLockChange: (object: fabric.Object, locked: boolean) => void;
  onLayerNameChange: (object: fabric.Object, name: string) => void;
  onLayerDelete: (object: fabric.Object) => void;
}

export default function LayersPanel({
  canvas,
  selectedObjects,
  onLayerSelect,
  onLayerVisibilityChange,
  onLayerLockChange,
  onLayerNameChange,
  onLayerDelete
}: LayersPanelProps) {
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [draggedLayer, setDraggedLayer] = useState<LayerItem | null>(null);
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);

  // Update layers when canvas changes
  useEffect(() => {
    if (!canvas) return;

    const updateLayers = () => {
      const canvasObjects = canvas.getObjects().filter(obj => obj.selectable !== false);
      const layerItems: LayerItem[] = canvasObjects.map((obj, index) => ({
        id: (obj as any).id || `layer_${index}`,
        name: (obj as any).name || getObjectTypeName(obj),
        type: getObjectType(obj),
        visible: obj.visible !== false,
        locked: obj.selectable === false,
        fabricObject: obj
      })).reverse(); // Reverse to show top layer first

      setLayers(layerItems);
    };

    // Initial update
    updateLayers();

    // Listen for canvas changes
    canvas.on('object:added', updateLayers);
    canvas.on('object:removed', updateLayers);
    canvas.on('object:modified', updateLayers);

    return () => {
      canvas.off('object:added', updateLayers);
      canvas.off('object:removed', updateLayers);
      canvas.off('object:modified', updateLayers);
    };
  }, [canvas]);

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

  const getLayerIcon = (type: string): string => {
    switch (type) {
      case 'text': return '📝';
      case 'image': return '🖼️';
      case 'rectangle': return '▭';
      case 'circle': return '⭕';
      case 'triangle': return '🔺';
      case 'group': return '📁';
      case 'path': return '✏️';
      default: return '📄';
    }
  };

  const handleLayerClick = (layer: LayerItem, event: React.MouseEvent) => {
    if (!canvas) return;
    
    const layerIndex = layers.findIndex(l => l.id === layer.id);
    
    if (event.shiftKey && lastSelectedIndex !== -1) {
      // Shift+click: Select range of layers
      const start = Math.min(lastSelectedIndex, layerIndex);
      const end = Math.max(lastSelectedIndex, layerIndex);
      const layersToSelect = layers.slice(start, end + 1).map(l => l.fabricObject);
      
      if (layersToSelect.length > 1) {
        const activeSelection = new fabric.ActiveSelection(layersToSelect, {
          canvas: canvas,
        });
        canvas.setActiveObject(activeSelection);
        canvas.renderAll();
      } else {
        canvas.setActiveObject(layer.fabricObject);
        canvas.renderAll();
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+click: Toggle selection
      const activeObject = canvas.getActiveObject();
      
      if (activeObject instanceof fabric.ActiveSelection) {
        const objects = activeObject.getObjects();
        const isAlreadySelected = objects.includes(layer.fabricObject);
        
        if (isAlreadySelected && objects.length > 1) {
          // Remove from selection
          const newObjects = objects.filter(obj => obj !== layer.fabricObject);
          if (newObjects.length === 1) {
            canvas.setActiveObject(newObjects[0]);
          } else {
            const newSelection = new fabric.ActiveSelection(newObjects, {
              canvas: canvas,
            });
            canvas.setActiveObject(newSelection);
          }
        } else if (!isAlreadySelected) {
          // Add to selection
          const newObjects = [...objects, layer.fabricObject];
          const newSelection = new fabric.ActiveSelection(newObjects, {
            canvas: canvas,
          });
          canvas.setActiveObject(newSelection);
        }
      } else if (activeObject && activeObject !== layer.fabricObject) {
        // Create new multi-selection
        const newSelection = new fabric.ActiveSelection([activeObject, layer.fabricObject], {
          canvas: canvas,
        });
        canvas.setActiveObject(newSelection);
      } else {
        // Single selection
        canvas.setActiveObject(layer.fabricObject);
      }
      canvas.renderAll();
    } else {
      // Normal click: Single selection
      canvas.setActiveObject(layer.fabricObject);
      canvas.renderAll();
      setLastSelectedIndex(layerIndex);
    }
    
    onLayerSelect(layer.fabricObject, event.shiftKey || event.ctrlKey || event.metaKey);
  };

  // Select all layers
  const handleSelectAll = () => {
    if (!canvas || layers.length === 0) return;
    
    const allObjects = layers.map(layer => layer.fabricObject);
    
    if (allObjects.length === 1) {
      canvas.setActiveObject(allObjects[0]);
    } else {
      const activeSelection = new fabric.ActiveSelection(allObjects, {
        canvas: canvas,
      });
      canvas.setActiveObject(activeSelection);
    }
    
    canvas.renderAll();
    setLastSelectedIndex(0);
  };

  // Deselect all layers
  const handleDeselectAll = () => {
    if (!canvas) return;
    
    canvas.discardActiveObject();
    canvas.renderAll();
    setLastSelectedIndex(-1);
  };

  const handleVisibilityToggle = (layer: LayerItem) => {
    if (!canvas) return;

    const newVisible = !layer.visible;
    layer.fabricObject.set('visible', newVisible);
    
    // Update the layer state immediately
    setLayers(prevLayers => 
      prevLayers.map(l => 
        l.id === layer.id 
          ? { ...l, visible: newVisible }
          : l
      )
    );
    
    canvas.renderAll();
    onLayerVisibilityChange(layer.fabricObject, newVisible);
  };

  const handleLockToggle = (layer: LayerItem) => {
    if (!canvas) return;

    const newLocked = !layer.locked;
    layer.fabricObject.set('selectable', !newLocked);
    layer.fabricObject.set('evented', !newLocked);
    
    // Update the layer state immediately
    setLayers(prevLayers => 
      prevLayers.map(l => 
        l.id === layer.id 
          ? { ...l, locked: newLocked }
          : l
      )
    );
    
    canvas.renderAll();
    onLayerLockChange(layer.fabricObject, newLocked);
  };

  const handleNameEdit = (layer: LayerItem, newName: string) => {
    if (!newName.trim()) return;

    (layer.fabricObject as any).name = newName.trim();
    onLayerNameChange(layer.fabricObject, newName.trim());
    setEditingLayer(null);
  };

  const handleLayerDelete = (layer: LayerItem) => {
    if (!canvas) return;
    
    canvas.remove(layer.fabricObject);
    canvas.renderAll();
    onLayerDelete(layer.fabricObject);
  };

  const moveLayer = (fromIndex: number, toIndex: number) => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const actualFromIndex = objects.length - 1 - fromIndex;
    const actualToIndex = objects.length - 1 - toIndex;

    const obj = objects[actualFromIndex];
    canvas.remove(obj);
    canvas.insertAt(obj, actualToIndex);
    canvas.renderAll();
  };

  const handleDragStart = (e: React.DragEvent, layer: LayerItem) => {
    setDraggedLayer(layer);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetLayer: LayerItem) => {
    e.preventDefault();
    
    if (!draggedLayer || draggedLayer.id === targetLayer.id) return;

    const fromIndex = layers.findIndex(l => l.id === draggedLayer.id);
    const toIndex = layers.findIndex(l => l.id === targetLayer.id);

    moveLayer(fromIndex, toIndex);
    setDraggedLayer(null);
  };

  const isSelected = (layer: LayerItem): boolean => {
    if (!canvas) return false;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return false;
    
    // Check if this layer is the directly selected object
    if (activeObject === layer.fabricObject) return true;
    
    // Check if this layer is part of an ActiveSelection
    if (activeObject instanceof fabric.ActiveSelection) {
      return activeObject.getObjects().includes(layer.fabricObject);
    }
    
    return false;
  };

  const styles = {
    container: {
      width: '280px',
      backgroundColor: 'white',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column' as 'column',
      height: '100%',
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
    layersList: {
      flex: 1,
      overflowY: 'auto' as 'auto',
      padding: '0.5rem'
    },
    layerItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '0.5rem',
      marginBottom: '0.25rem',
      borderRadius: '0.375rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '1px solid transparent'
    },
    layerItemSelected: {
      backgroundColor: '#dbeafe',
      borderColor: '#3b82f6'
    },
    layerItemHover: {
      backgroundColor: '#f3f4f6'
    },
    layerIcon: {
      fontSize: '1rem',
      marginRight: '0.5rem',
      minWidth: '1.25rem'
    },
    layerInfo: {
      flex: 1,
      minWidth: 0
    },
    layerName: {
      fontSize: '0.75rem',
      fontWeight: '500',
      color: '#374151',
      truncate: true,
      margin: 0
    },
    layerType: {
      fontSize: '0.625rem',
      color: '#6b7280',
      margin: 0
    },
    layerControls: {
      display: 'flex',
      gap: '0.25rem',
      alignItems: 'center'
    },
    controlButton: {
      padding: '0.25rem',
      border: 'none',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      borderRadius: '0.25rem',
      fontSize: '0.75rem',
      transition: 'background-color 0.2s'
    },
    controlButtonActive: {
      backgroundColor: '#e5e7eb'
    },
    nameInput: {
      fontSize: '0.75rem',
      padding: '0.125rem 0.25rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.25rem',
      width: '100%',
      backgroundColor: 'white'
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={styles.title}>Layers</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontWeight: '600'
              }}
              onClick={() => {
                // Create a new text object as an example
                if (canvas) {
                  const text = new fabric.Text('New Text', {
                    left: 100,
                    top: 100,
                    fontSize: 20,
                    fill: '#000000'
                  });
                  canvas.add(text);
                  canvas.setActiveObject(text);
                  canvas.renderAll();
                }
              }}
              title="Add new text layer"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10b981';
              }}
            >
              ADD
            </button>
            <button
              style={{
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={handleSelectAll}
              title="Select all layers (Ctrl+A)"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4338ca';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#4f46e5';
              }}
            >
              Select All
            </button>
            <button
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={handleDeselectAll}
              title="Deselect all layers (Escape)"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4b5563';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6b7280';
              }}
            >
              Deselect
            </button>
          </div>
        </div>
      </div>

      <div style={styles.layersList}>
        {layers.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📄</div>
            <div style={styles.emptyText}>No layers yet</div>
          </div>
        ) : (
          layers.map((layer, index) => (
            <div
              key={layer.id}
              style={{
                ...styles.layerItem,
                ...(isSelected(layer) ? styles.layerItemSelected : {}),
                opacity: layer.visible ? 1 : 0.5
              }}
              onClick={(event) => handleLayerClick(layer, event)}
              draggable
              onDragStart={(e) => handleDragStart(e, layer)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, layer)}
              onMouseEnter={(e) => {
                if (!isSelected(layer)) {
                  Object.assign(e.currentTarget.style, styles.layerItemHover);
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected(layer)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div style={styles.layerIcon}>
                {getLayerIcon(layer.type)}
              </div>

              <div style={styles.layerInfo}>
                {editingLayer === layer.id ? (
                  <input
                    type="text"
                    defaultValue={layer.name}
                    style={styles.nameInput}
                    autoFocus
                    onBlur={(e) => handleNameEdit(layer, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleNameEdit(layer, e.currentTarget.value);
                      } else if (e.key === 'Escape') {
                        setEditingLayer(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    style={styles.layerName}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingLayer(layer.id);
                    }}
                  >
                    {layer.name}
                  </div>
                )}
                <div style={styles.layerType}>{layer.type}</div>
              </div>

              <div style={styles.layerControls}>
                <button
                  style={{
                    ...styles.controlButton,
                    ...(layer.visible ? {} : styles.controlButtonActive)
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVisibilityToggle(layer);
                  }}
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? '👁️' : '🚫'}
                </button>

                <button
                  style={{
                    ...styles.controlButton,
                    ...(layer.locked ? styles.controlButtonActive : {})
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLockToggle(layer);
                  }}
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                >
                  {layer.locked ? '🔒' : '🔓'}
                </button>

                <button
                  style={styles.controlButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete this layer?')) {
                      handleLayerDelete(layer);
                    }
                  }}
                  title="Delete layer"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}