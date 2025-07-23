import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { loadDesignSet, addObject, updateObject } from '../../store/slices/designSlice';
import { loadBrandKits } from '../../store/slices/brandKitSlice';
import { addAnimation } from '../../store/slices/animationSlice';
import MultiCanvasView from './MultiCanvasView';
import TimelineEditor from './TimelineEditor';
import BrandKitPanel from './BrandKitPanel';
import ExportDialog from './ExportDialog';
import AIAssistant from '../ai/AIAssistant';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import {
  Save,
  Download,
  Undo,
  Redo,
  Play,
  Pause,
  Settings,
  Layers,
  Palette,
  Type,
  Image,
  Square,
  Circle,
  MousePointer,
  Sparkles,
  Zap,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface EditorLayoutProps {
  designSetId: string;
}

const EditorLayout: React.FC<EditorLayoutProps> = ({ designSetId }) => {
  const dispatch = useDispatch();
  const { currentDesignSet, loading, selectedObjectIds } = useSelector(
    (state: RootState) => state.design
  );
  const { isPlaying } = useSelector((state: RootState) => state.animation);
  
  const [leftPanelTab, setLeftPanelTab] = useState<'tools' | 'layers'>('tools');
  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'brand'>('properties');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('select');

  // AI Assistant integration
  const {
    isOpen: isAIAssistantOpen,
    isConnected: isAIConnected,
    activeJobs,
    openAssistant,
    closeAssistant,
    toggleAssistant,
    checkAIServiceHealth
  } = useAIAssistant();

  useEffect(() => {
    if (designSetId) {
      dispatch(loadDesignSet(designSetId));
      dispatch(loadBrandKits());
    }
  }, [designSetId, dispatch]);

  // Check AI service health on mount
  useEffect(() => {
    checkAIServiceHealth();
  }, [checkAIServiceHealth]);

  const tools = [
    { id: 'select', name: 'Select', icon: MousePointer, shortcut: 'V' },
    { id: 'rectangle', name: 'Rectangle', icon: Square, shortcut: 'R' },
    { id: 'ellipse', name: 'Ellipse', icon: Circle, shortcut: 'E' },
    { id: 'text', name: 'Text', icon: Type, shortcut: 'T' },
    { id: 'image', name: 'Image', icon: Image, shortcut: 'I' },
  ];

  const handleSave = () => {
    if (currentDesignSet) {
      // Auto-save implementation
      console.log('Saving design set...');
    }
  };

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
  };

  // AI Assistant result handlers
  const handleApplyAIResult = (result: any, type: string) => {
    if (!currentDesignSet || !currentDesignSet.canvases.length) return;

    switch (type) {
      case 'image':
        // Add generated image to canvas
        if (result.url) {
          const imageObject = {
            id: `img_${Date.now()}`,
            type: 'image',
            src: result.url,
            x: 50,
            y: 50,
            width: result.width || 300,
            height: result.height || 300,
            opacity: 1,
            rotation: 0
          };
          dispatch(addObject(imageObject));
        }
        break;

      case 'text':
        // Add generated text to canvas
        if (result.text) {
          const textObject = {
            id: `text_${Date.now()}`,
            type: 'text',
            text: result.text,
            x: 50,
            y: 50,
            fontSize: 24,
            fontFamily: 'Arial',
            color: '#000000',
            opacity: 1,
            rotation: 0
          };
          dispatch(addObject(textObject));
        }
        break;

      case 'animation':
        // Apply generated animations to selected objects
        if (result && selectedObjectIds.length > 0) {
          result.forEach((animation: any) => {
            dispatch(addAnimation({
              elementId: animation.element_id,
              animation: {
                id: `anim_${Date.now()}`,
                type: animation.type,
                keyframes: animation.keyframes,
                duration: animation.duration,
                easing: animation.easing,
                delay: animation.delay || 0
              }
            }));
          });
        }
        break;

      case 'background':
        // Update image with background removed
        if (result.result_url && selectedObjectIds.length > 0) {
          selectedObjectIds.forEach(id => {
            dispatch(updateObject({
              id,
              properties: { src: result.result_url }
            }));
          });
        }
        break;

      default:
        console.log('AI result applied:', type, result);
    }
  };

  if (loading && !currentDesignSet) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading design set...</p>
        </div>
      </div>
    );
  }

  if (!currentDesignSet) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Design set not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-lg font-semibold text-gray-900">
              {currentDesignSet.name}
            </h1>
            <span className="text-sm text-gray-500">
              {currentDesignSet.canvases.length} formats
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Auto-save indicator */}
            <span className="text-xs text-green-600">All changes saved</span>

            {/* Action buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSave}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Save (Ctrl+S)"
              >
                <Save className="w-5 h-5" />
              </button>

              {/* AI Assistant Button */}
              <button
                onClick={toggleAssistant}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg relative ${
                  isAIAssistantOpen
                    ? 'bg-purple-100 text-purple-600 border border-purple-300'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="AI Assistant"
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden md:inline">AI Assistant</span>
                
                {/* Connection status indicator */}
                <div className={`w-2 h-2 rounded-full ${
                  isAIConnected ? 'bg-green-500' : 'bg-red-500'
                }`} title={isAIConnected ? 'AI Service Connected' : 'AI Service Disconnected'} />
                
                {/* Active jobs indicator */}
                {activeJobs.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                    {activeJobs.length}
                  </div>
                )}
              </button>

              <button
                onClick={() => setShowExportDialog(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>

              <button
                onClick={() => setShowTimeline(!showTimeline)}
                className={`p-2 rounded-lg ${
                  showTimeline
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title="Toggle Timeline"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-1">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
                    selectedTool === tool.id
                      ? 'bg-blue-100 text-blue-600 border border-blue-300'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  title={`${tool.name} (${tool.shortcut})`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tool.name}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2">
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          {/* Panel Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setLeftPanelTab('tools')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium ${
                leftPanelTab === 'tools'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              <Square className="w-4 h-4" />
              <span>Tools</span>
            </button>
            <button
              onClick={() => setLeftPanelTab('layers')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium ${
                leftPanelTab === 'layers'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Layers</span>
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto">
            {leftPanelTab === 'tools' && (
              <ToolPanel
                selectedTool={selectedTool}
                onToolSelect={setSelectedTool}
              />
            )}
            {leftPanelTab === 'layers' && (
              <LayersPanel />
            )}
          </div>
        </div>

        {/* Center - Canvas Area */}
        <div className="flex-1 flex flex-col">
          <MultiCanvasView className="flex-1" />
          
          {/* Timeline (collapsible) */}
          {showTimeline && (
            <div className="h-80 border-t border-gray-200">
              <TimelineEditor />
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          {/* Panel Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setRightPanelTab('properties')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium ${
                rightPanelTab === 'properties'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Properties</span>
            </button>
            <button
              onClick={() => setRightPanelTab('brand')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium ${
                rightPanelTab === 'brand'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                  : 'bg-gray-50 text-gray-600 hover:text-gray-900'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>Brand</span>
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto">
            {rightPanelTab === 'properties' && (
              <PropertiesPanel
                selectedObjectIds={selectedObjectIds}
              />
            )}
            {rightPanelTab === 'brand' && (
              <BrandKitPanel />
            )}
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          designSetId={designSetId}
        />
      )}

      {/* AI Assistant */}
      <AIAssistant
        isOpen={isAIAssistantOpen}
        onClose={closeAssistant}
        currentDesign={{
          elements: currentDesignSet?.canvases?.[0]?.objects || [],
          selectedIds: selectedObjectIds
        }}
        onApplyResult={handleApplyAIResult}
      />
    </div>
  );
};

// Placeholder components
const ToolPanel: React.FC<{
  selectedTool: string;
  onToolSelect: (tool: string) => void;
}> = ({ selectedTool, onToolSelect }) => {
  const tools = [
    { id: 'select', name: 'Select Tool', icon: MousePointer },
    { id: 'rectangle', name: 'Rectangle', icon: Square },
    { id: 'ellipse', name: 'Ellipse', icon: Circle },
    { id: 'text', name: 'Text', icon: Type },
    { id: 'image', name: 'Image', icon: Image },
  ];

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Tools</h3>
      <div className="space-y-1">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => onToolSelect(tool.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm ${
                selectedTool === tool.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tool.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const LayersPanel: React.FC = () => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Layers</h3>
      <div className="text-center py-8 text-gray-500">
        <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No layers yet</p>
        <p className="text-xs">Add objects to see layers</p>
      </div>
    </div>
  );
};

const PropertiesPanel: React.FC<{
  selectedObjectIds: string[];
}> = ({ selectedObjectIds }) => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Properties</h3>
      {selectedObjectIds.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No selection</p>
          <p className="text-xs">Select objects to edit properties</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Position
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600">X</label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Y</label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600">Width</label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Height</label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  placeholder="100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Appearance
            </label>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600">Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue="100"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Rotation</label>
                <input
                  type="number"
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorLayout;