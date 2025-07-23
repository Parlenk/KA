import React, { useState, useEffect } from 'react';
import { fabric } from 'fabric';
import { 
  Type, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  AlignJustify,
  Search,
  Star,
  Download
} from 'lucide-react';
import { 
  PROFESSIONAL_FONTS, 
  FONT_CATEGORIES, 
  FONT_PAIRINGS,
  googleFontsService,
  GoogleFont 
} from '../../services/googleFonts';

interface TypographyPanelProps {
  canvas: fabric.Canvas | null;
  selectedObjects: fabric.Object[];
  onObjectUpdate: (object: fabric.Object, properties: any) => void;
}

const TypographyPanel: React.FC<TypographyPanelProps> = ({
  canvas,
  selectedObjects,
  onObjectUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('RECOMMENDED');
  const [selectedFont, setSelectedFont] = useState<GoogleFont | null>(null);
  const [loadingFonts, setLoadingFonts] = useState<Set<string>>(new Set());

  // Get text objects from selected objects
  const textObjects = selectedObjects.filter(obj => 
    obj instanceof fabric.Text || obj instanceof fabric.Textbox
  ) as (fabric.Text | fabric.Textbox)[];

  const hasTextSelected = textObjects.length > 0;

  // Filter fonts based on search and category
  const filteredFonts = PROFESSIONAL_FONTS.filter(font => {
    const matchesSearch = font.family.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         font.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedCategory === 'ALL') return matchesSearch;
    
    const categoryFonts = FONT_CATEGORIES[selectedCategory as keyof typeof FONT_CATEGORIES]?.fonts || [];
    const matchesCategory = categoryFonts.includes(font);
    
    return matchesSearch && matchesCategory;
  });

  // Load font and apply to selected text objects
  const applyFont = async (font: GoogleFont) => {
    if (!hasTextSelected) return;

    setLoadingFonts(prev => new Set(prev.add(font.family)));

    try {
      // Load the font
      const loaded = await googleFontsService.loadFont(font.family, ['400', '600', '700']);
      
      if (loaded) {
        // Apply to all selected text objects
        textObjects.forEach(textObj => {
          textObj.set('fontFamily', font.family);
          onObjectUpdate(textObj, { fontFamily: font.family });
        });
        
        setSelectedFont(font);
        canvas?.renderAll();
      }
    } catch (error) {
      console.error('Failed to load font:', error);
    } finally {
      setLoadingFonts(prev => {
        const next = new Set(prev);
        next.delete(font.family);
        return next;
      });
    }
  };

  // Apply font weight
  const applyFontWeight = (weight: string) => {
    if (!hasTextSelected) return;
    
    textObjects.forEach(textObj => {
      textObj.set('fontWeight', weight);
      onObjectUpdate(textObj, { fontWeight: weight });
    });
    canvas?.renderAll();
  };

  // Apply font style
  const applyFontStyle = (style: string) => {
    if (!hasTextSelected) return;
    
    textObjects.forEach(textObj => {
      textObj.set('fontStyle', style);
      onObjectUpdate(textObj, { fontStyle: style });
    });
    canvas?.renderAll();
  };

  // Apply text decoration
  const applyTextDecoration = (decoration: string) => {
    if (!hasTextSelected) return;
    
    textObjects.forEach(textObj => {
      const current = (textObj as any).underline || false;
      (textObj as any).set('underline', decoration === 'underline' ? !current : false);
      onObjectUpdate(textObj, { underline: decoration === 'underline' ? !current : false });
    });
    canvas?.renderAll();
  };

  // Apply text alignment
  const applyTextAlign = (align: string) => {
    if (!hasTextSelected) return;
    
    textObjects.forEach(textObj => {
      textObj.set('textAlign', align);
      onObjectUpdate(textObj, { textAlign: align });
    });
    canvas?.renderAll();
  };

  // Apply font size
  const applyFontSize = (size: number) => {
    if (!hasTextSelected) return;
    
    textObjects.forEach(textObj => {
      textObj.set('fontSize', size);
      onObjectUpdate(textObj, { fontSize: size });
    });
    canvas?.renderAll();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Type className="w-5 h-5" />
          Typography
        </h3>
        {!hasTextSelected && (
          <p className="text-sm text-gray-500 mt-2">
            Select a text object to customize typography
          </p>
        )}
      </div>

      {hasTextSelected && (
        <div className="flex-1 overflow-y-auto">
          {/* Text Formatting Controls */}
          <div className="p-4 border-b">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Font Size
              </label>
              <div className="flex gap-2">
                {[12, 14, 16, 18, 24, 32, 48, 64].map(size => (
                  <button
                    key={size}
                    onClick={() => applyFontSize(size)}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Style Controls */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Style
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => applyFontWeight('bold')}
                  className="p-2 border rounded hover:bg-gray-50"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyFontStyle('italic')}
                  className="p-2 border rounded hover:bg-gray-50"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyTextDecoration('underline')}
                  className="p-2 border rounded hover:bg-gray-50"
                  title="Underline"
                >
                  <Underline className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Text Alignment */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alignment
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => applyTextAlign('left')}
                  className="p-2 border rounded hover:bg-gray-50"
                  title="Align Left"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyTextAlign('center')}
                  className="p-2 border rounded hover:bg-gray-50"
                  title="Align Center"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyTextAlign('right')}
                  className="p-2 border rounded hover:bg-gray-50"
                  title="Align Right"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => applyTextAlign('justify')}
                  className="p-2 border rounded hover:bg-gray-50"
                  title="Justify"
                >
                  <AlignJustify className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Font Selection */}
          <div className="p-4">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search fonts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Font Categories */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(FONT_CATEGORIES).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedCategory === key
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Font List */}
            <div className="space-y-2">
              {filteredFonts.map((font) => (
                <div
                  key={font.family}
                  className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-blue-300 ${
                    selectedFont?.family === font.family
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                  onClick={() => applyFont(font)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-medium text-gray-900"
                          style={{ fontFamily: font.family }}
                        >
                          {font.family}
                        </span>
                        {font.recommended && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                        {font.isPremium && (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                            PRO
                          </span>
                        )}
                      </div>
                      <div 
                        className="text-sm text-gray-600 mt-1"
                        style={{ fontFamily: font.family }}
                      >
                        {font.preview}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500 capitalize">
                          {font.category}
                        </span>
                        <div className="flex gap-1">
                          {font.tags.slice(0, 2).map(tag => (
                            <span 
                              key={tag}
                              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {loadingFonts.has(font.family) && (
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Font Pairings */}
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">
                Recommended Pairings
              </h4>
              <div className="space-y-3">
                {FONT_PAIRINGS.slice(0, 3).map((pairing, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:border-blue-300 cursor-pointer"
                    onClick={() => {
                      // Apply heading font to first text object
                      if (textObjects[0]) {
                        applyFont({ 
                          family: pairing.heading, 
                          category: 'sans-serif',
                          variants: ['400', '600', '700'],
                          subsets: ['latin'],
                          popularity: 90,
                          preview: 'Sample text',
                          recommended: true,
                          tags: []
                        });
                      }
                    }}
                  >
                    <div className="font-medium text-gray-900 mb-1">
                      {pairing.name}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {pairing.usage}
                    </div>
                    <div className="space-y-1">
                      <div 
                        className="text-lg font-semibold"
                        style={{ fontFamily: pairing.heading }}
                      >
                        Heading: {pairing.heading}
                      </div>
                      <div 
                        className="text-sm"
                        style={{ fontFamily: pairing.body }}
                      >
                        Body: {pairing.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TypographyPanel;