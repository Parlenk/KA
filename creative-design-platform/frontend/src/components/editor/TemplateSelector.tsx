import React, { useState } from 'react';
import { fabric } from 'fabric';
import { 
  Layout, 
  Search, 
  Star, 
  Crown, 
  Filter,
  Grid,
  Download,
  Eye,
  Palette
} from 'lucide-react';
import { 
  PROFESSIONAL_TEMPLATES,
  PROFESSIONAL_CATEGORIES,
  PROFESSIONAL_AD_SIZES,
  ProfessionalTemplate,
  getTemplatesByCategory,
  getFeaturedTemplates,
  getPremiumTemplates
} from '../../data/professionalTemplates';

interface TemplateSelectorProps {
  canvas: fabric.Canvas | null;
  onTemplateSelect: (template: ProfessionalTemplate) => void;
  currentCanvasSize: { width: number; height: number };
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  canvas,
  onTemplateSelect,
  currentCanvasSize
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('featured');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Get templates based on selected category
  const getTemplatesByFilter = () => {
    let templates = PROFESSIONAL_TEMPLATES;

    switch (selectedCategory) {
      case 'featured':
        templates = getFeaturedTemplates();
        break;
      case 'premium':
        templates = getPremiumTemplates();
        break;
      case 'current-size':
        templates = PROFESSIONAL_TEMPLATES.filter(
          template => template.dimensions.width === currentCanvasSize.width &&
                     template.dimensions.height === currentCanvasSize.height
        );
        break;
      default:
        if (selectedCategory in PROFESSIONAL_CATEGORIES) {
          templates = getTemplatesByCategory(selectedCategory);
        }
        break;
    }

    // Apply search filter
    if (searchTerm) {
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        template.subcategory.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply size filter
    if (selectedSizeFilter !== 'all') {
      const [width, height] = selectedSizeFilter.split('x').map(Number);
      templates = templates.filter(template =>
        template.dimensions.width === width && template.dimensions.height === height
      );
    }

    return templates;
  };

  const filteredTemplates = getTemplatesByFilter();

  // Get unique sizes for filter
  const availableSizes = Array.from(
    new Set(
      PROFESSIONAL_TEMPLATES.map(template => 
        `${template.dimensions.width}x${template.dimensions.height}`
      )
    )
  ).sort();

  // Load template into canvas
  const loadTemplate = (template: ProfessionalTemplate) => {
    if (!canvas) return;

    try {
      // Clear current canvas
      canvas.clear();
      
      // Set canvas size to template dimensions
      canvas.setDimensions({
        width: template.dimensions.width,
        height: template.dimensions.height
      });

      // Load template design data
      if (template.designData) {
        canvas.loadFromJSON(template.designData, () => {
          canvas.renderAll();
          console.log('Template loaded successfully:', template.name);
        });
      } else {
        // Create a simple template if no design data
        const background = new fabric.Rect({
          left: 0,
          top: 0,
          width: template.dimensions.width,
          height: template.dimensions.height,
          fill: template.colors[0] || '#ffffff',
          selectable: false
        });

        const title = new fabric.Text(template.name, {
          left: template.dimensions.width / 2,
          top: template.dimensions.height / 2,
          fontSize: Math.min(template.dimensions.width, template.dimensions.height) / 10,
          fill: template.colors[1] || '#000000',
          fontFamily: template.fonts[0] || 'Inter',
          textAlign: 'center',
          originX: 'center',
          originY: 'center'
        });

        canvas.add(background, title);
        canvas.renderAll();
      }

      onTemplateSelect(template);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Layout className="w-5 h-5" />
            Templates
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory('featured')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedCategory === 'featured'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Star className="w-3 h-3 inline mr-1" />
            Featured
          </button>
          <button
            onClick={() => setSelectedCategory('premium')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedCategory === 'premium'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Crown className="w-3 h-3 inline mr-1" />
            Premium
          </button>
          <button
            onClick={() => setSelectedCategory('current-size')}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              selectedCategory === 'current-size'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Current Size
          </button>
          {Object.entries(PROFESSIONAL_CATEGORIES).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>

        {/* Size Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Size
          </label>
          <select
            value={selectedSizeFilter}
            onChange={(e) => setSelectedSizeFilter(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">All Sizes</option>
            {availableSizes.map(size => (
              <option key={size} value={size}>
                {size.replace('x', ' × ')}px
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Template Grid/List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Layout className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No templates found matching your criteria</p>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-2 gap-4' 
              : 'space-y-3'
          }>
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`border rounded-lg overflow-hidden hover:border-blue-300 cursor-pointer transition-all hover:shadow-md group ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
                onClick={() => loadTemplate(template)}
              >
                {/* Template Preview */}
                <div className={`bg-gray-100 relative ${
                  viewMode === 'grid' ? 'aspect-video' : 'w-24 h-16 flex-shrink-0'
                }`}>
                  <div 
                    className="absolute inset-0 bg-gradient-to-br opacity-80"
                    style={{ 
                      background: `linear-gradient(135deg, ${template.colors[0] || '#f3f4f6'}, ${template.colors[1] || '#e5e7eb'})` 
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white font-medium text-xs opacity-90">
                      {template.dimensions.width} × {template.dimensions.height}
                    </div>
                  </div>
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="flex gap-2">
                      <button className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Premium Badge */}
                  {template.isPremium && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      PRO
                    </div>
                  )}

                  {/* Difficulty Badge */}
                  <div className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-full font-medium ${
                    template.difficulty === 'beginner' 
                      ? 'bg-green-100 text-green-800'
                      : template.difficulty === 'intermediate'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {template.difficulty}
                  </div>
                </div>

                {/* Template Info */}
                <div className={`p-3 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 text-sm group-hover:text-blue-600">
                      {template.name}
                    </h4>
                    {template.isPremium && (
                      <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">
                      {template.subcategory}
                    </span>
                    <div className="flex items-center gap-1">
                      <Palette className="w-3 h-3 text-gray-400" />
                      <div className="flex gap-1">
                        {template.colors.slice(0, 3).map((color, index) => (
                          <div
                            key={index}
                            className="w-3 h-3 rounded-full border border-gray-200"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {template.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {template.elements.textLayers + template.elements.graphics + template.elements.images} elements
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSelector;