import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Grid,
  List,
  Star,
  Download,
  Eye,
  Clock,
  TrendingUp,
  Tag,
  Zap,
  Heart,
  Copy,
  Sparkles,
  ChevronDown,
  X,
  SortAsc,
  SortDesc,
  Shuffle,
  Brain
} from 'lucide-react';
import { aiService } from '../../services/aiService';

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  preview_url: string;
  category: string;
  subcategory: string;
  tags: string[];
  ai_tags: string[];
  dimensions: {
    width: number;
    height: number;
  };
  format: string;
  usage_count: number;
  rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
  is_premium: boolean;
  is_trending: boolean;
  is_new: boolean;
  creator: {
    id: string;
    name: string;
    avatar?: string;
  };
  design_data: any;
  ai_metadata: {
    style: string;
    color_palette: string[];
    complexity_score: number;
    conversion_prediction: number;
    target_audience: string[];
    industry: string[];
    mood: string[];
    visual_weight: number;
    readability_score: number;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  subcategories: string[];
  template_count: number;
  trending: boolean;
}

interface AIRecommendation {
  template_id: string;
  reason: string;
  confidence: number;
  match_factors: string[];
}

interface TemplateMarketplaceProps {
  onTemplateSelect: (template: Template) => void;
  currentDesign?: any;
  userPreferences?: any;
}

const TemplateMarketplace: React.FC<TemplateMarketplaceProps> = ({
  onTemplateSelect,
  currentDesign,
  userPreferences
}) => {
  // State management
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'trending' | 'popular' | 'newest' | 'rating'>('trending');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [aiRecommendations, setAIRecommendations] = useState<AIRecommendation[]>([]);
  const [showAIRecommendations, setShowAIRecommendations] = useState(true);

  // Filter states
  const [filters, setFilters] = useState({
    format: [] as string[],
    isPremium: null as boolean | null,
    rating: 0,
    tags: [] as string[],
    style: [] as string[],
    industry: [] as string[],
    complexity: [0, 10] as [number, number]
  });

  // Sample data - in real implementation, this would come from API
  const sampleCategories: Category[] = [
    {
      id: 'social',
      name: 'Social Media',
      description: 'Instagram, Facebook, Twitter, LinkedIn posts',
      icon: <Heart className="w-5 h-5" />,
      subcategories: ['Instagram Post', 'Instagram Story', 'Facebook Post', 'Twitter Header', 'LinkedIn Post'],
      template_count: 1250,
      trending: true
    },
    {
      id: 'advertising',
      name: 'Digital Ads',
      description: 'Google Ads, Facebook Ads, Display Banners',
      icon: <TrendingUp className="w-5 h-5" />,
      subcategories: ['Google Ads', 'Facebook Ads', 'Display Banners', 'Video Ads', 'Native Ads'],
      template_count: 890,
      trending: true
    },
    {
      id: 'print',
      name: 'Print Materials',
      description: 'Flyers, brochures, business cards, posters',
      icon: <Copy className="w-5 h-5" />,
      subcategories: ['Flyers', 'Brochures', 'Business Cards', 'Posters', 'Letterheads'],
      template_count: 670,
      trending: false
    },
    {
      id: 'presentation',
      name: 'Presentations',
      description: 'Slide decks, pitch decks, reports',
      icon: <Grid className="w-5 h-5" />,
      subcategories: ['Pitch Decks', 'Reports', 'Infographics', 'Slide Templates', 'Charts'],
      template_count: 445,
      trending: false
    },
    {
      id: 'branding',
      name: 'Brand Identity',
      description: 'Logos, brand kits, style guides',
      icon: <Tag className="w-5 h-5" />,
      subcategories: ['Logos', 'Brand Kits', 'Style Guides', 'Color Palettes', 'Typography'],
      template_count: 320,
      trending: false
    }
  ];

  // Generate sample templates
  const generateSampleTemplates = useCallback(() => {
    const templates: Template[] = [];
    const formats = ['Instagram Post', 'Facebook Ad', 'Google Ad', 'Flyer', 'Business Card'];
    const styles = ['modern', 'minimalist', 'vintage', 'bold', 'elegant', 'playful'];
    const industries = ['technology', 'healthcare', 'finance', 'retail', 'education', 'food'];
    
    for (let i = 1; i <= 100; i++) {
      const format = formats[Math.floor(Math.random() * formats.length)];
      const category = sampleCategories[Math.floor(Math.random() * sampleCategories.length)];
      const style = styles[Math.floor(Math.random() * styles.length)];
      const industry = industries[Math.floor(Math.random() * industries.length)];
      
      templates.push({
        id: `template_${i}`,
        name: `${style} ${format} Template #${i}`,
        description: `Professional ${style} template perfect for ${industry} businesses`,
        thumbnail: `https://picsum.photos/400/600?random=${i}`,
        preview_url: `https://picsum.photos/800/1200?random=${i}`,
        category: category.id,
        subcategory: format,
        tags: [style, industry, format.toLowerCase().replace(' ', '-')],
        ai_tags: [`ai-${style}`, `ai-${industry}`, 'ai-optimized'],
        dimensions: { width: 1080, height: 1080 },
        format,
        usage_count: Math.floor(Math.random() * 10000),
        rating: 3.5 + Math.random() * 1.5,
        rating_count: Math.floor(Math.random() * 500),
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
        is_premium: Math.random() > 0.7,
        is_trending: Math.random() > 0.8,
        is_new: Math.random() > 0.9,
        creator: {
          id: `creator_${Math.floor(Math.random() * 50)}`,
          name: `Designer ${Math.floor(Math.random() * 50)}`,
          avatar: `https://picsum.photos/40/40?random=${Math.floor(Math.random() * 50)}`
        },
        design_data: {},
        ai_metadata: {
          style,
          color_palette: [`#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`],
          complexity_score: Math.random() * 10,
          conversion_prediction: Math.random(),
          target_audience: [industry],
          industry: [industry],
          mood: [style],
          visual_weight: Math.random() * 10,
          readability_score: Math.random()
        }
      });
    }
    
    return templates;
  }, []);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // In real implementation, these would be API calls
        setCategories(sampleCategories);
        const sampleTemplates = generateSampleTemplates();
        setTemplates(sampleTemplates);
        setFilteredTemplates(sampleTemplates);
        
        // Generate AI recommendations based on current design
        if (currentDesign) {
          await generateAIRecommendations(sampleTemplates);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [generateSampleTemplates, currentDesign]);

  // Generate AI recommendations
  const generateAIRecommendations = async (allTemplates: Template[]) => {
    try {
      // Simulate AI analysis of current design
      const recommendations: AIRecommendation[] = [];
      
      // Get top 10 templates based on AI analysis
      const topTemplates = allTemplates
        .sort(() => Math.random() - 0.5) // Random for demo
        .slice(0, 10);
      
      topTemplates.forEach(template => {
        recommendations.push({
          template_id: template.id,
          reason: `Matches your ${template.ai_metadata.style} design style`,
          confidence: 0.7 + Math.random() * 0.3,
          match_factors: ['style_similarity', 'color_harmony', 'layout_structure']
        });
      });
      
      setAIRecommendations(recommendations.sort((a, b) => b.confidence - a.confidence));
    } catch (error) {
      console.error('Failed to generate AI recommendations:', error);
    }
  };

  // Filter and search logic
  useEffect(() => {
    let result = [...templates];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query)) ||
        template.ai_tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(template => template.category === selectedCategory);
    }

    // Subcategory filter
    if (selectedSubcategory) {
      result = result.filter(template => template.subcategory === selectedSubcategory);
    }

    // Advanced filters
    if (filters.format.length > 0) {
      result = result.filter(template => filters.format.includes(template.format));
    }

    if (filters.isPremium !== null) {
      result = result.filter(template => template.is_premium === filters.isPremium);
    }

    if (filters.rating > 0) {
      result = result.filter(template => template.rating >= filters.rating);
    }

    if (filters.tags.length > 0) {
      result = result.filter(template =>
        filters.tags.some(tag => template.tags.includes(tag))
      );
    }

    // Complexity filter
    result = result.filter(template =>
      template.ai_metadata.complexity_score >= filters.complexity[0] &&
      template.ai_metadata.complexity_score <= filters.complexity[1]
    );

    // Sort results
    switch (sortBy) {
      case 'trending':
        result.sort((a, b) => {
          if (a.is_trending && !b.is_trending) return -1;
          if (!a.is_trending && b.is_trending) return 1;
          return b.usage_count - a.usage_count;
        });
        break;
      case 'popular':
        result.sort((a, b) => b.usage_count - a.usage_count);
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
    }

    setFilteredTemplates(result);
  }, [templates, searchQuery, selectedCategory, selectedSubcategory, filters, sortBy]);

  // Template card component
  const TemplateCard: React.FC<{ template: Template; isRecommended?: boolean }> = ({ 
    template, 
    isRecommended = false 
  }) => {
    const recommendation = aiRecommendations.find(r => r.template_id === template.id);
    
    return (
      <div className={`group relative bg-white rounded-xl shadow-sm border transition-all duration-200 hover:shadow-lg hover:border-purple-200 ${
        isRecommended ? 'ring-2 ring-purple-200 bg-gradient-to-br from-white to-purple-50' : ''
      }`}>
        {/* Recommendation badge */}
        {isRecommended && recommendation && (
          <div className="absolute top-2 left-2 z-10 flex items-center space-x-1 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-medium">
            <Brain className="w-3 h-3" />
            <span>{Math.round(recommendation.confidence * 100)}% match</span>
          </div>
        )}

        {/* Template badges */}
        <div className="absolute top-2 right-2 z-10 flex space-x-1">
          {template.is_new && (
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              New
            </span>
          )}
          {template.is_trending && (
            <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Trending
            </span>
          )}
          {template.is_premium && (
            <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium">
              Premium
            </span>
          )}
        </div>

        {/* Template image */}
        <div className="relative overflow-hidden rounded-t-xl aspect-[3/4]">
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 flex space-x-2">
              <button
                onClick={() => setSelectedTemplate(template)}
                className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
                title="Preview"
              >
                <Eye className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={() => onTemplateSelect(template)}
                className="p-2 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors"
                title="Use Template"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Template info */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight group-hover:text-purple-600 transition-colors">
              {template.name}
            </h3>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span>{template.rating.toFixed(1)}</span>
            </div>
          </div>
          
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">
            {template.description}
          </p>

          {/* AI recommendation reason */}
          {isRecommended && recommendation && (
            <div className="mb-3 p-2 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700 font-medium">
                {recommendation.reason}
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Download className="w-3 h-3" />
              <span>{template.usage_count.toLocaleString()}</span>
            </div>
            <span>{template.format}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Template Marketplace</h1>
            <p className="text-gray-600">Discover professionally designed templates powered by AI</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAIRecommendations(!showAIRecommendations)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                showAIRecommendations
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>AI Recommendations</span>
            </button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search templates, styles, or industries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Filter controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="trending">Trending</option>
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="rating">Highest Rated</option>
            </select>

            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} transition-colors`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} transition-colors`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations Section */}
      {showAIRecommendations && aiRecommendations.length > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
            <div className="flex items-center space-x-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">AI Recommended for You</h2>
              <span className="text-sm text-gray-500">Based on your current design</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {aiRecommendations.slice(0, 4).map((rec) => {
                const template = templates.find(t => t.id === rec.template_id);
                return template ? (
                  <TemplateCard 
                    key={template.id} 
                    template={template} 
                    isRecommended={true}
                  />
                ) : null;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Category tabs */}
      <div className="mb-6">
        <div className="flex space-x-1 overflow-x-auto pb-2">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedSubcategory('');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>All Templates</span>
            <span className="text-xs opacity-75">({templates.length})</span>
          </button>
          
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setSelectedSubcategory('');
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.icon}
              <span>{category.name}</span>
              <span className="text-xs opacity-75">({category.template_count})</span>
              {category.trending && (
                <TrendingUp className="w-3 h-3 text-orange-400" />
              )}
            </button>
          ))}
        </div>

        {/* Subcategory filter */}
        {selectedCategory !== 'all' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {categories
              .find(c => c.id === selectedCategory)
              ?.subcategories.map((subcategory) => (
              <button
                key={subcategory}
                onClick={() => setSelectedSubcategory(
                  selectedSubcategory === subcategory ? '' : subcategory
                )}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedSubcategory === subcategory
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {subcategory}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-600">
          Showing {filteredTemplates.length} of {templates.length} templates
          {searchQuery && (
            <span> for "{searchQuery}"</span>
          )}
        </p>
        
        {filteredTemplates.length > 0 && (
          <button
            onClick={() => {
              const shuffled = [...filteredTemplates].sort(() => Math.random() - 0.5);
              setFilteredTemplates(shuffled);
            }}
            className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 text-sm"
          >
            <Shuffle className="w-4 h-4" />
            <span>Shuffle</span>
          </button>
        )}
      </div>

      {/* Templates grid */}
      {filteredTemplates.length > 0 ? (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          {filteredTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-500 mb-4">
            Try adjusting your search or filters to find what you're looking for.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setSelectedSubcategory('');
              setFilters({
                format: [],
                isPremium: null,
                rating: 0,
                tags: [],
                style: [],
                industry: [],
                complexity: [0, 10]
              });
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Template preview modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedTemplate.name}
                </h2>
                <p className="text-gray-600">{selectedTemplate.description}</p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <img
                    src={selectedTemplate.preview_url}
                    alt={selectedTemplate.name}
                    className="w-full rounded-lg border"
                  />
                </div>
                
                <div className="lg:w-80 space-y-4">
                  {/* Template info */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Template Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Format:</span>
                        <span className="font-medium">{selectedTemplate.format}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Dimensions:</span>
                        <span className="font-medium">
                          {selectedTemplate.dimensions.width} × {selectedTemplate.dimensions.height}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rating:</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{selectedTemplate.rating.toFixed(1)}</span>
                          <span className="text-gray-500">({selectedTemplate.rating_count})</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Downloads:</span>
                        <span className="font-medium">{selectedTemplate.usage_count.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-1">
                      <Brain className="w-4 h-4 text-purple-600" />
                      <span>AI Analysis</span>
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Style:</span>
                        <span className="font-medium capitalize">{selectedTemplate.ai_metadata.style}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Complexity:</span>
                        <span className="font-medium">{selectedTemplate.ai_metadata.complexity_score.toFixed(1)}/10</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conversion Score:</span>
                        <span className="font-medium">{Math.round(selectedTemplate.ai_metadata.conversion_prediction * 100)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        onTemplateSelect(selectedTemplate);
                        setSelectedTemplate(null);
                      }}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Use This Template</span>
                    </button>
                    
                    <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      <Heart className="w-4 h-4" />
                      <span>Save to Favorites</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateMarketplace;