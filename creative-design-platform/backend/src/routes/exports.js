const express = require('express');
const { getExportQueueService } = require('../services/exportQueue');
const router = express.Router();

// Get queue service instance
const exportQueue = getExportQueueService();

// Mock data storage for simple mode
let mockExportJobs = [];
const USE_QUEUE = process.env.NODE_ENV === 'production';

// Export formats configuration
const exportFormats = {
  png: { mimeType: 'image/png', extension: 'png', quality: true },
  jpg: { mimeType: 'image/jpeg', extension: 'jpg', quality: true },
  svg: { mimeType: 'image/svg+xml', extension: 'svg', quality: false },
  pdf: { mimeType: 'application/pdf', extension: 'pdf', quality: false },
  html5: { mimeType: 'text/html', extension: 'html', quality: false },
  mp4: { mimeType: 'video/mp4', extension: 'mp4', quality: true },
  gif: { mimeType: 'image/gif', extension: 'gif', quality: true }
};

// Get all export jobs
router.get('/jobs', (req, res) => {
  const { status, userId } = req.query;
  
  let jobs = [...mockExportJobs];
  
  if (status) {
    jobs = jobs.filter(j => j.status === status);
  }
  
  if (userId) {
    jobs = jobs.filter(j => j.userId === parseInt(userId));
  }
  
  res.json({
    jobs: jobs.slice(-50), // Return last 50 jobs
    total: jobs.length
  });
});

// Create new export job
router.post('/', async (req, res) => {
  const { 
    designId, 
    designSetId,
    formats = ['png'], 
    settings = {},
    userId = 1 
  } = req.body;
  
  if (!designId && !designSetId) {
    return res.status(400).json({ error: 'Either designId or designSetId is required' });
  }
  
  // Validate formats
  const invalidFormats = formats.filter(f => !exportFormats[f]);
  if (invalidFormats.length > 0) {
    return res.status(400).json({ 
      error: `Invalid formats: ${invalidFormats.join(', ')}`,
      validFormats: Object.keys(exportFormats)
    });
  }
  
  try {
    if (USE_QUEUE) {
      // Use real queue service
      const result = await exportQueue.addExportJob({
        designId,
        designSetId,
        formats,
        settings: {
          quality: settings.quality || 90,
          scale: settings.scale || 1,
          transparent: settings.transparent || false,
          optimize: settings.optimize !== false,
          compression: settings.compression || 'balanced',
          fps: settings.fps || 30,
          duration: settings.duration || 5000,
          ...settings
        },
        userId
      });
      
      res.status(202).json({
        jobId: result.jobId,
        status: 'queued',
        message: 'Export job created successfully'
      });
    } else {
      // Use mock data for development
      const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newJob = {
        id: jobId,
        type: designSetId ? 'batch' : 'single',
        designId,
        designSetId,
        formats,
        settings: {
          quality: settings.quality || 90,
          scale: settings.scale || 1,
          transparent: settings.transparent || false,
          optimize: settings.optimize !== false,
          compression: settings.compression || 'balanced',
          fps: settings.fps || 30,
          duration: settings.duration || 5000,
          ...settings
        },
        status: 'pending',
        progress: 0,
        userId,
        outputs: [],
        error: null,
        createdAt: new Date().toISOString(),
        startedAt: null,
        completedAt: null
      };
      
      mockExportJobs.push(newJob);
      processExportJob(newJob);
      
      res.status(202).json({ 
        jobId, 
        status: 'pending',
        message: 'Export job created successfully'
      });
    }
  } catch (error) {
    console.error('Export job creation failed:', error);
    res.status(500).json({ error: 'Failed to create export job' });
  }
});

// Get export job status
router.get('/jobs/:jobId', async (req, res) => {
  try {
    if (USE_QUEUE) {
      const job = await exportQueue.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Export job not found' });
      }
      res.json(job);
    } else {
      const job = mockExportJobs.find(j => j.id === req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Export job not found' });
      }
      res.json(job);
    }
  } catch (error) {
    console.error('Failed to get job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Cancel export job
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    if (USE_QUEUE) {
      const result = await exportQueue.cancelJob(req.params.jobId);
      res.json(result);
    } else {
      const job = mockExportJobs.find(j => j.id === req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: 'Export job not found' });
      }
      
      if (job.status === 'completed' || job.status === 'failed') {
        return res.status(400).json({ error: 'Cannot cancel completed or failed job' });
      }
      
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      
      res.json({ success: true, message: 'Export job cancelled' });
    }
  } catch (error) {
    console.error('Failed to cancel job:', error);
    res.status(400).json({ error: error.message });
  }
});

// Batch export for design sets
router.post('/batch', (req, res) => {
  const { 
    designSetId, 
    formats = ['png'], 
    sizes = [],
    settings = {},
    userId = 1 
  } = req.body;
  
  if (!designSetId) {
    return res.status(400).json({ error: 'Design set ID is required' });
  }
  
  const batchId = `batch-${Date.now()}`;
  const jobs = [];
  
  // Create individual jobs for each size/format combination
  const sizesToExport = sizes.length > 0 ? sizes : ['all'];
  
  sizesToExport.forEach((size, sizeIndex) => {
    formats.forEach((format, formatIndex) => {
      const jobId = `${batchId}-${sizeIndex}-${formatIndex}`;
      const job = {
        id: jobId,
        batchId,
        type: 'batch-item',
        designSetId,
        size,
        format,
        settings,
        status: 'pending',
        progress: 0,
        userId,
        outputs: [],
        error: null,
        createdAt: new Date().toISOString()
      };
      
      jobs.push(job);
      mockExportJobs.push(job);
    });
  });
  
  // Process batch jobs
  processBatchExport(batchId, jobs);
  
  res.status(202).json({ 
    batchId, 
    jobs: jobs.map(j => j.id),
    totalJobs: jobs.length,
    message: 'Batch export started'
  });
});

// Get batch export status
router.get('/batch/:batchId', (req, res) => {
  const batchJobs = mockExportJobs.filter(j => j.batchId === req.params.batchId);
  
  if (batchJobs.length === 0) {
    return res.status(404).json({ error: 'Batch not found' });
  }
  
  const completed = batchJobs.filter(j => j.status === 'completed').length;
  const failed = batchJobs.filter(j => j.status === 'failed').length;
  const pending = batchJobs.filter(j => j.status === 'pending').length;
  const processing = batchJobs.filter(j => j.status === 'processing').length;
  
  res.json({
    batchId: req.params.batchId,
    totalJobs: batchJobs.length,
    completed,
    failed,
    pending,
    processing,
    progress: Math.round((completed / batchJobs.length) * 100),
    jobs: batchJobs
  });
});

// Platform-specific export presets
router.get('/presets', (req, res) => {
  const presets = [
    {
      id: 'facebook-feed',
      name: 'Facebook Feed Post',
      platform: 'facebook',
      formats: ['jpg', 'png'],
      settings: {
        dimensions: { width: 1200, height: 630 },
        quality: 85,
        optimize: true
      }
    },
    {
      id: 'instagram-post',
      name: 'Instagram Post',
      platform: 'instagram',
      formats: ['jpg'],
      settings: {
        dimensions: { width: 1080, height: 1080 },
        quality: 90,
        optimize: true
      }
    },
    {
      id: 'instagram-story',
      name: 'Instagram Story',
      platform: 'instagram',
      formats: ['jpg', 'mp4'],
      settings: {
        dimensions: { width: 1080, height: 1920 },
        quality: 90,
        fps: 30,
        duration: 15000
      }
    },
    {
      id: 'google-display',
      name: 'Google Display Ad',
      platform: 'google',
      formats: ['jpg', 'png', 'html5'],
      settings: {
        dimensions: { width: 300, height: 250 },
        quality: 80,
        optimize: true,
        maxFileSize: 150000 // 150KB
      }
    },
    {
      id: 'linkedin-post',
      name: 'LinkedIn Post',
      platform: 'linkedin',
      formats: ['jpg', 'png'],
      settings: {
        dimensions: { width: 1200, height: 627 },
        quality: 90,
        optimize: true
      }
    },
    {
      id: 'twitter-post',
      name: 'Twitter Post',
      platform: 'twitter',
      formats: ['jpg', 'png'],
      settings: {
        dimensions: { width: 1200, height: 675 },
        quality: 85,
        optimize: true
      }
    }
  ];
  
  res.json({ presets });
});

// Apply platform preset
router.post('/apply-preset', (req, res) => {
  const { presetId, designId } = req.body;
  
  // This would normally trigger a resize and export with preset settings
  res.json({
    success: true,
    message: `Applied ${presetId} preset to design ${designId}`,
    jobId: `job-preset-${Date.now()}`
  });
});

// Retry failed export
router.post('/jobs/:jobId/retry', (req, res) => {
  const job = mockExportJobs.find(j => j.id === req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Export job not found' });
  }
  
  if (job.status !== 'failed') {
    return res.status(400).json({ error: 'Can only retry failed jobs' });
  }
  
  // Reset job status and reprocess
  job.status = 'pending';
  job.progress = 0;
  job.error = null;
  job.outputs = [];
  job.startedAt = null;
  job.completedAt = null;
  
  processExportJob(job);
  
  res.json({ 
    success: true, 
    message: 'Export job restarted',
    jobId: job.id
  });
});

// Download export output
router.get('/download/:jobId/:outputIndex', (req, res) => {
  const job = mockExportJobs.find(j => j.id === req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Export job not found' });
  }
  
  const outputIndex = parseInt(req.params.outputIndex);
  const output = job.outputs[outputIndex];
  
  if (!output) {
    return res.status(404).json({ error: 'Output not found' });
  }
  
  // In production, this would stream the file or redirect to CDN
  res.json({
    downloadUrl: output.url,
    filename: output.filename,
    size: output.size,
    format: output.format
  });
});

// Helper function to simulate job processing
function processExportJob(job) {
  // Start processing
  setTimeout(() => {
    job.status = 'processing';
    job.startedAt = new Date().toISOString();
    job.progress = 25;
  }, 500);
  
  // Mid-processing
  setTimeout(() => {
    job.progress = 50;
  }, 1500);
  
  // Near completion
  setTimeout(() => {
    job.progress = 75;
  }, 2500);
  
  // Complete
  setTimeout(() => {
    // Simulate occasional failures
    if (Math.random() > 0.9) {
      job.status = 'failed';
      job.error = 'Export failed: Simulated error';
    } else {
      job.status = 'completed';
      job.progress = 100;
      
      // Generate outputs
      job.outputs = job.formats.map(format => ({
        format,
        url: `https://cdn.example.com/exports/${job.id}.${format}`,
        filename: `design-${job.designId || 'set'}.${format}`,
        size: Math.floor(Math.random() * 5000000) + 100000,
        mimeType: exportFormats[format].mimeType
      }));
    }
    
    job.completedAt = new Date().toISOString();
  }, 3500);
}

// Helper function to process batch exports
function processBatchExport(batchId, jobs) {
  jobs.forEach((job, index) => {
    setTimeout(() => {
      processExportJob(job);
    }, index * 500); // Stagger job processing
  });
}

module.exports = router;