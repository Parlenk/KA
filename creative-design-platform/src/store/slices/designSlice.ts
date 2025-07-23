// Design Set management slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { DesignSet, DesignCanvas, DesignObject, DesignSize } from '../../types/design';

interface DesignState {
  currentDesignSet: DesignSet | null;
  designSets: DesignSet[];
  selectedCanvasId: string | null;
  selectedObjectIds: string[];
  availableSizes: DesignSize[];
  loading: boolean;
  error: string | null;
  syncInProgress: boolean;
  history: {
    past: DesignSet[];
    future: DesignSet[];
  };
}

const initialState: DesignState = {
  currentDesignSet: null,
  designSets: [],
  selectedCanvasId: null,
  selectedObjectIds: [],
  availableSizes: [],
  loading: false,
  error: null,
  syncInProgress: false,
  history: {
    past: [],
    future: [],
  },
};

// Async thunks for API calls
export const createDesignSet = createAsyncThunk(
  'design/createDesignSet',
  async (params: { name: string; projectId: string; sizes: DesignSize[] }) => {
    // API call to create design set
    const response = await fetch('/api/design-sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

export const loadDesignSet = createAsyncThunk(
  'design/loadDesignSet',
  async (designSetId: string) => {
    const response = await fetch(`/api/design-sets/${designSetId}`);
    return response.json();
  }
);

export const saveDesignSet = createAsyncThunk(
  'design/saveDesignSet',
  async (designSet: DesignSet) => {
    const response = await fetch(`/api/design-sets/${designSet.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(designSet),
    });
    return response.json();
  }
);

export const syncDesignChanges = createAsyncThunk(
  'design/syncDesignChanges',
  async (params: { designSetId: string; sourceCanvasId: string; changes: any }) => {
    const response = await fetch(`/api/design-sets/${params.designSetId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

const designSlice = createSlice({
  name: 'design',
  initialState,
  reducers: {
    // Design Set Management
    setCurrentDesignSet: (state, action: PayloadAction<DesignSet>) => {
      state.currentDesignSet = action.payload;
      if (action.payload.canvases.length > 0) {
        state.selectedCanvasId = action.payload.canvases[0].id;
      }
    },

    selectCanvas: (state, action: PayloadAction<string>) => {
      state.selectedCanvasId = action.payload;
      state.selectedObjectIds = []; // Clear selection when switching canvas
    },

    // Object Management
    addObject: (state, action: PayloadAction<{ canvasId: string; object: DesignObject }>) => {
      if (!state.currentDesignSet) return;
      
      const canvas = state.currentDesignSet.canvases.find(c => c.id === action.payload.canvasId);
      if (canvas) {
        canvas.objects.push(action.payload.object);
        state.currentDesignSet.updatedAt = new Date();
      }
    },

    updateObject: (state, action: PayloadAction<{ 
      canvasId: string; 
      objectId: string; 
      properties: Partial<DesignObject['properties']> 
    }>) => {
      if (!state.currentDesignSet) return;

      const canvas = state.currentDesignSet.canvases.find(c => c.id === action.payload.canvasId);
      if (canvas) {
        const object = canvas.objects.find(o => o.id === action.payload.objectId);
        if (object) {
          Object.assign(object.properties, action.payload.properties);
          state.currentDesignSet.updatedAt = new Date();
        }
      }
    },

    deleteObject: (state, action: PayloadAction<{ canvasId: string; objectId: string }>) => {
      if (!state.currentDesignSet) return;

      const canvas = state.currentDesignSet.canvases.find(c => c.id === action.payload.canvasId);
      if (canvas) {
        canvas.objects = canvas.objects.filter(o => o.id !== action.payload.objectId);
        state.selectedObjectIds = state.selectedObjectIds.filter(id => id !== action.payload.objectId);
        state.currentDesignSet.updatedAt = new Date();
      }
    },

    // Selection Management
    selectObjects: (state, action: PayloadAction<string[]>) => {
      state.selectedObjectIds = action.payload;
    },

    addToSelection: (state, action: PayloadAction<string>) => {
      if (!state.selectedObjectIds.includes(action.payload)) {
        state.selectedObjectIds.push(action.payload);
      }
    },

    removeFromSelection: (state, action: PayloadAction<string>) => {
      state.selectedObjectIds = state.selectedObjectIds.filter(id => id !== action.payload);
    },

    clearSelection: (state) => {
      state.selectedObjectIds = [];
    },

    // Multi-size operations
    addCanvasSize: (state, action: PayloadAction<DesignSize>) => {
      if (!state.currentDesignSet) return;

      const newCanvas: DesignCanvas = {
        id: `canvas_${Date.now()}`,
        sizeId: action.payload.id,
        width: action.payload.width,
        height: action.payload.height,
        background: { type: 'color', value: '#ffffff' },
        objects: [],
        metadata: { platform: action.payload.platform },
      };

      state.currentDesignSet.canvases.push(newCanvas);
      state.currentDesignSet.updatedAt = new Date();
    },

    removeCanvasSize: (state, action: PayloadAction<string>) => {
      if (!state.currentDesignSet) return;

      state.currentDesignSet.canvases = state.currentDesignSet.canvases.filter(
        c => c.id !== action.payload
      );

      // Update selected canvas if needed
      if (state.selectedCanvasId === action.payload) {
        state.selectedCanvasId = state.currentDesignSet.canvases[0]?.id || null;
      }
    },

    updateSyncSettings: (state, action: PayloadAction<Partial<DesignSet['syncSettings']>>) => {
      if (!state.currentDesignSet) return;
      
      Object.assign(state.currentDesignSet.syncSettings, action.payload);
    },

    // History Management (Undo/Redo)
    saveToHistory: (state) => {
      if (!state.currentDesignSet) return;

      state.history.past.push(JSON.parse(JSON.stringify(state.currentDesignSet)));
      state.history.future = []; // Clear future when new action taken

      // Limit history size
      if (state.history.past.length > 50) {
        state.history.past = state.history.past.slice(-50);
      }
    },

    undo: (state) => {
      if (state.history.past.length === 0) return;

      const previous = state.history.past.pop()!;
      if (state.currentDesignSet) {
        state.history.future.unshift(JSON.parse(JSON.stringify(state.currentDesignSet)));
      }
      state.currentDesignSet = previous;
    },

    redo: (state) => {
      if (state.history.future.length === 0) return;

      const next = state.history.future.shift()!;
      if (state.currentDesignSet) {
        state.history.past.push(JSON.parse(JSON.stringify(state.currentDesignSet)));
      }
      state.currentDesignSet = next;
    },

    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      // Create Design Set
      .addCase(createDesignSet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createDesignSet.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDesignSet = action.payload;
        state.designSets.push(action.payload);
      })
      .addCase(createDesignSet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create design set';
      })

      // Load Design Set
      .addCase(loadDesignSet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDesignSet.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDesignSet = action.payload;
      })
      .addCase(loadDesignSet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load design set';
      })

      // Save Design Set
      .addCase(saveDesignSet.pending, (state) => {
        state.loading = true;
      })
      .addCase(saveDesignSet.fulfilled, (state, action) => {
        state.loading = false;
        state.currentDesignSet = action.payload;
        
        // Update in designSets array
        const index = state.designSets.findIndex(ds => ds.id === action.payload.id);
        if (index !== -1) {
          state.designSets[index] = action.payload;
        }
      })
      .addCase(saveDesignSet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to save design set';
      })

      // Sync Design Changes
      .addCase(syncDesignChanges.pending, (state) => {
        state.syncInProgress = true;
      })
      .addCase(syncDesignChanges.fulfilled, (state, action) => {
        state.syncInProgress = false;
        if (state.currentDesignSet) {
          state.currentDesignSet = action.payload;
        }
      })
      .addCase(syncDesignChanges.rejected, (state, action) => {
        state.syncInProgress = false;
        state.error = action.error.message || 'Failed to sync design changes';
      });
  },
});

export const {
  setCurrentDesignSet,
  selectCanvas,
  addObject,
  updateObject,
  deleteObject,
  selectObjects,
  addToSelection,
  removeFromSelection,
  clearSelection,
  addCanvasSize,
  removeCanvasSize,
  updateSyncSettings,
  saveToHistory,
  undo,
  redo,
  setError,
  clearError,
} = designSlice.actions;

export default designSlice.reducer;