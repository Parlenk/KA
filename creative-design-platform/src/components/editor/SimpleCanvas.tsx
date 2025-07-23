import React, { useEffect, useRef, useState, useCallback } from 'react';
import { fabric } from 'fabric';
import { aiLearningService } from '../../services/aiLearningService';

interface CanvasProps {
  width: number;
  height: number;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
  onSelectionChange?: (objects: fabric.Object[]) => void;
  onResizeFeedbackRequest?: (actionId: string, context: any) => void;
}

const SimpleCanvas = React.forwardRef<any, CanvasProps>((props, ref) => {
  const { width, height, onCanvasReady, onSelectionChange, onResizeFeedbackRequest } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const clipboard = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Only create new canvas if one doesn't exist
    if (canvas) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    // Add some initial branding
    const kredivoBrand = new fabric.Text('KREDIVO', {
      left: width / 2,
      top: 50,
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#4f46e5',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
    });

    const subtitle = new fabric.Text('Your financial partner', {
      left: width / 2,
      top: 90,
      fontSize: 16,
      fill: '#6b7280',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
    });

    fabricCanvas.add(kredivoBrand);
    fabricCanvas.add(subtitle);

    // Event handlers
    fabricCanvas.on('selection:created', () => {
      onSelectionChange?.(fabricCanvas.getActiveObjects());
    });

    fabricCanvas.on('selection:updated', () => {
      onSelectionChange?.(fabricCanvas.getActiveObjects());
    });

    fabricCanvas.on('selection:cleared', () => {
      onSelectionChange?.([]);
    });

    // Mouse wheel zoom
    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      
      // Limit zoom range
      if (zoom > 4) zoom = 4; // 400%
      if (zoom < 0.25) zoom = 0.25; // 25%
      
      fabricCanvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Panning with space key + drag
    let isPanning = false;
    let lastPanPoint = { x: 0, y: 0 };

    fabricCanvas.on('mouse:down', (opt) => {
      if (opt.e.spaceKey) {
        isPanning = true;
        fabricCanvas.selection = false;
        lastPanPoint = { x: opt.e.clientX, y: opt.e.clientY };
        fabricCanvas.setCursor('grab');
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      if (isPanning && opt.e.spaceKey) {
        const deltaX = opt.e.clientX - lastPanPoint.x;
        const deltaY = opt.e.clientY - lastPanPoint.y;
        
        const vpt = fabricCanvas.viewportTransform!;
        vpt[4] += deltaX;
        vpt[5] += deltaY;
        
        fabricCanvas.setViewportTransform(vpt);
        lastPanPoint = { x: opt.e.clientX, y: opt.e.clientY };
      }
    });

    fabricCanvas.on('mouse:up', () => {
      if (isPanning) {
        isPanning = false;
        fabricCanvas.selection = true;
        fabricCanvas.setCursor('default');
      }
    });

    // Object modification events for history
    fabricCanvas.on('object:added', () => {
      saveCanvasState(fabricCanvas);
      updateObjectVisibility(fabricCanvas);
    });
    fabricCanvas.on('object:removed', () => {
      saveCanvasState(fabricCanvas);
      updateObjectVisibility(fabricCanvas);
    });
    fabricCanvas.on('object:modified', () => {
      saveCanvasState(fabricCanvas);
      updateObjectVisibility(fabricCanvas);
    });

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for design-related shortcuts
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      
      // Undo (Ctrl/Cmd + Z)
      if (isCtrlOrCmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo(fabricCanvas);
        return;
      }

      // Redo (Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z)
      if (isCtrlOrCmd && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo(fabricCanvas);
        return;
      }

      // Copy (Ctrl/Cmd + C)
      if (isCtrlOrCmd && e.key === 'c') {
        e.preventDefault();
        copySelection(fabricCanvas);
        return;
      }

      // Paste (Ctrl/Cmd + V)
      if (isCtrlOrCmd && e.key === 'v') {
        e.preventDefault();
        pasteSelection(fabricCanvas);
        return;
      }

      // Duplicate (Ctrl/Cmd + D)
      if (isCtrlOrCmd && e.key === 'd') {
        e.preventDefault();
        duplicateSelection(fabricCanvas);
        return;
      }

      // Select All (Ctrl/Cmd + A)
      if (isCtrlOrCmd && e.key === 'a') {
        e.preventDefault();
        selectAll(fabricCanvas);
        return;
      }

      // Delete/Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelection(fabricCanvas);
        return;
      }

      // Escape - deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();
        return;
      }

      // Arrow keys for precise movement
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        moveSelectedObjects(fabricCanvas, e.key, e.shiftKey ? 10 : 1);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Save initial state
    saveCanvasState(fabricCanvas);

    setCanvas(fabricCanvas);
    onCanvasReady?.(fabricCanvas);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      fabricCanvas.dispose();
    };
  }, []); // Remove width/height dependencies to prevent recreation

  // Handle canvas size changes (both initial and updates)
  useEffect(() => {
    if (!canvas) return;
    
    // Set canvas dimensions whenever width or height changes
    canvas.setDimensions({ width, height });
    canvas.renderAll();
    
    // Also update the container size
    const container = canvas.getElement().parentElement;
    if (container) {
      container.style.minWidth = `${width}px`;
      container.style.minHeight = `${height}px`;
    }
  }, [canvas, width, height]); // React to canvas creation AND size changes

  // History management functions
  const saveCanvasState = useCallback((fabricCanvas: fabric.Canvas) => {
    const canvasData = JSON.stringify(fabricCanvas.toJSON());
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(canvasData);
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback((fabricCanvas: fabric.Canvas) => {
    if (historyIndex <= 0) return;

    const newIndex = historyIndex - 1;
    const canvasData = history[newIndex];

    fabricCanvas.loadFromJSON(canvasData, () => {
      fabricCanvas.renderAll();
      setHistoryIndex(newIndex);
    });
  }, [history, historyIndex]);

  const redo = useCallback((fabricCanvas: fabric.Canvas) => {
    if (historyIndex >= history.length - 1) return;

    const newIndex = historyIndex + 1;
    const canvasData = history[newIndex];

    fabricCanvas.loadFromJSON(canvasData, () => {
      fabricCanvas.renderAll();
      setHistoryIndex(newIndex);
    });
  }, [history, historyIndex]);

  // Selection management functions
  const copySelection = useCallback((fabricCanvas: fabric.Canvas) => {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      activeObject.clone((cloned: fabric.Object) => {
        clipboard.current = cloned;
      });
    }
  }, []);

  const pasteSelection = useCallback((fabricCanvas: fabric.Canvas) => {
    if (clipboard.current) {
      clipboard.current.clone((cloned: fabric.Object) => {
        cloned.set({
          left: (cloned.left || 0) + 20,
          top: (cloned.top || 0) + 20,
        });
        fabricCanvas.add(cloned);
        fabricCanvas.setActiveObject(cloned);
        fabricCanvas.renderAll();
      });
    }
  }, []);

  const duplicateSelection = useCallback((fabricCanvas: fabric.Canvas) => {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      activeObject.clone((cloned: fabric.Object) => {
        cloned.set({
          left: (cloned.left || 0) + 20,
          top: (cloned.top || 0) + 20,
        });
        fabricCanvas.add(cloned);
        fabricCanvas.setActiveObject(cloned);
        fabricCanvas.renderAll();
      });
    }
  }, []);

  const deleteSelection = useCallback((fabricCanvas: fabric.Canvas) => {
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => fabricCanvas.remove(obj));
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
    }
  }, []);

  const selectAll = useCallback((fabricCanvas: fabric.Canvas) => {
    const allObjects = fabricCanvas.getObjects().filter(obj => obj.selectable !== false);
    if (allObjects.length > 1) {
      const selection = new fabric.ActiveSelection(allObjects, { canvas: fabricCanvas });
      fabricCanvas.setActiveObject(selection);
      fabricCanvas.renderAll();
    }
  }, []);

  const moveSelectedObjects = useCallback((fabricCanvas: fabric.Canvas, direction: string, step: number) => {
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    activeObjects.forEach(obj => {
      switch (direction) {
        case 'ArrowUp':
          obj.set('top', (obj.top || 0) - step);
          break;
        case 'ArrowDown':
          obj.set('top', (obj.top || 0) + step);
          break;
        case 'ArrowLeft':
          obj.set('left', (obj.left || 0) - step);
          break;
        case 'ArrowRight':
          obj.set('left', (obj.left || 0) + step);
          break;
      }
      obj.setCoords();
    });
    fabricCanvas.renderAll();
    updateObjectVisibility(fabricCanvas);
  }, []);

  // Function to update object visibility based on canvas bounds
  const updateObjectVisibility = useCallback((fabricCanvas: fabric.Canvas) => {
    if (!fabricCanvas) return;

    const canvasWidth = fabricCanvas.width || 800;
    const canvasHeight = fabricCanvas.height || 600;
    const objects = fabricCanvas.getObjects();

    objects.forEach(obj => {
      const bounds = obj.getBoundingRect();
      const isOutside = (
        bounds.left + bounds.width < 0 || 
        bounds.top + bounds.height < 0 || 
        bounds.left > canvasWidth || 
        bounds.top > canvasHeight
      );

      const isPartiallyOutside = (
        bounds.left < 0 || 
        bounds.top < 0 || 
        bounds.left + bounds.width > canvasWidth || 
        bounds.top + bounds.height > canvasHeight
      ) && !isOutside;

      // Store original opacity if not already stored
      if ((obj as any)._originalOpacity === undefined) {
        (obj as any)._originalOpacity = obj.opacity || 1;
      }

      if (isOutside) {
        // Object completely outside - make it very dim and add filter
        obj.set({
          opacity: (obj as any)._originalOpacity * 0.3,
          strokeDashArray: [5, 5], // Dashed border
        });
        
        // Add a special property to identify overflow objects
        (obj as any)._isOverflow = true;
        
        console.log('🌫️ Object outside canvas bounds:', {
          type: obj.type,
          bounds,
          canvasSize: { width: canvasWidth, height: canvasHeight }
        });
      } else if (isPartiallyOutside) {
        // Object partially outside - slightly dim
        obj.set({
          opacity: (obj as any)._originalOpacity * 0.7,
          strokeDashArray: null,
        });
        (obj as any)._isOverflow = false;
        
        console.log('⚠️ Object partially outside canvas:', {
          type: obj.type,
          bounds,
          canvasSize: { width: canvasWidth, height: canvasHeight }
        });
      } else {
        // Object inside canvas - restore original appearance
        obj.set({
          opacity: (obj as any)._originalOpacity,
          strokeDashArray: null,
        });
        (obj as any)._isOverflow = false;
      }
    });

    fabricCanvas.renderAll();
  }, []);

  // Expose methods
  React.useImperativeHandle(ref, () => ({
    canvas,
    addText: (text: string) => {
      if (!canvas) return;
      
      // Position text in the center of the canvas
      const centerX = canvas.width! / 2;
      const centerY = canvas.height! / 2;
      
      const textObj = new fabric.Text(text, {
        left: centerX,
        top: centerY,
        fontSize: 20,
        fill: '#000000',
        selectable: true,
        editable: true,
        originX: 'center',
        originY: 'center',
      });
      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.renderAll();
    },
    addShape: (type: 'rectangle' | 'circle') => {
      if (!canvas) return;
      let shape: fabric.Object;
      
      // Position shapes in the center of the canvas
      const centerX = canvas.width! / 2;
      const centerY = canvas.height! / 2;
      
      if (type === 'rectangle') {
        shape = new fabric.Rect({
          left: centerX - 75, // Half of width (150/2)
          top: centerY - 50,  // Half of height (100/2)
          width: 150,
          height: 100,
          fill: '#4f46e5',
          selectable: true,
          stroke: '#3730a3',
          strokeWidth: 2,
        });
      } else {
        shape = new fabric.Circle({
          left: centerX - 50, // Radius
          top: centerY - 50,  // Radius
          radius: 50,
          fill: '#ef4444',
          selectable: true,
          stroke: '#dc2626',
          strokeWidth: 2,
        });
      }
      
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    },
    exportCanvas: () => {
      if (!canvas) return null;
      return canvas.toDataURL('image/png');
    },
    getCanvasData: () => {
      if (!canvas) return null;
      return canvas.toJSON();
    },
    // New professional methods
    undo: () => canvas && undo(canvas),
    redo: () => canvas && redo(canvas),
    copy: () => canvas && copySelection(canvas),
    paste: () => canvas && pasteSelection(canvas),
    duplicate: () => canvas && duplicateSelection(canvas),
    delete: () => canvas && deleteSelection(canvas),
    selectAll: () => canvas && selectAll(canvas),
    canUndo: () => historyIndex > 0,
    canRedo: () => historyIndex < history.length - 1,
    resizeCanvas: (newWidth: number, newHeight: number) => {
      if (!canvas) return;
      canvas.setDimensions({ width: newWidth, height: newHeight });
      canvas.renderAll();
    },
    smartResizeCanvas: (newWidth: number, newHeight: number, userId: string = 'demo-user') => {
      if (!canvas) {
        console.error('🚨 Smart resize failed: Canvas not available');
        return null;
      }
      
      const oldWidth = canvas.width || 800;
      const oldHeight = canvas.height || 600;
      
      console.log('🎯 SMART RESIZE TRIGGERED:', {
        from: { width: oldWidth, height: oldHeight },
        to: { width: newWidth, height: newHeight },
        aspectRatioChange: Math.abs((oldWidth/oldHeight) - (newWidth/newHeight))
      });
      
      // Get all objects before resizing
      const objects = canvas.getObjects();
      
      if (objects.length === 0) {
        // No objects, just resize canvas
        canvas.setDimensions({ width: newWidth, height: newHeight });
        canvas.renderAll();
        return null;
      }

      // Prepare context for AI learning
      const objectTypes = objects.map(obj => {
        if (obj instanceof fabric.Text || obj instanceof fabric.Textbox) return 'text';
        if (obj instanceof fabric.Image) return 'image';
        if (obj instanceof fabric.Rect) return 'rectangle';
        if (obj instanceof fabric.Circle) return 'circle';
        if (obj instanceof fabric.Group) return 'group';
        return 'shape';
      });

      // Get AI recommendation
      const aiRecommendation = aiLearningService.getRecommendedStrategy({
        userId,
        originalSize: { width: oldWidth, height: oldHeight },
        targetSize: { width: newWidth, height: newHeight },
        objectCount: objects.length,
        objectTypes,
        designCategory: 'advertisement', // Could be detected from canvas content
        platformTarget: 'general' // Could be inferred from target size
      });

      console.log('🤖 AI Smart Resize Recommendation:', aiRecommendation);

      // Record the resize action
      const actionId = aiLearningService.recordResizeAction({
        userId,
        originalSize: { width: oldWidth, height: oldHeight },
        targetSize: { width: newWidth, height: newHeight },
        objectCount: objects.length,
        objectTypes,
        resizeStrategy: aiRecommendation.strategy
      });

      // Store original positions for potential manual adjustment tracking
      const originalPositions = objects.map(obj => ({
        id: (obj as any).id || obj.toString(),
        type: objectTypes[objects.indexOf(obj)],
        position: { x: obj.left || 0, y: obj.top || 0 },
        size: { width: obj.getScaledWidth(), height: obj.getScaledHeight() }
      }));

      // Resize canvas first
      canvas.setDimensions({ width: newWidth, height: newHeight });

      let resizeSuccess = false;
      const padding = aiRecommendation.suggestedPadding;

      try {
        // Execute the AI-recommended strategy
        switch (aiRecommendation.strategy) {
          case 'smart_rearrange':
            resizeSuccess = executeSmartRearrange(objects, newWidth, newHeight, padding);
            break;
          case 'intelligent_scaling':
            resizeSuccess = executeIntelligentScaling(objects, newWidth, newHeight, padding);
            break;
          case 'emergency_repositioning':
            resizeSuccess = executeEmergencyRepositioning(objects, newWidth, newHeight, padding);
            break;
        }

        // If primary strategy fails, fall back to intelligent scaling
        if (!resizeSuccess && aiRecommendation.strategy !== 'intelligent_scaling') {
          console.log('🤖 AI Resize: Primary strategy failed, falling back to intelligent scaling');
          resizeSuccess = executeIntelligentScaling(objects, newWidth, newHeight, padding);
        }

        // If all else fails, emergency repositioning
        if (!resizeSuccess) {
          console.log('🤖 AI Resize: All strategies failed, using emergency repositioning');
          executeEmergencyRepositioning(objects, newWidth, newHeight, padding);
        }

      } catch (error) {
        console.error('🤖 AI Resize Error:', error);
        executeEmergencyRepositioning(objects, newWidth, newHeight, padding);
      }

      canvas.renderAll();
      updateObjectVisibility(canvas);
      saveCanvasState(canvas);

      // Request feedback from user
      const resizeContext = {
        actionId,
        strategy: aiRecommendation.strategy,
        confidence: aiRecommendation.confidence,
        reasoning: aiRecommendation.reasoning,
        originalPositions,
        aiRecommendation
      };

      // Call feedback request after a short delay to let the user see the result
      setTimeout(() => {
        if (onResizeFeedbackRequest) {
          onResizeFeedbackRequest(actionId, resizeContext);
        }
      }, 1000);

      console.log('🤖 AI Smart Resize Complete!', {
        strategy: aiRecommendation.strategy,
        confidence: aiRecommendation.confidence,
        actionId
      });

      return actionId;

      // Helper functions for different resize strategies
      function executeSmartRearrange(objects: fabric.Object[], canvasWidth: number, canvasHeight: number, padding: number): boolean {
        const oldIsLandscape = oldWidth > oldHeight;
        const newIsLandscape = canvasWidth > canvasHeight;
        const orientationChanged = oldIsLandscape !== newIsLandscape;

        if (!orientationChanged || objects.length > 10) {
          return false; // Not suitable for rearrangement
        }

        const sortedObjects = [...objects].sort((a, b) => {
          const boundsA = a.getBoundingRect();
          const boundsB = b.getBoundingRect();
          const areaA = boundsA.width * boundsA.height;
          const areaB = boundsB.width * boundsB.height;
          return areaB - areaA; // Larger objects first
        });

        const availableWidth = canvasWidth - (padding * 2);
        const availableHeight = canvasHeight - (padding * 2);

        if (newIsLandscape && !oldIsLandscape) {
          return arrangeInRows(sortedObjects, availableWidth, availableHeight, padding);
        } else if (!newIsLandscape && oldIsLandscape) {
          return arrangeInColumns(sortedObjects, availableWidth, availableHeight, padding);
        }

        return false;
      }

      function executeIntelligentScaling(objects: fabric.Object[], canvasWidth: number, canvasHeight: number, padding: number): boolean {
        try {
          console.log('🔧 Intelligent Scaling: Starting with canvas size', { canvasWidth, canvasHeight, objectCount: objects.length });
          
          // Calculate current content bounds
          let minLeft = Infinity, minTop = Infinity, maxRight = -Infinity, maxBottom = -Infinity;
          
          objects.forEach(obj => {
            const bounds = obj.getBoundingRect();
            minLeft = Math.min(minLeft, bounds.left);
            minTop = Math.min(minTop, bounds.top);
            maxRight = Math.max(maxRight, bounds.left + bounds.width);
            maxBottom = Math.max(maxBottom, bounds.top + bounds.height);
          });
          
          const contentWidth = maxRight - minLeft;
          const contentHeight = maxBottom - minTop;
          const availableWidth = canvasWidth - (padding * 2);
          const availableHeight = canvasHeight - (padding * 2);
          
          console.log('🔧 Content bounds:', { contentWidth, contentHeight, availableWidth, availableHeight });
          
          // Calculate smart scaling factors with improved logic for dramatic aspect ratio changes
          const scaleToFitX = availableWidth / contentWidth;
          const scaleToFitY = availableHeight / contentHeight;
          
          // For dramatic aspect ratio changes, use a more intelligent approach
          const oldAspectRatio = oldWidth / oldHeight;
          const newAspectRatio = canvasWidth / canvasHeight;
          const aspectRatioChange = Math.abs(oldAspectRatio - newAspectRatio);
          
          let uniformScale;
          
          // If aspect ratio changes dramatically (like 100x500 to 500x100), prioritize visibility
          if (aspectRatioChange > 2) {
            console.log('🔧 Dramatic aspect ratio change detected, prioritizing visibility');
            // Ensure all content fits with good visibility
            uniformScale = Math.min(scaleToFitX, scaleToFitY);
            // Prevent excessive downscaling (minimum 20% of original size)
            uniformScale = Math.max(uniformScale, 0.2);
            // Cap upscaling to prevent poor quality (maximum 300% of original size)
            uniformScale = Math.min(uniformScale, 3.0);
          } else {
            // Normal scaling approach for smaller changes
            if (aiRecommendation.confidence > 0.8) {
              uniformScale = Math.min(scaleToFitX, scaleToFitY, 1.5);
            } else {
              uniformScale = Math.min(scaleToFitX, scaleToFitY, 1.2);
            }
          }
          
          console.log('🔧 Calculated scale factor:', uniformScale);
          
          // Apply scaling with smart positioning - ensure content is centered and visible
          const scaledContentWidth = contentWidth * uniformScale;
          const scaledContentHeight = contentHeight * uniformScale;
          
          // Calculate offset to center the scaled content
          const offsetX = (canvasWidth - scaledContentWidth) / 2 - (minLeft * uniformScale);
          const offsetY = (canvasHeight - scaledContentHeight) / 2 - (minTop * uniformScale);
          
          console.log('🔧 Positioning offsets:', { offsetX, offsetY });
          
          objects.forEach(obj => {
            const currentLeft = obj.left || 0;
            const currentTop = obj.top || 0;
            
            const newLeft = currentLeft * uniformScale + offsetX;
            const newTop = currentTop * uniformScale + offsetY;
            
            console.log('🔧 Moving object:', {
              type: obj.type,
              from: { left: currentLeft, top: currentTop },
              to: { left: newLeft, top: newTop },
              scale: uniformScale
            });
            
            // Apply scaling based on object type
            if (obj instanceof fabric.Text || obj instanceof fabric.Textbox) {
              const currentFontSize = (obj as any).fontSize || 20;
              const newFontSize = Math.round(currentFontSize * uniformScale);
              
              obj.set({
                left: newLeft,
                top: newTop,
                fontSize: Math.max(8, Math.min(200, newFontSize))
              });
            } else {
              const currentScaleX = obj.scaleX || 1;
              const currentScaleY = obj.scaleY || 1;
              
              obj.set({
                left: newLeft,
                top: newTop,
                scaleX: currentScaleX * uniformScale,
                scaleY: currentScaleY * uniformScale
              });
            }
            
            obj.setCoords();
          });

          // Final bounds check to ensure all objects are visible
          let allVisible = true;
          objects.forEach(obj => {
            const bounds = obj.getBoundingRect();
            if (bounds.left < 0 || bounds.top < 0 || 
                bounds.left + bounds.width > canvasWidth || 
                bounds.top + bounds.height > canvasHeight) {
              allVisible = false;
            }
          });
          
          console.log('🔧 All objects visible after scaling:', allVisible);
          
          // If objects are still outside bounds, trigger emergency repositioning
          if (!allVisible) {
            console.log('🔧 Some objects outside bounds, triggering emergency repositioning');
            return false; // Let emergency repositioning handle it
          }

          return true;
        } catch (error) {
          console.error('Intelligent scaling failed:', error);
          return false;
        }
      }

      function executeEmergencyRepositioning(objects: fabric.Object[], canvasWidth: number, canvasHeight: number, padding: number): boolean {
        try {
          console.log('🆘 Emergency Repositioning: Ensuring all objects are visible');
          
          const sortedObjects = [...objects].sort((a, b) => {
            const boundsA = a.getBoundingRect();
            const boundsB = b.getBoundingRect();
            const areaA = boundsA.width * boundsA.height;
            const areaB = boundsB.width * boundsB.height;
            return areaB - areaA; // Larger objects first
          });

          const availableWidth = canvasWidth - (padding * 2);
          const availableHeight = canvasHeight - (padding * 2);
          
          // Calculate optimal grid layout for better space utilization
          const objectCount = sortedObjects.length;
          const cols = Math.ceil(Math.sqrt(objectCount * (canvasWidth / canvasHeight)));
          const rows = Math.ceil(objectCount / cols);
          
          const cellWidth = availableWidth / cols;
          const cellHeight = availableHeight / rows;
          
          console.log('🆘 Grid layout:', { cols, rows, cellWidth, cellHeight });
          
          let currentCol = 0;
          let currentRow = 0;
          
          sortedObjects.forEach((obj, index) => {
            const bounds = obj.getBoundingRect();
            let objWidth = bounds.width;
            let objHeight = bounds.height;
            
            // Calculate scaling needed to fit in grid cell (with some padding)
            const scaleToFitCell = Math.min(
              (cellWidth - 20) / objWidth,  // 20px padding within cell
              (cellHeight - 20) / objHeight,
              1 // Don't upscale beyond original size
            );
            
            // Apply intelligent scaling
            if (scaleToFitCell < 1) {
              console.log('🆘 Scaling object to fit grid cell:', { index, scaleToFitCell });
              
              if (obj instanceof fabric.Text || obj instanceof fabric.Textbox) {
                const currentFontSize = (obj as any).fontSize || 20;
                const newFontSize = Math.max(8, Math.round(currentFontSize * scaleToFitCell));
                (obj as any).set('fontSize', newFontSize);
              } else {
                const currentScaleX = obj.scaleX || 1;
                const currentScaleY = obj.scaleY || 1;
                obj.set({
                  scaleX: currentScaleX * scaleToFitCell,
                  scaleY: currentScaleY * scaleToFitCell
                });
              }
              
              // Recalculate bounds after scaling
              const newBounds = obj.getBoundingRect();
              objWidth = newBounds.width;
              objHeight = newBounds.height;
            }
            
            // Position object in grid cell (centered)
            const cellX = padding + (currentCol * cellWidth);
            const cellY = padding + (currentRow * cellHeight);
            
            const finalX = cellX + (cellWidth - objWidth) / 2;
            const finalY = cellY + (cellHeight - objHeight) / 2;
            
            console.log('🆘 Positioning object:', {
              index,
              grid: { col: currentCol, row: currentRow },
              position: { x: finalX, y: finalY }
            });
            
            obj.set({
              left: finalX,
              top: finalY
            });
            
            obj.setCoords();
            
            // Move to next grid position
            currentCol++;
            if (currentCol >= cols) {
              currentCol = 0;
              currentRow++;
            }
          });

          // Final verification that all objects are within bounds
          let allWithinBounds = true;
          sortedObjects.forEach(obj => {
            const bounds = obj.getBoundingRect();
            if (bounds.left < 0 || bounds.top < 0 || 
                bounds.left + bounds.width > canvasWidth || 
                bounds.top + bounds.height > canvasHeight) {
              allWithinBounds = false;
              console.warn('🆘 Object still outside bounds:', bounds);
            }
          });
          
          console.log('🆘 Emergency repositioning complete. All within bounds:', allWithinBounds);
          return true;
        } catch (error) {
          console.error('Emergency repositioning failed:', error);
          return false;
        }
      }

      // Helper functions for arrangement
      function arrangeInRows(objects: fabric.Object[], maxWidth: number, maxHeight: number, padding: number): boolean {
        try {
          let currentX = padding;
          let currentY = padding;
          let rowHeight = 0;
          
          for (let obj of objects) {
            const bounds = obj.getBoundingRect();
            
            if (currentX + bounds.width > maxWidth + padding && currentX > padding) {
              currentX = padding;
              currentY += rowHeight + 10;
              rowHeight = 0;
              
              if (currentY + bounds.height > maxHeight + padding) {
                return false;
              }
            }
            
            obj.set({ left: currentX, top: currentY });
            obj.setCoords();
            
            currentX += bounds.width + 10;
            rowHeight = Math.max(rowHeight, bounds.height);
          }
          
          return true;
        } catch (error) {
          return false;
        }
      }
      
      function arrangeInColumns(objects: fabric.Object[], maxWidth: number, maxHeight: number, padding: number): boolean {
        try {
          let currentX = padding;
          let currentY = padding;
          let colWidth = 0;
          
          for (let obj of objects) {
            const bounds = obj.getBoundingRect();
            
            if (currentY + bounds.height > maxHeight + padding && currentY > padding) {
              currentY = padding;
              currentX += colWidth + 10;
              colWidth = 0;
              
              if (currentX + bounds.width > maxWidth + padding) {
                return false;
              }
            }
            
            obj.set({ left: currentX, top: currentY });
            obj.setCoords();
            
            currentY += bounds.height + 10;
            colWidth = Math.max(colWidth, bounds.width);
          }
          
          return true;
        } catch (error) {
          return false;
        }
      }
    },
    getZoom: () => {
      if (!canvas) return 1;
      return canvas.getZoom();
    },
    setZoom: (zoomLevel: number) => {
      if (!canvas) return;
      canvas.setZoom(zoomLevel);
      canvas.renderAll();
    },
    zoomToFit: () => {
      if (!canvas) return;
      const canvasElement = canvas.getElement();
      const container = canvasElement.parentElement;
      if (!container) return;
      
      const containerWidth = container.clientWidth - 40;
      const containerHeight = container.clientHeight - 40;
      const canvasWidth = canvas.width || 800;
      const canvasHeight = canvas.height || 600;
      
      const scaleX = containerWidth / canvasWidth;
      const scaleY = containerHeight / canvasHeight;
      const scale = Math.min(scaleX, scaleY, 1);
      
      canvas.setZoom(scale);
      canvas.renderAll();
      return Math.round(scale * 100);
    },
    // Utility function to bring all overflow objects back to canvas
    recenterOverflowObjects: () => {
      if (!canvas) return;
      
      const objects = canvas.getObjects();
      const canvasWidth = canvas.width || 800;
      const canvasHeight = canvas.height || 600;
      
      const overflowObjects = objects.filter(obj => {
        const bounds = obj.getBoundingRect();
        return (
          bounds.left + bounds.width < 0 || 
          bounds.top + bounds.height < 0 || 
          bounds.left > canvasWidth || 
          bounds.top > canvasHeight
        );
      });
      
      console.log('🔄 Recentering overflow objects:', overflowObjects.length);
      
      if (overflowObjects.length === 0) return;
      
      // Calculate grid layout for overflow objects
      const cols = Math.ceil(Math.sqrt(overflowObjects.length));
      const rows = Math.ceil(overflowObjects.length / cols);
      const cellWidth = (canvasWidth - 40) / cols; // 40px total padding
      const cellHeight = (canvasHeight - 40) / rows;
      
      overflowObjects.forEach((obj, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        const bounds = obj.getBoundingRect();
        const objWidth = bounds.width;
        const objHeight = bounds.height;
        
        // Scale object to fit in cell if needed
        const scaleToFit = Math.min(
          cellWidth / objWidth,
          cellHeight / objHeight,
          1 // Don't upscale
        );
        
        if (scaleToFit < 1) {
          if (obj instanceof fabric.Text || obj instanceof fabric.Textbox) {
            const currentFontSize = (obj as any).fontSize || 20;
            (obj as any).set('fontSize', Math.max(8, Math.round(currentFontSize * scaleToFit)));
          } else {
            const currentScaleX = obj.scaleX || 1;
            const currentScaleY = obj.scaleY || 1;
            obj.set({
              scaleX: currentScaleX * scaleToFit,
              scaleY: currentScaleY * scaleToFit
            });
          }
        }
        
        // Position in grid
        const newBounds = obj.getBoundingRect();
        const cellX = 20 + (col * cellWidth);
        const cellY = 20 + (row * cellHeight);
        
        obj.set({
          left: cellX + (cellWidth - newBounds.width) / 2,
          top: cellY + (cellHeight - newBounds.height) / 2
        });
        
        obj.setCoords();
      });
      
      canvas.renderAll();
      updateObjectVisibility(canvas);
      saveCanvasState(canvas);
    },
    // Check if there are any overflow objects
    hasOverflowObjects: () => {
      if (!canvas) return false;
      
      const objects = canvas.getObjects();
      const canvasWidth = canvas.width || 800;
      const canvasHeight = canvas.height || 600;
      
      return objects.some(obj => {
        const bounds = obj.getBoundingRect();
        return (
          bounds.left + bounds.width < 0 || 
          bounds.top + bounds.height < 0 || 
          bounds.left > canvasWidth || 
          bounds.top > canvasHeight
        );
      });
    },
  }));

  return (
    <div style={{ 
      border: '2px solid #9ca3af', 
      borderRadius: '8px', 
      overflow: 'visible', // Changed to show overflow area
      backgroundColor: 'white',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      position: 'relative'
    }}>
      {/* Canvas container with overflow area */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%'
      }}>
        <canvas ref={canvasRef} />
        
        {/* Minimal overflow area - only visible when needed */}
        <div style={{
          position: 'absolute',
          top: -50,
          left: -50,
          right: -50,
          bottom: -50,
          border: '1px dashed #d1d5db',
          borderRadius: '12px',
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          pointerEvents: 'none',
          opacity: 0.5,
          zIndex: -1,
          display: canvas ? 'block' : 'none'
        }} />
        
      </div>
    </div>
  );
});

export default SimpleCanvas;