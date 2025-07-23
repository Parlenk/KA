import React, { useState } from 'react';
import { Sparkles, Download, Copy, Shuffle, Wand2 } from 'lucide-react';

interface AIImageGeneratorProps {
  onImageGenerated: (imageUrl: string, imageData: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

interface GeneratedImage {
  url: string;
  data: string;
  width: number;
  height: number;
  index: number;
}

const imageStyles = [
  { id: 'realistic', name: 'Realistic', description: 'Photorealistic, high detail' },
  { id: 'digital-art', name: 'Digital Art', description: 'Digital art, concept art' },
  { id: '3d-model', name: '3D Model', description: '3D render, high quality' },
  { id: 'isometric', name: 'Isometric', description: 'Isometric view, clean design' },
  { id: 'pixel-art', name: 'Pixel Art', description: '8-bit style, retro gaming' },
  { id: 'anime', name: 'Anime', description: 'Anime style, manga' },
  { id: 'vaporwave', name: 'Vaporwave', description: 'Neon colors, retro futuristic' },
];

const AIImageGenerator: React.FC<AIImageGeneratorProps> = ({
  onImageGenerated,
  isOpen,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [numImages, setNumImages] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const generateImages = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          style: selectedStyle,
          negative_prompt: negativePrompt || undefined,
          width,
          height,
          num_images: numImages,
        }),
      });

      const data = await response.json();
      if (data.images) {
        setGeneratedImages(data.images);
        setSelectedImage(data.images[0]);
      }
    } catch (error) {
      console.error('Image generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageSelect = (image: GeneratedImage) => {
    setSelectedImage(image);
  };

  const handleUseImage = () => {
    if (selectedImage) {
      onImageGenerated(selectedImage.url, selectedImage.data);
      onClose();
    }
  };

  const enhancePrompt = async () => {
    if (!prompt.trim()) return;

    try {
      const response = await fetch('/api/ai/text/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Enhance this image generation prompt: ${prompt}`,
          tone: 'creative',
          max_length: 200,
          num_variations: 1,
        }),
      });

      const data = await response.json();
      if (data.variations && data.variations[0]) {
        setPrompt(data.variations[0].text);
      }
    } catch (error) {
      console.error('Prompt enhancement failed:', error);
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
              <Sparkles className="w-6 h-6 text-purple-600" />
              <div>
                <h2 className="text-xl font-semibold">AI Image Generator</h2>
                <p className="text-sm text-gray-600">Create stunning images with AI</p>
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
                {/* Prompt Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Describe your image
                  </label>
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="A beautiful landscape with mountains and a lake at sunset"
                      className="w-full h-24 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      onClick={enhancePrompt}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-purple-600"
                      title="Enhance prompt with AI"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Style Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {imageStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        className={`p-3 text-left rounded-lg border transition-all ${
                          selectedStyle === style.id
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm">{style.name}</div>
                        <div className="text-xs text-gray-500">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Width</label>
                    <select
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value={512}>512px</option>
                      <option value={768}>768px</option>
                      <option value={1024}>1024px</option>
                      <option value={1536}>1536px</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Height</label>
                    <select
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      className="w-full p-2 border rounded-lg"
                    >
                      <option value={512}>512px</option>
                      <option value={768}>768px</option>
                      <option value={1024}>1024px</option>
                      <option value={1536}>1536px</option>
                    </select>
                  </div>
                </div>

                {/* Number of Images */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of images ({numImages})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={numImages}
                    onChange={(e) => setNumImages(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Negative prompt (optional)
                  </label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="What to avoid (e.g., blurry, low quality)"
                    className="w-full h-16 p-3 border rounded-lg resize-none text-sm"
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={generateImages}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Images
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Panel */}
            <div className="flex-1 p-6">
              {generatedImages.length > 0 ? (
                <div className="h-full flex flex-col">
                  {/* Preview */}
                  <div className="flex-1 mb-4">
                    {selectedImage && (
                      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                        <img
                          src={`data:image/png;base64,${selectedImage.data}`}
                          alt="Generated"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Thumbnails */}
                  <div className="flex gap-2 mb-4">
                    {generatedImages.map((image) => (
                      <button
                        key={image.index}
                        onClick={() => handleImageSelect(image)}
                        className={`w-16 h-16 border-2 rounded-lg overflow-hidden ${
                          selectedImage?.index === image.index
                            ? 'border-purple-500'
                            : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={`data:image/png;base64,${image.data}`}
                          alt={`Generated ${image.index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleUseImage}
                      disabled={!selectedImage}
                      className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Use This Image
                    </button>
                    <button
                      onClick={() => {
                        if (selectedImage) {
                          navigator.clipboard.writeText(selectedImage.url);
                        }
                      }}
                      disabled={!selectedImage}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={generateImages}
                      disabled={isGenerating}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>Enter a prompt and click Generate to create AI images</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIImageGenerator;