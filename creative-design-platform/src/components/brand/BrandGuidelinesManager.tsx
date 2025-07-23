import React, { useState, useEffect } from 'react';
import { SecurityUtils } from '../../utils/security';
import {
  Shield,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  Zap,
  BookOpen,
  Target,
  Palette,
  Type,
  Layout,
  Image,
  Maximize,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  DragHandle
} from 'lucide-react';
import { useBrandGuidelines } from '../../hooks/useBrandGuidelines';
import { BrandGuideline, BrandRule, brandGuidelinesUtils } from '../../services/brandGuidelinesService';

interface BrandGuidelinesManagerProps {
  brandKitId: string;
  designId?: string;
  className?: string;
}

interface GuidelineFormData {
  name: string;
  description: string;
  category: BrandGuideline['category'];
  rule_type: BrandGuideline['rule_type'];
  severity: BrandGuideline['severity'];
  rules: BrandRule[];
  is_active: boolean;
}

const BrandGuidelinesManager: React.FC<BrandGuidelinesManagerProps> = ({
  brandKitId,
  designId,
  className = ''
}) => {
  const brandGuidelines = useBrandGuidelines({
    brandKitId,
    designId,
    enableRealtimeCompliance: !!designId
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGuideline, setEditingGuideline] = useState<BrandGuideline | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['colors', 'typography']));
  const [draggedGuideline, setDraggedGuideline] = useState<string | null>(null);

  const categories = [
    { id: 'colors', name: 'Colors', icon: Palette },
    { id: 'typography', name: 'Typography', icon: Type },
    { id: 'spacing', name: 'Spacing', icon: Layout },
    { id: 'layout', name: 'Layout', icon: Maximize },
    { id: 'imagery', name: 'Imagery', icon: Image },
    { id: 'logo', name: 'Logo', icon: Target },
    { id: 'general', name: 'General', icon: Settings }
  ];

  const ruleTypes = [
    { id: 'required', name: 'Required', description: 'Must be followed', color: 'red' },
    { id: 'preferred', name: 'Preferred', description: 'Recommended approach', color: 'blue' },
    { id: 'forbidden', name: 'Forbidden', description: 'Should not be used', color: 'orange' },
    { id: 'conditional', name: 'Conditional', description: 'Depends on context', color: 'purple' }
  ];

  const severityLevels = [
    { id: 'error', name: 'Error', description: 'Critical violation', color: 'red' },
    { id: 'warning', name: 'Warning', description: 'Important issue', color: 'yellow' },
    { id: 'info', name: 'Info', description: 'Helpful suggestion', color: 'blue' }
  ];

  // Filter guidelines
  const filteredGuidelines = brandGuidelines.guidelines.filter(guideline => {
    const matchesSearch = guideline.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         guideline.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || guideline.category === selectedCategory;
    const matchesSeverity = selectedSeverity === 'all' || guideline.severity === selectedSeverity;
    
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  // Group guidelines by category
  const guidelinesByCategory = brandGuidelines.getGuidelinesByCategory();

  const handleCreateGuideline = () => {
    setEditingGuideline(null);
    setShowCreateModal(true);
  };

  const handleEditGuideline = (guideline: BrandGuideline) => {
    setEditingGuideline(guideline);
    setShowCreateModal(true);
  };

  const handleDeleteGuideline = async (guidelineId: string) => {
    if (window.confirm('Are you sure you want to delete this guideline?')) {
      try {
        await brandGuidelines.deleteGuideline(guidelineId);
      } catch (error) {
        // Error handling is managed by the hook
      }
    }
  };

  const handleDuplicateGuideline = async (guidelineId: string) => {
    try {
      await brandGuidelines.duplicateGuideline(guidelineId);
    } catch (error) {
      // Error handling is managed by the hook
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find(c => c.id === category);
    const IconComponent = categoryData?.icon || Settings;
    return <IconComponent className="w-4 h-4" />;
  };

  const getRuleTypeColor = (ruleType: string) => {
    const type = ruleTypes.find(t => t.id === ruleType);
    return type?.color || 'gray';
  };

  const getSeverityColor = (severity: string) => {
    return brandGuidelinesUtils.getSeverityColor(severity as any);
  };

  // Guidelines list component
  const GuidelineItem: React.FC<{ guideline: BrandGuideline }> = ({ guideline }) => {
    const [showActions, setShowActions] = useState(false);

    return (
      <div
        className={`group border rounded-lg p-4 transition-all hover:shadow-md ${
          brandGuidelines.selectedGuideline?.id === guideline.id
            ? 'border-blue-300 bg-blue-50'
            : 'border-gray-200 bg-white'
        }`}
        onClick={() => brandGuidelines.selectGuideline(guideline)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex items-center space-x-1">
                {getCategoryIcon(guideline.category)}
                <h3 className="text-sm font-medium text-gray-900">{guideline.name}</h3>
              </div>
              
              <div className="flex items-center space-x-1">
                <span
                  className={`px-2 py-1 text-xs rounded-full text-white`}
                  style={{ backgroundColor: getRuleTypeColor(guideline.rule_type) }}
                >
                  {guideline.rule_type}
                </span>
                
                <span
                  className={`px-2 py-1 text-xs rounded-full text-white`}
                  style={{ backgroundColor: getSeverityColor(guideline.severity) }}
                >
                  {guideline.severity}
                </span>
              </div>

              {!guideline.is_active && (
                <EyeOff className="w-4 h-4 text-gray-400" title="Inactive" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{guideline.description}</p>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{guideline.rules.length} rule{guideline.rules.length !== 1 ? 's' : ''}</span>
              <span>Order: {guideline.order}</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActions && (
              <div className="absolute right-0 top-6 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditGuideline(guideline);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateGuideline(guideline.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4" />
                  <span>Duplicate</span>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    brandGuidelines.updateGuideline(guideline.id, { is_active: !guideline.is_active });
                    setShowActions(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {guideline.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{guideline.is_active ? 'Deactivate' : 'Activate'}</span>
                </button>
                
                <div className="border-t border-gray-100 my-1" />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteGuideline(guideline.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Category section component
  const CategorySection: React.FC<{ category: string; guidelines: BrandGuideline[] }> = ({ category, guidelines }) => {
    const isExpanded = expandedCategories.has(category);
    const categoryData = categories.find(c => c.id === category);
    const IconComponent = categoryData?.icon || Settings;

    return (
      <div className="mb-6">
        <button
          onClick={() => toggleCategory(category)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <IconComponent className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">{categoryData?.name || category}</span>
            <span className="text-sm text-gray-500">({guidelines.length})</span>
          </div>
          
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-2">
            {guidelines.map(guideline => (
              <GuidelineItem key={guideline.id} guideline={guideline} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // AI suggestions section
  const AISuggestionsSection: React.FC = () => {
    const [suggestions, setSuggestions] = useState<any>(null);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const loadSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const result = await brandGuidelines.getAISuggestions();
        setSuggestions(result);
      } catch (error) {
        console.error('Failed to load AI suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    return (
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-purple-600" />
            <h3 className="font-medium text-gray-900">AI Suggestions</h3>
          </div>
          
          <button
            onClick={loadSuggestions}
            disabled={loadingSuggestions}
            className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loadingSuggestions ? 'Loading...' : 'Get Suggestions'}
          </button>
        </div>

        {suggestions && (
          <div className="space-y-2">
            {suggestions.suggested_guidelines.slice(0, 3).map((suggestion: any, index: number) => (
              <div key={index} className="bg-white rounded p-3 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">{suggestion.guideline.name}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {suggestion.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{suggestion.reasoning}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Confidence: {Math.round(suggestion.confidence * 100)}%</span>
                  <button
                    onClick={() => {
                      // Create guideline from suggestion
                      setEditingGuideline(suggestion.guideline as BrandGuideline);
                      setShowCreateModal(true);
                    }}
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Use Suggestion
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Brand Guidelines</h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => brandGuidelines.refreshAnalytics()}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <Settings className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleCreateGuideline}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Guideline</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search guidelines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Severities</option>
            {severityLevels.map(level => (
              <option key={level.id} value={level.id}>{level.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {brandGuidelines.guidelinesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* AI Suggestions */}
            <AISuggestionsSection />

            {/* Guidelines by category */}
            {Object.entries(guidelinesByCategory).map(([category, guidelines]) => (
              <CategorySection
                key={category}
                category={category}
                guidelines={guidelines.filter(g => {
                  const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       g.description.toLowerCase().includes(searchTerm.toLowerCase());
                  const matchesCategory = selectedCategory === 'all' || g.category === selectedCategory;
                  const matchesSeverity = selectedSeverity === 'all' || g.severity === selectedSeverity;
                  return matchesSearch && matchesCategory && matchesSeverity;
                })}
              />
            ))}

            {/* Empty state */}
            {filteredGuidelines.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No guidelines found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedCategory !== 'all' || selectedSeverity !== 'all'
                    ? 'Try adjusting your filters to see more guidelines.'
                    : 'Create your first brand guideline to ensure consistent designs.'
                  }
                </p>
                <button
                  onClick={handleCreateGuideline}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Guideline</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Error message */}
      {brandGuidelines.error && (
        <div className="p-4 mx-6 mb-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-800">{brandGuidelines.error}</span>
            <button
              onClick={brandGuidelines.clearError}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal would go here */}
      {showCreateModal && (
        <GuidelineModal
          guideline={editingGuideline}
          brandKitId={brandKitId}
          onSave={(guideline) => {
            if (editingGuideline) {
              brandGuidelines.updateGuideline(editingGuideline.id, guideline);
            } else {
              brandGuidelines.createGuideline(guideline);
            }
            setShowCreateModal(false);
            setEditingGuideline(null);
          }}
          onCancel={() => {
            setShowCreateModal(false);
            setEditingGuideline(null);
          }}
        />
      )}
    </div>
  );
};

// Guideline creation/editing modal
const GuidelineModal: React.FC<{
  guideline: BrandGuideline | null;
  brandKitId: string;
  onSave: (guideline: Omit<BrandGuideline, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}> = ({ guideline, brandKitId, onSave, onCancel }) => {
  const [formData, setFormData] = useState<GuidelineFormData>({
    name: guideline?.name || '',
    description: guideline?.description || '',
    category: guideline?.category || 'general',
    rule_type: guideline?.rule_type || 'required',
    severity: guideline?.severity || 'warning',
    rules: guideline?.rules || [],
    is_active: guideline?.is_active ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input data
    const validation = SecurityUtils.validateGuidelineData(formData);
    if (!validation.valid) {
      alert('Validation error: ' + validation.errors.join(', '));
      return;
    }
    
    // Sanitize text inputs
    const sanitizedData = {
      ...formData,
      name: SecurityUtils.sanitizeHtml(formData.name),
      description: SecurityUtils.sanitizeHtml(formData.description),
      brand_kit_id: brandKitId,
      created_by: '', // Will be set by the server
      order: guideline?.order || 0,
      conditions: guideline?.conditions,
      exceptions: guideline?.exceptions
    };
    
    onSave(sanitizedData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {guideline ? 'Edit Guideline' : 'Create New Guideline'}
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Basic information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Primary color usage"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe when and how this guideline should be applied..."
                  required
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="colors">Colors</option>
                    <option value="typography">Typography</option>
                    <option value="spacing">Spacing</option>
                    <option value="layout">Layout</option>
                    <option value="imagery">Imagery</option>
                    <option value="logo">Logo</option>
                    <option value="general">General</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.rule_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, rule_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="required">Required</option>
                    <option value="preferred">Preferred</option>
                    <option value="forbidden">Forbidden</option>
                    <option value="conditional">Conditional</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Severity
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="error">Error</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active guideline
                </label>
              </div>
            </div>

            {/* Rules section - simplified for now */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Rules</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  Rule configuration will be implemented in the next iteration.
                  For now, rules can be managed through the API.
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-gray-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{guideline ? 'Update' : 'Create'} Guideline</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BrandGuidelinesManager;