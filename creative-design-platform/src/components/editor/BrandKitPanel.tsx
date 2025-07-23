import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import {
  setActiveBrandKit,
  addColor,
  updateColor,
  deleteColor,
  addFont,
  deleteFont,
  addLogo,
  deleteLogo,
  createBrandKit,
  generatePaletteFromImage,
} from '../../store/slices/brandKitSlice';
import { BrandColor, BrandFont, BrandLogo } from '../../types/design';
import {
  Palette,
  Type,
  Image,
  Plus,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  Copy,
  Download,
  Sparkles,
} from 'lucide-react';

interface BrandKitPanelProps {
  className?: string;
}

const BrandKitPanel: React.FC<BrandKitPanelProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const { activeBrandKit, brandKits, loading } = useSelector(
    (state: RootState) => state.brandKit
  );
  
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts' | 'logos'>('colors');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontUpload, setShowFontUpload] = useState(false);
  const [showLogoUpload, setShowLogoUpload] = useState(false);
  const [newColor, setNewColor] = useState('#000000');
  const [colorName, setColorName] = useState('');

  const tabs = [
    { id: 'colors' as const, label: 'Colors', icon: Palette, count: activeBrandKit?.colors.length || 0 },
    { id: 'fonts' as const, label: 'Fonts', icon: Type, count: activeBrandKit?.fonts.length || 0 },
    { id: 'logos' as const, label: 'Logos', icon: Image, count: activeBrandKit?.logos.length || 0 },
  ];

  const handleColorAdd = () => {
    if (!activeBrandKit || !colorName.trim()) return;
    
    const color: Omit<BrandColor, 'id'> = {
      name: colorName,
      hex: newColor,
      rgb: hexToRgb(newColor),
      hsl: hexToHsl(newColor),
      usage: 0,
    };
    
    dispatch(addColor({ brandKitId: activeBrandKit.id, color }));
    setColorName('');
    setNewColor('#000000');
    setShowColorPicker(false);
  };

  const handleGeneratePalette = (imageUrl: string) => {
    if (!activeBrandKit) return;
    
    dispatch(generatePaletteFromImage({
      brandKitId: activeBrandKit.id,
      imageUrl,
    }));
  };

  return (
    <div className={`bg-white border-l border-gray-200 w-80 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Brand Kit</h3>
          <BrandKitSelector />
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!activeBrandKit ? (
          <EmptyState />
        ) : (
          <>
            {activeTab === 'colors' && (
              <ColorsTab
                colors={activeBrandKit.colors}
                onAddColor={() => setShowColorPicker(true)}
                onUpdateColor={(colorId, updates) => 
                  dispatch(updateColor({ brandKitId: activeBrandKit.id, colorId, updates }))
                }
                onDeleteColor={(colorId) => 
                  dispatch(deleteColor({ brandKitId: activeBrandKit.id, colorId }))
                }
                onGeneratePalette={handleGeneratePalette}
              />
            )}
            
            {activeTab === 'fonts' && (
              <FontsTab
                fonts={activeBrandKit.fonts}
                onAddFont={() => setShowFontUpload(true)}
                onDeleteFont={(fontId) => 
                  dispatch(deleteFont({ brandKitId: activeBrandKit.id, fontId }))
                }
              />
            )}
            
            {activeTab === 'logos' && (
              <LogosTab
                logos={activeBrandKit.logos}
                onAddLogo={() => setShowLogoUpload(true)}
                onDeleteLogo={(logoId) => 
                  dispatch(deleteLogo({ brandKitId: activeBrandKit.id, logoId }))
                }
              />
            )}
          </>
        )}
      </div>

      {/* Color Picker Modal */}
      {showColorPicker && (
        <ColorPickerModal
          color={newColor}
          name={colorName}
          onColorChange={setNewColor}
          onNameChange={setColorName}
          onSave={handleColorAdd}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {/* Font Upload Modal */}
      {showFontUpload && (
        <FontUploadModal
          onUpload={(font) => {
            if (activeBrandKit) {
              dispatch(addFont({ brandKitId: activeBrandKit.id, font }));
            }
            setShowFontUpload(false);
          }}
          onClose={() => setShowFontUpload(false)}
        />
      )}

      {/* Logo Upload Modal */}
      {showLogoUpload && (
        <LogoUploadModal
          onUpload={(logo) => {
            if (activeBrandKit) {
              dispatch(addLogo({ brandKitId: activeBrandKit.id, logo }));
            }
            setShowLogoUpload(false);
          }}
          onClose={() => setShowLogoUpload(false)}
        />
      )}
    </div>
  );
};

// Brand Kit Selector Component
const BrandKitSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { activeBrandKit, brandKits } = useSelector((state: RootState) => state.brandKit);
  const [showCreate, setShowCreate] = useState(false);
  const [newKitName, setNewKitName] = useState('');

  const handleCreateBrandKit = () => {
    if (newKitName.trim()) {
      dispatch(createBrandKit({ name: newKitName }));
      setNewKitName('');
      setShowCreate(false);
    }
  };

  return (
    <div className="relative">
      <select
        value={activeBrandKit?.id || ''}
        onChange={(e) => {
          if (e.target.value === 'new') {
            setShowCreate(true);
          } else {
            const kit = brandKits.find(k => k.id === e.target.value);
            if (kit) dispatch(setActiveBrandKit(kit));
          }
        }}
        className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-1 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select Brand Kit</option>
        {brandKits.map((kit) => (
          <option key={kit.id} value={kit.id}>
            {kit.name}
          </option>
        ))}
        <option value="new">+ Create New</option>
      </select>

      {showCreate && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-64 z-50">
          <h4 className="font-medium text-gray-900 mb-2">Create Brand Kit</h4>
          <input
            type="text"
            placeholder="Brand Kit Name"
            value={newKitName}
            onChange={(e) => setNewKitName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            autoFocus
          />
          <div className="flex space-x-2 mt-3">
            <button
              onClick={handleCreateBrandKit}
              className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Colors Tab Component
interface ColorsTabProps {
  colors: BrandColor[];
  onAddColor: () => void;
  onUpdateColor: (colorId: string, updates: Partial<BrandColor>) => void;
  onDeleteColor: (colorId: string) => void;
  onGeneratePalette: (imageUrl: string) => void;
}

const ColorsTab: React.FC<ColorsTabProps> = ({
  colors,
  onAddColor,
  onUpdateColor,
  onDeleteColor,
  onGeneratePalette,
}) => {
  return (
    <div className="p-4 space-y-4">
      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={onAddColor}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Color</span>
        </button>
        
        <button
          onClick={() => {
            // Trigger file upload for palette generation
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                onGeneratePalette(url);
              }
            };
            input.click();
          }}
          className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
        >
          <Sparkles className="w-4 h-4" />
        </button>
      </div>

      {/* Colors Grid */}
      <div className="space-y-2">
        {colors.map((color) => (
          <ColorCard
            key={color.id}
            color={color}
            onUpdate={(updates) => onUpdateColor(color.id, updates)}
            onDelete={() => onDeleteColor(color.id)}
          />
        ))}
        
        {colors.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Palette className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No colors added yet</p>
            <p className="text-sm">Add colors to build your brand palette</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Color Card Component
interface ColorCardProps {
  color: BrandColor;
  onUpdate: (updates: Partial<BrandColor>) => void;
  onDelete: () => void;
}

const ColorCard: React.FC<ColorCardProps> = ({ color, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(color.name);

  const handleSave = () => {
    onUpdate({ name: editName });
    setIsEditing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300">
      {/* Color Swatch */}
      <div
        className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
        style={{ backgroundColor: color.hex }}
        onClick={() => copyToClipboard(color.hex)}
        title="Click to copy hex"
      />

      {/* Color Info */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-left w-full"
          >
            <p className="font-medium text-gray-900 text-sm truncate">{color.name}</p>
          </button>
        )}
        
        <div className="flex items-center space-x-2 mt-1">
          <button
            onClick={() => copyToClipboard(color.hex)}
            className="text-xs text-gray-500 hover:text-gray-700 font-mono"
          >
            {color.hex}
          </button>
          
          {color.usage > 0 && (
            <span className="text-xs text-blue-600">
              Used {color.usage}x
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1">
        <button
          onClick={() => copyToClipboard(color.hex)}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Copy hex"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-400 hover:text-red-600"
          title="Delete color"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// Fonts Tab Component
interface FontsTabProps {
  fonts: BrandFont[];
  onAddFont: () => void;
  onDeleteFont: (fontId: string) => void;
}

const FontsTab: React.FC<FontsTabProps> = ({ fonts, onAddFont, onDeleteFont }) => {
  return (
    <div className="p-4 space-y-4">
      {/* Add Font Button */}
      <button
        onClick={onAddFont}
        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Add Font</span>
      </button>

      {/* Fonts List */}
      <div className="space-y-2">
        {fonts.map((font) => (
          <div
            key={font.id}
            className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-gray-300"
          >
            <div className="flex-1">
              <p
                className="font-medium text-gray-900"
                style={{ fontFamily: font.family }}
              >
                {font.family}
              </p>
              <p className="text-sm text-gray-500">
                {font.variants.join(', ')} • {font.type}
              </p>
              {font.usage > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  Used {font.usage}x
                </p>
              )}
            </div>
            
            <button
              onClick={() => onDeleteFont(font.id)}
              className="p-1 text-gray-400 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        {fonts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Type className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No fonts added yet</p>
            <p className="text-sm">Upload custom fonts or add system fonts</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Logos Tab Component
interface LogosTabProps {
  logos: BrandLogo[];
  onAddLogo: () => void;
  onDeleteLogo: (logoId: string) => void;
}

const LogosTab: React.FC<LogosTabProps> = ({ logos, onAddLogo, onDeleteLogo }) => {
  return (
    <div className="p-4 space-y-4">
      {/* Add Logo Button */}
      <button
        onClick={onAddLogo}
        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
      >
        <Plus className="w-4 h-4" />
        <span>Add Logo</span>
      </button>

      {/* Logos Grid */}
      <div className="grid grid-cols-2 gap-3">
        {logos.map((logo) => (
          <div
            key={logo.id}
            className="relative border border-gray-200 rounded-lg p-3 hover:border-gray-300"
          >
            <button
              onClick={() => onDeleteLogo(logo.id)}
              className="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-600 bg-white rounded-full shadow-sm"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            
            <div className="aspect-square mb-2 bg-gray-50 rounded flex items-center justify-center">
              <img
                src={logo.url}
                alt={logo.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            
            <p className="text-sm font-medium text-gray-900 truncate">{logo.name}</p>
            <p className="text-xs text-gray-500 capitalize">{logo.type}</p>
            <p className="text-xs text-gray-400">
              {logo.dimensions.width} × {logo.dimensions.height}
            </p>
          </div>
        ))}
        
        {logos.length === 0 && (
          <div className="col-span-2 text-center py-8 text-gray-500">
            <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No logos added yet</p>
            <p className="text-sm">Upload your brand logos and assets</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState: React.FC = () => {
  const dispatch = useDispatch();
  
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
      <Palette className="w-12 h-12 mb-4 opacity-50" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Brand Kit Selected</h3>
      <p className="text-sm mb-4">
        Create or select a brand kit to manage your colors, fonts, and logos
      </p>
      <button
        onClick={() => dispatch(createBrandKit({ name: 'My Brand Kit' }))}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
      >
        Create Brand Kit
      </button>
    </div>
  );
};

// Modal Components
const ColorPickerModal: React.FC<{
  color: string;
  name: string;
  onColorChange: (color: string) => void;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
}> = ({ color, name, onColorChange, onNameChange, onSave, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80">
        <h3 className="text-lg font-semibold mb-4">Add Color</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Primary Blue"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-12 h-10 border border-gray-300 rounded"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => onColorChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
              />
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2 mt-6">
          <button
            onClick={onSave}
            disabled={!name.trim()}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            Add Color
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const FontUploadModal: React.FC<{
  onUpload: (font: Omit<BrandFont, 'id'>) => void;
  onClose: () => void;
}> = ({ onUpload, onClose }) => {
  const [fontData, setFontData] = useState({
    family: '',
    type: 'custom' as const,
    variants: ['normal'],
    url: '',
  });

  const handleSubmit = () => {
    if (fontData.family.trim()) {
      onUpload({
        ...fontData,
        usage: 0,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Add Font</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Font Family
            </label>
            <input
              type="text"
              value={fontData.family}
              onChange={(e) => setFontData(prev => ({ ...prev, family: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Roboto"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={fontData.type}
              onChange={(e) => setFontData(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="system">System Font</option>
              <option value="google">Google Font</option>
              <option value="custom">Custom Upload</option>
            </select>
          </div>
          
          {fontData.type === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Font File (coming soon)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500">
                <Upload className="w-6 h-6 mx-auto mb-2" />
                <p className="text-sm">Upload font file</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 mt-6">
          <button
            onClick={handleSubmit}
            disabled={!fontData.family.trim()}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            Add Font
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const LogoUploadModal: React.FC<{
  onUpload: (logo: Omit<BrandLogo, 'id'>) => void;
  onClose: () => void;
}> = ({ onUpload, onClose }) => {
  const [logoData, setLogoData] = useState({
    name: '',
    type: 'primary' as const,
    url: '',
    formats: ['png'],
    dimensions: { width: 0, height: 0 },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoData(prev => ({ 
        ...prev, 
        url,
        name: prev.name || file.name.split('.')[0],
      }));
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setLogoData(prev => ({
          ...prev,
          dimensions: { width: img.width, height: img.height },
        }));
      };
      img.src = url;
    }
  };

  const handleSubmit = () => {
    if (logoData.name.trim() && logoData.url) {
      onUpload(logoData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Add Logo</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo Name
            </label>
            <input
              type="text"
              value={logoData.name}
              onChange={(e) => setLogoData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="e.g., Primary Logo"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={logoData.type}
              onChange={(e) => setLogoData(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="primary">Primary Logo</option>
              <option value="secondary">Secondary Logo</option>
              <option value="icon">Icon</option>
              <option value="wordmark">Wordmark</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload File
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          {logoData.url && (
            <div className="border border-gray-200 rounded-lg p-3">
              <div className="aspect-video bg-gray-50 rounded flex items-center justify-center mb-2">
                <img
                  src={logoData.url}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <p className="text-sm text-gray-600">
                {logoData.dimensions.width} × {logoData.dimensions.height}px
              </p>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2 mt-6">
          <button
            onClick={handleSubmit}
            disabled={!logoData.name.trim() || !logoData.url}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
          >
            Add Logo
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Utility functions
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

export default BrandKitPanel;