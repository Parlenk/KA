// Export pipeline management slice
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ExportJob, ExportSettings } from '../../types/design';

interface ExportState {
  activeJobs: ExportJob[];
  completedJobs: ExportJob[];
  exportSettings: ExportSettings;
  currentJobId: string | null;
  exportFormats: string[];
  loading: boolean;
  error: string | null;
  batchExportProgress: number;
  previewUrl: string | null;
}

const initialState: ExportState = {
  activeJobs: [],
  completedJobs: [],
  exportSettings: {
    format: 'png',
    quality: 90,
    transparent: false,
    platformOptimized: true,
  },
  currentJobId: null,
  exportFormats: ['jpg', 'png', 'svg', 'pdf', 'mp4', 'gif', 'html5'],
  loading: false,
  error: null,
  batchExportProgress: 0,
  previewUrl: null,
};

// Async thunks
export const startExport = createAsyncThunk(
  'export/startExport',
  async (params: { 
    designSetId: string; 
    canvasIds: string[]; 
    settings: ExportSettings 
  }) => {
    const response = await fetch('/api/export/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

export const checkJobStatus = createAsyncThunk(
  'export/checkJobStatus',
  async (jobId: string) => {
    const response = await fetch(`/api/export/status/${jobId}`);
    return response.json();
  }
);

export const generatePreview = createAsyncThunk(
  'export/generatePreview',
  async (params: { 
    canvasId: string; 
    format: string; 
    quality?: number 
  }) => {
    const response = await fetch('/api/export/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
);

export const exportToHTML5 = createAsyncThunk(
  'export/exportToHTML5',
  async (params: { 
    designSetId: string; 
    canvasId: string; 
    includeAnimations: boolean;
    clickTagUrl?: string;
  }) => {
    const response = await fetch('/api/export/html5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

export const exportToVideo = createAsyncThunk(
  'export/exportToVideo',
  async (params: { 
    designSetId: string; 
    canvasId: string; 
    format: 'mp4' | 'gif';
    frameRate: number;
    duration: number;
    quality: number;
  }) => {
    const response = await fetch('/api/export/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

export const cancelExport = createAsyncThunk(
  'export/cancelExport',
  async (jobId: string) => {
    const response = await fetch(`/api/export/cancel/${jobId}`, {
      method: 'POST',
    });
    return { jobId, ...response.json() };
  }
);

export const batchExport = createAsyncThunk(
  'export/batchExport',
  async (params: { 
    designSetId: string; 
    formats: ExportSettings[];
    includeAllSizes: boolean;
  }) => {
    const response = await fetch('/api/export/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

export const optimizeForPlatform = createAsyncThunk(
  'export/optimizeForPlatform',
  async (params: { 
    canvasId: string; 
    platform: string;
    adSize: string;
  }) => {
    const response = await fetch('/api/export/optimize-platform', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return response.json();
  }
);

const exportSlice = createSlice({
  name: 'export',
  initialState,
  reducers: {
    // Export Settings
    setExportSettings: (state, action: PayloadAction<Partial<ExportSettings>>) => {
      state.exportSettings = { ...state.exportSettings, ...action.payload };
    },

    // Job Management
    addJob: (state, action: PayloadAction<ExportJob>) => {
      state.activeJobs.unshift(action.payload); // Add to beginning for most recent first
      
      // Limit to 50 most recent jobs
      if (state.activeJobs.length > 50) {
        state.activeJobs = state.activeJobs.slice(0, 50);
      }
    },

    updateJobProgress: (state, action: PayloadAction<{ jobId: string; progress: number }>) => {
      const job = state.activeJobs.find(j => j.id === action.payload.jobId);
      if (job) {
        job.progress = action.payload.progress;
      }
    },

    updateJobStatus: (state, action: PayloadAction<{ 
      jobId: string; 
      status: ExportJob['status'];
      downloadUrls?: string[];
      error?: string;
    }>) => {
      const job = state.jobs.find(j => j.id === action.payload.jobId);
      if (job) {
        job.status = action.payload.status;
        if (action.payload.downloadUrls) {
          job.downloadUrls = action.payload.downloadUrls;
        }
        if (action.payload.error) {
          job.error = action.payload.error;
        }
        if (action.payload.status === 'completed' || action.payload.status === 'failed') {
          job.completedAt = new Date();
        }
      }
    },

    deleteJob: (state, action: PayloadAction<string>) => {
      state.jobs = state.jobs.filter(j => j.id !== action.payload);
      
      if (state.currentJobId === action.payload) {
        state.currentJobId = null;
      }
    },

    clearCompletedJobs: (state) => {
      state.completedJobs = [];
    },

    clearCompletedExports: (state) => {
      state.completedJobs = [];
    },

    clearAllJobs: (state) => {
      state.jobs = [];
      state.currentJobId = null;
    },

    setCurrentJob: (state, action: PayloadAction<string | null>) => {
      state.currentJobId = action.payload;
    },

    // Preview Management
    setPreviewUrl: (state, action: PayloadAction<string | null>) => {
      // Clean up previous preview URL
      if (state.previewUrl) {
        URL.revokeObjectURL(state.previewUrl);
      }
      state.previewUrl = action.payload;
    },

    // Batch Export
    setBatchExportProgress: (state, action: PayloadAction<number>) => {
      state.batchExportProgress = action.payload;
    },

    resetBatchExport: (state) => {
      state.batchExportProgress = 0;
    },

    // Error Handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Utility Actions
    retryJob: (state, action: PayloadAction<string>) => {
      const job = state.jobs.find(j => j.id === action.payload);
      if (job && job.status === 'failed') {
        job.status = 'pending';
        job.progress = 0;
        job.error = undefined;
        job.completedAt = undefined;
      }
    },

    duplicateJob: (state, action: PayloadAction<string>) => {
      const originalJob = state.jobs.find(j => j.id === action.payload);
      if (originalJob) {
        const duplicatedJob: ExportJob = {
          ...originalJob,
          id: `job_${Date.now()}`,
          status: 'pending',
          progress: 0,
          downloadUrls: undefined,
          error: undefined,
          createdAt: new Date(),
          completedAt: undefined,
        };
        state.jobs.unshift(duplicatedJob);
      }
    },

    // Format Management
    addSupportedFormat: (state, action: PayloadAction<string>) => {
      if (!state.exportFormats.includes(action.payload)) {
        state.exportFormats.push(action.payload);
      }
    },

    removeSupportedFormat: (state, action: PayloadAction<string>) => {
      state.exportFormats = state.exportFormats.filter(f => f !== action.payload);
    },
  },

  extraReducers: (builder) => {
    builder
      // Start Export
      .addCase(startExport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startExport.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs.unshift(action.payload);
        state.currentJobId = action.payload.id;
      })
      .addCase(startExport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to start export';
      })

      // Check Job Status
      .addCase(checkJobStatus.fulfilled, (state, action) => {
        const job = state.jobs.find(j => j.id === action.payload.id);
        if (job) {
          Object.assign(job, action.payload);
        }
      })

      // Generate Preview
      .addCase(generatePreview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generatePreview.fulfilled, (state, action) => {
        state.loading = false;
        // Clean up previous preview
        if (state.previewUrl) {
          URL.revokeObjectURL(state.previewUrl);
        }
        state.previewUrl = action.payload;
      })
      .addCase(generatePreview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to generate preview';
      })

      // Export to HTML5
      .addCase(exportToHTML5.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportToHTML5.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs.unshift(action.payload);
      })
      .addCase(exportToHTML5.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to export to HTML5';
      })

      // Export to Video
      .addCase(exportToVideo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(exportToVideo.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs.unshift(action.payload);
      })
      .addCase(exportToVideo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to export to video';
      })

      // Batch Export
      .addCase(batchExport.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.batchExportProgress = 0;
      })
      .addCase(batchExport.fulfilled, (state, action) => {
        state.loading = false;
        state.batchExportProgress = 100;
        
        // Add all generated jobs
        action.payload.jobs.forEach((job: ExportJob) => {
          state.jobs.unshift(job);
        });
      })
      .addCase(batchExport.rejected, (state, action) => {
        state.loading = false;
        state.batchExportProgress = 0;
        state.error = action.error.message || 'Failed to complete batch export';
      })

      // Platform Optimization
      .addCase(optimizeForPlatform.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(optimizeForPlatform.fulfilled, (state, action) => {
        state.loading = false;
        state.jobs.unshift(action.payload);
      })
      .addCase(optimizeForPlatform.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to optimize for platform';
      });
  },
});

export const {
  setExportSettings,
  addJob,
  updateJobProgress,
  updateJobStatus,
  deleteJob,
  clearCompletedJobs,
  clearCompletedExports,
  clearAllJobs,
  setCurrentJob,
  setPreviewUrl,
  setBatchExportProgress,
  resetBatchExport,
  setError,
  clearError,
  retryJob,
  duplicateJob,
  addSupportedFormat,
  removeSupportedFormat,
} = exportSlice.actions;

export default exportSlice.reducer;