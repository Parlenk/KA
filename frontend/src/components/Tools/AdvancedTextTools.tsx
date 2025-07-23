import React, { useState, useCallback, useRef } from 'react';
import { 
  Type, 
  RotateCcw, 
  Waves, 
  TrendingUp, 
  Circle, 
  Zap,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline
} from 'lucide-react';

interface AdvancedTextToolsProps {
  canvas: fabric.Canvas | null;
  selectedObject: fabric.Object | null;
}

interface TextEffect {
  id: string;
  name: string;
  icon: React.ElementType;
  apply: (textObj: fabric.Text) => void;
}

const AdvancedTextTools: React.FC<AdvancedTextToolsProps> = ({
  canvas,
  selectedObject
}) => {
  const [textContent, setTextContent] = useState('');
  const [curveAmount, setCurveAmount] = useState(0);
  const [pathMode, setPathMode] = useState<'none' | 'curve' | 'circle' | 'wave'>('none');
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const [pathPoints, setPathPoints] = useState<{ x: number; y: number }[]>([]);
  const pathPreviewRef = useRef<fabric.Path | null>(null);

  // Check if selected object is text
  const isTextSelected = selectedObject && selectedObject.type === 'text';

  // Text effects
  const textEffects: TextEffect[] = [
    {
      id: 'shadow',
      name: 'Drop Shadow',
      icon: Zap,
      apply: (textObj) => {
        textObj.set({
          shadow: new fabric.Shadow({
            color: 'rgba(0,0,0,0.5)',
            blur: 5,
            offsetX: 3,
            offsetY: 3
          })
        });
      }
    },
    {
      id: 'outline',
      name: 'Outline',
      icon: Circle,
      apply: (textObj) => {
        textObj.set({
          stroke: '#000000',
          strokeWidth: 2,
          paintFirst: 'stroke'
        });
      }
    },
    {
      id: 'gradient',
      name: 'Gradient',
      icon: Palette,
      apply: (textObj) => {
        const gradient = new fabric.Gradient({
          type: 'linear',
          coords: { x1: 0, y1: 0, x2: textObj.width || 100, y2: 0 },
          colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#8b5cf6' }
          ]
        });
        textObj.set({ fill: gradient });
      }
    }
  ];

  // Create curved text
  const createCurvedText = useCallback((text: string, curve: number) => {
    if (!canvas) return;

    const radius = 100;
    const center = { x: 200, y: 200 };
    const chars = text.split('');
    const group = new fabric.Group([], {
      selectable: true,
      evented: true
    });

    const angleStep = (curve * Math.PI) / (chars.length - 1 || 1);
    const startAngle = -curve * Math.PI / 2;

    chars.forEach((char, index) => {
      const angle = startAngle + index * angleStep;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);

      const charText = new fabric.Text(char, {
        left: x,
        top: y,
        fontSize: 24,
        fill: '#000000',
        fontFamily: 'Arial',
        angle: (angle + Math.PI / 2) * (180 / Math.PI),
        originX: 'center',
        originY: 'center'
      });

      group.addWithUpdate(charText);
    });

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, [canvas]);

  // Create text on path
  const createTextOnPath = useCallback((text: string, pathString: string) => {
    if (!canvas) return;

    // Create the path
    const path = new fabric.Path(pathString, {
      fill: 'transparent',
      stroke: 'transparent',
      selectable: false,
      evented: false
    });

    // Calculate path length
    const pathLength = getPathLength(pathString);
    const chars = text.split('');
    const charSpacing = pathLength / (chars.length - 1 || 1);

    const group = new fabric.Group([], {
      selectable: true,
      evented: true
    });

    chars.forEach((char, index) => {
      const t = index / (chars.length - 1 || 1);
      const point = getPointAtLength(pathString, t * pathLength);
      const tangent = getTangentAtLength(pathString, t * pathLength);

      if (point) {
        const charText = new fabric.Text(char, {
          left: point.x,
          top: point.y,
          fontSize: 20,
          fill: '#000000',
          fontFamily: 'Arial',
          angle: Math.atan2(tangent.y, tangent.x) * (180 / Math.PI),
          originX: 'center',
          originY: 'center'
        });

        group.addWithUpdate(charText);
      }
    });

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, [canvas]);

  // Create circular text
  const createCircularText = useCallback((text: string, radius: number = 80) => {
    if (!canvas) return;

    const center = { x: 200, y: 200 };
    const chars = text.split('');
    const group = new fabric.Group([], {
      selectable: true,
      evented: true
    });

    const angleStep = (2 * Math.PI) / chars.length;

    chars.forEach((char, index) => {
      const angle = index * angleStep - Math.PI / 2;
      const x = center.x + radius * Math.cos(angle);
      const y = center.y + radius * Math.sin(angle);

      const charText = new fabric.Text(char, {
        left: x,
        top: y,
        fontSize: 20,
        fill: '#000000',
        fontFamily: 'Arial',
        angle: angle * (180 / Math.PI) + 90,
        originX: 'center',
        originY: 'center'
      });

      group.addWithUpdate(charText);
    });

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, [canvas]);

  // Create wave text
  const createWaveText = useCallback((text: string, amplitude: number = 20, frequency: number = 0.1) => {
    if (!canvas) return;

    const chars = text.split('');
    const group = new fabric.Group([], {
      selectable: true,
      evented: true
    });

    const startX = 150;
    const startY = 200;
    const charWidth = 15;

    chars.forEach((char, index) => {
      const x = startX + index * charWidth;
      const y = startY + amplitude * Math.sin(frequency * x);

      const charText = new fabric.Text(char, {
        left: x,
        top: y,
        fontSize: 24,
        fill: '#000000',
        fontFamily: 'Arial',
        originX: 'center',
        originY: 'center'
      });

      group.addWithUpdate(charText);
    });

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  }, [canvas]);

  // Start drawing custom path for text
  const startPathDrawing = () => {
    setIsDrawingPath(true);
    setPathPoints([]);
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
      const pathString = createSmoothPath(newPoints);
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

  const finishPathText = () => {
    if (!canvas || pathPoints.length < 2 || !textContent) {
      setIsDrawingPath(false);
      return;
    }

    // Remove preview
    if (pathPreviewRef.current) {
      canvas.remove(pathPreviewRef.current);
      pathPreviewRef.current = null;
    }

    // Create text on the drawn path
    const pathString = createSmoothPath(pathPoints);
    createTextOnPath(textContent, pathString);

    setIsDrawingPath(false);
    setPathPoints([]);
  };

  // Create smooth curved path from points
  const createSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';

    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      path += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
    }
    
    if (points.length > 1) {
      const last = points[points.length - 1];
      path += ` T ${last.x} ${last.y}`;
    }

    return path;
  };

  // Helper functions for path calculations
  const getPathLength = (pathString: string): number => {
    // Simplified path length calculation
    // In a real implementation, you'd use SVG path parsing
    return 200; // Placeholder
  };

  const getPointAtLength = (pathString: string, length: number): { x: number; y: number } | null => {
    // Simplified point calculation
    // In a real implementation, you'd use SVG path point calculation
    return { x: 100 + length, y: 200 }; // Placeholder
  };

  const getTangentAtLength = (pathString: string, length: number): { x: number; y: number } => {
    // Simplified tangent calculation
    return { x: 1, y: 0 }; // Placeholder
  };

  // Apply text styling
  const applyTextStyling = (property: string, value: any) => {
    if (!isTextSelected || !canvas) return;

    const textObj = selectedObject as fabric.Text;
    textObj.set({ [property]: value });
    canvas.renderAll();
  };

  // Set up event listeners
  React.useEffect(() => {
    if (!canvas) return;

    if (isDrawingPath) {
      canvas.on('mouse:down', handlePathClick);
    }

    return () => {
      canvas.off('mouse:down', handlePathClick);
    };
  }, [canvas, isDrawingPath, handlePathClick]);

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm space-y-4">
      <h3 className="font-medium">Advanced Text Tools</h3>
      
      {/* Text Input */}
      <div>
        <label className="block text-sm font-medium mb-2">Text Content</label>
        <input
          type="text"
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          placeholder="Enter text for special effects"
          className="w-full p-2 border rounded text-sm"
        />
      </div>

      {/* Text Shape Options */}
      <div>
        <label className="block text-sm font-medium mb-2">Text Shape</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => textContent && createCurvedText(textContent, curveAmount)}
            disabled={!textContent}
            className="p-2 border rounded text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Curved
          </button>
          
          <button
            onClick={() => textContent && createCircularText(textContent)}
            disabled={!textContent}
            className="p-2 border rounded text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <Circle className="w-4 h-4" />
            Circular
          </button>
          
          <button
            onClick={() => textContent && createWaveText(textContent)}
            disabled={!textContent}
            className="p-2 border rounded text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
          >
            <Waves className="w-4 h-4" />
            Wave
          </button>
          
          <button
            onClick={startPathDrawing}
            disabled={!textContent || isDrawingPath}
            className={`p-2 border rounded text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50 ${
              isDrawingPath ? 'bg-blue-50 border-blue-300' : ''
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Custom Path
          </button>
        </div>

        {/* Curve Amount Control */}
        {pathMode === 'curve' && (
          <div className="mt-3">
            <label className="block text-sm font-medium mb-2">
              Curve Amount: {curveAmount.toFixed(1)}
            </label>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.1"
              value={curveAmount}
              onChange={(e) => setCurveAmount(Number(e.target.value))}
              className="w-full"
            />
          </div>
        )}

        {/* Path Drawing Instructions */}
        {isDrawingPath && (
          <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
            <p>Click to draw a path for your text. Points: {pathPoints.length}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={finishPathText}
                disabled={pathPoints.length < 2}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50"
              >
                Apply Text to Path
              </button>
              <button
                onClick={() => {
                  setIsDrawingPath(false);
                  setPathPoints([]);
                  if (pathPreviewRef.current && canvas) {
                    canvas.remove(pathPreviewRef.current);
                    canvas.renderAll();
                  }
                }}
                className="px-2 py-1 bg-gray-600 text-white rounded text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Text Effects */}
      <div>
        <label className="block text-sm font-medium mb-2">Text Effects</label>
        <div className="grid grid-cols-1 gap-2">
          {textEffects.map((effect) => {
            const Icon = effect.icon;
            return (
              <button
                key={effect.id}
                onClick={() => {
                  if (isTextSelected) {
                    effect.apply(selectedObject as fabric.Text);
                    canvas?.renderAll();
                  }
                }}
                disabled={!isTextSelected}
                className="p-2 border rounded text-sm flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
              >
                <Icon className="w-4 h-4" />
                {effect.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Text Formatting (when text is selected) */}
      {isTextSelected && (
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-2">Format Selected Text</label>
          
          {/* Font Controls */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => applyTextStyling('fontWeight', 
                  (selectedObject as fabric.Text).fontWeight === 'bold' ? 'normal' : 'bold'
                )}
                className={`p-2 border rounded ${
                  (selectedObject as fabric.Text).fontWeight === 'bold' ? 'bg-gray-200' : ''
                }`}
              >
                <Bold className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => applyTextStyling('fontStyle',
                  (selectedObject as fabric.Text).fontStyle === 'italic' ? 'normal' : 'italic'
                )}
                className={`p-2 border rounded ${
                  (selectedObject as fabric.Text).fontStyle === 'italic' ? 'bg-gray-200' : ''
                }`}
              >
                <Italic className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => applyTextStyling('underline',
                  !(selectedObject as fabric.Text).underline
                )}
                className={`p-2 border rounded ${
                  (selectedObject as fabric.Text).underline ? 'bg-gray-200' : ''
                }`}
              >
                <Underline className="w-4 h-4" />
              </button>
            </div>

            {/* Alignment */}
            <div className="flex gap-2">
              <button
                onClick={() => applyTextStyling('textAlign', 'left')}
                className={`p-2 border rounded ${
                  (selectedObject as fabric.Text).textAlign === 'left' ? 'bg-gray-200' : ''
                }`}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => applyTextStyling('textAlign', 'center')}
                className={`p-2 border rounded ${
                  (selectedObject as fabric.Text).textAlign === 'center' ? 'bg-gray-200' : ''
                }`}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => applyTextStyling('textAlign', 'right')}
                className={`p-2 border rounded ${
                  (selectedObject as fabric.Text).textAlign === 'right' ? 'bg-gray-200' : ''
                }`}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Font Size</label>
              <input
                type="range"
                min="8"
                max="72"
                value={(selectedObject as fabric.Text).fontSize || 16}
                onChange={(e) => applyTextStyling('fontSize', Number(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center">
                {(selectedObject as fabric.Text).fontSize}px
              </div>
            </div>

            {/* Letter Spacing */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">Letter Spacing</label>
              <input
                type="range"
                min="-5"
                max="20"
                value={(selectedObject as fabric.Text).charSpacing || 0}
                onChange={(e) => applyTextStyling('charSpacing', Number(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 text-center">
                {(selectedObject as fabric.Text).charSpacing || 0}px
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedTextTools;