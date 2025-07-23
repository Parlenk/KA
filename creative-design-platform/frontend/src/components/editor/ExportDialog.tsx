import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import {
  startExport,
  cancelExport,
  clearCompletedExports,
  setExportSettings,
} from '../../store/slices/exportSlice';
import { ExportSettings, ExportJob } from '../../types/design';
import {
  Download,
  Settings,
  Play,
  Image,
  FileVideo,
  FileText,
  Loader,
  CheckCircle,
  XCircle,
  X,
  Zap,
  Film,
} from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  designSetId: string;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, designSetId }) => {
  const dispatch = useDispatch();
  const { currentDesignSet } = useSelector((state: RootState) => state.design);
  const { 
    activeJobs, 
    completedJobs, 
    exportSettings, 
    loading 
  } = useSelector((state: RootState) => state.export);
  
  const [selectedFormat, setSelectedFormat] = useState<ExportSettings['format']>('png');
  const [selectedCanvases, setSelectedCanvases] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localSettings, setLocalSettings] = useState<ExportSettings>({
    format: 'png',
    quality: 90,
    transparent: false,
    platformOptimized: true,
  });

  useEffect(() => {
    if (currentDesignSet && selectedCanvases.length === 0) {
      setSelectedCanvases(currentDesignSet.canvases.map(c => c.id));
    }
  }, [currentDesignSet]);

  const formats = [
    {
      id: 'png' as const,
      name: 'PNG',
      icon: Image,
      description: 'High quality with transparency support',
      category: 'image',
      features: ['transparency', 'high-quality'],
    },
    {
      id: 'jpg' as const,
      name: 'JPG',
      icon: Image,
      description: 'Compressed format for smaller file sizes',
      category: 'image',
      features: ['small-size', 'web-optimized'],
    },
    {
      id: 'svg' as const,
      name: 'SVG',
      icon: FileText,
      description: 'Vector format, infinitely scalable',
      category: 'vector',
      features: ['scalable', 'small-size'],
    },
    {
      id: 'html5' as const,
      name: 'HTML5',
      icon: Play,
      description: 'Interactive animated banner',
      category: 'interactive',
      features: ['animations', 'interactive', 'web-ready'],
    },
    {
      id: 'mp4' as const,
      name: 'MP4 Video',
      icon: FileVideo,
      description: 'Video format with animations',
      category: 'video',
      features: ['animations', 'video'],
    },
    {
      id: 'gif' as const,
      name: 'GIF',
      icon: Film,
      description: 'Animated image format',
      category: 'animated',
      features: ['animations', 'web-compatible'],
    },
  ];

  const handleExport = () => {
    if (!currentDesignSet || selectedCanvases.length === 0) return;

    const settings: ExportSettings = {
      ...localSettings,
      format: selectedFormat,
    };

    dispatch(startExport({
      designSetId: currentDesignSet.id,
      canvasIds: selectedCanvases,
      settings,
    }));
  };

  const handleCanvasToggle = (canvasId: string) => {
    setSelectedCanvases(prev =>
      prev.includes(canvasId)
        ? prev.filter(id => id !== canvasId)
        : [...prev, canvasId]
    );
  };

  const getFormatIcon = (format: string) => {
    const formatData = formats.find(f => f.id === format);
    const Icon = formatData?.icon || Image;
    return <Icon className="w-4 h-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Export Designs</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Export Configuration */}
          <div className="w-2/3 p-6 overflow-y-auto">
            {/* Format Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Choose Format</h3>
              <div className="grid grid-cols-2 gap-3">
                {formats.map((format) => {
                  const Icon = format.icon;
                  return (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        selectedFormat === format.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <Icon className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-gray-900">{format.name}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{format.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {format.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canvas Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Select Sizes</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedCanvases(currentDesignSet?.canvases.map(c => c.id) || [])}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedCanvases([])}
                    className="text-sm text-gray-600 hover:text-gray-800"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto">
                {currentDesignSet?.canvases.map((canvas) => (
                  <label
                    key={canvas.id}
                    className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCanvases.includes(canvas.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCanvases.includes(canvas.id)}
                      onChange={() => handleCanvasToggle(canvas.id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {canvas.width}×{canvas.height}
                      </p>
                      <p className="text-xs text-gray-500">
                        {canvas.metadata?.platform || 'Custom'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Export Settings */}
            <div className="mb-6">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center space-x-2 text-lg font-medium text-gray-900 mb-4"
              >
                <Settings className="w-5 h-5" />
                <span>Export Settings</span>
                <span className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {showAdvanced && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <ExportSettingsPanel
                    format={selectedFormat}
                    settings={localSettings}
                    onSettingsChange={setLocalSettings}
                  />
                </div>
              )}
            </div>

            {/* Export Button */}
            <div className="flex space-x-3">
              <button
                onClick={handleExport}
                disabled={selectedCanvases.length === 0 || loading}
                className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                <span>
                  {loading ? 'Exporting...' : `Export ${selectedCanvases.length} Size${selectedCanvases.length !== 1 ? 's' : ''}`}
                </span>
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Right Panel - Export Queue */}
          <div className="w-1/3 border-l border-gray-200 bg-gray-50">
            <ExportQueue
              activeJobs={activeJobs}
              completedJobs={completedJobs}
              onCancelJob={(jobId) => dispatch(cancelExport(jobId))}
              onClearCompleted={() => dispatch(clearCompletedExports())}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Export Settings Panel Component
interface ExportSettingsPanelProps {
  format: ExportSettings['format'];
  settings: ExportSettings;
  onSettingsChange: (settings: ExportSettings) => void;
}

const ExportSettingsPanel: React.FC<ExportSettingsPanelProps> = ({
  format,
  settings,
  onSettingsChange,
}) => {
  const updateSetting = (key: keyof ExportSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Quality (for image formats) */}
      {['jpg', 'png'].includes(format) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quality: {settings.quality}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={settings.quality}
            onChange={(e) => updateSetting('quality', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* Transparency (for PNG) */}
      {format === 'png' && (
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.transparent}
            onChange={(e) => updateSetting('transparent', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Preserve transparency</span>
        </label>
      )}

      {/* Frame Rate (for video formats) */}
      {['mp4', 'gif'].includes(format) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frame Rate
          </label>
          <select
            value={settings.frameRate || 30}
            onChange={(e) => updateSetting('frameRate', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value={24}>24 FPS</option>
            <option value={30}>30 FPS</option>
            <option value={60}>60 FPS</option>
          </select>
        </div>
      )}

      {/* Duration (for video formats) */}
      {['mp4', 'gif'].includes(format) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (seconds)
          </label>
          <input
            type="number"
            min="1"
            max="180"
            value={(settings.duration || 5000) / 1000}
            onChange={(e) => updateSetting('duration', parseFloat(e.target.value) * 1000)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      {/* Platform Optimization */}
      <label className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={settings.platformOptimized}
          onChange={(e) => updateSetting('platformOptimized', e.target.checked)}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
        />
        <span className="text-sm text-gray-700">Optimize for target platforms</span>
      </label>

      {/* Custom Dimensions */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Width (optional)
          </label>
          <input
            type="number"
            placeholder="Auto"
            value={settings.dimensions?.width || ''}
            onChange={(e) => updateSetting('dimensions', {
              ...settings.dimensions,
              width: e.target.value ? parseInt(e.target.value) : undefined,
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Height (optional)
          </label>
          <input
            type="number"
            placeholder="Auto"
            value={settings.dimensions?.height || ''}
            onChange={(e) => updateSetting('dimensions', {
              ...settings.dimensions,
              height: e.target.value ? parseInt(e.target.value) : undefined,
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
    </div>
  );
};

// Export Queue Component
interface ExportQueueProps {
  activeJobs: ExportJob[];
  completedJobs: ExportJob[];
  onCancelJob: (jobId: string) => void;
  onClearCompleted: () => void;
}

const ExportQueue: React.FC<ExportQueueProps> = ({
  activeJobs,
  completedJobs,
  onCancelJob,
  onClearCompleted,
}) => {
  const allJobs = [...activeJobs, ...completedJobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-900">Export Queue</h3>
          {completedJobs.length > 0 && (
            <button
              onClick={onClearCompleted}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear Completed
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {activeJobs.length} active • {completedJobs.length} completed
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {allJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Download className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No exports yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {allJobs.map((job) => (
              <ExportJobCard
                key={job.id}
                job={job}
                onCancel={() => onCancelJob(job.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Export Job Card Component
interface ExportJobCardProps {
  job: ExportJob;
  onCancel: () => void;
}

const ExportJobCard: React.FC<ExportJobCardProps> = ({ job, onCancel }) => {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
      case 'processing':
        return <Loader className="w-4 h-4 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-900">
            {job.settings.format.toUpperCase()}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {job.status}
          </span>
        </div>
        
        {job.status === 'processing' && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {job.status === 'processing' && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{job.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full transition-all"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600">
        {job.canvasIds.length} size{job.canvasIds.length !== 1 ? 's' : ''}
      </p>

      {job.status === 'completed' && job.downloadUrls && (
        <div className="mt-2 space-y-1">
          {job.downloadUrls.map((url, index) => (
            <a
              key={index}
              href={url}
              download
              className="block text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Download {index + 1}
            </a>
          ))}
        </div>
      )}

      {job.status === 'failed' && job.error && (
        <p className="text-xs text-red-600 mt-2">{job.error}</p>
      )}

      <p className="text-xs text-gray-500 mt-2">
        {new Date(job.createdAt).toLocaleTimeString()}
      </p>
    </div>
  );
};

export default ExportDialog;