import React, { useState, useRef, useCallback } from 'react';
import { 
  Pentagon, 
  Star, 
  Pen, 
  MousePointer, 
  Edit3, 
  Zap,
  Triangle,
  Hexagon,
  Circle,
  Square
} from 'lucide-react';

interface AdvancedShapeToolsProps {
  canvas: fabric.Canvas | null;
  onToolSelect: (tool: string) => void;
  activeTool: string;
}

interface ShapePreset {
  id: string;
  name: string;
  icon: React.ElementType;
  points?: number;
  generator: (options: any) => fabric.Object;
}

const AdvancedShapeTools: React.FC<AdvancedShapeToolsProps> = ({
  canvas,
  onToolSelect,
  activeTool
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('polygon');
  const [polygonSides, setPolygonSides] = useState(6);
  const [starPoints, setStarPoints] = useState(5);
  const [starInnerRadius, setStarInnerRadius] = useState(0.5);
  const [pathPoints, setPathPoints] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const pathPreviewRef = useRef<fabric.Path | null>(null);

  // Shape presets
  const shapePresets: ShapePreset[] = [
    {
      id: 'polygon',
      name: 'Polygon',
      icon: Pentagon,
      generator: (options) => createPolygon(options)
    },
    {
      id: 'star',
      name: 'Star',
      icon: Star,
      generator: (options) => createStar(options)
    },
    {
      id: 'triangle',
      name: 'Triangle',
      icon: Triangle,
      generator: (options) => createPolygon({ ...options, sides: 3 })
    },
    {
      id: 'hexagon',
      name: 'Hexagon',
      icon: Hexagon,
      generator: (options) => createPolygon({ ...options, sides: 6 })
    },
    {
      id: 'arrow',
      name: 'Arrow',
      icon: Edit3,
      generator: (options) => createArrow(options)
    },
    {
      id: 'lightning',
      name: 'Lightning',
      icon: Zap,
      generator: (options) => createLightning(options)
    }
  ];

  // Create polygon shape
  const createPolygon = ({ x = 100, y = 100, radius = 50, sides = 6, fill = '#3b82f6' }) => {
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
      points.push({
        x: x + radius * Math.cos(angle),
        y: y + radius * Math.sin(angle)
      });
    }

    return new fabric.Polygon(points, {
      fill,
      stroke: '#1e40af',
      strokeWidth: 2,
      selectable: true,
      evented: true
    });
  };

  // Create star shape
  const createStar = ({ 
    x = 100, 
    y = 100, 
    outerRadius = 50, 
    innerRadius = 25, 
    points = 5, 
    fill = '#fbbf24' 
  }) => {
    const starPoints = [];
    const step = Math.PI / points;

    for (let i = 0; i < 2 * points; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = i * step - Math.PI / 2;
      starPoints.push({
        x: x + radius * Math.cos(angle),
        y: y + radius * Math.sin(angle)
      });
    }

    return new fabric.Polygon(starPoints, {
      fill,
      stroke: '#f59e0b',
      strokeWidth: 2,
      selectable: true,
      evented: true
    });
  };

  // Create arrow shape
  const createArrow = ({ x = 100, y = 100, length = 100, width = 40, fill = '#10b981' }) => {
    const arrowPoints = [
      { x: x, y: y },
      { x: x + length * 0.7, y: y },
      { x: x + length * 0.7, y: y - width * 0.3 },
      { x: x + length, y: y + width * 0.5 },
      { x: x + length * 0.7, y: y + width * 1.3 },
      { x: x + length * 0.7, y: y + width },
      { x: x, y: y + width }
    ];

    return new fabric.Polygon(arrowPoints, {
      fill,
      stroke: '#059669',
      strokeWidth: 2,
      selectable: true,
      evented: true
    });
  };

  // Create lightning bolt shape
  const createLightning = ({ x = 100, y = 100, width = 30, height = 80, fill = '#8b5cf6' }) => {
    const lightningPoints = [
      { x: x, y: y },
      { x: x + width * 0.6, y: y },
      { x: x + width * 0.2, y: y + height * 0.4 },
      { x: x + width * 0.8, y: y + height * 0.4 },
      { x: x + width, y: y + height * 0.6 },
      { x: x + width * 0.4, y: y + height * 0.6 },
      { x: x + width * 0.8, y: y + height },
      { x: x + width * 0.2, y: y + height },
      { x: x + width * 0.6, y: y + height * 0.6 },
      { x: x + width * 0.0, y: y + height * 0.6 }
    ];

    return new fabric.Polygon(lightningPoints, {
      fill,
      stroke: '#7c3aed',
      strokeWidth: 2,
      selectable: true,
      evented: true
    });
  };

  // Handle shape placement
  const handleCanvasClick = useCallback((e: fabric.IEvent) => {
    if (!canvas) return;

    const pointer = canvas.getPointer(e.e);
    const preset = shapePresets.find(p => p.id === selectedPreset);
    
    if (!preset) return;

    let shape: fabric.Object;

    switch (selectedPreset) {
      case 'polygon':
        shape = createPolygon({
          x: pointer.x,
          y: pointer.y,
          radius: 50,
          sides: polygonSides
        });
        break;
      case 'star':
        shape = createStar({
          x: pointer.x,
          y: pointer.y,
          outerRadius: 50,
          innerRadius: 50 * starInnerRadius,
          points: starPoints
        });
        break;
      default:
        shape = preset.generator({
          x: pointer.x - 50,
          y: pointer.y - 40
        });
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  }, [canvas, selectedPreset, polygonSides, starPoints, starInnerRadius]);

  // Custom path drawing
  const startPathDrawing = () => {
    setIsDrawingPath(true);
    setPathPoints([]);
    onToolSelect('custom-path');
  };

  const handlePathClick = useCallback((e: fabric.IEvent) => {
    if (!canvas || !isDrawingPath) return;

    const pointer = canvas.getPointer(e.e);
    const newPoints = [...pathPoints, { x: pointer.x, y: pointer.y }];
    setPathPoints(newPoints);

    // Create preview path
    if (pathPreviewRef.current) {
      canvas.remove(pathPreviewRef.current);
    }

    if (newPoints.length > 1) {
      const pathString = createSVGPath(newPoints);
      const pathObject = new fabric.Path(pathString, {
        fill: 'transparent',
        stroke: '#3b82f6',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false
      });

      pathPreviewRef.current = pathObject;
      canvas.add(pathObject);
      canvas.renderAll();
    }
  }, [canvas, isDrawingPath, pathPoints]);

  const finishPath = () => {
    if (!canvas || pathPoints.length < 3) {
      setIsDrawingPath(false);
      return;
    }

    // Remove preview
    if (pathPreviewRef.current) {
      canvas.remove(pathPreviewRef.current);
      pathPreviewRef.current = null;
    }

    // Create final path
    const pathString = createSVGPath([...pathPoints, pathPoints[0]]); // Close path
    const finalPath = new fabric.Path(pathString, {
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
      selectable: true,
      evented: true
    });

    canvas.add(finalPath);
    canvas.setActiveObject(finalPath);
    canvas.renderAll();

    setIsDrawingPath(false);
    setPathPoints([]);
  };

  const createSVGPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  // Bezier curve tool and advanced effects
  const [bezierPoints, setBezierPoints] = useState<{ x: number; y: number }[]>([]);
  const [isBezierMode, setIsBezierMode] = useState(false);
  const [shapeEffects, setShapeEffects] = useState({
    shadow: false,
    glow: false,
    bevel: false,
    gradient: false
  });

  const handleBezierClick = useCallback((e: fabric.IEvent) => {
    if (!canvas || !isBezierMode) return;

    const pointer = canvas.getPointer(e.e);
    const newPoints = [...bezierPoints, { x: pointer.x, y: pointer.y }];
    setBezierPoints(newPoints);

    if (newPoints.length === 4) {
      // Create cubic bezier curve
      const [p0, p1, p2, p3] = newPoints;
      const pathString = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
      
      const curve = new fabric.Path(pathString, {
        fill: 'transparent',
        stroke: '#e11d48',
        strokeWidth: 3,
        selectable: true,
        evented: true
      });

      canvas.add(curve);
      canvas.setActiveObject(curve);
      canvas.renderAll();

      setBezierPoints([]);
      setIsBezierMode(false);
    }
  }, [canvas, isBezierMode, bezierPoints]);

  // Advanced effect functions
  const applyShapeEffect = (effect: string, enabled: boolean) => {
    const activeObj = canvas?.getActiveObject();
    if (!activeObj) return;

    switch (effect) {
      case 'shadow':
        if (enabled) {
          activeObj.set({
            shadow: new fabric.Shadow({
              color: 'rgba(0,0,0,0.3)',
              blur: 10,
              offsetX: 5,
              offsetY: 5
            })
          });
        } else {
          activeObj.set({ shadow: null });
        }
        break;
      case 'glow':
        if (enabled) {
          activeObj.set({
            shadow: new fabric.Shadow({
              color: '#3b82f6',
              blur: 20,
              offsetX: 0,
              offsetY: 0
            })
          });
        } else {
          activeObj.set({ shadow: null });
        }
        break;
      case 'gradient':
        if (enabled) {
          const gradient = new fabric.Gradient({
            type: 'linear',
            coords: { x1: 0, y1: 0, x2: activeObj.width || 100, y2: 0 },
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#8b5cf6' }
            ]
          });
          activeObj.set({ fill: gradient });
        }
        break;
    }
    canvas?.renderAll();
  };

  const applyAdvancedShadow = () => {
    const activeObj = canvas?.getActiveObject();
    if (activeObj) {
      activeObj.set({
        shadow: new fabric.Shadow({
          color: 'rgba(0,0,0,0.4)',
          blur: 12,
          offsetX: 8,
          offsetY: 8
        })
      });
      canvas?.renderAll();
    }
  };

  const applyGlowEffect = () => {
    const activeObj = canvas?.getActiveObject();
    if (activeObj) {
      activeObj.set({
        shadow: new fabric.Shadow({
          color: '#00ffff',
          blur: 25,
          offsetX: 0,
          offsetY: 0
        })
      });
      canvas?.renderAll();
    }
  };

  const applyGradientFill = () => {
    const activeObj = canvas?.getActiveObject();
    if (activeObj) {
      const gradient = new fabric.Gradient({
        type: 'radial',
        coords: { 
          x1: (activeObj.width || 100) / 2, 
          y1: (activeObj.height || 100) / 2, 
          r1: 0,
          x2: (activeObj.width || 100) / 2, 
          y2: (activeObj.height || 100) / 2, 
          r2: Math.max(activeObj.width || 100, activeObj.height || 100) / 2
        },
        colorStops: [
          { offset: 0, color: '#ffffff' },
          { offset: 0.5, color: '#3b82f6' },
          { offset: 1, color: '#1e40af' }
        ]
      });
      activeObj.set({ fill: gradient });
      canvas?.renderAll();
    }
  };

  const applyBevelEffect = () => {
    const activeObj = canvas?.getActiveObject();
    if (activeObj) {
      activeObj.set({
        stroke: '#ffffff',
        strokeWidth: 2,
        shadow: new fabric.Shadow({
          color: 'rgba(0,0,0,0.3)',
          blur: 5,
          offsetX: 2,
          offsetY: 2
        })
      });
      canvas?.renderAll();
    }
  };

  const createMorphingShape = () => {
    const activeObj = canvas?.getActiveObject();
    if (!activeObj || !canvas) return;

    // Create morphing animation between different shapes
    const originalPath = (activeObj as any).path;
    
    // Animate between different polygon shapes
    let sides = 3;
    const morphInterval = setInterval(() => {
      sides = sides >= 8 ? 3 : sides + 1;
      
      if (activeObj.type === 'polygon') {
        const points = [];
        const radius = 50;
        const centerX = activeObj.left || 0;
        const centerY = activeObj.top || 0;
        
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          });
        }
        
        (activeObj as fabric.Polygon).set({ points });
        canvas.renderAll();
      }
    }, 1000);

    // Stop after 10 seconds
    setTimeout(() => clearInterval(morphInterval), 10000);
  };

  // Set up event listeners
  React.useEffect(() => {
    if (!canvas) return;

    if (activeTool.startsWith('shape-') && selectedPreset) {
      canvas.on('mouse:down', handleCanvasClick);
    } else if (activeTool === 'custom-path' && isDrawingPath) {
      canvas.on('mouse:down', handlePathClick);
    } else if (activeTool === 'bezier' && isBezierMode) {
      canvas.on('mouse:down', handleBezierClick);
    }

    return () => {
      canvas.off('mouse:down', handleCanvasClick);
      canvas.off('mouse:down', handlePathClick);
      canvas.off('mouse:down', handleBezierClick);
    };
  }, [canvas, activeTool, selectedPreset, isDrawingPath, isBezierMode, handleCanvasClick, handlePathClick, handleBezierClick]);

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <h3 className="font-medium mb-4">Advanced Shapes</h3>
      
      {/* Shape Presets */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {shapePresets.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedPreset(preset.id);
                onToolSelect(`shape-${preset.id}`);
              }}
              className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                activeTool === `shape-${preset.id}`
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{preset.name}</span>
            </button>
          );
        })}
      </div>

      {/* Shape-specific controls */}
      {selectedPreset === 'polygon' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Sides: {polygonSides}
          </label>
          <input
            type="range"
            min="3"
            max="12"
            value={polygonSides}
            onChange={(e) => setPolygonSides(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {selectedPreset === 'star' && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Points: {starPoints}
            </label>
            <input
              type="range"
              min="3"
              max="12"
              value={starPoints}
              onChange={(e) => setStarPoints(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Inner Radius: {(starInnerRadius * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.2"
              max="0.8"
              step="0.1"
              value={starInnerRadius}
              onChange={(e) => setStarInnerRadius(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Custom Path Tool */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-2">Custom Paths</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={startPathDrawing}
            disabled={isDrawingPath}
            className={`p-2 rounded border flex items-center gap-2 text-sm ${
              isDrawingPath 
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Pen className="w-4 h-4" />
            {isDrawingPath ? 'Drawing...' : 'Draw Path'}
          </button>
          
          <button
            onClick={() => setIsBezierMode(!isBezierMode)}
            className={`p-2 rounded border flex items-center gap-2 text-sm ${
              isBezierMode 
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Bezier Curve
          </button>
        </div>

        {isDrawingPath && (
          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
            <p>Click to add points. You have {pathPoints.length} points.</p>
            <button
              onClick={finishPath}
              disabled={pathPoints.length < 3}
              className="mt-1 px-2 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50"
            >
              Finish Path
            </button>
          </div>
        )}

        {isBezierMode && (
          <div className="mt-2 p-2 bg-green-50 rounded text-sm">
            <p>Click 4 points to create a bezier curve. Points: {bezierPoints.length}/4</p>
            {bezierPoints.length > 0 && (
              <button
                onClick={() => {
                  setBezierPoints([]);
                  setIsBezierMode(false);
                }}
                className="mt-1 px-2 py-1 bg-gray-600 text-white rounded text-xs"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Advanced Shape Effects */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-medium mb-2">Shape Effects</h4>
        
        {/* Effect Toggles */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {Object.entries(shapeEffects).map(([effect, enabled]) => (
            <label key={effect} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => {
                  setShapeEffects(prev => ({ ...prev, [effect]: e.target.checked }));
                  applyShapeEffect(effect, e.target.checked);
                }}
                className="rounded"
              />
              <span className="capitalize">{effect}</span>
            </label>
          ))}
        </div>

        {/* Quick Effect Buttons */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => applyAdvancedShadow()}
            className="p-2 border rounded hover:bg-gray-50 flex items-center gap-1"
          >
            <Zap className="w-3 h-3" />
            Drop Shadow
          </button>
          
          <button
            onClick={() => applyGlowEffect()}
            className="p-2 border rounded hover:bg-gray-50 flex items-center gap-1"
          >
            <Circle className="w-3 h-3" />
            Glow Effect
          </button>
          
          <button
            onClick={() => applyGradientFill()}
            className="p-2 border rounded hover:bg-gray-50 flex items-center gap-1"
          >
            <Square className="w-3 h-3" />
            Gradient Fill
          </button>
          
          <button
            onClick={() => applyBevelEffect()}
            className="p-2 border rounded hover:bg-gray-50 flex items-center gap-1"
          >
            <Layers className="w-3 h-3" />
            Bevel
          </button>
        </div>

        {/* Advanced Controls */}
        <div className="mt-3 space-y-2">
          <button
            onClick={() => {
              const activeObj = canvas?.getActiveObject();
              if (activeObj) {
                // Create inner shadow effect
                activeObj.set({
                  shadow: new fabric.Shadow({
                    color: 'rgba(0,0,0,0.5)',
                    blur: 15,
                    offsetX: 0,
                    offsetY: 0,
                    affectStroke: true
                  })
                });
                canvas?.renderAll();
              }
            }}
            className="w-full p-2 border rounded text-xs hover:bg-gray-50"
          >
            Inner Shadow
          </button>
          
          <button
            onClick={() => createMorphingShape()}
            className="w-full p-2 border rounded text-xs hover:bg-gray-50"
          >
            Morphing Animation
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedShapeTools;