/**
 * Accessibility Manager
 * WCAG 2.1 AA compliance and enhanced accessibility features
 */

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  focusIndicators: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'monochrome';
}

export interface ColorContrastInfo {
  foreground: string;
  background: string;
  ratio: number;
  level: 'fail' | 'aa-normal' | 'aa-large' | 'aaa-normal' | 'aaa-large';
  wcagCompliant: boolean;
}

export class AccessibilityManager {
  private settings: AccessibilitySettings;
  private focusHistory: HTMLElement[] = [];
  private keyboardHandlers: Map<string, (event: KeyboardEvent) => void> = new Map();
  private announcements: HTMLElement | null = null;

  constructor() {
    this.settings = this.loadSettings();
    this.initializeAccessibility();
  }

  private loadSettings(): AccessibilitySettings {
    const stored = localStorage.getItem('accessibility_settings');
    const defaults: AccessibilitySettings = {
      highContrast: false,
      reducedMotion: this.prefersReducedMotion(),
      fontSize: 'medium',
      focusIndicators: true,
      screenReaderMode: false,
      keyboardNavigation: true,
      colorBlindMode: 'none'
    };

    if (stored) {
      try {
        return { ...defaults, ...JSON.parse(stored) };
      } catch {
        return defaults;
      }
    }

    return defaults;
  }

  private saveSettings(): void {
    localStorage.setItem('accessibility_settings', JSON.stringify(this.settings));
  }

  private initializeAccessibility(): void {
    // Create screen reader announcements area
    this.createAnnouncementArea();
    
    // Apply current settings
    this.applySettings();
    
    // Set up keyboard navigation
    this.setupKeyboardNavigation();
    
    // Set up focus management
    this.setupFocusManagement();
    
    // Listen for system preferences changes
    this.setupSystemPreferencesListeners();
    
    console.log('Accessibility Manager initialized');
  }

  private createAnnouncementArea(): void {
    this.announcements = document.createElement('div');
    this.announcements.setAttribute('aria-live', 'polite');
    this.announcements.setAttribute('aria-atomic', 'true');
    this.announcements.style.position = 'absolute';
    this.announcements.style.left = '-10000px';
    this.announcements.style.width = '1px';
    this.announcements.style.height = '1px';
    this.announcements.style.overflow = 'hidden';
    document.body.appendChild(this.announcements);
  }

  private applySettings(): void {
    const root = document.documentElement;
    
    // High contrast mode
    if (this.settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    // Reduced motion
    if (this.settings.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Font size
    root.classList.remove('font-small', 'font-medium', 'font-large', 'font-extra-large');
    root.classList.add(`font-${this.settings.fontSize}`);
    
    // Color blind mode
    root.classList.remove('protanopia', 'deuteranopia', 'tritanopia', 'monochrome');
    if (this.settings.colorBlindMode !== 'none') {
      root.classList.add(this.settings.colorBlindMode);
    }
    
    // Focus indicators
    if (this.settings.focusIndicators) {
      root.classList.add('enhanced-focus');
    } else {
      root.classList.remove('enhanced-focus');
    }
    
    // Screen reader mode
    if (this.settings.screenReaderMode) {
      root.classList.add('screen-reader-mode');
    } else {
      root.classList.remove('screen-reader-mode');
    }
  }

  private setupKeyboardNavigation(): void {
    // Global keyboard shortcuts
    document.addEventListener('keydown', (event) => {
      if (!this.settings.keyboardNavigation) return;
      
      // Alt + H: Go to main heading
      if (event.altKey && event.key === 'h') {
        event.preventDefault();
        this.focusMainHeading();
      }
      
      // Alt + M: Go to main content
      if (event.altKey && event.key === 'm') {
        event.preventDefault();
        this.focusMainContent();
      }
      
      // Alt + N: Go to navigation
      if (event.altKey && event.key === 'n') {
        event.preventDefault();
        this.focusNavigation();
      }
      
      // Escape: Close modals/dropdowns
      if (event.key === 'Escape') {
        this.handleEscapeKey();
      }
      
      // Tab trapping in modals
      if (event.key === 'Tab') {
        this.handleTabKey(event);
      }
    });
  }

  private setupFocusManagement(): void {
    // Track focus changes
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target && target !== document.body) {
        this.focusHistory.push(target);
        // Keep only last 10 focus elements
        if (this.focusHistory.length > 10) {
          this.focusHistory.shift();
        }
      }
    });
    
    // Enhance focus visibility
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Tab') {
        document.body.classList.add('keyboard-navigation');
      }
    });
    
    document.addEventListener('mousedown', () => {
      document.body.classList.remove('keyboard-navigation');
    });
  }

  private setupSystemPreferencesListeners(): void {
    // Listen for reduced motion preference changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      if (e.matches) {
        this.updateSetting('reducedMotion', true);
      }
    });
    
    // Listen for high contrast preference changes
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    contrastQuery.addEventListener('change', (e) => {
      if (e.matches) {
        this.updateSetting('highContrast', true);
      }
    });
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private focusMainHeading(): void {
    const heading = document.querySelector('h1') as HTMLElement;
    if (heading) {
      heading.focus();
      this.announce('Focused on main heading');
    }
  }

  private focusMainContent(): void {
    const main = document.querySelector('main, [role="main"], #main-content') as HTMLElement;
    if (main) {
      main.focus();
      this.announce('Focused on main content');
    }
  }

  private focusNavigation(): void {
    const nav = document.querySelector('nav, [role="navigation"]') as HTMLElement;
    if (nav) {
      const firstLink = nav.querySelector('a, button') as HTMLElement;
      if (firstLink) {
        firstLink.focus();
        this.announce('Focused on navigation');
      }
    }
  }

  private handleEscapeKey(): void {
    // Close modals
    const modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])') as HTMLElement;
    if (modal) {
      const closeButton = modal.querySelector('[aria-label*="close"], [data-dismiss]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
      return;
    }
    
    // Close dropdowns
    const dropdown = document.querySelector('[aria-expanded="true"]') as HTMLElement;
    if (dropdown) {
      dropdown.setAttribute('aria-expanded', 'false');
      dropdown.focus();
    }
  }

  private handleTabKey(event: KeyboardEvent): void {
    const modal = document.querySelector('[role="dialog"]:not([aria-hidden="true"])');
    if (modal) {
      this.trapFocusInModal(event, modal as HTMLElement);
    }
  }

  private trapFocusInModal(event: KeyboardEvent, modal: HTMLElement): void {
    const focusableElements = modal.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
    ) as NodeListOf<HTMLElement>;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Public API Methods
   */

  public updateSetting<K extends keyof AccessibilitySettings>(
    key: K, 
    value: AccessibilitySettings[K]
  ): void {
    this.settings[key] = value;
    this.saveSettings();
    this.applySettings();
    this.announce(`${key} updated to ${value}`);
  }

  public getSettings(): AccessibilitySettings {
    return { ...this.settings };
  }

  public announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.announcements) return;
    
    this.announcements.setAttribute('aria-live', priority);
    this.announcements.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      if (this.announcements) {
        this.announcements.textContent = '';
      }
    }, 1000);
  }

  public addKeyboardShortcut(key: string, handler: (event: KeyboardEvent) => void): void {
    this.keyboardHandlers.set(key, handler);
    
    document.addEventListener('keydown', (event) => {
      const shortcut = this.getShortcutString(event);
      const handler = this.keyboardHandlers.get(shortcut);
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    });
  }

  private getShortcutString(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    parts.push(event.key.toLowerCase());
    return parts.join('+');
  }

  public checkColorContrast(foreground: string, background: string): ColorContrastInfo {
    const ratio = this.calculateContrastRatio(foreground, background);
    
    return {
      foreground,
      background,
      ratio,
      level: this.getContrastLevel(ratio),
      wcagCompliant: ratio >= 4.5
    };
  }

  private calculateContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);
    
    if (!rgb1 || !rgb2) return 1;
    
    const l1 = this.getRelativeLuminance(rgb1);
    const l2 = this.getRelativeLuminance(rgb2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
    const sRGB = [rgb.r, rgb.g, rgb.b].map(color => {
      color = color / 255;
      return color <= 0.03928 
        ? color / 12.92 
        : Math.pow((color + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  }

  private getContrastLevel(ratio: number): ColorContrastInfo['level'] {
    if (ratio >= 7) return 'aaa-normal';
    if (ratio >= 4.5) return 'aa-normal';
    if (ratio >= 3) return 'aa-large';
    return 'fail';
  }

  public generateAriaLabel(element: HTMLElement): string {
    // Generate accessible labels for elements
    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    const text = element.textContent?.trim() || '';
    const title = element.getAttribute('title') || '';
    const ariaLabel = element.getAttribute('aria-label') || '';
    
    if (ariaLabel) return ariaLabel;
    if (title) return title;
    if (text) return `${role} ${text}`;
    
    return `${role} element`;
  }

  public addLandmarkRoles(): void {
    // Automatically add landmark roles to common elements
    const main = document.querySelector('main');
    if (main && !main.getAttribute('role')) {
      main.setAttribute('role', 'main');
    }
    
    const nav = document.querySelector('nav');
    if (nav && !nav.getAttribute('role')) {
      nav.setAttribute('role', 'navigation');
    }
    
    const header = document.querySelector('header');
    if (header && !header.getAttribute('role')) {
      header.setAttribute('role', 'banner');
    }
    
    const footer = document.querySelector('footer');
    if (footer && !footer.getAttribute('role')) {
      footer.setAttribute('role', 'contentinfo');
    }
  }

  public validateForm(form: HTMLFormElement): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
      const element = input as HTMLInputElement;
      
      // Check for required fields
      if (element.required && !element.value.trim()) {
        const label = this.getFieldLabel(element);
        errors.push(`${label} is required`);
      }
      
      // Check for proper labeling
      if (!this.hasProperLabel(element)) {
        errors.push(`Field missing proper label: ${element.name || element.id || 'unknown'}`);
      }
      
      // Check for error states
      if (element.getAttribute('aria-invalid') === 'true') {
        const errorId = element.getAttribute('aria-describedby');
        if (!errorId || !document.getElementById(errorId)) {
          errors.push(`Field with error needs error message: ${this.getFieldLabel(element)}`);
        }
      }
    });
    
    return { valid: errors.length === 0, errors };
  }

  private getFieldLabel(element: HTMLInputElement): string {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent?.trim() || '';
    
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    return element.name || element.id || 'Unknown field';
  }

  private hasProperLabel(element: HTMLInputElement): boolean {
    // Check for various labeling methods
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      document.querySelector(`label[for="${element.id}"]`) ||
      element.closest('label')
    );
  }

  public enableScreenReaderMode(): void {
    this.updateSetting('screenReaderMode', true);
    
    // Add more descriptive text for screen readers
    document.querySelectorAll('img:not([alt])').forEach(img => {
      (img as HTMLImageElement).alt = 'Image';
    });
    
    // Add skip links
    this.addSkipLinks();
    
    this.announce('Screen reader mode enabled');
  }

  private addSkipLinks(): void {
    const skipLinks = document.createElement('div');
    skipLinks.className = 'skip-links';
    skipLinks.innerHTML = `
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <a href="#navigation" class="skip-link">Skip to navigation</a>
    `;
    
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }

  public checkPageAccessibility(): Promise<{ score: number; issues: string[] }> {
    return new Promise(resolve => {
      const issues: string[] = [];
      let score = 100;
      
      // Check for heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length === 0) {
        issues.push('No headings found');
        score -= 20;
      }
      
      // Check for images without alt text
      const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
      if (imagesWithoutAlt.length > 0) {
        issues.push(`${imagesWithoutAlt.length} images without alt text`);
        score -= imagesWithoutAlt.length * 5;
      }
      
      // Check for forms without labels
      const inputs = document.querySelectorAll('input, select, textarea');
      let unlabeledInputs = 0;
      inputs.forEach(input => {
        if (!this.hasProperLabel(input as HTMLInputElement)) {
          unlabeledInputs++;
        }
      });
      
      if (unlabeledInputs > 0) {
        issues.push(`${unlabeledInputs} form fields without proper labels`);
        score -= unlabeledInputs * 10;
      }
      
      // Check for color contrast (simplified)
      const lowContrastElements = this.findLowContrastElements();
      if (lowContrastElements > 0) {
        issues.push(`${lowContrastElements} elements with low color contrast`);
        score -= lowContrastElements * 5;
      }
      
      resolve({ score: Math.max(score, 0), issues });
    });
  }

  private findLowContrastElements(): number {
    // Simplified contrast checking - in real implementation,
    // this would analyze computed styles
    return 0;
  }
}

// CSS for accessibility features
export const accessibilityCSS = `
/* High contrast mode */
.high-contrast {
  filter: contrast(150%) brightness(120%);
}

.high-contrast button, .high-contrast input, .high-contrast select {
  border: 2px solid #000;
}

/* Reduced motion */
.reduced-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* Font sizes */
.font-small { font-size: 14px; }
.font-medium { font-size: 16px; }
.font-large { font-size: 20px; }
.font-extra-large { font-size: 24px; }

/* Enhanced focus indicators */
.enhanced-focus *:focus {
  outline: 3px solid #005fcc !important;
  outline-offset: 2px !important;
}

/* Keyboard navigation */
.keyboard-navigation *:focus {
  outline: 3px solid #005fcc !important;
  outline-offset: 2px !important;
}

/* Color blind filters */
.protanopia { filter: url('#protanopia-filter'); }
.deuteranopia { filter: url('#deuteranopia-filter'); }
.tritanopia { filter: url('#tritanopia-filter'); }
.monochrome { filter: grayscale(100%); }

/* Screen reader mode */
.screen-reader-mode .visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* Skip links */
.skip-links {
  position: absolute;
  top: -40px;
  left: 6px;
  z-index: 9999;
}

.skip-link {
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  position: absolute;
  top: -40px;
  left: 6px;
}

.skip-link:focus {
  top: 6px;
}
`;

// Global instance
export const accessibilityManager = new AccessibilityManager();