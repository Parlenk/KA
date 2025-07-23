import React, { useState, useRef, useCallback } from 'react';
import { 
  Scissors, 
  Eye, 
  EyeOff, 
  Layers, 
  Move, 
  RotateCw,
  Crop,
  Circle,
  Square,
  Star,
  Play,
  Pause,
  SkipForward,
  Trash2,
  Copy,
  Settings
} from 'lucide-react';

interface MaskingToolsProps {
  canvas: fabric.Canvas | null;
  selectedObject: fabric.Object | null;
}

interface MaskDefinition {
  id: string;
  name: string;
  type: 'clipping' | 'opacity' | 'alpha';
  maskObject: fabric.Object;
  targetObject: fabric.Object;
  animation?: MaskAnimation;
  visible: boolean;
  locked: boolean;
}

interface MaskAnimation {
  type: 'fade' | 'slide' | 'scale' | 'rotate' | 'wipe';
  duration: number;
  delay: number;
  easing: string;
  loop: boolean;
  direction?: 'in' | 'out' | 'both';
}

const MaskingTools: React.FC<MaskingToolsProps> = ({
  canvas,
  selectedObject
}) => {
  const [activeTool, setActiveTool] = useState<'select' | 'clip' | 'opacity' | 'alpha'>('select');
  const [masks, setMasks] = useState<MaskDefinition[]>([]);
  const [selectedMask, setSelectedMask] = useState<string | null>(null);
  const [isCreatingMask, setIsCreatingMask] = useState(false);
  const [maskShape, setMaskShape] = useState<'rectangle' | 'circle' | 'polygon' | 'custom'>('rectangle');
  const [animationSettings, setAnimationSettings] = useState<MaskAnimation>({
    type: 'fade',
    duration: 1000,
    delay: 0,
    easing: 'ease-out',
    loop: false,
    direction: 'in'
  });

  const maskPreviewRef = useRef<fabric.Object | null>(null);

  // Create clipping mask
  const createClippingMask = useCallback((maskShape: fabric.Object, targetObject: fabric.Object) => {
    if (!canvas) return null;

    // Create a group with the target object clipped by the mask
    const clipGroup = new fabric.Group([targetObject], {
      selectable: true,
      evented: true
    });

    // Apply clipping path
    clipGroup.clipPath = maskShape;
    maskShape.set({
      selectable: false,
      evented: false,
      visible: false
    });

    const maskDef: MaskDefinition = {
      id: `mask_${Date.now()}`,
      name: `Clipping Mask ${masks.length + 1}`,
      type: 'clipping',
      maskObject: maskShape,
      targetObject: clipGroup,
      visible: true,
      locked: false
    };

    canvas.add(clipGroup);
    canvas.remove(targetObject);
    canvas.setActiveObject(clipGroup);
    canvas.renderAll();

    return maskDef;
  }, [canvas, masks.length]);

  // Create opacity mask
  const createOpacityMask = useCallback((maskShape: fabric.Object, targetObject: fabric.Object) => {
    if (!canvas) return null;

    // Create a custom fabric object that uses the mask for opacity
    const opacityGroup = new fabric.Group([targetObject], {
      selectable: true,
      evented: true
    });

    // Store mask reference for custom rendering
    (opacityGroup as any).opacityMask = maskShape;
    maskShape.set({
      selectable: false,
      evented: false,
      visible: false
    });

    // Custom render method for opacity masking
    const originalRender = opacityGroup._render;
    opacityGroup._render = function(ctx: CanvasRenderingContext2D) {
      const mask = (this as any).opacityMask;
      if (mask) {
        ctx.save();
        
        // Create mask from shape
        const maskCanvas = document.createElement('canvas');
        const maskCtx = maskCanvas.getContext('2d')!;
        maskCanvas.width = this.width || 100;
        maskCanvas.height = this.height || 100;
        
        // Render mask shape to get alpha values
        mask._render(maskCtx);
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        
        // Apply opacity mask
        ctx.globalCompositeOperation = 'source-over';
        originalRender.call(this, ctx);
        
        // Apply mask using composite operation
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0);
        
        ctx.restore();
      } else {
        originalRender.call(this, ctx);
      }
    };

    const maskDef: MaskDefinition = {
      id: `mask_${Date.now()}`,
      name: `Opacity Mask ${masks.length + 1}`,
      type: 'opacity',
      maskObject: maskShape,
      targetObject: opacityGroup,
      visible: true,
      locked: false
    };

    canvas.add(opacityGroup);
    canvas.remove(targetObject);
    canvas.setActiveObject(opacityGroup);
    canvas.renderAll();

    return maskDef;
  }, [canvas, masks.length]);

  // Create alpha mask
  const createAlphaMask = useCallback((maskShape: fabric.Object, targetObject: fabric.Object) => {
    if (!canvas) return null;

    // Similar to opacity mask but uses grayscale values for alpha
    const alphaGroup = new fabric.Group([targetObject], {
      selectable: true,
      evented: true
    });

    (alphaGroup as any).alphaMask = maskShape;
    maskShape.set({
      selectable: false,
      evented: false,
      visible: false,
      fill: 'white' // White = fully opaque, black = fully transparent
    });

    const maskDef: MaskDefinition = {
      id: `mask_${Date.now()}`,
      name: `Alpha Mask ${masks.length + 1}`,
      type: 'alpha',
      maskObject: maskShape,
      targetObject: alphaGroup,
      visible: true,
      locked: false
    };

    canvas.add(alphaGroup);
    canvas.remove(targetObject);
    canvas.setActiveObject(alphaGroup);
    canvas.renderAll();

    return maskDef;
  }, [canvas, masks.length]);

  // Start mask creation
  const startMaskCreation = (type: 'clipping' | 'opacity' | 'alpha') => {
    if (!canvas || !selectedObject) return;

    setActiveTool(type);
    setIsCreatingMask(true);
    
    // Add instruction overlay
    const instruction = new fabric.Text(`Click and drag to create ${type} mask`, {
      left: 50,
      top: 50,
      fontSize: 16,
      fill: '#3b82f6',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: 8
    });

    canvas.add(instruction);
    setTimeout(() => {
      canvas.remove(instruction);
      canvas.renderAll();
    }, 3000);
  };

  // Handle mask shape creation
  const handleCanvasMouseDown = useCallback((e: fabric.IEvent) => {
    if (!canvas || !isCreatingMask || !selectedObject) return;

    const pointer = canvas.getPointer(e.e);
    let maskShape: fabric.Object;

    switch (maskShape) {
      case 'rectangle':
        maskShape = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 100,
          height: 100,
          fill: 'rgba(0, 0, 0, 0.5)',
          stroke: '#3b82f6',
          strokeWidth: 2,
          strokeDashArray: [5, 5]
        });
        break;
      case 'circle':
        maskShape = new fabric.Circle({
          left: pointer.x,
          top: pointer.y,
          radius: 50,
          fill: 'rgba(0, 0, 0, 0.5)',
          stroke: '#3b82f6',
          strokeWidth: 2,
          strokeDashArray: [5, 5]
        });
        break;
      default:
        maskShape = new fabric.Rect({
          left: pointer.x,
          top: pointer.y,
          width: 100,
          height: 100,
          fill: 'rgba(0, 0, 0, 0.5)',
          stroke: '#3b82f6',
          strokeWidth: 2,
          strokeDashArray: [5, 5]
        });
    }

    canvas.add(maskShape);
    canvas.setActiveObject(maskShape);
    maskPreviewRef.current = maskShape;
    canvas.renderAll();
  }, [canvas, isCreatingMask, selectedObject, maskShape]);

  // Finish mask creation
  const finishMaskCreation = () => {
    if (!canvas || !maskPreviewRef.current || !selectedObject) return;

    const maskShape = maskPreviewRef.current;
    let maskDef: MaskDefinition | null = null;

    // Create appropriate mask type
    switch (activeTool) {
      case 'clip':
        maskDef = createClippingMask(maskShape, selectedObject);
        break;
      case 'opacity':
        maskDef = createOpacityMask(maskShape, selectedObject);
        break;
      case 'alpha':
        maskDef = createAlphaMask(maskShape, selectedObject);
        break;
    }

    if (maskDef) {
      setMasks(prev => [...prev, maskDef!]);
      setSelectedMask(maskDef.id);
    }

    setIsCreatingMask(false);
    setActiveTool('select');
    maskPreviewRef.current = null;
  };

  // Apply mask animation
  const applyMaskAnimation = (maskId: string, animation: MaskAnimation) => {
    const mask = masks.find(m => m.id === maskId);
    if (!mask || !canvas) return;

    const { type, duration, delay, easing, direction } = animation;
    const targetObject = mask.targetObject;

    // Create animation based on type
    switch (type) {
      case 'fade':
        if (direction === 'in') {
          targetObject.set({ opacity: 0 });
          targetObject.animate('opacity', 1, {
            duration,
            delay,
            easing
          });
        } else {
          targetObject.animate('opacity', 0, {
            duration,
            delay,
            easing
          });
        }
        break;

      case 'slide':
        const originalLeft = targetObject.left || 0;
        const slideDistance = 200;
        
        if (direction === 'in') {
          targetObject.set({ left: originalLeft - slideDistance });
          targetObject.animate('left', originalLeft, {
            duration,
            delay,
            easing
          });
        } else {
          targetObject.animate('left', originalLeft + slideDistance, {
            duration,
            delay,
            easing
          });
        }
        break;

      case 'scale':
        if (direction === 'in') {
          targetObject.set({ scaleX: 0, scaleY: 0 });
          targetObject.animate({ scaleX: 1, scaleY: 1 }, {
            duration,
            delay,
            easing
          });
        } else {
          targetObject.animate({ scaleX: 0, scaleY: 0 }, {
            duration,
            delay,
            easing
          });
        }
        break;

      case 'rotate':
        const rotation = direction === 'in' ? 360 : -360;
        targetObject.animate('angle', (targetObject.angle || 0) + rotation, {
          duration,
          delay,
          easing
        });
        break;

      case 'wipe':
        // Implement wipe effect using clipPath animation
        const maskObj = mask.maskObject;
        if (maskObj.type === 'rect') {
          const rect = maskObj as fabric.Rect;
          const originalWidth = rect.width || 100;
          
          if (direction === 'in') {
            rect.set({ width: 0 });
            rect.animate('width', originalWidth, {
              duration,
              delay,
              easing
            });
          } else {
            rect.animate('width', 0, {
              duration,
              delay,
              easing
            });
          }
        }
        break;
    }

    // Update mask definition
    setMasks(prev => prev.map(m => 
      m.id === maskId ? { ...m, animation } : m
    ));

    canvas.renderAll();
  };

  // Toggle mask visibility
  const toggleMaskVisibility = (maskId: string) => {
    const mask = masks.find(m => m.id === maskId);
    if (!mask) return;

    const newVisibility = !mask.visible;
    mask.targetObject.set({ visible: newVisibility });
    
    setMasks(prev => prev.map(m => 
      m.id === maskId ? { ...m, visible: newVisibility } : m
    ));

    canvas?.renderAll();
  };

  // Delete mask
  const deleteMask = (maskId: string) => {
    const mask = masks.find(m => m.id === maskId);
    if (!mask || !canvas) return;

    // Remove mask and restore original object
    canvas.remove(mask.targetObject);
    
    // If it's a group, restore the original objects
    if (mask.targetObject.type === 'group') {
      const group = mask.targetObject as fabric.Group;
      const objects = group.getObjects();
      objects.forEach(obj => {
        canvas.add(obj);
      });
    }

    setMasks(prev => prev.filter(m => m.id !== maskId));
    if (selectedMask === maskId) {
      setSelectedMask(null);
    }

    canvas.renderAll();
  };

  // Event listeners
  React.useEffect(() => {
    if (!canvas) return;

    if (isCreatingMask) {
      canvas.on('mouse:down', handleCanvasMouseDown);
    }

    return () => {
      canvas.off('mouse:down', handleCanvasMouseDown);
    };
  }, [canvas, isCreatingMask, handleCanvasMouseDown]);

  const MaskListItem = ({ mask }: { mask: MaskDefinition }) => (
    <div 
      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
        selectedMask === mask.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => setSelectedMask(mask.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded ${
            mask.type === 'clipping' ? 'bg-blue-500' :
            mask.type === 'opacity' ? 'bg-green-500' : 'bg-purple-500'
          }`} />
          <span className="text-sm font-medium">{mask.name}</span>
          <span className="text-xs text-gray-500 capitalize">{mask.type}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMaskVisibility(mask.id);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {mask.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteMask(mask.id);
            }}
            className="p-1 hover:bg-red-100 rounded text-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {mask.animation && (
        <div className="mt-2 text-xs text-gray-600">
          Animation: {mask.animation.type} ({mask.animation.duration}ms)
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm space-y-4">
      <h3 className="font-medium">Masking Tools</h3>
      
      {/* Mask Type Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Mask Type</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => startMaskCreation('clipping')}
            disabled={!selectedObject || isCreatingMask}
            className={`p-2 border rounded text-sm flex items-center gap-2 ${
              activeTool === 'clip' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            } disabled:opacity-50`}
          >
            <Scissors className="w-4 h-4" />
            Clipping
          </button>
          
          <button
            onClick={() => startMaskCreation('opacity')}
            disabled={!selectedObject || isCreatingMask}
            className={`p-2 border rounded text-sm flex items-center gap-2 ${
              activeTool === 'opacity' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
            } disabled:opacity-50`}
          >
            <Eye className="w-4 h-4" />
            Opacity
          </button>
          
          <button
            onClick={() => startMaskCreation('alpha')}
            disabled={!selectedObject || isCreatingMask}
            className={`p-2 border rounded text-sm flex items-center gap-2 ${
              activeTool === 'alpha' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
            } disabled:opacity-50`}
          >
            <Layers className="w-4 h-4" />
            Alpha
          </button>
        </div>
      </div>

      {/* Mask Shape Selection */}
      {isCreatingMask && (
        <div>
          <label className="block text-sm font-medium mb-2">Mask Shape</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'rectangle', icon: Square, label: 'Rectangle' },
              { id: 'circle', icon: Circle, label: 'Circle' },
              { id: 'polygon', icon: Star, label: 'Polygon' },
              { id: 'custom', icon: Crop, label: 'Custom' }
            ].map(shape => (
              <button
                key={shape.id}
                onClick={() => setMaskShape(shape.id as any)}
                className={`p-2 border rounded text-xs flex flex-col items-center gap-1 ${
                  maskShape === shape.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <shape.icon className="w-4 h-4" />
                {shape.label}
              </button>
            ))}
          </div>
          
          <div className="mt-2 flex gap-2">
            <button
              onClick={finishMaskCreation}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
            >
              Create Mask
            </button>
            <button
              onClick={() => {
                setIsCreatingMask(false);
                setActiveTool('select');
                if (maskPreviewRef.current && canvas) {
                  canvas.remove(maskPreviewRef.current);
                  canvas.renderAll();
                }
              }}
              className="px-3 py-1 bg-gray-600 text-white rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Mask List */}
      <div>
        <label className="block text-sm font-medium mb-2">Active Masks ({masks.length})</label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {masks.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No masks created yet. Select an object and create a mask.
            </div>
          ) : (
            masks.map(mask => <MaskListItem key={mask.id} mask={mask} />)
          )}
        </div>
      </div>

      {/* Animation Controls */}
      {selectedMask && (
        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-2">Mask Animation</label>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Type</label>
                <select
                  value={animationSettings.type}
                  onChange={(e) => setAnimationSettings(prev => ({ 
                    ...prev, 
                    type: e.target.value as any 
                  }))}
                  className="w-full p-1 border rounded text-sm"
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="scale">Scale</option>
                  <option value="rotate">Rotate</option>
                  <option value="wipe">Wipe</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">Direction</label>
                <select
                  value={animationSettings.direction}
                  onChange={(e) => setAnimationSettings(prev => ({ 
                    ...prev, 
                    direction: e.target.value as any 
                  }))}
                  className="w-full p-1 border rounded text-sm"
                >
                  <option value="in">In</option>
                  <option value="out">Out</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Duration: {animationSettings.duration}ms
              </label>
              <input
                type="range"
                min="100"
                max="3000"
                step="100"
                value={animationSettings.duration}
                onChange={(e) => setAnimationSettings(prev => ({ 
                  ...prev, 
                  duration: Number(e.target.value) 
                }))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Delay: {animationSettings.delay}ms
              </label>
              <input
                type="range"
                min="0"
                max="2000"
                step="100"
                value={animationSettings.delay}
                onChange={(e) => setAnimationSettings(prev => ({ 
                  ...prev, 
                  delay: Number(e.target.value) 
                }))}
                className="w-full"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => applyMaskAnimation(selectedMask, animationSettings)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Apply Animation
              </button>
              
              <button
                onClick={() => {
                  const mask = masks.find(m => m.id === selectedMask);
                  if (mask) {
                    mask.targetObject.stop();
                    canvas?.renderAll();
                  }
                }}
                className="px-3 py-2 bg-gray-600 text-white rounded text-sm"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!selectedObject && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          💡 Select an object first, then choose a mask type to create a mask effect.
        </div>
      )}
    </div>
  );
};

export default MaskingTools;