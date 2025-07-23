import React, { useState, useCallback } from 'react';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Sliders, 
  Palette, 
  RotateCcw,
  Settings,
  Info,
  Zap
} from 'lucide-react';

interface BlendModeToolsProps {
  canvas: fabric.Canvas | null;
  selectedObject: fabric.Object | null;
}

interface BlendMode {
  id: string;
  name: string;
  description: string;
  category: 'normal' | 'darken' | 'lighten' | 'contrast' | 'color' | 'special';
  cssValue: string;
  intensity?: number;
}

interface BlendPreset {
  id: string;
  name: string;
  description: string;
  modes: Array<{
    objectId?: string;
    blendMode: string;
    opacity: number;
  }>;
}

const BlendModeTools: React.FC<BlendModeToolsProps> = ({
  canvas,
  selectedObject
}) => {
  const [selectedBlendMode, setSelectedBlendMode] = useState<string>('source-over');
  const [opacity, setOpacity] = useState<number>(100);
  const [activeCategory, setActiveCategory] = useState<string>('normal');
  const [showPreview, setShowPreview] = useState<boolean>(true);

  // Comprehensive blend modes
  const blendModes: BlendMode[] = [
    // Normal
    { id: 'source-over', name: 'Normal', description: 'Default blending', category: 'normal', cssValue: 'source-over' },
    { id: 'source-atop', name: 'Source Atop', description: 'Draw on top of existing content', category: 'normal', cssValue: 'source-atop' },
    { id: 'destination-over', name: 'Behind', description: 'Draw behind existing content', category: 'normal', cssValue: 'destination-over' },
    
    // Darken
    { id: 'multiply', name: 'Multiply', description: 'Darkens by multiplying colors', category: 'darken', cssValue: 'multiply' },
    { id: 'darken', name: 'Darken', description: 'Keeps the darkest color', category: 'darken', cssValue: 'darken' },
    { id: 'color-burn', name: 'Color Burn', description: 'Darkens with increased contrast', category: 'darken', cssValue: 'color-burn' },
    { id: 'linear-burn', name: 'Linear Burn', description: 'Darkens by decreasing brightness', category: 'darken', cssValue: 'linear-burn' },
    
    // Lighten
    { id: 'screen', name: 'Screen', description: 'Lightens by inverting and multiplying', category: 'lighten', cssValue: 'screen' },
    { id: 'lighten', name: 'Lighten', description: 'Keeps the lightest color', category: 'lighten', cssValue: 'lighten' },
    { id: 'color-dodge', name: 'Color Dodge', description: 'Lightens with decreased contrast', category: 'lighten', cssValue: 'color-dodge' },
    { id: 'linear-dodge', name: 'Linear Dodge', description: 'Lightens by increasing brightness', category: 'lighten', cssValue: 'linear-dodge' },
    
    // Contrast
    { id: 'overlay', name: 'Overlay', description: 'Multiply or screen depending on base', category: 'contrast', cssValue: 'overlay' },
    { id: 'soft-light', name: 'Soft Light', description: 'Gentle overlay effect', category: 'contrast', cssValue: 'soft-light' },
    { id: 'hard-light', name: 'Hard Light', description: 'Strong overlay effect', category: 'contrast', cssValue: 'hard-light' },
    { id: 'vivid-light', name: 'Vivid Light', description: 'Burns or dodges based on blend', category: 'contrast', cssValue: 'vivid-light' },
    { id: 'linear-light', name: 'Linear Light', description: 'Linear burn or dodge', category: 'contrast', cssValue: 'linear-light' },
    { id: 'pin-light', name: 'Pin Light', description: 'Replaces depending on brightness', category: 'contrast', cssValue: 'pin-light' },
    
    // Color
    { id: 'hue', name: 'Hue', description: 'Blends hue of source with saturation and luminosity of base', category: 'color', cssValue: 'hue' },
    { id: 'saturation', name: 'Saturation', description: 'Blends saturation with hue and luminosity of base', category: 'color', cssValue: 'saturation' },
    { id: 'color', name: 'Color', description: 'Blends hue and saturation with luminosity of base', category: 'color', cssValue: 'color' },
    { id: 'luminosity', name: 'Luminosity', description: 'Blends luminosity with hue and saturation of base', category: 'color', cssValue: 'luminosity' },
    
    // Special
    { id: 'difference', name: 'Difference', description: 'Subtracts colors', category: 'special', cssValue: 'difference' },
    { id: 'exclusion', name: 'Exclusion', description: 'Similar to difference but lower contrast', category: 'special', cssValue: 'exclusion' },
    { id: 'xor', name: 'XOR', description: 'Exclusive or operation', category: 'special', cssValue: 'xor' }
  ];

  // Blend mode presets
  const blendPresets: BlendPreset[] = [
    {
      id: 'vintage',
      name: 'Vintage',
      description: 'Classic vintage photo effect',
      modes: [
        { blendMode: 'multiply', opacity: 80 },
        { blendMode: 'color-burn', opacity: 60 }
      ]
    },
    {
      id: 'dramatic',
      name: 'Dramatic',
      description: 'High contrast dramatic look',
      modes: [
        { blendMode: 'overlay', opacity: 90 },
        { blendMode: 'hard-light', opacity: 70 }
      ]
    },
    {
      id: 'dreamy',
      name: 'Dreamy',
      description: 'Soft dreamy atmosphere',
      modes: [
        { blendMode: 'soft-light', opacity: 85 },
        { blendMode: 'screen', opacity: 40 }
      ]
    },
    {
      id: 'neon',
      name: 'Neon',
      description: 'Bright neon glow effect',
      modes: [
        { blendMode: 'color-dodge', opacity: 95 },
        { blendMode: 'screen', opacity: 80 }
      ]
    },
    {
      id: 'retro',
      name: 'Retro',
      description: 'Retro color scheme',
      modes: [
        { blendMode: 'color', opacity: 75 },
        { blendMode: 'saturation', opacity: 60 }
      ]
    }
  ];

  // Categories for organization
  const categories = [
    { id: 'normal', name: 'Normal', icon: Layers },
    { id: 'darken', name: 'Darken', icon: Eye },
    { id: 'lighten', name: 'Lighten', icon: EyeOff },
    { id: 'contrast', name: 'Contrast', icon: Sliders },
    { id: 'color', name: 'Color', icon: Palette },
    { id: 'special', name: 'Special', icon: Zap }
  ];

  // Apply blend mode to selected object
  const applyBlendMode = useCallback((blendMode: string, opacity: number = 100) => {
    if (!canvas || !selectedObject) return;

    // Store original render method if not already stored
    if (!(selectedObject as any).originalRender) {
      (selectedObject as any).originalRender = selectedObject._render;
    }

    // Create custom render method with blend mode
    selectedObject._render = function(ctx: CanvasRenderingContext2D) {
      const originalComposite = ctx.globalCompositeOperation;
      const originalAlpha = ctx.globalAlpha;

      // Apply blend mode and opacity
      ctx.globalCompositeOperation = blendMode as any;
      ctx.globalAlpha = (originalAlpha * opacity) / 100;

      // Call original render
      (selectedObject as any).originalRender.call(this, ctx);

      // Restore original composite operation and alpha
      ctx.globalCompositeOperation = originalComposite;
      ctx.globalAlpha = originalAlpha;
    };

    // Store blend mode info on object
    (selectedObject as any).blendMode = blendMode;
    (selectedObject as any).blendOpacity = opacity;

    canvas.renderAll();
  }, [canvas, selectedObject]);

  // Reset blend mode
  const resetBlendMode = useCallback(() => {
    if (!canvas || !selectedObject) return;

    if ((selectedObject as any).originalRender) {
      selectedObject._render = (selectedObject as any).originalRender;
      delete (selectedObject as any).originalRender;
      delete (selectedObject as any).blendMode;
      delete (selectedObject as any).blendOpacity;
    }

    setSelectedBlendMode('source-over');
    setOpacity(100);
    canvas.renderAll();
  }, [canvas, selectedObject]);

  // Apply preset
  const applyPreset = useCallback((preset: BlendPreset) => {
    if (!canvas || !selectedObject) return;

    // Apply the first blend mode from the preset
    if (preset.modes.length > 0) {
      const mode = preset.modes[0];
      applyBlendMode(mode.blendMode, mode.opacity);
      setSelectedBlendMode(mode.blendMode);
      setOpacity(mode.opacity);
    }
  }, [canvas, selectedObject, applyBlendMode]);

  // Create preview
  const createPreview = useCallback((blendMode: string) => {
    if (!canvas || !selectedObject || !showPreview) return;

    // Temporarily apply blend mode for preview
    const currentMode = (selectedObject as any).blendMode || 'source-over';
    const currentOpacity = (selectedObject as any).blendOpacity || 100;

    applyBlendMode(blendMode, opacity);

    // Restore after a short delay
    setTimeout(() => {
      if ((selectedObject as any).blendMode !== blendMode) {
        applyBlendMode(currentMode, currentOpacity);
      }
    }, 1000);
  }, [canvas, selectedObject, showPreview, opacity, applyBlendMode]);

  // Get current blend mode info
  const getCurrentBlendMode = () => {
    if (!selectedObject) return null;
    
    const currentMode = (selectedObject as any).blendMode || 'source-over';
    return blendModes.find(mode => mode.cssValue === currentMode);
  };

  const BlendModeButton = ({ mode }: { mode: BlendMode }) => {
    const isActive = selectedBlendMode === mode.cssValue;
    
    return (
      <button
        onClick={() => {
          setSelectedBlendMode(mode.cssValue);
          applyBlendMode(mode.cssValue, opacity);
        }}
        onMouseEnter={() => createPreview(mode.cssValue)}
        className={`p-3 border rounded-lg text-left transition-all ${
          isActive 
            ? 'border-blue-500 bg-blue-50 text-blue-700' 
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <div className="font-medium text-sm">{mode.name}</div>
        <div className="text-xs text-gray-500 mt-1">{mode.description}</div>
      </button>
    );
  };

  const PresetButton = ({ preset }: { preset: BlendPreset }) => (
    <button
      onClick={() => applyPreset(preset)}
      className="p-3 border rounded-lg text-left hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="font-medium text-sm">{preset.name}</div>
      <div className="text-xs text-gray-500 mt-1">{preset.description}</div>
      <div className="text-xs text-blue-600 mt-1">
        {preset.modes.length} effect{preset.modes.length > 1 ? 's' : ''}
      </div>
    </button>
  );

  const currentMode = getCurrentBlendMode();
  const filteredModes = blendModes.filter(mode => mode.category === activeCategory);

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Blend Modes</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`p-1 rounded ${showPreview ? 'text-blue-600' : 'text-gray-400'}`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={resetBlendMode}
            className="p-1 text-gray-600 hover:text-gray-800"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current Blend Mode Info */}
      {currentMode && selectedObject && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{currentMode.name}</div>
              <div className="text-xs text-gray-600">{currentMode.description}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{opacity}%</div>
              <div className="text-xs text-gray-500">Opacity</div>
            </div>
          </div>
        </div>
      )}

      {/* Opacity Control */}
      {selectedObject && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Opacity: {opacity}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={opacity}
            onChange={(e) => {
              const newOpacity = Number(e.target.value);
              setOpacity(newOpacity);
              applyBlendMode(selectedBlendMode, newOpacity);
            }}
            className="w-full"
          />
        </div>
      )}

      {/* Category Tabs */}
      <div>
        <label className="block text-sm font-medium mb-2">Categories</label>
        <div className="grid grid-cols-3 gap-1">
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`p-2 rounded text-xs flex items-center gap-1 ${
                  activeCategory === category.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-3 h-3" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Blend Modes Grid */}
      <div>
        <label className="block text-sm font-medium mb-2">
          {categories.find(c => c.id === activeCategory)?.name} Modes
        </label>
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {filteredModes.map(mode => (
            <BlendModeButton key={mode.id} mode={mode} />
          ))}
        </div>
      </div>

      {/* Presets */}
      <div>
        <label className="block text-sm font-medium mb-2">Blend Presets</label>
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
          {blendPresets.map(preset => (
            <PresetButton key={preset.id} preset={preset} />
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Advanced</span>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={() => {
              if (selectedObject && canvas) {
                // Create a duplicate with current blend mode
                const clone = fabric.util.object.clone(selectedObject);
                clone.set({
                  left: (selectedObject.left || 0) + 20,
                  top: (selectedObject.top || 0) + 20
                });
                
                // Apply same blend mode to clone
                if ((selectedObject as any).blendMode) {
                  (clone as any).blendMode = (selectedObject as any).blendMode;
                  (clone as any).blendOpacity = (selectedObject as any).blendOpacity;
                }
                
                canvas.add(clone);
                canvas.renderAll();
              }
            }}
            className="w-full p-2 border rounded text-sm hover:bg-gray-50"
          >
            Duplicate with Blend Mode
          </button>
          
          <button
            onClick={() => {
              if (selectedObject && canvas) {
                // Apply blend mode to all selected objects
                const activeObjects = canvas.getActiveObjects();
                activeObjects.forEach(obj => {
                  if (obj !== selectedObject) {
                    applyBlendMode(selectedBlendMode, opacity);
                  }
                });
              }
            }}
            className="w-full p-2 border rounded text-sm hover:bg-gray-50"
          >
            Apply to All Selected
          </button>
        </div>
      </div>

      {/* Help Text */}
      {!selectedObject && (
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded flex items-start gap-2">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            Select an object to apply blend modes. Hover over blend modes to preview the effect.
          </div>
        </div>
      )}
    </div>
  );
};

export default BlendModeTools;