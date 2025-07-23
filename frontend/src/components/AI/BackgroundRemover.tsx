import React, { useState } from 'react';
import { Scissors, Download, Upload, Wand2, Image as ImageIcon } from 'lucide-react';

interface BackgroundRemoverProps {
  onImageProcessed: (imageUrl: string, imageData: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const BackgroundRemover: React.FC<BackgroundRemoverProps> = ({
  onImageProcessed,
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<'auto' | 'person' | 'product' | 'object'>('auto');
  const [edgeRefinement, setEdgeRefinement] = useState(true);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImage(e.target?.result as string);
        setProcessedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBackground = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', processingType);
      formData.append('edge_refinement', edgeRefinement.toString());

      const response = await fetch('/api/ai/background/remove-file', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.image_data) {
        const processedUrl = `data:image/png;base64,${data.image_data}`;
        setProcessedImage(processedUrl);
      }
    } catch (error) {
      console.error('Background removal failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseImage = () => {
    if (processedImage) {
      // Extract base64 data
      const base64Data = processedImage.split(',')[1];
      onImageProcessed(processedImage, base64Data);
      onClose();
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setOriginalImage(null);
    setProcessedImage(null);
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
              <Scissors className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold">Background Remover</h2>
                <p className="text-sm text-gray-600">Remove backgrounds with AI precision</p>
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
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Upload an image</h3>
                  <p className="text-gray-600 mb-4">
                    Supports JPG, PNG, GIF up to 5MB
                  </p>
                  <div className="bg-blue-600 text-white px-6 py-2 rounded-lg inline-block hover:bg-blue-700 transition-colors">
                    Choose File
                  </div>
                </label>
              </div>
            ) : (
              /* Processing Interface */
              <div className="space-y-6">
                {/* Settings */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-3">Processing Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Subject Type</label>
                      <select
                        value={processingType}
                        onChange={(e) => setProcessingType(e.target.value as any)}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="auto">Auto Detect</option>
                        <option value="person">Person</option>
                        <option value="product">Product</option>
                        <option value="object">Object</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edge-refinement"
                        checked={edgeRefinement}
                        onChange={(e) => setEdgeRefinement(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="edge-refinement" className="text-sm">
                        Edge refinement
                      </label>
                    </div>
                  </div>
                </div>

                {/* Image Comparison */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Original */}
                  <div>
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Original
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

                  {/* Processed */}
                  <div>
                    <h3 className="font-medium mb-2 flex items-center gap-2">
                      <Scissors className="w-4 h-4" />
                      Background Removed
                    </h3>
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                      {processedImage ? (
                        <img
                          src={processedImage}
                          alt="Processed"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {isProcessing ? (
                            <div className="text-center">
                              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-sm">Processing...</p>
                            </div>
                          ) : (
                            <p className="text-sm">Click process to remove background</p>
                          )}
                        </div>
                      )}
                      
                      {/* Transparency checker pattern */}
                      <div className="absolute inset-0 -z-10" style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3e%3cg fill='%23f3f4f6' fill-rule='evenodd'%3e%3cpath d='m0 0h10v10h-10zm10 10h10v10h-10z'/%3e%3c/g%3e%3c/svg%3e")`,
                        backgroundSize: '20px 20px'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={removeBackground}
                    disabled={isProcessing}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Remove Background
                      </>
                    )}
                  </button>
                  
                  {processedImage && (
                    <button
                      onClick={handleUseImage}
                      className="flex-1 bg-green-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Use This Image
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

export default BackgroundRemover;