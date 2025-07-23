import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { gsap } from 'gsap';

interface CanvasObject {
  id: string;
  type: 'text' | 'image' | 'shape' | 'group';
  name: string;
  visible: boolean;
  locked: boolean;
  fabricObject: fabric.Object;
}

interface CanvasProps {
  width: number;
  height: number;
  onSelectionChange?: (objects: fabric.Object[]) => void;
  onObjectModified?: (object: fabric.Object) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
}

const EnterpriseCanvas = React.forwardRef<any, CanvasProps>(({
  width,
  height,
  onSelectionChange,
  onObjectModified,
  onHistoryChange,
  onCanvasReady
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [snapToObjects, setSnapToObjects] = useState(true);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      controlsAboveOverlay: true,
      allowTouchScrolling: false,
      imageSmoothingEnabled: true,
      enableRetinaScaling: true,
      fireRightClick: true,
      stopContextMenu: true,
      uniformScaling: false,
      centeredScaling: false,
      centeredRotation: true,
      borderColor: '#4f46e5',
      borderDashArray: [3, 3],
      cornerColor: '#4f46e5',
      cornerSize: 8,
      cornerStyle: 'circle',
      transparentCorners: false,
      rotatingPointOffset: 30,
      padding: 4,
      borderOpacityWhenMoving: 0.8,
      borderScaleFactor: 2,
    });

    // Add grid
    if (showGrid) {
      addGrid(fabricCanvas);
    }

    // Add rulers
    if (showRulers) {
      addRulers(fabricCanvas);
    }

    // Enable snap to grid
    if (snapToGrid) {
      enableSnapToGrid(fabricCanvas);
    }

    // Enable snap to objects
    if (snapToObjects) {
      enableSnapToObjects(fabricCanvas);
    }

    // Event listeners
    fabricCanvas.on('selection:created', handleSelectionChange);
    fabricCanvas.on('selection:updated', handleSelectionChange);
    fabricCanvas.on('selection:cleared', handleSelectionChange);
    fabricCanvas.on('object:modified', handleObjectModified);
    fabricCanvas.on('object:added', saveCanvasState);
    fabricCanvas.on('object:removed', saveCanvasState);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyDown);

    setCanvas(fabricCanvas);
    onCanvasReady?.(fabricCanvas);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      fabricCanvas.dispose();
    };
  }, [width, height]);

  // Add grid to canvas
  const addGrid = (canvas: fabric.Canvas) => {
    const gridSize = 20;
    const gridColor = '#e5e7eb';

    for (let i = 0; i < width / gridSize; i++) {
      const line = new fabric.Line([i * gridSize, 0, i * gridSize, height], {
        stroke: gridColor,
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        isDrawingMode: false,
      });
      canvas.add(line);
      canvas.sendToBack(line);
    }

    for (let i = 0; i < height / gridSize; i++) {
      const line = new fabric.Line([0, i * gridSize, width, i * gridSize], {
        stroke: gridColor,
        strokeWidth: 1,
        selectable: false,
        evented: false,
        excludeFromExport: true,
        isDrawingMode: false,
      });
      canvas.add(line);
      canvas.sendToBack(line);
    }
  };

  // Add rulers
  const addRulers = (canvas: fabric.Canvas) => {
    // Top ruler
    const topRuler = new fabric.Rect({
      left: 0,
      top: -30,
      width: width,
      height: 30,
      fill: '#f3f4f6',
      stroke: '#d1d5db',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });

    // Left ruler
    const leftRuler = new fabric.Rect({
      left: -30,
      top: 0,
      width: 30,
      height: height,
      fill: '#f3f4f6',
      stroke: '#d1d5db',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });

    canvas.add(topRuler, leftRuler);
  };

  // Enable snap to grid
  const enableSnapToGrid = (canvas: fabric.Canvas) => {
    const gridSize = 20;

    canvas.on('object:moving', (e) => {
      const obj = e.target;
      if (!obj) return;

      const left = Math.round((obj.left || 0) / gridSize) * gridSize;
      const top = Math.round((obj.top || 0) / gridSize) * gridSize;

      obj.set({ left, top });
    });
  };

  // Enable snap to objects
  const enableSnapToObjects = (canvas: fabric.Canvas) => {
    const snapThreshold = 10;
    let guidelines: fabric.Line[] = [];

    canvas.on('object:moving', (e) => {
      const activeObject = e.target;
      if (!activeObject) return;

      // Clear previous guidelines
      guidelines.forEach(line => canvas.remove(line));
      guidelines = [];

      const activeObjectBounds = activeObject.getBoundingRect();
      const canvasObjects = canvas.getObjects().filter(obj => obj !== activeObject && obj.selectable);

      canvasObjects.forEach(obj => {
        const objBounds = obj.getBoundingRect();

        // Vertical alignment
        if (Math.abs(activeObjectBounds.left - objBounds.left) < snapThreshold) {
          activeObject.set({ left: objBounds.left });
          const line = new fabric.Line([objBounds.left, 0, objBounds.left, height], {
            stroke: '#ef4444',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
          });
          guidelines.push(line);
          canvas.add(line);
        }

        if (Math.abs(activeObjectBounds.left + activeObjectBounds.width - objBounds.left - objBounds.width) < snapThreshold) {
          activeObject.set({ left: objBounds.left + objBounds.width - activeObjectBounds.width });
          const line = new fabric.Line([objBounds.left + objBounds.width, 0, objBounds.left + objBounds.width, height], {
            stroke: '#ef4444',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
          });
          guidelines.push(line);
          canvas.add(line);
        }

        // Horizontal alignment
        if (Math.abs(activeObjectBounds.top - objBounds.top) < snapThreshold) {
          activeObject.set({ top: objBounds.top });
          const line = new fabric.Line([0, objBounds.top, width, objBounds.top], {
            stroke: '#ef4444',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
          });
          guidelines.push(line);
          canvas.add(line);
        }

        if (Math.abs(activeObjectBounds.top + activeObjectBounds.height - objBounds.top - objBounds.height) < snapThreshold) {
          activeObject.set({ top: objBounds.top + objBounds.height - activeObjectBounds.height });
          const line = new fabric.Line([0, objBounds.top + objBounds.height, width, objBounds.top + objBounds.height], {
            stroke: '#ef4444',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
          });
          guidelines.push(line);
          canvas.add(line);
        }
      });
    });

    canvas.on('object:modified', () => {
      guidelines.forEach(line => canvas.remove(line));
      guidelines = [];
    });
  };

  // Handle selection changes
  const handleSelectionChange = useCallback((e: fabric.IEvent) => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    onSelectionChange?.(activeObjects);
  }, [canvas, onSelectionChange]);

  // Handle object modifications
  const handleObjectModified = useCallback((e: fabric.IEvent) => {
    if (!e.target) return;
    onObjectModified?.(e.target);
    saveCanvasState();
  }, [onObjectModified]);

  // Save canvas state for undo/redo
  const saveCanvasState = useCallback(() => {
    if (!canvas) return;

    const canvasData = JSON.stringify(canvas.toJSON(['id', 'name', 'locked']));
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(canvasData);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    onHistoryChange?.(canUndo, canRedo);
  }, [canvas, historyIndex, history, onHistoryChange]);

  // Undo functionality
  const undo = useCallback(() => {
    if (!canvas || historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const canvasData = history[newIndex];

    canvas.loadFromJSON(canvasData, () => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
      onHistoryChange?.(newIndex > 0, true);
    });
  }, [canvas, history, historyIndex, onHistoryChange]);

  // Redo functionality
  const redo = useCallback(() => {
    if (!canvas || historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const canvasData = history[newIndex];

    canvas.loadFromJSON(canvasData, () => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
      onHistoryChange?.(true, newIndex < history.length - 1);
    });
  }, [canvas, history, historyIndex, onHistoryChange]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!canvas) return;

    const isCtrlOrCmd = e.ctrlKey || e.metaKey;

    // Undo/Redo
    if (isCtrlOrCmd && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (isCtrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
    }

    // Copy/Paste
    if (isCtrlOrCmd && e.key === 'c') {
      e.preventDefault();
      copySelection();
    } else if (isCtrlOrCmd && e.key === 'v') {
      e.preventDefault();
      pasteSelection();
    }

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      deleteSelection();
    }

    // Select All
    if (isCtrlOrCmd && e.key === 'a') {
      e.preventDefault();
      selectAll();
    }

    // Deselect
    if (e.key === 'Escape') {
      e.preventDefault();
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  }, [canvas, undo, redo]);

  // Utility functions
  const copySelection = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.clone((cloned: fabric.Object) => {
        localStorage.setItem('fabricClipboard', JSON.stringify(cloned.toObject()));
      });
    }
  };

  const pasteSelection = () => {
    if (!canvas) return;
    const clipboardData = localStorage.getItem('fabricClipboard');
    if (clipboardData) {
      fabric.util.enlivenObjects([JSON.parse(clipboardData)], (objects: fabric.Object[]) => {
        objects.forEach(obj => {
          obj.set({
            left: (obj.left || 0) + 20,
            top: (obj.top || 0) + 20,
          });
          canvas.add(obj);
        });
        canvas.renderAll();
      });
    }
  };

  const deleteSelection = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      canvas.remove(...activeObjects);
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  const selectAll = () => {
    if (!canvas) return;
    const allObjects = canvas.getObjects().filter(obj => obj.selectable);
    const selection = new fabric.ActiveSelection(allObjects, { canvas });
    canvas.setActiveObject(selection);
    canvas.renderAll();
  };

  // Public methods
  const addText = (text: string = 'Sample Text') => {
    if (!canvas) return;

    const textObject = new fabric.Textbox(text, {
      left: 100,
      top: 100,
      width: 200,
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#000000',
      textAlign: 'left',
      fontWeight: 'normal',
      fontStyle: 'normal',
      underline: false,
      linethrough: false,
      overline: false,
      id: `text_${Date.now()}`,
      name: 'Text Object',
    });

    canvas.add(textObject);
    canvas.setActiveObject(textObject);
    canvas.renderAll();
  };

  const addShape = (type: 'rectangle' | 'circle' | 'triangle') => {
    if (!canvas) return;

    let shape: fabric.Object;

    switch (type) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: 100,
          top: 100,
          width: 150,
          height: 100,
          fill: '#4f46e5',
          stroke: '#374151',
          strokeWidth: 2,
          id: `rect_${Date.now()}`,
          name: 'Rectangle',
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          left: 100,
          top: 100,
          radius: 50,
          fill: '#ef4444',
          stroke: '#374151',
          strokeWidth: 2,
          id: `circle_${Date.now()}`,
          name: 'Circle',
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          left: 100,
          top: 100,
          width: 100,
          height: 100,
          fill: '#10b981',
          stroke: '#374151',
          strokeWidth: 2,
          id: `triangle_${Date.now()}`,
          name: 'Triangle',
        });
        break;
      default:
        return;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  };

  const addImage = (imageUrl: string) => {
    if (!canvas) return;

    fabric.Image.fromURL(imageUrl, (img) => {
      img.set({
        left: 100,
        top: 100,
        scaleX: 0.5,
        scaleY: 0.5,
        id: `image_${Date.now()}`,
        name: 'Image',
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
    }, { crossOrigin: 'anonymous' });
  };

  const getCanvasData = () => {
    if (!canvas) return null;
    return canvas.toJSON(['id', 'name', 'locked']);
  };

  const loadCanvasData = (data: any) => {
    if (!canvas) return;
    canvas.loadFromJSON(data, () => {
      canvas.renderAll();
    });
  };

  const exportCanvas = (format: 'png' | 'jpg' | 'svg' = 'png') => {
    if (!canvas) return null;

    switch (format) {
      case 'png':
        return canvas.toDataURL('image/png');
      case 'jpg':
        return canvas.toDataURL('image/jpeg', 0.9);
      case 'svg':
        return canvas.toSVG();
      default:
        return canvas.toDataURL('image/png');
    }
  };

  // Expose canvas instance and methods via ref
  React.useImperativeHandle(React.forwardRef(() => null), () => ({
    canvas,
    addText,
    addShape,
    addImage,
    undo,
    redo,
    getCanvasData,
    loadCanvasData,
    exportCanvas,
    copySelection,
    pasteSelection,
    deleteSelection,
    selectAll,
  }));

  // Update parent with canvas instance
  useEffect(() => {
    if (canvas && onSelectionChange) {
      // Pass canvas instance to parent component
      (window as any).fabricCanvas = canvas;
    }
  }, [canvas]);

  return (
    <div style={{ position: 'relative', border: '1px solid #d1d5db', borderRadius: '8px', overflow: 'hidden' }}>
      <canvas ref={canvasRef} />
    </div>
  );
});

export default EnterpriseCanvas;