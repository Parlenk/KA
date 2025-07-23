import React, { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { selectCanvas, addCanvasSize, removeCanvasSize } from '../../store/slices/designSlice';
import { DesignCanvas, DesignSize } from '../../types/design';
import { STANDARD_AD_SIZES } from '../../utils/adSizes';
import CanvasRenderer from './CanvasRenderer';

interface MultiCanvasViewProps {
  className?: string;
}

const MultiCanvasView: React.FC<MultiCanvasViewProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const { currentDesignSet, selectedCanvasId, syncInProgress } = useSelector(
    (state: RootState) => state.design
  );
  
  const [showSizeSelector, setShowSizeSelector] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'tabs'>('grid');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCanvasSelect = (canvasId: string) => {
    dispatch(selectCanvas(canvasId));
  };

  const handleAddSize = (size: DesignSize) => {
    dispatch(addCanvasSize(size));
    setShowSizeSelector(false);
  };

  const handleRemoveCanvas = (canvasId: string) => {
    if (currentDesignSet && currentDesignSet.canvases.length > 1) {
      dispatch(removeCanvasSize(canvasId));
    }
  };

  const getCanvasScale = (canvas: DesignCanvas): number => {
    const maxWidth = viewMode === 'grid' ? 200 : 300;
    const maxHeight = viewMode === 'grid' ? 150 : 200;
    return Math.min(maxWidth / canvas.width, maxHeight / canvas.height, 1);
  };

  if (!currentDesignSet) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <p className="text-gray-500">No design set selected</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {currentDesignSet.name}
          </h2>
          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
            {currentDesignSet.canvases.length} formats
          </span>
          {syncInProgress && (
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Syncing...</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('tabs')}
              className={`px-3 py-1 text-sm ${
                viewMode === 'tabs'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tabs
            </button>
          </div>

          {/* Add Size Button */}
          <button
            onClick={() => setShowSizeSelector(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Format
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
        {viewMode === 'grid' ? (
          <GridView
            canvases={currentDesignSet.canvases}
            selectedCanvasId={selectedCanvasId}
            onCanvasSelect={handleCanvasSelect}
            onRemoveCanvas={handleRemoveCanvas}
            getCanvasScale={getCanvasScale}
          />
        ) : (
          <TabView
            canvases={currentDesignSet.canvases}
            selectedCanvasId={selectedCanvasId}
            onCanvasSelect={handleCanvasSelect}
            onRemoveCanvas={handleRemoveCanvas}
            getCanvasScale={getCanvasScale}
          />
        )}
      </div>

      {/* Size Selector Modal */}
      {showSizeSelector && (
        <SizeSelectorModal
          onSelect={handleAddSize}
          onClose={() => setShowSizeSelector(false)}
          existingSizes={currentDesignSet.canvases.map(c => c.sizeId)}
        />
      )}
    </div>
  );
};

// Grid View Component
interface ViewProps {
  canvases: DesignCanvas[];
  selectedCanvasId: string | null;
  onCanvasSelect: (id: string) => void;
  onRemoveCanvas: (id: string) => void;
  getCanvasScale: (canvas: DesignCanvas) => number;
}

const GridView: React.FC<ViewProps> = ({
  canvases,
  selectedCanvasId,
  onCanvasSelect,
  onRemoveCanvas,
  getCanvasScale,
}) => (
  <div className="p-6">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {canvases.map((canvas) => {
        const scale = getCanvasScale(canvas);
        const isSelected = canvas.id === selectedCanvasId;
        
        return (
          <CanvasCard
            key={canvas.id}
            canvas={canvas}
            scale={scale}
            isSelected={isSelected}
            onSelect={() => onCanvasSelect(canvas.id)}
            onRemove={() => onRemoveCanvas(canvas.id)}
            showRemove={canvases.length > 1}
          />
        );
      })}
    </div>
  </div>
);

// Tab View Component
const TabView: React.FC<ViewProps> = ({
  canvases,
  selectedCanvasId,
  onCanvasSelect,
  onRemoveCanvas,
  getCanvasScale,
}) => {
  const selectedCanvas = canvases.find(c => c.id === selectedCanvasId) || canvases[0];
  const scale = selectedCanvas ? getCanvasScale(selectedCanvas) : 1;

  return (
    <div className="flex flex-col h-full">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto">
          {canvases.map((canvas) => {
            const isSelected = canvas.id === selectedCanvasId;
            const sizeInfo = STANDARD_AD_SIZES.find(s => s.id === canvas.sizeId);
            
            return (
              <div
                key={canvas.id}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-white text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => onCanvasSelect(canvas.id)}
              >
                <span className="text-sm font-medium">
                  {sizeInfo?.name || `${canvas.width}×${canvas.height}`}
                </span>
                <span className="text-xs text-gray-500">
                  {canvas.width}×{canvas.height}
                </span>
                {canvases.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveCanvas(canvas.id);
                    }}
                    className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Canvas */}
      <div className="flex-1 flex items-center justify-center p-8">
        {selectedCanvas && (
          <div className="border border-gray-300 rounded-lg shadow-sm bg-white">
            <CanvasRenderer
              canvas={selectedCanvas}
              scale={scale}
              isActive={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Canvas Card Component
interface CanvasCardProps {
  canvas: DesignCanvas;
  scale: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  showRemove: boolean;
}

const CanvasCard: React.FC<CanvasCardProps> = ({
  canvas,
  scale,
  isSelected,
  onSelect,
  onRemove,
  showRemove,
}) => {
  const sizeInfo = STANDARD_AD_SIZES.find(s => s.id === canvas.sizeId);
  
  return (
    <div
      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-600 shadow-lg bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      {/* Remove Button */}
      {showRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-700 transition-colors z-10"
        >
          ×
        </button>
      )}

      {/* Canvas Preview */}
      <div className="flex justify-center mb-3">
        <div className="border border-gray-300 rounded shadow-sm bg-white">
          <CanvasRenderer
            canvas={canvas}
            scale={scale}
            isActive={false}
          />
        </div>
      </div>

      {/* Canvas Info */}
      <div className="text-center">
        <h3 className="font-medium text-gray-900 text-sm">
          {sizeInfo?.name || 'Custom Size'}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {canvas.width} × {canvas.height}px
        </p>
        {sizeInfo?.platform && (
          <p className="text-xs text-blue-600 mt-1">
            {sizeInfo.platform}
          </p>
        )}
      </div>
    </div>
  );
};

// Size Selector Modal Component
interface SizeSelectorModalProps {
  onSelect: (size: DesignSize) => void;
  onClose: () => void;
  existingSizes: string[];
}

const SizeSelectorModal: React.FC<SizeSelectorModalProps> = ({
  onSelect,
  onClose,
  existingSizes,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('social');
  const [searchTerm, setSearchTerm] = useState('');
  const [customSize, setCustomSize] = useState({ width: '', height: '', name: '' });

  const categories = [
    { id: 'social', name: 'Social Media' },
    { id: 'display', name: 'Display Ads' },
    { id: 'print', name: 'Print' },
    { id: 'video', name: 'Video' },
  ];

  const filteredSizes = STANDARD_AD_SIZES.filter(size => 
    !existingSizes.includes(size.id) &&
    size.category === selectedCategory &&
    (size.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     size.platform?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCustomSizeSubmit = () => {
    if (customSize.width && customSize.height && customSize.name) {
      const size: DesignSize = {
        id: `custom_${Date.now()}`,
        name: customSize.name,
        width: parseInt(customSize.width),
        height: parseInt(customSize.height),
        category: 'custom',
        platform: 'custom',
        isStandard: false,
      };
      onSelect(size);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Add Format</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-200 p-4">
              <div className="space-y-4">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search sizes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {/* Categories */}
                <div className="space-y-1">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedCategory('custom')}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedCategory === 'custom'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Custom Size
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {selectedCategory === 'custom' ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Create Custom Size</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Width (px)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={customSize.width}
                        onChange={(e) => setCustomSize(prev => ({ ...prev, width: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Height (px)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={customSize.height}
                        onChange={(e) => setCustomSize(prev => ({ ...prev, height: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      value={customSize.name}
                      onChange={(e) => setCustomSize(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Custom Banner"
                    />
                  </div>
                  <button
                    onClick={handleCustomSizeSubmit}
                    disabled={!customSize.width || !customSize.height || !customSize.name}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Create Custom Size
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSizes.map(size => (
                    <div
                      key={size.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                      onClick={() => onSelect(size)}
                    >
                      <h4 className="font-medium text-gray-900">{size.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        {size.width} × {size.height}px
                      </p>
                      {size.platform && (
                        <p className="text-xs text-blue-600 mt-1">{size.platform}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiCanvasView;