/**
 * Advanced Text Tools
 * Curved text, text effects, variable fonts, and advanced typography
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { fabric } from 'fabric';

export interface TextEffect {
  type: 'shadow' | 'glow' | 'outline' | 'gradient' | 'pattern';
  enabled: boolean;
  settings: any;
}

export interface CurvedTextOptions {
  text: string;
  radius: number;
  startAngle: number;
  endAngle: number;
  reversed: boolean;
  fontSize: number;
  fontFamily: string;
  fill: string;
  effects: TextEffect[];
}

export interface AdvancedTextToolsProps {
  canvas: fabric.Canvas | null;
  onTextCreated?: (text: fabric.Object) => void;
}

export const AdvancedTextTools: React.FC<AdvancedTextToolsProps> = ({ canvas, onTextCreated }) => {
  const [activeTab, setActiveTab] = useState<'curved' | 'effects' | 'typography'>('curved');
  const [selectedObject, setSelectedObject] = useState<fabric.Text | fabric.Group | null>(null);
  
  // Curved text options
  const [curvedTextOptions, setCurvedTextOptions] = useState<CurvedTextOptions>({
    text: 'Curved Text Example',
    radius: 100,
    startAngle: 0,
    endAngle: 180,
    reversed: false,
    fontSize: 24,
    fontFamily: 'Arial',
    fill: '#000000',
    effects: []
  });

  // Text effects
  const [textEffects, setTextEffects] = useState<TextEffect[]>([
    {
      type: 'shadow',
      enabled: false,
      settings: {
        color: '#000000',
        blur: 5,
        offsetX: 3,
        offsetY: 3,
        opacity: 0.5
      }
    },
    {
      type: 'glow',
      enabled: false,
      settings: {
        color: '#ffffff',
        blur: 10,
        opacity: 0.8
      }
    },
    {
      type: 'outline',
      enabled: false,
      settings: {
        color: '#000000',
        width: 2
      }
    },
    {
      type: 'gradient',
      enabled: false,
      settings: {
        type: 'linear',
        colors: ['#ff0000', '#0000ff'],
        angle: 0
      }
    }
  ]);

  // Variable font settings
  const [variableFontSettings, setVariableFontSettings] = useState({
    weight: 400,
    width: 100,
    slant: 0,
    opticalSize: 14
  });

  // Typography settings
  const [typographySettings, setTypographySettings] = useState({
    letterSpacing: 0,
    lineHeight: 1.2,
    textAlign: 'left' as 'left' | 'center' | 'right' | 'justify',
    textTransform: 'none' as 'none' | 'uppercase' | 'lowercase' | 'capitalize',
    textDecoration: 'none' as 'none' | 'underline' | 'line-through',
    fontStyle: 'normal' as 'normal' | 'italic' | 'oblique',
    fontWeight: 'normal' as 'normal' | 'bold' | 'lighter' | 'bolder'
  });

  const createCurvedText = useCallback(() => {
    if (!canvas) return;

    const { text, radius, startAngle, endAngle, reversed, fontSize, fontFamily, fill } = curvedTextOptions;
    
    // Calculate text positions along the curve
    const angleRange = endAngle - startAngle;
    const textLength = text.length;
    const angleStep = (angleRange * Math.PI / 180) / (textLength - 1);
    
    const group = new fabric.Group([], {
      selectable: true,
      hasControls: true,
      hasBorders: true,
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
      cornerColor: '#2563eb',
      borderColor: '#2563eb'
    });

    // Create individual characters
    for (let i = 0; i < textLength; i++) {
      const char = text[i];
      if (char === ' ') continue; // Skip spaces
      
      const angle = (startAngle * Math.PI / 180) + (i * angleStep);
      const adjustedAngle = reversed ? -angle : angle;
      
      const x = radius * Math.cos(adjustedAngle);
      const y = radius * Math.sin(adjustedAngle);
      
      const charText = new fabric.Text(char, {
        fontSize,
        fontFamily,
        fill,
        left: x,
        top: y,
        originX: 'center',
        originY: 'center',
        angle: (adjustedAngle * 180 / Math.PI) + (reversed ? 180 : 0)
      });
      
      group.addWithUpdate(charText);
    }

    // Add custom controls for curve editing
    (group as any).controls = {
      ...group.controls,
      'editCurve': new fabric.Control({
        x: 0,
        y: -0.5,
        offsetY: -20,
        cursorStyle: 'pointer',
        mouseUpHandler: () => {
          // Open curve editing dialog
          return true;
        },
        render: (ctx: CanvasRenderingContext2D, left: number, top: number) => {
          const size = 20;
          ctx.save();
          ctx.fillStyle = '#2563eb';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(left, top, size / 2, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('C', left, top + 4);
          ctx.restore();
        }
      })
    };

    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();

    if (onTextCreated) {
      onTextCreated(group);
    }
  }, [canvas, curvedTextOptions, onTextCreated]);

  const applyTextEffects = useCallback((textObj: fabric.Text) => {
    if (!textObj) return;

    const activeEffects = textEffects.filter(effect => effect.enabled);
    
    // Clear existing effects
    textObj.shadow = null;
    textObj.stroke = '';
    textObj.strokeWidth = 0;

    activeEffects.forEach(effect => {
      switch (effect.type) {
        case 'shadow':
          textObj.shadow = new fabric.Shadow({
            color: effect.settings.color,
            blur: effect.settings.blur,
            offsetX: effect.settings.offsetX,
            offsetY: effect.settings.offsetY
          });
          break;
          
        case 'glow':
          // Glow effect using shadow with no offset
          textObj.shadow = new fabric.Shadow({
            color: effect.settings.color,
            blur: effect.settings.blur,
            offsetX: 0,
            offsetY: 0
          });
          break;
          
        case 'outline':
          textObj.stroke = effect.settings.color;
          textObj.strokeWidth = effect.settings.width;
          textObj.strokeLineJoin = 'round';
          textObj.strokeLineCap = 'round';
          break;
          
        case 'gradient':
          const gradient = new fabric.Gradient({
            type: effect.settings.type,
            coords: {
              x1: 0,
              y1: 0,
              x2: textObj.width || 100,
              y2: effect.settings.type === 'linear' ? 0 : textObj.height || 100
            },
            colorStops: effect.settings.colors.map((color: string, index: number) => ({
              offset: index / (effect.settings.colors.length - 1),
              color
            }))
          });
          textObj.fill = gradient;
          break;
      }
    });

    canvas?.renderAll();
  }, [textEffects, canvas]);

  const createTextWithEffects = useCallback(() => {
    if (!canvas) return;

    const textObj = new fabric.Text('Styled Text', {
      fontSize: 48,
      fontFamily: 'Arial',
      fill: '#000000',
      left: 100,
      top: 100,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      cornerStyle: 'circle',
      cornerSize: 8,
      transparentCorners: false,
      cornerColor: '#2563eb',
      borderColor: '#2563eb'
    });

    // Apply current effects
    applyTextEffects(textObj);

    canvas.add(textObj);
    canvas.setActiveObject(textObj);
    canvas.renderAll();

    if (onTextCreated) {
      onTextCreated(textObj);
    }
  }, [canvas, applyTextEffects, onTextCreated]);

  const applyVariableFontSettings = useCallback((textObj: fabric.Text) => {
    if (!textObj) return;

    // Apply variable font settings
    const fontFeatures = [];
    
    if (variableFontSettings.weight !== 400) {
      fontFeatures.push(`'wght' ${variableFontSettings.weight}`);
    }
    
    if (variableFontSettings.width !== 100) {
      fontFeatures.push(`'wdth' ${variableFontSettings.width}`);
    }
    
    if (variableFontSettings.slant !== 0) {
      fontFeatures.push(`'slnt' ${variableFontSettings.slant}`);
    }

    // Apply typography settings
    (textObj as any).charSpacing = typographySettings.letterSpacing * 50; // Convert to fabric units
    textObj.lineHeight = typographySettings.lineHeight;
    textObj.textAlign = typographySettings.textAlign;
    
    // Apply text transformations
    let transformedText = textObj.text || '';
    switch (typographySettings.textTransform) {
      case 'uppercase':
        transformedText = transformedText.toUpperCase();
        break;
      case 'lowercase':
        transformedText = transformedText.toLowerCase();
        break;
      case 'capitalize':
        transformedText = transformedText.replace(/\b\w/g, l => l.toUpperCase());
        break;
    }
    
    if (transformedText !== textObj.text) {
      textObj.set('text', transformedText);
    }

    // Apply font style and weight
    textObj.fontStyle = typographySettings.fontStyle;
    textObj.fontWeight = typographySettings.fontWeight;

    canvas?.renderAll();
  }, [variableFontSettings, typographySettings, canvas]);

  const updateEffect = (effectType: string, settings: any) => {
    setTextEffects(prev => prev.map(effect => 
      effect.type === effectType 
        ? { ...effect, settings: { ...effect.settings, ...settings } }
        : effect
    ));
  };

  const toggleEffect = (effectType: string) => {
    setTextEffects(prev => prev.map(effect => 
      effect.type === effectType 
        ? { ...effect, enabled: !effect.enabled }
        : effect
    ));
  };

  // Listen for text selection changes
  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const activeObject = canvas.getActiveObject();
      if (activeObject && (activeObject.type === 'text' || activeObject.type === 'group')) {
        setSelectedObject(activeObject as fabric.Text | fabric.Group);
      } else {
        setSelectedObject(null);
      }
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', () => setSelectedObject(null));

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', () => setSelectedObject(null));
    };
  }, [canvas]);

  // Apply effects when they change and there's a selected text object
  useEffect(() => {
    if (selectedObject && selectedObject.type === 'text') {
      applyTextEffects(selectedObject as fabric.Text);
    }
  }, [textEffects, selectedObject, applyTextEffects]);

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'curved', label: 'Curved Text', icon: '🌙' },
          { id: 'effects', label: 'Text Effects', icon: '✨' },
          { id: 'typography', label: 'Typography', icon: '🔤' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Curved Text Tab */}
      {activeTab === 'curved' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Curved Text Settings</h3>
            <button
              onClick={createCurvedText}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Curved Text
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Text Content</label>
              <input
                type="text"
                value={curvedTextOptions.text}
                onChange={(e) => setCurvedTextOptions(prev => ({ ...prev, text: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your text"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Font Family</label>
              <select
                value={curvedTextOptions.fontFamily}
                onChange={(e) => setCurvedTextOptions(prev => ({ ...prev, fontFamily: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Arial">Arial</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
                <option value="Impact">Impact</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Radius</label>
              <input
                type="range"
                min="50"
                max="300"
                value={curvedTextOptions.radius}
                onChange={(e) => setCurvedTextOptions(prev => ({ ...prev, radius: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{curvedTextOptions.radius}px</span>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Start Angle</label>
              <input
                type="range"
                min="0"
                max="360"
                value={curvedTextOptions.startAngle}
                onChange={(e) => setCurvedTextOptions(prev => ({ ...prev, startAngle: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{curvedTextOptions.startAngle}°</span>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">End Angle</label>
              <input
                type="range"
                min="0"
                max="360"
                value={curvedTextOptions.endAngle}
                onChange={(e) => setCurvedTextOptions(prev => ({ ...prev, endAngle: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{curvedTextOptions.endAngle}°</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Font Size</label>
              <input
                type="range"
                min="12"
                max="72"
                value={curvedTextOptions.fontSize}
                onChange={(e) => setCurvedTextOptions(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{curvedTextOptions.fontSize}px</span>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-2">Color</label>
              <input
                type="color"
                value={curvedTextOptions.fill}
                onChange={(e) => setCurvedTextOptions(prev => ({ ...prev, fill: e.target.value }))}
                className="w-full h-10 rounded border"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={curvedTextOptions.reversed}
                  onChange={(e) => setCurvedTextOptions(prev => ({ ...prev, reversed: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">Reverse Direction</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Text Effects Tab */}
      {activeTab === 'effects' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-900">Text Effects</h3>
            <button
              onClick={createTextWithEffects}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Styled Text
            </button>
          </div>

          {/* Shadow Effect */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={textEffects.find(e => e.type === 'shadow')?.enabled || false}
                  onChange={() => toggleEffect('shadow')}
                  className="mr-2"
                />
                <span className="font-medium">Drop Shadow</span>
              </label>
            </div>

            {textEffects.find(e => e.type === 'shadow')?.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Color</label>
                  <input
                    type="color"
                    value={textEffects.find(e => e.type === 'shadow')?.settings.color || '#000000'}
                    onChange={(e) => updateEffect('shadow', { color: e.target.value })}
                    className="w-full h-8 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Blur</label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={textEffects.find(e => e.type === 'shadow')?.settings.blur || 5}
                    onChange={(e) => updateEffect('shadow', { blur: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Offset X</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={textEffects.find(e => e.type === 'shadow')?.settings.offsetX || 3}
                    onChange={(e) => updateEffect('shadow', { offsetX: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Offset Y</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={textEffects.find(e => e.type === 'shadow')?.settings.offsetY || 3}
                    onChange={(e) => updateEffect('shadow', { offsetY: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Glow Effect */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={textEffects.find(e => e.type === 'glow')?.enabled || false}
                  onChange={() => toggleEffect('glow')}
                  className="mr-2"
                />
                <span className="font-medium">Glow</span>
              </label>
            </div>

            {textEffects.find(e => e.type === 'glow')?.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Color</label>
                  <input
                    type="color"
                    value={textEffects.find(e => e.type === 'glow')?.settings.color || '#ffffff'}
                    onChange={(e) => updateEffect('glow', { color: e.target.value })}
                    className="w-full h-8 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Intensity</label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={textEffects.find(e => e.type === 'glow')?.settings.blur || 10}
                    onChange={(e) => updateEffect('glow', { blur: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Outline Effect */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={textEffects.find(e => e.type === 'outline')?.enabled || false}
                  onChange={() => toggleEffect('outline')}
                  className="mr-2"
                />
                <span className="font-medium">Outline</span>
              </label>
            </div>

            {textEffects.find(e => e.type === 'outline')?.enabled && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Color</label>
                  <input
                    type="color"
                    value={textEffects.find(e => e.type === 'outline')?.settings.color || '#000000'}
                    onChange={(e) => updateEffect('outline', { color: e.target.value })}
                    className="w-full h-8 rounded border"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Width</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={textEffects.find(e => e.type === 'outline')?.settings.width || 2}
                    onChange={(e) => updateEffect('outline', { width: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Typography Tab */}
      {activeTab === 'typography' && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Advanced Typography</h3>

          {selectedObject ? (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              Selected text object will be updated in real-time
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              Select a text object to apply typography settings
            </div>
          )}

          {/* Variable Font Settings */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium mb-3">Variable Font Settings</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Weight</label>
                <input
                  type="range"
                  min="100"
                  max="900"
                  step="100"
                  value={variableFontSettings.weight}
                  onChange={(e) => setVariableFontSettings(prev => ({ ...prev, weight: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{variableFontSettings.weight}</span>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Width</label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={variableFontSettings.width}
                  onChange={(e) => setVariableFontSettings(prev => ({ ...prev, width: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{variableFontSettings.width}%</span>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Slant</label>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  value={variableFontSettings.slant}
                  onChange={(e) => setVariableFontSettings(prev => ({ ...prev, slant: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{variableFontSettings.slant}°</span>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Optical Size</label>
                <input
                  type="range"
                  min="8"
                  max="144"
                  value={variableFontSettings.opticalSize}
                  onChange={(e) => setVariableFontSettings(prev => ({ ...prev, opticalSize: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{variableFontSettings.opticalSize}pt</span>
              </div>
            </div>
          </div>

          {/* Typography Controls */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium mb-3">Typography Controls</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Letter Spacing</label>
                <input
                  type="range"
                  min="-5"
                  max="10"
                  step="0.1"
                  value={typographySettings.letterSpacing}
                  onChange={(e) => setTypographySettings(prev => ({ ...prev, letterSpacing: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{typographySettings.letterSpacing}em</span>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Line Height</label>
                <input
                  type="range"
                  min="0.8"
                  max="3"
                  step="0.1"
                  value={typographySettings.lineHeight}
                  onChange={(e) => setTypographySettings(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <span className="text-xs text-gray-500">{typographySettings.lineHeight}</span>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Text Align</label>
                <select
                  value={typographySettings.textAlign}
                  onChange={(e) => setTypographySettings(prev => ({ ...prev, textAlign: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Text Transform</label>
                <select
                  value={typographySettings.textTransform}
                  onChange={(e) => setTypographySettings(prev => ({ ...prev, textTransform: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                >
                  <option value="none">None</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                  <option value="capitalize">Capitalize</option>
                </select>
              </div>
            </div>
          </div>

          {selectedObject && (
            <button
              onClick={() => applyVariableFontSettings(selectedObject as fabric.Text)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Apply Typography Settings
            </button>
          )}
        </div>
      )}
    </div>
  );
};