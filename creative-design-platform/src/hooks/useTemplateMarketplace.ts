import { useState, useEffect, useCallback, useMemo } from 'react';
import { templateService, templateUtils } from '../services/templateService';
import { aiService } from '../services/aiService';
import {
  Template,
  TemplateCategory,
  TemplateFilter,
  TemplateSearchQuery,
  AIRecommendation,
  TemplateCollection
} from '../types/template';

interface UseTemplateMarketplaceOptions {
  initialCategory?: string;
  initialSearchQuery?: string;
  enableAIRecommendations?: boolean;
  currentDesign?: any;
  userPreferences?: any;
}

interface TemplateMarketplaceState {
  // Data
  templates: Template[];
  filteredTemplates: Template[];
  categories: TemplateCategory[];
  collections: TemplateCollection[];
  aiRecommendations: AIRecommendation[];
  
  // Loading states
  loading: boolean;
  searchLoading: boolean;
  recommendationsLoading: boolean;
  
  // Error states
  error: string | null;
  searchError: string | null;
  
  // UI state
  searchQuery: string;
  selectedCategory: string;
  selectedSubcategory: string;
  sortBy: 'trending' | 'popular' | 'newest' | 'rating' | 'relevance';
  viewMode: 'grid' | 'list';
  showFilters: boolean;
  selectedTemplate: Template | null;
  
  // Filters
  filters: TemplateFilter;
  
  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;
  
  // Recent activity
  recentlyViewed: Template[];
  favorites: Template[];
}

interface TemplateMarketplaceActions {
  // Search and filtering
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
  setCategory: (category: string) => void;
  setSubcategory: (subcategory: string) => void;
  setSortBy: (sortBy: TemplateMarketplaceState['sortBy']) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setFilters: (filters: Partial<TemplateFilter>) => void;
  clearFilters: () => void;
  toggleFilters: () => void;
  
  // Template selection
  selectTemplate: (template: Template) => void;
  deselectTemplate: () => void;
  
  // Template actions
  useTemplate: (template: Template) => Promise<void>;
  favoriteTemplate: (templateId: string) => Promise<void>;
  unfavoriteTemplate: (templateId: string) => Promise<void>;
  shareTemplate: (templateId: string, platform: string) => Promise<void>;
  
  // Data loading
  loadTemplates: () => Promise<void>;
  loadMoreTemplates: () => Promise<void>;
  refreshData: () => Promise<void>;
  loadAIRecommendations: () => Promise<void>;
  
  // Pagination
  setPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  
  // Collections
  createCollection: (name: string, description: string, templateIds: string[]) => Promise<void>;
  addToCollection: (collectionId: string, templateId: string) => Promise<void>;
  removeFromCollection: (collectionId: string, templateId: string) => Promise<void>;
}

export const useTemplateMarketplace = (
  options: UseTemplateMarketplaceOptions = {}
): TemplateMarketplaceState & TemplateMarketplaceActions => {
  const {
    initialCategory = 'all',
    initialSearchQuery = '',
    enableAIRecommendations = true,
    currentDesign,
    userPreferences
  } = options;

  // State
  const [state, setState] = useState<TemplateMarketplaceState>({
    // Data
    templates: [],
    filteredTemplates: [],
    categories: [],
    collections: [],
    aiRecommendations: [],
    
    // Loading states
    loading: true,
    searchLoading: false,
    recommendationsLoading: false,
    
    // Error states
    error: null,
    searchError: null,
    
    // UI state
    searchQuery: initialSearchQuery,
    selectedCategory: initialCategory,
    selectedSubcategory: '',
    sortBy: 'trending',
    viewMode: 'grid',
    showFilters: false,
    selectedTemplate: null,
    
    // Filters
    filters: {
      categories: [],
      subcategories: [],
      tags: [],
      formats: [],
      dimensions: [],
      price_range: { min: 0, max: 1000 },
      rating_min: 0,
      complexity_range: [0, 10],
      conversion_rate_min: 0,
      industries: [],
      styles: [],
      moods: [],
      target_audiences: []
    },
    
    // Pagination
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    
    // Recent activity
    recentlyViewed: [],
    favorites: []
  });

  // Update state helper
  const updateState = useCallback((updates: Partial<TemplateMarketplaceState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        updateState({ loading: true, error: null });
        
        // Load categories
        const categoriesResponse = await templateService.getCategories();
        const categories = categoriesResponse.data;
        
        // Load initial templates
        const templatesResponse = await templateService.getTemplates({
          page: 1,
          per_page: 20,
          category: initialCategory !== 'all' ? initialCategory : undefined
        });
        const templates = templatesResponse.data;
        
        // Load collections
        const collectionsResponse = await templateService.getCollections();
        const collections = collectionsResponse.data;
        
        // Load recently viewed and favorites
        const [recentResponse, favoritesResponse] = await Promise.all([
          templateService.getRecentlyViewed(),
          templateService.getFavoriteTemplates()
        ]);
        
        updateState({
          categories,
          templates,
          filteredTemplates: templates,
          collections,
          recentlyViewed: recentResponse.data,
          favorites: favoritesResponse.data,
          totalCount: templatesResponse.pagination.total,
          totalPages: templatesResponse.pagination.total_pages,
          loading: false
        });
        
        // Load AI recommendations if enabled
        if (enableAIRecommendations) {
          loadAIRecommendations();
        }
        
      } catch (error) {
        console.error('Failed to initialize template marketplace:', error);
        updateState({
          error: error instanceof Error ? error.message : 'Failed to load templates',
          loading: false
        });
      }
    };

    initializeData();
  }, [initialCategory, enableAIRecommendations]);

  // Load AI recommendations
  const loadAIRecommendations = useCallback(async () => {
    if (!enableAIRecommendations) return;
    
    try {
      updateState({ recommendationsLoading: true });
      
      const response = await templateService.getAIRecommendations({
        current_design: currentDesign,
        user_preferences: userPreferences,
        limit: 10
      });
      
      updateState({
        aiRecommendations: response.data,
        recommendationsLoading: false
      });
    } catch (error) {
      console.error('Failed to load AI recommendations:', error);
      updateState({ recommendationsLoading: false });
    }
  }, [currentDesign, userPreferences, enableAIRecommendations]);

  // Filter and search logic
  const applyFiltersAndSearch = useCallback(async () => {
    const { searchQuery, selectedCategory, selectedSubcategory, filters, sortBy, currentPage } = state;
    
    try {
      updateState({ searchLoading: true, searchError: null });
      
      const searchRequest: TemplateSearchQuery = {
        query: searchQuery,
        filters: {
          ...filters,
          categories: selectedCategory !== 'all' ? [selectedCategory] : [],
          subcategories: selectedSubcategory ? [selectedSubcategory] : []
        },
        sort_by: sortBy,
        sort_order: 'desc',
        page: currentPage,
        per_page: 20
      };
      
      const response = await templateService.searchTemplates(searchRequest);
      const { templates, total_count, total_pages, ai_recommendations } = response.data;
      
      updateState({
        filteredTemplates: templates,
        totalCount: total_count,
        totalPages: total_pages,
        searchLoading: false
      });
      
      // Update AI recommendations if available
      if (ai_recommendations) {
        updateState({ aiRecommendations: ai_recommendations });
      }
      
    } catch (error) {
      console.error('Search failed:', error);
      updateState({
        searchError: error instanceof Error ? error.message : 'Search failed',
        searchLoading: false
      });
    }
  }, [state]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.searchQuery || state.selectedCategory !== 'all' || state.selectedSubcategory) {
        applyFiltersAndSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [state.searchQuery, state.selectedCategory, state.selectedSubcategory, state.filters, state.sortBy, state.currentPage]);

  // Actions
  const setSearchQuery = useCallback((query: string) => {
    updateState({ searchQuery: query, currentPage: 1 });
  }, []);

  const clearSearch = useCallback(() => {
    updateState({ searchQuery: '', currentPage: 1 });
  }, []);

  const setCategory = useCallback((category: string) => {
    updateState({ 
      selectedCategory: category, 
      selectedSubcategory: '', 
      currentPage: 1 
    });
  }, []);

  const setSubcategory = useCallback((subcategory: string) => {
    updateState({ selectedSubcategory: subcategory, currentPage: 1 });
  }, []);

  const setSortBy = useCallback((sortBy: TemplateMarketplaceState['sortBy']) => {
    updateState({ sortBy, currentPage: 1 });
  }, []);

  const setViewMode = useCallback((viewMode: 'grid' | 'list') => {
    updateState({ viewMode });
  }, []);

  const setFilters = useCallback((newFilters: Partial<TemplateFilter>) => {
    updateState({ 
      filters: { ...state.filters, ...newFilters }, 
      currentPage: 1 
    });
  }, [state.filters]);

  const clearFilters = useCallback(() => {
    updateState({
      filters: {
        categories: [],
        subcategories: [],
        tags: [],
        formats: [],
        dimensions: [],
        price_range: { min: 0, max: 1000 },
        rating_min: 0,
        complexity_range: [0, 10],
        conversion_rate_min: 0,
        industries: [],
        styles: [],
        moods: [],
        target_audiences: []
      },
      currentPage: 1
    });
  }, []);

  const toggleFilters = useCallback(() => {
    updateState({ showFilters: !state.showFilters });
  }, [state.showFilters]);

  const selectTemplate = useCallback((template: Template) => {
    updateState({ selectedTemplate: template });
    
    // Record template view
    templateService.recordTemplateView(template.id).catch(console.error);
  }, []);

  const deselectTemplate = useCallback(() => {
    updateState({ selectedTemplate: null });
  }, []);

  const useTemplate = useCallback(async (template: Template) => {
    try {
      // Record template download
      await templateService.recordTemplateDownload(template.id);
      
      // Add to recently viewed if not already there
      const isAlreadyViewed = state.recentlyViewed.some(t => t.id === template.id);
      if (!isAlreadyViewed) {
        const updatedRecent = [template, ...state.recentlyViewed.slice(0, 9)];
        updateState({ recentlyViewed: updatedRecent });
      }
      
      // Close template selection
      deselectTemplate();
      
    } catch (error) {
      console.error('Failed to use template:', error);
      throw error;
    }
  }, [state.recentlyViewed]);

  const favoriteTemplate = useCallback(async (templateId: string) => {
    try {
      await templateService.addToFavorites(templateId);
      
      // Find the template and add to favorites
      const template = state.templates.find(t => t.id === templateId) || 
                      state.filteredTemplates.find(t => t.id === templateId);
      
      if (template) {
        updateState({ 
          favorites: [template, ...state.favorites] 
        });
      }
    } catch (error) {
      console.error('Failed to favorite template:', error);
      throw error;
    }
  }, [state.templates, state.filteredTemplates, state.favorites]);

  const unfavoriteTemplate = useCallback(async (templateId: string) => {
    try {
      await templateService.removeFromFavorites(templateId);
      
      updateState({ 
        favorites: state.favorites.filter(t => t.id !== templateId) 
      });
    } catch (error) {
      console.error('Failed to unfavorite template:', error);
      throw error;
    }
  }, [state.favorites]);

  const shareTemplate = useCallback(async (templateId: string, platform: string) => {
    try {
      const response = await templateService.shareTemplate(templateId, { platform });
      
      // Could show share URL or handle platform-specific sharing
      return response.data.share_url;
    } catch (error) {
      console.error('Failed to share template:', error);
      throw error;
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      updateState({ loading: true, error: null });
      
      const response = await templateService.getTemplates({
        page: state.currentPage,
        per_page: 20,
        category: state.selectedCategory !== 'all' ? state.selectedCategory : undefined
      });
      
      updateState({
        templates: response.data,
        filteredTemplates: response.data,
        totalCount: response.pagination.total,
        totalPages: response.pagination.total_pages,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load templates:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to load templates',
        loading: false
      });
    }
  }, [state.currentPage, state.selectedCategory]);

  const loadMoreTemplates = useCallback(async () => {
    if (state.currentPage >= state.totalPages || state.loading) return;
    
    try {
      const nextPage = state.currentPage + 1;
      
      const response = await templateService.getTemplates({
        page: nextPage,
        per_page: 20,
        category: state.selectedCategory !== 'all' ? state.selectedCategory : undefined
      });
      
      updateState({
        templates: [...state.templates, ...response.data],
        filteredTemplates: [...state.filteredTemplates, ...response.data],
        currentPage: nextPage
      });
    } catch (error) {
      console.error('Failed to load more templates:', error);
    }
  }, [state.currentPage, state.totalPages, state.loading, state.selectedCategory, state.templates, state.filteredTemplates]);

  const refreshData = useCallback(async () => {
    updateState({ currentPage: 1 });
    await loadTemplates();
    if (enableAIRecommendations) {
      await loadAIRecommendations();
    }
  }, [loadTemplates, loadAIRecommendations, enableAIRecommendations]);

  const setPage = useCallback((page: number) => {
    updateState({ currentPage: page });
  }, []);

  const nextPage = useCallback(() => {
    if (state.currentPage < state.totalPages) {
      updateState({ currentPage: state.currentPage + 1 });
    }
  }, [state.currentPage, state.totalPages]);

  const previousPage = useCallback(() => {
    if (state.currentPage > 1) {
      updateState({ currentPage: state.currentPage - 1 });
    }
  }, [state.currentPage]);

  const createCollection = useCallback(async (name: string, description: string, templateIds: string[]) => {
    try {
      const response = await templateService.createCollection({
        name,
        description,
        template_ids: templateIds,
        is_public: false,
        tags: []
      });
      
      updateState({
        collections: [response.data, ...state.collections]
      });
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  }, [state.collections]);

  const addToCollection = useCallback(async (collectionId: string, templateId: string) => {
    try {
      const collection = state.collections.find(c => c.id === collectionId);
      if (!collection) return;
      
      const updatedCollection = {
        ...collection,
        template_ids: [...collection.template_ids, templateId]
      };
      
      await templateService.updateCollection(collectionId, updatedCollection);
      
      updateState({
        collections: state.collections.map(c => 
          c.id === collectionId ? updatedCollection : c
        )
      });
    } catch (error) {
      console.error('Failed to add to collection:', error);
      throw error;
    }
  }, [state.collections]);

  const removeFromCollection = useCallback(async (collectionId: string, templateId: string) => {
    try {
      const collection = state.collections.find(c => c.id === collectionId);
      if (!collection) return;
      
      const updatedCollection = {
        ...collection,
        template_ids: collection.template_ids.filter(id => id !== templateId)
      };
      
      await templateService.updateCollection(collectionId, updatedCollection);
      
      updateState({
        collections: state.collections.map(c => 
          c.id === collectionId ? updatedCollection : c
        )
      });
    } catch (error) {
      console.error('Failed to remove from collection:', error);
      throw error;
    }
  }, [state.collections]);

  // Computed values
  const isTemplateInFavorites = useCallback((templateId: string) => {
    return state.favorites.some(t => t.id === templateId);
  }, [state.favorites]);

  const getRecommendationForTemplate = useCallback((templateId: string) => {
    return state.aiRecommendations.find(rec => rec.template_id === templateId);
  }, [state.aiRecommendations]);

  const hasActiveFilters = useMemo(() => {
    const { filters, selectedCategory, selectedSubcategory, searchQuery } = state;
    return (
      searchQuery.length > 0 ||
      selectedCategory !== 'all' ||
      selectedSubcategory.length > 0 ||
      filters.categories.length > 0 ||
      filters.subcategories.length > 0 ||
      filters.tags.length > 0 ||
      filters.formats.length > 0 ||
      filters.industries.length > 0 ||
      filters.styles.length > 0 ||
      filters.rating_min > 0 ||
      filters.complexity_range[0] > 0 ||
      filters.complexity_range[1] < 10
    );
  }, [state]);

  return {
    // State
    ...state,
    
    // Computed
    hasActiveFilters,
    isTemplateInFavorites,
    getRecommendationForTemplate,
    
    // Actions
    setSearchQuery,
    clearSearch,
    setCategory,
    setSubcategory,
    setSortBy,
    setViewMode,
    setFilters,
    clearFilters,
    toggleFilters,
    selectTemplate,
    deselectTemplate,
    useTemplate,
    favoriteTemplate,
    unfavoriteTemplate,
    shareTemplate,
    loadTemplates,
    loadMoreTemplates,
    refreshData,
    loadAIRecommendations,
    setPage,
    nextPage,
    previousPage,
    createCollection,
    addToCollection,
    removeFromCollection
  };
};

export default useTemplateMarketplace;