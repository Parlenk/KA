import React, { useState, useRef } from 'react';
import { 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Type, 
  Contrast,
  Zap,
  ZapOff,
  Keyboard,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAccessibility } from './AccessibilityProvider';
import { SecureButton } from '../UI/SecureButton';
import { ToggleSwitch } from '../UI/MicroInteractions';

interface AccessibilityToolbarProps {
  position?: 'top' | 'bottom' | 'floating';
  className?: string;
  compact?: boolean;
}

const AccessibilityToolbar: React.FC<AccessibilityToolbarProps> = ({
  position = 'floating',
  className = '',
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const {
    highContrast,
    reducedMotion,
    fontSize,
    isScreenReaderActive,
    keyboardNavigation,
    toggleHighContrast,
    toggleReducedMotion,
    setFontSize,
    announce,
    registerKeyboardShortcut,
    unregisterKeyboardShortcut
  } = useAccessibility();

  const toolbarRef = useRef<HTMLDivElement>(null);

  // Register keyboard shortcuts for accessibility toolbar
  React.useEffect(() => {
    registerKeyboardShortcut('Alt+a', () => {
      setIsExpanded(!isExpanded);
      announce(isExpanded ? 'Accessibility toolbar collapsed' : 'Accessibility toolbar expanded');
    }, 'Toggle accessibility toolbar');

    return () => {
      unregisterKeyboardShortcut('Alt+a');
    };
  }, [isExpanded, registerKeyboardShortcut, unregisterKeyboardShortcut, announce]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'fixed top-0 left-0 right-0 z-50';
      case 'bottom':
        return 'fixed bottom-0 left-0 right-0 z-50';
      case 'floating':
        return 'fixed top-4 right-4 z-50';
      default:
        return 'fixed top-4 right-4 z-50';
    }
  };

  const fontSizeLabels = {
    small: 'Small',
    medium: 'Medium', 
    large: 'Large',
    xl: 'Extra Large'
  };

  const keyboardShortcuts = [
    { key: 'Alt + H', action: 'Toggle high contrast' },
    { key: 'Alt + M', action: 'Toggle reduced motion' },
    { key: 'Alt + 1', action: 'Small font size' },
    { key: 'Alt + 2', action: 'Medium font size' },
    { key: 'Alt + 3', action: 'Large font size' },
    { key: 'Alt + 4', action: 'Extra large font size' },
    { key: 'Alt + A', action: 'Toggle accessibility toolbar' },
    { key: 'Tab', action: 'Navigate forward' },
    { key: 'Shift + Tab', action: 'Navigate backward' },
    { key: 'Escape', action: 'Close modals/dropdowns' },
    { key: 'Enter/Space', action: 'Activate buttons/links' }
  ];

  return (
    <div
      ref={toolbarRef}
      className={`
        ${getPositionClasses()}
        bg-white border border-gray-300 rounded-lg shadow-lg
        ${compact ? 'p-2' : 'p-4'}
        ${position === 'floating' ? 'max-w-sm' : 'max-w-full'}
        ${className}
      `}
      role="toolbar"
      aria-label="Accessibility controls"
      aria-expanded={isExpanded}
    >
      {/* Toolbar Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-blue-600" aria-hidden="true" />
          <h3 className="font-semibold text-sm">Accessibility</h3>
          {isScreenReaderActive && (
            <span 
              className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded"
              aria-label="Screen reader detected"
            >
              SR
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <SecureButton
            onClick={() => setShowHelp(!showHelp)}
            variant="ghost"
            size="sm"
            aria-label="Show keyboard shortcuts help"
            aria-expanded={showHelp}
          >
            <HelpCircle className="w-4 h-4" />
          </SecureButton>
          
          <SecureButton
            onClick={() => setIsExpanded(!isExpanded)}
            variant="ghost"
            size="sm"
            aria-label={isExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </SecureButton>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div 
          className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md"
          role="region"
          aria-label="Keyboard shortcuts help"
        >
          <h4 className="font-medium text-sm mb-2">Keyboard Shortcuts</h4>
          <div className="space-y-1 text-xs">
            {keyboardShortcuts.map((shortcut, index) => (
              <div key={index} className="flex justify-between">
                <kbd className="bg-gray-100 px-1 rounded font-mono">
                  {shortcut.key}
                </kbd>
                <span className="text-gray-600">{shortcut.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accessibility Controls */}
      {isExpanded && (
        <div className="space-y-4" role="group" aria-label="Accessibility settings">
          
          {/* Visual Settings */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-gray-700">Visual Settings</legend>
            
            {/* High Contrast */}
            <div className="flex items-center justify-between">
              <label 
                htmlFor="high-contrast-toggle"
                className="flex items-center gap-2 text-sm"
              >
                <Contrast className="w-4 h-4" aria-hidden="true" />
                High Contrast
              </label>
              <ToggleSwitch
                checked={highContrast}
                onChange={(checked) => {
                  toggleHighContrast();
                  announce(checked ? 'High contrast enabled' : 'High contrast disabled');
                }}
                size="sm"
                color={highContrast ? 'blue' : 'gray'}
                aria-describedby="high-contrast-help"
              />
            </div>
            <p id="high-contrast-help" className="text-xs text-gray-600">
              Increases color contrast for better visibility
            </p>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between">
              <label 
                htmlFor="reduced-motion-toggle"
                className="flex items-center gap-2 text-sm"
              >
                {reducedMotion ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                Reduce Motion
              </label>
              <ToggleSwitch
                checked={reducedMotion}
                onChange={(checked) => {
                  toggleReducedMotion();
                  announce(checked ? 'Animations reduced' : 'Animations enabled');
                }}
                size="sm"
                color={reducedMotion ? 'blue' : 'gray'}
                aria-describedby="reduced-motion-help"
              />
            </div>
            <p id="reduced-motion-help" className="text-xs text-gray-600">
              Reduces animations and transitions
            </p>

            {/* Font Size */}
            <div>
              <label className="flex items-center gap-2 text-sm mb-2">
                <Type className="w-4 h-4" aria-hidden="true" />
                Font Size
              </label>
              <div 
                className="grid grid-cols-4 gap-1"
                role="radiogroup"
                aria-label="Font size options"
              >
                {(Object.keys(fontSizeLabels) as Array<keyof typeof fontSizeLabels>).map((size) => (
                  <SecureButton
                    key={size}
                    onClick={() => {
                      setFontSize(size);
                      announce(`Font size changed to ${fontSizeLabels[size]}`);
                    }}
                    variant={fontSize === size ? 'primary' : 'outline'}
                    size="xs"
                    className="text-xs"
                    role="radio"
                    aria-checked={fontSize === size}
                    aria-label={`Set font size to ${fontSizeLabels[size]}`}
                  >
                    {size === 'small' ? 'S' :
                     size === 'medium' ? 'M' :
                     size === 'large' ? 'L' : 'XL'}
                  </SecureButton>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Current: {fontSizeLabels[fontSize]}
              </p>
            </div>
          </fieldset>

          {/* Navigation Settings */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-gray-700">Navigation</legend>
            
            {/* Keyboard Navigation Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Keyboard className="w-4 h-4" aria-hidden="true" />
                Keyboard Navigation
              </div>
              <span 
                className={`text-xs px-2 py-1 rounded ${
                  keyboardNavigation 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}
                aria-live="polite"
              >
                {keyboardNavigation ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-gray-600">
              Use Tab, Arrow keys, Enter, and Space to navigate
            </p>
          </fieldset>

          {/* Quick Actions */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-gray-700">Quick Actions</legend>
            
            <div className="grid grid-cols-2 gap-2">
              <SecureButton
                onClick={() => {
                  // Reset all accessibility settings
                  if (!highContrast) toggleHighContrast();
                  if (!reducedMotion) toggleReducedMotion();
                  setFontSize('large');
                  announce('Accessibility settings optimized for low vision');
                }}
                variant="outline"
                size="sm"
                className="text-xs"
                aria-label="Optimize for low vision users"
              >
                <Eye className="w-3 h-3 mr-1" />
                Low Vision
              </SecureButton>
              
              <SecureButton
                onClick={() => {
                  // Motor disability optimizations
                  if (reducedMotion) toggleReducedMotion();
                  announce('Settings optimized for motor disabilities');
                }}
                variant="outline"
                size="sm"
                className="text-xs"
                aria-label="Optimize for motor disabilities"
              >
                <Keyboard className="w-3 h-3 mr-1" />
                Motor
              </SecureButton>
            </div>
          </fieldset>

          {/* Screen Reader Information */}
          {isScreenReaderActive && (
            <div 
              className="p-3 bg-green-50 border border-green-200 rounded-md"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                <Volume2 className="w-4 h-4" />
                Screen Reader Detected
              </div>
              <p className="text-xs text-green-700 mt-1">
                Enhanced accessibility features are active. All interface elements include proper ARIA labels and live regions.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Compact View */}
      {!isExpanded && compact && (
        <div className="flex items-center gap-2">
          <SecureButton
            onClick={toggleHighContrast}
            variant="ghost"
            size="sm"
            aria-label={`${highContrast ? 'Disable' : 'Enable'} high contrast`}
            className={highContrast ? 'bg-blue-100' : ''}
          >
            <Contrast className="w-4 h-4" />
          </SecureButton>
          
          <SecureButton
            onClick={toggleReducedMotion}
            variant="ghost"
            size="sm"
            aria-label={`${reducedMotion ? 'Enable' : 'Reduce'} animations`}
            className={reducedMotion ? 'bg-blue-100' : ''}
          >
            {reducedMotion ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </SecureButton>
          
          <div className="text-xs text-gray-600" aria-live="polite">
            {fontSizeLabels[fontSize]}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityToolbar;