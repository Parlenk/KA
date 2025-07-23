import React, { useState } from 'react';
import { Wand2, Play, Settings, Zap, Clock, Layers } from 'lucide-react';

interface MagicAnimatorProps {
  canvasObjects: any[];
  onAnimationCreated: (animations: any[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface AnimationPreset {
  id: string;
  name: string;
  description: string;
  category: 'entry' | 'emphasis' | 'exit';
  duration: number;
  preview?: string;
}

const animationPresets: AnimationPreset[] = [
  {
    id: 'fadeIn',
    name: 'Fade In',
    description: 'Smooth opacity transition',
    category: 'entry',
    duration: 1000,
    preview: '0% → 100%'
  },
  {
    id: 'slideInLeft',
    name: 'Slide In Left',
    description: 'Slides from left side',
    category: 'entry',
    duration: 800,
    preview: '← →'
  },
  {
    id: 'slideInUp',
    name: 'Slide In Up',
    description: 'Slides from bottom',
    category: 'entry',
    duration: 800,
    preview: '↑'
  },
  {
    id: 'zoomIn',
    name: 'Zoom In',
    description: 'Scales from small to normal',
    category: 'entry',
    duration: 600,
    preview: '• ○'
  },
  {
    id: 'bounceIn',
    name: 'Bounce In',
    description: 'Bouncy entrance effect',
    category: 'entry',
    duration: 1000,
    preview: '↗↘↗'
  },
  {
    id: 'pulse',
    name: 'Pulse',
    description: 'Rhythmic scaling effect',
    category: 'emphasis',
    duration: 1000,
    preview: '○ ● ○'
  },
  {
    id: 'shake',
    name: 'Shake',
    description: 'Horizontal shake motion',
    category: 'emphasis',
    duration: 500,
    preview: '← → ←'
  },
  {
    id: 'bounce',
    name: 'Bounce',
    description: 'Vertical bounce effect',
    category: 'emphasis',
    duration: 1000,
    preview: '↑ ↓ ↑'
  },
];

const MagicAnimator: React.FC<MagicAnimatorProps> = ({
  canvasObjects,
  onAnimationCreated,
  isOpen,
  onClose,
}) => {
  const [animationStyle, setAnimationStyle] = useState('dynamic');
  const [duration, setDuration] = useState(5000);
  const [stagger, setStagger] = useState(true);
  const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAnimations, setGeneratedAnimations] = useState<any[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const animationStyles = [
    { id: 'dynamic', name: 'Dynamic', description: 'Energetic and attention-grabbing' },
    { id: 'elegant', name: 'Elegant', description: 'Smooth and sophisticated' },
    { id: 'playful', name: 'Playful', description: 'Fun and bouncy' },
    { id: 'professional', name: 'Professional', description: 'Clean and subtle' },
    { id: 'dramatic', name: 'Dramatic', description: 'Bold and impactful' },
  ];

  const generateMagicAnimation = async () => {
    if (selectedObjects.length === 0) {
      // Select all objects if none selected
      setSelectedObjects(canvasObjects.map(obj => obj.id));
    }

    setIsGenerating(true);
    try {
      const objectsToAnimate = canvasObjects.filter(obj => 
        selectedObjects.length === 0 || selectedObjects.includes(obj.id)
      );

      const response = await fetch('/api/ai/animate/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvas_objects: objectsToAnimate,
          duration,
          style: animationStyle,
          stagger
        }),
      });

      const data = await response.json();
      if (data.animations) {
        setGeneratedAnimations(data.animations);
      }
    } catch (error) {
      console.error('Magic animation generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyPreset = async () => {
    if (!selectedPreset || selectedObjects.length === 0) return;

    try {
      const animations = [];
      for (const objectId of selectedObjects) {
        const response = await fetch('/api/ai/animate/apply-preset', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            object_id: objectId,
            preset_id: selectedPreset,
            delay: animations.length * 200, // Stagger by 200ms
            duration: animationPresets.find(p => p.id === selectedPreset)?.duration || 1000
          }),
        });

        const data = await response.json();
        if (data) {
          animations.push(data);
        }
      }

      setGeneratedAnimations(animations);
    } catch (error) {
      console.error('Preset application failed:', error);
    }
  };

  const handleObjectSelect = (objectId: string) => {
    setSelectedObjects(prev => 
      prev.includes(objectId)
        ? prev.filter(id => id !== objectId)
        : [...prev, objectId]
    );
  };

  const handleSelectAll = () => {
    if (selectedObjects.length === canvasObjects.length) {
      setSelectedObjects([]);
    } else {
      setSelectedObjects(canvasObjects.map(obj => obj.id));
    }
  };

  const handleApplyAnimations = () => {
    onAnimationCreated(generatedAnimations);
    onClose();
  };

  const previewAnimation = () => {
    setShowPreview(true);
    // Simulate preview
    setTimeout(() => setShowPreview(false), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <Wand2 className="w-6 h-6 text-pink-600" />
              <div>
                <h2 className="text-xl font-semibold">Magic Animator</h2>
                <p className="text-sm text-gray-600">AI-powered animation generation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="flex h-[calc(90vh-80px)]">
            {/* Controls Panel */}
            <div className="w-1/3 p-6 border-r overflow-y-auto">
              <div className="space-y-6">
                {/* Object Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium">
                      Select Objects to Animate
                    </label>
                    <button
                      onClick={handleSelectAll}
                      className="text-xs text-pink-600 hover:text-pink-700"
                    >
                      {selectedObjects.length === canvasObjects.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {canvasObjects.map((obj, index) => (
                      <label
                        key={obj.id}
                        className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedObjects.includes(obj.id)}
                          onChange={() => handleObjectSelect(obj.id)}
                          className="rounded"
                        />
                        <Layers className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {obj.type} {index + 1}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Animation Style */}
                <div>
                  <label className="block text-sm font-medium mb-2">Animation Style</label>
                  <div className="space-y-2">
                    {animationStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setAnimationStyle(style.id)}
                        className={`w-full p-3 text-left rounded-lg border transition-all ${
                          animationStyle === style.id
                            ? 'border-pink-500 bg-pink-50 text-pink-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{style.name}</div>
                        <div className="text-xs text-gray-500">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Duration ({duration / 1000}s)
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="500"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={stagger}
                      onChange={(e) => setStagger(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Stagger animations</span>
                  </label>
                </div>

                {/* Magic Generate Button */}
                <button
                  onClick={generateMagicAnimation}
                  disabled={isGenerating || canvasObjects.length === 0}
                  className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Generate Magic Animation
                    </>
                  )}
                </button>

                {/* Preset Section */}
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-3">Or Choose a Preset</h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">Animation Preset</label>
                    <select
                      value={selectedPreset}
                      onChange={(e) => setSelectedPreset(e.target.value)}
                      className="w-full p-2 border rounded-lg mb-3"
                    >
                      <option value="">Select a preset...</option>
                      {animationPresets.map((preset) => (
                        <option key={preset.id} value={preset.id}>
                          {preset.name} - {preset.description}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={applyPreset}
                      disabled={!selectedPreset || selectedObjects.length === 0}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Apply Preset
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="flex-1 p-6">
              {generatedAnimations.length > 0 ? (
                <div className="h-full flex flex-col">
                  {/* Animation List */}
                  <div className="flex-1 mb-4">
                    <h3 className="font-medium mb-3">Generated Animations</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {generatedAnimations.map((animation, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              Object: {animation.object_id}
                            </span>
                            <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded">
                              {animation.type}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {animation.keyframes?.length || 0} keyframes
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Visualization */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Animation Timeline
                    </h4>
                    <div className="relative h-8 bg-white rounded border">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded" 
                           style={{ width: '100%' }}>
                        <div className="h-full flex items-center justify-center text-white text-xs font-medium">
                          {duration / 1000}s
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={previewAnimation}
                      className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={handleApplyAnimations}
                      className="flex-1 bg-pink-600 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Wand2 className="w-4 h-4" />
                      Apply to Design
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Wand2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="mb-2">Select objects and click Generate Magic Animation</p>
                    <p className="text-sm">AI will create beautiful animations automatically</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preview Overlay */}
          {showPreview && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
              <div className="text-white text-center">
                <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium">Previewing Animation...</p>
                <p className="text-sm opacity-75">Watch your design come to life</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MagicAnimator;