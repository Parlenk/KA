// Canvas state management slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  snapToGrid: boolean;
  snapToGuides: boolean;
  snapToObjects: boolean;
  gridSize: number;
  tool: 'select' | 'rectangle' | 'circle' | 'text' | 'image' | 'line' | 'pen';
  mode: 'design' | 'animation' | 'preview';
  backgroundColor: string;
  isFullscreen: boolean;
  guides: Array<{ id: string; type: 'horizontal' | 'vertical'; position: number }>;
}

const initialState: CanvasState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: false,
  showRulers: true,
  showGuides: true,
  snapToGrid: false,
  snapToGuides: true,
  snapToObjects: true,
  gridSize: 10,
  tool: 'select',
  mode: 'design',
  backgroundColor: '#f5f5f5',
  isFullscreen: false,
  guides: [],
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // Zoom and Pan
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = Math.max(0.1, Math.min(10, action.payload));
    },

    zoomIn: (state) => {
      state.zoom = Math.min(10, state.zoom * 1.2);
    },

    zoomOut: (state) => {
      state.zoom = Math.max(0.1, state.zoom / 1.2);
    },

    zoomToFit: (state, action: PayloadAction<{ width: number; height: number; containerWidth: number; containerHeight: number }>) => {
      const { width, height, containerWidth, containerHeight } = action.payload;
      const scaleX = containerWidth / width;
      const scaleY = containerHeight / height;
      state.zoom = Math.min(scaleX, scaleY) * 0.9; // 90% to add some padding
      state.panX = 0;
      state.panY = 0;
    },

    resetZoom: (state) => {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
    },

    setPan: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.panX = action.payload.x;
      state.panY = action.payload.y;
    },

    panBy: (state, action: PayloadAction<{ deltaX: number; deltaY: number }>) => {
      state.panX += action.payload.deltaX;
      state.panY += action.payload.deltaY;
    },

    // Tools
    setTool: (state, action: PayloadAction<CanvasState['tool']>) => {
      state.tool = action.payload;
    },

    setMode: (state, action: PayloadAction<CanvasState['mode']>) => {
      state.mode = action.payload;
    },

    // Grid and Guides
    toggleGrid: (state) => {
      state.showGrid = !state.showGrid;
    },

    toggleRulers: (state) => {
      state.showRulers = !state.showRulers;
    },

    toggleGuides: (state) => {
      state.showGuides = !state.showGuides;
    },

    setGridSize: (state, action: PayloadAction<number>) => {
      state.gridSize = Math.max(5, Math.min(100, action.payload));
    },

    // Snapping
    toggleSnapToGrid: (state) => {
      state.snapToGrid = !state.snapToGrid;
    },

    toggleSnapToGuides: (state) => {
      state.snapToGuides = !state.snapToGuides;
    },

    toggleSnapToObjects: (state) => {
      state.snapToObjects = !state.snapToObjects;
    },

    // Guides Management
    addGuide: (state, action: PayloadAction<{ type: 'horizontal' | 'vertical'; position: number }>) => {
      const guide = {
        id: `guide_${Date.now()}`,
        type: action.payload.type,
        position: action.payload.position,
      };
      state.guides.push(guide);
    },

    updateGuide: (state, action: PayloadAction<{ id: string; position: number }>) => {
      const guide = state.guides.find(g => g.id === action.payload.id);
      if (guide) {
        guide.position = action.payload.position;
      }
    },

    deleteGuide: (state, action: PayloadAction<string>) => {
      state.guides = state.guides.filter(g => g.id !== action.payload);
    },

    clearGuides: (state) => {
      state.guides = [];
    },

    // Background
    setBackgroundColor: (state, action: PayloadAction<string>) => {
      state.backgroundColor = action.payload;
    },

    // Fullscreen
    toggleFullscreen: (state) => {
      state.isFullscreen = !state.isFullscreen;
    },

    setFullscreen: (state, action: PayloadAction<boolean>) => {
      state.isFullscreen = action.payload;
    },

    // Keyboard Shortcuts Support
    handleKeyboardShortcut: (state, action: PayloadAction<{ key: string; ctrlKey: boolean; shiftKey: boolean }>) => {
      const { key, ctrlKey, shiftKey } = action.payload;

      switch (key) {
        case 'v':
          if (!ctrlKey) state.tool = 'select';
          break;
        case 'r':
          if (!ctrlKey) state.tool = 'rectangle';
          break;
        case 'c':
          if (!ctrlKey) state.tool = 'circle';
          break;
        case 't':
          if (!ctrlKey) state.tool = 'text';
          break;
        case 'l':
          if (!ctrlKey) state.tool = 'line';
          break;
        case 'p':
          if (!ctrlKey) state.tool = 'pen';
          break;
        case '=':
        case '+':
          if (ctrlKey) {
            state.zoom = Math.min(10, state.zoom * 1.2);
          }
          break;
        case '-':
          if (ctrlKey) {
            state.zoom = Math.max(0.1, state.zoom / 1.2);
          }
          break;
        case '0':
          if (ctrlKey) {
            state.zoom = 1;
            state.panX = 0;
            state.panY = 0;
          }
          break;
        case 'g':
          if (ctrlKey && shiftKey) {
            state.showGrid = !state.showGrid;
          }
          break;
        case 'r':
          if (ctrlKey && shiftKey) {
            state.showRulers = !state.showRulers;
          }
          break;
        case ';':
          if (ctrlKey) {
            state.showGuides = !state.showGuides;
          }
          break;
        case 'f':
          if (!ctrlKey) {
            state.isFullscreen = !state.isFullscreen;
          }
          break;
      }
    },
  },
});

export const {
  setZoom,
  zoomIn,
  zoomOut,
  zoomToFit,
  resetZoom,
  setPan,
  panBy,
  setTool,
  setMode,
  toggleGrid,
  toggleRulers,
  toggleGuides,
  setGridSize,
  toggleSnapToGrid,
  toggleSnapToGuides,
  toggleSnapToObjects,
  addGuide,
  updateGuide,
  deleteGuide,
  clearGuides,
  setBackgroundColor,
  toggleFullscreen,
  setFullscreen,
  handleKeyboardShortcut,
} = canvasSlice.actions;

export default canvasSlice.reducer;