/**
 * Advanced Shape Tools
 * Polygon, star, custom path tools with advanced editing capabilities
 */

import React, { useState, useCallback, useRef } from 'react';
import { fabric } from 'fabric';

export interface ShapeToolProps {
  canvas: fabric.Canvas | null;
  onShapeCreated?: (shape: fabric.Object) => void;
}

export interface PolygonOptions {
  sides: number;
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface StarOptions {
  points: number;
  innerRadius: number;
  outerRadius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export const AdvancedShapeTools: React.FC<ShapeToolProps> = ({ canvas, onShapeCreated }) => {
  const [selectedTool, setSelectedTool] = useState<'polygon' | 'star' | 'path' | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pathPoints, setPathPoints] = useState<{ x: number; y: number }[]>([]);
  const pathRef = useRef<fabric.Path | null>(null);

  // Polygon tool state
  const [polygonOptions, setPolygonOptions] = useState<PolygonOptions>({
    sides: 6,
    radius: 50,
    fill: '#3b82f6',
    stroke: '#1e40af',
    strokeWidth: 2
  });

  // Star tool state
  const [starOptions, setStarOptions] = useState<StarOptions>({
    points: 5,
    innerRadius: 30,
    outerRadius: 60,
    fill: '#f59e0b',
    stroke: '#d97706',
    strokeWidth: 2
  });

  const createPolygon = useCallback((x: number, y: number) => {
    const { sides, radius, fill, stroke, strokeWidth } = polygonOptions;
    
    // Calculate polygon points
    const points: fabric.Point[] = [];
    const angleStep = (Math.PI * 2) / sides;
    
    for (let i = 0; i < sides; i++) {
      const angle = i * angleStep - Math.PI / 2; // Start from top
      const pointX = radius * Math.cos(angle);
      const pointY = radius * Math.sin(angle);
      points.push(new fabric.Point(pointX, pointY));
    }

    const polygon = new fabric.Polygon(points, {
      left: x - radius,
      top: y - radius,
      fill,
      stroke,
      strokeWidth,
      strokeLineJoin: 'round',
      strokeLineCap: 'round',
      selectable: true,
      hasControls: true,
      hasBorders: true,
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
      cornerColor: '#2563eb',
      borderColor: '#2563eb'
    });

    // Add custom controls for polygon editing
    polygon.controls = {
      ...polygon.controls,
      // Add custom control for changing number of sides
      'editSides': new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetY: -16,
        cursorStyle: 'pointer',
        mouseUpHandler: () => {
          // Open polygon editing dialog
          return true;
        },
        render: (ctx, left, top) => {
          const size = 16;
          ctx.save();
          ctx.fillStyle = '#2563eb';
          ctx.beginPath();
          ctx.arc(left, top, size / 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('S', left, top + 3);
          ctx.restore();
        }
      })
    };

    return polygon;
  }, [polygonOptions]);

  const createStar = useCallback((x: number, y: number) => {
    const { points: numPoints, innerRadius, outerRadius, fill, stroke, strokeWidth } = starOptions;
    
    // Calculate star points
    const starPoints: fabric.Point[] = [];
    const angleStep = (Math.PI * 2) / (numPoints * 2);
    
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const pointX = radius * Math.cos(angle);
      const pointY = radius * Math.sin(angle);
      starPoints.push(new fabric.Point(pointX, pointY));
    }

    const star = new fabric.Polygon(starPoints, {
      left: x - outerRadius,
      top: y - outerRadius,
      fill,
      stroke,
      strokeWidth,
      strokeLineJoin: 'round',
      strokeLineCap: 'round',
      selectable: true,
      hasControls: true,
      hasBorders: true,
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
      cornerColor: '#f59e0b',
      borderColor: '#f59e0b'
    });

    // Add custom controls for star editing
    star.controls = {
      ...star.controls,
      'editPoints': new fabric.Control({
        x: 0.5,
        y: -0.5,
        offsetY: -16,
        cursorStyle: 'pointer',
        mouseUpHandler: () => {
          return true;
        },
        render: (ctx, left, top) => {
          const size = 16;
          ctx.save();
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(left, top, size / 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('★', left, top + 3);
          ctx.restore();
        }
      })
    };

    return star;
  }, [starOptions]);

  const startPathDrawing = useCallback(() => {
    if (!canvas) return;
    
    setIsDrawing(true);
    setPathPoints([]);
    
    // Set canvas to drawing mode
    canvas.isDrawingMode = false;
    canvas.selection = false;
    
    const handleMouseDown = (e: fabric.IEvent) => {
      const pointer = canvas.getPointer(e.e);
      setPathPoints(prev => [...prev, { x: pointer.x, y: pointer.y }]);
    };

    const handleMouseMove = (e: fabric.IEvent) => {
      if (pathPoints.length === 0) return;
      
      const pointer = canvas.getPointer(e.e);
      
      // Create temporary path for preview
      const allPoints = [...pathPoints, { x: pointer.x, y: pointer.y }];
      const pathString = createPathString(allPoints);
      
      // Remove previous preview path
      if (pathRef.current) {
        canvas.remove(pathRef.current);
      }
      
      // Add new preview path
      const previewPath = new fabric.Path(pathString, {
        fill: '',
        stroke: '#6b7280',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false
      });
      
      pathRef.current = previewPath;
      canvas.add(previewPath);
      canvas.renderAll();
    };

    const handleDoubleClick = () => {
      finishPathDrawing();
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:dblclick', handleDoubleClick);

    // Store event handlers for cleanup
    (canvas as any)._pathDrawingHandlers = {
      handleMouseDown,
      handleMouseMove,
      handleDoubleClick
    };
  }, [canvas, pathPoints]);

  const finishPathDrawing = useCallback(() => {
    if (!canvas || pathPoints.length < 2) return;
    
    // Remove preview path
    if (pathRef.current) {
      canvas.remove(pathRef.current);
      pathRef.current = null;
    }
    
    // Create final path
    const pathString = createPathString(pathPoints, true);
    const finalPath = new fabric.Path(pathString, {
      fill: '#10b981',
      stroke: '#059669',
      strokeWidth: 2,
      strokeLineJoin: 'round',
      strokeLineCap: 'round',
      selectable: true,
      hasControls: true,
      hasBorders: true,
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
      cornerColor: '#10b981',
      borderColor: '#10b981'
    });

    canvas.add(finalPath);
    canvas.setActiveObject(finalPath);
    
    // Cleanup
    stopPathDrawing();
    
    if (onShapeCreated) {
      onShapeCreated(finalPath);
    }
  }, [canvas, pathPoints, onShapeCreated]);

  const stopPathDrawing = useCallback(() => {
    if (!canvas) return;
    
    setIsDrawing(false);
    setPathPoints([]);
    
    // Remove event handlers
    const handlers = (canvas as any)._pathDrawingHandlers;
    if (handlers) {
      canvas.off('mouse:down', handlers.handleMouseDown);
      canvas.off('mouse:move', handlers.handleMouseMove);
      canvas.off('mouse:dblclick', handlers.handleDoubleClick);
      delete (canvas as any)._pathDrawingHandlers;
    }
    
    // Remove preview path
    if (pathRef.current) {
      canvas.remove(pathRef.current);
      pathRef.current = null;
    }
    
    // Restore canvas state
    canvas.selection = true;
    canvas.renderAll();
  }, [canvas]);

  const createPathString = (points: { x: number; y: number }[], close: boolean = false): string => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    if (points.length > 2) {
      // Use quadratic curves for smoother paths
      for (let i = 1; i < points.length - 1; i++) {
        const midX = (points[i].x + points[i + 1].x) / 2;
        const midY = (points[i].y + points[i + 1].y) / 2;
        path += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
      }
      // Add final point
      const lastPoint = points[points.length - 1];
      path += ` T ${lastPoint.x} ${lastPoint.y}`;
    } else if (points.length === 2) {
      path += ` L ${points[1].x} ${points[1].y}`;
    }
    
    if (close) {
      path += ' Z';
    }
    
    return path;
  };

  const handleCanvasClick = useCallback((e: fabric.IEvent) => {
    if (!canvas || !selectedTool) return;
    
    const pointer = canvas.getPointer(e.e);
    let shape: fabric.Object | null = null;
    
    switch (selectedTool) {
      case 'polygon':
        shape = createPolygon(pointer.x, pointer.y);
        break;
      case 'star':
        shape = createStar(pointer.x, pointer.y);
        break;
      case 'path':
        if (!isDrawing) {
          startPathDrawing();
          return;
        }
        break;
    }
    
    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
      
      if (onShapeCreated) {
        onShapeCreated(shape);
      }
      
      setSelectedTool(null);
    }
  }, [canvas, selectedTool, createPolygon, createStar, startPathDrawing, isDrawing, onShapeCreated]);

  // Set up canvas event listeners
  React.useEffect(() => {
    if (!canvas) return;
    
    if (selectedTool && selectedTool !== 'path') {
      canvas.on('mouse:down', handleCanvasClick);
      canvas.defaultCursor = 'crosshair';
    } else {
      canvas.off('mouse:down', handleCanvasClick);
      canvas.defaultCursor = 'default';
    }
    
    return () => {
      canvas.off('mouse:down', handleCanvasClick);
      canvas.defaultCursor = 'default';
    };
  }, [canvas, selectedTool, handleCanvasClick]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (isDrawing) {
        stopPathDrawing();
      }
    };
  }, [isDrawing, stopPathDrawing]);

  return (
    <div className="space-y-4">
      {/* Tool Selection */}
      <div className="flex space-x-2">
        <button
          onClick={() => setSelectedTool(selectedTool === 'polygon' ? null : 'polygon')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedTool === 'polygon'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span>Polygon</span>
          </div>
        </button>
        
        <button
          onClick={() => setSelectedTool(selectedTool === 'star' ? null : 'star')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedTool === 'star'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span>Star</span>
          </div>
        </button>
        
        <button
          onClick={() => {
            if (selectedTool === 'path' && isDrawing) {
              stopPathDrawing();
            } else {
              setSelectedTool(selectedTool === 'path' ? null : 'path');
            }
          }}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedTool === 'path'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
            <span>{isDrawing ? 'Stop Drawing' : 'Custom Path'}</span>
          </div>
        </button>
      </div>

      {/* Polygon Options */}
      {selectedTool === 'polygon' && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <h4 className="font-medium text-gray-900">Polygon Options</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Sides</label>
              <input
                type="range"
                min="3"
                max="12"
                value={polygonOptions.sides}
                onChange={(e) => setPolygonOptions(prev => ({ ...prev, sides: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{polygonOptions.sides}</span>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Size</label>
              <input
                type="range"
                min="20"
                max="200"
                value={polygonOptions.radius}
                onChange={(e) => setPolygonOptions(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{polygonOptions.radius}px</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fill</label>
              <input
                type="color"
                value={polygonOptions.fill}
                onChange={(e) => setPolygonOptions(prev => ({ ...prev, fill: e.target.value }))}
                className="w-full h-8 rounded border"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Stroke</label>
              <input
                type="color"
                value={polygonOptions.stroke}
                onChange={(e) => setPolygonOptions(prev => ({ ...prev, stroke: e.target.value }))}
                className="w-full h-8 rounded border"
              />
            </div>
          </div>
        </div>
      )}

      {/* Star Options */}
      {selectedTool === 'star' && (
        <div className="p-4 bg-gray-50 rounded-lg space-y-3">
          <h4 className="font-medium text-gray-900">Star Options</h4>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Points</label>
              <input
                type="range"
                min="3"
                max="12"
                value={starOptions.points}
                onChange={(e) => setStarOptions(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{starOptions.points}</span>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Inner Radius</label>
              <input
                type="range"
                min="10"
                max="100"
                value={starOptions.innerRadius}
                onChange={(e) => setStarOptions(prev => ({ ...prev, innerRadius: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{starOptions.innerRadius}px</span>
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Outer Radius</label>
              <input
                type="range"
                min="20"
                max="200"
                value={starOptions.outerRadius}
                onChange={(e) => setStarOptions(prev => ({ ...prev, outerRadius: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{starOptions.outerRadius}px</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fill</label>
              <input
                type="color"
                value={starOptions.fill}
                onChange={(e) => setStarOptions(prev => ({ ...prev, fill: e.target.value }))}
                className="w-full h-8 rounded border"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-1">Stroke</label>
              <input
                type="color"
                value={starOptions.stroke}
                onChange={(e) => setStarOptions(prev => ({ ...prev, stroke: e.target.value }))}
                className="w-full h-8 rounded border"
              />
            </div>
          </div>
        </div>
      )}

      {/* Path Drawing Instructions */}
      {selectedTool === 'path' && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Custom Path Drawing</h4>
          {isDrawing ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Click to add points. Double-click to finish drawing.
              </p>
              <p className="text-xs text-gray-500">
                Points drawn: {pathPoints.length}
              </p>
              <button
                onClick={finishPathDrawing}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Finish Path
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Click on the canvas to start drawing a custom path.
            </p>
          )}
        </div>
      )}
    </div>
  );
};