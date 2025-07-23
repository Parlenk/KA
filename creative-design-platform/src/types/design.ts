// Phase 2: Multi-Size Design and Animation Types

export interface DesignSize {
  id: string;
  name: string;
  width: number;
  height: number;
  category: 'social' | 'display' | 'print' | 'video' | 'custom';
  platform?: string; // e.g., 'facebook', 'google-ads', 'instagram'
  isStandard: boolean;
}

export interface AnimationKeyframe {
  time: number; // milliseconds
  properties: {
    x?: number;
    y?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    opacity?: number;
    [key: string]: any;
  };
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce' | 'elastic';
}

export interface AnimationTimeline {
  id: string;
  objectId: string;
  duration: number; // total duration in milliseconds
  keyframes: AnimationKeyframe[];
  loop?: boolean;
  delay?: number;
}

export interface DesignObject {
  id: string;
  type: 'text' | 'image' | 'shape' | 'video' | 'audio';
  properties: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    [key: string]: any;
  };
  animations: AnimationTimeline[];
  locked: boolean;
  visible: boolean;
  layerIndex: number;
}

export interface DesignCanvas {
  id: string;
  sizeId: string;
  width: number;
  height: number;
  background: {
    type: 'color' | 'gradient' | 'image';
    value: string;
    opacity?: number;
  };
  objects: DesignObject[];
  metadata: {
    platform?: string;
    specifications?: Record<string, any>;
  };
}

export interface DesignSet {
  id: string;
  name: string;
  projectId: string;
  masterCanvasId: string; // The primary canvas that drives sync
  canvases: DesignCanvas[];
  createdAt: Date;
  updatedAt: Date;
  syncSettings: {
    syncColors: boolean;
    syncFonts: boolean;
    syncLayout: boolean;
    syncAnimations: boolean;
  };
}

export interface BrandColor {
  id: string;
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  usage: number; // track how often used
}

export interface BrandFont {
  id: string;
  family: string;
  variants: string[]; // ['normal', 'bold', 'italic', etc.]
  url?: string; // for custom fonts
  type: 'system' | 'google' | 'custom';
  usage: number;
}

export interface BrandLogo {
  id: string;
  name: string;
  url: string;
  type: 'primary' | 'secondary' | 'icon' | 'wordmark';
  formats: string[]; // ['svg', 'png', 'jpg']
  dimensions: { width: number; height: number };
}

export interface BrandKit {
  id: string;
  name: string;
  userId: string;
  colors: BrandColor[];
  fonts: BrandFont[];
  logos: BrandLogo[];
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
}

export interface ExportSettings {
  format: 'jpg' | 'png' | 'svg' | 'pdf' | 'mp4' | 'gif' | 'html5';
  quality: number; // 1-100
  transparent?: boolean; // for PNG
  frameRate?: number; // for video formats
  duration?: number; // for video formats
  platformOptimized?: boolean;
  dimensions?: { width: number; height: number };
}

export interface ExportJob {
  id: string;
  designSetId: string;
  canvasIds: string[];
  settings: ExportSettings;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  downloadUrls?: string[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// Standard ad sizes for multi-size workflow
export const STANDARD_SIZES: DesignSize[] = [
  // Social Media
  { id: 'fb-post', name: 'Facebook Post', width: 1200, height: 630, category: 'social', platform: 'facebook' },
  { id: 'fb-story', name: 'Facebook Story', width: 1080, height: 1920, category: 'social', platform: 'facebook' },
  { id: 'ig-post', name: 'Instagram Post', width: 1080, height: 1080, category: 'social', platform: 'instagram' },
  { id: 'ig-story', name: 'Instagram Story', width: 1080, height: 1920, category: 'social', platform: 'instagram' },
  { id: 'twitter-post', name: 'Twitter Post', width: 1200, height: 675, category: 'social', platform: 'twitter' },
  
  // Display Ads
  { id: 'banner-728x90', name: 'Leaderboard', width: 728, height: 90, category: 'display' },
  { id: 'banner-300x250', name: 'Medium Rectangle', width: 300, height: 250, category: 'display' },
  { id: 'banner-336x280', name: 'Large Rectangle', width: 336, height: 280, category: 'display' },
  { id: 'banner-160x600', name: 'Wide Skyscraper', width: 160, height: 600, category: 'display' },
  { id: 'banner-320x50', name: 'Mobile Banner', width: 320, height: 50, category: 'display' },
  
  // Video Formats
  { id: 'video-16x9', name: 'Video 16:9', width: 1920, height: 1080, category: 'video' },
  { id: 'video-9x16', name: 'Video 9:16', width: 1080, height: 1920, category: 'video' },
  { id: 'video-1x1', name: 'Video 1:1', width: 1080, height: 1080, category: 'video' },
];

// Animation presets for quick application
export const ANIMATION_PRESETS = {
  ENTRY: [
    { name: 'Fade In', keyframes: [{ time: 0, properties: { opacity: 0 } }, { time: 500, properties: { opacity: 1 } }] },
    { name: 'Slide In Left', keyframes: [{ time: 0, properties: { x: -100, opacity: 0 } }, { time: 500, properties: { x: 0, opacity: 1 } }] },
    { name: 'Zoom In', keyframes: [{ time: 0, properties: { scaleX: 0, scaleY: 0, opacity: 0 } }, { time: 500, properties: { scaleX: 1, scaleY: 1, opacity: 1 } }] },
  ],
  EXIT: [
    { name: 'Fade Out', keyframes: [{ time: 0, properties: { opacity: 1 } }, { time: 500, properties: { opacity: 0 } }] },
    { name: 'Slide Out Right', keyframes: [{ time: 0, properties: { x: 0, opacity: 1 } }, { time: 500, properties: { x: 100, opacity: 0 } }] },
    { name: 'Zoom Out', keyframes: [{ time: 0, properties: { scaleX: 1, scaleY: 1, opacity: 1 } }, { time: 500, properties: { scaleX: 0, scaleY: 0, opacity: 0 } }] },
  ],
  EMPHASIS: [
    { name: 'Pulse', keyframes: [
      { time: 0, properties: { scaleX: 1, scaleY: 1 } },
      { time: 250, properties: { scaleX: 1.1, scaleY: 1.1 } },
      { time: 500, properties: { scaleX: 1, scaleY: 1 } }
    ]},
    { name: 'Shake', keyframes: [
      { time: 0, properties: { x: 0 } },
      { time: 100, properties: { x: -5 } },
      { time: 200, properties: { x: 5 } },
      { time: 300, properties: { x: -5 } },
      { time: 400, properties: { x: 0 } }
    ]},
  ]
};