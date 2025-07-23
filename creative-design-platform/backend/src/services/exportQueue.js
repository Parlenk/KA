const Bull = require('bull');
const ExportWorker = require('../workers/exportWorker');

class ExportQueueService {
  constructor(redisUrl) {
    this.exportQueue = new Bull('export-queue', redisUrl || 'redis://localhost:6379');
    this.exportWorker = new ExportWorker();
    this.setupWorkers();
    this.setupEventHandlers();
  }

  setupWorkers() {
    // Process export jobs with concurrency of 2
    this.exportQueue.process(2, async (job) => {
      try {
        console.log(`Processing export job ${job.id}`);
        
        // Update job progress
        await job.progress(10);
        
        // Process the export
        const result = await this.exportWorker.processJob(job);
        
        await job.progress(100);
        console.log(`Export job ${job.id} completed`);
        
        return result;
      } catch (error) {
        console.error(`Export job ${job.id} failed:`, error);
        throw error;
      }
    });
  }

  setupEventHandlers() {
    this.exportQueue.on('completed', (job, result) => {
      console.log(`Job ${job.id} completed with result:`, result);
      // Here you could emit websocket events or update database
    });

    this.exportQueue.on('failed', (job, err) => {
      console.error(`Job ${job.id} failed with error:`, err);
      // Here you could send notifications or alerts
    });

    this.exportQueue.on('progress', (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
      // Here you could emit progress updates via websocket
    });

    this.exportQueue.on('stalled', (job) => {
      console.warn(`Job ${job.id} stalled and will be retried`);
    });
  }

  async addExportJob(data, options = {}) {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: false,
      removeOnFail: false
    };

    const job = await this.exportQueue.add(data, {
      ...defaultOptions,
      ...options
    });

    return {
      jobId: job.id,
      status: 'queued'
    };
  }

  async addBatchExportJobs(jobs, options = {}) {
    const bulkJobs = jobs.map(jobData => ({
      data: jobData,
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        ...options
      }
    }));

    const addedJobs = await this.exportQueue.addBulk(bulkJobs);
    
    return {
      batchId: options.batchId || `batch-${Date.now()}`,
      jobs: addedJobs.map(job => ({
        jobId: job.id,
        status: 'queued'
      }))
    };
  }

  async getJob(jobId) {
    const job = await this.exportQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      id: job.id,
      data: job.data,
      status: state,
      progress: progress,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : null,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : null,
      failedReason: job.failedReason,
      result: job.returnvalue,
      attempts: job.attemptsMade
    };
  }

  async getJobsByBatch(batchId) {
    const jobs = await this.exportQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
    const batchJobs = jobs.filter(job => job.data.batchId === batchId);
    
    return Promise.all(batchJobs.map(job => this.getJob(job.id)));
  }

  async cancelJob(jobId) {
    const job = await this.exportQueue.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();
    if (state === 'completed' || state === 'failed') {
      throw new Error(`Cannot cancel ${state} job`);
    }

    await job.remove();
    return { success: true, message: 'Job cancelled' };
  }

  async retryJob(jobId) {
    const job = await this.exportQueue.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    const state = await job.getState();
    if (state !== 'failed') {
      throw new Error('Can only retry failed jobs');
    }

    await job.retry();
    return { success: true, message: 'Job queued for retry' };
  }

  async getQueueStats() {
    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused
    ] = await Promise.all([
      this.exportQueue.getWaitingCount(),
      this.exportQueue.getActiveCount(),
      this.exportQueue.getCompletedCount(),
      this.exportQueue.getFailedCount(),
      this.exportQueue.getDelayedCount(),
      this.exportQueue.isPaused()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
      total: waiting + active + completed + failed + delayed
    };
  }

  async cleanQueue(grace = 3600000) {
    // Clean completed jobs older than grace period (default 1 hour)
    const cleaned = await this.exportQueue.clean(grace, 'completed');
    const cleanedFailed = await this.exportQueue.clean(grace * 24, 'failed'); // Keep failed jobs for 24 hours
    
    return {
      cleanedCompleted: cleaned.length,
      cleanedFailed: cleanedFailed.length
    };
  }

  async pauseQueue() {
    await this.exportQueue.pause();
    return { paused: true };
  }

  async resumeQueue() {
    await this.exportQueue.resume();
    return { paused: false };
  }

  async shutdown() {
    await this.exportWorker.cleanup();
    await this.exportQueue.close();
  }
}

// Singleton instance
let exportQueueService;

function getExportQueueService(redisUrl) {
  if (!exportQueueService) {
    exportQueueService = new ExportQueueService(redisUrl);
  }
  return exportQueueService;
}

module.exports = {
  ExportQueueService,
  getExportQueueService
};