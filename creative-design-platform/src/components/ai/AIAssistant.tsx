import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Image, 
  Type, 
  Wand2, 
  Palette, 
  Upload, 
  Download, 
  Zap,
  Brain,
  Target,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Loader2,
  Check,
  X,
  Info,
  RefreshCw,
  Settings,
  Search,
  Star,
  TrendingUp,
  Clock,
  ArrowRight,
  Magic,
  Lightbulb,
  Filter
} from 'lucide-react';
import { aiService, aiUtils } from '../../services/aiService';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  currentDesign?: any;
  onApplyResult?: (result: any, type: string) => void;
}

interface AITask {
  id: string;
  type: 'image' | 'text' | 'animation' | 'background' | 'analysis';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  result?: any;
  progress?: number;
}

interface SmartSuggestion {
  id: string;
  title: string;
  description: string;
  confidence: number;
  category: 'design' | 'content' | 'optimization' | 'trend';
  action: () => void;
  icon: React.ReactNode;
  estimatedTime: string;
}

interface AIInsight {
  id: string;
  type: 'tip' | 'warning' | 'opportunity' | 'trend';
  title: string;
  description: string;
  actionText?: string;
  action?: () => void;
  confidence: number;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ 
  isOpen, 
  onClose, 
  currentDesign, 
  onApplyResult 
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'enhance' | 'analyze'>('generate');
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate smart suggestions based on current design
  useEffect(() => {
    if (currentDesign?.elements) {
      generateSmartSuggestions();
      generateAIInsights();
    }
  }, [currentDesign]);

  const generateSmartSuggestions = () => {
    const elements = currentDesign?.elements || [];
    const hasImages = elements.some((el: any) => el.type === 'image');
    const hasText = elements.some((el: any) => el.type === 'text');
    const hasAnimations = elements.some((el: any) => el.animations?.length > 0);
    
    const suggestions: SmartSuggestion[] = [];

    // Design completion suggestions
    if (!hasImages) {
      suggestions.push({
        id: 'add-hero-image',
        title: 'Add Hero Image',
        description: 'Generate a stunning hero image to catch attention',
        confidence: 0.9,
        category: 'design',
        estimatedTime: '30 seconds',
        icon: <Image className="w-4 h-4" />,
        action: handleImageGeneration
      });
    }

    if (!hasText) {
      suggestions.push({
        id: 'add-headline',
        title: 'Create Compelling Headline',
        description: 'Generate conversion-optimized copy for your design',
        confidence: 0.85,
        category: 'content',
        estimatedTime: '15 seconds',
        icon: <Type className="w-4 h-4" />,
        action: handleTextGeneration
      });
    }

    if (!hasAnimations && elements.length > 0) {
      suggestions.push({
        id: 'add-animations',
        title: 'Animate Your Design',
        description: 'Add professional animations to increase engagement',
        confidence: 0.8,
        category: 'optimization',
        estimatedTime: '45 seconds',
        icon: <Zap className="w-4 h-4" />,
        action: handleAnimationGeneration
      });
    }

    // Trend-based suggestions
    suggestions.push({
      id: 'trending-style',
      title: 'Apply Trending Style',
      description: 'Update your design with current visual trends',
      confidence: 0.75,
      category: 'trend',
      estimatedTime: '1 minute',
      icon: <TrendingUp className="w-4 h-4" />,
      action: () => alert('Trending style application coming soon!')
    });

    setSmartSuggestions(suggestions);
  };

  const generateAIInsights = () => {
    const elements = currentDesign?.elements || [];
    const insights: AIInsight[] = [];

    if (elements.length === 0) {
      insights.push({
        id: 'empty-canvas',
        type: 'tip',
        title: 'Start with AI Generation',
        description: 'Your canvas is empty. Try generating an AI image or text to get started quickly.',
        confidence: 1.0,
        actionText: 'Generate Content',
        action: () => setActiveTab('generate')
      });
    }

    if (elements.length > 5) {
      insights.push({
        id: 'cluttered-design',
        type: 'warning',
        title: 'Design Complexity',
        description: 'Your design has many elements. Consider simplifying for better impact.',
        confidence: 0.7
      });
    }

    const textElements = elements.filter((el: any) => el.type === 'text');
    if (textElements.length > 0) {
      insights.push({
        id: 'optimize-text',
        type: 'opportunity',
        title: 'Text Optimization Available',
        description: 'AI can analyze and improve your text for better conversion rates.',
        confidence: 0.8,
        actionText: 'Analyze Text',
        action: handleContentAnalysis
      });
    }

    setInsights(insights);
  };

  // AI Assistant tabs configuration
  const tabs = [
    { id: 'generate', label: 'Generate', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'enhance', label: 'Enhance', icon: <Wand2 className="w-4 h-4" /> },
    { id: 'analyze', label: 'Analyze', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  // AI capabilities for each tab
  const capabilities = {
    generate: [
      {
        id: 'generate-image',
        title: 'AI Image Generation',
        description: 'Create stunning images from text descriptions',
        icon: <Image className="w-5 h-5" />,
        color: 'bg-purple-500',
        action: 'generate-image'
      },
      {
        id: 'generate-text',
        title: 'Smart Copy Generation',
        description: 'Generate compelling headlines, descriptions, and CTAs',
        icon: <Type className="w-5 h-5" />,
        color: 'bg-blue-500',
        action: 'generate-text'
      },
      {
        id: 'generate-animation',
        title: 'Magic Animator',
        description: 'Create professional animations automatically',
        icon: <Zap className="w-5 h-5" />,
        color: 'bg-green-500',
        action: 'generate-animation'
      },
      {
        id: 'generate-variations',
        title: 'Design Variations',
        description: 'Create multiple versions of your design',
        icon: <RefreshCw className="w-5 h-5" />,
        color: 'bg-orange-500',
        action: 'generate-variations'
      }
    ],
    enhance: [
      {
        id: 'remove-background',
        title: 'Background Removal',
        description: 'Remove backgrounds with AI precision',
        icon: <Palette className="w-5 h-5" />,
        color: 'bg-red-500',
        action: 'remove-background'
      },
      {
        id: 'upscale-image',
        title: 'AI Upscaling',
        description: 'Enhance image quality and resolution',
        icon: <Upload className="w-5 h-5" />,
        color: 'bg-indigo-500',
        action: 'upscale-image'
      },
      {
        id: 'optimize-content',
        title: 'Content Optimization',
        description: 'Improve text for better conversion',
        icon: <Target className="w-5 h-5" />,
        color: 'bg-teal-500',
        action: 'optimize-content'
      },
      {
        id: 'smart-crop',
        title: 'Smart Cropping',
        description: 'Intelligently crop and resize images',
        icon: <Brain className="w-5 h-5" />,
        color: 'bg-pink-500',
        action: 'smart-crop'
      }
    ],
    analyze: [
      {
        id: 'content-analysis',
        title: 'Content Analysis',
        description: 'Analyze text effectiveness and readability',
        icon: <BarChart3 className="w-5 h-5" />,
        color: 'bg-yellow-500',
        action: 'analyze-content'
      },
      {
        id: 'design-feedback',
        title: 'Design Feedback',
        description: 'Get AI-powered design recommendations',
        icon: <Info className="w-5 h-5" />,
        color: 'bg-gray-500',
        action: 'design-feedback'
      },
      {
        id: 'performance-prediction',
        title: 'Performance Prediction',
        description: 'Predict how your design will perform',
        icon: <Target className="w-5 h-5" />,
        color: 'bg-cyan-500',
        action: 'performance-prediction'
      },
      {
        id: 'ab-test',
        title: 'A/B Test Generator',
        description: 'Create variations for testing',
        icon: <RefreshCw className="w-5 h-5" />,
        color: 'bg-violet-500',
        action: 'ab-test'
      }
    ]
  };

  // Add task to processing queue
  const addTask = (type: AITask['type'], title: string, description: string, icon: React.ReactNode, color: string): string => {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTask: AITask = {
      id,
      type,
      title,
      description,
      icon,
      color,
      status: 'idle',
      progress: 0
    };
    
    setTasks(prev => [...prev, newTask]);
    return id;
  };

  // Update task status
  const updateTask = (id: string, updates: Partial<AITask>) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  // Remove task
  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  // Handle AI image generation
  const handleImageGeneration = async () => {
    const prompt = window.prompt('Describe the image you want to generate:');
    if (!prompt) return;

    const style = window.prompt('Choose style (realistic, digital-art, 3d-model, anime, etc.):') || 'realistic';
    
    const taskId = addTask(
      'image',
      'Generating AI Image',
      `Creating: ${prompt}`,
      <Image className="w-4 h-4" />,
      'bg-purple-500'
    );

    try {
      updateTask(taskId, { status: 'processing' });
      setIsProcessing(true);

      const result = await aiService.generateImages({
        prompt,
        style: style as any,
        width: 1024,
        height: 1024,
        batch_size: 1
      });

      updateTask(taskId, { 
        status: 'completed', 
        result: result.images[0],
        progress: 100
      });

      if (onApplyResult) {
        onApplyResult(result.images[0], 'image');
      }

    } catch (error) {
      console.error('Image generation failed:', error);
      updateTask(taskId, { 
        status: 'error',
        result: { error: 'Failed to generate image. Please try again.' }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle text generation
  const handleTextGeneration = async () => {
    const context = window.prompt('What do you want to write about?');
    if (!context) return;

    const formatType = window.prompt('Choose format (headline, body, cta, etc.):') || 'headline';
    const tone = window.prompt('Choose tone (professional, casual, friendly, etc.):') || 'professional';

    const taskId = addTask(
      'text',
      'Generating Copy',
      `Creating ${formatType} about: ${context}`,
      <Type className="w-4 h-4" />,
      'bg-blue-500'
    );

    try {
      updateTask(taskId, { status: 'processing' });
      setIsProcessing(true);

      const result = await aiService.generateText({
        context,
        tone: tone as any,
        format_type: formatType as any,
        variation_count: 3
      });

      updateTask(taskId, { 
        status: 'completed', 
        result: result.variations,
        progress: 100
      });

      if (onApplyResult) {
        onApplyResult(result.variations, 'text');
      }

    } catch (error) {
      console.error('Text generation failed:', error);
      updateTask(taskId, { 
        status: 'error',
        result: { error: 'Failed to generate text. Please try again.' }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle background removal
  const handleBackgroundRemoval = async () => {
    if (!fileInputRef.current) return;
    
    fileInputRef.current.accept = 'image/*';
    fileInputRef.current.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // In a real implementation, you'd upload the file and get a URL
      const imageUrl = URL.createObjectURL(file);
      
      const taskId = addTask(
        'background',
        'Removing Background',
        `Processing: ${file.name}`,
        <Palette className="w-4 h-4" />,
        'bg-red-500'
      );

      try {
        updateTask(taskId, { status: 'processing' });
        setIsProcessing(true);

        // Note: In real implementation, you'd need to upload the file first
        // const result = await aiService.removeBackground({
        //   image_url: uploadedImageUrl,
        //   edge_refinement: true
        // });

        // For demo purposes, simulate processing
        await new Promise(resolve => setTimeout(resolve, 3000));

        updateTask(taskId, { 
          status: 'completed', 
          result: { result_url: imageUrl, original_url: imageUrl },
          progress: 100
        });

        if (onApplyResult) {
          onApplyResult({ result_url: imageUrl }, 'background');
        }

      } catch (error) {
        console.error('Background removal failed:', error);
        updateTask(taskId, { 
          status: 'error',
          result: { error: 'Failed to remove background. Please try again.' }
        });
      } finally {
        setIsProcessing(false);
      }
    };
    
    fileInputRef.current.click();
  };

  // Handle animation generation
  const handleAnimationGeneration = async () => {
    if (!currentDesign?.elements) {
      alert('Please select elements in your design first');
      return;
    }

    const style = window.prompt('Choose animation style (smooth, bouncy, dramatic, etc.):') || 'smooth';
    const purpose = window.prompt('Choose purpose (attention, engagement, conversion, etc.):') || 'engagement';

    const taskId = addTask(
      'animation',
      'Creating Animations',
      `Generating ${style} animations for ${purpose}`,
      <Zap className="w-4 h-4" />,
      'bg-green-500'
    );

    try {
      updateTask(taskId, { status: 'processing' });
      setIsProcessing(true);

      const result = await aiService.generateSmartAnimations({
        design_elements: currentDesign.elements,
        style: style as any,
        purpose: purpose as any,
        duration_seconds: 5.0
      });

      updateTask(taskId, { 
        status: 'completed', 
        result: result.animations,
        progress: 100
      });

      if (onApplyResult) {
        onApplyResult(result.animations, 'animation');
      }

    } catch (error) {
      console.error('Animation generation failed:', error);
      updateTask(taskId, { 
        status: 'error',
        result: { error: 'Failed to generate animations. Please try again.' }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle content analysis
  const handleContentAnalysis = async () => {
    const text = window.prompt('Enter text to analyze:');
    if (!text) return;

    const taskId = addTask(
      'analysis',
      'Analyzing Content',
      `Analyzing: ${text.substring(0, 50)}...`,
      <BarChart3 className="w-4 h-4" />,
      'bg-yellow-500'
    );

    try {
      updateTask(taskId, { status: 'processing' });
      setIsProcessing(true);

      const result = await aiService.analyzeContent({ text });

      updateTask(taskId, { 
        status: 'completed', 
        result,
        progress: 100
      });

      if (onApplyResult) {
        onApplyResult(result, 'analysis');
      }

    } catch (error) {
      console.error('Content analysis failed:', error);
      updateTask(taskId, { 
        status: 'error',
        result: { error: 'Failed to analyze content. Please try again.' }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle capability action
  const handleCapabilityAction = (action: string) => {
    switch (action) {
      case 'generate-image':
        handleImageGeneration();
        break;
      case 'generate-text':
        handleTextGeneration();
        break;
      case 'generate-animation':
        handleAnimationGeneration();
        break;
      case 'remove-background':
        handleBackgroundRemoval();
        break;
      case 'analyze-content':
        handleContentAnalysis();
        break;
      default:
        alert(`${action} feature coming soon!`);
    }
  };

  // Render task result
  const renderTaskResult = (task: AITask) => {
    if (task.status === 'error') {
      return (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          {task.result?.error || 'An error occurred'}
        </div>
      );
    }

    if (task.status !== 'completed' || !task.result) return null;

    switch (task.type) {
      case 'image':
        return (
          <div className="mt-2">
            <img 
              src={task.result.url} 
              alt="Generated" 
              className="w-full h-32 object-cover rounded border"
            />
            <button 
              onClick={() => onApplyResult?.(task.result, 'image')}
              className="mt-2 w-full px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
            >
              Apply to Design
            </button>
          </div>
        );

      case 'text':
        return (
          <div className="mt-2 space-y-2">
            {task.result.map((variation: any, index: number) => (
              <div key={index} className="p-2 bg-gray-50 rounded border">
                <p className="text-sm">{variation.text}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    Confidence: {Math.round(variation.confidence_score * 100)}%
                  </span>
                  <button 
                    onClick={() => onApplyResult?.(variation, 'text')}
                    className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                  >
                    Use This
                  </button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'analysis':
        return (
          <div className="mt-2 p-3 bg-gray-50 rounded border">
            <div className="text-sm space-y-2">
              <div>
                <strong>Overall Score:</strong> {Math.round(task.result.overall_score * 100)}%
              </div>
              <div>
                <strong>Readability:</strong> {Math.round(task.result.analysis.readability * 100)}%
              </div>
              <div>
                <strong>Conversion Potential:</strong> {Math.round(task.result.analysis.conversion_potential * 100)}%
              </div>
              {task.result.suggestions.length > 0 && (
                <div>
                  <strong>Suggestions:</strong>
                  <ul className="list-disc list-inside mt-1 text-xs">
                    {task.result.suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      
      {/* AI Assistant Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-white bg-opacity-20 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI Assistant</h2>
              <p className="text-sm text-purple-100">Powered by advanced AI</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className={`p-2 rounded-lg transition-colors ${
                showSuggestions ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-10'
              }`}
              title="Toggle Smart Suggestions"
            >
              <Lightbulb className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Smart Suggestions */}
        {showSuggestions && (smartSuggestions.length > 0 || insights.length > 0) && (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-b">
            {/* Quick Insights */}
            {insights.length > 0 && (
              <div className="p-4 border-b border-blue-100">
                <div className="flex items-center space-x-2 mb-3">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-900">AI Insights</h3>
                </div>
                <div className="space-y-2">
                  {insights.slice(0, 2).map((insight) => (
                    <div
                      key={insight.id}
                      className={`p-3 rounded-lg border-l-4 ${
                        insight.type === 'tip' ? 'bg-blue-50 border-blue-400' :
                        insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                        insight.type === 'opportunity' ? 'bg-green-50 border-green-400' :
                        'bg-purple-50 border-purple-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{insight.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                          <div className="flex items-center mt-2">
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 text-yellow-500" />
                              <span className="text-xs text-gray-500">
                                {Math.round(insight.confidence * 100)}% confidence
                              </span>
                            </div>
                          </div>
                        </div>
                        {insight.action && (
                          <button
                            onClick={insight.action}
                            className="ml-2 px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                          >
                            {insight.actionText || 'Apply'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Suggestions */}
            {smartSuggestions.length > 0 && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Magic className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-purple-900">Smart Suggestions</h3>
                  </div>
                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
                    {smartSuggestions.length} available
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {smartSuggestions.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={suggestion.action}
                      disabled={isProcessing}
                      className="flex items-center space-x-3 p-3 text-left bg-white rounded-lg border border-purple-100 hover:border-purple-200 hover:bg-purple-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      <div className={`p-2 rounded-lg ${
                        suggestion.category === 'design' ? 'bg-blue-100 text-blue-600' :
                        suggestion.category === 'content' ? 'bg-green-100 text-green-600' :
                        suggestion.category === 'optimization' ? 'bg-orange-100 text-orange-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {suggestion.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900">{suggestion.title}</h4>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{suggestion.estimatedTime}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{suggestion.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            suggestion.category === 'design' ? 'bg-blue-100 text-blue-700' :
                            suggestion.category === 'content' ? 'bg-green-100 text-green-700' :
                            suggestion.category === 'optimization' ? 'bg-orange-100 text-orange-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {suggestion.category}
                          </span>
                          <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-purple-500 transition-colors" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search and Tabs */}
        <div className="border-b bg-gray-50">
          {/* Search Bar */}
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search AI features..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-all relative ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white hover:bg-opacity-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-b" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Capabilities */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                {searchQuery ? 'Search Results' : 'Available AI Features'}
              </h3>
              {searchQuery && (
                <span className="text-xs text-gray-500">
                  {capabilities[activeTab].filter(cap => 
                    cap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    cap.description.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length} results
                </span>
              )}
            </div>
            
            <div className="space-y-3">
              {capabilities[activeTab]
                .filter(capability => 
                  !searchQuery || 
                  capability.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  capability.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((capability) => (
                <button
                  key={capability.id}
                  onClick={() => handleCapabilityAction(capability.action)}
                  disabled={isProcessing}
                  className="w-full p-4 text-left border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all group hover:shadow-md"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 ${capability.color} text-white rounded-xl transition-transform group-hover:scale-110`}>
                      {capability.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                          {capability.title}
                        </h4>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-all group-hover:translate-x-1" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                        {capability.description}
                      </p>
                      <div className="flex items-center mt-3 space-x-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {activeTab}
                        </span>
                        {isProcessing && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Processing
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* No results message */}
            {searchQuery && capabilities[activeTab].filter(cap => 
              cap.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              cap.description.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 && (
              <div className="text-center py-8">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No features found</h3>
                <p className="text-sm text-gray-500">Try searching with different terms</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-3 text-xs text-purple-600 hover:text-purple-500"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>

          {/* Active Tasks */}
          {tasks.length > 0 && (
            <div className="border-t bg-gray-50">
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  AI Tasks ({tasks.length})
                </h3>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-1 ${task.color} text-white rounded`}>
                            {task.icon}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                            <p className="text-xs text-gray-500">{task.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {task.status === 'processing' && (
                            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                          )}
                          {task.status === 'completed' && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                          {task.status === 'error' && (
                            <X className="w-4 h-4 text-red-500" />
                          )}
                          <button
                            onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            {expandedTask === task.id ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => removeTask(task.id)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      {task.status === 'processing' && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                      )}

                      {/* Task result */}
                      {expandedTask === task.id && renderTaskResult(task)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gradient-to-r from-gray-50 to-purple-50">
          <div className="p-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">
                  {tasks.filter(t => t.status === 'completed').length}
                </div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">
                  {tasks.filter(t => t.status === 'processing').length}
                </div>
                <div className="text-xs text-gray-500">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">
                  {capabilities[activeTab].length}
                </div>
                <div className="text-xs text-gray-500">Available</div>
              </div>
            </div>

            {/* AI Status */}
            <div className="flex items-center justify-center space-x-2 py-2 px-3 bg-white rounded-lg border">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600">AI Service Active</span>
              </div>
              <div className="w-px h-4 bg-gray-200"></div>
              <div className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-purple-500" />
                <span className="text-xs text-gray-600">Powered by Advanced AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
      />
    </>
  );
};

export default AIAssistant;