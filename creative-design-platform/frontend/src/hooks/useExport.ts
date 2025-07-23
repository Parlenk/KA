import { useState, useEffect, useCallback, useRef } from 'react';
import { exportService, exportUtils, ExportRequest, ExportJob, ExportPreset, BatchExportJob } from '../services/exportService';
import { SecurityUtils, ALLOWED_MIME_TYPES, FILE_SIZE_LIMITS } from '../utils/security';

interface UseExportOptions {
  designId: string;
  designName: string;
  currentDimensions: { width: number; height: number };
  autoPolling?: boolean;
  pollingInterval?: number;
}

interface ExportState {
  // Jobs
  currentJobs: ExportJob[];
  batchJobs: BatchExportJob[];
  jobHistory: ExportJob[];
  
  // Presets
  presets: ExportPreset[];
  customPresets: ExportPreset[];
  
  // UI State
  isExporting: boolean;
  selectedPreset: string | null;
  exportQueue: ExportRequest[];
  
  // Analytics
  exportAnalytics: any;
  
  // Preview
  previewUrl: string | null;
  previewLoading: boolean;
  
  // Validation
  validationResults: any;
  
  // Error handling
  error: string | null;
  jobErrors: Map<string, string>;
}

export const useExport = (options: UseExportOptions) => {
  const {
    designId,
    designName,
    currentDimensions,
    autoPolling = true,
    pollingInterval = 2000
  } = options;

  const [state, setState] = useState<ExportState>({
    currentJobs: [],
    batchJobs: [],
    jobHistory: [],
    presets: [],
    customPresets: [],
    isExporting: false,
    selectedPreset: null,
    exportQueue: [],
    exportAnalytics: null,
    previewUrl: null,
    previewLoading: false,
    validationResults: null,
    error: null,
    jobErrors: new Map()
  });

  // Refs for polling
  const pollingIntervalRef = useRef<NodeJS.Timeout>();
  const activeJobsRef = useRef<Set<string>>(new Set());

  // Update state helper
  const updateState = useCallback((updates: Partial<ExportState>) => {
    setState(prevState => ({ ...prevState, ...updates }));
  }, []);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [presets, jobHistory, analytics] = await Promise.all([
          exportService.getExportPresets(),
          exportService.getExportJobHistory(20),
          exportService.getExportAnalytics('30d').catch(() => null)
        ]);

        updateState({
          presets,
          jobHistory,
          exportAnalytics: analytics
        });
      } catch (error) {
        console.error('Failed to load export data:', error);
        updateState({
          error: error instanceof Error ? error.message : 'Failed to load export data'
        });
      }
    };

    loadInitialData();
  }, [designId]);

  // Polling for job updates
  useEffect(() => {
    if (!autoPolling || activeJobsRef.current.size === 0) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = undefined;
      }
      return;
    }

    const pollJobs = async () => {
      try {
        const jobPromises = Array.from(activeJobsRef.current).map(jobId =>
          exportService.getExportJob(jobId).catch(error => {
            console.error(`Failed to poll job ${jobId}:`, error);
            return null;
          })
        );

        const jobs = (await Promise.all(jobPromises)).filter(Boolean) as ExportJob[];
        
        updateState(prevState => {
          const updatedJobs = [...prevState.currentJobs];
          const newJobErrors = new Map(prevState.jobErrors);

          jobs.forEach(job => {
            const index = updatedJobs.findIndex(j => j.id === job.id);
            
            if (index >= 0) {
              updatedJobs[index] = job;
            }

            // Handle job completion
            if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
              activeJobsRef.current.delete(job.id);
              
              if (job.status === 'failed' && job.error_message) {
                newJobErrors.set(job.id, job.error_message);
              }
            }
          });

          return {
            ...prevState,
            currentJobs: updatedJobs,
            jobErrors: newJobErrors
          };
        });
      } catch (error) {
        console.error('Failed to poll jobs:', error);
      }
    };

    pollingIntervalRef.current = setInterval(pollJobs, pollingInterval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [autoPolling, pollingInterval, state.currentJobs.length]);

  // Export functions
  const exportDesign = useCallback(async (request: ExportRequest) => {
    try {
      updateState({ isExporting: true, error: null });

      const response = await exportService.exportDesign({
        ...request,
        design_id: designId
      });

      const newJob: ExportJob = {
        id: response.job_id,
        design_id: designId,
        user_id: '', // Will be set by the server based on authenticated user
        name: exportUtils.generateFilename(designName, request.format, request.dimensions, true),
        format: request.format,
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        estimated_time: response.estimated_time,
        settings: request,
        metadata: {
          original_dimensions: currentDimensions,
          output_dimensions: request.dimensions
        }
      };

      // Add to active jobs and start polling
      activeJobsRef.current.add(response.job_id);
      
      updateState(prevState => ({
        ...prevState,
        currentJobs: [newJob, ...prevState.currentJobs],
        isExporting: false
      }));

      return response.job_id;
    } catch (error) {
      console.error('Export failed:', error);
      updateState({
        isExporting: false,
        error: error instanceof Error ? error.message : 'Export failed'
      });
      throw error;
    }
  }, [designId, designName, currentDimensions]);

  const batchExport = useCallback(async (designIds: string[], formats: string[], settings: Partial<ExportRequest>) => {
    try {
      updateState({ isExporting: true, error: null });

      const response = await exportService.batchExport({
        design_ids: designIds,
        formats,
        settings,
        output_format: 'zip'
      });

      // Would poll for batch job status
      updateState({ isExporting: false });

      return response.batch_id;
    } catch (error) {
      console.error('Batch export failed:', error);
      updateState({
        isExporting: false,
        error: error instanceof Error ? error.message : 'Batch export failed'
      });
      throw error;
    }
  }, []);

  const cancelExport = useCallback(async (jobId: string) => {
    try {
      await exportService.cancelExportJob(jobId);
      
      activeJobsRef.current.delete(jobId);
      
      updateState(prevState => ({
        ...prevState,
        currentJobs: prevState.currentJobs.filter(job => job.id !== jobId)
      }));
    } catch (error) {
      console.error('Failed to cancel export:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to cancel export'
      });
    }
  }, []);

  const retryExport = useCallback(async (jobId: string) => {
    try {
      const response = await exportService.retryFailedExport(jobId);
      
      // Remove old job and add new one
      activeJobsRef.current.delete(jobId);
      activeJobsRef.current.add(response.new_job_id);
      
      updateState(prevState => {
        const oldJob = prevState.currentJobs.find(job => job.id === jobId);
        if (!oldJob) return prevState;

        const newJob: ExportJob = {
          ...oldJob,
          id: response.new_job_id,
          status: 'pending',
          progress: 0,
          error_message: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        return {
          ...prevState,
          currentJobs: [
            newJob,
            ...prevState.currentJobs.filter(job => job.id !== jobId)
          ],
          jobErrors: new Map([...prevState.jobErrors].filter(([id]) => id !== jobId))
        };
      });

      return response.new_job_id;
    } catch (error) {
      console.error('Failed to retry export:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to retry export'
      });
      throw error;
    }
  }, []);

  const downloadExport = useCallback(async (jobId: string) => {
    try {
      // Validate job ID format
      if (!SecurityUtils.validateId(jobId)) {
        throw new Error('Invalid job ID format');
      }
      
      const blob = await exportService.downloadExport(jobId);
      const job = state.currentJobs.find(j => j.id === jobId);
      
      if (!job) {
        throw new Error('Job not found');
      }
      
      // Validate file size
      if (!SecurityUtils.validateFileSize(blob.size, FILE_SIZE_LIMITS.export)) {
        throw new Error('File size exceeds maximum limit');
      }
      
      // Validate MIME type
      const allowedTypes = [...ALLOWED_MIME_TYPES.exports, ...ALLOWED_MIME_TYPES.images];
      if (blob.type && !SecurityUtils.validateMimeType(blob.type, allowedTypes)) {
        console.warn('Unexpected MIME type:', blob.type);
      }
      
      // Sanitize filename
      const sanitizedFilename = SecurityUtils.sanitizeFilename(job.name);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = sanitizedFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download export:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to download export'
      });
    }
  }, [state.currentJobs]);

  // Preview functions
  const generatePreview = useCallback(async (request: ExportRequest) => {
    try {
      updateState({ previewLoading: true });

      const response = await exportService.generatePreview({
        ...request,
        design_id: designId,
        preview_only: true
      });

      updateState({
        previewUrl: response.preview_url,
        previewLoading: false
      });

      return response.preview_url;
    } catch (error) {
      console.error('Failed to generate preview:', error);
      updateState({
        previewLoading: false,
        error: error instanceof Error ? error.message : 'Failed to generate preview'
      });
      throw error;
    }
  }, [designId]);

  const clearPreview = useCallback(() => {
    updateState({ previewUrl: null });
  }, []);

  // Validation functions
  const validateExportSettings = useCallback(async (request: ExportRequest) => {
    try {
      const results = await exportService.validateExportSettings({
        ...request,
        design_id: designId
      });

      updateState({ validationResults: results });

      return results;
    } catch (error) {
      console.error('Failed to validate export settings:', error);
      throw error;
    }
  }, [designId]);

  // Preset functions
  const createPreset = useCallback(async (preset: Omit<ExportPreset, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => {
    try {
      const newPreset = await exportService.createExportPreset(preset);
      
      updateState(prevState => ({
        ...prevState,
        customPresets: [newPreset, ...prevState.customPresets]
      }));

      return newPreset;
    } catch (error) {
      console.error('Failed to create preset:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to create preset'
      });
      throw error;
    }
  }, []);

  const deletePreset = useCallback(async (presetId: string) => {
    try {
      await exportService.deleteExportPreset(presetId);
      
      updateState(prevState => ({
        ...prevState,
        presets: prevState.presets.filter(p => p.id !== presetId),
        customPresets: prevState.customPresets.filter(p => p.id !== presetId)
      }));
    } catch (error) {
      console.error('Failed to delete preset:', error);
      updateState({
        error: error instanceof Error ? error.message : 'Failed to delete preset'
      });
    }
  }, []);

  const usePreset = useCallback(async (presetId: string) => {
    try {
      await exportService.useExportPreset(presetId);
      updateState({ selectedPreset: presetId });
    } catch (error) {
      console.error('Failed to use preset:', error);
    }
  }, []);

  // Analytics functions
  const refreshAnalytics = useCallback(async () => {
    try {
      const analytics = await exportService.getExportAnalytics('30d');
      updateState({ exportAnalytics: analytics });
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
    }
  }, []);

  // Queue management
  const addToQueue = useCallback((request: ExportRequest) => {
    updateState(prevState => ({
      ...prevState,
      exportQueue: [...prevState.exportQueue, request]
    }));
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    updateState(prevState => ({
      ...prevState,
      exportQueue: prevState.exportQueue.filter((_, i) => i !== index)
    }));
  }, []);

  const processQueue = useCallback(async () => {
    if (state.exportQueue.length === 0) return;

    try {
      updateState({ isExporting: true });

      const jobIds = await Promise.all(
        state.exportQueue.map(request => exportDesign(request))
      );

      updateState(prevState => ({
        ...prevState,
        exportQueue: [],
        isExporting: false
      }));

      return jobIds;
    } catch (error) {
      console.error('Failed to process export queue:', error);
      updateState({ isExporting: false });
      throw error;
    }
  }, [state.exportQueue, exportDesign]);

  // Utility functions
  const getJobStatus = useCallback((jobId: string) => {
    return state.currentJobs.find(job => job.id === jobId);
  }, [state.currentJobs]);

  const getJobProgress = useCallback((jobId: string) => {
    const job = getJobStatus(jobId);
    return job ? job.progress : 0;
  }, [getJobStatus]);

  const isJobComplete = useCallback((jobId: string) => {
    const job = getJobStatus(jobId);
    return job ? ['completed', 'failed', 'cancelled'].includes(job.status) : false;
  }, [getJobStatus]);

  const getCompletedJobs = useCallback(() => {
    return state.currentJobs.filter(job => job.status === 'completed');
  }, [state.currentJobs]);

  const getFailedJobs = useCallback(() => {
    return state.currentJobs.filter(job => job.status === 'failed');
  }, [state.currentJobs]);

  const getActiveJobs = useCallback(() => {
    return state.currentJobs.filter(job => ['pending', 'processing'].includes(job.status));
  }, [state.currentJobs]);

  const getTotalProgress = useCallback(() => {
    const activeJobs = getActiveJobs();
    if (activeJobs.length === 0) return 100;
    
    const totalProgress = activeJobs.reduce((sum, job) => sum + job.progress, 0);
    return Math.round(totalProgress / activeJobs.length);
  }, [getActiveJobs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Error clearing
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, []);

  const clearJobError = useCallback((jobId: string) => {
    updateState(prevState => {
      const newJobErrors = new Map(prevState.jobErrors);
      newJobErrors.delete(jobId);
      return { ...prevState, jobErrors: newJobErrors };
    });
  }, []);

  return {
    // State
    ...state,
    
    // Job management
    exportDesign,
    batchExport,
    cancelExport,
    retryExport,
    downloadExport,
    
    // Preview
    generatePreview,
    clearPreview,
    
    // Validation
    validateExportSettings,
    
    // Presets
    createPreset,
    deletePreset,
    usePreset,
    
    // Analytics
    refreshAnalytics,
    
    // Queue management
    addToQueue,
    removeFromQueue,
    processQueue,
    
    // Utilities
    getJobStatus,
    getJobProgress,
    isJobComplete,
    getCompletedJobs,
    getFailedJobs,
    getActiveJobs,
    getTotalProgress,
    
    // Error handling
    clearError,
    clearJobError
  };
};

export default useExport;