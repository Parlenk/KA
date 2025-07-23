import React, { useState } from 'react';
import { ArrowUp, Upload, Download, Zap } from 'lucide-react';

interface ImageUpscalerProps {
  onImageProcessed: (imageUrl: string, imageData: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ImageUpscaler: React.FC<ImageUpscalerProps> = ({
  onImageProcessed,
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [upscaledImage, setUpscaledImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState(2);
  const [faceEnhance, setFaceEnhance] = useState(false);
  const [denoise, setDenoise] = useState(false);
  const [sharpen, setSharpen] = useState(false);
  const [originalDimensions, setOriginalDimensions] = useState<{width: number, height: number} | null>(null);
  const [upscaledDimensions, setUpscaledDimensions] = useState<{width: number, height: number} | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      // Create preview and get dimensions
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setOriginalDimensions({ width: img.width, height: img.height });
        };
        img.src = e.target?.result as string;
        setOriginalImage(e.target?.result as string);
        setUpscaledImage(null);
        setUpscaledDimensions(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const upscaleImage = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('scale', scale.toString());
      formData.append('face_enhance', faceEnhance.toString());
      formData.append('denoise', denoise.toString());
      formData.append('sharpen', sharpen.toString());
      formData.append('output_format', 'PNG');

      const response = await fetch('/api/ai/upscale/upscale-file', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.image_data) {
        const upscaledUrl = `data:image/png;base64,${data.image_data}`;
        setUpscaledImage(upscaledUrl);
        setUpscaledDimensions({
          width: data.upscaled_width,
          height: data.upscaled_height
        });
      }
    } catch (error) {
      console.error('Image upscaling failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseImage = () => {
    if (upscaledImage) {
      const base64Data = upscaledImage.split(',')[1];
      onImageProcessed(upscaledImage, base64Data);
      onClose();
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setOriginalImage(null);
    setUpscaledImage(null);
    setOriginalDimensions(null);
    setUpscaledDimensions(null);
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
              <ArrowUp className="w-6 h-6 text-orange-600" />
              <div>
                <h2 className="text-xl font-semibold">AI Image Upscaler</h2>
                <p className="text-sm text-gray-600">Enhance image quality and resolution</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="p-6">
            {!selectedFile ? (
              /* Upload Area */
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-orange-400 transition-colors">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Upload an image to upscale</h3>
                  <p className="text-gray-600 mb-4">
                    Supports JPG, PNG, GIF up to 5MB
                  </p>
                  <div className="bg-orange-600 text-white px-6 py-2 rounded-lg inline-block hover:bg-orange-700 transition-colors">
                    Choose File
                  </div>
                </label>
              </div>
            ) : (
              /* Processing Interface */
              <div className="space-y-6">
                {/* Settings */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3">Upscaling Options</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Scale Factor</label>
                      <select
                        value={scale}
                        onChange={(e) => setScale(Number(e.target.value))}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value={2}>2x (Recommended)</option>
                        <option value={3}>3x</option>
                        <option value={4}>4x (Slow)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="face-enhance"
                        checked={faceEnhance}
                        onChange={(e) => setFaceEnhance(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="face-enhance" className="text-sm">
                        Face enhancement
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="denoise"
                        checked={denoise}
                        onChange={(e) => setDenoise(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="denoise" className="text-sm">
                        Reduce noise
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="sharpen"
                        checked={sharpen}
                        onChange={(e) => setSharpen(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="sharpen" className="text-sm">
                        Sharpen details
                      </label>
                    </div>
                  </div>
                </div>

                {/* Image Comparison */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Original */}
                  <div>
                    <h3 className="font-medium mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ArrowUp className="w-4 h-4" />
                        Original
                      </span>
                      {originalDimensions && (
                        <span className="text-sm text-gray-500">
                          {originalDimensions.width} × {originalDimensions.height}
                        </span>
                      )}
                    </h3>
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      {originalImage && (
                        <img
                          src={originalImage}
                          alt="Original"
                          className="w-full h-full object-contain"
                        />
                      )}
                    </div>
                  </div>

                  {/* Upscaled */}
                  <div>
                    <h3 className="font-medium mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Upscaled ({scale}x)
                      </span>
                      {upscaledDimensions && (
                        <span className="text-sm text-gray-500">
                          {upscaledDimensions.width} × {upscaledDimensions.height}
                        </span>
                      )}
                    </h3>
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                      {upscaledImage ? (
                        <img
                          src={upscaledImage}
                          alt="Upscaled"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {isProcessing ? (
                            <div className="text-center">
                              <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-sm">Upscaling image...</p>
                              <p className="text-xs text-gray-500 mt-1">This may take a moment</p>
                            </div>
                          ) : (
                            <p className="text-sm">Click upscale to enhance image</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quality Comparison */}
                {originalDimensions && upscaledDimensions && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-800 mb-2">Enhancement Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Resolution increase:</span>
                        <div className="font-medium">
                          {Math.round((upscaledDimensions.width * upscaledDimensions.height) / (originalDimensions.width * originalDimensions.height) * 100)}% larger
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Actual scale:</span>
                        <div className="font-medium">
                          {(upscaledDimensions.width / originalDimensions.width).toFixed(1)}x
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Quality:</span>
                        <div className="font-medium text-green-600">Enhanced</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={upscaleImage}
                    disabled={isProcessing}
                    className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Upscale Image
                      </>
                    )}
                  </button>
                  
                  {upscaledImage && (
                    <button
                      onClick={handleUseImage}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Use Enhanced Image
                    </button>
                  )}
                  
                  <button
                    onClick={resetUpload}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageUpscaler;