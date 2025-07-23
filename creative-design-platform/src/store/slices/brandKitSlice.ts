// Brand Kit management slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { BrandKit, BrandColor, BrandFont, BrandLogo } from '../../types/design';

interface BrandKitState {
  activeBrandKit: BrandKit | null;
  brandKits: BrandKit[];
  selectedColorId: string | null;
  selectedFontId: string | null;
  selectedLogoId: string | null;
  colorPaletteExpanded: boolean;
  fontLibraryExpanded: boolean;
  logoLibraryExpanded: boolean;
  loading: boolean;
  error: string | null;
  uploadProgress: number;
}

const initialState: BrandKitState = {
  activeBrandKit: null,
  brandKits: [],
  selectedColorId: null,
  selectedFontId: null,
  selectedLogoId: null,
  colorPaletteExpanded: true,
  fontLibraryExpanded: true,
  logoLibraryExpanded: true,
  loading: false,
  error: null,
  uploadProgress: 0,
};

// Async thunks
export const createBrandKit = createAsyncThunk(
  'brandKit/createBrandKit',
  async (params: { name: string; userId: string }) => {
    const response = await fetch('/api/brand-kits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

export const loadBrandKits = createAsyncThunk(
  'brandKit/loadBrandKits',
  async (userId: string) => {
    const response = await fetch(`/api/brand-kits?userId=${userId}`);
    return response.json();
  }
);

export const saveBrandKit = createAsyncThunk(
  'brandKit/saveBrandKit',
  async (brandKit: BrandKit) => {
    const response = await fetch(`/api/brand-kits/${brandKit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(brandKit),
    });
    return response.json();
  }
);

export const uploadCustomFont = createAsyncThunk(
  'brandKit/uploadCustomFont',
  async (params: { file: File; brandKitId: string; fontName: string }) => {
    const formData = new FormData();
    formData.append('font', params.file);
    formData.append('name', params.fontName);
    formData.append('brandKitId', params.brandKitId);

    const response = await fetch('/api/brand-kits/fonts/upload', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }
);

export const uploadLogo = createAsyncThunk(
  'brandKit/uploadLogo',
  async (params: { file: File; brandKitId: string; logoName: string; type: BrandLogo['type'] }) => {
    const formData = new FormData();
    formData.append('logo', params.file);
    formData.append('name', params.logoName);
    formData.append('type', params.type);
    formData.append('brandKitId', params.brandKitId);

    const response = await fetch('/api/brand-kits/logos/upload', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  }
);

export const extractBrandFromWebsite = createAsyncThunk(
  'brandKit/extractBrandFromWebsite',
  async (params: { url: string; brandKitId: string }) => {
    const response = await fetch('/api/brand-kits/extract-from-website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

export const generatePaletteFromImage = createAsyncThunk(
  'brandKit/generatePaletteFromImage',
  async (params: { brandKitId: string; imageUrl: string }) => {
    const response = await fetch('/api/brand-kits/generate-palette', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

const brandKitSlice = createSlice({
  name: 'brandKit',
  initialState,
  reducers: {
    // Brand Kit Management
    setActiveBrandKit: (state, action: PayloadAction<BrandKit>) => {
      state.activeBrandKit = action.payload;
    },

    setDefaultBrandKit: (state, action: PayloadAction<string>) => {
      // Unset previous default
      state.brandKits.forEach(kit => kit.isDefault = false);
      
      // Set new default
      const kit = state.brandKits.find(k => k.id === action.payload);
      if (kit) {
        kit.isDefault = true;
        state.activeBrandKit = kit;
      }
    },

    // Color Management
    addColor: (state, action: PayloadAction<Omit<BrandColor, 'id' | 'usage'>>) => {
      if (!state.activeBrandKit) return;
      
      // Check color limit (500 colors max as per requirements)
      if (state.activeBrandKit.colors.length >= 500) {
        state.error = 'Maximum 500 colors allowed per brand kit';
        return;
      }

      const newColor: BrandColor = {
        ...action.payload,
        id: `color_${Date.now()}`,
        usage: 0,
      };

      state.activeBrandKit.colors.push(newColor);
      state.activeBrandKit.updatedAt = new Date();
    },

    updateColor: (state, action: PayloadAction<{ colorId: string; updates: Partial<BrandColor> }>) => {
      if (!state.activeBrandKit) return;

      const color = state.activeBrandKit.colors.find(c => c.id === action.payload.colorId);
      if (color) {
        Object.assign(color, action.payload.updates);
        state.activeBrandKit.updatedAt = new Date();
      }
    },

    deleteColor: (state, action: PayloadAction<string>) => {
      if (!state.activeBrandKit) return;

      state.activeBrandKit.colors = state.activeBrandKit.colors.filter(
        c => c.id !== action.payload
      );
      
      if (state.selectedColorId === action.payload) {
        state.selectedColorId = null;
      }
      
      state.activeBrandKit.updatedAt = new Date();
    },

    selectColor: (state, action: PayloadAction<string | null>) => {
      state.selectedColorId = action.payload;
    },

    incrementColorUsage: (state, action: PayloadAction<string>) => {
      if (!state.activeBrandKit) return;

      const color = state.activeBrandKit.colors.find(c => c.id === action.payload);
      if (color) {
        color.usage += 1;
      }
    },

    // Font Management
    addFont: (state, action: PayloadAction<Omit<BrandFont, 'id' | 'usage'>>) => {
      if (!state.activeBrandKit) return;

      const newFont: BrandFont = {
        ...action.payload,
        id: `font_${Date.now()}`,
        usage: 0,
      };

      state.activeBrandKit.fonts.push(newFont);
      state.activeBrandKit.updatedAt = new Date();
    },

    updateFont: (state, action: PayloadAction<{ fontId: string; updates: Partial<BrandFont> }>) => {
      if (!state.activeBrandKit) return;

      const font = state.activeBrandKit.fonts.find(f => f.id === action.payload.fontId);
      if (font) {
        Object.assign(font, action.payload.updates);
        state.activeBrandKit.updatedAt = new Date();
      }
    },

    deleteFont: (state, action: PayloadAction<string>) => {
      if (!state.activeBrandKit) return;

      state.activeBrandKit.fonts = state.activeBrandKit.fonts.filter(
        f => f.id !== action.payload
      );
      
      if (state.selectedFontId === action.payload) {
        state.selectedFontId = null;
      }
      
      state.activeBrandKit.updatedAt = new Date();
    },

    selectFont: (state, action: PayloadAction<string | null>) => {
      state.selectedFontId = action.payload;
    },

    incrementFontUsage: (state, action: PayloadAction<string>) => {
      if (!state.activeBrandKit) return;

      const font = state.activeBrandKit.fonts.find(f => f.id === action.payload);
      if (font) {
        font.usage += 1;
      }
    },

    // Logo Management
    addLogo: (state, action: PayloadAction<Omit<BrandLogo, 'id'>>) => {
      if (!state.activeBrandKit) return;

      const newLogo: BrandLogo = {
        ...action.payload,
        id: `logo_${Date.now()}`,
      };

      state.activeBrandKit.logos.push(newLogo);
      state.activeBrandKit.updatedAt = new Date();
    },

    updateLogo: (state, action: PayloadAction<{ logoId: string; updates: Partial<BrandLogo> }>) => {
      if (!state.activeBrandKit) return;

      const logo = state.activeBrandKit.logos.find(l => l.id === action.payload.logoId);
      if (logo) {
        Object.assign(logo, action.payload.updates);
        state.activeBrandKit.updatedAt = new Date();
      }
    },

    deleteLogo: (state, action: PayloadAction<string>) => {
      if (!state.activeBrandKit) return;

      state.activeBrandKit.logos = state.activeBrandKit.logos.filter(
        l => l.id !== action.payload
      );
      
      if (state.selectedLogoId === action.payload) {
        state.selectedLogoId = null;
      }
      
      state.activeBrandKit.updatedAt = new Date();
    },

    selectLogo: (state, action: PayloadAction<string | null>) => {
      state.selectedLogoId = action.payload;
    },

    // UI State
    toggleColorPalette: (state) => {
      state.colorPaletteExpanded = !state.colorPaletteExpanded;
    },

    toggleFontLibrary: (state) => {
      state.fontLibraryExpanded = !state.fontLibraryExpanded;
    },

    toggleLogoLibrary: (state) => {
      state.logoLibraryExpanded = !state.logoLibraryExpanded;
    },

    // Bulk Operations
    importColorPalette: (state, action: PayloadAction<BrandColor[]>) => {
      if (!state.activeBrandKit) return;

      const availableSlots = 500 - state.activeBrandKit.colors.length;
      const colorsToAdd = action.payload.slice(0, availableSlots);

      colorsToAdd.forEach(color => {
        const newColor: BrandColor = {
          ...color,
          id: `color_${Date.now()}_${Math.random()}`,
          usage: 0,
        };
        state.activeBrandKit!.colors.push(newColor);
      });

      state.activeBrandKit.updatedAt = new Date();
    },

    clearAllColors: (state) => {
      if (!state.activeBrandKit) return;
      
      state.activeBrandKit.colors = [];
      state.selectedColorId = null;
      state.activeBrandKit.updatedAt = new Date();
    },

    // Smart Features
    generateColorPalette: (state, action: PayloadAction<{ baseColor: string; count: number }>) => {
      // This would typically call an AI service to generate harmonious colors
      // For now, we'll add a placeholder
      if (!state.activeBrandKit) return;
      
      // Implementation would generate colors based on color theory
      state.loading = true;
    },

    suggestFontPairings: (state, action: PayloadAction<string>) => {
      // This would suggest font pairings based on the selected font
      if (!state.activeBrandKit) return;
      
      state.loading = true;
    },

    // Error Handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
  },

  extraReducers: (builder) => {
    builder
      // Create Brand Kit
      .addCase(createBrandKit.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBrandKit.fulfilled, (state, action) => {
        state.loading = false;
        state.brandKits.push(action.payload);
        state.activeBrandKit = action.payload;
      })
      .addCase(createBrandKit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create brand kit';
      })

      // Load Brand Kits
      .addCase(loadBrandKits.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadBrandKits.fulfilled, (state, action) => {
        state.loading = false;
        state.brandKits = action.payload;
        
        // Set the default kit as current
        const defaultKit = action.payload.find((kit: BrandKit) => kit.isDefault);
        if (defaultKit) {
          state.activeBrandKit = defaultKit;
        } else if (action.payload.length > 0) {
          state.activeBrandKit = action.payload[0];
        }
      })
      .addCase(loadBrandKits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load brand kits';
      })

      // Save Brand Kit
      .addCase(saveBrandKit.pending, (state) => {
        state.loading = true;
      })
      .addCase(saveBrandKit.fulfilled, (state, action) => {
        state.loading = false;
        
        // Update in brandKits array
        const index = state.brandKits.findIndex(kit => kit.id === action.payload.id);
        if (index !== -1) {
          state.brandKits[index] = action.payload;
        }
        
        // Update current if it's the same
        if (state.activeBrandKit?.id === action.payload.id) {
          state.activeBrandKit = action.payload;
        }
      })
      .addCase(saveBrandKit.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to save brand kit';
      })

      // Upload Custom Font
      .addCase(uploadCustomFont.pending, (state) => {
        state.loading = true;
        state.uploadProgress = 0;
      })
      .addCase(uploadCustomFont.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadProgress = 100;
        
        if (state.activeBrandKit) {
          state.activeBrandKit.fonts.push(action.payload);
          state.activeBrandKit.updatedAt = new Date();
        }
      })
      .addCase(uploadCustomFont.rejected, (state, action) => {
        state.loading = false;
        state.uploadProgress = 0;
        state.error = action.error.message || 'Failed to upload font';
      })

      // Upload Logo
      .addCase(uploadLogo.pending, (state) => {
        state.loading = true;
        state.uploadProgress = 0;
      })
      .addCase(uploadLogo.fulfilled, (state, action) => {
        state.loading = false;
        state.uploadProgress = 100;
        
        if (state.activeBrandKit) {
          state.activeBrandKit.logos.push(action.payload);
          state.activeBrandKit.updatedAt = new Date();
        }
      })
      .addCase(uploadLogo.rejected, (state, action) => {
        state.loading = false;
        state.uploadProgress = 0;
        state.error = action.error.message || 'Failed to upload logo';
      })

      // Extract Brand from Website
      .addCase(extractBrandFromWebsite.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(extractBrandFromWebsite.fulfilled, (state, action) => {
        state.loading = false;
        
        // Merge extracted brand elements into current kit
        if (state.activeBrandKit) {
          const { colors, fonts, logos } = action.payload;
          
          // Add extracted colors (respecting the 500 limit)
          const availableColorSlots = 500 - state.activeBrandKit.colors.length;
          const colorsToAdd = colors.slice(0, availableColorSlots);
          state.activeBrandKit.colors.push(...colorsToAdd);
          
          // Add extracted fonts
          state.activeBrandKit.fonts.push(...fonts);
          
          // Add extracted logos
          state.activeBrandKit.logos.push(...logos);
          
          state.activeBrandKit.updatedAt = new Date();
        }
      })
      .addCase(extractBrandFromWebsite.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to extract brand from website';
      });
  },
});

export const {
  setActiveBrandKit,
  setDefaultBrandKit,
  addColor,
  updateColor,
  deleteColor,
  selectColor,
  incrementColorUsage,
  addFont,
  updateFont,
  deleteFont,
  selectFont,
  incrementFontUsage,
  addLogo,
  updateLogo,
  deleteLogo,
  selectLogo,
  toggleColorPalette,
  toggleFontLibrary,
  toggleLogoLibrary,
  importColorPalette,
  clearAllColors,
  generateColorPalette,
  suggestFontPairings,
  setError,
  clearError,
  setUploadProgress,
} = brandKitSlice.actions;

export default brandKitSlice.reducer;