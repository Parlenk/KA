import React, { useState } from 'react';
import { fabric } from 'fabric';

interface AIToolsPanelProps {
  canvas: fabric.Canvas | null;
  onAITaskComplete?: (result: any) => void;
}

export default function AIToolsPanel({ canvas, onAITaskComplete }: AIToolsPanelProps) {
  const [activeAITool, setActiveAITool] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // AI Image Generation
  const handleAIImageGeneration = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsProcessing(true);
    try {
      // Mock AI image generation - replace with actual API call
      const mockAIImage = 'https://picsum.photos/400/300?random=' + Date.now();
      
      // Add generated image to canvas
      if (canvas) {
        fabric.Image.fromURL(mockAIImage, (img) => {
          const centerX = canvas.width! / 2;
          const centerY = canvas.height! / 2;
          
          img.set({
            left: centerX - 200,
            top: centerY - 150,
            scaleX: 0.8,
            scaleY: 0.8,
          });
          
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        }, { crossOrigin: 'anonymous' });
      }
      
      setAiPrompt('');
      setActiveAITool(null);
      onAITaskComplete?.({ type: 'image_generation', success: true });
    } catch (error) {
      console.error('AI Image Generation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Background Removal
  const handleBackgroundRemoval = async () => {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || !(activeObject instanceof fabric.Image)) {
      alert('Please select an image first');
      return;
    }

    setIsProcessing(true);
    try {
      // Mock background removal - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Apply a filter to simulate background removal
      const filter = new fabric.Image.filters.RemoveColor({
        color: '#FFFFFF',
        distance: 0.2,
        useAlpha: true
      });
      
      (activeObject as fabric.Image).filters?.push(filter);
      (activeObject as fabric.Image).applyFilters();
      canvas?.renderAll();
      
      onAITaskComplete?.({ type: 'background_removal', success: true });
    } catch (error) {
      console.error('Background removal failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // AI Text Generation
  const handleAITextGeneration = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsProcessing(true);
    try {
      // Mock AI text generation - replace with actual API call
      const mockAITexts = [
        'Unlock Your Financial Future with Kredivo',
        'Smart Credit Solutions for Modern Living',
        'Your Trusted Partner in Financial Growth',
        'Experience the Future of Digital Banking',
        'Kredivo - Where Innovation Meets Finance'
      ];
      
      const generatedText = mockAITexts[Math.floor(Math.random() * mockAITexts.length)];
      
      // Add generated text to canvas
      if (canvas) {
        const centerX = canvas.width! / 2;
        const centerY = canvas.height! / 2;
        
        const textObj = new fabric.Text(generatedText, {
          left: centerX,
          top: centerY + 100,
          fontSize: 24,
          fill: '#4f46e5',
          fontWeight: 'bold',
          originX: 'center',
          originY: 'center',
          selectable: true,
          editable: true,
        });
        
        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        canvas.renderAll();
      }
      
      setAiPrompt('');
      setActiveAITool(null);
      onAITaskComplete?.({ type: 'text_generation', success: true });
    } catch (error) {
      console.error('AI Text Generation failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Smart Resize
  const handleSmartResize = async () => {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject) {
      alert('Please select an object first');
      return;
    }

    setIsProcessing(true);
    try {
      // Mock smart resize - replace with actual AI logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Apply intelligent scaling based on canvas dimensions
      const canvasAspectRatio = (canvas?.width || 1) / (canvas?.height || 1);
      const objectAspectRatio = activeObject.getScaledWidth() / activeObject.getScaledHeight();
      
      let newScale = 1;
      if (canvasAspectRatio > objectAspectRatio) {
        // Canvas is wider, scale based on height
        newScale = (canvas?.height || 1) * 0.4 / activeObject.getScaledHeight();
      } else {
        // Canvas is taller, scale based on width
        newScale = (canvas?.width || 1) * 0.4 / activeObject.getScaledWidth();
      }
      
      activeObject.set({
        scaleX: (activeObject.scaleX || 1) * newScale,
        scaleY: (activeObject.scaleY || 1) * newScale,
      });
      
      canvas?.renderAll();
      onAITaskComplete?.({ type: 'smart_resize', success: true });
    } catch (error) {
      console.error('Smart resize failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Image Upscaling
  const handleImageUpscaling = async () => {
    const activeObject = canvas?.getActiveObject();
    if (!activeObject || !(activeObject instanceof fabric.Image)) {
      alert('Please select an image first');
      return;
    }

    setIsProcessing(true);
    try {
      // Mock image upscaling - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate upscaling by improving quality and increasing size
      activeObject.set({
        scaleX: (activeObject.scaleX || 1) * 1.5,
        scaleY: (activeObject.scaleY || 1) * 1.5,
      });
      
      canvas?.renderAll();
      onAITaskComplete?.({ type: 'image_upscaling', success: true });
    } catch (error) {
      console.error('Image upscaling failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const styles = {
    container: {
      width: '300px',
      backgroundColor: 'white',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column' as 'column',
      height: '100%',
      fontFamily: 'system-ui, sans-serif',
      flexShrink: 0
    },
    header: {
      padding: '1rem',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f0f0ff'
    },
    title: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#4f46e5',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    content: {
      flex: 1,
      overflowY: 'auto' as 'auto',
      padding: '1rem'
    },
    aiTool: {
      marginBottom: '1rem',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      overflow: 'hidden'
    },
    aiToolHeader: {
      padding: '0.75rem',
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    aiToolTitle: {
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#374151',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    aiToolContent: {
      padding: '1rem',
      backgroundColor: 'white'
    },
    formGroup: {
      marginBottom: '0.75rem'
    },
    label: {
      display: 'block',
      fontSize: '0.75rem',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '0.25rem'
    },
    input: {
      width: '100%',
      padding: '0.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      backgroundColor: 'white'
    },
    textarea: {
      width: '100%',
      padding: '0.5rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      backgroundColor: 'white',
      resize: 'vertical' as 'vertical',
      minHeight: '60px'
    },
    button: {
      padding: '0.5rem 0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: 'white',
      width: '100%'
    },
    buttonPrimary: {
      backgroundColor: '#4f46e5',
      color: 'white',
      borderColor: '#4f46e5'
    },
    buttonDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed'
    },
    quickAction: {
      padding: '0.75rem',
      border: '1px solid #e5e7eb',
      borderRadius: '0.375rem',
      fontSize: '0.75rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: '#f9fafb',
      marginBottom: '0.5rem',
      textAlign: 'center' as 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    processingOverlay: {
      position: 'fixed' as 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      color: 'white',
      fontSize: '1.25rem',
      fontWeight: '600'
    }
  };

  return (
    <>
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            🤖 AI Tools
          </h3>
        </div>

        <div style={styles.content}>
          {/* Quick AI Actions */}
          <div style={styles.quickAction} onClick={handleBackgroundRemoval}>
            🎭 Remove Background
          </div>
          
          <div style={styles.quickAction} onClick={handleSmartResize}>
            📐 Smart Resize
          </div>
          
          <div style={styles.quickAction} onClick={handleImageUpscaling}>
            🔍 Upscale Image
          </div>

          {/* AI Image Generation */}
          <div style={styles.aiTool}>
            <div 
              style={styles.aiToolHeader}
              onClick={() => setActiveAITool(activeAITool === 'image' ? null : 'image')}
            >
              <div style={styles.aiToolTitle}>
                🎨 AI Image Generator
              </div>
              <div>{activeAITool === 'image' ? '−' : '+'}</div>
            </div>
            {activeAITool === 'image' && (
              <div style={styles.aiToolContent}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Describe your image:</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="A beautiful sunset over mountains..."
                    style={styles.textarea}
                  />
                </div>
                <button
                  style={{
                    ...styles.button,
                    ...styles.buttonPrimary,
                    ...((!aiPrompt.trim() || isProcessing) ? styles.buttonDisabled : {})
                  }}
                  onClick={handleAIImageGeneration}
                  disabled={!aiPrompt.trim() || isProcessing}
                >
                  {isProcessing ? 'Generating...' : 'Generate Image'}
                </button>
              </div>
            )}
          </div>

          {/* AI Text Generation */}
          <div style={styles.aiTool}>
            <div 
              style={styles.aiToolHeader}
              onClick={() => setActiveAITool(activeAITool === 'text' ? null : 'text')}
            >
              <div style={styles.aiToolTitle}>
                ✨ AI Copy Writer
              </div>
              <div>{activeAITool === 'text' ? '−' : '+'}</div>
            </div>
            {activeAITool === 'text' && (
              <div style={styles.aiToolContent}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>What kind of copy do you need?</label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Write a catchy headline for Kredivo credit card..."
                    style={styles.textarea}
                  />
                </div>
                <button
                  style={{
                    ...styles.button,
                    ...styles.buttonPrimary,
                    ...((!aiPrompt.trim() || isProcessing) ? styles.buttonDisabled : {})
                  }}
                  onClick={handleAITextGeneration}
                  disabled={!aiPrompt.trim() || isProcessing}
                >
                  {isProcessing ? 'Writing...' : 'Generate Copy'}
                </button>
              </div>
            )}
          </div>

          {/* AI Features Description */}
          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#f0f0ff', 
            borderRadius: '0.5rem', 
            fontSize: '0.75rem',
            color: '#4f46e5',
            marginTop: '1rem'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>🚀 AI-Powered Features:</div>
            <ul style={{ margin: 0, paddingLeft: '1rem' }}>
              <li>Generate images from text descriptions</li>
              <li>Remove backgrounds automatically</li>
              <li>Create compelling marketing copy</li>
              <li>Smart object resizing</li>
              <li>Enhance image quality</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div style={styles.processingOverlay}>
          <div>
            <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '1rem' }}>🤖</div>
            <div>AI is working its magic...</div>
          </div>
        </div>
      )}
    </>
  );
}