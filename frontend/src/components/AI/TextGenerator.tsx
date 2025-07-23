import React, { useState } from 'react';
import { Type, Copy, RefreshCw, Wand2, Globe } from 'lucide-react';

interface TextGeneratorProps {
  onTextGenerated: (text: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface GeneratedText {
  text: string;
  tone: string;
  index: number;
  word_count: number;
  character_count: number;
}

const textTones = [
  { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' },
  { id: 'professional', name: 'Professional', description: 'Business-focused' },
  { id: 'casual', name: 'Casual', description: 'Relaxed and informal' },
  { id: 'confident', name: 'Confident', description: 'Bold and assured' },
  { id: 'optimistic', name: 'Optimistic', description: 'Positive and encouraging' },
  { id: 'serious', name: 'Serious', description: 'Thoughtful and formal' },
  { id: 'humorous', name: 'Humorous', description: 'Witty and entertaining' },
  { id: 'emotional', name: 'Emotional', description: 'Heartfelt and moving' },
];

const textTypes = [
  { id: 'headline', name: 'Headlines', description: 'Attention-grabbing titles' },
  { id: 'body', name: 'Body Copy', description: 'Detailed descriptions' },
  { id: 'cta', name: 'Call-to-Action', description: 'Action-driving phrases' },
  { id: 'tagline', name: 'Taglines', description: 'Memorable brand phrases' },
];

const TextGenerator: React.FC<TextGeneratorProps> = ({
  onTextGenerated,
  isOpen,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState('professional');
  const [selectedType, setSelectedType] = useState('headline');
  const [context, setContext] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [maxLength, setMaxLength] = useState(100);
  const [numVariations, setNumVariations] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTexts, setGeneratedTexts] = useState<GeneratedText[]>([]);
  const [selectedText, setSelectedText] = useState<GeneratedText | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translations, setTranslations] = useState<any[]>([]);

  const generateText = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/text/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          tone: selectedTone,
          type: selectedType,
          context: context || undefined,
          target_audience: targetAudience || undefined,
          max_length: maxLength,
          num_variations: numVariations,
        }),
      });

      const data = await response.json();
      if (data.variations) {
        setGeneratedTexts(data.variations);
        setSelectedText(data.variations[0]);
      }
    } catch (error) {
      console.error('Text generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const translateText = async (text: string) => {
    setShowTranslation(true);
    try {
      const response = await fetch('/api/ai/text/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          target_languages: ['es', 'fr', 'de', 'pt', 'it', 'ja', 'ko', 'zh'],
          source_language: 'en',
        }),
      });

      const data = await response.json();
      if (data.translations) {
        setTranslations(data.translations);
      }
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleUseText = () => {
    if (selectedText) {
      onTextGenerated(selectedText.text);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <Type className="w-6 h-6 text-green-600" />
              <div>
                <h2 className="text-xl font-semibold">AI Text Generator</h2>
                <p className="text-sm text-gray-600">Generate compelling copy with AI</p>
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
                {/* Content Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Content Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {textTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`p-3 text-left rounded-lg border transition-all ${
                          selectedType === type.id
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{type.name}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    What do you want to write about?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A revolutionary new productivity app that helps teams collaborate better"
                    className="w-full h-20 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {/* Tone Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Tone</label>
                  <select
                    value={selectedTone}
                    onChange={(e) => setSelectedTone(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    {textTones.map((tone) => (
                      <option key={tone.id} value={tone.id}>
                        {tone.name} - {tone.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Context */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Additional Context (optional)
                  </label>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="Industry: SaaS, Target: Business professionals, Key benefits: Save time, increase productivity"
                    className="w-full h-16 p-3 border rounded-lg resize-none text-sm"
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Target Audience (optional)
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="Small business owners, millennials, tech enthusiasts"
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Max Length
                    </label>
                    <input
                      type="number"
                      value={maxLength}
                      onChange={(e) => setMaxLength(Number(e.target.value))}
                      min="10"
                      max="500"
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Variations
                    </label>
                    <input
                      type="number"
                      value={numVariations}
                      onChange={(e) => setNumVariations(Number(e.target.value))}
                      min="1"
                      max="10"
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateText}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generate Text
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Panel */}
            <div className="flex-1 p-6">
              {generatedTexts.length > 0 ? (
                <div className="h-full flex flex-col">
                  {/* Generated Options */}
                  <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                    {generatedTexts.map((text, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedText?.index === text.index
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedText(text)}
                      >
                        <p className="font-medium mb-2">{text.text}</p>
                        <div className="text-xs text-gray-500 flex gap-4">
                          <span>{text.word_count} words</span>
                          <span>{text.character_count} characters</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(text.text);
                            }}
                            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copy
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              translateText(text.text);
                            }}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded flex items-center gap-1"
                          >
                            <Globe className="w-3 h-3" />
                            Translate
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleUseText}
                      disabled={!selectedText}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Type className="w-4 h-4" />
                      Use This Text
                    </button>
                    <button
                      onClick={generateText}
                      disabled={isGenerating}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Type className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Describe what you want to write and click Generate</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Translation Modal */}
          {showTranslation && (
            <div className="absolute inset-0 bg-white z-10">
              <div className="p-6 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">Translations</h3>
                <button
                  onClick={() => setShowTranslation(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="p-6 overflow-y-auto h-[calc(100%-80px)]">
                <div className="grid grid-cols-2 gap-4">
                  {translations.map((translation, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">
                          {translation.language.toUpperCase()}
                        </span>
                        <button
                          onClick={() => copyToClipboard(translation.text)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                        >
                          Copy
                        </button>
                      </div>
                      <p className={translation.rtl ? 'text-right' : 'text-left'}>
                        {translation.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TextGenerator;