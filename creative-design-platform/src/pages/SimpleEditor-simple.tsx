import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { aiService } from '../services/aiService';

const SimpleEditor = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aiText, setAiText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [textPrompt, setTextPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState('professional');

  const tones = [
    'professional', 'friendly', 'confident', 'casual', 'formal',
    'optimistic', 'serious', 'humorous', 'emotional', 'assertive'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size from URL params or default
    const params = new URLSearchParams(window.location.search);
    const width = parseInt(params.get('width') || '800');
    const height = parseInt(params.get('height') || '600');
    
    canvas.width = width;
    canvas.height = height;

    // Draw a simple background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Your Ad Design Area', width / 2, height / 2 - 50);
    
    ctx.font = '16px Arial';
    ctx.fillText(`Canvas Size: ${width} × ${height}`, width / 2, height / 2);
    
    if (aiText) {
      ctx.font = '18px Arial';
      ctx.fillStyle = '#1e40af';
      const lines = aiText.split('\n');
      lines.forEach((line, index) => {
        ctx.fillText(line, width / 2, height / 2 + 50 + (index * 25));
      });
    }
  }, [aiText]);

  const generateAIText = async () => {
    if (!textPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await aiService.generateText({
        prompt: textPrompt,
        tone: selectedTone,
        max_length: 100,
        variations: 1
      });

      if (response.success && response.data?.texts[0]) {
        setAiText(response.data.texts[0]);
      } else {
        setAiText('Error generating text: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      setAiText('Error: Could not connect to AI service');
    }
    setIsGenerating(false);
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'kredivo-ad-design.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="text-xl font-bold text-gray-900">
              Kredivo Ads Center
            </Link>
            <div className="flex items-center space-x-4">
              <button 
                onClick={exportCanvas}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Export PNG
              </button>
              <Link 
                to="/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - AI Tools */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Assistant</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    What do you want to create?
                  </label>
                  <textarea
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="e.g., Write a compelling headline for a summer sale promotion"
                    className="w-full p-3 border border-gray-300 rounded-md resize-none h-20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tone
                  </label>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    {tones.map(tone => (
                      <option key={tone} value={tone}>
                        {tone.charAt(0).toUpperCase() + tone.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={generateAIText}
                  disabled={isGenerating || !textPrompt.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? 'Generating...' : 'Generate AI Text'}
                </button>

                {aiText && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Generated Text:</h3>
                    <p className="text-sm text-blue-800">{aiText}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tools</h2>
              <div className="space-y-2">
                <button className="w-full text-left p-2 text-gray-700 hover:bg-gray-50 rounded-md">
                  📝 Add Text
                </button>
                <button className="w-full text-left p-2 text-gray-700 hover:bg-gray-50 rounded-md">
                  🖼️ Add Image
                </button>
                <button className="w-full text-left p-2 text-gray-700 hover:bg-gray-50 rounded-md">
                  🎨 Background
                </button>
                <button className="w-full text-left p-2 text-gray-700 hover:bg-gray-50 rounded-md">
                  ⭕ Shapes
                </button>
              </div>
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Design Canvas</h2>
                <div className="text-sm text-gray-600">
                  Zoom: 100%
                </div>
              </div>
              
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="border border-gray-300 rounded-lg shadow-sm max-w-full h-auto"
                  style={{ maxHeight: '500px' }}
                />
              </div>

              <div className="flex justify-center space-x-4 mt-4">
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                  Undo
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                  Redo
                </button>
                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors">
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Properties</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Color
                  </label>
                  <input
                    type="color"
                    className="w-full h-10 border border-gray-300 rounded-md"
                    defaultValue="#f8fafc"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Canvas Size
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Width"
                      className="p-2 border border-gray-300 rounded-md text-sm"
                      defaultValue={new URLSearchParams(window.location.search).get('width') || '800'}
                    />
                    <input
                      type="number"
                      placeholder="Height"
                      className="p-2 border border-gray-300 rounded-md text-sm"
                      defaultValue={new URLSearchParams(window.location.search).get('height') || '600'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <select className="w-full p-2 border border-gray-300 rounded-md">
                    <option value="png">PNG</option>
                    <option value="jpg">JPG</option>
                    <option value="svg">SVG</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Layers</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <span className="text-sm text-blue-900">Background</span>
                  <div className="flex space-x-1">
                    <button className="text-blue-600 hover:text-blue-800">👁️</button>
                    <button className="text-blue-600 hover:text-blue-800">🔒</button>
                  </div>
                </div>
                {aiText && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-md">
                    <span className="text-sm text-gray-700">AI Text</span>
                    <div className="flex space-x-1">
                      <button className="text-gray-600 hover:text-gray-800">👁️</button>
                      <button className="text-gray-600 hover:text-gray-800">🔒</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleEditor;