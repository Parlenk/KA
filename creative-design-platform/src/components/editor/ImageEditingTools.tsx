import React, { useState, useCallback, useEffect } from 'react';
import { 
  Sliders, 
  Palette, 
  Crop, 
  RotateCcw, 
  RotateCw, 
  FlipHorizontal, 
  FlipVertical,
  Contrast,
  Sun,
  Moon,
  Droplets,
  Zap,
  Filter,
  Eye,
  Download,
  Undo,
  Redo,
  RefreshCw
} from 'lucide-react';

// Professional Image Filters - Figma/Canva Level
interface ImageFilter {
  id: string;
  name: string;
  icon: React.ReactNode;
  category: 'basic' | 'artistic' | 'vintage' | 'modern';
  isPremium: boolean;
  cssFilter: string;
  preview: string;
}

const PROFESSIONAL_FILTERS: ImageFilter[] = [
  // Basic Adjustments
  {
    id: 'original',
    name: 'Original',
    icon: <Eye className="w-4 h-4" />,
    category: 'basic',
    isPremium: false,
    cssFilter: 'none',
    preview: '/filters/original.jpg'
  },
  {
    id: 'brightness',
    name: 'Bright',
    icon: <Sun className="w-4 h-4" />,
    category: 'basic',
    isPremium: false,
    cssFilter: 'brightness(1.2) contrast(1.1)',
    preview: '/filters/bright.jpg'
  },
  {
    id: 'contrast',
    name: 'High Contrast',
    icon: <Contrast className="w-4 h-4" />,
    category: 'basic',
    isPremium: false,
    cssFilter: 'contrast(1.4) brightness(1.1)',
    preview: '/filters/contrast.jpg'
  },
  {
    id: 'saturated',
    name: 'Vivid',
    icon: <Droplets className="w-4 h-4" />,
    category: 'basic',
    isPremium: false,
    cssFilter: 'saturate(1.4) contrast(1.1)',
    preview: '/filters/vivid.jpg'
  },

  // Artistic Filters
  {
    id: 'warm',
    name: 'Warm',
    icon: <Sun className="w-4 h-4" />,
    category: 'artistic',
    isPremium: false,
    cssFilter: 'sepia(0.2) saturate(1.2) hue-rotate(-10deg)',
    preview: '/filters/warm.jpg'
  },
  {
    id: 'cool',
    name: 'Cool',
    icon: <Moon className="w-4 h-4" />,
    category: 'artistic',
    isPremium: false,
    cssFilter: 'hue-rotate(180deg) saturate(1.1)',
    preview: '/filters/cool.jpg'
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    icon: <Zap className="w-4 h-4" />,
    category: 'artistic',
    isPremium: true,
    cssFilter: 'contrast(1.5) brightness(0.9) saturate(1.3)',
    preview: '/filters/dramatic.jpg'
  },

  // Vintage Filters
  {
    id: 'vintage',
    name: 'Vintage',
    icon: <Filter className="w-4 h-4" />,
    category: 'vintage',
    isPremium: true,
    cssFilter: 'sepia(0.5) contrast(1.2) brightness(0.9)',
    preview: '/filters/vintage.jpg'
  },
  {
    id: 'sepia',
    name: 'Sepia',
    icon: <Filter className="w-4 h-4" />,
    category: 'vintage',
    isPremium: false,
    cssFilter: 'sepia(1) contrast(1.1)',
    preview: '/filters/sepia.jpg'
  },

  // Modern Filters
  {
    id: 'bw',
    name: 'Black & White',
    icon: <Filter className="w-4 h-4" />,
    category: 'modern',
    isPremium: false,
    cssFilter: 'grayscale(1) contrast(1.2)',
    preview: '/filters/bw.jpg'
  },
  {
    id: 'fade',
    name: 'Fade',
    icon: <Filter className="w-4 h-4" />,
    category: 'modern',
    isPremium: true,
    cssFilter: 'brightness(1.1) contrast(0.9) saturate(0.8)',
    preview: '/filters/fade.jpg'
  }
];

// Filter Categories
const FILTER_CATEGORIES = [
  { id: 'all', name: 'All', icon: <Filter className="w-4 h-4" /> },
  { id: 'basic', name: 'Basic', icon: <Sliders className="w-4 h-4" /> },
  { id: 'artistic', name: 'Artistic', icon: <Palette className="w-4 h-4" /> },
  { id: 'vintage', name: 'Vintage', icon: <RotateCcw className="w-4 h-4" /> },
  { id: 'modern', name: 'Modern', icon: <Zap className="w-4 h-4" /> }
];

interface ImageEditingToolsProps {
  selectedImage: fabric.Image | null;
  onImageUpdate: (updates: any) => void;
  canvas: fabric.Canvas | null;
}

const ImageEditingTools: React.FC<ImageEditingToolsProps> = ({
  selectedImage,
  onImageUpdate,
  canvas
}) => {
  const [activeTab, setActiveTab] = useState<'filters' | 'adjustments' | 'transform'>('filters');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [appliedFilter, setAppliedFilter] = useState('original');
  
  // Image adjustments state
  const [adjustments, setAdjustments] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    blur: 0,
    hue: 0,
    opacity: 100
  });

  // Transform state
  const [transform, setTransform] = useState({
    rotation: 0,
    flipX: false,
    flipY: false,
    scaleX: 1,
    scaleY: 1
  });

  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Apply filter to selected image
  const applyFilter = useCallback((filterId: string) => {
    if (!selectedImage) return;

    const filter = PROFESSIONAL_FILTERS.find(f => f.id === filterId);
    if (!filter) return;

    try {
      // Create CSS filter string
      const filterString = filter.cssFilter;
      
      // Apply to fabric.js image
      selectedImage.set({
        filters: filterString === 'none' ? [] : [
          new fabric.Image.filters.WebGLFilter({
            type: 'WebGLFilter',
            fragment: `
              precision mediump float;
              uniform sampler2D uTexture;
              varying vec2 vTexCoord;
              
              void main() {
                vec4 color = texture2D(uTexture, vTexCoord);
                // Apply CSS filter equivalent
                ${getCSSFilterShader(filterString)}
                gl_FragColor = color;
              }
            `
          })
        ]
      });

      selectedImage.applyFilters();
      canvas?.renderAll();
      
      setAppliedFilter(filterId);
      onImageUpdate({ filter: filterId });
      
      // Save to history
      saveToHistory();
    } catch (error) {
      console.error('Error applying filter:', error);
      // Fallback: apply as CSS filter to the canvas element
      const imgElement = selectedImage.getElement();
      if (imgElement) {
        imgElement.style.filter = filter.cssFilter;
        canvas?.renderAll();
      }
    }
  }, [selectedImage, canvas, onImageUpdate]);

  // Convert CSS filter to WebGL shader (simplified)
  const getCSSFilterShader = (cssFilter: string): string => {
    // This is a simplified version - in production, you'd need full CSS filter parsing
    if (cssFilter.includes('brightness')) {
      return 'color.rgb *= 1.2;';
    }
    if (cssFilter.includes('contrast')) {
      return 'color.rgb = ((color.rgb - 0.5) * 1.4) + 0.5;';
    }
    if (cssFilter.includes('sepia')) {
      return `
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = mix(color.rgb, vec3(gray * 1.2, gray, gray * 0.8), 0.5);
      `;
    }
    if (cssFilter.includes('grayscale')) {
      return `
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = vec3(gray);
      `;
    }
    return '';
  };

  // Apply manual adjustments
  const applyAdjustments = useCallback(() => {
    if (!selectedImage) return;

    const { brightness, contrast, saturation, blur, hue, opacity } = adjustments;

    // Build CSS filter string
    const filters = [];
    if (brightness !== 0) filters.push(`brightness(${1 + brightness / 100})`);
    if (contrast !== 0) filters.push(`contrast(${1 + contrast / 100})`);
    if (saturation !== 0) filters.push(`saturate(${1 + saturation / 100})`);
    if (blur > 0) filters.push(`blur(${blur}px)`);
    if (hue !== 0) filters.push(`hue-rotate(${hue}deg)`);

    const filterString = filters.join(' ');

    // Apply to image element
    const imgElement = selectedImage.getElement();
    if (imgElement) {
      imgElement.style.filter = filterString;
      selectedImage.set('opacity', opacity / 100);
      canvas?.renderAll();
    }

    onImageUpdate({ adjustments });
    saveToHistory();
  }, [selectedImage, adjustments, canvas, onImageUpdate]);

  // Apply transforms
  const applyTransform = useCallback((transformType: string, value?: any) => {
    if (!selectedImage) return;

    let newTransform = { ...transform };

    switch (transformType) {
      case 'rotateLeft':
        newTransform.rotation -= 90;
        selectedImage.rotate(selectedImage.angle - 90);
        break;
      case 'rotateRight':
        newTransform.rotation += 90;
        selectedImage.rotate(selectedImage.angle + 90);
        break;
      case 'flipX':
        newTransform.flipX = !newTransform.flipX;
        selectedImage.set('flipX', newTransform.flipX);
        break;
      case 'flipY':
        newTransform.flipY = !newTransform.flipY;
        selectedImage.set('flipY', newTransform.flipY);
        break;
      case 'resetTransform':
        newTransform = { rotation: 0, flipX: false, flipY: false, scaleX: 1, scaleY: 1 };
        selectedImage.set({
          angle: 0,
          flipX: false,
          flipY: false,
          scaleX: 1,
          scaleY: 1
        });
        break;
    }

    setTransform(newTransform);
    canvas?.renderAll();
    onImageUpdate({ transform: newTransform });
    saveToHistory();
  }, [selectedImage, transform, canvas, onImageUpdate]);

  // History management
  const saveToHistory = useCallback(() => {
    if (!selectedImage) return;

    const state = {
      filter: appliedFilter,
      adjustments: { ...adjustments },
      transform: { ...transform },
      timestamp: Date.now()
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [selectedImage, appliedFilter, adjustments, transform, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      // Apply previous state
      setAppliedFilter(previousState.filter);
      setAdjustments(previousState.adjustments);
      setTransform(previousState.transform);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      // Apply next state
      setAppliedFilter(nextState.filter);
      setAdjustments(nextState.adjustments);
      setTransform(nextState.transform);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Filter display based on category
  const filteredFilters = selectedCategory === 'all' 
    ? PROFESSIONAL_FILTERS 
    : PROFESSIONAL_FILTERS.filter(filter => filter.category === selectedCategory);

  if (!selectedImage) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Select an image to access editing tools</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Image Editor</h3>
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { id: 'filters', name: 'Filters', icon: <Filter className="w-4 h-4" /> },
            { id: 'adjustments', name: 'Adjust', icon: <Sliders className="w-4 h-4" /> },
            { id: 'transform', name: 'Transform', icon: <RotateCw className="w-4 h-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'filters' && (
          <div className="p-4">
            {/* Filter Categories */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {FILTER_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category.icon}
                  {category.name}
                </button>
              ))}
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-2 gap-3">
              {filteredFilters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => applyFilter(filter.id)}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                    appliedFilter === filter.id
                      ? 'border-blue-500 shadow-lg'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Filter Preview */}
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 relative overflow-hidden">
                      <div 
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ 
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="20" cy="20" r="8"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                          filter: filter.cssFilter 
                        }}
                      />
                    </div>
                    {filter.isPremium && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                        PRO
                      </div>
                    )}
                  </div>

                  {/* Filter Name */}
                  <div className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {filter.icon}
                      <span className="text-sm font-medium">{filter.name}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'adjustments' && (
          <div className="p-4 space-y-6">
            {/* Brightness */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Sun className="w-4 h-4" />
                Brightness
                <span className="ml-auto text-gray-500">{adjustments.brightness}%</span>
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.brightness}
                onChange={(e) => {
                  const newAdjustments = { ...adjustments, brightness: parseInt(e.target.value) };
                  setAdjustments(newAdjustments);
                  applyAdjustments();
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Contrast */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Contrast className="w-4 h-4" />
                Contrast
                <span className="ml-auto text-gray-500">{adjustments.contrast}%</span>
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.contrast}
                onChange={(e) => {
                  const newAdjustments = { ...adjustments, contrast: parseInt(e.target.value) };
                  setAdjustments(newAdjustments);
                  applyAdjustments();
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Saturation */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Droplets className="w-4 h-4" />
                Saturation
                <span className="ml-auto text-gray-500">{adjustments.saturation}%</span>
              </label>
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustments.saturation}
                onChange={(e) => {
                  const newAdjustments = { ...adjustments, saturation: parseInt(e.target.value) };
                  setAdjustments(newAdjustments);
                  applyAdjustments();
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Blur */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Filter className="w-4 h-4" />
                Blur
                <span className="ml-auto text-gray-500">{adjustments.blur}px</span>
              </label>
              <input
                type="range"
                min="0"
                max="20"
                value={adjustments.blur}
                onChange={(e) => {
                  const newAdjustments = { ...adjustments, blur: parseInt(e.target.value) };
                  setAdjustments(newAdjustments);
                  applyAdjustments();
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Opacity */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Eye className="w-4 h-4" />
                Opacity
                <span className="ml-auto text-gray-500">{adjustments.opacity}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={adjustments.opacity}
                onChange={(e) => {
                  const newAdjustments = { ...adjustments, opacity: parseInt(e.target.value) };
                  setAdjustments(newAdjustments);
                  applyAdjustments();
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Reset Button */}
            <button
              onClick={() => {
                setAdjustments({
                  brightness: 0,
                  contrast: 0,
                  saturation: 0,
                  blur: 0,
                  hue: 0,
                  opacity: 100
                });
                applyAdjustments();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Adjustments
            </button>
          </div>
        )}

        {activeTab === 'transform' && (
          <div className="p-4 space-y-6">
            {/* Rotation */}
            <div>
              <h4 className="font-medium mb-3">Rotation</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => applyTransform('rotateLeft')}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Rotate Left
                </button>
                <button
                  onClick={() => applyTransform('rotateRight')}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  <RotateCw className="w-4 h-4" />
                  Rotate Right
                </button>
              </div>
            </div>

            {/* Flip */}
            <div>
              <h4 className="font-medium mb-3">Flip</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => applyTransform('flipX')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                    transform.flipX 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <FlipHorizontal className="w-4 h-4" />
                  Flip Horizontal
                </button>
                <button
                  onClick={() => applyTransform('flipY')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                    transform.flipY 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  <FlipVertical className="w-4 h-4" />
                  Flip Vertical
                </button>
              </div>
            </div>

            {/* Transform Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Current Transform</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Rotation: {transform.rotation}°</div>
                <div>Flip X: {transform.flipX ? 'Yes' : 'No'}</div>
                <div>Flip Y: {transform.flipY ? 'Yes' : 'No'}</div>
              </div>
            </div>

            {/* Reset Transform */}
            <button
              onClick={() => applyTransform('resetTransform')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset Transform
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageEditingTools;