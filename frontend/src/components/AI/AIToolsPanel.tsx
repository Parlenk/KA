import React, { useState } from 'react';
import { 
  Sparkles, 
  Type, 
  Scissors, 
  ArrowUp, 
  Wand2, 
  Image as ImageIcon,
  Zap,
  Brain,
  Palette,
  Languages
} from 'lucide-react';

import AIImageGenerator from './AIImageGenerator';
import BackgroundRemover from './BackgroundRemover';
import TextGenerator from './TextGenerator';
import ImageUpscaler from './ImageUpscaler';
import MagicAnimator from './MagicAnimator';

interface AIToolsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onImageGenerated?: (url: string, data: string) => void;
  onTextGenerated?: (text: string) => void;
  onImageProcessed?: (url: string, data: string) => void;
  canvasObjects?: any[];
}

interface AITool {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: 'generate' | 'enhance' | 'automate';
  badge?: string;
  premium?: boolean;
}

const aiTools: AITool[] = [
  {
    id: 'image-generator',
    name: 'AI Image Generator',
    description: 'Create stunning images from text descriptions',
    icon: Sparkles,
    color: 'purple',
    category: 'generate',
    badge: 'Popular'
  },
  {
    id: 'text-generator',
    name: 'AI Copywriter',
    description: 'Generate compelling headlines, copy, and CTAs',
    icon: Type,
    color: 'green',
    category: 'generate',
    badge: 'New'
  },
  {
    id: 'background-remover',
    name: 'Background Remover',
    description: 'Remove backgrounds with precision',
    icon: Scissors,
    color: 'blue',
    category: 'enhance'
  },
  {
    id: 'image-upscaler',
    name: 'Image Upscaler',
    description: 'Enhance image quality and resolution',
    icon: ArrowUp,
    color: 'orange',
    category: 'enhance'
  },
  {
    id: 'magic-animator',
    name: 'Magic Animator',
    description: 'Auto-generate animations for your designs',
    icon: Wand2,
    color: 'pink',
    category: 'automate',
    badge: 'Beta'
  },
  {
    id: 'smart-resize',
    name: 'Smart Resize',
    description: 'Intelligently adapt designs to different sizes',
    icon: Zap,
    color: 'indigo',
    category: 'automate',
    premium: true
  },
  {
    id: 'brand-extractor',
    name: 'Brand Extractor',
    description: 'Extract brand colors and styles from websites',
    icon: Palette,
    color: 'teal',
    category: 'generate',
    premium: true
  },
  {
    id: 'translator',
    name: 'Multi-Language',
    description: 'Translate designs to 100+ languages',
    icon: Languages,
    color: 'red',
    category: 'enhance'
  }
];

const AIToolsPanel: React.FC<AIToolsPanelProps> = ({
  isOpen,
  onClose,
  onImageGenerated,
  onTextGenerated,
  onImageProcessed,
  canvasObjects
}) => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Tools', icon: Brain },
    { id: 'generate', name: 'Generate', icon: Sparkles },
    { id: 'enhance', name: 'Enhance', icon: ImageIcon },
    { id: 'automate', name: 'Automate', icon: Zap },
  ];

  const filteredTools = selectedCategory === 'all' 
    ? aiTools 
    : aiTools.filter(tool => tool.category === selectedCategory);

  const handleToolClick = (toolId: string) => {
    setActiveModal(toolId);
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
      green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
      blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
      orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
      pink: 'from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700',
      indigo: 'from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700',
      teal: 'from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
      red: 'from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.purple;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
          
          <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">AI Studio</h2>
                    <p className="text-purple-100">Supercharge your creativity with AI</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:text-purple-200 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 mt-6">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                        selectedCategory === category.id
                          ? 'bg-white bg-opacity-20 text-white'
                          : 'text-purple-200 hover:bg-white hover:bg-opacity-10'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tools Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.id}
                      className="relative group"
                    >
                      <button
                        onClick={() => handleToolClick(tool.id)}
                        disabled={tool.premium}
                        className={`w-full p-6 rounded-xl bg-gradient-to-br ${getColorClasses(tool.color)} text-white transform transition-all duration-200 group-hover:scale-105 group-hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <Icon className="w-8 h-8" />
                          {tool.badge && (
                            <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded-full">
                              {tool.badge}
                            </span>
                          )}
                          {tool.premium && (
                            <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full">
                              Pro
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-2 text-left">
                          {tool.name}
                        </h3>
                        <p className="text-sm opacity-90 text-left">
                          {tool.description}
                        </p>
                      </button>

                      {tool.premium && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="text-center text-white">
                            <div className="text-2xl mb-2">🔒</div>
                            <p className="text-sm">Available in Pro</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quick Actions */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-3">Quick Actions</h3>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1 bg-white border rounded-lg text-sm hover:bg-gray-50">
                    Generate Logo
                  </button>
                  <button className="px-3 py-1 bg-white border rounded-lg text-sm hover:bg-gray-50">
                    Write Headlines
                  </button>
                  <button className="px-3 py-1 bg-white border rounded-lg text-sm hover:bg-gray-50">
                    Remove Background
                  </button>
                  <button className="px-3 py-1 bg-white border rounded-lg text-sm hover:bg-gray-50">
                    Animate Design
                  </button>
                </div>
              </div>

              {/* Usage Stats */}
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">127</div>
                  <div className="text-sm text-blue-700">Images Generated</div>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">89</div>
                  <div className="text-sm text-green-700">Backgrounds Removed</div>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">245</div>
                  <div className="text-sm text-purple-700">Texts Generated</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tool Modals */}
      {activeModal === 'image-generator' && (
        <AIImageGenerator
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onImageGenerated={(url, data) => {
            onImageGenerated?.(url, data);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'text-generator' && (
        <TextGenerator
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onTextGenerated={(text) => {
            onTextGenerated?.(text);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'background-remover' && (
        <BackgroundRemover
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onImageProcessed={(url, data) => {
            onImageProcessed?.(url, data);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'image-upscaler' && (
        <ImageUpscaler
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onImageProcessed={(url, data) => {
            onImageProcessed?.(url, data);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'magic-animator' && (
        <MagicAnimator
          isOpen={true}
          onClose={() => setActiveModal(null)}
          canvasObjects={canvasObjects || []}
          onAnimationCreated={() => setActiveModal(null)}
        />
      )}
    </>
  );
};

export default AIToolsPanel;