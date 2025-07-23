import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Settings,
  Image,
  Film,
  FileText,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  Eye,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Package,
  Layers,
  Palette,
  Sliders,
  Info,
  Star,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';

interface ExportFormat {
  id: string;
  name: string;
  extension: string;
  description: string;
  icon: React.ReactNode;
  category: 'image' | 'vector' | 'video' | 'document' | 'web';
  features: {
    transparency: boolean;
    animation: boolean;
    layers: boolean;
    text_editable: boolean;
    scalable: boolean;
  };
  platforms: string[];
  max_size?: { width: number; height: number };
  quality_options: Array<{ id: string; name: string; description: string }>;
  use_cases: string[];
}

interface ExportPreset {
  id: string;
  name: string;
  description: string;
  platform: string;
  formats: string[];
  dimensions: Array<{ width: number; height: number; name: string }>;
  quality: string;
  optimization: {
    compress: boolean;
    progressive: boolean;
    strip_metadata: boolean;
  };
  icon: React.ReactNode;
}

interface ExportJob {
  id: string;
  name: string;
  format: string;
  dimensions: { width: number; height: number };
  quality: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  download_url?: string;
  error?: string;
  created_at: string;
  estimated_time?: number;
  file_size?: number;
}

interface AdvancedExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  designId: string;
  designName: string;
  currentDimensions: { width: number; height: number };
  onExport: (options: ExportOptions) => Promise<string>;
}

interface ExportOptions {
  format: string;
  quality: string;
  dimensions: { width: number; height: number };
  optimization: {
    compress: boolean;
    progressive: boolean;
    strip_metadata: boolean;
  };
  platforms: string[];
  batch_export: boolean;
  include_variants: boolean;
  watermark: boolean;
  color_profile: 'sRGB' | 'Adobe RGB' | 'P3';
  background_color?: string;
  padding?: { top: number; right: number; bottom: number; left: number };
}

const AdvancedExportDialog: React.FC<AdvancedExportDialogProps> = ({
  isOpen,
  onClose,
  designId,
  designName,
  currentDimensions,
  onExport
}) => {
  // State management
  const [selectedFormat, setSelectedFormat] = useState<string>('png');
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customDimensions, setCustomDimensions] = useState(currentDimensions);
  const [quality, setQuality] = useState<string>('high');
  const [optimization, setOptimization] = useState({
    compress: true,
    progressive: true,
    strip_metadata: false
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [batchExport, setBatchExport] = useState(false);
  const [includeVariants, setIncludeVariants] = useState(false);
  const [watermark, setWatermark] = useState(false);
  const [colorProfile, setColorProfile] = useState<'sRGB' | 'Adobe RGB' | 'P3'>('sRGB');
  const [backgroundColor, setBackgroundColor] = useState<string>('');
  const [padding, setPadding] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [activeTab, setActiveTab] = useState<'formats' | 'presets' | 'queue'>('formats');
  const [searchQuery, setSearchQuery] = useState('');

  // Refs
  const previewRef = useRef<HTMLDivElement>(null);

  // Export formats configuration
  const exportFormats: ExportFormat[] = [
    {
      id: 'png',
      name: 'PNG',
      extension: 'png',
      description: 'High-quality raster with transparency support',
      icon: <Image className="w-5 h-5" />,
      category: 'image',
      features: { transparency: true, animation: false, layers: false, text_editable: false, scalable: false },
      platforms: ['web', 'print', 'social', 'mobile'],
      quality_options: [
        { id: 'low', name: 'Low (8-bit)', description: 'Smaller file size' },
        { id: 'medium', name: 'Medium (16-bit)', description: 'Balanced quality' },
        { id: 'high', name: 'High (24-bit)', description: 'Best quality' }
      ],
      use_cases: ['Web graphics', 'Logos with transparency', 'Screenshots', 'High-quality prints']
    },
    {
      id: 'jpg',
      name: 'JPEG',
      extension: 'jpg',
      description: 'Compressed raster format for photographs',
      icon: <Image className="w-5 h-5" />,
      category: 'image',
      features: { transparency: false, animation: false, layers: false, text_editable: false, scalable: false },
      platforms: ['web', 'email', 'social', 'print'],
      quality_options: [
        { id: 'low', name: 'Low (60%)', description: 'High compression' },
        { id: 'medium', name: 'Medium (80%)', description: 'Good balance' },
        { id: 'high', name: 'High (95%)', description: 'Minimal compression' }
      ],
      use_cases: ['Social media posts', 'Email newsletters', 'Blog images', 'Photography']
    },
    {
      id: 'svg',
      name: 'SVG',
      extension: 'svg',
      description: 'Scalable vector graphics for web',
      icon: <Globe className="w-5 h-5" />,
      category: 'vector',
      features: { transparency: true, animation: true, layers: true, text_editable: true, scalable: true },
      platforms: ['web', 'email'],
      quality_options: [
        { id: 'optimized', name: 'Optimized', description: 'Minimal file size' },
        { id: 'standard', name: 'Standard', description: 'Good compatibility' },
        { id: 'detailed', name: 'Detailed', description: 'Preserve all details' }
      ],
      use_cases: ['Website icons', 'Logos', 'Illustrations', 'Interactive graphics']
    },
    {
      id: 'pdf',
      name: 'PDF',
      extension: 'pdf',
      description: 'Print-ready document format',
      icon: <FileText className="w-5 h-5" />,
      category: 'document',
      features: { transparency: true, animation: false, layers: true, text_editable: true, scalable: true },
      platforms: ['print', 'email', 'web'],
      quality_options: [
        { id: 'print', name: 'Print Quality', description: 'High resolution for printing' },
        { id: 'web', name: 'Web Quality', description: 'Optimized for digital viewing' },
        { id: 'archive', name: 'Archive Quality', description: 'Long-term preservation' }
      ],
      use_cases: ['Business cards', 'Flyers', 'Presentations', 'Reports']
    },
    {
      id: 'gif',
      name: 'GIF',
      extension: 'gif',
      description: 'Animated graphics for web',
      icon: <Film className="w-5 h-5" />,
      category: 'image',
      features: { transparency: true, animation: true, layers: false, text_editable: false, scalable: false },
      platforms: ['web', 'social', 'email'],
      quality_options: [
        { id: 'low', name: 'Low (16 colors)', description: 'Smallest file size' },
        { id: 'medium', name: 'Medium (64 colors)', description: 'Good balance' },
        { id: 'high', name: 'High (256 colors)', description: 'Best quality' }
      ],
      use_cases: ['Social media', 'Email signatures', 'Website animations', 'Memes']
    },
    {
      id: 'mp4',
      name: 'MP4 Video',
      extension: 'mp4',
      description: 'High-quality video format',
      icon: <Film className="w-5 h-5" />,
      category: 'video',
      features: { transparency: false, animation: true, layers: false, text_editable: false, scalable: false },
      platforms: ['social', 'web', 'mobile'],
      quality_options: [
        { id: '720p', name: '720p', description: 'HD quality' },
        { id: '1080p', name: '1080p', description: 'Full HD quality' },
        { id: '4k', name: '4K', description: 'Ultra HD quality' }
      ],
      use_cases: ['Social media videos', 'Presentations', 'Website backgrounds', 'Advertisements']
    }
  ];

  // Export presets configuration
  const exportPresets: ExportPreset[] = [
    {
      id: 'instagram_post',
      name: 'Instagram Post',
      description: 'Square format optimized for Instagram',
      platform: 'Instagram',
      formats: ['jpg', 'png'],
      dimensions: [{ width: 1080, height: 1080, name: 'Square' }],
      quality: 'high',
      optimization: { compress: true, progressive: true, strip_metadata: true },
      icon: <Smartphone className="w-5 h-5" />
    },
    {
      id: 'facebook_ad',
      name: 'Facebook Ad',
      description: 'Optimized for Facebook advertising',
      platform: 'Facebook',
      formats: ['jpg', 'png', 'mp4'],
      dimensions: [
        { width: 1200, height: 628, name: 'Link Ad' },
        { width: 1080, height: 1080, name: 'Square' },
        { width: 1080, height: 1920, name: 'Story' }
      ],
      quality: 'high',
      optimization: { compress: true, progressive: true, strip_metadata: true },
      icon: <Monitor className="w-5 h-5" />
    },
    {
      id: 'google_ads',
      name: 'Google Ads',
      description: 'Standard banner formats for Google Ads',
      platform: 'Google Ads',
      formats: ['jpg', 'png', 'gif'],
      dimensions: [
        { width: 728, height: 90, name: 'Leaderboard' },
        { width: 300, height: 250, name: 'Medium Rectangle' },
        { width: 160, height: 600, name: 'Wide Skyscraper' }
      ],
      quality: 'medium',
      optimization: { compress: true, progressive: false, strip_metadata: true },
      icon: <Globe className="w-5 h-5" />
    },
    {
      id: 'print_business_card',
      name: 'Business Card',
      description: 'Print-ready business card format',
      platform: 'Print',
      formats: ['pdf', 'png'],
      dimensions: [{ width: 1050, height: 600, name: '3.5" × 2"' }],
      quality: 'print',
      optimization: { compress: false, progressive: false, strip_metadata: false },
      icon: <FileText className="w-5 h-5" />
    },
    {
      id: 'email_signature',
      name: 'Email Signature',
      description: 'Optimized for email signatures',
      platform: 'Email',
      formats: ['png', 'jpg'],
      dimensions: [{ width: 600, height: 200, name: 'Standard' }],
      quality: 'medium',
      optimization: { compress: true, progressive: true, strip_metadata: true },
      icon: <FileText className="w-5 h-5" />
    }
  ];

  // Filter formats based on search
  const filteredFormats = exportFormats.filter(format =>
    format.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    format.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    format.use_cases.some(useCase => useCase.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get current format details
  const currentFormat = exportFormats.find(f => f.id === selectedFormat);

  // Handle export
  const handleExport = async () => {
    if (!currentFormat) return;

    const options: ExportOptions = {
      format: selectedFormat,
      quality,
      dimensions: customDimensions,
      optimization,
      platforms: selectedPlatforms,
      batch_export: batchExport,
      include_variants: includeVariants,
      watermark,
      color_profile: colorProfile,
      background_color: backgroundColor,
      padding
    };

    try {
      const jobId = await onExport(options);
      
      // Add to export queue
      const newJob: ExportJob = {
        id: jobId,
        name: `${designName}.${currentFormat.extension}`,
        format: selectedFormat,
        dimensions: customDimensions,
        quality,
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
        estimated_time: 30 // seconds
      };

      setExportJobs(prev => [newJob, ...prev]);
      setActiveTab('queue');

    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Handle preset selection
  const handlePresetSelect = (preset: ExportPreset) => {
    setSelectedPreset(preset.id);
    if (preset.formats.length > 0) {
      setSelectedFormat(preset.formats[0]);
    }
    if (preset.dimensions.length > 0) {
      setCustomDimensions(preset.dimensions[0]);
    }
    setQuality(preset.quality);
    setOptimization(preset.optimization);
  };

  // Calculate file size estimate
  const getFileSizeEstimate = () => {
    if (!currentFormat) return 'N/A';
    
    const pixelCount = customDimensions.width * customDimensions.height;
    let bytesPerPixel = 3; // Base estimate

    switch (selectedFormat) {
      case 'png':
        bytesPerPixel = 4; // RGBA
        break;
      case 'jpg':
        bytesPerPixel = quality === 'high' ? 3 : quality === 'medium' ? 2 : 1;
        break;
      case 'svg':
        return '< 100 KB'; // Vector format
      case 'pdf':
        return '< 1 MB'; // Document format
      case 'gif':
        bytesPerPixel = 1; // Indexed color
        break;
      case 'mp4':
        return '2-10 MB'; // Video format
    }

    const sizeBytes = pixelCount * bytesPerPixel;
    const sizeMB = sizeBytes / (1024 * 1024);

    if (sizeMB < 1) {
      return `${Math.round(sizeBytes / 1024)} KB`;
    } else {
      return `${sizeMB.toFixed(1)} MB`;
    }
  };

  // Format features component
  const FormatFeatures: React.FC<{ format: ExportFormat }> = ({ format }) => (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {Object.entries(format.features).map(([feature, supported]) => (
        <div key={feature} className={`flex items-center space-x-1 ${supported ? 'text-green-600' : 'text-gray-400'}`}>
          {supported ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
          <span className="capitalize">{feature.replace('_', ' ')}</span>
        </div>
      ))}
    </div>
  );

  // Preview component
  const ExportPreview: React.FC = () => (
    <div className="relative bg-gray-100 rounded-lg p-4 min-h-48 flex items-center justify-center">
      <div
        className="bg-white rounded border shadow-sm"
        style={{
          width: Math.min(200, customDimensions.width * previewScale),
          height: Math.min(200, customDimensions.height * previewScale),
          transform: `scale(${previewScale})`
        }}
      >
        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-blue-100 rounded flex items-center justify-center">
          <div className="text-center text-gray-600">
            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">Preview</p>
            <p className="text-xs">{customDimensions.width} × {customDimensions.height}</p>
          </div>
        </div>
      </div>
      
      {/* Preview controls */}
      <div className="absolute top-2 right-2 flex space-x-1">
        <button
          onClick={() => setPreviewScale(prev => Math.max(0.1, prev - 0.1))}
          className="p-1 bg-white rounded shadow text-gray-600 hover:text-gray-900"
          title="Zoom out"
        >
          <Zap className="w-3 h-3 rotate-180" />
        </button>
        <button
          onClick={() => setPreviewScale(prev => Math.min(2, prev + 0.1))}
          className="p-1 bg-white rounded shadow text-gray-600 hover:text-gray-900"
          title="Zoom in"
        >
          <Zap className="w-3 h-3" />
        </button>
        <button
          onClick={() => setPreviewScale(1)}
          className="p-1 bg-white rounded shadow text-gray-600 hover:text-gray-900"
          title="Reset zoom"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Left Panel - Configuration */}
        <div className="w-2/3 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Export Design</h2>
                <p className="text-gray-600">{designName}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex space-x-1">
              {[
                { id: 'formats', label: 'Formats', icon: Image },
                { id: 'presets', label: 'Presets', icon: Star },
                { id: 'queue', label: 'Export Queue', icon: Package, count: exportJobs.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors relative ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Formats Tab */}
            {activeTab === 'formats' && (
              <div className="space-y-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search formats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Format Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredFormats.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`p-4 border rounded-xl text-left transition-all ${
                        selectedFormat === format.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${
                          selectedFormat === format.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {format.icon}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">{format.name}</h3>
                            <span className="text-xs text-gray-500 uppercase">{format.extension}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{format.description}</p>
                          
                          <div className="mt-2">
                            <FormatFeatures format={format} />
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {format.platforms.slice(0, 3).map(platform => (
                              <span
                                key={platform}
                                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {platform}
                              </span>
                            ))}
                            {format.platforms.length > 3 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{format.platforms.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Format Settings */}
                {currentFormat && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Export Settings</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Quality */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Quality
                        </label>
                        <select
                          value={quality}
                          onChange={(e) => setQuality(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {currentFormat.quality_options.map(option => (
                            <option key={option.id} value={option.id}>
                              {option.name} - {option.description}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dimensions */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dimensions
                        </label>
                        <div className="flex space-x-2">
                          <input
                            type="number"
                            value={customDimensions.width}
                            onChange={(e) => setCustomDimensions(prev => ({ ...prev, width: parseInt(e.target.value) || 0 }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Width"
                          />
                          <span className="px-3 py-2 text-gray-500">×</span>
                          <input
                            type="number"
                            value={customDimensions.height}
                            onChange={(e) => setCustomDimensions(prev => ({ ...prev, height: parseInt(e.target.value) || 0 }))}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Height"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="mt-6">
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                      >
                        {showAdvanced ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className="text-sm font-medium">Advanced Settings</span>
                      </button>

                      {showAdvanced && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                          {/* Optimization */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Optimization</h4>
                            <div className="space-y-2">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={optimization.compress}
                                  onChange={(e) => setOptimization(prev => ({ ...prev, compress: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Compress file size</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={optimization.progressive}
                                  onChange={(e) => setOptimization(prev => ({ ...prev, progressive: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Progressive loading</span>
                              </label>
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={optimization.strip_metadata}
                                  onChange={(e) => setOptimization(prev => ({ ...prev, strip_metadata: e.target.checked }))}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Remove metadata</span>
                              </label>
                            </div>
                          </div>

                          {/* Color Profile */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Color Profile
                            </label>
                            <select
                              value={colorProfile}
                              onChange={(e) => setColorProfile(e.target.value as any)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="sRGB">sRGB (Web Standard)</option>
                              <option value="Adobe RGB">Adobe RGB (Print)</option>
                              <option value="P3">Display P3 (Wide Gamut)</option>
                            </select>
                          </div>

                          {/* Background Color */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Background Color (optional)
                            </label>
                            <input
                              type="color"
                              value={backgroundColor}
                              onChange={(e) => setBackgroundColor(e.target.value)}
                              className="w-full h-10 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Presets Tab */}
            {activeTab === 'presets' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exportPresets.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-4 border rounded-xl text-left transition-all ${
                        selectedPreset === preset.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${
                          selectedPreset === preset.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {preset.icon}
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{preset.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{preset.description}</p>
                          
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Platform: {preset.platform}</span>
                            <span>Formats: {preset.formats.join(', ').toUpperCase()}</span>
                          </div>
                          
                          <div className="mt-2">
                            {preset.dimensions.map((dim, index) => (
                              <span
                                key={index}
                                className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded mr-1 mb-1"
                              >
                                {dim.name}: {dim.width}×{dim.height}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Export Queue Tab */}
            {activeTab === 'queue' && (
              <div className="space-y-4">
                {exportJobs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No exports in queue</p>
                    <p className="text-xs">Your export jobs will appear here</p>
                  </div>
                ) : (
                  exportJobs.map((job) => (
                    <div key={job.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            {job.status === 'completed' ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : job.status === 'failed' ? (
                              <AlertTriangle className="w-5 h-5 text-red-500" />
                            ) : job.status === 'processing' ? (
                              <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          
                          <div>
                            <h3 className="font-medium text-gray-900">{job.name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                              <span>{job.format.toUpperCase()}</span>
                              <span>•</span>
                              <span>{job.dimensions.width}×{job.dimensions.height}</span>
                              <span>•</span>
                              <span>{job.quality}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {job.status === 'completed' && job.download_url && (
                            <button
                              onClick={() => window.open(job.download_url, '_blank')}
                              className="p-2 text-blue-600 hover:text-blue-700 rounded-lg"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setExportJobs(prev => prev.filter(j => j.id !== job.id))}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      {job.status === 'processing' && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{job.progress}% complete</span>
                            {job.estimated_time && (
                              <span>~{job.estimated_time}s remaining</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Error Message */}
                      {job.status === 'failed' && job.error && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                          {job.error}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {activeTab !== 'queue' && (
            <div className="border-t p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Estimated size: {getFileSizeEstimate()}</span>
                  {currentFormat && (
                    <span>Format: {currentFormat.name}</span>
                  )}
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={!currentFormat}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/3 border-l bg-gray-50 flex flex-col">
          <div className="p-6 border-b bg-white">
            <h3 className="text-lg font-medium text-gray-900">Preview</h3>
            <p className="text-sm text-gray-600">Real-time export preview</p>
          </div>

          <div className="flex-1 p-6">
            <ExportPreview />
          </div>

          {/* Export Info */}
          <div className="border-t bg-white p-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Format:</span>
                <span className="font-medium">{currentFormat?.name || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Dimensions:</span>
                <span className="font-medium">{customDimensions.width} × {customDimensions.height}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Quality:</span>
                <span className="font-medium capitalize">{quality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">File Size:</span>
                <span className="font-medium">{getFileSizeEstimate()}</span>
              </div>
              {currentFormat && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Transparency:</span>
                  <span className={`font-medium ${currentFormat.features.transparency ? 'text-green-600' : 'text-gray-400'}`}>
                    {currentFormat.features.transparency ? 'Supported' : 'Not supported'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedExportDialog;